import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongo/mongodb";
import { z } from "zod";

export interface ReportAccess {
    reportId: string;
    email: string;
    authorized: boolean;
}

/**
 * Verify if an email has access to a specific report
 */
export async function verifyReportAccess(reportId: string, email: string): Promise<boolean> {
    try {
        const client = await clientPromise;
        const db = client.db("lens");
        const reportsCollection = db.collection("reports");

        const report = await reportsCollection.findOne({ reportId, email }, { projection: { reportId: 1, email: 1 } });

        return !!report;
    } catch (error) {
        console.error("Error verifying report access:", error);
        return false;
    }
}

/**
 * Extract and validate email from request headers or query parameters
 * For report access, we'll use a simple email-based auth approach
 */
export function extractEmailFromRequest(request: NextRequest): string | null {
    // Check Authorization header first (Bearer email format)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const email = authHeader.replace("Bearer ", "");
        if (isValidEmail(email)) {
            return email;
        }
    }

    // Check X-User-Email header
    const emailHeader = request.headers.get("x-user-email");
    if (emailHeader && isValidEmail(emailHeader)) {
        return emailHeader;
    }

    // Check query parameter
    const url = new URL(request.url);
    const emailParam = url.searchParams.get("email");
    if (emailParam && isValidEmail(emailParam)) {
        return emailParam;
    }

    return null;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
    const emailSchema = z.string().email();
    try {
        emailSchema.parse(email);
        return true;
    } catch {
        return false;
    }
}

/**
 * Enhanced rate limiting for anonymous endpoints with security improvements
 */
interface RateLimitConfig {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    windowMs: number;
    // Enhanced security options
    trustedProxies: string[];
    allowlist: string[];
    cleanupInterval: number; // How often to clean old records (in ms)
}

const ANONYMOUS_RATE_LIMITS: RateLimitConfig = {
    maxRequestsPerMinute: 5,
    maxRequestsPerHour: 20,
    maxRequestsPerDay: 100, // Daily limit for additional protection
    windowMs: 60 * 1000, // 1 minute
    trustedProxies: ["127.0.0.1", "::1"], // Localhost proxies
    allowlist: [], // Can add trusted IPs here
    cleanupInterval: 60 * 60 * 1000, // Clean old records every hour
};

/**
 * Extract real client IP with proxy chain handling
 */
function extractClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip"); // Cloudflare

    // Handle proxy chain - take the first non-trusted IP
    if (forwardedFor) {
        const ips = forwardedFor.split(",").map((ip) => ip.trim());
        for (const ip of ips) {
            if (!ANONYMOUS_RATE_LIMITS.trustedProxies.includes(ip)) {
                return ip;
            }
        }
    }

    // Cloudflare connecting IP (more reliable than x-forwarded-for)
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // Real IP header
    if (realIP) {
        return realIP;
    }

    // Fallback to unknown (NextRequest doesn't have direct IP access)
    return "unknown";
}

export async function checkAnonymousRateLimit(
    request: NextRequest
): Promise<{ allowed: boolean; error?: string; remainingRequests?: number }> {
    try {
        const clientIP = extractClientIP(request);

        // Check allowlist first
        if (ANONYMOUS_RATE_LIMITS.allowlist.includes(clientIP)) {
            return { allowed: true, remainingRequests: -1 }; // Unlimited for allowlisted IPs
        }

        const client = await clientPromise;
        const db = client.db("lens");
        const rateLimitCollection = db.collection("rate_limits");

        // Create TTL index for automatic cleanup if it doesn't exist
        await rateLimitCollection
            .createIndex(
                { timestamp: 1 },
                { expireAfterSeconds: 24 * 60 * 60 } // Remove records older than 24 hours
            )
            .catch((error) => {
                // Ignore if index already exists
                console.debug("Index creation skipped:", error?.message);
            });

        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Check all limits in parallel for efficiency
        const [requestsThisMinute, requestsThisHour, requestsThisDay] = await Promise.all([
            rateLimitCollection.countDocuments({
                clientIP,
                timestamp: { $gte: oneMinuteAgo },
            }),
            rateLimitCollection.countDocuments({
                clientIP,
                timestamp: { $gte: oneHourAgo },
            }),
            rateLimitCollection.countDocuments({
                clientIP,
                timestamp: { $gte: oneDayAgo },
            }),
        ]);

        // Check minute limit
        if (requestsThisMinute >= ANONYMOUS_RATE_LIMITS.maxRequestsPerMinute) {
            return {
                allowed: false,
                error: "Rate limit exceeded: Too many requests per minute",
                remainingRequests: 0,
            };
        }

        // Check hour limit
        if (requestsThisHour >= ANONYMOUS_RATE_LIMITS.maxRequestsPerHour) {
            return {
                allowed: false,
                error: "Rate limit exceeded: Too many requests per hour",
                remainingRequests: 0,
            };
        }

        // Check daily limit
        if (requestsThisDay >= ANONYMOUS_RATE_LIMITS.maxRequestsPerDay) {
            return {
                allowed: false,
                error: "Rate limit exceeded: Too many requests per day",
                remainingRequests: 0,
            };
        }

        // Log this request with additional metadata
        await rateLimitCollection.insertOne({
            clientIP,
            timestamp: now,
            endpoint: "anonymous",
            userAgent: request.headers.get("user-agent") || "unknown",
            referer: request.headers.get("referer") || "direct",
        });

        // Return remaining requests (use the most restrictive limit)
        const remainingMinute = ANONYMOUS_RATE_LIMITS.maxRequestsPerMinute - requestsThisMinute - 1;
        const remainingHour = ANONYMOUS_RATE_LIMITS.maxRequestsPerHour - requestsThisHour - 1;
        const remainingDay = ANONYMOUS_RATE_LIMITS.maxRequestsPerDay - requestsThisDay - 1;

        return {
            allowed: true,
            remainingRequests: Math.min(remainingMinute, remainingHour, remainingDay),
        };
    } catch (error) {
        console.error("Error checking rate limit:", error);
        return { allowed: true }; // Allow on error to avoid blocking users
    }
}
