import { Storage } from "@plasmohq/storage"

import type {
  AnalyticsEvent,
  CollectedData,
  DeviceInfo,
  DomainSpecificData,
  InteractionData,
  PageMetadata,
  StackedInteraction,
  TabActivity,
  WebsiteData
} from "../types/data"
import { getPlatform } from "./api"
import { collectDeviceInfo } from "./collectors/device"
import { collectDomainSpecificData } from "./collectors/domain-specific"
import { collectUserInteractions } from "./collectors/interactions"
import { collectPageMetadata } from "./collectors/metadata"
import { generateUUID, isValidUrl } from "./helpers"
import {
  getUserConfig,
  getUserId,
  isDomainBlacklisted
} from "./userPreferences"

// Initialize storage
const storage = new Storage({ area: "local" })
const COLLECTED_DATA_KEY = "vael_collected_data"

/**
 * Helper function to safely execute storage operations with proper error handling
 * @param operation Storage operation to perform
 * @param fallbackValue Value to return if operation fails
 * @param errorMessage Custom error message for logging
 * @returns Result of operation or fallback value
 */
const safeStorageOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  errorMessage = "Storage operation failed"
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    const isContextInvalidated =
      error instanceof Error &&
      (error.message.includes("Extension context invalidated") ||
        error.message.includes("Context invalidated"))

    if (isContextInvalidated) {
      console.warn(
        `${errorMessage} due to extension context invalidation - returning fallback value`
      )
    } else {
      console.error(`${errorMessage}:`, error)
    }
    return fallbackValue
  }
}

/**
 * Generates a standardized key for storing website data
 * @param url The URL to generate a key for
 * @param includePath Whether to include the path in the key
 * @returns A standardized key for storing website data
 */
const getUrlKey = (url: string, includePath = true): string => {
  try {
    const urlObj = new URL(url)
    return includePath ? urlObj.hostname + urlObj.pathname : urlObj.hostname
  } catch (e) {
    console.warn(`Failed to parse URL: ${url}, using as-is`)
    return url
  }
}

/**
 * Retrieves existing collected data from storage
 * @returns A promise resolving to the current collected data object, or null if not found
 */
export const getCollectedData = async (): Promise<CollectedData | null> => {
  return safeStorageOperation(
    async () => storage.get<CollectedData>(COLLECTED_DATA_KEY),
    null,
    "Error getting collected data"
  )
}

/**
 * Initializes collected data if it does not exist
 * Creates a new collected data object with default values
 * @returns A promise resolving to the new or existing collected data object
 */
export const initializeCollectedData = async (): Promise<CollectedData> => {
  try {
    // Check if we already have data
    const existingData = await getCollectedData()
    if (existingData) return existingData

    // Get user ID
    const userId = await getUserId()
    const deviceInfo = await collectDeviceInfo()

    // Create new data
    const newData: CollectedData = {
      userId,
      deviceInfo,
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      websites: {},
      browserPatterns: {
        averageDailyTabs: 0,
        tabSwitchFrequency: 0,
        averageSessionDuration: 0,
        commonDomains: []
      }
    }

    // Save new data
    await safeStorageOperation(
      async () => storage.set(COLLECTED_DATA_KEY, newData),
      null,
      "Error saving new collected data"
    )

    return newData
  } catch (error) {
    console.error("Error initializing collected data:", error)

    // If we can't initialize, create a minimal structure that won't cause errors
    const userId = generateUUID()
    return {
      userId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: getPlatform(),
        screenSize: { width: screen.width, height: screen.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        languages: Array.from(navigator.languages),
        connection: {
          type: "unknown",
          downlink: 0,
          rtt: 0,
          effectiveType: "unknown",
          saveData: false
        }
      },
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      websites: {}
    }
  }
}

/**
 * Saves collected data to storage
 * @param data The data to save
 */
export const saveCollectedData = async (data: CollectedData): Promise<void> => {
  await safeStorageOperation(
    async () => storage.set(COLLECTED_DATA_KEY, data),
    null,
    "Error saving collected data"
  )
}

/**
 * Updates the website data in the collected data
 * @param url The URL of the website
 * @param updateFn Function to update the website data
 */
export const updateWebsiteData = async (
  url: string,
  updateFn: (website: WebsiteData) => WebsiteData
): Promise<void> => {
  try {
    // Get current data
    let data = await getCollectedData()
    if (!data) {
      data = await initializeCollectedData()
    }

    // Get or create website data
    const urlKey = getUrlKey(url)
    const existingWebsite = data.websites[urlKey]

    let domain = url
    let path: string | undefined

    try {
      const urlObj = new URL(url)
      domain = urlObj.hostname
      path = urlObj.pathname
    } catch (e) {
      console.warn(`Failed to parse URL: ${url}`)
    }

    if (existingWebsite) {
      // Update existing website
      data.websites[urlKey] = updateFn(existingWebsite)
    } else {
      // Create new website entry
      data.websites[urlKey] = updateFn({
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        visitCount: 1,
        totalFocusTime: 0,
        url,
        domain,
        path,
        interactions: {}
      })
    }

    // Update last updated timestamp
    data.lastUpdated = Date.now()

    // Save data
    await saveCollectedData(data)
  } catch (error) {
    console.error("Error updating website data:", error)
  }
}

/**
 * Updates user interactions for a website
 * @param url The URL of the website
 * @param interactions The new interactions to add
 */
export const updateInteractions = async (
  url: string,
  interactions: InteractionData[]
): Promise<void> => {
  if (!interactions.length) return

  await updateWebsiteData(url, (website) => {
    const updatedInteractions = { ...website.interactions }

    // Process each interaction
    for (const interaction of interactions) {
      const type = interaction.type

      if (!updatedInteractions[type]) {
        // Create new interaction type
        updatedInteractions[type] = {
          type,
          count: interaction.count || 1,
          firstOccurrence: interaction.timestamp,
          lastOccurrence: interaction.timestamp,
          instances: interaction.instanceId
            ? [
                {
                  instanceId: interaction.instanceId,
                  timestamp: interaction.timestamp
                }
              ]
            : []
        }

        // Initialize type-specific properties
        switch (type) {
          case "hover":
            updatedInteractions[type].averageDuration =
              interaction.duration || 0
            break
          case "scroll":
            if (interaction.scrollData) {
              updatedInteractions[type].scrollPatterns = {
                averageDepth: interaction.scrollData.percentScrolled,
                preferredDirection: interaction.scrollData.direction,
                maxDepthReached: interaction.scrollData.percentScrolled,
                recentScrollPositions: [interaction.scrollData.position]
              }
            }
            break
          case "selection":
            if (interaction.selectionLength) {
              updatedInteractions[type].selectionStats = {
                averageLength: interaction.selectionLength,
                count: 1
              }
            }
            break
        }
      } else {
        // Update existing interaction
        const existingInteraction = updatedInteractions[type]
        existingInteraction.count += interaction.count || 1
        existingInteraction.lastOccurrence = interaction.timestamp

        // Only track a limited number of recent instances for deduplication
        if (
          interaction.instanceId &&
          !existingInteraction.instances?.some(
            (i) => i.instanceId === interaction.instanceId
          )
        ) {
          existingInteraction.instances = existingInteraction.instances || []
          existingInteraction.instances.push({
            instanceId: interaction.instanceId,
            timestamp: interaction.timestamp
          })

          // Limit number of tracked instances
          if (existingInteraction.instances.length > 50) {
            existingInteraction.instances =
              existingInteraction.instances.slice(-50)
          }
        }

        // Update type-specific properties
        switch (type) {
          case "hover":
            if (interaction.duration) {
              existingInteraction.averageDuration =
                (existingInteraction.averageDuration || 0) *
                  (existingInteraction.count - 1) +
                interaction.duration
              existingInteraction.averageDuration /= existingInteraction.count
            }
            break
          case "scroll":
            if (interaction.scrollData && existingInteraction.scrollPatterns) {
              const patterns = existingInteraction.scrollPatterns
              // Update average depth
              patterns.averageDepth =
                (patterns.averageDepth * (existingInteraction.count - 1) +
                  interaction.scrollData.percentScrolled) /
                existingInteraction.count
              // Update max depth
              patterns.maxDepthReached = Math.max(
                patterns.maxDepthReached,
                interaction.scrollData.percentScrolled
              )
              // Update preferred direction
              const { direction } = interaction.scrollData
              if (direction !== patterns.preferredDirection) {
                // Simple heuristic: If more than 70% of scrolls are in one direction, it's preferred
                const directionCount = existingInteraction.count * 0.7
                if (directionCount > existingInteraction.count / 2) {
                  patterns.preferredDirection = direction
                }
              }
              // Add to recent positions
              patterns.recentScrollPositions.push(
                interaction.scrollData.position
              )
              // Limit number of positions
              if (patterns.recentScrollPositions.length > 10) {
                patterns.recentScrollPositions =
                  patterns.recentScrollPositions.slice(-10)
              }
            }
            break
          case "selection":
            if (
              interaction.selectionLength &&
              existingInteraction.selectionStats
            ) {
              const stats = existingInteraction.selectionStats
              stats.count++
              stats.averageLength =
                (stats.averageLength * (stats.count - 1) +
                  interaction.selectionLength) /
                stats.count
            }
            break
        }
      }

      // Update positions for clicks and hovers
      if ((type === "click" || type === "hover") && interaction.position) {
        const existingInteraction = updatedInteractions[type]
        existingInteraction.positions = existingInteraction.positions || []
        existingInteraction.positions.push(interaction.position)

        // Limit the number of stored positions
        if (existingInteraction.positions.length > 20) {
          existingInteraction.positions =
            existingInteraction.positions.slice(-20)
        }
      }

      // Update target elements for clicks and hovers using the simplified selectors
      if (
        (type === "click" || type === "hover" || type === "input") &&
        interaction.details
      ) {
        const existingInteraction = updatedInteractions[type]
        existingInteraction.targetElements =
          existingInteraction.targetElements || []

        // Use the enhanced element data if available
        if (interaction.details.elementPath) {
          // Check if we already have this element path
          const existingElement = existingInteraction.targetElements.find(
            (el) => el.elementPath === interaction.details.elementPath
          )

          if (existingElement) {
            // Update existing element entry
            existingElement.count++
            existingElement.lastInteracted = interaction.timestamp
          } else {
            // Add new element entry with the simplified data
            existingInteraction.targetElements.push({
              elementPath: interaction.details.elementPath,
              elementType: interaction.details.elementType || "unknown",
              contentHint: interaction.details.contentHint,
              count: 1,
              lastInteracted: interaction.timestamp
            })

            // Limit number of tracked elements
            if (existingInteraction.targetElements.length > 10) {
              // Keep most frequently used elements
              existingInteraction.targetElements.sort(
                (a, b) => b.count - a.count
              )
              existingInteraction.targetElements =
                existingInteraction.targetElements.slice(0, 10)
            }
          }
        }
      }

      // Update input field tracking
      if (type === "input" && interaction.fieldName) {
        const existingInteraction = updatedInteractions[type]
        existingInteraction.inputFields = existingInteraction.inputFields || []

        // Check if we already have this field
        const existingField = existingInteraction.inputFields.find(
          (field) => field.fieldName === interaction.fieldName
        )

        if (existingField) {
          existingField.interactionCount++
        } else {
          existingInteraction.inputFields.push({
            fieldName: interaction.fieldName,
            interactionCount: 1
          })
        }
      }
    }

    return {
      ...website,
      interactions: updatedInteractions
    }
  })
}

/**
 * Updates domain-specific data for a website
 * Collects and stores e-commerce, travel, or productivity related information
 * @param url - The URL of the website
 * @param domainData - The domain-specific data to add
 */
export const updateDomainSpecificData = async (
  url: string,
  domainData: DomainSpecificData
): Promise<void> => {
  await updateWebsiteData(url, (website) => {
    return {
      ...website,
      domainSpecificData: domainData
    }
  })
}

/**
 * Updates page metadata for a website
 * Stores information like page title, description, and meta tags
 * @param url - The URL of the website
 * @param metadata - The page metadata to add
 */
export const updatePageMetadata = async (
  url: string,
  metadata: PageMetadata
): Promise<void> => {
  await updateWebsiteData(url, (website) => {
    return {
      ...website,
      pageMetadata: metadata
    }
  })
}

/**
 * Updates tab activity statistics for a website
 * Tracks focus time, navigation patterns, and activation metrics
 * @param url - The URL of the website
 * @param activity - The tab activity data
 */
export const updateTabActivity = async (
  url: string,
  activity: TabActivity
): Promise<void> => {
  await updateWebsiteData(url, (website) => {
    // Calculate stats
    const focusTime = activity.focusTime || 0
    const activations = activity.activationCount || 0

    // Create or update tab stats
    let tabStats = website.tabActivityStats
    if (!tabStats) {
      tabStats = {
        averageFocusTime: focusTime,
        totalActivations: activations,
        averageActivationsPerVisit: activations
      }
    } else {
      tabStats.totalActivations += activations
      tabStats.averageFocusTime =
        (tabStats.averageFocusTime * (website.visitCount - 1) + focusTime) /
        website.visitCount
      tabStats.averageActivationsPerVisit =
        tabStats.totalActivations / website.visitCount
    }

    return {
      ...website,
      totalFocusTime: website.totalFocusTime + focusTime,
      tabActivityStats: tabStats
    }
  })

  // Also update browser patterns in the main collected data
  try {
    const data = await getCollectedData()
    if (data) {
      // Update common domains list
      const domain = new URL(url).hostname
      const commonDomains = data.browserPatterns?.commonDomains || []
      const existingDomain = commonDomains.find((d) => d.domain === domain)

      if (existingDomain) {
        existingDomain.visitCount++
        existingDomain.lastVisited = Date.now()
      } else {
        commonDomains.push({
          domain,
          visitCount: 1,
          lastVisited: Date.now()
        })
      }

      // Sort by visit count
      commonDomains.sort((a, b) => b.visitCount - a.visitCount)

      // Keep only top 20
      const topDomains = commonDomains.slice(0, 20)

      // Update browser patterns
      const browserPatterns = {
        ...data.browserPatterns,
        commonDomains: topDomains,
        // Update other stats if available
        averageDailyTabs: data.browserPatterns?.averageDailyTabs || 0,
        tabSwitchFrequency: data.browserPatterns?.tabSwitchFrequency || 0,
        averageSessionDuration:
          data.browserPatterns?.averageSessionDuration || 0
      }

      // Save updated data
      await saveCollectedData({
        ...data,
        browserPatterns,
        lastUpdated: Date.now()
      })
    }
  } catch (error) {
    console.error("Error updating browser patterns:", error)
  }
}

/**
 * Creates a structured analytics event object
 * Used for tracking extension usage and performance metrics
 * @param type - Type of analytics event
 * @param additionalData - Any additional data to include with the event
 * @returns A complete analytics event object with timestamp and UUID
 */
export const createAnalyticsEvent = (
  type: AnalyticsEvent["type"],
  additionalData: Partial<Omit<AnalyticsEvent, "type" | "timestamp">> = {}
): AnalyticsEvent => {
  return {
    type,
    timestamp: Date.now(),
    ...additionalData
  }
}

/**
 * Stores an analytics event in local storage
 * Maintains a log of extension usage for reporting and debugging
 * @param event - The analytics event to store
 * @returns A promise resolving to true if successful, false otherwise
 */
export const storeAnalyticsEvent = async (
  event: AnalyticsEvent
): Promise<boolean> => {
  try {
    const ANALYTICS_KEY = "vael_analytics_data"

    // Get existing events
    const existingEvents =
      (await storage.get<AnalyticsEvent[]>(ANALYTICS_KEY)) || []

    // Check for duplicates (same type within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const isDuplicate = existingEvents.some(
      (e) =>
        e.type === event.type &&
        e.url === event.url &&
        e.timestamp > fiveMinutesAgo
    )

    if (!isDuplicate) {
      // Add new event (keep most recent 100)
      const updatedEvents = [event, ...existingEvents].slice(0, 100)
      await storage.set(ANALYTICS_KEY, updatedEvents)
    } else {
      // If duplicate, update count on the existing event
      const duplicateEvent = existingEvents.find(
        (e) =>
          e.type === event.type &&
          e.url === event.url &&
          e.timestamp > fiveMinutesAgo
      )

      if (duplicateEvent) {
        duplicateEvent.count = (duplicateEvent.count || 1) + 1
        await storage.set(ANALYTICS_KEY, existingEvents)
      }
    }

    return true
  } catch (error) {
    console.error("Error storing analytics event:", error)
    return false
  }
}

/**
 * Exports all collected data as a JSON string
 * Used for data portability and backup purposes
 * @returns A promise resolving to a JSON string containing all collected data
 */
export const exportCollectedData = async (): Promise<string> => {
  try {
    const data = await getCollectedData()
    if (!data) return JSON.stringify({ error: "No data found" })

    return JSON.stringify(data, null, 2)
  } catch (error) {
    console.error("Error exporting data:", error)
    return JSON.stringify({ error: "Failed to export data" })
  }
}

/**
 * Clears all collected data from storage
 * Provides users with control over their data
 * @returns A promise resolving to true if successful, false otherwise
 */
export const clearCollectedData = async (): Promise<boolean> => {
  try {
    // Initialize with empty data structure
    const userId = await getUserId()
    const deviceInfo = await collectDeviceInfo()

    const emptyData: CollectedData = {
      userId,
      deviceInfo,
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      websites: {},
      browserPatterns: {
        averageDailyTabs: 0,
        tabSwitchFrequency: 0,
        averageSessionDuration: 0,
        commonDomains: []
      }
    }

    await saveCollectedData(emptyData)
    return true
  } catch (error) {
    console.error("Error clearing collected data:", error)
    return false
  }
}

/**
 * Updates domain classification for a website
 * @param url The URL of the website
 * @param classification The domain classification data to add
 */
export const updateDomainClassification = async (
  url: string,
  classification: WebsiteData["inferredDomainClassification"]
): Promise<void> => {
  if (!classification) return

  await updateWebsiteData(url, (website) => {
    return {
      ...website,
      inferredDomainClassification: classification
    }
  })
}
