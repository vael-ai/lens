/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    experimental: {
        serverActions: {
            bodySizeLimit: "1mb",
        },
        // Enable experimental caching features for better Vercel performance
        staleTimes: {
            dynamic: 30, // Cache dynamic routes for 30 seconds
            static: 180, // Cache static content for 3 minutes
        },
    },
};

export default config;
