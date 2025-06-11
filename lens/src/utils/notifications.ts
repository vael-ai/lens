/**
 * Chrome notifications utility for lens extension
 * Handles data collection limit notifications with proper permission management
 */

import { DATA_LIMITS, DataSizeUtils } from "@/config/data-limits"

import { Storage } from "@plasmohq/storage"

// Storage keys for tracking notification state
const NOTIFICATIONS_SHOWN_KEY = "vael_notifications_shown"
const NOTIFICATION_PERMISSIONS_KEY = "vael_notification_permissions"

// Notification IDs
const NOTIFICATION_IDS = {
  REPORT_READY: "lens-report-ready",
  REPORT_COMPLETED: "lens-report-completed",
  WARNING_THRESHOLD: "lens-warning-threshold",
  MAX_SIZE_REACHED: "lens-max-size-reached"
} as const

// Notification tracking state
interface NotificationState {
  reportReadyShown: boolean
  warningShown: boolean
  maxSizeShown: boolean
  lastReportReadySize: number
  lastWarningSize: number
  permissionsGranted: boolean
}

/**
 * Storage instance for notification state
 */
const storage = new Storage({
  area: "local"
})

/**
 * Get current notification state from storage
 */
async function getNotificationState(): Promise<NotificationState> {
  try {
    const state = await storage.get<NotificationState>(NOTIFICATIONS_SHOWN_KEY)
    return (
      state || {
        reportReadyShown: false,
        warningShown: false,
        maxSizeShown: false,
        lastReportReadySize: 0,
        lastWarningSize: 0,
        permissionsGranted: false
      }
    )
  } catch (error) {
    console.error("Error getting notification state:", error)
    return {
      reportReadyShown: false,
      warningShown: false,
      maxSizeShown: false,
      lastReportReadySize: 0,
      lastWarningSize: 0,
      permissionsGranted: false
    }
  }
}

/**
 * Update notification state in storage
 */
async function updateNotificationState(
  updates: Partial<NotificationState>
): Promise<void> {
  try {
    const currentState = await getNotificationState()
    const newState = { ...currentState, ...updates }
    await storage.set(NOTIFICATIONS_SHOWN_KEY, newState)
  } catch (error) {
    console.error("Error updating notification state:", error)
  }
}

/**
 * Check if Chrome notifications permission is granted
 */
async function checkNotificationPermission(): Promise<boolean> {
  try {
    // Check if notifications API is available
    if (!chrome?.notifications) {
      console.warn("Chrome notifications API not available")
      return false
    }

    // Check permission level
    const level = await chrome.notifications.getPermissionLevel()
    const granted = level === "granted"

    // Update stored permission state
    await updateNotificationState({ permissionsGranted: granted })

    return granted
  } catch (error) {
    console.error("Error checking notification permission:", error)
    return false
  }
}

/**
 * Request notification permissions from user
 * Note: Chrome extensions get notification permissions automatically when declared in manifest
 * This function mainly checks if permissions are working
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const hasPermission = await checkNotificationPermission()

    if (!hasPermission) {
      console.warn(
        "Notification permissions not granted. Notifications declared in manifest should be auto-granted."
      )
      return false
    }

    // Notification permissions are available
    return true
  } catch (error) {
    console.error("Error requesting notification permissions:", error)
    return false
  }
}

/**
 * Create a notification with Chrome's native notification system
 */
async function createNotification(
  id: string,
  title: string,
  message: string,
  iconUrl: string = chrome.runtime.getURL("assets/icon.png"),
  priority: number = 1
): Promise<boolean> {
  try {
    // Check if we have permission
    const hasPermission = await checkNotificationPermission()
    if (!hasPermission) {
      console.warn("No notification permission, skipping notification")
      return false
    }

    // Clear any existing notification with the same ID
    try {
      await chrome.notifications.clear(id)
    } catch (e) {
      // Ignore errors if notification doesn't exist
    }

    // Create the notification
    const notificationId = await chrome.notifications.create(id, {
      type: "basic",
      iconUrl,
      title,
      message,
      priority,
      requireInteraction: false, // Don't require interaction for better UX
      silent: false // Allow sound
    })

    // Notification created (log removed for security)
    return true
  } catch (error) {
    console.error("Error creating notification:", error)
    return false
  }
}

/**
 * Show notification when minimum report size is reached
 */
export async function showReportReadyNotification(
  currentSize: number
): Promise<void> {
  try {
    const state = await getNotificationState()

    // Don't show if already shown for this size threshold or if size decreased significantly
    if (
      state.reportReadyShown &&
      currentSize - state.lastReportReadySize <
        DATA_LIMITS.MIN_REPORT_SIZE_BYTES / 2
    ) {
      return
    }

    const formattedSize = DataSizeUtils.formatBytes(currentSize)
    const minSize = DataSizeUtils.formatBytes(DATA_LIMITS.MIN_REPORT_SIZE_BYTES)

    const success = await createNotification(
      NOTIFICATION_IDS.REPORT_READY,
      "📊 Report Ready!",
      `You've collected ${formattedSize} of browsing data (${minSize} minimum reached). Click the lens icon to generate your personalized insights report.`,
      chrome.runtime.getURL("assets/icon.png"),
      1
    )

    if (success) {
      await updateNotificationState({
        reportReadyShown: true,
        lastReportReadySize: currentSize
      })
    }
  } catch (error) {
    console.error("Error showing report ready notification:", error)
  }
}

/**
 * Show notification when a report has been completed
 */
export async function showReportCompletedNotification(
  reportId: string
): Promise<void> {
  try {
    const success = await createNotification(
      NOTIFICATION_IDS.REPORT_COMPLETED,
      "🎉 Your Report is Ready!",
      `Your personalized browsing intelligence report has been generated! Click to view your insights and discover patterns you didn't know about yourself.`,
      chrome.runtime.getURL("assets/icon.png"),
      2 // High priority for completed reports
    )

    // Report completion notification sent (log removed for security)
  } catch (error) {
    console.error("Error showing report completed notification:", error)
  }
}

/**
 * Show notification when warning threshold is reached
 */
export async function showWarningThresholdNotification(
  currentSize: number
): Promise<void> {
  try {
    const state = await getNotificationState()

    // Don't show if already shown for this size threshold
    if (
      state.warningShown &&
      currentSize - state.lastWarningSize < DATA_LIMITS.WARNING_SIZE_BYTES / 10
    ) {
      return
    }

    const formattedSize = DataSizeUtils.formatBytes(currentSize)
    const maxSize = DataSizeUtils.formatBytes(
      DATA_LIMITS.MAX_COLLECTION_SIZE_BYTES
    )
    const usagePercent = Math.round(
      DataSizeUtils.getUsagePercentage(currentSize)
    )

    const success = await createNotification(
      NOTIFICATION_IDS.WARNING_THRESHOLD,
      "⚠️ Storage Nearly Full",
      `You've used ${formattedSize} (${usagePercent}%) of your ${maxSize} data limit. Consider generating a report or clearing old data soon.`,
      chrome.runtime.getURL("assets/icon.png"),
      1
    )

    if (success) {
      await updateNotificationState({
        warningShown: true,
        lastWarningSize: currentSize
      })
    }
  } catch (error) {
    console.error("Error showing warning threshold notification:", error)
  }
}

/**
 * Show notification when maximum collection size is reached
 */
export async function showMaxSizeReachedNotification(
  currentSize: number
): Promise<void> {
  try {
    const state = await getNotificationState()

    // Always show this critical notification, but limit to once per session
    if (state.maxSizeShown) {
      return
    }

    const formattedSize = DataSizeUtils.formatBytes(currentSize)
    const maxSize = DataSizeUtils.formatBytes(
      DATA_LIMITS.MAX_COLLECTION_SIZE_BYTES
    )

    const success = await createNotification(
      NOTIFICATION_IDS.MAX_SIZE_REACHED,
      "🛑 Storage Limit Reached",
      `You've reached the ${maxSize} data collection limit (${formattedSize}). New data collection is paused. Generate a report or clear data to continue.`,
      chrome.runtime.getURL("assets/icon.png"),
      2 // High priority
    )

    if (success) {
      await updateNotificationState({
        maxSizeShown: true
      })
    }
  } catch (error) {
    console.error("Error showing max size notification:", error)
  }
}

/**
 * Check data size and show appropriate notifications
 */
export async function checkDataSizeAndNotify(
  currentSize: number
): Promise<void> {
  try {
    // Initialize permissions on first check
    await requestNotificationPermissions()

    // Check for max size reached (highest priority)
    if (!DataSizeUtils.isWithinCollectionLimit(currentSize)) {
      await showMaxSizeReachedNotification(currentSize)
      return // Don't show other notifications if at max
    }

    // Check for warning threshold
    if (DataSizeUtils.isApproachingLimit(currentSize)) {
      await showWarningThresholdNotification(currentSize)
    }

    // Check for report ready (only if not at warning level to avoid spam)
    if (
      DataSizeUtils.meetsReportMinimum(currentSize) &&
      !DataSizeUtils.isApproachingLimit(currentSize)
    ) {
      await showReportReadyNotification(currentSize)
    }
  } catch (error) {
    console.error("Error checking data size for notifications:", error)
  }
}

/**
 * Reset notification state (useful when data is cleared)
 */
export async function resetNotificationState(): Promise<void> {
  try {
    await updateNotificationState({
      reportReadyShown: false,
      warningShown: false,
      maxSizeShown: false,
      lastReportReadySize: 0,
      lastWarningSize: 0
    })

    // Clear all existing notifications
    const ids = Object.values(NOTIFICATION_IDS)
    for (const id of ids) {
      try {
        await chrome.notifications.clear(id)
      } catch (e) {
        // Ignore errors for non-existent notifications
      }
    }
  } catch (error) {
    console.error("Error resetting notification state:", error)
  }
}

/**
 * Set up notification click handlers
 */
export function setupNotificationHandlers(): void {
  if (!chrome?.notifications) {
    return
  }

  // Handle notification clicks
  chrome.notifications.onClicked.addListener((notificationId) => {
    // Notification clicked (log removed for security)

    // Clear the notification
    chrome.notifications.clear(notificationId)

    // Open the popup or take appropriate action based on notification type
    switch (notificationId) {
      case NOTIFICATION_IDS.REPORT_READY:
        // Open popup to generate report
        chrome.action.openPopup().catch(console.error)
        break
      case NOTIFICATION_IDS.REPORT_COMPLETED:
        // Open popup to view completed report
        chrome.action.openPopup?.()
        break
      case NOTIFICATION_IDS.WARNING_THRESHOLD:
      case NOTIFICATION_IDS.MAX_SIZE_REACHED:
        // Open popup to manage data
        chrome.action.openPopup?.()
        break
    }
  })

  // Handle notification close events
  chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    // Notification closed (log removed for security)
  })
}

/**
 * Initialize notification system
 */
export async function initializeNotifications(): Promise<void> {
  try {
    // Request permissions
    await requestNotificationPermissions()

    // Set up event handlers
    setupNotificationHandlers()

    // Notification system initialized
  } catch (error) {
    console.error("Error initializing notification system:", error)
  }
}
