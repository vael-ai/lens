import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/mongo/mongodb";
import { z } from "zod";

const paramsSchema = z.object({
    reportId: z.string().uuid("Invalid UUID format"),
});

export async function GET(request: NextRequest, { params }: { params: { reportId: string } }) {
    try {
        const { reportId } = paramsSchema.parse(params);

        await client.connect();
        const db = client.db("lens-vael");
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
                },
                { status: 202 }
            );
        }

        return NextResponse.json({
            success: true,
            report: reportDoc.report,
            reportId,
            email: reportDoc.email,
            createdAt: reportDoc.createdAt,
            completedAt: reportDoc.completedAt,
        });
    } catch (error) {
        console.error("Error retrieving report:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid report ID format" }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await client.close();
    }
}
