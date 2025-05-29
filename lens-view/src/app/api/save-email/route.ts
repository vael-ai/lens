import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { checkAnonymousRateLimit } from "@/lib/auth";
import { headers } from "next/headers";

// Email saving should not be cached as each request is unique
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // Get client IP for rate limiting
        const headersList = await headers();
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIP = headersList.get("x-real-ip");
        const clientIP = forwardedFor?.split(",")[0] ?? realIP ?? "unknown";

        // Check rate limits for anonymous endpoint
        const rateLimitCheck = await checkAnonymousRateLimit(request);
        if (!rateLimitCheck.allowed) {
            return NextResponse.json(
                {
                    error: rateLimitCheck.error,
                    type: "rate_limit_exceeded",
                    remainingRequests: rateLimitCheck.remainingRequests ?? 0,
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Remaining": (rateLimitCheck.remainingRequests ?? 0).toString(),
                        "Retry-After": "60", // Suggest retry after 60 seconds
                    },
                }
            );
        }

        const { email } = await request.json();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
        }

        // Get MongoDB client from connection promise
        const client = await clientPromise;
        const db = client.db("lens");
        const collection = db.collection("emails");

        // Check if email already exists
        const existingEmail = await collection.findOne({ email });
        if (existingEmail) {
            return NextResponse.json({ message: "Email already registered", exists: true }, { status: 200 });
        }

        // Save email with timestamp (no IP collection for privacy)
        const result = await collection.insertOne({
            email,
            registeredAt: new Date(),
            source: "lens-extension",
        });

        return NextResponse.json({
            message: "Email saved successfully",
            success: true,
            id: result.insertedId,
        });
    } catch (error) {
        console.error("Error saving email:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
