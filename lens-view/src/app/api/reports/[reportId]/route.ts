import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { z } from "zod";
import { extractEmailFromRequest, verifyReportAccess } from "@/lib/auth";
import { headers } from "next/headers";

// No caching for now

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
                    error: "Access denied - You don't have permission to view this report",
                },
                { status: 403 }
            );
        }

        // Direct MongoDB query
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");
        const reportDoc = await reportsCollection.findOne({ reportId, email }); // Include email in query for extra security

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
            comparisonInsights: cleanDoc.comparisonInsights || null,
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
