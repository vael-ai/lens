import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { z } from "zod";

// No caching for now

const paramsSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
    try {
        const resolvedParams = await params;
        const { reportId } = paramsSchema.parse(resolvedParams);

        // Direct MongoDB query
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");
        const reportDoc = await reportsCollection.findOne(
            { reportId },
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

        // Use database progress if available, otherwise calculate based on time
        let progressPercent = reportDoc.progressPercent || 0;
        let currentStage = reportDoc.currentStage || null;

        if (reportDoc.status === "processing" && !reportDoc.progressPercent) {
            const elapsed = Date.now() - reportDoc.createdAt.getTime();

            // Fallback time-based calculation if real-time progress isn't available
            if (elapsed < 5000) {
                progressPercent = Math.min(Math.floor((elapsed / 5000) * 10), 10);
                currentStage = "Initializing...";
            } else if (elapsed < 35000) {
                const aiPhaseProgress = Math.floor(((elapsed - 5000) / 30000) * 70);
                progressPercent = Math.min(10 + aiPhaseProgress, 80);
                currentStage = "Processing browsing data";
            } else if (elapsed < 45000) {
                const finalPhaseProgress = Math.floor(((elapsed - 35000) / 10000) * 15);
                progressPercent = Math.min(80 + finalPhaseProgress, 95);
                currentStage = "Finalizing report";
            } else {
                progressPercent = Math.min(95 + Math.floor((elapsed - 45000) / 5000), 99);
                currentStage = "Almost ready";
            }
        } else if (reportDoc.status === "completed") {
            progressPercent = 100;
            currentStage = "Completed";
        } else if (reportDoc.status === "failed") {
            progressPercent = 0;
            currentStage = "Failed";
        }

        // Serialize MongoDB data to plain objects for Client Components
        // Explicitly exclude MongoDB-specific fields like _id
        const { _id, ...cleanDoc } = reportDoc;

        const responseData = {
            reportId,
            status: cleanDoc.status,
            progressPercent,
            currentStage,
            createdAt: cleanDoc.createdAt?.toISOString() || null,
            completedAt: cleanDoc.completedAt?.toISOString() || null,
            lastUpdated: cleanDoc.lastUpdated?.toISOString() || null,
            error: cleanDoc.error || null,
            errorType: cleanDoc.errorType || null,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error checking report status:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid report ID format" }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
