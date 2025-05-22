import { Storage } from "@plasmohq/storage"

// Initialize storage with error handling
let storage: Storage
try {
  storage = new Storage()
} catch (error) {
  console.error("Failed to initialize storage:", error)
  // Create a fallback storage object that does nothing
  storage = {
    get: async () => null,
    set: async () => {}
  } as unknown as Storage
}

// Default configuration
export const DEFAULT_CONFIG = {
  // Master toggle for data collection
  masterCollectionEnabled: true,

  // Main toggles for data collection types
  collectPageMetadata: true,
  collectInteractions: true,
  collectDeviceInfo: true,
  collectContent: true,

  // Domain-specific toggles
  collectEcommerce: true,
  collectTravel: true,
  collectProductivity: true,

  // Privacy controls
  collectAnalytics: true, // Anonymous usage analytics for the extension itself

  // Blacklisted domains (default sensitive domains)
  blacklistedDomains: [
    // Banking
    "chase.com",
    "bankofamerica.com",
    "wellsfargo.com",
    "citibank.com",
    "capitalone.com",
    "paypal.com",
    "venmo.com",
    "robinhood.com",
    "ally.com",
    "usbank.com",
    "discover.com",
    "pnc.com",
    "tdbank.com",
    "schwab.com",
    "fidelity.com",
    "vanguard.com",
    "etrade.com",

    // Health
    "healthcare.gov",
    "myuhc.com",
    "anthem.com",
    "aetna.com",
    "mychart.com",
    "zocdoc.com",
    "bcbs.com",
    "cigna.com",
    "webmd.com",
    "mayoclinic.org",
    "medlineplus.gov",

    // Email & Communication
    "gmail.com",
    "outlook.com",
    "yahoo.com",
    "mail.google.com",
    "protonmail.com",

    // Government
    "irs.gov",
    "ssa.gov",
    "medicare.gov",
    "dmv.ca.gov",
    "usps.com",
    "va.gov",
    "studentaid.gov",
    "usa.gov",

    // Password managers
    "1password.com",
    "lastpass.com",
    "bitwarden.com",
    "dashlane.com",
    "keepersecurity.com"
  ],

  // Whitelisted domains (initially empty)
  whitelistedDomains: []
}

// Type for our configuration
export interface UserConfig {
  masterCollectionEnabled: boolean
  collectPageMetadata: boolean
  collectInteractions: boolean
  collectDeviceInfo: boolean
  collectContent: boolean
  collectEcommerce: boolean
  collectTravel: boolean
  collectProductivity: boolean
  collectAnalytics: boolean
  blacklistedDomains: string[]
  whitelistedDomains: string[]
}

// Keys for storage
const CONFIG_KEY = "vael_config"
const USER_ID_KEY = "vael_user_id"

/**
 * Safe storage wrapper to handle context invalidation errors
 * @param operation - The storage operation to perform
 * @param fallback - The value to return if the operation fails
 * @returns The result of the operation or the fallback value
 */
const safeStorageOp = async <T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Extension context invalidated") ||
        error.message.includes("Context invalidated") ||
        error.message.includes("InvalidStateError"))
    ) {
      console.warn(
        "Storage operation failed due to extension context invalidation - returning fallback value"
      )
      return fallback
    }
    throw error
  }
}

/**
 * Retrieves the user's configuration from storage
 * Falls back to default configuration if none exists or if an error occurs
 * @returns A promise resolving to the user's configuration object
 */
export const getUserConfig = async (): Promise<UserConfig> => {
  try {
    const config = await safeStorageOp(
      async () => storage.get<UserConfig>(CONFIG_KEY),
      null
    )
    return config || DEFAULT_CONFIG
  } catch (error) {
    console.error("Error getting user config:", error)
    return DEFAULT_CONFIG
  }
}

/**
 * Updates the user's configuration with new settings
 * Merges the provided partial configuration with the existing settings
 * @param newConfig - Partial configuration object containing only the settings to update
 * @returns A promise resolving to the complete updated configuration
 */
export const updateUserConfig = async (
  newConfig: Partial<UserConfig>
): Promise<UserConfig> => {
  try {
    const currentConfig = await getUserConfig()
    const updatedConfig = { ...currentConfig, ...newConfig }
    await safeStorageOp(
      async () => storage.set(CONFIG_KEY, updatedConfig),
      null
    )
    return updatedConfig
  } catch (error) {
    console.error("Error updating user config:", error)
    return await getUserConfig()
  }
}

/**
 * Adds a domain to the user's blacklist
 * Normalizes the domain by removing www. prefix if present
 * @param domain - The domain to add to the blacklist
 * @returns A promise resolving to the complete updated blacklist array
 */
export const addToBlacklist = async (domain: string): Promise<string[]> => {
  try {
    const config = await getUserConfig()

    // Normalize domain by removing www. prefix if present
    const normalizedDomain = domain.replace(/^www\./, "")

    // Don't add if already in blacklist
    if (!config.blacklistedDomains.includes(normalizedDomain)) {
      const newBlacklist = [...config.blacklistedDomains, normalizedDomain]
      await updateUserConfig({ blacklistedDomains: newBlacklist })
      return newBlacklist
    }

    return config.blacklistedDomains
  } catch (error) {
    console.error("Error adding domain to blacklist:", error)
    const config = await getUserConfig()
    return config.blacklistedDomains
  }
}

/**
 * Removes a domain from the user's blacklist
 * @param domain - The domain to remove from the blacklist
 * @returns A promise resolving to the updated blacklist array
 */
export const removeFromBlacklist = async (
  domain: string
): Promise<string[]> => {
  try {
    const config = await getUserConfig()
    const newBlacklist = config.blacklistedDomains.filter((d) => d !== domain)
    await updateUserConfig({ blacklistedDomains: newBlacklist })
    return newBlacklist
  } catch (error) {
    console.error("Error removing domain from blacklist:", error)
    const config = await getUserConfig()
    return config.blacklistedDomains
  }
}

/**
 * Adds a domain to the user's whitelist
 * Normalizes the domain by removing www. prefix if present
 * @param domain - The domain to add to the whitelist
 * @returns A promise resolving to the complete updated whitelist array
 */
export const addToWhitelist = async (domain: string): Promise<string[]> => {
  try {
    const config = await getUserConfig()

    // Normalize domain by removing www. prefix if present
    const normalizedDomain = domain.replace(/^www\./, "")

    // Don't add if already in whitelist
    if (!config.whitelistedDomains.includes(normalizedDomain)) {
      const newWhitelist = [...config.whitelistedDomains, normalizedDomain]
      await updateUserConfig({ whitelistedDomains: newWhitelist })
      return newWhitelist
    }

    return config.whitelistedDomains
  } catch (error) {
    console.error("Error adding domain to whitelist:", error)
    const config = await getUserConfig()
    return config.whitelistedDomains
  }
}

/**
 * Removes a domain from the user's whitelist
 * @param domain - The domain to remove from the whitelist
 * @returns A promise resolving to the updated whitelist array
 */
export const removeFromWhitelist = async (
  domain: string
): Promise<string[]> => {
  try {
    const config = await getUserConfig()
    const newWhitelist = config.whitelistedDomains.filter((d) => d !== domain)
    await updateUserConfig({ whitelistedDomains: newWhitelist })
    return newWhitelist
  } catch (error) {
    console.error("Error removing domain from whitelist:", error)
    const config = await getUserConfig()
    return config.whitelistedDomains
  }
}

/**
 * Checks if a domain is blacklisted in the user's configuration
 * Handles subdomains by checking if they match or end with a blacklisted domain
 * @param domain - The domain to check against the blacklist
 * @returns A promise resolving to true if the domain is blacklisted, false otherwise
 */
export const isDomainBlacklisted = async (domain: string): Promise<boolean> => {
  try {
    const config = await getUserConfig()

    // Normalize domain by removing www. prefix if present
    const normalizedDomain = domain.replace(/^www\./, "")

    // First check if the domain is whitelisted
    const isWhitelisted = config.whitelistedDomains.some(
      (whitelistedDomain) =>
        normalizedDomain === whitelistedDomain ||
        normalizedDomain.endsWith(`.${whitelistedDomain}`)
    )

    // If domain is whitelisted, it's not blacklisted regardless of blacklist status
    if (isWhitelisted) {
      return false
    }

    return config.blacklistedDomains.some((blacklistedDomain) => {
      // Check for exact match or subdomain match
      return (
        normalizedDomain === blacklistedDomain ||
        normalizedDomain.endsWith(`.${blacklistedDomain}`)
      )
    })
  } catch (error) {
    console.error("Error checking if domain is blacklisted:", error)
    return false // Default to not blacklisted on error
  }
}

/**
 * Gets the user's unique identifier, or creates one if it doesn't exist
 * Used for analytics and data management
 * @returns A promise resolving to the user's ID string
 */
export const getUserId = async (): Promise<string> => {
  try {
    let userId = await safeStorageOp(
      async () => storage.get<string>(USER_ID_KEY),
      null
    )

    if (!userId) {
      // Generate a random UUID v4
      userId = crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0
            const v = c === "x" ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })

      await safeStorageOp(async () => storage.set(USER_ID_KEY, userId), null)
    }

    return userId
  } catch (error) {
    console.error("Error getting user ID:", error)
    // Generate a temporary ID
    return "temp-" + Math.random().toString(36).substring(2, 15)
  }
}

/**
 * Resets the user's configuration to default settings
 * @returns A promise resolving to the default configuration
 */
export const resetConfig = async (): Promise<UserConfig> => {
  try {
    await safeStorageOp(
      async () => storage.set(CONFIG_KEY, DEFAULT_CONFIG),
      null
    )
    return DEFAULT_CONFIG
  } catch (error) {
    console.error("Error resetting config:", error)
    return DEFAULT_CONFIG
  }
}

/**
 * Determines if data should be collected for a given URL
 * Checks master collection toggle, URL validity, and blacklist status
 * @param url - The URL to check for data collection eligibility
 * @returns A promise resolving to true if data should be collected, false otherwise
 */
export const shouldCollectData = async (url: string): Promise<boolean> => {
  try {
    // Parse the URL to get the domain
    const parsedUrl = new URL(url)
    const domain = parsedUrl.hostname

    const config = await getUserConfig()

    // First check the master toggle
    if (!config.masterCollectionEnabled) {
      return false
    }

    // Check if domain is blacklisted
    const isBlacklisted = await isDomainBlacklisted(domain)
    if (isBlacklisted) {
      return false
    }

    return (
      config.collectPageMetadata ||
      config.collectInteractions ||
      config.collectDeviceInfo ||
      config.collectContent
    )
  } catch (error) {
    console.error("Error checking if should collect data:", error)
    return false // Default to not collecting on error
  }
}
