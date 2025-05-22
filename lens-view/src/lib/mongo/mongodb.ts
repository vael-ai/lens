import { MongoClient } from "mongodb";

/**
 * MongoDB Connection Module
 *
 * This module establishes and exports a MongoDB client connection that can be
 * shared across the application. It handles different configurations for
 * development and production environments.
 */

// Validate environment configuration
if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

// Connection options - can be expanded as needed
const options = {};

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    // This prevents creating multiple connections during development.
    const globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
    };

    if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new MongoClient(uri, options);
    }
    client = globalWithMongo._mongoClient;
} else {
    // In production mode, it's best to not use a global variable.
    // Each serverless function instance will have its own connection.
    client = new MongoClient(uri, options);
}

/**
 * Export a module-scoped MongoClient.
 *
 * By doing this in a separate module, the client can be shared across functions,
 * which helps with connection pooling and performance.
 *
 * @returns MongoDB client instance
 */
export default client;
// Added database connection notes
