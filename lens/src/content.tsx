// Content script for Lens by Vael AI Context Bank
import cssText from "data-text:./main.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import type { InteractionData, TabActivity } from "./types/data"
import { sendAnalyticsEvent } from "./utils/api"
import { collectDomainSpecificData } from "./utils/collectors/domain-specific"
import { collectUserInteractions } from "./utils/collectors/interactions"
import { collectPageMetadata } from "./utils/collectors/metadata"
import {
  createAnalyticsEvent,
  initializeCollectedData,
  updateDomainClassification,
  updateDomainSpecificData,
  updateInteractions,
  updatePageMetadata,
  updateTabActivity
} from "./utils/dataCollection"
import { classifyCurrentPage } from "./utils/domainClassifier"
import { generateUUID } from "./utils/helpers"
import { sendMessage, type MessagePayload } from "./utils/messaging"
import type { IconPayload, MessageNames } from "./utils/messaging"
import {
  getUserConfig,
  isDomainBlacklisted,
  shouldCollectData
} from "./utils/userPreferences"
import type { UserConfig } from "./utils/userPreferences"

/**
 * Content script configuration for the extension
 * Specifies when and where this script should run
 */
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false // Only collect data from the main frame
}

/**
 * Utility to check if an error is a context invalidation error
 * @param error The error to check
 * @returns True if it's a context invalidation error
 */
function isContextInvalidationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Extension context invalidated") ||
      error.message.includes("Context invalidated"))
  )
}

/**
 * Helper function to safely execute storage operations with proper error handling
 * @param operation The storage operation to perform
 * @param fallbackValue Value to return if operation fails
 * @returns Result of operation or fallback value
 */
async function safeStorageOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const isContextInvalidated = isContextInvalidationError(error)

    // Only log in development, not in production
    if (!isContextInvalidated) {
      console.error("Storage operation failed:", error)
    }

    return fallbackValue
  }
}

/**
 * Log error only if it's not a context invalidation error
 * @param error The error to log
 * @param message Optional message to include with the error
 */
function logNonContextError(error: unknown, message?: string) {
  if (!isContextInvalidationError(error)) {
    if (message) {
      console.error(message, error)
    } else {
      console.error(error)
    }
  }
}

/**
 * Create a variant of logNonContextError that uses console.warn instead of console.error
 * @param error The error to log
 * @param message Optional message to include with the error
 */
function warnNonContextError(error: unknown, message?: string) {
  if (!isContextInvalidationError(error)) {
    if (message) {
      console.warn(message, error)
    } else {
      console.warn(error)
    }
  }
}

// Create storage instance with local area for better performance
const storage = new Storage({
  area: "local" // Use local storage for better performance
})
const COLLECTION_STATUS_KEY = "vael_collection_status"

// Collection status type
interface CollectionStatus {
  isCollecting: boolean
  lastCollection: number
  collectionType?: string
  tabId?: number
}

/**
 * Sends a message to the background script with error handling
 * Uses the safe messaging utility rather than direct chrome API calls
 * @param name - The message name/type to send
 * @param body - The message payload
 */
function sendToBackgroundScript<T extends MessagePayload>(
  name: MessageNames,
  body: T
): void {
  // Use our safe messaging utility instead of direct chrome.runtime.sendMessage
  sendMessage(name, body).catch((error) => {
    // Handle the "Unknown message type" error gracefully
    if (error.message && error.message.includes("Unknown message type")) {
      console.warn(
        `Message type "${name}" not recognized by background script. This can be ignored if the handler is registered properly.`
      )
    } else {
      console.error(`Failed to send message to background (${name}):`, error)
    }
    // Continue execution, errors are handled in the sendMessage utility
  })
}

/**
 * Updates the collection status in storage and updates extension icon
 * Maintains state about what's being collected and when
 * @param status - Partial collection status object to update
 */
const updateCollectionStatus = async (
  status: Partial<CollectionStatus>
): Promise<void> => {
  await safeStorageOperation(async () => {
    const currentStatus = (await storage.get<CollectionStatus>(
      COLLECTION_STATUS_KEY
    )) || {
      isCollecting: false,
      lastCollection: 0
    }

    const newStatus = {
      ...currentStatus,
      ...status
    }

    await storage.set(COLLECTION_STATUS_KEY, newStatus)

    // Update icon based on new status
    updateExtensionIcon(
      newStatus.isCollecting ? IconState.COLLECTING : IconState.IDLE
    )
  }, undefined)
}

// Icon state management for the Plasmo extension
enum IconState {
  DISABLED = "disabled",
  IDLE = "idle",
  COLLECTING = "collecting"
}

/**
 * Updates the extension icon to reflect the current collection state
 * Sends a message to the background script to change the badge and icon
 * @param state - The icon state to display: DISABLED, IDLE, or COLLECTING
 */
const updateExtensionIcon = (state: IconState) => {
  sendToBackgroundScript("setIcon", { status: state } as IconPayload)
}

/**
 * Generates a style element with adjusted CSS for Shadow DOM
 * Converts rem units to fixed pixel values and adjusts selectors for proper scoping
 * @returns A style element with properly adjusted CSS
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}

/**
 * Tracks tab activity including focus time, activation count, and navigation
 * Monitors visibility changes and browser history events
 */
class TabActivityTracker {
  private focusStart: number | null = null
  private totalFocusTime = 0
  private activationCount = 0
  private visibilityEvents: {
    timestamp: number
    type: "visible" | "hidden"
  }[] = []
  private historyEvents: {
    timestamp: number
    action: "pushed" | "replaced" | "popped"
    url: string
  }[] = []

  /**
   * Initializes the tab activity tracker
   * Sets up event listeners for visibility and navigation events
   */
  constructor() {
    // Monitor tab visibility changes
    document.addEventListener("visibilitychange", this.handleVisibilityChange)

    // Monitor navigation/history events
    window.addEventListener("popstate", this.handlePopState)

    // Track initial state
    if (document.visibilityState === "visible") {
      this.focusStart = Date.now()
      this.activationCount++
      this.visibilityEvents.push({
        timestamp: Date.now(),
        type: "visible"
      })
    }

    // Track initial page load
    this.historyEvents.push({
      timestamp: Date.now(),
      action: "pushed",
      url: window.location.href
    })
  }

  /**
   * Handles visibility state changes for the tab
   * Tracks when the tab becomes visible or hidden
   */
  private handleVisibilityChange = () => {
    const now = Date.now()

    if (document.visibilityState === "visible") {
      // Tab became visible/active
      this.focusStart = now
      this.activationCount++
      this.visibilityEvents.push({
        timestamp: now,
        type: "visible"
      })
    } else if (document.visibilityState === "hidden" && this.focusStart) {
      // Tab became hidden/inactive
      this.totalFocusTime += now - this.focusStart
      this.focusStart = null
      this.visibilityEvents.push({
        timestamp: now,
        type: "hidden"
      })
    }

    // Keep only the last 20 visibility events
    if (this.visibilityEvents.length > 20) {
      this.visibilityEvents = this.visibilityEvents.slice(-20)
    }
  }

  /**
   * Handles history navigation events
   * Tracks when the user navigates using back/forward buttons
   * @param event - The popstate event
   */
  private handlePopState = () => {
    this.historyEvents.push({
      timestamp: Date.now(),
      action: "popped",
      url: window.location.href
    })

    // Keep only the last 10 history events
    if (this.historyEvents.length > 10) {
      this.historyEvents = this.historyEvents.slice(-10)
    }
  }

  /**
   * Gets the current tab activity data
   * @returns Object containing focus time, activation count, and event history
   */
  public getData(): TabActivity {
    // Calculate current focus time if tab is currently visible
    let currentFocusTime = this.totalFocusTime
    if (this.focusStart) {
      currentFocusTime += Date.now() - this.focusStart
    }

    return {
      focusTime: currentFocusTime,
      visibilityEvents: this.visibilityEvents,
      activationCount: this.activationCount,
      historyUpdates: this.historyEvents
    }
  }

  /**
   * Cleans up event listeners when the tracker is no longer needed
   */
  public cleanup() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    )
    window.removeEventListener("popstate", this.handlePopState)
  }
}

/**
 * Main component for the extension's content script UI
 * Manages data collection, processing, and visualization
 */
const CollectionIndicator = () => {
  const [isCollecting, setIsCollecting] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [isBlacklisted, setIsBlacklisted] = useState(false)

  // Check if data collection should be active for this URL
  useEffect(() => {
    const checkCollectionStatus = async () => {
      try {
        const config = await getUserConfig()
        setConfig(config)
        const blacklisted = await isDomainBlacklisted(window.location.hostname)
        setIsBlacklisted(blacklisted)

        // Use shouldCollectData which properly checks email, master toggle, and blacklist
        const active = await shouldCollectData(window.location.href)

        setIsActive(active)
      } catch (error) {
        logNonContextError(error, "Error checking collection status")
        setIsActive(false)
      }
    }

    checkCollectionStatus()
  }, [])

  // Set up interaction collection
  useEffect(() => {
    let cleanupFunction: (() => void) | null = null

    const setupInteractions = async () => {
      if (!isActive || !config) return

      try {
        // Initialize data collection
        await safeStorageOperation(async () => {
          await initializeCollectedData()
        }, undefined)

        // Set up user interaction tracking when collection is enabled
        if (config.collectInteractions) {
          const handleInteraction = (interaction: InteractionData) => {
            updateCollectionStatus({
              isCollecting: true,
              lastCollection: Date.now(),
              collectionType: interaction.type
            })

            // Process the interaction (batching is handled in the utility)
            updateInteractions(window.location.href, [interaction]).catch(
              (error) => {
                logNonContextError(
                  error,
                  "Error updating interactions in database"
                )
              }
            )
          }

          // Set up the interaction collector
          cleanupFunction = collectUserInteractions(handleInteraction)
          setIsCollecting(true)
        }
      } catch (error) {
        logNonContextError(error, "Error setting up interaction collection")
      }
    }

    setupInteractions()

    // Clean up interaction tracking when unmounting
    return () => {
      if (cleanupFunction) {
        cleanupFunction()
      }
    }
  }, [isActive, config])

  // Handle initial page load data collection
  useEffect(() => {
    const initialCollection = async () => {
      if (!isActive || !config) return

      try {
        // Create a unique visit ID for this page view
        const visitId = generateUUID()

        // Get page metadata if enabled
        if (config.collectPageMetadata) {
          const metadata = await collectPageMetadata()
          if (metadata) {
            updatePageMetadata(window.location.href, metadata).catch(
              (error) => {
                logNonContextError(error, "Error updating page metadata")
              }
            )
          }
        }

        // Perform domain classification
        const domainClassification = classifyCurrentPage()

        // Save the classification data
        updateDomainClassification(
          window.location.href,
          domainClassification
        ).catch((error) => {
          logNonContextError(error, "Error updating domain classification")
        })

        // Get domain-specific data if enabled
        // Use our classification to enhance domain specific data collection
        const domainType = domainClassification.primaryType
        if (
          config.collectEcommerce ||
          config.collectTravel ||
          config.collectProductivity
        ) {
          const domainConfig = {
            collectEcommerce:
              config.collectEcommerce &&
              (domainType === "shopping" ||
                domainClassification.secondaryType === "shopping"),
            collectTravel:
              config.collectTravel &&
              (domainType === "travel" ||
                domainClassification.secondaryType === "travel"),
            collectProductivity:
              config.collectProductivity &&
              (domainType === "productivity" ||
                domainClassification.secondaryType === "productivity")
          }

          const domainData = await collectDomainSpecificData(domainConfig)
          if (domainData) {
            updateDomainSpecificData(window.location.href, domainData).catch(
              (error) => {
                logNonContextError(error, "Error updating domain-specific data")
              }
            )
          }
        }

        // Initialize tab activity tracking
        const tabTracker = new TabActivityTracker()

        // Log analytics event for page view
        if (config.collectAnalytics) {
          const event = createAnalyticsEvent("page_view", {
            url: window.location.href,
            title: document.title
          })
          sendAnalyticsEvent(event)
        }

        // Handle page unload to save final tab activity data
        const handleBeforeUnload = async () => {
          try {
            const activityData = tabTracker.getData()
            await updateTabActivity(window.location.href, activityData)

            // Clear event listeners
            tabTracker.cleanup()
          } catch (error) {
            warnNonContextError(error, "Error updating tab activity on unload")
          }
        }

        // Set up unload handler
        window.addEventListener("beforeunload", handleBeforeUnload)

        // Periodic update of tab activity (every 30 seconds) - only if there's meaningful activity
        const activityInterval = setInterval(() => {
          try {
            const activityData = tabTracker.getData()

            // Only update if there's meaningful activity since last update
            const hasActivity =
              activityData.focusTime > 5000 || // More than 5 seconds of focus
              activityData.activationCount > 0 || // User activated/clicked on tab
              activityData.visibilityEvents.length > 0 // Visibility changes

            if (hasActivity) {
              updateTabActivity(window.location.href, activityData).catch(
                (error) => {
                  warnNonContextError(
                    error,
                    "Error updating periodic tab activity"
                  )
                }
              )
            }
          } catch (error) {
            warnNonContextError(
              error,
              "Error capturing tab activity in interval"
            )
          }
        }, 30000)

        // Clean up on unmount
        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload)
          clearInterval(activityInterval)
          tabTracker.cleanup()
        }
      } catch (error) {
        logNonContextError(error, "Error during initial page data collection")
      }
    }

    initialCollection()
  }, [isActive, config])

  // Rendering nothing as this is just for data collection
  return null
}

export default CollectionIndicator
