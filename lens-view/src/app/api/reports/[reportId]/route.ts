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
        const reportDoc = await reportsCollection.findOne({ reportId });

        if (!reportDoc) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        if (reportDoc.status !== "completed") {
            return NextResponse.json(
                {
                    error: "Report not ready",
                    status: reportDoc.status,
                    message:
                        reportDoc.status === "processing"
                            ? "Report is still being processed"
                            : "Report processing failed",
                    createdAt: reportDoc.createdAt?.toISOString() || null,
                },
                { status: 202 }
            );
        }

        // Serialize MongoDB data to plain objects for Client Components
        // Explicitly exclude MongoDB-specific fields like _id
        const { _id, ...cleanDoc } = reportDoc;

        return NextResponse.json({
            success: true,
            report: cleanDoc.report,
            reportId: cleanDoc.reportId,
            email: cleanDoc.email,
            createdAt: cleanDoc.createdAt?.toISOString() || null,
            completedAt: cleanDoc.completedAt?.toISOString() || null,
        });
    } catch (error) {
        console.error("Error retrieving report:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid report ID format" }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
