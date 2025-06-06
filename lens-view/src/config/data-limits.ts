/**
 * Global data collection configuration for lens-view web application
 * Centralized limits and constants for report generation and API validation
 */

/**
 * Data size limits for report generation and API validation
 */
export const DATA_LIMITS = {
    /** Maximum data size allowed for report generation (500KB) */
    MAX_DATA_SIZE_BYTES: 500 * 1024, // 500KB

    /** Minimum data size required for report generation (20KB) */
    MIN_DATA_SIZE_BYTES: 20 * 1024, // 20KB

    /** Maximum size for a single website's data (50KB) */
    MAX_WEBSITE_SIZE_BYTES: 50 * 1024, // 50KB

    /** Warning threshold for large datasets (400KB) */
    WARNING_SIZE_BYTES: 400 * 1024, // 400KB
} as const;

/**
 * AI processing configuration
 */
export const AI_CONFIG = {
    /** Maximum tokens to send to Gemini AI */
    MAX_AI_TOKENS: 800000, // ~500KB of JSON data

    /** Maximum output tokens from AI */
    MAX_OUTPUT_TOKENS: 32000, // Reduced for faster processing

    /** Whether to enable full data transparency mode */
    FULL_TRANSPARENCY_MODE: true,

    /** Temperature setting for AI generation */
    AI_TEMPERATURE: 0.15,

    /** Maximum domains to analyze (optimize for speed) */
    MAX_DOMAINS_TO_ANALYZE: 30, // Only analyze top 30 most visited domains

    /** Minimum engagement threshold for domain inclusion */
    MIN_ENGAGEMENT_THRESHOLD: 2000, // Focus time + interaction score threshold
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
    /** Maximum reports per email per day */
    MAX_REPORTS_PER_EMAIL_PER_DAY: 3,

    /** Maximum reports per email per week */
    MAX_REPORTS_PER_EMAIL_PER_WEEK: 10,

    /** Maximum reports per IP per hour */
    MAX_REPORTS_PER_IP_PER_HOUR: 5,

    /** Maximum reports per IP per day */
    MAX_REPORTS_PER_IP_PER_DAY: 15,

    /** Maximum global reports per minute */
    MAX_GLOBAL_REPORTS_PER_MINUTE: 10,

    /** Maximum global reports per hour */
    MAX_GLOBAL_REPORTS_PER_HOUR: 100,
} as const;

/**
 * API response configuration
 */
export const API_CONFIG = {
    /** Default timeout for API requests (5 minutes) */
    DEFAULT_TIMEOUT_MS: 5 * 60 * 1000,

    /** Maximum processing time for reports (10 minutes) */
    MAX_PROCESSING_TIME_MS: 10 * 60 * 1000,

    /** Polling interval for status checks (2 seconds) */
    POLLING_INTERVAL_MS: 2000,
} as const;

/**
 * Utility functions for data size management
 */
export const DataSizeUtils = {
    /**
     * Convert bytes to human-readable format
     */
    formatBytes: (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    /**
     * Check if data size is within processing limits
     */
    isWithinProcessingLimit: (sizeBytes: number): boolean => {
        return sizeBytes <= DATA_LIMITS.MAX_DATA_SIZE_BYTES;
    },

    /**
     * Check if data size meets minimum requirements
     */
    meetsMinimumRequirement: (sizeBytes: number): boolean => {
        return sizeBytes >= DATA_LIMITS.MIN_DATA_SIZE_BYTES;
    },

    /**
     * Validate data size for report generation
     */
    validateDataSize: (sizeBytes: number): { valid: boolean; reason?: string } => {
        if (sizeBytes < DATA_LIMITS.MIN_DATA_SIZE_BYTES) {
            return {
                valid: false,
                reason: `Insufficient data for report generation. Minimum ${DataSizeUtils.formatBytes(DATA_LIMITS.MIN_DATA_SIZE_BYTES)} required.`,
            };
        }

        if (sizeBytes > DATA_LIMITS.MAX_DATA_SIZE_BYTES) {
            return {
                valid: false,
                reason: `Data size too large. Maximum ${DataSizeUtils.formatBytes(DATA_LIMITS.MAX_DATA_SIZE_BYTES)} allowed.`,
            };
        }

        return { valid: true };
    },

    /**
     * Calculate percentage of max size used
     */
    getUsagePercentage: (sizeBytes: number): number => {
        return (sizeBytes / DATA_LIMITS.MAX_DATA_SIZE_BYTES) * 100;
    },

    /**
     * Check if data size is approaching limits
     */
    isApproachingLimit: (sizeBytes: number): boolean => {
        return sizeBytes >= DATA_LIMITS.WARNING_SIZE_BYTES;
    },
} as const;

/**
 * Error messages for data validation
 */
export const ERROR_MESSAGES = {
    DATA_TOO_SMALL: `Insufficient data for report generation. Minimum ${DataSizeUtils.formatBytes(DATA_LIMITS.MIN_DATA_SIZE_BYTES)} required.`,
    DATA_TOO_LARGE: `Data size exceeds maximum limit. Maximum ${DataSizeUtils.formatBytes(DATA_LIMITS.MAX_DATA_SIZE_BYTES)} allowed.`,
    RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
    PROCESSING_TIMEOUT: "Report processing took longer than expected. Please try again.",
} as const;

const config = {
    DATA_LIMITS,
    AI_CONFIG,
    RATE_LIMITS,
    API_CONFIG,
    DataSizeUtils,
    ERROR_MESSAGES,
};

export default config;
