import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { z } from "zod";
import { extractEmailFromRequest, verifyReportAccess } from "@/lib/auth";

// Use Next.js caching instead of manual headers
export const revalidate = 5; // Revalidate every 5 seconds for processing reports
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
    try {
        const resolvedParams = await params;
        const { reportId } = paramsSchema.parse(resolvedParams);

        // Extract email for authentication
        const email = extractEmailFromRequest(request);
        if (!email) {
            return NextResponse.json(
                {
                    error: "Authentication required - Please provide email via Authorization header or email parameter",
                },
                { status: 401 }
            );
        }

        // Verify report access
        const hasAccess = await verifyReportAccess(reportId, email);
        if (!hasAccess) {
            return NextResponse.json(
                {
                    error: "Access denied - You don't have permission to view this report status",
                },
                { status: 403 }
            );
        }

        // Get MongoDB client
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        const reportDoc = await reportsCollection.findOne(
            { reportId, email }, // Include email in query for extra security
            {
                projection: {
                    reportId: 1,
                    status: 1,
                    createdAt: 1,
                    completedAt: 1,
                    error: 1,
                    errorType: 1,
                    progressPercent: 1,
                    currentStage: 1,
                    lastUpdated: 1,
                },
            }
        );

        if (!reportDoc) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Update lastUpdated field to reflect the current poll time
        const currentTime = new Date();
        await reportsCollection.updateOne(
            { reportId, email },
            {
                $set: {
                    lastUpdated: currentTime,
                },
            }
        );

        // Use database progress if available, otherwise calculate based on time
        let progressPercent = reportDoc.progressPercent || 0;
        let currentStage = reportDoc.currentStage || null;

        if (reportDoc.status === "processing" && !reportDoc.progressPercent) {
            const elapsed = Date.now() - reportDoc.createdAt.getTime();

            // Enhanced fallback progress calculation with continuous movement
            if (elapsed < 5000) {
                progressPercent = Math.min(Math.floor((elapsed / 5000) * 10), 10);
                currentStage = "Initializing AI analysis";
            } else if (elapsed < 15000) {
                progressPercent = Math.min(Math.floor(10 + ((elapsed - 5000) / 10000) * 15), 25);
                currentStage = "Processing browsing data";
            } else if (elapsed < 35000) {
                // Improved progression to avoid getting stuck at 75%
                const baseProgress = 25;
                const timeInStage = elapsed - 15000; // 20 seconds in this stage
                const stageProgress = Math.min((timeInStage / 20000) * 40, 40); // Max 40% increase
                const randomBoost = Math.random() * 3; // Small random element for continuous movement
                progressPercent = Math.min(baseProgress + stageProgress + randomBoost, 65);
                currentStage = "Generating insights and visualizations";
            } else if (elapsed < 50000) {
                // Enhanced progression past 65% with gradual increases
                const baseProgress = 65;
                const timeInStage = elapsed - 35000; // 15 seconds in this stage
                const stageProgress = Math.min((timeInStage / 15000) * 20, 20); // Max 20% increase
                const randomBoost = Math.random() * 2; // Small random element
                progressPercent = Math.min(baseProgress + stageProgress + randomBoost, 85);
                currentStage = "Creating visualizations";
            } else if (elapsed < 65000) {
                // Final stage with slow but steady progress
                const baseProgress = 85;
                const timeInStage = elapsed - 50000; // 15 seconds in final stage
                const stageProgress = Math.min((timeInStage / 15000) * 10, 10); // Max 10% increase
                const randomBoost = Math.random() * 1.5; // Smaller random element
                progressPercent = Math.min(baseProgress + stageProgress + randomBoost, 95);
                currentStage = "Finalizing report";
            } else if (elapsed < 80000) {
                // Almost ready stage
                const baseProgress = 95;
                const timeInStage = elapsed - 65000; // 15 seconds in almost ready
                const stageProgress = Math.min((timeInStage / 15000) * 3, 3); // Max 3% increase
                const randomBoost = Math.random() * 0.5; // Very small random element
                progressPercent = Math.min(baseProgress + stageProgress + randomBoost, 98);
                currentStage = "Almost ready";
            } else {
                // If taking longer than expected, slowly approach 99%
                const extraTime = elapsed - 80000;
                const slowProgress = Math.min(extraTime / 10000, 1); // 1% per 10 seconds
                progressPercent = Math.min(98 + slowProgress, 99);
                currentStage = "Almost ready - finalizing...";
            }
        } else if (reportDoc.status === "completed") {
            progressPercent = 100;
            currentStage = "Completed";
        } else if (reportDoc.status === "failed") {
            progressPercent = 0;
            currentStage = "Failed";
        }

        // Serialize MongoDB data to plain objects for Client Components
        const { _id, ...cleanDoc } = reportDoc;

        const responseData = {
            reportId,
            status: cleanDoc.status,
            progressPercent,
            currentStage,
            createdAt: cleanDoc.createdAt?.toISOString() || null,
            completedAt: cleanDoc.completedAt?.toISOString() || null,
            lastUpdated: currentTime.toISOString(), // Use the current poll time
            error: cleanDoc.error || null,
            errorType: cleanDoc.errorType || null,
        };

        // Return response data - caching handled by Next.js directives
        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error fetching report status:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid report ID format" }, { status: 400 });
        }

        return NextResponse.json({ error: "Failed to fetch report status" }, { status: 500 });
    }
}
