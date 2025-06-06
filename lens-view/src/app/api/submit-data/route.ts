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
import { DataSizeUtils, RATE_LIMITS as CONFIG_RATE_LIMITS, AI_CONFIG } from "@/config/data-limits";

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
    // NEW: Actual data references for transparency
    dataPath: z.string(), // JSON path to the data used (e.g., "websites.amazon.com.totalFocusTime")
    rawDataValue: z.union([z.string(), z.number(), z.array(z.any()), z.record(z.any())]).optional(), // The actual data value used
    calculation: z.string().optional(), // How this data was calculated/derived
});

const reportSchema = z.object({
    // Concise insights that users wouldn't know about themselves
    keyInsights: z.array(
        z.object({
            insight: z.string(), // Short, impactful bullet point
            impact: z.string(), // What this means for the user
            dataSource: z.string(), // Brief explanation of what data revealed this
            citation: citationSchema,
        })
    ),
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
            shoppingBehavior: z
                .object({
                    preferredShoppingTimes: z.array(z.string()),
                    averageSessionDuration: z.number(),
                    comparisonShoppingSites: z.array(z.string()),
                    mostViewedBrands: z.array(z.string()),
                })
                .optional(),
            purchaseIntent: z
                .object({
                    highIntentCategories: z.array(z.string()),
                    researchPatterns: z.string(),
                    priceMonitoringBehavior: z.string(),
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
            travelStyle: z
                .object({
                    budgetPreference: z.enum(["budget", "mid-range", "luxury", "mixed"]),
                    tripDuration: z.string(),
                    seasonalPreferences: z.array(z.string()),
                    accommodationTypes: z.array(z.string()),
                })
                .optional(),
            researchBehavior: z
                .object({
                    averageResearchDuration: z.number(),
                    informationSources: z.array(z.string()),
                    comparisonPatterns: z.string(),
                })
                .optional(),
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
                citation: citationSchema, // Make citation required
            })
        ),
        visitCountByCategory: z.array(
            z.object({
                category: z.string(), // Allow flexible category names from AI
                visitCount: z.number(),
                citation: citationSchema, // Make citation required
            })
        ),
        sessionActivityOverTime: z.array(
            z.object({
                date: z.string(),
                sessions: z.number(),
                averageSessionDuration: z.number(),
                citation: citationSchema, // Make citation required
            })
        ),
        interactionTypeBreakdown: z.array(
            z.object({
                type: z.string(), // Allow flexible interaction type names from AI
                count: z.number(),
                citation: citationSchema, // Make citation required
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

// Rate limiting configuration - now imported from global config
const RATE_LIMITS = CONFIG_RATE_LIMITS;

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

        if (emailReportsToday >= RATE_LIMITS.MAX_REPORTS_PER_EMAIL_PER_DAY) {
            return {
                allowed: false,
                error: `Rate limit exceeded: Maximum ${RATE_LIMITS.MAX_REPORTS_PER_EMAIL_PER_DAY} reports per day per email. Try again tomorrow.`,
            };
        }

        const emailReportsThisWeek = await reportsCollection.countDocuments({
            email,
            createdAt: { $gte: oneWeekAgo },
        });

        if (emailReportsThisWeek >= RATE_LIMITS.MAX_REPORTS_PER_EMAIL_PER_WEEK) {
            return {
                allowed: false,
                error: `Rate limit exceeded: Maximum ${RATE_LIMITS.MAX_REPORTS_PER_EMAIL_PER_WEEK} reports per week per email. Try again next week.`,
            };
        }

        // Check IP-based rate limits (if available)
        if (clientIP && clientIP !== "unknown") {
            const ipReportsThisHour = await reportsCollection.countDocuments({
                clientIP,
                createdAt: { $gte: oneHourAgo },
            });

            if (ipReportsThisHour >= RATE_LIMITS.MAX_REPORTS_PER_IP_PER_HOUR) {
                return {
                    allowed: false,
                    error: `Rate limit exceeded: Too many requests from this IP. Try again in an hour.`,
                };
            }

            const ipReportsToday = await reportsCollection.countDocuments({
                clientIP,
                createdAt: { $gte: oneDayAgo },
            });

            if (ipReportsToday >= RATE_LIMITS.MAX_REPORTS_PER_IP_PER_DAY) {
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

        if (globalReportsLastMinute >= RATE_LIMITS.MAX_GLOBAL_REPORTS_PER_MINUTE) {
            return {
                allowed: false,
                error: `System busy: Too many reports being generated. Please try again in a few minutes.`,
            };
        }

        const globalReportsLastHour = await reportsCollection.countDocuments({
            createdAt: { $gte: oneHourAgo },
        });

        if (globalReportsLastHour >= RATE_LIMITS.MAX_GLOBAL_REPORTS_PER_HOUR) {
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

        // Configure generateObject options using global AI configuration
        const aiOptions = {
            temperature: AI_CONFIG.AI_TEMPERATURE, // Use global temperature setting
            maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS, // Use global output limit
            topP: 0.95, // Slightly more focused sampling
            topK: 40, // Filter to more likely tokens
        };

        // Stage 2: Start data processing (20%)
        await updateProgress(20, "Processing browsing data");

        // Add small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Send FULL user data to Gemini for complete transparency since data is usually under 1MB
        const userData_any = userData as any;
        const websites = userData_any.websites || {};
        const browserPatterns = userData_any.browserPatterns || {};

        // Calculate raw data size for logging
        const rawDataSizeKB = JSON.stringify(userData).length / 1024;
        console.log(`Raw data size: ${Math.round(rawDataSizeKB)}KB - sending full data for transparency`);

        // Stage 3: Analyzing domain patterns (35%)
        await updateProgress(35, "Analyzing domain patterns");

        // Send complete user data for full transparency - no optimization/scaling
        const fullAnalysisData = userData;

        // Stage 4: Processing user interactions (50%)
        await updateProgress(50, "Processing user interactions");

        // Stage 5: Preparing AI analysis (65%)
        await updateProgress(65, "Preparing AI analysis");

        // Estimate tokens and log
        const tokenEstimate = JSON.stringify(fullAnalysisData).length / 4;
        console.log(`Full data processing: ${rawDataSizeKB}KB (~${Math.round(tokenEstimate)} tokens)`);

        // Stage 6: Generating AI insights (75%)
        await updateProgress(75, "Generating AI insights");

        // Generate report with optimized prompt for Gemini 2.5 Flash Preview
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            ...aiOptions, // Apply our optimized AI settings
            prompt: `You are an expert digital behavior analyst creating comprehensive browsing behavior reports. Analyze the provided data to generate detailed insights and actionable recommendations.

DATA PROFILE:
- Dataset Size: ${Math.round(rawDataSizeKB)}KB
- Total Domains: ${Object.keys(websites).length}
- Active Days: ${Object.keys(websites).length > 0 ? Math.ceil((Date.now() - Math.min(...Object.values(websites).map((data: any) => Number(data.firstVisit) || Date.now()))) / (1000 * 60 * 60 * 24)) : "N/A"}
- Total Browse Time: ${Object.keys(websites).length > 0 ? Math.round(Object.values(websites).reduce((sum: number, data: any) => sum + (Number(data.totalFocusTime) || 0), 0) / 60000) : "N/A"} minutes

ANALYSIS REQUIREMENTS:
1. HIDDEN INSIGHTS: Find 3-5 surprising patterns users don't know about their behavior
2. USER PROFILING: Extract activity patterns, session characteristics, and habits
3. DOMAIN CATEGORIZATION: Classify websites with confidence scores
4. INTERACTION ANALYSIS: Analyze engagement through clicks, scrolls, inputs, navigation
5. VISUALIZATION DATA: Generate comprehensive chart data with descriptive labels

CHART DATA REQUIREMENTS:
- visitCountByCategory: Use descriptive names like "Shopping", "Productivity", "News & Media" (NEVER numbers 0,1,2)
- interactionTypeBreakdown: Use "Click", "Scroll", "Hover", "Input", "Selection", "Navigation" (NEVER numbers/abbreviations)
- sessionActivityOverTime: Use ACTUAL timestamps from websites.*.firstVisit/lastVisit, convert to YYYY-MM-DD format
- focusTimeByDomain: Convert totalFocusTime from milliseconds to minutes
- All labels MUST be human-readable, NEVER numeric indices

PERSONALIZED INSIGHTS:
- ecommerceInsights: ONLY for actual shopping domains (amazon.com, ebay.com, shop.*, store.*)
- travelInsights: ONLY for actual travel domains (booking.com, expedia.com, airbnb.com, flights.*)
- Analyze shoppingBehavior, purchaseIntent, travelStyle, researchBehavior based on actual domain patterns
- DO NOT generate insights for non-relevant domains

DOMAIN RECATEGORIZATION:
Actively recategorize domains by analyzing:
- Patterns: shop.*, booking.*, github.*, slack.*
- User behavior: heavy clicking suggests shopping, research patterns suggest travel
- Time spent and interaction types

CITATION REQUIREMENTS (MANDATORY):
Every data point MUST have complete citations:
- sourceId: "data-{domain/category}-{number}"
- domainOrFeature: Exact domain or data category
- dataType: "interaction", "metadata", "browsing pattern"
- confidence: 0.1-1.0 based on data strength
- timeRangeStart/End: Use ${new Date().toISOString().split("T")[0]} if unavailable
- dataPath: Exact JSON path (e.g., "websites.amazon.com.totalFocusTime")
- rawDataValue: Actual value from browsing data
- calculation: How insight was derived

TIMESTAMP FORMAT:
- Output all timestamps in UTC ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Let frontend handle timezone conversion

RAW BROWSING DATA:
${JSON.stringify(fullAnalysisData, null, 2)}`,
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
                "8": "Keypress",
                // Additional fallback patterns
                "0.0": "Click",
                "1.0": "Scroll",
                "2.0": "Hover",
                "3.0": "Input",
                "4.0": "Selection",
                "5.0": "Navigation",
                "6.0": "Focus",
                "7.0": "Typing",
                // Common AI variations
                click: "Click",
                scroll: "Scroll",
                hover: "Hover",
                input: "Input",
                selection: "Selection",
                navigation: "Navigation",
                focus: "Focus",
                keypress: "Typing",
                typing: "Typing",
                // AI might generate these variations
                type_0: "Click",
                type_1: "Scroll",
                type_2: "Hover",
                type_3: "Input",
                type_4: "Selection",
                type_5: "Navigation",
                type_6: "Focus",
                type_7: "Typing",
                interaction_0: "Click",
                interaction_1: "Scroll",
                interaction_2: "Hover",
                interaction_3: "Input",
                interaction_4: "Selection",
                interaction_5: "Navigation",
                interaction_6: "Focus",
                interaction_7: "Typing",
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

            // AGGRESSIVELY fix interaction type labels - this is the main fix
            if (chartData.interactionTypeBreakdown) {
                chartData.interactionTypeBreakdown = chartData.interactionTypeBreakdown.map((item: any) => {
                    let mappedType = interactionMapping[item.type as keyof typeof interactionMapping];

                    // If no direct mapping found, try more aggressive matching
                    if (!mappedType) {
                        const typeStr = String(item.type).toLowerCase().trim();

                        // Try exact string matching
                        mappedType = interactionMapping[typeStr];

                        // Try numeric pattern matching
                        if (!mappedType && /^\d+(\.\d+)?$/.test(typeStr)) {
                            const numericType = Math.floor(parseFloat(typeStr)).toString();
                            mappedType = interactionMapping[numericType];
                        }

                        // Try removing common prefixes
                        if (!mappedType) {
                            const cleanType = typeStr.replace(/^(type_|interaction_|action_)/, "");
                            mappedType = interactionMapping[cleanType];
                        }

                        // Last resort: pattern matching
                        if (!mappedType) {
                            if (typeStr.includes("click") || typeStr === "0") mappedType = "Click";
                            else if (typeStr.includes("scroll") || typeStr === "1") mappedType = "Scroll";
                            else if (typeStr.includes("hover") || typeStr === "2") mappedType = "Hover";
                            else if (typeStr.includes("input") || typeStr === "3") mappedType = "Input";
                            else if (typeStr.includes("selection") || typeStr === "4") mappedType = "Selection";
                            else if (typeStr.includes("navigation") || typeStr === "5") mappedType = "Navigation";
                            else if (typeStr.includes("focus") || typeStr === "6") mappedType = "Focus";
                            else if (typeStr.includes("typing") || typeStr.includes("keypress") || typeStr === "7")
                                mappedType = "Typing";
                            else {
                                // Final fallback: capitalize the original
                                mappedType =
                                    typeof item.type === "string"
                                        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
                                        : `Type ${item.type}`;
                            }
                        }
                    }

                    console.log(`Mapping interaction type "${item.type}" -> "${mappedType}"`);

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

        // Validate data size using global configuration
        const dataSize = JSON.stringify(userData).length;
        const validation = DataSizeUtils.validateDataSize(dataSize);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.reason }, { status: 400 });
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

            // Only return cached report if data is essentially identical (>95% similarity)
            if (similarity > 0.95) {
                console.log(`Returning cached report for ${email} - data similarity: ${Math.round(similarity * 100)}%`);
                return NextResponse.json({
                    success: true,
                    reportId: recentReport.reportId,
                    message: "Using cached report - your data is essentially identical.",
                    redirectUrl: `/reports/${recentReport.reportId}`,
                    cached: true,
                });
            }

            // For users with sufficient data (>=20KB), be very permissive
            // Only block if data is extremely similar and user is trying to generate reports too frequently
            if (dataSize >= 20 * 1024) {
                const timeSinceLastReport = Date.now() - new Date(recentReport.completedAt).getTime();
                const hoursSinceLastReport = timeSinceLastReport / (1000 * 60 * 60);

                // Only block if user is generating reports extremely frequently (< 6 minutes)
                // and data is nearly identical (>98%)
                if (hoursSinceLastReport < 0.1 && similarity > 0.98) {
                    return NextResponse.json(
                        {
                            error: "You just generated a report with nearly identical data. Please wait at least 6 minutes before generating another report.",
                            minimumWaitTime: "6 minutes",
                            currentDataSize: `${Math.round(dataSize / 1024)}KB`,
                            similarity: `${Math.round(similarity * 100)}%`,
                            tip: "Browse more websites to generate meaningful new insights, or wait a bit longer.",
                        },
                        { status: 400 }
                    );
                }

                // Otherwise allow report generation - user has enough data
                console.log(
                    `Allowing report generation for ${email} - sufficient data: ${Math.round(dataSize / 1024)}KB, similarity: ${Math.round(similarity * 100)}%`
                );
            } else {
                // For smaller datasets, apply original logic but more lenient
                const previousDataSize = JSON.stringify(recentReport.userData).length;
                const dataDifference = Math.abs(dataSize - previousDataSize);

                if (dataDifference < 5 * 1024 && similarity > 0.8) {
                    return NextResponse.json(
                        {
                            error: "Data hasn't changed enough to generate a new report. Please browse more websites or wait for more activity.",
                            minimumChangeRequired: "5KB of new browsing data or lower similarity",
                            currentDataSize: `${Math.round(dataSize / 1024)}KB`,
                            previousDataSize: `${Math.round(previousDataSize / 1024)}KB`,
                            similarity: `${Math.round(similarity * 100)}%`,
                        },
                        { status: 400 }
                    );
                }
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
        const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://lens.vael.ai"; // Always use main domain for production

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
