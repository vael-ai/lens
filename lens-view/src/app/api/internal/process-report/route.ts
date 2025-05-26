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
        })
        .optional(),
    travelInsights: z
        .object({
            topDestinations: z.array(z.string()),
            preferredTransport: z.string().optional(),
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

        // Send all data with no filtering or scaling
        const maxDomains = Object.keys(websites).length; // Include ALL domains
        const interactionDetailLevel = "full"; // Always use full detail
        const metadataLevel = "complete"; // Always use complete metadata
        const engagementThreshold = 0; // Include all data regardless of engagement

        console.log(
            `Full data processing: ${maxDomains} domains, ${interactionDetailLevel} interactions, ${metadataLevel} metadata`
        );

        // Stage 3: Analyzing domain patterns (35%)
        await updateProgress(35, "Analyzing domain patterns");

        // Get ALL domains without any filtering or limiting
        const sortedDomains = Object.entries(websites).sort(([, a], [, b]) => {
            const aData = a as any;
            const bData = b as any;
            // Enhanced engagement score with interaction weight
            const aScore =
                aData.totalFocusTime + aData.visitCount * 8000 + Object.keys(aData.interactions || {}).length * 2000;
            const bScore =
                bData.totalFocusTime + bData.visitCount * 8000 + Object.keys(bData.interactions || {}).length * 2000;
            return bScore - aScore;
        }); // Remove slice to include ALL domains

        // Stage 4: Processing user interactions (50%)
        await updateProgress(50, "Processing user interactions");

        // Full interaction processing - no scaling or limiting, WITH TIMESTAMP PRESERVATION
        const processInteractions = (interactions: any) => {
            if (!interactions) return {};

            const entries = Object.entries(interactions);

            // Always return full detail with all data INCLUDING timestamps for AI analysis
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
                            positions: interactionData.positions || [], // Include ALL positions
                            targetElements: interactionData.targetElements || [], // Include ALL target elements
                            scrollPatterns: interactionData.scrollPatterns || null,
                            inputFields: interactionData.inputFields || [], // Include ALL input fields
                            selectionStats: interactionData.selectionStats || null,

                            // Include any other interaction data that might be present
                            ...interactionData,
                        },
                    ];
                })
            );
        };

        // Full metadata processing - no scaling or limiting
        const processMetadata = (metadata: any) => {
            if (!metadata) return null;

            // Always return complete metadata with all available data
            return {
                title: metadata.title,
                description: metadata.description,
                pageType: metadata.pageType,
                keywords: metadata.keywords || [], // Include ALL keywords
                url: metadata.url,
                language: metadata.language,
                // Include any other metadata that might be present
                ...metadata,
            };
        };

        // Create complete dataset with full raw data INCLUDING TIMESTAMPS
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

                        // Full interaction data with timestamps
                        interactionPatterns: processInteractions(domainData.interactions),

                        // Full metadata with timestamps
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
                totalDomains: Object.keys(websites).length,
                scalingLevel: interactionDetailLevel,

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

        // Estimate tokens and log
        const tokenEstimate = JSON.stringify(optimizedAnalysisData).length / 4;
        console.log(
            `Optimized processing: ${rawDataSizeKB}KB -> ${sortedDomains.length} domains (~${Math.round(tokenEstimate)} tokens)`
        );

        // Stage 6: Generating AI insights (75%)
        await updateProgress(75, "Generating AI insights");

        // Generate report with enhanced psychological insights prompt
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            prompt: `You are a world-class digital behavior psychologist and data scientist specializing in uncovering hidden patterns in human browsing behavior. Your mission is to analyze browsing data like a detective, revealing insights that will genuinely surprise and enlighten users about their own digital habits and psychological patterns.

🧠 PSYCHOLOGICAL ANALYSIS OBJECTIVES:
1. REVEAL HIDDEN BEHAVIORAL PATTERNS: Uncover subconscious habits, timing patterns, and decision-making processes
2. PERSONALITY INSIGHTS: Infer cognitive styles, decision-making preferences, and information processing patterns
3. EMOTIONAL DIGITAL FOOTPRINTS: Identify stress patterns, mood-related browsing, and emotional triggers in online behavior
4. PRODUCTIVITY PSYCHOLOGY: Analyze focus patterns, multitasking efficiency, and cognitive load indicators
5. UNCONSCIOUS PREFERENCES: Discover patterns the user likely isn't aware of in their content consumption

🔍 DEEP INSIGHT FRAMEWORK - DISCOVER WHAT USERS DON'T KNOW ABOUT THEMSELVES:

**Temporal Psychology Patterns:**
- What time of day are they most focused vs. scattered?
- Do they have "rabbit hole" browsing sessions where they get deeply absorbed?
- Are there patterns in how they switch between work and leisure content?
- Do they exhibit "decision fatigue" patterns in their clicking behavior?

**Cognitive Style Analysis:**
- Are they a "searcher" (goal-oriented) or "browser" (exploratory)?
- Do they prefer depth (long sessions on few sites) or breadth (quick visits to many sites)?
- How do they handle information overload? Do they bookmark or revisit?
- Are they impulsive clickers or deliberate navigators?

**Hidden Content Preferences:**
- What topics do they gravitate toward when stressed vs. relaxed?
- Are there seasonal or weekly patterns in their interests?
- Do they have "guilty pleasure" browsing categories they spend more time on than they realize?
- What types of content do they engage with most deeply (scroll depth, time spent)?

**Social Digital Behavior:**
- How much of their browsing is social vs. solitary learning?
- Do they follow trends or set them (early adoption patterns)?
- Are they comparison-driven or content with their own choices?

**Productivity Personality:**
- Are they a "task switcher" or "deep worker"?
- Do they use the internet as a tool or entertainment primarily?
- What are their distraction triggers and focus enhancers?
- Do they exhibit procrastination patterns in their browsing?

🎯 GENERATE INSIGHTS THAT MAKE USERS SAY "I HAD NO IDEA I DID THAT!"

Examples of surprising insights to discover:
- "You spend 40% more time on creative content when it's raining (based on timestamp patterns)"
- "Your browsing becomes 60% more goal-oriented after 2 PM, suggesting you're a natural afternoon decision-maker"
- "You have a hidden pattern of researching topics 3-5 days before making purchasing decisions"
- "Your scroll depth increases by 80% on educational content compared to news, indicating you prefer deep learning over surface-level information"
- "You exhibit 'research spirals' where one technical topic leads to 3+ hours of related deep-diving"

DATA PROFILE:
- Dataset Size: ${optimizedAnalysisData.dataProfile.originalSize}
- Domains Analyzed: ${optimizedAnalysisData.dataProfile.analyzedDomains}/${optimizedAnalysisData.dataProfile.totalDomains}
- Active Days: ${optimizedAnalysisData.dataProfile.dataTimespan?.activeDays || "N/A"}
- Total Browse Time: ${optimizedAnalysisData.dataProfile.dataTimespan?.totalBrowsingTime || "N/A"} minutes

🔍 ANALYSIS INSTRUCTIONS - THINK LIKE A DIGITAL PSYCHOLOGIST:

1. **BEHAVIORAL ARCHAEOLOGY**: Dig deep into timing patterns, session flows, and interaction sequences to uncover subconscious habits
2. **PSYCHOLOGICAL PROFILING**: Infer personality traits, cognitive preferences, and emotional patterns from digital footprints
3. **PATTERN RECOGNITION**: Identify correlations between time, content type, interaction depth, and browsing efficiency
4. **SURPRISE FACTOR**: Focus on insights that would genuinely surprise the user - patterns they're unconsciously following
5. **ACTIONABLE PSYCHOLOGY**: Provide recommendations based on their discovered psychological patterns

🎨 CRITICAL CHART DATA REQUIREMENTS - NO HALLUCINATION ALLOWED:

**sessionActivityOverTime - USE ONLY REAL DATES FROM DATA:**
- Data collection period: ${optimizedAnalysisData.dataProfile.dataTimespan?.earliestDate || "N/A"} to ${optimizedAnalysisData.dataProfile.dataTimespan?.latestDate || "N/A"}
- NEVER create future dates or dates outside the data collection period
- Use YYYY-MM-DD format and spread data points across the ACTUAL date range
- Generate realistic session patterns based on firstVisitDate/lastVisitDate from the websites data
- Each date point must be between ${optimizedAnalysisData.dataProfile.dataTimespan?.earliestDate || "N/A"} and ${optimizedAnalysisData.dataProfile.dataTimespan?.latestDate || "N/A"}

**interactionTypeBreakdown - USE DESCRIPTIVE LABELS, NEVER NUMBERS:**
- "Click" (never 0 or "click")
- "Scroll" (never 1 or "scroll") 
- "Hover" (never 2 or "hover")
- "Input" (never 3 or "input")
- "Selection" (never 4 or "selection")
- "Navigation" (never 5 or "navigation")
- "Focus" (never 6 or "focus") 
- "Typing" (never 7 or "typing")

**visitCountByCategory - USE DESCRIPTIVE CATEGORY NAMES:**
- "Shopping", "Productivity", "News & Media", "Travel", "Entertainment", "Social Media", "Education", "Gaming", "Finance", "Health & Fitness"
- NEVER use numbers like 0, 1, 2, 3, 4, 5, 6, 7, 8, 9

**focusTimeByDomain:**
- Use actual domain names from optimizedWebsites data
- Use the pre-calculated totalFocusTimeMinutes values

**ALL CHART DATA MUST:**
- Use human-readable descriptive text labels ONLY
- NEVER use numeric indices (0, 1, 2, etc.)
- NEVER hallucinate dates outside the data collection period
- Cross-reference every data point with the actual browsing data provided

💡 INSIGHT GENERATION GUIDELINES:
- Be specific with numbers and percentages to add credibility
- Connect browsing patterns to real psychological concepts
- Avoid generic insights - make them personal and surprising
- Use evidence from the actual data to support every claim
- Frame insights positively while being honest about areas for improvement
- Make users excited to learn more about their own digital psychology

🧬 REMEMBER: Users want to discover something fascinating about themselves they never realized. Every insight should make them think "Wow, I never noticed that pattern!" Make this report a journey of self-discovery through their digital DNA.

BROWSING DATA:
${JSON.stringify(optimizedAnalysisData, null, 2)}`,
            maxTokens: 32000,
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
                click: "Click",
                scroll: "Scroll",
                hover: "Hover",
                input: "Input",
                selection: "Selection",
                navigation: "Navigation",
                focus: "Focus",
                keypress: "Typing",
                typing: "Typing",
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

            // Fix interaction type labels aggressively
            if (chartData.interactionTypeBreakdown) {
                chartData.interactionTypeBreakdown = chartData.interactionTypeBreakdown.map((item: any) => {
                    let mappedType = item.type;

                    // Check if it's a number (string or actual number)
                    if (typeof item.type === "number" || /^\d+$/.test(String(item.type))) {
                        mappedType = interactionMapping[String(item.type)] || "Click";
                    } else if (typeof item.type === "string") {
                        // Check exact mapping first
                        mappedType =
                            interactionMapping[item.type.toLowerCase()] ||
                            item.type.charAt(0).toUpperCase() + item.type.slice(1);
                    }

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
