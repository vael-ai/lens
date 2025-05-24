import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import client from "@/lib/mongo/mongodb";
import { headers } from "next/headers";
import type { CollectedData } from "../../../../../lens/src/types/data";

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

        // Initialize Gemini model
        const model = google("gemini-2.5-flash-preview-05-20");

        // Generate structured report using AI
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            prompt: `
You are a structured analytics assistant working for Vael AI. You will be given a JSON object representing a user's browsing data collected by the Vael AI Context Bank extension.

Your job is to:
1. Extract meaningful summaries and inferred behavior from the CollectedData structure.
2. Populate chart-friendly data structures for Recharts-based visualizations.
3. Analyze the websites object, interactions, browserPatterns, and domainSpecificData.

Format your result according to the schema.

Charting instructions:
- focusTimeByDomain: bar chart of total minutes spent per domain (convert from milliseconds).
- visitCountByCategory: pie chart of how many times categories like shopping/productivity were visited.
- sessionActivityOverTime: line chart of sessions per day and their average duration.
- interactionTypeBreakdown: bar chart showing how often each interaction type occurs.
- scrollDepthOverTime: optional; line chart showing scroll depth (0–100%) over time.

Key data points to analyze:
- websites[domain].totalFocusTime (in milliseconds - convert to minutes)
- websites[domain].visitCount
- websites[domain].inferredDomainClassification
- websites[domain].interactions (stacked by type)
- websites[domain].domainSpecificData (ecommerce, travel, etc.)
- browserPatterns.averageSessionDuration (in milliseconds - convert to minutes)
- browserPatterns.averageDailyTabs

Be accurate, reduce noise, and if data is unavailable for a section, use an empty array.

JSON:
${JSON.stringify(userData, null, 2)}
`,
        });

        // Connect to MongoDB and store the completed report
        await client.connect();
        const db = client.db("lens-vael");
        const reportsCollection = db.collection("reports");

        // Update the report document with the generated report
        await reportsCollection.updateOne(
            { reportId },
            {
                $set: {
                    report,
                    status: "completed",
                    completedAt: new Date(),
                    processingTimeMs: Date.now() - new Date().getTime(),
                },
            }
        );

        console.log(`Background processing completed for report ${reportId}`);
    } catch (error) {
        console.error(`Background processing failed for report ${reportId}:`, error);

        // Update status to failed
        try {
            await client.connect();
            const db = client.db("lens-vael");
            const reportsCollection = db.collection("reports");

            await reportsCollection.updateOne(
                { reportId },
                {
                    $set: {
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error",
                        failedAt: new Date(),
                    },
                }
            );
        } catch (dbError) {
            console.error("Failed to update error status:", dbError);
        }
    } finally {
        await client.close();
    }
}

export async function POST(request: NextRequest) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validatedData = submitDataSchema.parse(body);
        const { reportId, email, userData } = validatedData;

        // Validate data size (minimum 10MB for reports)
        const dataSize = JSON.stringify(userData).length;
        if (dataSize < 10 * 1024 * 1024) {
            // 10MB in bytes
            return NextResponse.json(
                { error: "Insufficient data for report generation. Minimum 10MB required." },
                { status: 400 }
            );
        }

        // Get request metadata for logging
        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || "unknown";
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIp = headersList.get("x-real-ip");
        const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown";

        await client.connect();
        const db = client.db("lens-vael");

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
                    ipAddress,
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
            ipAddress,
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
    } finally {
        await client.close();
    }
}
