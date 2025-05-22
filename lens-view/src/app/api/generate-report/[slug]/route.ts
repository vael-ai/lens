import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import client from "@/lib/mongo/mongodb";
import { decodeEmail, isValidEncodedEmail } from "@/lib/email-encoder";

// Structured output schema for report generation
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
                date: z.string(), // Format: 'YYYY-MM-DD'
                sessions: z.number(),
                averageSessionDuration: z.number(), // in minutes
            })
        ),
        interactionTypeBreakdown: z.array(
            z.object({
                type: z.string(), // click, scroll, input, etc.
                count: z.number(),
            })
        ),
        scrollDepthOverTime: z
            .array(
                z.object({
                    timestamp: z.string(), // ISO 8601 format
                    scrollDepth: z.number(), // 0-100
                })
            )
            .optional(),
    }),
});

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const { slug } = params;

        // Validate and decode email from slug
        if (!isValidEncodedEmail(slug)) {
            return NextResponse.json({ error: "Invalid user identifier" }, { status: 400 });
        }

        const email = decodeEmail(slug);

        // Get user data from request body
        const userData = await request.json();

        if (!userData || Object.keys(userData).length === 0) {
            return NextResponse.json({ error: "No user data provided" }, { status: 400 });
        }

        // Initialize Gemini model
        const model = google("gemini-2.0-flash-exp");

        // Generate structured report using AI
        const { object: report } = await generateObject({
            model,
            schema: reportSchema,
            prompt: `
You are a structured analytics assistant working for Vael AI. You will be given a JSON object representing a user's browsing data.

Your job is to:
1. Extract meaningful summaries and inferred behavior.
2. Populate chart-friendly data structures for Recharts-based visualizations.

Format your result according to the schema.

Charting instructions:
- focusTimeByDomain: bar chart of total minutes spent per domain.
- visitCountByCategory: pie chart of how many times categories like shopping/productivity were visited.
- sessionActivityOverTime: line chart of sessions per day and their average duration.
- interactionTypeBreakdown: bar chart showing how often each interaction type occurs.
- scrollDepthOverTime: optional; line chart showing scroll depth (0–100%) over time.

Be accurate, reduce noise, and if data is unavailable for a section, use an empty array.

JSON:
${JSON.stringify(userData, null, 2)}
`,
        });

        // Store the generated report in MongoDB
        await client.connect();
        const db = client.db("lens-vael");
        const reportsCollection = db.collection("reports");

        const reportDoc = {
            email,
            report,
            generatedAt: new Date(),
            userDataSize: JSON.stringify(userData).length,
            slug,
        };

        await reportsCollection.insertOne(reportDoc);

        return NextResponse.json({
            success: true,
            report,
            message: "Report generated successfully",
        });
    } catch (error) {
        console.error("Error generating report:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    } finally {
        await client.close();
    }
}

// GET endpoint to retrieve existing report
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const { slug } = params;

        if (!isValidEncodedEmail(slug)) {
            return NextResponse.json({ error: "Invalid user identifier" }, { status: 400 });
        }

        const email = decodeEmail(slug);

        await client.connect();
        const db = client.db("lens-vael");
        const reportsCollection = db.collection("reports");

        const reportDoc = await reportsCollection.findOne(
            { email },
            { sort: { generatedAt: -1 } } // Get most recent report
        );

        if (!reportDoc) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json({
            report: reportDoc.report,
            generatedAt: reportDoc.generatedAt,
            success: true,
        });
    } catch (error) {
        console.error("Error retrieving report:", error);
        return NextResponse.json({ error: "Failed to retrieve report" }, { status: 500 });
    } finally {
        await client.close();
    }
}
