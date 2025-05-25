import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import clientPromise from "@/lib/mongo/mongodb";
import { headers } from "next/headers";
import type { CollectedData } from "../../../../../lens/src/types/data";
import crypto from "crypto";
import { env } from "@/env";
import { generateInternalToken } from "@/lib/internal-jwt";

// This endpoint should not be cached as it handles unique data submissions
export const dynamic = "force-dynamic";

// Helper function to hash data for comparison
function hashData(data: any): string {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// Helper function to calculate data similarity (basic implementation)
function calculateDataSimilarity(data1: any, data2: any): number {
    const hash1 = hashData(data1);
    const hash2 = hashData(data2);

    if (hash1 === hash2) return 1.0; // Identical

    // Basic similarity check based on top domains and patterns
    const websites1 = Object.keys(data1.websites || {});
    const websites2 = Object.keys(data2.websites || {});

    const commonDomains = websites1.filter((domain) => websites2.includes(domain));
    const totalUniqueDomains = new Set([...websites1, ...websites2]).size;

    return commonDomains.length / totalUniqueDomains;
}

// Report schema (reuse existing schema)
// Citation schema for data source references
const citationSchema = z.object({
    sourceId: z.string(), // Unique ID for the data source
    domainOrFeature: z.string(), // Domain or feature this data comes from
    dataType: z.string(), // Type of data (e.g., interaction, metadata, pattern)
    confidence: z.number().optional(), // Confidence score (0-1)
    timeRangeStart: z.string().optional(), // ISO date string for data time range start
    timeRangeEnd: z.string().optional(), // ISO date string for data time range end
});

const reportSchema = z.object({
    userProfileSummary: z.object({
        dailyActivityLevel: z.enum(["low", "moderate", "high"]),
        averageSessionDurationMinutes: z.number(),
        averageTabsPerSession: z.number(),
        commonTabGroups: z.array(z.array(z.string())),
        // Citations for user profile data
        citations: z.array(citationSchema),
    }),
    // Personal insights moved up for better visibility
    ecommerceInsights: z
        .object({
            topCategories: z.array(z.string()),
            averageViewedPriceRange: z
                .object({
                    min: z.number(),
                    max: z.number(),
                    currency: z.string(),
                })
                .optional(),
            // Citations for ecommerce insights data
            citations: z.array(citationSchema),
        })
        .optional(),
    travelInsights: z
        .object({
            topDestinations: z.array(z.string()),
            preferredTransport: z.string().optional(),
            // Citations for travel insights data
            citations: z.array(citationSchema),
        })
        .optional(),
    topWebsites: z.array(
        z.object({
            domain: z.string(),
            visitCount: z.number(),
            totalFocusTimeMinutes: z.number(),
            inferredCategory: z.enum([
                "shopping",
                "travel",
                "productivity",
                "news",
                "miscellaneous",
                "social",
                "education",
                "gaming",
                "finance",
                "health",
            ]),
            confidence: z.number(),
            // Citation for each website data
            citation: citationSchema,
        })
    ),
    interactionPatterns: z.object({
        mostCommonInteractionType: z.enum([
            "click",
            "scroll",
            "hover",
            "input",
            "selection",
            "navigation",
            "focus",
            "typing",
        ]),
        averageScrollDepth: z.number().optional(),
        averageInputFocusTimeMs: z.number().optional(),
        // Citations for interaction patterns
        citations: z.array(citationSchema),
    }),
    inferredUserPersona: z.enum([
        "shopper",
        "productiveProfessional",
        "explorer",
        "newsSeeker",
        "passiveBrowser",
        "powerMultitasker",
    ]),
    // Citation for user persona inference
    personaCitations: z.array(citationSchema),
    chartData: z.object({
        focusTimeByDomain: z.array(
            z.object({
                domain: z.string(),
                focusTimeMinutes: z.number(),
                citation: citationSchema.optional(),
            })
        ),
        visitCountByCategory: z.array(
            z.object({
                category: z.string(), // Allow flexible category names from AI
                visitCount: z.number(),
                citation: citationSchema.optional(),
            })
        ),
        sessionActivityOverTime: z.array(
            z.object({
                date: z.string(),
                sessions: z.number(),
                averageSessionDuration: z.number(),
                citation: citationSchema.optional(),
            })
        ),
        interactionTypeBreakdown: z.array(
            z.object({
                type: z.string(), // Allow flexible interaction type names from AI
                count: z.number(),
                citation: citationSchema.optional(),
            })
        ),
        scrollDepthOverTime: z
            .array(
                z.object({
                    timestamp: z.string(),
                    scrollDepth: z.number(),
                    citation: citationSchema.optional(),
                })
            )
            .optional(),
        // Global chart data citations
        citations: z.array(citationSchema),
    }),
});

// Rate limiting configuration
const RATE_LIMITS = {
    maxReportsPerEmailPerDay: 3,
    maxReportsPerEmailPerWeek: 10,
    maxReportsPerIPPerHour: 5,
    maxReportsPerIPPerDay: 15,
    maxGlobalReportsPerMinute: 10,
    maxGlobalReportsPerHour: 100,
};

// Input validation schema
const submitDataSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
    email: z.string().email("Invalid email format"),
    userData: z.record(z.any()).refine((data) => Object.keys(data).length > 0, "User data cannot be empty"),
});

async function checkRateLimits(email: string, clientIP: string): Promise<{ allowed: boolean; error?: string }> {
    try {
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        // Check email-based rate limits
        const emailReportsToday = await reportsCollection.countDocuments({
            email,
            createdAt: { $gte: oneDayAgo },
        });

        if (emailReportsToday >= RATE_LIMITS.maxReportsPerEmailPerDay) {
            return {
                allowed: false,
                error: `Rate limit exceeded: Maximum ${RATE_LIMITS.maxReportsPerEmailPerDay} reports per day per email. Try again tomorrow.`,
            };
        }

        const emailReportsThisWeek = await reportsCollection.countDocuments({
            email,
            createdAt: { $gte: oneWeekAgo },
        });

        if (emailReportsThisWeek >= RATE_LIMITS.maxReportsPerEmailPerWeek) {
            return {
                allowed: false,
                error: `Rate limit exceeded: Maximum ${RATE_LIMITS.maxReportsPerEmailPerWeek} reports per week per email. Try again next week.`,
            };
        }

        // Check IP-based rate limits (if available)
        if (clientIP && clientIP !== "unknown") {
            const ipReportsThisHour = await reportsCollection.countDocuments({
                clientIP,
                createdAt: { $gte: oneHourAgo },
            });

            if (ipReportsThisHour >= RATE_LIMITS.maxReportsPerIPPerHour) {
                return {
                    allowed: false,
                    error: `Rate limit exceeded: Too many requests from this IP. Try again in an hour.`,
                };
            }

            const ipReportsToday = await reportsCollection.countDocuments({
                clientIP,
                createdAt: { $gte: oneDayAgo },
            });

            if (ipReportsToday >= RATE_LIMITS.maxReportsPerIPPerDay) {
                return {
                    allowed: false,
                    error: `Rate limit exceeded: Too many requests from this IP today. Try again tomorrow.`,
                };
            }
        }

        // Check global rate limits
        const globalReportsLastMinute = await reportsCollection.countDocuments({
            createdAt: { $gte: oneMinuteAgo },
        });

        if (globalReportsLastMinute >= RATE_LIMITS.maxGlobalReportsPerMinute) {
            return {
                allowed: false,
                error: `System busy: Too many reports being generated. Please try again in a few minutes.`,
            };
        }

        const globalReportsLastHour = await reportsCollection.countDocuments({
            createdAt: { $gte: oneHourAgo },
        });

        if (globalReportsLastHour >= RATE_LIMITS.maxGlobalReportsPerHour) {
            return {
                allowed: false,
                error: `System busy: High demand detected. Please try again later.`,
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error("Error checking rate limits:", error);
        // If rate limit check fails, allow the request but log the error
        return { allowed: true };
    }
}

async function processReportInBackground(reportId: string, email: string, userData: CollectedData) {
    try {
        console.log(`Starting background processing for report ${reportId}`);
        const startTime = Date.now();

        // Get MongoDB client
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        // Helper function to update progress with encouraging messages
        const updateProgress = async (progressPercent: number, stage: string) => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            let finalStage = stage;

            // Add encouraging message after 12 seconds
            if (elapsedSeconds > 7 && progressPercent < 100) {
                finalStage = `${stage} - almost there, hang on!`;
            }

            await reportsCollection.updateOne(
                { reportId },
                {
                    $set: {
                        progressPercent,
                        currentStage: finalStage,
                        lastUpdated: new Date(),
                    },
                }
            );
        };

        // Stage 1: Initialize AI processing (10%)
        await updateProgress(10, "Initializing AI analysis");

        // Initialize Gemini model
        const model = google("gemini-2.5-flash-preview-05-20");

        // Configure generateObject options for optimal AI performance
        const aiOptions = {
            temperature: 0.2, // Low temperature for more deterministic outputs
            maxOutputTokens: 4096, // Control output size
            topP: 0.95, // Slightly more focused sampling
            topK: 40, // Filter to more likely tokens
        };

        // Stage 2: Start data processing (20%)
        await updateProgress(20, "Processing browsing data");

        // Add small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 800));

        // SMART SCALING CURVE - optimized for Gemini 2.5 Flash Preview
        // Rate limits: 250k tokens/minute | Output limit: 65,536 tokens | Context: 1M tokens
        const userData_any = userData as any;
        const websites = userData_any.websites || {};
        const browserPatterns = userData_any.browserPatterns || {};

        // Calculate raw data size for scaling decisions
        const rawDataSizeKB = JSON.stringify(userData).length / 1024;
        console.log(`Raw data size: ${Math.round(rawDataSizeKB)}KB - applying smart scaling`);

        // SMART SCALING CURVE based on data size
        let maxDomains: number;
        let interactionDetailLevel: "full" | "detailed" | "summary" | "minimal";
        let metadataLevel: "complete" | "essential" | "basic";
        let engagementThreshold: number;

        if (rawDataSizeKB < 50) {
            // Small dataset: Maximum detail, more tokens
            maxDomains = 40;
            interactionDetailLevel = "full";
            metadataLevel = "complete";
            engagementThreshold = 3000; // 3 seconds - include more data
        } else if (rawDataSizeKB < 100) {
            // Medium dataset: High detail with some optimization
            maxDomains = 25;
            interactionDetailLevel = "detailed";
            metadataLevel = "essential";
            engagementThreshold = 5000; // 5 seconds
        } else if (rawDataSizeKB < 200) {
            // Large dataset: Selective detail, fewer tokens
            maxDomains = 15;
            interactionDetailLevel = "summary";
            metadataLevel = "essential";
            engagementThreshold = 10000; // 10 seconds - trim more aggressively
        } else {
            // Very large dataset: Minimal detail, fewest tokens
            maxDomains = 10;
            interactionDetailLevel = "minimal";
            metadataLevel = "basic";
            engagementThreshold = 20000; // 20 seconds - very selective
        }

        console.log(
            `Scaling: ${maxDomains} domains, ${interactionDetailLevel} interactions, ${metadataLevel} metadata`
        );

        // Stage 3: Analyzing domain patterns (35%)
        await updateProgress(35, "Analyzing domain patterns");

        // Get domains with smart engagement filtering
        const sortedDomains = Object.entries(websites)
            .filter(([domain, data]) => {
                const domainData = data as any;
                return domainData.totalFocusTime > engagementThreshold || domainData.visitCount > 1;
            })
            .sort(([, a], [, b]) => {
                const aData = a as any;
                const bData = b as any;
                // Enhanced engagement score with interaction weight
                const aScore =
                    aData.totalFocusTime +
                    aData.visitCount * 8000 +
                    Object.keys(aData.interactions || {}).length * 2000;
                const bScore =
                    bData.totalFocusTime +
                    bData.visitCount * 8000 +
                    Object.keys(bData.interactions || {}).length * 2000;
                return bScore - aScore;
            })
            .slice(0, maxDomains);

        // Stage 4: Processing user interactions (50%)
        await updateProgress(50, "Processing user interactions");

        // Smart interaction processing based on detail level
        const processInteractions = (interactions: any) => {
            if (!interactions) return {};

            const entries = Object.entries(interactions);

            switch (interactionDetailLevel) {
                case "full":
                    return Object.fromEntries(
                        entries.map(([type, interaction]) => [
                            type,
                            {
                                type,
                                count: (interaction as any).count || 0,
                                firstOccurrence: (interaction as any).firstOccurrence,
                                lastOccurrence: (interaction as any).lastOccurrence,
                                averageDuration: (interaction as any).averageDuration,
                                positions: (interaction as any).positions?.slice(0, 8) || [],
                                targetElements: (interaction as any).targetElements?.slice(0, 5) || [],
                                scrollPatterns: (interaction as any).scrollPatterns || null,
                                inputFields: (interaction as any).inputFields?.slice(0, 3) || [],
                                selectionStats: (interaction as any).selectionStats || null,
                            },
                        ])
                    );

                case "detailed":
                    return Object.fromEntries(
                        entries.slice(0, 5).map(([type, interaction]) => [
                            type,
                            {
                                type,
                                count: (interaction as any).count || 0,
                                averageDuration: (interaction as any).averageDuration,
                                positions: (interaction as any).positions?.slice(0, 4) || [],
                                targetElements: (interaction as any).targetElements?.slice(0, 3) || [],
                            },
                        ])
                    );

                case "summary":
                    return Object.fromEntries(
                        entries.slice(0, 3).map(([type, interaction]) => [
                            type,
                            {
                                type,
                                count: (interaction as any).count || 0,
                                averageDuration: (interaction as any).averageDuration,
                            },
                        ])
                    );

                case "minimal":
                    return Object.fromEntries(
                        entries.slice(0, 2).map(([type, interaction]) => [
                            type,
                            {
                                type,
                                count: (interaction as any).count || 0,
                            },
                        ])
                    );

                default:
                    return {};
            }
        };

        // Smart metadata processing
        const processMetadata = (metadata: any) => {
            if (!metadata) return null;

            switch (metadataLevel) {
                case "complete":
                    return {
                        title: metadata.title,
                        description: metadata.description,
                        pageType: metadata.pageType,
                        keywords: metadata.keywords?.slice(0, 5),
                        url: metadata.url,
                        language: metadata.language,
                    };
                case "essential":
                    return {
                        title: metadata.title,
                        pageType: metadata.pageType,
                        keywords: metadata.keywords?.slice(0, 3),
                    };
                case "basic":
                    return {
                        title: metadata.title,
                        pageType: metadata.pageType,
                    };
                default:
                    return null;
            }
        };

        // Create optimized dataset with smart scaling
        const optimizedWebsites = Object.fromEntries(
            sortedDomains.map(([domain, data]) => {
                const domainData = data as any;
                return [
                    domain,
                    {
                        domain,
                        totalFocusTime: domainData.totalFocusTime,
                        totalFocusTimeMinutes: Math.round((domainData.totalFocusTime / 60000) * 100) / 100, // Convert ms to minutes with 2 decimal precision
                        visitCount: domainData.visitCount,
                        inferredDomainClassification: domainData.inferredDomainClassification,

                        // Scaled interaction data
                        interactionPatterns: processInteractions(domainData.interactions),

                        // Scaled metadata
                        pageContext: processMetadata(domainData.pageMetadata),

                        // Essential domain insights only
                        domainInsights: domainData.domainSpecificData
                            ? {
                                  category: domainData.domainSpecificData.category,
                                  primaryUse: domainData.domainSpecificData.primaryUse,
                              }
                            : null,

                        // Basic engagement metrics
                        engagementScore: domainData.totalFocusTime + domainData.visitCount * 5000,
                    },
                ];
            })
        );

        // Optimized browser patterns (always essential info only)
        const optimizedBrowserPatterns = {
            sessionMetrics: {
                averageSessionDuration: browserPatterns.averageSessionDuration,
                averageDailyTabs: browserPatterns.averageDailyTabs,
                totalSessions: browserPatterns.totalSessions,
            },
            behaviorProfile: {
                multitaskingLevel:
                    browserPatterns.averageDailyTabs > 15
                        ? "extreme"
                        : browserPatterns.averageDailyTabs > 10
                          ? "high"
                          : browserPatterns.averageDailyTabs > 5
                            ? "moderate"
                            : "low",
                primaryDomains: browserPatterns.commonDomains?.slice(0, 8) || [],
            },
        };

        // Create final optimized dataset
        const optimizedAnalysisData = {
            dataProfile: {
                originalSize: `${Math.round(rawDataSizeKB)}KB`,
                analyzedDomains: sortedDomains.length,
                totalDomains: Object.keys(websites).length,
                scalingLevel: interactionDetailLevel,
                dataTimespan:
                    sortedDomains.length > 0
                        ? {
                              activeDays: Math.ceil(
                                  (Date.now() -
                                      Math.min(
                                          ...sortedDomains.map(
                                              ([, data]) => Number((data as any).firstVisit) || Date.now()
                                          )
                                      )) /
                                      (1000 * 60 * 60 * 24)
                              ),
                              totalBrowsingTime: Math.round(
                                  sortedDomains.reduce(
                                      (sum, [, data]) => sum + (Number((data as any).totalFocusTime) || 0),
                                      0
                                  ) / 60000
                              ), // Convert to minutes
                          }
                        : null,
            },
            optimizedWebsites: optimizedWebsites,
            browserBehavior: optimizedBrowserPatterns,
        };

        // Stage 5: Preparing AI analysis (65%)
        await updateProgress(65, "Preparing AI analysis");

        // Estimate tokens and log
        const tokenEstimate = JSON.stringify(optimizedAnalysisData).length / 4;
        console.log(
            `Optimized processing: ${rawDataSizeKB}KB -> ${sortedDomains.length} domains (~${Math.round(tokenEstimate)} tokens)`
        );

        // Stage 6: Generating AI insights (75%)
        await updateProgress(75, "Generating AI insights");

        // Generate report with optimized prompt for Gemini 2.5 Flash Preview
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            ...aiOptions, // Apply our optimized AI settings
            prompt: `You are an expert digital behavior analyst creating comprehensive browsing behavior reports. Analyze the provided data to generate detailed insights and actionable recommendations.

DATA PROFILE:
- Dataset Size: ${optimizedAnalysisData.dataProfile.originalSize}
- Domains Analyzed: ${optimizedAnalysisData.dataProfile.analyzedDomains}/${optimizedAnalysisData.dataProfile.totalDomains}
- Detail Level: ${optimizedAnalysisData.dataProfile.scalingLevel}
- Active Days: ${optimizedAnalysisData.dataProfile.dataTimespan?.activeDays || "N/A"}
- Total Browse Time: ${optimizedAnalysisData.dataProfile.dataTimespan?.totalBrowsingTime || "N/A"} minutes

ANALYSIS FRAMEWORK:
1. USER BEHAVIOR PROFILING: Extract activity patterns, session characteristics, and browsing habits
2. DOMAIN CATEGORIZATION: Classify websites by function with confidence scores
3. INTERACTION PATTERNS: Analyze user engagement through clicks, scrolls, inputs, and navigation
4. BEHAVIORAL INSIGHTS: Identify productivity patterns, content preferences, and digital habits
5. VISUALIZATION DATA: Generate comprehensive chart data for interactive dashboards

CRITICAL REQUIREMENTS FOR CHART DATA:
- visitCountByCategory: MUST use descriptive category names like "Shopping", "Productivity", "News & Media", "Travel", "Entertainment", "Social Media", "Education", "Gaming" (NEVER use numbers like 0, 1, 2, 3, 4)
- interactionTypeBreakdown: MUST use clear interaction names like "Click", "Scroll", "Hover", "Input", "Selection", "Navigation" (NEVER use numbers)
- sessionActivityOverTime: CURRENT DATE IS ${new Date().toISOString()}. Use readable dates in YYYY-MM-DD format with the CORRECT CURRENT YEAR ${new Date().getFullYear()} and CURRENT MONTH ${new Date().getMonth() + 1}. Do not fabricate future dates.
- focusTimeByDomain: Use actual domain names from the data and the provided totalFocusTimeMinutes (already converted from milliseconds)
- ALL chart labels MUST be human-readable descriptive text, NEVER numeric indices or abbreviations

CITATION REQUIREMENTS - CRITICAL - MUST INCLUDE FOR ACCOUNTABILITY:
- For EVERY data point and insight, you MUST provide a citation in the appropriate format with these requirements:
  * sourceId: Create a unique ID in the format "data-{domain or category}-{number}" (e.g., "data-amazon-1")
  * domainOrFeature: Specify the exact domain, feature, or data category this insight comes from
  * dataType: Specify the type of data (e.g., "interaction", "metadata", "browsing pattern")
  * confidence: Include a confidence score from 0.1 to 1.0 based on how strongly the data supports the conclusion
  * timeRangeStart and timeRangeEnd: Use today's date ${new Date().toISOString().split("T")[0]} for time ranges if specific dates aren't available

- Citations MUST be included for:
  * ALL userProfileSummary data points
  * ALL ecommerceInsights and travelInsights
  * Each individual topWebsite entry
  * ALL interactionPatterns data
  * Each persona determination
  * ALL chart data points

This report will be used with a data citation feature using Chrome Extension ID: ieffbdfmjepmohbgeagcpojgdjjheine that allows users to see exactly what data supports each insight. Users will be able to click on citations to view the raw data that supports the insights, so accuracy is critical.

DATA UNIT CONVERSION NOTES:
- totalFocusTimeMinutes fields are already converted from milliseconds to minutes with 2 decimal precision
- Use totalFocusTimeMinutes directly for all focus time calculations and chart data
- Do NOT convert from totalFocusTime (raw milliseconds) - use the pre-converted totalFocusTimeMinutes

INTERACTION TYPE MAPPING (use these exact names):
- click → "Click"
- scroll → "Scroll" 
- hover → "Hover"
- input → "Input"
- selection → "Selection"
- navigation → "Navigation"
- focus → "Focus"
- keypress → "Typing"

CATEGORY MAPPING (use these exact names):
- shopping → "Shopping"
- travel → "Travel" 
- productivity → "Productivity"
- news → "News & Media"
- miscellaneous → "Entertainment"
- social → "Social Media"
- education → "Education"
- gaming → "Gaming"
- finance → "Finance"
- health → "Health & Fitness"

REQUIREMENTS:
- Provide nuanced insights based on actual usage patterns
- Calculate meaningful engagement metrics and confidence scores
- Generate rich chart data for all visualization types with proper descriptive labels
- Identify actionable optimization opportunities
- Consider temporal patterns and session behaviors
- Ensure all chart data uses human-readable names, never numbers or indices

BROWSING DATA:
${JSON.stringify(optimizedAnalysisData, null, 2)}`,
            maxTokens: 32000, // Leverage 2.5's higher output limit
        });

        // Stage 7: Processing AI results (88%)
        await updateProgress(88, "Processing AI results");

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        interface ProcessedVisitItem {
            category: string;
            visitCount: number;
            [key: string]: any;
        }

        interface ProcessedInteractionItem {
            type: string;
            count: number;
            [key: string]: any;
        }

        // Post-process chart data to ensure proper labels (fallback if AI doesn't follow instructions)
        const processChartData = (chartData: any): any => {
            const categoryMapping: Record<string, string> = {
                "0": "Shopping",
                "1": "Travel",
                "2": "Productivity",
                "3": "News & Media",
                "4": "Entertainment",
                "5": "Social Media",
                "6": "Education",
                "7": "Gaming",
                "8": "Finance",
                "9": "Health & Fitness",
                shopping: "Shopping",
                travel: "Travel",
                productivity: "Productivity",
                news: "News & Media",
                miscellaneous: "Entertainment",
                social: "Social Media",
                education: "Education",
                gaming: "Gaming",
                finance: "Finance",
                health: "Health & Fitness",
            };

            const interactionMapping: Record<string, string> = {
                "0": "Click",
                "1": "Scroll",
                "2": "Hover",
                "3": "Input",
                "4": "Selection",
                "5": "Navigation",
                "6": "Focus",
                "7": "Typing",
                click: "Click",
                scroll: "Scroll",
                hover: "Hover",
                input: "Input",
                selection: "Selection",
                navigation: "Navigation",
                focus: "Focus",
                keypress: "Typing",
            };

            // Fix category labels
            if (chartData.visitCountByCategory) {
                chartData.visitCountByCategory = chartData.visitCountByCategory.map((item: any) => {
                    const mappedCategory =
                        categoryMapping[item.category as keyof typeof categoryMapping] ??
                        (typeof item.category === "string"
                            ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                            : item.category);
                    return {
                        ...item,
                        category: mappedCategory,
                    } as ProcessedVisitItem;
                });
            }

            // Fix interaction type labels
            if (chartData.interactionTypeBreakdown) {
                chartData.interactionTypeBreakdown = chartData.interactionTypeBreakdown.map((item: any) => {
                    const mappedType =
                        interactionMapping[item.type as keyof typeof interactionMapping] ??
                        (typeof item.type === "string"
                            ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
                            : item.type);
                    return {
                        ...item,
                        type: mappedType,
                    } as ProcessedInteractionItem;
                });
            }

            return chartData;
        };

        // Apply post-processing to chart data
        if (report.chartData) {
            report.chartData = processChartData(report.chartData);
        }

        // Stage 8: Creating visualizations (94%)
        await updateProgress(94, "Creating visualizations");

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Stage 9: Checking for previous reports (96%)
        await updateProgress(96, "Analyzing behavioral changes");

        // Check for previous reports for comparison analysis
        let comparisonInsights = null;
        try {
            const previousReport = await reportsCollection.findOne(
                {
                    email,
                    status: "completed",
                    reportId: { $ne: reportId }, // Exclude current report
                },
                { sort: { completedAt: -1 } } // Get most recent completed report
            );

            if (previousReport && previousReport.report) {
                console.log(`Found previous report for comparison: ${previousReport.reportId}`);

                // Generate comparison analysis with token optimization
                const comparisonData = {
                    previous: {
                        persona: previousReport.report.inferredUserPersona,
                        activityLevel: previousReport.report.userProfileSummary.dailyActivityLevel,
                        avgSession: previousReport.report.userProfileSummary.averageSessionDurationMinutes,
                        avgTabs: previousReport.report.userProfileSummary.averageTabsPerSession,
                        topDomains: previousReport.report.topWebsites.slice(0, 5).map((w: any) => ({
                            domain: w.domain,
                            category: w.inferredCategory,
                            focusTime: w.totalFocusTimeMinutes,
                        })),
                        mainInteraction: previousReport.report.interactionPatterns.mostCommonInteractionType,
                        reportDate: previousReport.completedAt,
                    },
                    current: {
                        persona: report.inferredUserPersona,
                        activityLevel: report.userProfileSummary.dailyActivityLevel,
                        avgSession: report.userProfileSummary.averageSessionDurationMinutes,
                        avgTabs: report.userProfileSummary.averageTabsPerSession,
                        topDomains: report.topWebsites.slice(0, 5).map((w: any) => ({
                            domain: w.domain,
                            category: w.inferredCategory,
                            focusTime: w.totalFocusTimeMinutes,
                        })),
                        mainInteraction: report.interactionPatterns.mostCommonInteractionType,
                        reportDate: new Date(),
                    },
                };

                // Optimized comparison prompt for 2.5 Flash (target ~50k tokens)
                const { object: comparison } = await generateObject({
                    model,
                    schema: z.object({
                        overallChange: z.enum(["improved", "declined", "stable", "shifted"]),
                        keyChanges: z.array(
                            z.object({
                                metric: z.string(),
                                change: z.string(),
                                significance: z.enum(["high", "medium", "low"]),
                            })
                        ),
                        behavioralShift: z.object({
                            summary: z.string(),
                            recommendation: z.string(),
                        }),
                        trendsIdentified: z.array(z.string()),
                        focusAreas: z.array(z.string()),
                    }),
                    prompt: `You are a digital behavior analyst specializing in identifying behavioral evolution patterns. Compare these two browsing behavior reports and generate comprehensive insights about how the user's digital habits have changed over time.

ANALYSIS TIMEFRAME: ${Math.round((comparisonData.current.reportDate.getTime() - new Date(comparisonData.previous.reportDate).getTime()) / (1000 * 60 * 60 * 24))} days between reports

PREVIOUS REPORT SNAPSHOT:
- Digital Persona: ${comparisonData.previous.persona}
- Activity Level: ${comparisonData.previous.activityLevel}
- Average Session: ${comparisonData.previous.avgSession} minutes
- Tabs Per Session: ${comparisonData.previous.avgTabs}
- Primary Interaction: ${comparisonData.previous.mainInteraction}
- Top Domains: ${JSON.stringify(comparisonData.previous.topDomains)}
- Generated: ${new Date(comparisonData.previous.reportDate).toLocaleDateString()}

CURRENT REPORT SNAPSHOT:
- Digital Persona: ${comparisonData.current.persona}
- Activity Level: ${comparisonData.current.activityLevel}  
- Average Session: ${comparisonData.current.avgSession} minutes
- Tabs Per Session: ${comparisonData.current.avgTabs}
- Primary Interaction: ${comparisonData.current.mainInteraction}
- Top Domains: ${JSON.stringify(comparisonData.current.topDomains)}
- Generated: ${new Date(comparisonData.current.reportDate).toLocaleDateString()}

EVOLUTION ANALYSIS FRAMEWORK:

1. BEHAVIORAL CLASSIFICATION:
   - "improved": Enhanced productivity, better focus patterns, more intentional usage
   - "declined": Increased distraction, less focused sessions, reduced productivity signals
   - "shifted": Changed interests/priorities, different content categories, lifestyle changes
   - "stable": Consistent patterns, well-established habits, predictable behavior

2. KEY METRICS TO ANALYZE:
   - Digital persona changes (productivity vs. leisure orientation)
   - Activity intensity shifts (session duration, multitasking levels)
   - Content category preferences evolution
   - Interaction pattern changes (engagement depth)
   - Domain focus shifts (new interests, dropped habits)

3. TREND IDENTIFICATION:
   - Productivity vs. entertainment balance shifts
   - Session intensity patterns (longer/shorter, focused/scattered)
   - Content discovery behaviors
   - Multitasking evolution
   - Time allocation changes across categories

4. FOCUS AREA RECOMMENDATIONS:
   - Specific actionable improvements for productivity
   - Attention management strategies
   - Content consumption optimization
   - Digital wellness recommendations
   - Habit formation or modification suggestions

REQUIREMENTS:
- Provide 3-5 key changes with specific metrics and clear significance levels
- Generate 4-6 trend observations that explain behavioral patterns
- Suggest 4-6 focus areas for optimization or improvement
- Write the summary in 2-3 sentences explaining the overall evolution
- Make recommendations specific and actionable
- Consider both productivity and wellness aspects
- Identify positive changes as well as areas for improvement

Generate detailed, insightful analysis focusing on meaningful behavioral evolution patterns that help the user understand their digital habit changes and optimize their browsing behavior.`,
                    maxTokens: 8000, // Moderate output to stay within limits
                });

                comparisonInsights = comparison;
                console.log("Generated comparison analysis successfully");
            }
        } catch (comparisonError) {
            console.log("Comparison analysis failed (non-critical):", comparisonError);
            // Don't fail the entire report if comparison fails
        }

        // Stage 10: Finalizing report (98%)
        await updateProgress(98, "Finalizing report");

        // Update the report document with the generated report and comparison
        await reportsCollection.updateOne(
            { reportId },
            {
                $set: {
                    report,
                    comparisonInsights,
                    status: "completed",
                    completedAt: new Date(),
                    progressPercent: 100,
                    currentStage: "Completed",
                    processingTimeMs: Date.now() - startTime,
                },
            }
        );

        console.log(`Background processing completed for report ${reportId}`);
    } catch (error) {
        console.error(`Background processing failed for report ${reportId}:`, error);

        // Update status to failed with detailed error info
        try {
            const client = await clientPromise;
            const db = client.db("lens");
            const reportsCollection = db.collection("reports");

            // Determine error type and message
            let errorMessage = "Unknown error";
            let errorType = "general";

            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.message.includes("No object generated") || error.message.includes("finishReason")) {
                    errorType = "ai_token_limit";
                    errorMessage = "Data too large for AI processing. Please try with less browsing data.";
                } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
                    errorType = "rate_limit";
                    errorMessage = "AI service temporarily unavailable. Please try again later.";
                }
            }

            const updateResult = await reportsCollection.updateOne(
                { reportId },
                {
                    $set: {
                        status: "failed",
                        error: errorMessage,
                        errorType,
                        failedAt: new Date(),
                        progressPercent: 0,
                        currentStage: "Failed",
                        lastUpdated: new Date(),
                    },
                }
            );

            console.log(`Status update result for ${reportId}:`, updateResult);

            if (updateResult.matchedCount === 0) {
                console.error(`Report ${reportId} not found when trying to update failure status`);
            } else if (updateResult.modifiedCount === 0) {
                console.error(`Report ${reportId} status was not modified - possible race condition`);
            } else {
                console.log(`Successfully marked report ${reportId} as failed`);
            }
        } catch (dbError) {
            console.error("Failed to update error status:", dbError);
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validatedData = submitDataSchema.parse(body);
        const { reportId, email, userData } = validatedData;

        // Get client IP for rate limiting (optional)
        const headersList = await headers();
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIP = headersList.get("x-real-ip");
        const clientIP = forwardedFor?.split(",")[0] || realIP || "unknown";

        // Check rate limits first
        const rateLimitCheck = await checkRateLimits(email, clientIP);
        if (!rateLimitCheck.allowed) {
            return NextResponse.json(
                {
                    error: rateLimitCheck.error,
                    type: "rate_limit_exceeded",
                    retryAfter: "1 hour",
                },
                { status: 429 }
            );
        }

        // Validate data size (minimum 10KB, maximum 1MB for reports)
        const dataSize = JSON.stringify(userData).length;

        if (dataSize < 10 * 1024) {
            return NextResponse.json(
                { error: "Insufficient data for report generation. Minimum 10KB required." },
                { status: 400 }
            );
        }

        if (dataSize > 1 * 1024 * 1024) {
            return NextResponse.json({ error: "Data size too large. Maximum 1MB allowed." }, { status: 400 });
        }

        console.log(`Processing report for ${email}: ${Math.round(dataSize / 1024)}KB of browsing data`);

        // Get MongoDB client from connection promise
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        // Check for recent reports and data similarity (only apply restrictions when USE_LOCAL_API is false)
        const recentReport = await reportsCollection.findOne(
            {
                email,
                status: "completed",
            },
            { sort: { completedAt: -1 } }
        );

        if (!env.USE_LOCAL_API && recentReport && recentReport.userData) {
            const similarity = calculateDataSimilarity(userData, recentReport.userData);

            // If data is very similar (>85% similarity), return cached report
            if (similarity > 0.85) {
                console.log(`Returning cached report for ${email} - data similarity: ${Math.round(similarity * 100)}%`);
                return NextResponse.json({
                    success: true,
                    reportId: recentReport.reportId,
                    message: "Using cached report - your data hasn't changed significantly.",
                    redirectUrl: `/reports/${recentReport.reportId}`,
                    cached: true,
                });
            }

            // Check if enough data has changed (at least 10KB difference)
            const previousDataSize = JSON.stringify(recentReport.userData).length;
            const dataDifference = Math.abs(dataSize - previousDataSize);

            if (dataDifference < 10 * 1024 && similarity > 0.7) {
                return NextResponse.json(
                    {
                        error: "Data hasn't changed enough to generate a new report. Please browse more websites or wait for more activity.",
                        minimumChangeRequired: "10KB of new browsing data",
                        currentDataSize: `${Math.round(dataSize / 1024)}KB`,
                        previousDataSize: `${Math.round(previousDataSize / 1024)}KB`,
                        similarity: `${Math.round(similarity * 100)}%`,
                    },
                    { status: 400 }
                );
            }
        } else if (env.USE_LOCAL_API) {
            console.log(`Local API mode enabled - bypassing data similarity checks for ${email}`);
        }

        // Get request metadata for logging
        const userAgent = headersList.get("user-agent") || "unknown";

        // 1. Update user email document - increment generated_reports
        const emailsCollection = db.collection("emails");
        await emailsCollection.updateOne(
            { email },
            {
                $inc: { generated_reports: 1 },
                $setOnInsert: {
                    email,
                    registeredAt: new Date(),
                    source: "lens-extension",
                },
            },
            { upsert: true }
        );

        // 2. Create report document with processing status
        const reportDoc = {
            reportId,
            email,
            status: "processing",
            createdAt: new Date(),
            userDataSize: dataSize,
            userData: userData, // Store for future comparison
            userAgent,
            clientIP: clientIP !== "unknown" ? clientIP : undefined, // Only store if available
            report: null, // Will be populated after processing
        };

        await reportsCollection.insertOne(reportDoc);

        // 3. Generate JWT token for internal API
        let internalToken;
        try {
            internalToken = generateInternalToken({ reportId, email });
            console.log(`Generated internal JWT token for report ${reportId}`);
        } catch (jwtError) {
            console.error("Failed to generate internal JWT token:", jwtError);

            // Update report status to failed
            await reportsCollection.updateOne(
                { reportId },
                {
                    $set: {
                        status: "failed",
                        error: "Internal authentication configuration error. Please contact support.",
                        errorType: "internal_auth_failed",
                        failedAt: new Date(),
                        lastUpdated: new Date(),
                    },
                }
            );

            return NextResponse.json(
                {
                    error: "Internal server configuration error. Please try again later or contact support.",
                    reportId,
                },
                { status: 500 }
            );
        }

        // 4. Call internal API with improved error handling
        const baseUrl =
            process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : `https://${process.env.VERCEL_URL || "lens.vael.ai"}`;

        console.log(`Calling internal API: ${baseUrl}/api/internal/process-report`);

        try {
            const internalResponse = await fetch(`${baseUrl}/api/internal/process-report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${internalToken}`,
                },
                body: JSON.stringify({
                    reportId,
                    email,
                    userData,
                }),
            });

            if (!internalResponse.ok) {
                const errorText = await internalResponse.text();
                console.error(`Internal API failed with status ${internalResponse.status}: ${errorText}`);

                // Update report status to failed
                await reportsCollection.updateOne(
                    { reportId },
                    {
                        $set: {
                            status: "failed",
                            error: `Internal processing failed (${internalResponse.status}). Please try again.`,
                            errorType: "internal_api_failed",
                            failedAt: new Date(),
                            lastUpdated: new Date(),
                        },
                    }
                );

                throw new Error(`Internal API failed: ${internalResponse.status} - ${errorText}`);
            }

            console.log(`Internal API call successful for report ${reportId}`);
        } catch (fetchError) {
            console.error("Failed to call internal API:", fetchError);

            // Update report status to failed if not already updated
            try {
                const currentReport = await reportsCollection.findOne({ reportId });
                if (currentReport && currentReport.status === "processing") {
                    await reportsCollection.updateOne(
                        { reportId },
                        {
                            $set: {
                                status: "failed",
                                error: "Failed to start report processing. Please try again.",
                                errorType: "internal_api_connection_failed",
                                failedAt: new Date(),
                                lastUpdated: new Date(),
                            },
                        }
                    );
                }
            } catch (updateError) {
                console.error("Failed to update report status after internal API error:", updateError);
            }

            throw fetchError; // Re-throw to be caught by outer try-catch
        }

        // 5. Return immediate success response
        return NextResponse.json({
            success: true,
            reportId,
            message: "Data received successfully. Processing started.",
            redirectUrl: `/reports/${reportId}`,
            estimatedProcessingTimeSeconds: 45,
        });
    } catch (error) {
        console.error("Error in submit-data endpoint:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


            if (!internalResponse.ok) {
                const errorText = await internalResponse.text();
                console.error(`Internal API failed with status ${internalResponse.status}: ${errorText}`);

                // Update report status to failed
                await reportsCollection.updateOne(
                    { reportId },
                    {
                        $set: {
                            status: "failed",
                            error: `Internal processing failed (${internalResponse.status}). Please try again.`,
                            errorType: "internal_api_failed",
                            failedAt: new Date(),
                            lastUpdated: new Date(),
                        },
                    }
                );

                throw new Error(`Internal API failed: ${internalResponse.status} - ${errorText}`);
            }

            console.log(`Internal API call successful for report ${reportId}`);
        } catch (fetchError) {
            console.error("Failed to call internal API:", fetchError);

            // Update report status to failed if not already updated
            try {
                const currentReport = await reportsCollection.findOne({ reportId });
                if (currentReport && currentReport.status === "processing") {
                    await reportsCollection.updateOne(
                        { reportId },
                        {
                            $set: {
                                status: "failed",
                                error: "Failed to start report processing. Please try again.",
                                errorType: "internal_api_connection_failed",
                                failedAt: new Date(),
                                lastUpdated: new Date(),
                            },
                        }
                    );
                }
            } catch (updateError) {
                console.error("Failed to update report status after internal API error:", updateError);
            }

            throw fetchError; // Re-throw to be caught by outer try-catch
        }

        // 5. Return immediate success response
        return NextResponse.json({
            success: true,
            reportId,
            message: "Data received successfully. Processing started.",
            redirectUrl: `/reports/${reportId}`,
            estimatedProcessingTimeSeconds: 45,
        });
    } catch (error) {
        console.error("Error in submit-data endpoint:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


            if (!internalResponse.ok) {
                const errorText = await internalResponse.text();
                console.error(`Internal API failed with status ${internalResponse.status}: ${errorText}`);

                // Update report status to failed
                await reportsCollection.updateOne(
                    { reportId },
                    {
                        $set: {
                            status: "failed",
                            error: `Internal processing failed (${internalResponse.status}). Please try again.`,
                            errorType: "internal_api_failed",
                            failedAt: new Date(),
                            lastUpdated: new Date(),
                        },
                    }
                );

                throw new Error(`Internal API failed: ${internalResponse.status} - ${errorText}`);
            }

            console.log(`Internal API call successful for report ${reportId}`);
        } catch (fetchError) {
            console.error("Failed to call internal API:", fetchError);

            // Update report status to failed if not already updated
            try {
                const currentReport = await reportsCollection.findOne({ reportId });
                if (currentReport && currentReport.status === "processing") {
                    await reportsCollection.updateOne(
                        { reportId },
                        {
                            $set: {
                                status: "failed",
                                error: "Failed to start report processing. Please try again.",
                                errorType: "internal_api_connection_failed",
                                failedAt: new Date(),
                                lastUpdated: new Date(),
                            },
                        }
                    );
                }
            } catch (updateError) {
                console.error("Failed to update report status after internal API error:", updateError);
            }

            throw fetchError; // Re-throw to be caught by outer try-catch
        }

        // 5. Return immediate success response
        return NextResponse.json({
            success: true,
            reportId,
            message: "Data received successfully. Processing started.",
            redirectUrl: `/reports/${reportId}`,
            estimatedProcessingTimeSeconds: 45,
        });
    } catch (error) {
        console.error("Error in submit-data endpoint:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
