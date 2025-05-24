import { Storage } from "@plasmohq/storage"

import { sendAnalyticsEvent } from "./utils/api"
import { createAnalyticsEvent } from "./utils/dataCollection"
import { registerMessageHandler } from "./utils/messaging"
import type { IconPayload } from "./utils/messaging"
import {
  getUserConfig,
  isDomainBlacklisted,
  shouldCollectData,
  updateUserConfig
} from "./utils/userPreferences"

/**
 * Lens by Vael AI Context Bank - Background Script
 *
 * This script handles:
 * - Extension icon and badge management
 * - Tab state monitoring
 * - Message handling between components
 * - Collection state coordination
 */

// Initialize storage with error handling
let storage: Storage
try {
  storage = new Storage({
    area: "local" // Use local storage for better performance
  })
} catch (error) {
  console.error("Failed to initialize storage:", error)
  // Create a fallback storage object that does nothing
  storage = {
    get: async () => null,
    set: async () => {}
  } as unknown as Storage
}

// Keys for storage
const COLLECTION_STATUS_KEY = "vael_collection_status"
const ACTIVE_TABS_KEY = "vael_active_tabs"

// Initialize badge styling
try {
  chrome.action.setBadgeTextColor({ color: "#FFFFFF" })
} catch (error) {
  console.error("Error setting badge text color:", error)
}

// Track currently active tabs
interface TabInfo {
  id: number
  url: string
  domain: string
  isCollecting: boolean
  lastCollection: number
  isBlacklisted: boolean
}

// Initialize tab tracking
let activeTabs: Record<number, TabInfo> = {}

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
 * Loads saved active tabs information from storage on startup
 * Restores tab tracking state from previous sessions
 */
const loadActiveTabs = async () => {
  try {
    const savedTabs = await safeStorageOp(
      async () => storage.get<Record<number, TabInfo>>(ACTIVE_TABS_KEY),
      {}
    )
    if (savedTabs) {
      activeTabs = savedTabs
    }
  } catch (error) {
    console.error("Error loading active tabs:", error)
  }
}

/**
 * Persists current active tabs information to storage
 * Ensures tab state is maintained across browser/extension restarts
 */
const saveActiveTabs = async () => {
  try {
    await safeStorageOp(
      async () => storage.set(ACTIVE_TABS_KEY, activeTabs),
      null
    )
  } catch (error) {
    console.error("Error saving active tabs:", error)
  }
}

// Initialize by loading saved tabs
loadActiveTabs()

// Handle icon state changes from content script
registerMessageHandler<IconPayload>("setIcon", async (payload, sender) => {
  try {
    if (!sender.tab?.id) return

    const tabId = sender.tab.id
    const status = payload.status

    // Update tab collection status
    if (activeTabs[tabId]) {
      activeTabs[tabId].isCollecting = status === "collecting"
      if (status === "collecting") {
        activeTabs[tabId].lastCollection = Date.now()
      }
      await saveActiveTabs()
    }

    try {
      // Set badge based on status
      let badgeText = ""
      let badgeColor = "#808080" // Default gray

      switch (status) {
        case "collecting":
          badgeText = "ON"
          badgeColor = "#4285F4" // Google blue
          break
        case "disabled":
          badgeText = "OFF"
          badgeColor = "#EA4335" // Google red
          break
        case "idle":
          badgeText = ""
          break
      }

      // Use try-catch for each Chrome API call
      try {
        // Update badge text and color
        await chrome.action.setBadgeText({ text: badgeText, tabId })
        await chrome.action.setBadgeBackgroundColor({
          color: badgeColor,
          tabId
        })
      } catch (chromeError) {
        console.error("Error updating badge:", chromeError)
      }
    } catch (error) {
      console.error("Error handling badge update:", error)
    }
  } catch (error) {
    console.error("Error updating extension icon:", error)
  }
})

// Handle tab ID requests from content script
registerMessageHandler("getTabId", async (_, sender) => {
  try {
    if (!sender.tab?.id) {
      console.warn("Tab ID request received with no tab ID in sender")
      return { tabId: null, error: "No tab ID available" }
    }
    return { tabId: sender.tab.id, success: true }
  } catch (error) {
    console.error("Error handling getTabId request:", error)
    return { tabId: null, error: "Failed to get tab ID", success: false }
  }
})

// Listen for changes to browser tabs and reset icon
try {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      // Get the tab
      const tab = await chrome.tabs.get(activeInfo.tabId)

      // Update icon based on tab URL
      await updateIconForTab(tab)

      // Send tab switch analytics
      const userConfig = await getUserConfig()
      if (userConfig.collectAnalytics) {
        const analyticsEvent = createAnalyticsEvent("tab_interaction", {
          tabId: activeInfo.tabId
        })
        sendAnalyticsEvent(analyticsEvent)
      }
    } catch (error) {
      console.error("Error handling tab change:", error)
    }
  })
} catch (error) {
  console.error("Error setting up tab activation listener:", error)
}

// Listen for tab URL changes
try {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only update when tab is fully loaded
    if (changeInfo.status === "complete" && tab.url) {
      // Update tab info in our tracker
      if (tab.url.startsWith("http")) {
        try {
          const url = new URL(tab.url)
          const domain = url.hostname

          // Check if domain is blacklisted
          let isBlacklisted = false
          try {
            isBlacklisted = await isDomainBlacklisted(domain)
          } catch (configError) {
            console.error("Error checking blacklist:", configError)
          }

          // Store tab info
          activeTabs[tabId] = {
            id: tabId,
            url: tab.url,
            domain,
            isCollecting: false,
            lastCollection: 0,
            isBlacklisted
          }

          await saveActiveTabs()

          // Update icon based on whether we should collect from this domain
          await updateIconForTab(tab)
        } catch (error) {
          console.error("Error updating tab info:", error)
        }
      }
    }
  })
} catch (error) {
  console.error("Error setting up tab URL change listener:", error)
}

// Listen for tab removal
try {
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
      // Remove tab from our tracker
      if (activeTabs[tabId]) {
        delete activeTabs[tabId]
        await saveActiveTabs()
      }
    } catch (error) {
      console.error("Error handling tab removal:", error)
    }
  })
} catch (error) {
  console.error("Error setting up tab removal listener:", error)
}

// Listen for configuration changes
try {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" || area === "local") {
      // If configuration has changed, get active tab and update icon
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })

        if (activeTab) {
          await updateIconForTab(activeTab)
        }
      } catch (error) {
        console.error("Error updating icon after config change:", error)
      }
    }
  })
} catch (error) {
  console.error("Error setting up storage change listener:", error)
}

/**
 * Updates the extension icon and badge based on the current tab's collection status
 * Checks if the current domain is blacklisted and applies appropriate visual indicators
 * @param tab - The Chrome tab object to check and update
 */
const updateIconForTab = async (tab: chrome.tabs.Tab) => {
  try {
    if (!tab.id || !tab.url || !tab.url.startsWith("http")) {
      // Skip non-HTTP URLs
      return
    }

    const domain = new URL(tab.url).hostname
    let isBlacklisted = false

    try {
      isBlacklisted = await isDomainBlacklisted(domain)
    } catch (error) {
      console.error("Error checking if domain is blacklisted:", error)
    }

    const shouldCollect = await shouldCollectData(tab.url)

    // Update our tracking data
    if (activeTabs[tab.id]) {
      activeTabs[tab.id].isBlacklisted = isBlacklisted
      await saveActiveTabs()
    }

    // Set icon state based on whether collection is enabled
    if (isBlacklisted) {
      await setIconState("disabled", tab.id)
    } else if (shouldCollect) {
      await setIconState("idle", tab.id)
    } else {
      await setIconState("disabled", tab.id)
    }
  } catch (error) {
    console.error("Error updating icon for tab:", error)
  }
}

/**
 * Sets the icon state for a specific tab
 * Updates the badge text and color based on the provided state
 * @param state - The state to set: "collecting", "disabled", or "idle"
 * @param tabId - The ID of the tab to update
 */
const setIconState = async (state: string, tabId: number) => {
  try {
    let badgeText = ""
    let badgeColor = "#808080" // Default gray

    switch (state) {
      case "collecting":
        badgeText = "ON"
        badgeColor = "#4285F4" // Google blue
        break
      case "disabled":
        badgeText = "OFF"
        badgeColor = "#EA4335" // Google red
        break
      case "idle":
        badgeText = ""
        break
    }

    try {
      // First check if the tab still exists before setting badge
      const tabExists = await chrome.tabs
        .get(tabId)
        .then(() => true)
        .catch(() => false)

      if (!tabExists) {
        console.log(`Tab ${tabId} no longer exists, skipping badge update`)
        return
      }

      await chrome.action.setBadgeText({ text: badgeText, tabId })
      await chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId
      })
    } catch (error) {
      console.error("Error setting badge state:", error)
    }
  } catch (error) {
    console.error("Error setting icon state:", error)
  }
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === "install") {
      // First time installation - initialize with all data collection enabled
      const userConfig = await getUserConfig()

      // Make sure all toggles are on
      userConfig.masterCollectionEnabled = true
      userConfig.collectPageMetadata = true
      userConfig.collectInteractions = true
      userConfig.collectDeviceInfo = true
      userConfig.collectContent = true
      userConfig.collectEcommerce = true
      userConfig.collectTravel = true
      userConfig.collectProductivity = true
      userConfig.collectAnalytics = true

      // Save the config
      await updateUserConfig(userConfig)

      // First time installation - send analytics
      const analyticsEvent = createAnalyticsEvent("extension_enabled")
      sendAnalyticsEvent(analyticsEvent)

      // Don't automatically open options page
    }
  } catch (error) {
    console.error("Error handling installation:", error)
  }
})

// Listen for messages from options page or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if this is a structured message with name/body format
  if (message.name && message.body) {
    // These messages are handled by registerMessageHandler, so we can just ignore them here
    // The appropriate handler will pick them up
    return false
  }

  // Handle old-style message format with type property
  if (message.type === "config_updated") {
    // Refresh all tabs with the new configuration
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          updateIconForTab(tab)
        }
      })
      // Send response immediately after starting the update process
      sendResponse({ success: true })
    })
    return true // Indicate we will send response asynchronously
  }

  // For any other message types, respond immediately
  sendResponse({ success: false, error: "Unknown message type" })
  return false // No asynchronous response needed
})
