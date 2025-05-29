import jwt from "jsonwebtoken";
import { env } from "@/env";

export interface InternalJWTPayload {
    reportId: string;
    email: string;
    timestamp: number;
    purpose: "report-processing";
}

/**
 * Generate an internal JWT token for server-to-server authentication
 * Only used for internal API calls within the same application
 */
export function generateInternalToken(payload: Omit<InternalJWTPayload, "timestamp" | "purpose">): string {
    const fullPayload: InternalJWTPayload = {
        ...payload,
        timestamp: Date.now(),
        purpose: "report-processing",
    };

    return jwt.sign(fullPayload, env.INTERNAL_JWT_SECRET, {
        expiresIn: "1h", // Token expires in 1 hour
        issuer: "lens-api-internal",
        audience: "lens-api-internal",
    });
}

/**
 * Verify and decode an internal JWT token
 * Returns the payload if valid, throws an error if invalid
 */
export function verifyInternalToken(token: string): InternalJWTPayload {
    try {
        const decoded = jwt.verify(token, env.INTERNAL_JWT_SECRET, {
            issuer: "lens-api-internal",
            audience: "lens-api-internal",
        }) as InternalJWTPayload;

        // Additional validation
        if (decoded.purpose !== "report-processing") {
            throw new Error("Invalid token purpose");
        }

        // Check if token is too old (extra security layer)
        const tokenAge = Date.now() - decoded.timestamp;
        if (tokenAge > 60 * 60 * 1000) {
            // 1 hour in milliseconds
            throw new Error("Token is too old");
        }

        return decoded;
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error(`Invalid token: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Middleware to validate internal JWT tokens in API routes
 */
export function validateInternalToken(request: Request): InternalJWTPayload {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    return verifyInternalToken(token);
}
