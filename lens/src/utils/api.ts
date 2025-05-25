import { Storage } from "@plasmohq/storage"

import type {
  AnalyticsEvent,
  CollectedData,
  DeviceInfo,
  InteractionData,
  StackedInteraction,
  WebsiteData
} from "../types/data"
import { collectDeviceInfo } from "./collectors/device"
/**
 * Sends collected data to the lens by vael Context Bank service
 * Main entry point for sending data to the server
 * @param data - The collected data to send
 * @returns Promise resolving to true if successful, false otherwise
 */
import { MAX_DATA_COLLECTION_BYTES } from "./constants"
import { exportCollectedData } from "./dataCollection"
import {
  createElementPath,
  getContentHint,
  getElementTypeDescription
} from "./domUtils"
import { generateUUID, isValidUrl } from "./helpers"
import { getUserConfig, getUserId } from "./userPreferences"

// Get API base URL based on environment variable
const getAPIBaseURL = () => {
  const useLocalAPI = process.env.PLASMO_PUBLIC_USE_LOCAL_API === "true"
  return useLocalAPI ? "http://localhost:3000" : "https://lens.vael.ai"
}

const API_BASE_URL = getAPIBaseURL()

// Storage for pending API requests
let storage: Storage
try {
  storage = new Storage({
    area: "local"
  })
} catch (error) {
  console.error("Failed to initialize storage:", error)
  // Create a fallback storage object that does nothing
  storage = {
    get: async () => null,
    set: async () => {}
  } as unknown as Storage
}

// Storage keys
const PENDING_DATA_KEY = "vael_pending_data"
const PENDING_ANALYTICS_KEY = "vael_pending_analytics"
const COLLECTED_DATA_KEY = "vael_collected_data"
const ANALYTICS_DATA_KEY = "vael_analytics_data"

// API request configuration
const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 10, // Number of items to process in a batch
  timeout: 10000, // 10 second timeout
  networkRetryDelay: 30000 // 30 seconds for network errors
}

/**
 * Helper to safely execute operations that might be affected by context invalidation
 * @param operation - The operation to execute
 * @param fallback - Value to return if operation fails
 * @param errorMessage - Message to log if operation fails
 * @returns Result of operation or fallback value
 */
const safeExecute = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage: string
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
        `${errorMessage} - returning fallback value due to context invalidation`
      )
      return fallback
    }
    console.error(`${errorMessage}:`, error)
    throw error
  }
}

/**
 * Safe storage wrapper to handle context invalidation errors
 * @param operation - The storage operation to perform
 * @param fallback - Value to return if operation fails
 * @returns Result of operation or fallback value
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
        error.message.includes("Context invalidated"))
    ) {
      console.warn(
        "Storage operation failed due to extension context invalidation"
      )
      return fallback
    }
    throw error
  }
}

/**
 * Extracts a normalized key from a URL for storing website data
 * @param url - The URL to extract a key from
 * @param includePath - Whether to include the path in the key (default: false)
 * @returns A string key representing the URL
 */
const getUrlKey = (url: string, includePath = false): string => {
  try {
    const urlObj = new URL(url)
    return includePath ? urlObj.hostname + urlObj.pathname : urlObj.hostname
  } catch (e) {
    console.warn(`Failed to parse URL: ${url}, using as-is`)
    return url
  }
}

/**
 * Tracks and categorizes interaction data for efficient storage
 * Updates existing interaction records or creates new ones based on interaction type
 * @param existing - The existing interaction data record
 * @param newInteraction - The new interaction to add
 * @returns Updated interaction data record
 */
const updateInteractionData = (
  existing: Record<string, StackedInteraction> = {},
  newInteraction: InteractionData
): Record<string, StackedInteraction> => {
  const interactionType = newInteraction.type

  if (!existing[interactionType]) {
    // Initialize a new interaction type
    existing[interactionType] = {
      type: interactionType,
      count: 1,
      firstOccurrence: newInteraction.timestamp,
      lastOccurrence: newInteraction.timestamp,
      positions: newInteraction.position
        ? [newInteraction.position]
        : undefined,
      targetElements: newInteraction.elements
        ? newInteraction.elements.map((e) => ({
            elementPath: `${e.tag}${e.id ? "#" + e.id : ""}${e.classes ? "." + e.classes.join(".") : ""}`,
            elementType: e.type || e.tag,
            contentHint: e.text ? e.text.substring(0, 50) : undefined,
            count: 1,
            lastInteracted: newInteraction.timestamp
          }))
        : undefined
    }

    // Add type-specific data
    switch (interactionType) {
      case "hover":
        existing[interactionType].averageDuration = newInteraction.duration || 0
        break
      case "scroll":
        if (newInteraction.scrollData) {
          existing[interactionType].scrollPatterns = {
            averageDepth: newInteraction.scrollData.percentScrolled || 0,
            preferredDirection: newInteraction.scrollData.direction || "down",
            maxDepthReached: newInteraction.scrollData.percentScrolled || 0,
            recentScrollPositions: [newInteraction.scrollData.position]
          }
        }
        break
      case "input":
        if (newInteraction.fieldName) {
          existing[interactionType].inputFields = [
            {
              fieldName: newInteraction.fieldName,
              interactionCount: 1,
              averageFocusTime: newInteraction.duration || 0
            }
          ]
        }
        break
      case "selection":
        if (newInteraction.selectionLength) {
          existing[interactionType].selectionStats = {
            averageLength: newInteraction.selectionLength,
            count: 1
          }
        }
        break
    }
  } else {
    // Update existing interaction type data
    const currentInteraction = existing[interactionType]
    currentInteraction.count += 1
    currentInteraction.lastOccurrence = newInteraction.timestamp

    // Update position samples (keep limited sample size)
    if (newInteraction.position && currentInteraction.positions) {
      if (currentInteraction.positions.length < 10) {
        currentInteraction.positions.push(newInteraction.position)
      } else if (Math.random() < 0.3) {
        // Randomly replace positions to maintain diversity in the sample
        const randomIndex = Math.floor(
          Math.random() * currentInteraction.positions.length
        )
        currentInteraction.positions[randomIndex] = newInteraction.position
      }
    }

    // Update target elements
    if (newInteraction.elements && newInteraction.elements.length > 0) {
      if (!currentInteraction.targetElements) {
        currentInteraction.targetElements = []
      }

      for (const element of newInteraction.elements) {
        const elementPath = `${element.tag}${element.id ? "#" + element.id : ""}${element.classes ? "." + element.classes.join(".") : ""}`
        const elementType = element.type || element.tag
        const contentHint = element.text
          ? element.text.substring(0, 50)
          : undefined

        const existingElement = currentInteraction.targetElements.find(
          (e) => e.elementPath === elementPath
        )

        if (existingElement) {
          existingElement.count += 1
          existingElement.lastInteracted = newInteraction.timestamp
        } else if (currentInteraction.targetElements.length < 20) {
          // Limit the number of tracked elements
          currentInteraction.targetElements.push({
            elementPath,
            elementType,
            contentHint,
            count: 1,
            lastInteracted: newInteraction.timestamp
          })
        }
      }
    }

    // Update type-specific data
    switch (interactionType) {
      case "hover":
        if (newInteraction.duration) {
          // Update average duration
          const currentAvg = currentInteraction.averageDuration || 0
          const newAvg =
            (currentAvg * (currentInteraction.count - 1) +
              newInteraction.duration) /
            currentInteraction.count
          currentInteraction.averageDuration = newAvg
        }
        break
      case "scroll":
        if (newInteraction.scrollData && currentInteraction.scrollPatterns) {
          // Update scroll patterns
          const patterns = currentInteraction.scrollPatterns
          patterns.averageDepth =
            (patterns.averageDepth * (currentInteraction.count - 1) +
              (newInteraction.scrollData.percentScrolled || 0)) /
            currentInteraction.count

          if (
            newInteraction.scrollData.percentScrolled &&
            newInteraction.scrollData.percentScrolled > patterns.maxDepthReached
          ) {
            patterns.maxDepthReached = newInteraction.scrollData.percentScrolled
          }

          // Update preferred direction based on majority
          if (
            newInteraction.scrollData.direction &&
            currentInteraction.count % 5 === 0
          ) {
            // Recalculate occasionally
            // This is a simplification - ideally we'd count directions
            patterns.preferredDirection = newInteraction.scrollData.direction
          }
        }
        break
      case "input":
        if (newInteraction.fieldName && currentInteraction.inputFields) {
          const existingField = currentInteraction.inputFields.find(
            (f) => f.fieldName === newInteraction.fieldName
          )

          if (existingField) {
            existingField.interactionCount += 1
            if (newInteraction.duration) {
              const currentAvg = existingField.averageFocusTime || 0
              const newAvg =
                (currentAvg * (existingField.interactionCount - 1) +
                  newInteraction.duration) /
                existingField.interactionCount
              existingField.averageFocusTime = newAvg
            }
          } else if (currentInteraction.inputFields.length < 20) {
            currentInteraction.inputFields.push({
              fieldName: newInteraction.fieldName,
              interactionCount: 1,
              averageFocusTime: newInteraction.duration || 0
            })
          }
        }
        break
      case "selection":
        if (
          newInteraction.selectionLength &&
          currentInteraction.selectionStats
        ) {
          // Update selection statistics
          const stats = currentInteraction.selectionStats
          stats.count += 1
          stats.averageLength =
            (stats.averageLength * (stats.count - 1) +
              newInteraction.selectionLength) /
            stats.count
        }
        break
    }
  }

  return existing
}

/**
 * Queues data for retry in case of network or server failures
 * Stores the data locally until it can be successfully sent
 * @param data - The collected data to queue for retry
 */
async function queueDataForRetry(data: CollectedData): Promise<void> {
  try {
    // Get existing queued data
    const queuedData = await safeStorageOp(async () => {
      const existingData = await storage.get<CollectedData[]>(PENDING_DATA_KEY)
      return Array.isArray(existingData) ? existingData : []
    }, [])

    // Add new data to queue
    const updatedQueue = [...queuedData, data]

    // Save updated queue
    await safeStorageOp(
      async () => storage.set(PENDING_DATA_KEY, updatedQueue),
      null
    )

    console.log(`Data queued for retry. Queue size: ${updatedQueue.length}`)
  } catch (queueError) {
    console.error("Failed to queue data for retry:", queueError)
  }
}

/**
 * Sends data to the server with automatic retry logic
 * Implements exponential backoff for failed requests
 * @param url - The API endpoint URL
 * @param data - The data to send
 * @param retriesLeft - Number of retries remaining
 * @param delay - Delay before the next retry in milliseconds
 * @returns Promise resolving to true if successful, false otherwise
 */
async function sendWithRetry(
  url: string,
  data: any,
  retriesLeft: number,
  delay: number = API_CONFIG.retryDelay
): Promise<boolean> {
  try {
    // Set up timeout controller
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

    // Send the request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
      signal: controller.signal
    })

    // Clear timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`
      )
    }

    return true
  } catch (error) {
    // Handle network errors separately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      console.warn("Network error during fetch, will retry later:", error)

      // Use longer delay for network errors
      if (retriesLeft > 0) {
        console.log(
          `Network error, retrying after longer delay. ${retriesLeft} retries left.`
        )
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.networkRetryDelay)
        )
        return sendWithRetry(url, data, retriesLeft - 1, delay)
      }
    }

    // Extension context invalidation errors - don't retry, just fail
    if (
      error instanceof Error &&
      (error.message.includes("Extension context invalidated") ||
        error.message.includes("Context invalidated"))
    ) {
      console.warn(
        "Cannot complete request due to extension context invalidation"
      )
      return false
    }

    // Other errors - retry with exponential backoff
    if (
      retriesLeft > 0 &&
      !(error instanceof Error && error.message.includes("4"))
    ) {
      console.log(`Retrying request. ${retriesLeft} retries left.`)

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay))

      return sendWithRetry(url, data, retriesLeft - 1, delay * 1.5)
    }

    throw error
  }
}

/**
 * Processes any pending data in the queue
 * Attempts to send queued data to the server with retry logic
 */
export async function processPendingData(): Promise<void> {
  try {
    // Get queued data
    const queuedData = await safeStorageOp(async () => {
      const data = await storage.get<CollectedData[]>(PENDING_DATA_KEY)
      return Array.isArray(data) ? data : []
    }, [])

    if (!queuedData || queuedData.length === 0) {
      return
    }

    console.log(`Processing ${queuedData.length} pending data items`)

    // Process data in batches to avoid overwhelming the server
    const batches = Math.ceil(queuedData.length / API_CONFIG.batchSize)
    let successCount = 0

    for (let i = 0; i < batches; i++) {
      const batchStart = i * API_CONFIG.batchSize
      const batchEnd = Math.min(
        batchStart + API_CONFIG.batchSize,
        queuedData.length
      )
      const batch = queuedData.slice(batchStart, batchEnd)

      // Process each item in the batch
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            return await sendDataToServer(item)
          } catch (error) {
            return false
          }
        })
      )

      // Count successes
      successCount += results.filter(
        (result) => result.status === "fulfilled" && result.value === true
      ).length
    }

    // Remove successfully sent items from the queue
    if (successCount > 0) {
      const remainingItems = queuedData.slice(successCount)
      await safeStorageOp(
        async () => storage.set(PENDING_DATA_KEY, remainingItems),
        null
      )
      console.log(
        `Processed ${successCount} pending items. ${remainingItems.length} remain.`
      )
    }
  } catch (error) {
    console.error("Error processing pending data:", error)
  }
}

/**
 * Sends collected data to the server with retry logic
 * Falls back to local storage if server is unavailable
 * @param data - The collected data to send
 * @returns Promise resolving to true if successful, false otherwise
 */
export const sendDataToServer = async (
  data: CollectedData
): Promise<boolean> => {
  try {
    // This function is now only used for local retry processing
    // For report generation, use the popup's handleGenerateReport instead
    console.warn(
      "sendDataToServer called - this should only be used for internal retry logic"
    )

    // Store data locally instead of trying to send incomplete request
    await safeStorageOp(async () => storage.set(COLLECTED_DATA_KEY, data), null)

    return true
  } catch (error) {
    console.error("Error storing data locally:", error)

    // Queue the data for retry
    await queueDataForRetry(data)

    return false
  }
}

/**
 * Stores analytics events locally
 * Used for both persistence and when the server is unavailable
 * @param event - The analytics event to store
 * @returns Promise resolving to true if successful, false otherwise
 */
async function storeAnalyticsLocally(event: AnalyticsEvent): Promise<boolean> {
  try {
    // Get existing data array
    const existingData = await safeStorageOp(async () => {
      const data = await storage.get<AnalyticsEvent[]>(ANALYTICS_DATA_KEY)
      return Array.isArray(data) ? data : []
    }, [])

    // Add the new event to the beginning (most recent first)
    const updatedData = [event, ...existingData]

    // Limit to a reasonable number to prevent excessive storage usage
    const limitedData = updatedData.slice(0, 1000)

    // Save the updated array
    await safeStorageOp(
      async () => storage.set(ANALYTICS_DATA_KEY, limitedData),
      null
    )

    return true
  } catch (error) {
    console.error("Error storing analytics locally:", error)
    return false
  }
}

/**
 * Sends analytics event to the server
 * Handles retry logic and local storage fallback
 * @param event - The analytics event to send
 * @returns Promise resolving to true if successful, false otherwise
 */
export const sendAnalyticsEvent = async (
  event: AnalyticsEvent
): Promise<boolean> => {
  // Analytics disabled for now - keeping code for future use
  /*
  try {
    // Add user ID to the analytics data if possible
    let analyticsData: Record<string, any> = { ...event }

    try {
      const userId = await getUserId()
      analyticsData.userId = userId
    } catch (e) {
      // Continue without userId if it can't be retrieved
    }

    // Send analytics to the server with retry logic
    const success = await sendWithRetry(
      `${API_BASE_URL}/api/analytics`,
      analyticsData,
      API_CONFIG.maxRetries
    )

    if (!success) {
      // Queue analytics for retry if sending fails
      await queueAnalyticsForRetry(event)
    }

    return success
  } catch (error) {
    console.error("Error sending analytics to server:", error)

    // Queue analytics for retry
    await queueAnalyticsForRetry(event)

    return false
  }
  */

  // Store analytics locally only for now
  await storeAnalyticsLocally(event)
  return true
}

/**
 * Queues analytics events for retry in case of network or server failures
 * Stores the event locally until it can be successfully sent
 * @param event - The analytics event to queue
 */
async function queueAnalyticsForRetry(event: AnalyticsEvent): Promise<void> {
  try {
    // Get existing queued events
    const queuedEvents = await safeStorageOp(async () => {
      const events = await storage.get<AnalyticsEvent[]>(PENDING_ANALYTICS_KEY)
      return Array.isArray(events) ? events : []
    }, [])

    // Add new event to queue
    const updatedQueue = [...queuedEvents, event]

    // Save updated queue
    await safeStorageOp(
      async () => storage.set(PENDING_ANALYTICS_KEY, updatedQueue),
      null
    )
  } catch (queueError) {
    console.error("Failed to queue analytics for retry:", queueError)
  }
}

/**
 * Processes any pending analytics events in the queue
 * Attempts to send queued events to the server with retry logic
 */
export async function processPendingAnalytics(): Promise<void> {
  // Analytics processing disabled for now - keeping code for future use
  /*
  try {
    // Get queued analytics
    const queuedEvents = await safeStorageOp(async () => {
      const events = await storage.get<AnalyticsEvent[]>(PENDING_ANALYTICS_KEY)
      return Array.isArray(events) ? events : []
    }, [])

    if (!queuedEvents || queuedEvents.length === 0) {
      return
    }

    console.log(`Processing ${queuedEvents.length} pending analytics events`)

    // Process events in batches
    const batches = Math.ceil(queuedEvents.length / API_CONFIG.batchSize)
    let successCount = 0

    for (let i = 0; i < batches; i++) {
      const batchStart = i * API_CONFIG.batchSize
      const batchEnd = Math.min(
        batchStart + API_CONFIG.batchSize,
        queuedEvents.length
      )
      const batch = queuedEvents.slice(batchStart, batchEnd)

      // Process each item in the batch
      const results = await Promise.allSettled(
        batch.map(async (event) => {
          try {
            // Don't use sendAnalyticsEvent to avoid infinite recursion
            const endpoint = `${API_BASE_URL}/api/analytics`
            return await sendWithRetry(endpoint, event, API_CONFIG.maxRetries)
          } catch (error) {
            return false
          }
        })
      )

      // Count successes
      successCount += results.filter(
        (result) => result.status === "fulfilled" && result.value === true
      ).length
    }

    // Remove successfully sent items from the queue
    if (successCount > 0) {
      const remainingItems = queuedEvents.slice(successCount)
      await safeStorageOp(
        async () => storage.set(PENDING_ANALYTICS_KEY, remainingItems),
        null
      )
      console.log(
        `Processed ${successCount} pending analytics events. ${remainingItems.length} remain.`
      )
    }
  } catch (error) {
    console.error("Error processing pending analytics:", error)
  }
  */
  console.log("Analytics processing is currently disabled")
}

/**
 * Retrieves all collected browsing data
 * Used for the data preview and export features
 * @returns Promise resolving to the complete collected data object
 */
export const getAllCollectedData = async (): Promise<CollectedData> => {
  // Create default data with all required fields
  const createDefaultData = async (): Promise<CollectedData> => {
    const userId = (await getUserId()) || generateUUID()
    return {
      userId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: getPlatform(),
        screenSize: {
          width: screen.width,
          height: screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
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

  return safeExecute(
    async () => {
      try {
        const data = await storage.get<CollectedData>(COLLECTED_DATA_KEY)
        return data || (await createDefaultData())
      } catch (storageError) {
        // Try creating a new Storage instance in case the original one failed
        console.warn("Retrying with new Storage instance")
        const newStorage = new Storage()
        const data = await newStorage.get<CollectedData>(COLLECTED_DATA_KEY)
        return data || (await createDefaultData())
      }
    },
    await createDefaultData(),
    "Error getting collected data"
  )
}

/**
 * Retrieves all analytics data
 * Used for debugging and analysis
 * @returns Promise resolving to an array of analytics events
 */
export const getAllAnalyticsData = async (): Promise<AnalyticsEvent[]> => {
  try {
    return await safeStorageOp(async () => {
      const data = await storage.get<AnalyticsEvent[]>(ANALYTICS_DATA_KEY)
      return Array.isArray(data) ? data : []
    }, [])
  } catch (error) {
    console.error("Error getting analytics data:", error)
    return []
  }
}

/**
 * Retrieves data for a specific website
 * @param url - The URL to get data for
 * @returns Promise resolving to website data if found, null otherwise
 */
export const getWebsiteData = async (
  url: string
): Promise<WebsiteData | null> => {
  try {
    const collectedData = await getAllCollectedData()
    if (!collectedData) return null

    const urlKey = getUrlKey(url, true)
    return collectedData.websites[urlKey] || null
  } catch (error) {
    console.error("Error getting website data:", error)
    return null
  }
}

/**
 * Clears all collected data from storage
 * Removes data from both local storage and pending queues
 * @returns Promise resolving to true if successful, false otherwise
 */
export const clearAllCollectedData = async (): Promise<boolean> => {
  try {
    // Initialize empty collected data
    const userId = await getUserId()
    const emptyCollectedData: CollectedData = {
      userId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: getPlatform(),
        screenSize: {
          width: screen.width,
          height: screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
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
      websites: {},
      browserPatterns: {
        averageDailyTabs: 0,
        tabSwitchFrequency: 0,
        averageSessionDuration: 0,
        commonDomains: []
      }
    }

    // Clear/reset the collected data
    await safeStorageOp(
      async () => storage.set(COLLECTED_DATA_KEY, emptyCollectedData),
      null
    )

    return true
  } catch (error) {
    console.error("Error clearing collected data:", error)
    return false
  }
}

export const sendCollectedData = async (
  data: CollectedData
): Promise<boolean> => {
  try {
    // Check if current data size exceeds the maximum limit
    const currentData = await safeStorageOp(
      async () => storage.get<CollectedData>(COLLECTED_DATA_KEY),
      null
    )
    if (currentData) {
      const currentDataSize = JSON.stringify(currentData).length
      if (currentDataSize >= MAX_DATA_COLLECTION_BYTES) {
        console.warn(
          `Max data collection limit of ${MAX_DATA_COLLECTION_BYTES / (1024 * 1024)}MB reached. New data will not be saved.`
        )
        // Optionally, notify the background script or UI
        // chrome.runtime.sendMessage({ type: "MAX_DATA_LIMIT_REACHED" });
        return false // Indicate that data was not saved
      }
    }

    // Process any pending data while we're at it
    processPendingData().catch((e) =>
      console.error("Background pending data processing failed:", e)
    )

    // Try to send the current data
    return await sendDataToServer(data)
  } catch (error) {
    console.error("Failed to send collected data:", error)
    return false
  }
}

export { exportCollectedData }

/**
 * Gets the current platform in a cross-browser compatible way
 * This is a simplified version of the function in device.ts
 * @returns The platform string
 */
export function getPlatform(): string {
  // Use modern User-Agent Client Hints API if available
  if ("userAgentData" in navigator && navigator.userAgentData?.platform) {
    return navigator.userAgentData.platform
  }

  // Fallback 1: Use deprecated navigator.platform if available
  if (navigator.platform) {
    return navigator.platform
  }

  // Fallback 2: Extract from userAgent (least reliable)
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("win")) return "Windows"
  if (userAgent.includes("mac")) return "MacOS"
  if (userAgent.includes("linux")) return "Linux"
  if (userAgent.includes("android")) return "Android"
  if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "iOS"

  // Default fallback
  return "Unknown"
}
