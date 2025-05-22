import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/mongo/mongodb";

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
        }

        // Connect to MongoDB
        await client.connect();
        const db = client.db("lens");
        const collection = db.collection("emails");

        // Check if email already exists
        const existingEmail = await collection.findOne({ email });
        if (existingEmail) {
            return NextResponse.json({ message: "Email already registered", exists: true }, { status: 200 });
        }

        // Get IP address from headers
        const forwardedFor = request.headers.get("x-forwarded-for");
        const realIp = request.headers.get("x-real-ip");
        const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown";

        // Save email with timestamp
        const result = await collection.insertOne({
            email,
            registeredAt: new Date(),
            source: "lens-extension",
            ipAddress,
        });

        return NextResponse.json({
            message: "Email saved successfully",
            success: true,
            id: result.insertedId,
        });
    } catch (error) {
        console.error("Error saving email:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await client.close();
    }
}
