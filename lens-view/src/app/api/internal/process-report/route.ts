import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import clientPromise from "@/lib/mongo/mongodb";
import { validateInternalToken } from "@/lib/internal-jwt";
import type { CollectedData } from "../../../../../../lens/src/types/data";
import crypto from "crypto";
import { AI_CONFIG } from "@/config/data-limits";

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
    rawDataValue: z.string().optional(), // The actual data value used (serialized as JSON string if complex)
    calculation: z.string().optional(), // How this data was calculated/derived
});

// Report schema (reuse existing schema)
const reportSchema = z.object({
    userProfileSummary: z.object({
        dailyActivityLevel: z.enum(["low", "moderate", "high"]),
        averageSessionDurationMinutes: z.number(),
        averageTabsPerSession: z.number(),
        commonTabGroups: z.array(z.array(z.string())),
    }),
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
    }),
    keystrokeInsights: z
        .object({
            typingBehavior: z.object({
                averageTypingSpeed: z.number(),
                coolPersonalFacts: z.array(z.string()), // Specific, interesting facts about the user (e.g., "Loves Percy Jackson books", "Learning Spanish")
                personalityIndicators: z.array(z.string()),
                interestTopics: z.array(z.string()),
            }),
            searchPatterns: z.object({
                searchFrequency: z.number(),
                queryTypes: z.array(z.string()),
                commonSearchTerms: z.array(z.string()),
            }),
            contentPreferences: z.object({
                readingStyle: z.enum(["scanner", "thorough", "mixed"]),
                engagementLevel: z.enum(["low", "moderate", "high"]),
                informationSeeking: z.array(z.string()),
            }),
            citations: z.array(citationSchema).optional(),
        })
        .optional(),
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
        })
        .optional(),
    inferredUserPersona: z.enum([
        "shopper",
        "productiveProfessional",
        "explorer",
        "newsSeeker",
        "passiveBrowser",
        "powerMultitasker",
    ]),
    chartData: z.object({
        focusTimeByDomain: z.array(z.object({ domain: z.string(), focusTimeMinutes: z.number() })),
        visitCountByCategory: z.array(
            z.object({
                category: z.string(), // Allow flexible category names from AI
                visitCount: z.number(),
            })
        ),
        sessionActivityOverTime: z.array(
            z.object({
                date: z.string(),
                sessions: z.number(),
                averageSessionDuration: z.number(),
            })
        ),
        interactionTypeBreakdown: z.array(
            z.object({
                type: z.string(), // Allow flexible interaction type names from AI
                count: z.number(),
            })
        ),
        scrollDepthOverTime: z.array(z.object({ timestamp: z.string(), scrollDepth: z.number() })).optional(),
    }),
});

// Input validation schema for internal API
const internalProcessSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
    email: z.string().email("Invalid email format"),
    userData: z.record(z.any()).refine((data) => Object.keys(data).length > 0, "User data cannot be empty"),
});

async function processReportInBackground(reportId: string, email: string, userData: CollectedData) {
    try {
        console.log(`Starting background processing for report ${reportId} via internal API`);
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

        // Stage 2: Start data processing (20%)
        await updateProgress(20, "Processing browsing data");

        // Add small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 800));

        // FULL RAW DATA PROCESSING - no scaling applied
        const userData_any = userData as any;
        const websites = userData_any.websites || {};
        const browserPatterns = userData_any.browserPatterns || {};

        // Calculate raw data size for logging only
        const rawDataSizeKB = JSON.stringify(userData).length / 1024;
        console.log(`Raw data size: ${Math.round(rawDataSizeKB)}KB - sending full raw data to AI`);

        // OPTIMIZED: Apply smart filtering for faster processing
        const totalDomains = Object.keys(websites).length;
        const maxDomains = Math.min(totalDomains, AI_CONFIG.MAX_DOMAINS_TO_ANALYZE);
        const interactionDetailLevel = "full"; // Always use full detail
        const metadataLevel = "complete"; // Always use complete metadata
        const engagementThreshold = AI_CONFIG.MIN_ENGAGEMENT_THRESHOLD;

        console.log(
            `OPTIMIZED processing: ${maxDomains}/${totalDomains} domains, ${interactionDetailLevel} interactions, ${metadataLevel} metadata, ${engagementThreshold} engagement threshold`
        );

        // Stage 3: Analyzing domain patterns (35%)
        await updateProgress(35, "Analyzing domain patterns");

        // Sort domains by engagement score and apply filtering
        const sortedDomains = Object.entries(websites)
            .map(([domain, data]) => {
                const domainData = data as any;
                // Calculate engagement score (focus time + visit count * weight + interaction count * weight)
                const engagementScore =
                    (domainData.totalFocusTime || 0) +
                    (domainData.visitCount || 0) * 8000 +
                    Object.keys(domainData.interactions || {}).length * 2000;
                return [domain, data, engagementScore] as const;
            })
            .filter(([, , score]) => score >= engagementThreshold) // Filter by engagement threshold
            .sort(([, , a], [, , b]) => b - a) // Sort by engagement score (highest first)
            .slice(0, maxDomains) // Limit to max domains
            .map(([domain, data]) => [domain, data] as const); // Remove score from final result

        // Stage 4: Processing user interactions (50%)
        await updateProgress(50, "Processing user interactions");

        // OPTIMIZED interaction processing - essential data with timestamps
        const processInteractions = (interactions: any) => {
            if (!interactions) return {};

            const entries = Object.entries(interactions);

            // Return optimized detail with essential data + timestamps for AI analysis
            return Object.fromEntries(
                entries.map(([type, interaction]) => {
                    const interactionData = interaction as any;
                    return [
                        type,
                        {
                            type,
                            count: interactionData.count || 0,

                            // CRITICAL: Preserve timestamps for date analysis
                            firstOccurrence: interactionData.firstOccurrence,
                            lastOccurrence: interactionData.lastOccurrence,
                            firstOccurrenceDate: interactionData.firstOccurrence
                                ? new Date(interactionData.firstOccurrence).toISOString().split("T")[0]
                                : null,
                            lastOccurrenceDate: interactionData.lastOccurrence
                                ? new Date(interactionData.lastOccurrence).toISOString().split("T")[0]
                                : null,

                            averageDuration: interactionData.averageDuration,

                            // OPTIMIZED: Limit array sizes for performance
                            positions: (interactionData.positions || []).slice(0, 10), // Top 10 positions
                            targetElements: (interactionData.targetElements || []).slice(0, 5), // Top 5 elements
                            scrollPatterns: interactionData.scrollPatterns || null,
                            inputFields: (interactionData.inputFields || []).slice(0, 5), // Top 5 input fields
                            selectionStats: interactionData.selectionStats || null,
                        },
                    ];
                })
            );
        };

        // OPTIMIZED metadata processing - essential data only
        const processMetadata = (metadata: any) => {
            if (!metadata) return null;

            // Return essential metadata with size limits
            return {
                title: metadata.title,
                description: metadata.description?.slice(0, 200), // Limit description length
                pageType: metadata.pageType,
                keywords: (metadata.keywords || []).slice(0, 10), // Top 10 keywords only
                url: metadata.url,
                language: metadata.language,
            };
        };

        // Create optimized dataset with essential data + timestamps
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

                        // CRITICAL: Preserve actual timestamps for AI to use
                        firstVisit: domainData.firstVisit,
                        lastVisit: domainData.lastVisit,
                        firstVisitDate: domainData.firstVisit
                            ? new Date(domainData.firstVisit).toISOString().split("T")[0]
                            : null,
                        lastVisitDate: domainData.lastVisit
                            ? new Date(domainData.lastVisit).toISOString().split("T")[0]
                            : null,

                        inferredDomainClassification: domainData.inferredDomainClassification,

                        // OPTIMIZED: Essential interaction data with timestamps
                        interactionPatterns: processInteractions(domainData.interactions),

                        // OPTIMIZED: Essential metadata only
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

        // Calculate actual date range from the data for AI reference
        const allTimestamps = sortedDomains
            .flatMap(([, data]) => {
                const domainData = data as any;
                const timestamps = [];
                if (domainData.firstVisit) timestamps.push(domainData.firstVisit);
                if (domainData.lastVisit) timestamps.push(domainData.lastVisit);
                // Add interaction timestamps
                if (domainData.interactions) {
                    Object.values(domainData.interactions).forEach((interaction: any) => {
                        if (interaction.firstOccurrence) timestamps.push(interaction.firstOccurrence);
                        if (interaction.lastOccurrence) timestamps.push(interaction.lastOccurrence);
                    });
                }
                return timestamps;
            })
            .filter((t) => t && !isNaN(t));

        const earliestTimestamp = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
        const latestTimestamp = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();

        // Create final optimized dataset with REAL DATES
        const optimizedAnalysisData = {
            dataProfile: {
                originalSize: `${Math.round(rawDataSizeKB)}KB`,
                analyzedDomains: sortedDomains.length,
                totalDomains: totalDomains,
                scalingLevel: interactionDetailLevel,
                engagementThreshold: engagementThreshold,
                optimization: "enabled",

                // CRITICAL: Provide real date range for AI to use
                dataTimespan:
                    sortedDomains.length > 0
                        ? {
                              activeDays: Math.ceil((latestTimestamp - earliestTimestamp) / (1000 * 60 * 60 * 24)),
                              totalBrowsingTime: Math.round(
                                  sortedDomains.reduce(
                                      (sum, [, data]) => sum + (Number((data as any).totalFocusTime) || 0),
                                      0
                                  ) / 60000
                              ), // Convert to minutes
                              earliestDate: new Date(earliestTimestamp).toISOString().split("T")[0],
                              latestDate: new Date(latestTimestamp).toISOString().split("T")[0],
                              earliestTimestamp: earliestTimestamp,
                              latestTimestamp: latestTimestamp,
                          }
                        : null,
            },
            optimizedWebsites: optimizedWebsites,
            browserBehavior: optimizedBrowserPatterns,
        };

        // Stage 5: Preparing AI analysis (65%)
        await updateProgress(65, "Preparing AI analysis");

        // Estimate tokens and log optimization impact
        const optimizedDataSize = JSON.stringify(optimizedAnalysisData).length / 1024;
        const tokenEstimate = JSON.stringify(optimizedAnalysisData).length / 4;
        const reductionPercent = Math.round(((rawDataSizeKB - optimizedDataSize) / rawDataSizeKB) * 100);

        console.log(
            `🚀 OPTIMIZATION IMPACT: ${Math.round(rawDataSizeKB)}KB -> ${Math.round(optimizedDataSize)}KB (${reductionPercent}% reduction)`
        );
        console.log(
            `📊 PROCESSING: ${sortedDomains.length}/${totalDomains} domains, ~${Math.round(tokenEstimate)} tokens, ${engagementThreshold} engagement threshold`
        );

        // Stage 6: Generating AI insights (75%)
        await updateProgress(75, "Generating AI insights");

        // Generate report with enhanced psychological insights prompt
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            prompt: `You are a digital behavior analyst specializing in extracting personal insights from browsing data. This data has been intelligently optimized to focus on the most engaging ${sortedDomains.length} out of ${totalDomains} domains for faster, more accurate analysis.

CRITICAL REQUIREMENTS:
- Use descriptive labels ONLY (never numbers like 0,1,2)
- Use real dates between ${optimizedAnalysisData.dataProfile.dataTimespan?.earliestDate || "N/A"} and ${optimizedAnalysisData.dataProfile.dataTimespan?.latestDate || "N/A"}
- Generate insights that surprise users about their digital habits
- Back every insight with actual data
- Focus on the most significant patterns from the top-engagement domains

KEYSTROKE INSIGHTS - FOCUS ON COOL PERSONAL FACTS:
When analyzing typing data (interactions.typing), extract SPECIFIC, INTERESTING personal facts that would be valuable for personalization:
- coolPersonalFacts: Look for specific interests, hobbies, preferences (e.g., "Loves Percy Jackson books", "Learning Spanish", "Into cryptocurrency trading", "Planning wedding")
- personalityIndicators: Communication style, decision-making patterns
- interestTopics: Broad interest categories
- searchPatterns: What they actively search for
- contentPreferences: How they consume information

CHART DATA LABELS:
- interactionTypeBreakdown: "Click", "Scroll", "Hover", "Input", "Selection", "Navigation", "Focus", "Typing"
- visitCountByCategory: "Shopping", "Productivity", "News & Media", "Travel", "Entertainment", "Social Media", "Education", "Gaming"
- focusTimeByDomain: Use actual domain names from data

PERSONALIZATION FOCUS:
Extract facts that could enable:
- Personalized product recommendations
- Content suggestions
- Interest-based targeting
- Lifestyle insights

BROWSING DATA:
${JSON.stringify(optimizedAnalysisData, null, 2)}`,
            maxTokens: 32000,
        });

        // Stage 7: Processing AI results (88%)
        await updateProgress(88, "Processing AI results");

        // Add citations for keystroke insights if they exist
        if (report.keystrokeInsights) {
            const generateCitation = (
                sourceId: string,
                domainOrFeature: string,
                dataType: string,
                dataPath: string,
                rawDataValue: any,
                calculation: string,
                confidence = 0.85
            ) => ({
                sourceId,
                domainOrFeature,
                dataType,
                confidence,
                timeRangeStart: optimizedAnalysisData.dataProfile.dataTimespan?.earliestDate || undefined,
                timeRangeEnd: optimizedAnalysisData.dataProfile.dataTimespan?.latestDate || undefined,
                dataPath,
                rawDataValue,
                calculation,
            });

            // Generate citations for keystroke insights
            report.keystrokeInsights.citations = [
                generateCitation(
                    "typing-behavior",
                    "Typing Interaction Data",
                    "keystroke",
                    "websites.*.interactions.typing",
                    null, // Will be populated from actual data if available
                    "Analyzed typing speed, cool personal facts, and personality indicators from collected keystroke data"
                ),
                generateCitation(
                    "search-patterns",
                    "Search Field Analysis",
                    "search",
                    "websites.*.interactions.typing.searchQueries",
                    null,
                    "Extracted search frequency and query patterns from search field interactions"
                ),
                generateCitation(
                    "content-preferences",
                    "Content Engagement Analysis",
                    "engagement",
                    "websites.*.interactions.typing.contentAnalysis",
                    null,
                    "Inferred reading style and engagement level from typing patterns and content interaction data"
                ),
            ];
        }

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

        // AGGRESSIVE post-processing to fix AI hallucinations and numeric labels
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
                "10": "Miscellaneous",
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
                "8": "Click", // Fallback
                "9": "Scroll", // Fallback
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

            // Fix category labels aggressively
            if (chartData.visitCountByCategory) {
                chartData.visitCountByCategory = chartData.visitCountByCategory.map((item: any) => {
                    let mappedCategory = item.category;

                    // Check if it's a number (string or actual number)
                    if (typeof item.category === "number" || /^\d+$/.test(String(item.category))) {
                        mappedCategory = categoryMapping[String(item.category)] || "Miscellaneous";
                    } else if (typeof item.category === "string") {
                        // Check exact mapping first
                        mappedCategory =
                            categoryMapping[item.category.toLowerCase()] ||
                            item.category.charAt(0).toUpperCase() + item.category.slice(1);
                    }

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

            // Fix sessionActivityOverTime dates if they're wrong
            if (chartData.sessionActivityOverTime) {
                const earliestDate = optimizedAnalysisData.dataProfile.dataTimespan?.earliestDate;
                const latestDate = optimizedAnalysisData.dataProfile.dataTimespan?.latestDate;

                if (earliestDate && latestDate) {
                    // Validate and fix any dates that are outside the actual data range
                    chartData.sessionActivityOverTime = chartData.sessionActivityOverTime.map((item: any) => {
                        const itemDate = item.date;

                        // If date is invalid or outside range, replace with a date within range
                        if (!itemDate || itemDate < earliestDate || itemDate > latestDate) {
                            // Generate a valid date between earliest and latest
                            const earliestMs = new Date(earliestDate).getTime();
                            const latestMs = new Date(latestDate).getTime();
                            const randomMs = earliestMs + Math.random() * (latestMs - earliestMs);
                            const validDate = new Date(randomMs).toISOString().split("T")[0];

                            console.warn(`Fixed invalid date ${itemDate} to ${validDate}`);
                            return {
                                ...item,
                                date: validDate,
                            };
                        }

                        return item;
                    });
                }
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

        console.log(`Background processing completed for report ${reportId} via internal API`);

        // Send notification to browser extension about completed report
        try {
            // Use a small delay to ensure the report is fully saved before notifying
            setTimeout(async () => {
                try {
                    // Post a message to the extension about the completed report
                    // This will be picked up by the content script or background script
                    if (typeof window !== "undefined" && window.postMessage) {
                        window.postMessage(
                            {
                                type: "LENS_REPORT_COMPLETED",
                                reportId,
                                email,
                                timestamp: Date.now(),
                            },
                            "*"
                        );
                    }
                } catch (notificationError) {
                    console.log(
                        "Note: Could not send report completion message (normal in server environment):",
                        notificationError
                    );
                }
            }, 1000);
        } catch (notificationSetupError) {
            console.log("Note: Report completion notification setup not available in server environment");
        }
    } catch (error) {
        console.error(`Background processing failed for report ${reportId} via internal API:`, error);

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

            console.log(`Status update result for ${reportId} (failure):`, updateResult);

            if (updateResult.matchedCount === 0) {
                console.error(`Report ${reportId} not found when trying to update failure status`);
            } else if (updateResult.modifiedCount === 0) {
                console.error(`Report ${reportId} status was not modified - possible race condition`);
            } else {
                console.log(`Successfully marked report ${reportId} as failed`);
            }
        } catch (dbError) {
            console.error("Failed to update error status for report:", reportId, dbError);
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        // 1. Validate JWT token first
        const tokenPayload = validateInternalToken(request);
        console.log(`Internal API called for report: ${tokenPayload.reportId}`);

        // 2. Parse and validate request body
        const body = await request.json();
        const validatedData = internalProcessSchema.parse(body);
        const { reportId, email, userData } = validatedData;

        // 3. Verify token data matches request data
        if (tokenPayload.reportId !== reportId || tokenPayload.email !== email) {
            return NextResponse.json({ error: "Token data mismatch with request data" }, { status: 403 });
        }

        // 4. Start background processing using 'after'
        after(async () => {
            await processReportInBackground(reportId, email, userData as CollectedData);
        });

        return NextResponse.json({
            success: true,
            message: "Report processing started via internal API",
            reportId,
        });
    } catch (error) {
        console.error("Error in internal process-report endpoint:", error);

        if (error instanceof Error && error.message.includes("Invalid token")) {
            return NextResponse.json({ error: "Unauthorized - Invalid internal token" }, { status: 401 });
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
