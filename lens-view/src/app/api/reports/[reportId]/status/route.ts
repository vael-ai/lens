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

        const reportDoc = await reportsCollection.findOne(
            { reportId },
            { projection: { status: 1, createdAt: 1, completedAt: 1, error: 1 } }
        );

        if (!reportDoc) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Calculate processing progress
        let progressPercent = 0;
        if (reportDoc.status === "processing") {
            const elapsed = Date.now() - reportDoc.createdAt.getTime();
            const estimatedTotal = 45000; // 45 seconds
            progressPercent = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 95);
        } else if (reportDoc.status === "completed") {
            progressPercent = 100;
        }

        return NextResponse.json({
            reportId,
            status: reportDoc.status,
            progressPercent,
            createdAt: reportDoc.createdAt,
            completedAt: reportDoc.completedAt || null,
            error: reportDoc.error || null,
        });
    } catch (error) {
        console.error("Error checking report status:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid report ID format" }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await client.close();
    }
}
