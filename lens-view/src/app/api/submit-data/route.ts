import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import clientPromise from "@/lib/mongo/mongodb";
import { headers } from "next/headers";
import type { CollectedData } from "../../../../../lens/src/types/data";

// This endpoint should not be cached as it handles unique data submissions
export const dynamic = "force-dynamic";

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
            inferredCategory: z.enum(["shopping", "travel", "productivity", "news", "miscellaneous"]),
            confidence: z.number(),
        })
    ),
    interactionPatterns: z.object({
        mostCommonInteractionType: z.enum(["click", "scroll", "hover", "input", "selection"]),
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
        focusTimeByDomain: z.array(
            z.object({
                domain: z.string(),
                focusTimeMinutes: z.number(),
            })
        ),
        visitCountByCategory: z.array(
            z.object({
                category: z.string(),
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
                type: z.string(),
                count: z.number(),
            })
        ),
        scrollDepthOverTime: z
            .array(
                z.object({
                    timestamp: z.string(),
                    scrollDepth: z.number(),
                })
            )
            .optional(),
    }),
});

// Input validation schema
const submitDataSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
    email: z.string().email("Invalid email format"),
    userData: z.record(z.any()).refine((data) => Object.keys(data).length > 0, "User data cannot be empty"),
});

async function processReportInBackground(reportId: string, email: string, userData: CollectedData) {
    try {
        console.log(`Starting background processing for report ${reportId}`);

        // Get MongoDB client
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        // Helper function to update progress
        const updateProgress = async (progressPercent: number, stage: string) => {
            await reportsCollection.updateOne(
                { reportId },
                {
                    $set: {
                        progressPercent,
                        currentStage: stage,
                        lastUpdated: new Date(),
                    },
                }
            );
        };

        // Stage 1: Initialize AI processing (10%)
        await updateProgress(10, "Initializing AI analysis");

        // Initialize Gemini model
        const model = google("gemini-2.5-flash-preview-05-20");

        // Stage 2: Start AI processing (25%)
        await updateProgress(25, "Processing browsing data");

        // Smart data processing for large datasets - be more aggressive with sampling
        const userData_any = userData as any;
        const websites = userData_any.websites || {};
        const browserPatterns = userData_any.browserPatterns || {};

        // Get top domains by focus time and visit count (more selective)
        const sortedDomains = Object.entries(websites)
            .filter(([domain, data]) => {
                const domainData = data as any;
                // Only include domains with meaningful engagement (>30 seconds OR >2 visits)
                return domainData.totalFocusTime > 30000 || domainData.visitCount > 2;
            })
            .sort(([, a], [, b]) => {
                const aData = a as any;
                const bData = b as any;
                // Sort by engagement score (focus time + visit count weighted)
                const aScore = aData.totalFocusTime + aData.visitCount * 10000;
                const bScore = bData.totalFocusTime + bData.visitCount * 10000;
                return bScore - aScore;
            })
            .slice(0, 8); // Only top 8 domains for better token efficiency

        // Create condensed, analysis-optimized dataset
        const condensedWebsites = Object.fromEntries(
            sortedDomains.map(([domain, data]) => {
                const domainData = data as any;
                return [
                    domain,
                    {
                        totalFocusTime: domainData.totalFocusTime,
                        visitCount: domainData.visitCount,
                        inferredDomainClassification: domainData.inferredDomainClassification,
                        // Summarize interactions instead of including all
                        interactionSummary: {
                            totalInteractions: Object.keys(domainData.interactions || {}).length,
                            topInteractionTypes: Object.entries(domainData.interactions || {})
                                .sort(([, a], [, b]) => (b as any).length - (a as any).length)
                                .slice(0, 3)
                                .map(([type, data]) => ({ type, count: (data as any).length })),
                        },
                        // Include domain-specific insights if available
                        insights: domainData.domainSpecificData || null,
                    },
                ];
            })
        );

        // Create analysis-ready dataset with better structure
        const analysisData = {
            topWebsites: condensedWebsites,
            browserPatterns: {
                averageSessionDuration: browserPatterns.averageSessionDuration,
                averageDailyTabs: browserPatterns.averageDailyTabs,
                totalSessions: browserPatterns.totalSessions,
                activeHours: browserPatterns.activeHours,
            },
            dataMetrics: {
                totalDomains: Object.keys(websites).length,
                analyzedDomains: sortedDomains.length,
                dataSize: `${Math.round(JSON.stringify(userData).length / 1024)}KB`,
                dataProcessing: "Optimized for AI analysis",
            },
        };

        const tokenEstimate = JSON.stringify(analysisData).length / 4; // Rough token estimate
        console.log(
            `Processing ${Object.keys(websites).length} domains -> analyzing top ${sortedDomains.length} (~${tokenEstimate} tokens)`
        );

        // Generate structured report using AI with optimized prompt and higher limits
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            prompt: `Analyze browsing data and create a comprehensive report.

DATA OVERVIEW: ${analysisData.dataMetrics.analyzedDomains} top domains from ${analysisData.dataMetrics.totalDomains} total (${analysisData.dataMetrics.dataSize}).

ANALYSIS REQUIREMENTS:
1. User Profile: Determine activity level, session patterns, persona
2. Top Websites: Extract meaningful insights from domain data  
3. Interaction Patterns: Analyze user behavior
4. Charts: Create data for visualizations
5. Insights: Generate shopping/travel insights if applicable

OUTPUT STRUCTURE: Follow the exact schema provided.

CHART DATA NEEDED:
- focusTimeByDomain: domain → minutes (convert ms)
- visitCountByCategory: category → count  
- sessionActivityOverTime: date → sessions + duration
- interactionTypeBreakdown: interaction type → frequency
- scrollDepthOverTime: timestamp → depth % (if available)

KEY CALCULATIONS:
- Convert totalFocusTime from milliseconds to minutes
- Infer categories from inferredDomainClassification
- Use interactionSummary for interaction patterns
- Generate realistic session data from browserPatterns

DATA:
${JSON.stringify(analysisData, null, 2)}`,
            maxTokens: 8000, // Use full output capacity
        });

        // Stage 3: AI processing complete, formatting results (80%)
        await updateProgress(80, "Generating insights and visualizations");

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Stage 4: Final processing (95%)
        await updateProgress(95, "Finalizing report");

        // Update the report document with the generated report
        await reportsCollection.updateOne(
            { reportId },
            {
                $set: {
                    report,
                    status: "completed",
                    completedAt: new Date(),
                    progressPercent: 100,
                    currentStage: "Completed",
                    processingTimeMs: Date.now() - new Date().getTime(),
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

        // Validate data size (minimum 10KB, maximum 1MB for reports)
        const dataSize = JSON.stringify(userData).length;

        if (dataSize < 10 * 1024) {
            // 10KB in bytes
            return NextResponse.json(
                { error: "Insufficient data for report generation. Minimum 10KB required." },
                { status: 400 }
            );
        }

        if (dataSize > 1 * 1024 * 1024) {
            // 1MB in bytes
            return NextResponse.json({ error: "Data size too large. Maximum 1MB allowed." }, { status: 400 });
        }

        console.log(`Processing report for ${email}: ${Math.round(dataSize / 1024)}KB of browsing data`);

        // Get request metadata for logging (no IP collection for privacy)
        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || "unknown";

        // Get MongoDB client from connection promise
        const client = await clientPromise;
        const db = client.db("lens");

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
        const reportsCollection = db.collection("reports");
        const reportDoc = {
            reportId,
            email,
            status: "processing",
            createdAt: new Date(),
            userDataSize: dataSize,
            userAgent,
            report: null, // Will be populated after processing
        };

        await reportsCollection.insertOne(reportDoc);

        // 3. Return immediate success response
        const response = NextResponse.json({
            success: true,
            reportId,
            message: "Data received successfully. Processing started.",
            redirectUrl: `/reports/${reportId}`,
            estimatedProcessingTimeSeconds: 45,
        });

        // 4. Schedule background processing using 'after'
        after(async () => {
            await processReportInBackground(reportId, email, userData as CollectedData);
        });

        return response;
    } catch (error) {
        console.error("Error in submit-data endpoint:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
