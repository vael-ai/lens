import { MongoClient } from "mongodb";

/**
 * MongoDB Connection Module for Serverless Environments
 *
 * This module establishes and exports a MongoDB client promise that can be
 * shared across the application. It handles different configurations for
 * development and production environments using a singleton pattern.
 */

// Validate environment configuration
if (!process.env.MONGODB_URI) {
    throw new Error('Missing environment variable: "MONGODB_URI"');
}

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

// Connection options optimized for serverless functions
const options = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    // This prevents creating multiple connections during development.
    const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // In production mode, create a new connection promise.
    // The connection will be reused across serverless function invocations.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

/**
 * Export a MongoDB client promise for serverless environments.
 *
 * This approach ensures:
 * - Single connection establishment per serverless instance
 * - Proper connection reuse across function invocations
 * - No manual connection management required
 * - Optimal performance for serverless functions
 *
 * Usage: const client = await clientPromise;
 *
 * @returns Promise that resolves to MongoDB client instance
 */
export default clientPromise;
