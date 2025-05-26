/**
 * Global data collection configuration for lens extension
 * Centralized limits and constants for data collection
 */

/**
 * Data size limits for collection and report generation
 */
export const DATA_LIMITS = {
  /** Maximum data size allowed for collection (500KB) */
  MAX_COLLECTION_SIZE_BYTES: 500 * 1024, // 500KB

  /** Minimum data size required for report generation (20KB) */
  MIN_REPORT_SIZE_BYTES: 20 * 1024, // 20KB

  /** Maximum data size for a single domain (50KB) */
  MAX_DOMAIN_SIZE_BYTES: 50 * 1024, // 50KB

  /** Warning threshold when approaching max size (400KB) */
  WARNING_SIZE_BYTES: 400 * 1024 // 400KB
} as const

/**
 * Collection behavior settings
 */
export const COLLECTION_CONFIG = {
  /** Whether to automatically stop collection when reaching max size */
  AUTO_STOP_ON_MAX_SIZE: true,

  /** Whether to prioritize recent data when pruning */
  PRIORITIZE_RECENT_DATA: true,

  /** Number of days to keep data before pruning old entries */
  DATA_RETENTION_DAYS: 30,

  /** Maximum number of domains to track simultaneously */
  MAX_TRACKED_DOMAINS: 100
} as const

/**
 * Privacy and blacklist enforcement
 */
export const PRIVACY_CONFIG = {
  /** Whether blacklisted domains should be strictly enforced */
  STRICT_BLACKLIST_ENFORCEMENT: true,

  /** Whether to automatically blacklist sensitive domains */
  AUTO_BLACKLIST_SENSITIVE: true,

  /** Sensitive domain patterns to auto-blacklist */
  SENSITIVE_PATTERNS: [
    /.*\.bank$/,
    /.*banking.*/,
    /.*\.gov$/,
    /.*medical.*/,
    /.*health.*/,
    /.*\.healthcare$/
  ] as const
} as const

/**
 * Utility functions for data size management
 */
export const DataSizeUtils = {
  /**
   * Convert bytes to human-readable format
   */
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  },

  /**
   * Check if data size is within collection limits
   */
  isWithinCollectionLimit: (sizeBytes: number): boolean => {
    return sizeBytes <= DATA_LIMITS.MAX_COLLECTION_SIZE_BYTES
  },

  /**
   * Check if data size meets minimum report requirements
   */
  meetsReportMinimum: (sizeBytes: number): boolean => {
    return sizeBytes >= DATA_LIMITS.MIN_REPORT_SIZE_BYTES
  },

  /**
   * Calculate percentage of max size used
   */
  getUsagePercentage: (sizeBytes: number): number => {
    return (sizeBytes / DATA_LIMITS.MAX_COLLECTION_SIZE_BYTES) * 100
  },

  /**
   * Check if approaching warning threshold
   */
  isApproachingLimit: (sizeBytes: number): boolean => {
    return sizeBytes >= DATA_LIMITS.WARNING_SIZE_BYTES
  }
} as const

const config = {
  DATA_LIMITS,
  COLLECTION_CONFIG,
  PRIVACY_CONFIG,
  DataSizeUtils
}

export default config
