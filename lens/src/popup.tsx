import { Header, MasterToggle } from "@/components"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DATA_LIMITS, DataSizeUtils } from "@/config/data-limits"
import { getSettingLabel } from "@/utils/labels"
import React, { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import packageInfo from "../package.json"
import ErrorBoundary from "./components/ErrorBoundary"
import { LensLogo } from "./components/LensLogo"
import type { CollectedData, WebsiteData } from "./types/data"
import {
  clearAllCollectedData,
  exportCollectedData,
  getAllCollectedData,
  sendAnalyticsEvent
} from "./utils/api"
import {
  DATA_SIZE_THRESHOLD_BYTES,
  DATA_SIZE_THRESHOLD_KB,
  MAX_DATA_COLLECTION_BYTES,
  ONBOARDING_COMPLETE_KEY,
  USER_EMAIL_KEY
} from "./utils/constants"
import { createAnalyticsEvent } from "./utils/dataCollection"
import { generateUUID, isValidUrl } from "./utils/helpers"
import {
  showMaxSizeReachedNotification,
  showReportReadyNotification,
  showWarningThresholdNotification
} from "./utils/notifications"
import {
  addToBlacklist,
  getUserConfig,
  hasValidUserEmail,
  removeFromBlacklist,
  shouldCollectData,
  updateUserConfig
} from "./utils/userPreferences"
import type { UserConfig } from "./utils/userPreferences"

import "./main.css"

// Determine API and Report URLs based on environment variable
const USE_LOCAL_API =
  (process.env.PLASMO_PUBLIC_USE_LOCAL_API || "").toString().toLowerCase() ===
  "true"
const API_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3000"
  : "https://lens.vael.ai"
const REPORTS_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3000"
  : "https://lens.vael.ai"

type BooleanUserConfigKeys = {
  [K in keyof UserConfig]: UserConfig[K] extends boolean ? K : never
}[keyof UserConfig]

/**
 * Main popup component for the browser extension.
 * Handles user interface for data collection settings, current site information,
 * and collected data management.
 */
function IndexPopup(): JSX.Element {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [currentDomain, setCurrentDomain] = useState<string>("")
  const [isCurrentDomainBlacklisted, setIsCurrentDomainBlacklisted] =
    useState(false)
  const [activeTab, setActiveTab] = useState("overview") // Default to overview
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)
  const [onboardingEmailInput, setOnboardingEmailInput] = useState<string>("")
  const [dataCollectionAgreed, setDataCollectionAgreed] =
    useState<boolean>(false)
  const [dataSizeInBytes, setDataSizeInBytes] = useState<number>(0)
  const [websiteCount, setWebsiteCount] = useState<number>(0)
  const [dataSize, setDataSize] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isReportReady, setIsReportReady] = useState<boolean>(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false)
  const [lastReportDataSize, setLastReportDataSize] = useState<number>(0)
  const [canGenerateNewReport, setCanGenerateNewReport] =
    useState<boolean>(true)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [hasEmail, setHasEmail] = useState(false)

  // Define the boolean config keys to display in settings with color coding
  const BOOLEAN_USER_CONFIG_KEYS = [
    { key: "collectHistory", color: "purple" },
    { key: "collectPageMetadata", color: "indigo" },
    { key: "collectInteractions", color: "blue" },
    { key: "collectTabActivity", color: "sky" },
    { key: "collectContent", color: "cyan" },
    { key: "collectDeviceInfo", color: "teal" },
    { key: "collectAnalytics", color: "green" }
  ] as const

  /**
   * Calculates the exact data size as it would be exported
   * This matches the format used by exportCollectedData (with pretty printing)
   * @param data - The collected data to calculate size for
   * @returns Size in bytes matching the exported format
   */
  const calculateExactExportSize = (data: CollectedData | null): number => {
    if (!data) return 0
    // Use the same formatting as exportCollectedData: JSON.stringify(data, null, 2)
    const exactSize = JSON.stringify(data, null, 2).length

    return exactSize
  }

  const validateDataForReport = (
    dataSize: number
  ): { valid: boolean; reason?: string } => {
    if (!DataSizeUtils.meetsReportMinimum(dataSize)) {
      return {
        valid: false,
        reason: `Insufficient data for report generation. You need at least ${DataSizeUtils.formatBytes(DATA_LIMITS.MIN_REPORT_SIZE_BYTES)} of browsing data.`
      }
    }

    if (!DataSizeUtils.isWithinCollectionLimit(dataSize)) {
      return {
        valid: false,
        reason: `Data size exceeds maximum limit. Maximum ${DataSizeUtils.formatBytes(DATA_LIMITS.MAX_COLLECTION_SIZE_BYTES)} allowed.`
      }
    }

    return { valid: true }
  }

  // Load user configuration
  useEffect(() => {
    /**
     * Loads the user configuration from storage and determines the current active tab's information.
     * Sets up state for domain blacklist status and current URL/domain.
     * Defaults all data collectors to enabled for new users.
     */
    const loadConfig = async () => {
      try {
        let userConfig = await getUserConfig()

        // Default all data collectors to enabled for new users
        if (Object.keys(userConfig).length === 0 || !userConfig.initialized) {
          userConfig = {
            ...userConfig,
            masterCollectionEnabled: true,
            collectHistory: true,
            collectPageMetadata: true,
            collectInteractions: true,
            collectTabActivity: true,
            collectContent: true,
            collectDeviceInfo: true,
            collectAnalytics: true,
            initialized: true
          }
          // Save the default configuration
          await updateUserConfig(userConfig)
        }

        setConfig(userConfig)

        // Get current tab domain and URL
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tabs[0]?.url) {
          const url = new URL(tabs[0].url)
          setCurrentUrl(tabs[0].url)
          // Get just the hostname (domain) without path, query, etc.
          const domain = url.hostname
          setCurrentDomain(domain)

          // Check if current domain is blacklisted
          setIsCurrentDomainBlacklisted(
            userConfig.blacklistedDomains.some(
              (d) => domain === d || domain.endsWith(`.${d}`)
            )
          )
        }

        // Load email and onboarding status
        const storage = new Storage() // Ensure storage is initialized here or globally accessible
        const storedEmail = await storage.get<string>(USER_EMAIL_KEY)
        const onboardingComplete = await storage.get<boolean>(
          ONBOARDING_COMPLETE_KEY
        )

        if (storedEmail) {
          setUserEmail(storedEmail)
        }

        if (!onboardingComplete) {
          setShowOnboarding(true)
        } else {
          setShowOnboarding(false) // Ensure it's false if onboarding is complete
        }

        // Check if user has a valid email
        const emailValid = await hasValidUserEmail()
        setHasEmail(emailValid)
      } catch (error) {
        console.error("Error loading config:", error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  /**
   * Handles tab switching and loads data when necessary
   */
  useEffect(() => {
    // Only load data when switching to data-related tabs
    if (activeTab === "data" || activeTab === "overview") {
      loadCollectedData(true) // Force refresh when switching tabs to ensure fresh data
    }
  }, [activeTab])

  /**
   * Set up periodic checking for completed reports
   */
  useEffect(() => {
    // Check for completed reports every 15 seconds
    const interval = setInterval(checkForCompletedReports, 15000)

    // Also check immediately when component mounts
    checkForCompletedReports()

    return () => clearInterval(interval)
  }, [userEmail]) // Re-setup when email changes

  /**
   * Loads collected data and calculates statistics with caching to prevent multiple calls.
   */
  const loadCollectedData = async (forceRefresh = false) => {
    // Don't load if already loading (unless force refresh)
    if (dataLoading || (!forceRefresh && isDataLoaded)) return

    try {
      setDataLoading(true)
      const data = await getAllCollectedData()
      setCollectedData(data)

      // Calculate both formatted and compact sizes
      const formattedExportSizeInBytes = calculateExactExportSize(data)
      const compactDataSizeInBytes = JSON.stringify(data).length

      // Store the compact size for validation (matches backend logic)
      setDataSizeInBytes(compactDataSizeInBytes)

      const websitesArray = Object.values(data.websites || {})
      const websiteCount = websitesArray.length
      const dataSizeFormatted =
        (compactDataSizeInBytes / 1024).toFixed(2) + " KB"

      // Debug logging removed for security
      const lastUpdatedTimestamp = data.lastUpdated || Date.now()
      const lastUpdatedFormatted = new Date(
        lastUpdatedTimestamp
      ).toLocaleString()
      const reportIsReady =
        compactDataSizeInBytes >= DATA_LIMITS.MIN_REPORT_SIZE_BYTES

      // Check if user can generate a new report (if data has grown by at least minimum threshold since last report)
      const canGenerateNew = reportIsReady

      setWebsiteCount(websiteCount)
      setDataSize(dataSizeFormatted)
      setLastUpdated(lastUpdatedFormatted)
      setIsReportReady(reportIsReady)
      setCanGenerateNewReport(canGenerateNew)
      setIsDataLoaded(true) // Mark as loaded to prevent unnecessary reloads
    } catch (error) {
      console.error("Error loading collected data:", error)
      setCollectedData(null)
    } finally {
      setDataLoading(false)
    }
  }

  /**
   * Toggles a specific extension setting in the user configuration.
   * Updates both local state and persisted storage.
   * @param key - The configuration setting to toggle
   */
  const toggleSetting = async (key: keyof UserConfig) => {
    if (!config) return

    try {
      const newValue = !config[key]
      const updatedConfig = await updateUserConfig({ [key]: newValue })
      setConfig(updatedConfig)
    } catch (error) {
      console.error(`Error toggling ${key}:`, error)
    }
  }

  /**
   * Toggles the master collection switch for the entire extension.
   * When enabled, the extension collects data according to individual settings.
   * When disabled, no data collection occurs on any site.
   * Also logs an analytics event if analytics are enabled.
   */
  const toggleMasterCollection = async () => {
    if (!config) return

    try {
      const newValue = !config.masterCollectionEnabled
      const updatedConfig = await updateUserConfig({
        masterCollectionEnabled: newValue
      })
      setConfig(updatedConfig)

      // Log analytics event
      if (config.collectAnalytics) {
        const eventType = newValue ? "extension_enabled" : "extension_disabled"
        const analyticsEvent = createAnalyticsEvent(eventType)
        sendAnalyticsEvent(analyticsEvent)
      }
    } catch (error) {
      console.error("Error toggling master collection:", error)
    }
  }

  /**
   * Toggles the current domain between blacklisted and allowed status.
   * When a domain is blacklisted, no data is collected from it regardless of other settings.
   */
  const toggleCurrentDomain = async () => {
    if (!currentDomain || !config) return

    try {
      if (isCurrentDomainBlacklisted) {
        // Remove from blacklist
        const updatedBlacklist = await removeFromBlacklist(currentDomain)
        setConfig({
          ...config,
          blacklistedDomains: updatedBlacklist
        })
        setIsCurrentDomainBlacklisted(false)
      } else {
        // Add to blacklist
        const updatedBlacklist = await addToBlacklist(currentDomain)
        setConfig({
          ...config,
          blacklistedDomains: updatedBlacklist
        })
        setIsCurrentDomainBlacklisted(true)
      }
    } catch (error) {
      console.error("Error toggling current domain:", error)
    }
  }

  /**
   * Exports all collected data as a downloadable JSON file.
   * Creates a file with the current date in the filename and triggers a download.
   * Also logs an analytics event if analytics are enabled.
   */
  const handleExportData = async () => {
    try {
      const dataStr = await exportCollectedData()

      // Export size verification (log removed for security)

      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `vael-data-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Log analytics
      if (config?.collectAnalytics) {
        const analyticsEvent = createAnalyticsEvent("data_exported")
        sendAnalyticsEvent(analyticsEvent)
      }

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  /**
   * Clears all collected data after user confirmation.
   * This action cannot be undone.
   */
  const handleClearData = async () => {
    if (
      confirm(
        "Are you sure you want to clear all collected data? This cannot be undone."
      )
    ) {
      try {
        await clearAllCollectedData()
        setCollectedData(null)
        // Reset report generation state
        setLastReportDataSize(0)
        setCanGenerateNewReport(true)
        setIsGeneratingReport(false)
        // Reset data cache to force reload
        resetDataCache()
        // Reload data to update UI
        loadCollectedData()
      } catch (error) {
        console.error("Error clearing data:", error)
      }
    }
  }

  /**
   * Opens the about page in a new browser tab.
   */
  const openAboutPage = () => {
    window.open("https://example.com", "_blank")
  }

  /**
   * Opens the extension's options page for advanced settings.
   */
  const openAdvancedSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  // Open advanced settings with specific tab
  const openAdvancedSettingsWithTab = (tab: string) => {
    // Direct navigation to options page with hash
    chrome.tabs.create({
      url: chrome.runtime.getURL("options.html") + "#" + tab
    })
  }

  /**
   * Returns the most recently visited websites from collected data.
   * Limited to 5 sites for UI purposes.
   * @returns Array of tuples containing website URL and associated data, sorted by last visit time
   */
  const getRecentWebsites = (): any[] => {
    if (!collectedData?.websites) return []

    return Object.entries(collectedData.websites)
      .map(([domain, data]) => {
        const lastVisitTimestamp =
          (data as any).lastActivity ||
          (data as any).tabActivityStats?.lastActivity ||
          0
        return {
          ...(data as WebsiteData), // Cast to WebsiteData for type safety
          domain,
          lastVisitSortKey: lastVisitTimestamp
        }
      })
      .sort((a, b) => b.lastVisitSortKey - a.lastVisitSortKey)
      .slice(0, 5)
      .map((siteEntry) => {
        return {
          name: siteEntry.pageMetadata?.title || siteEntry.domain,
          url: `http://${siteEntry.domain}`,
          dataCollected: `${(JSON.stringify(siteEntry).length / 1024).toFixed(2)} KB`,
          pageMetadata: siteEntry.pageMetadata,
          domainSpecificData: siteEntry.domainSpecificData,
          tabActivityStats: siteEntry.tabActivityStats,
          interactions: siteEntry.interactions,
          lastVisit: siteEntry.lastVisitSortKey || undefined
        }
      })
  }

  // New function to handle onboarding form submission
  const handleOnboardingSubmit = async () => {
    // Check if user has agreed to data collection terms
    if (!dataCollectionAgreed) {
      alert("Please agree to the data collection terms to continue.")
      return
    }

    // Validate email
    const emailToSave = onboardingEmailInput
    if (!emailToSave || !emailToSave.includes("@")) {
      alert("Please enter a valid email address.")
      return
    }

    try {
      // Send email to server and wait for response
      const serverUrl = USE_LOCAL_API
        ? "http://localhost:3000"
        : "https://lens.vael.ai"

      // Sending email to server (log removed for security)

      const response = await fetch(`${serverUrl}/api/save-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailToSave
        })
      })

      // Only proceed if we get a 200 status code
      if (response.status !== 200) {
        const errorData = await response.json().catch(() => ({
          message: `Failed to save email. Server returned status ${response.status}.`
        }))
        alert(
          errorData.message ||
            `Failed to save email. Server returned status ${response.status}.`
        )
        return
      }

      const result = await response.json()
      if (!result.success) {
        alert(result.error || "Failed to save email. Please try again.")
        return
      }

      // Only update UI and storage after successful server response

      // Save to local storage
      const storage = new Storage()
      await storage.set(USER_EMAIL_KEY, emailToSave)
      await storage.set(ONBOARDING_COMPLETE_KEY, true)

      // Enable master collection now that email is provided
      const updatedConfig = await updateUserConfig({
        masterCollectionEnabled: true
      })
      setConfig(updatedConfig)

      // Also store in cookie for dev mode
      if (USE_LOCAL_API) {
        document.cookie = `userEmail=${emailToSave}; path=/;`
      }

      // Update UI state only after everything is successful
      setUserEmail(emailToSave)
      setShowOnboarding(false)
      setHasEmail(true)
    } catch (error) {
      console.error("Error during onboarding:", error)
      alert("An error occurred while saving your email. Please try again.")

      // Ensure onboarding is not marked as complete on error
      const storage = new Storage()
      await storage.set(ONBOARDING_COMPLETE_KEY, false)
    }
  }

  // New function to handle report generation
  const handleGenerateReport = async () => {
    if (!userEmail) {
      alert("Email not found. Please complete onboarding.")
      return
    }

    // Do a live check - fetch fresh data from storage (no cache)
    let freshData: CollectedData
    try {
      freshData = await getAllCollectedData()
    } catch (error) {
      console.error("Error loading fresh data for report generation:", error)
      alert("Failed to load current data. Please try again.")
      return
    }

    // Calculate compact data size (same method as backend validation)
    const compactDataSize = JSON.stringify(freshData).length
    const formattedDataSize = calculateExactExportSize(freshData)

    // Data validation (production logs removed for security)

    // Use the compact size for validation (matches backend logic)
    const validation = validateDataForReport(compactDataSize)
    if (!validation.valid) {
      alert(validation.reason)
      return
    }

    // We no longer check canGenerateNewReport here since we're only using isReportReady
    // to determine if the user has enough data (>= 20KB)

    // Set loading state and disable button immediately
    setIsGeneratingReport(true)

    const reportId = crypto.randomUUID()

    // Always submit data to server (development or production)
    try {
      const serverUrl = USE_LOCAL_API
        ? "http://localhost:3000"
        : "https://lens.vael.ai"
      // Submitting data for report generation (log removed for security)

      const response = await fetch(`${serverUrl}/api/submit-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reportId: reportId,
          email: userEmail,
          userData: freshData // Send the fresh data object
        })
      })

      const result = await response.json()

      if (result.success) {
        // Handle cached report response
        if (result.cached) {
          const reportsUrl = USE_LOCAL_API
            ? "http://localhost:3000"
            : "https://lens.vael.ai"
          chrome.tabs.create({
            url: `${reportsUrl}/reports/${result.reportId}?email=${encodeURIComponent(userEmail)}`
          })
          setIsGeneratingReport(false)
          return
        }

        // Mark that a report was generated with this data size
        setLastReportDataSize(compactDataSize)
        setCanGenerateNewReport(false)

        // Add report to pending list for notification checking
        const storage = new Storage()
        const pendingReports =
          (await storage.get<
            { reportId: string; email: string; timestamp: number }[]
          >("pendingReports")) || []
        pendingReports.push({
          reportId: reportId,
          email: userEmail,
          timestamp: Date.now()
        })
        await storage.set("pendingReports", pendingReports)

        const reportsUrl = USE_LOCAL_API
          ? "http://localhost:3000"
          : "https://lens.vael.ai"
        chrome.tabs.create({
          url: `${reportsUrl}/reports/${reportId}?email=${encodeURIComponent(userEmail)}`
        })

        // Loading state will be cleared when user navigates away or closes popup
      } else {
        console.error("Failed to submit data:", result.error)
        setIsGeneratingReport(false) // Reset loading state on error

        // Handle specific error types
        if (response.status === 401) {
          alert(
            "Authentication failed. Please update the extension or contact support."
          )
        } else if (result.error) {
          // Show backend error details if present
          let errorMsg = `Failed to submit data for report: ${result.error}`
          if (result.minimumWaitTime)
            errorMsg += `\nMinimum wait time: ${result.minimumWaitTime}`
          if (result.currentDataSize)
            errorMsg += `\nCurrent data size: ${result.currentDataSize}`
          if (result.previousDataSize)
            errorMsg += `\nPrevious data size: ${result.previousDataSize}`
          if (result.similarity)
            errorMsg += `\nSimilarity: ${result.similarity}`
          if (result.tip) errorMsg += `\nTip: ${result.tip}`
          alert(errorMsg)
        } else {
          alert(`Failed to submit data for report: Unknown error`)
        }
      }
    } catch (error) {
      console.error("Error generating report:", error)
      setIsGeneratingReport(false) // Reset loading state on error
      if (error instanceof Error) {
        alert(`An error occurred while generating the report: ${error.message}`)
      } else {
        alert("An unknown error occurred while generating the report.")
      }
    }
  }

  /**
   * Reset data loaded flag when generating reports or clearing data
   */
  const resetDataCache = () => {
    setIsDataLoaded(false)
  }

  /**
   * Test notification system (development only)
   */
  const testNotifications = async () => {
    if (process.env.NODE_ENV === "development") {
      try {
        // Test all three notification types
        await showReportReadyNotification(25 * 1024) // 25KB
        setTimeout(() => showWarningThresholdNotification(400 * 1024), 2000) // 400KB
        setTimeout(() => showMaxSizeReachedNotification(500 * 1024), 4000) // 500KB
      } catch (error) {
        console.error("Error testing notifications:", error)
      }
    }
  }

  /**
   * Check for completed reports and show notifications
   */
  const checkForCompletedReports = async () => {
    try {
      if (!userEmail) return

      const storage = new Storage()
      const lastCheckedReports =
        (await storage.get<string[]>("lastCheckedReports")) || []

      // Check if there are any recent processing reports that might be completed
      const pendingReports =
        (await storage.get<
          { reportId: string; email: string; timestamp: number }[]
        >("pendingReports")) || []

      // Check each pending report
      for (const report of pendingReports) {
        // If report is older than 30 seconds and not already checked
        if (
          Date.now() - report.timestamp > 30 * 1000 &&
          !lastCheckedReports.includes(report.reportId)
        ) {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/reports/${report.reportId}/status?email=${encodeURIComponent(report.email)}`
            )
            if (response.ok) {
              const status = await response.json()
              if (status.status === "completed") {
                // Report completed, showing notification (log removed for security)
                // await showReportCompletedNotification(report.reportId) // Function does not exist

                // Add to checked list to avoid duplicate notifications
                const updatedChecked = [...lastCheckedReports, report.reportId]
                await storage.set("lastCheckedReports", updatedChecked)

                // Remove from pending list
                const updatedPending = pendingReports.filter(
                  (p) => p.reportId !== report.reportId
                )
                await storage.set("pendingReports", updatedPending)
              }
            }
          } catch (error) {
            console.error(`Error checking report ${report.reportId}:`, error)
          }
        }
      }
    } catch (error) {
      console.error("Error checking for completed reports:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-4 w-[400px] h-[550px] flex items-center justify-center">
        <p>Loading settings...</p>
      </div>
    )
  }

  const recentWebsites = getRecentWebsites() // (only one declaration should exist)

  // Conditional rendering for onboarding
  if (showOnboarding) {
    return (
      <div className="p-4 w-[400px] h-[550px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-purple-900/30 dark:to-indigo-900/50 animate-gradient-x">
        <div className="w-full max-w-sm p-6 transition-all duration-300 bg-white border border-purple-300 rounded-lg shadow-xl dark:border-purple-700 dark:bg-slate-800/90 backdrop-blur-sm hover:shadow-2xl">
          <div className="flex justify-center mb-2">
            {/* Lens Logo */}
            <div className="flex items-center justify-center w-20 h-20">
              <LensLogo className="w-16 h-16" />
            </div>
          </div>
          <h2 className="mb-3 text-xl font-bold text-center text-purple-600 dark:text-purple-400 animate-fade-in">
            Welcome to lens
          </h2>
          <div className="p-3 mb-4 text-center rounded-lg bg-slate-50 dark:bg-slate-700/30">
            <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">
              Your privacy-first browser extension that collects browsing data
              locally to generate AI-powered insights.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              lens collects your browsing data locally and only transmits it
              when you choose to generate reports through our secure AI analysis
              service.
            </p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="email"
                placeholder="you@example.com"
                value={onboardingEmailInput}
                onChange={(e) => setOnboardingEmailInput(e.target.value)}
                className="w-full p-3 pl-10 transition-all border border-purple-300 rounded-md dark:border-purple-600 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <div className="absolute left-3 top-3.5 text-purple-500 dark:text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Data Collection Agreement Checkbox */}
            <div className="flex items-start p-3 space-x-3 border rounded-md bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600/30">
              <input
                type="checkbox"
                id="dataCollectionAgreement"
                checked={dataCollectionAgreed}
                onChange={(e) => setDataCollectionAgreed(e.target.checked)}
                className="w-4 h-4 mt-1 text-purple-600 transition-colors border-purple-300 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="dataCollectionAgreement"
                className="text-xs leading-relaxed cursor-pointer text-slate-600 dark:text-slate-300">
                I agree to the data collection methods as described in the{" "}
                <a
                  href="https://github.com/vaelai/lens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                  GitHub repository
                </a>
                . Data is stored locally and only shared when I generate
                reports.
              </label>
            </div>

            <Button
              onClick={handleOnboardingSubmit}
              disabled={!dataCollectionAgreed}
              className="w-full h-10 text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 dark:from-purple-500 dark:to-indigo-500 dark:hover:from-purple-600 dark:hover:to-indigo-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              Continue & Start Collecting
            </Button>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Your email is used solely for report access and is kept
              confidential.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-4 pb-2 w-[400px] h-[550px] flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-100 dark:from-slate-800 dark:via-purple-900/20 dark:to-indigo-900/30 border border-transparent rounded-lg text-sm text-slate-800 dark:text-slate-200 shadow-lg transition-all duration-300">
        {/* Header */}
        <Header />
        {/* Master Toggle */}
        <MasterToggle
          enabled={config?.masterCollectionEnabled ?? false}
          onToggle={toggleMasterCollection}
          hasEmail={hasEmail}
        />
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 -mb-2">
          <TabsList className="grid w-full h-10 grid-cols-2 p-1 mb-3 rounded-md shadow-sm bg-slate-100/70 dark:bg-slate-800/60 backdrop-blur-sm">
            <TabsTrigger
              value="overview"
              className="text-xs h-8 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200 font-medium">
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="text-xs h-8 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200 font-medium">
              Data
            </TabsTrigger>
          </TabsList>
          {/* Overview Tab */}
          <TabsContent
            value="overview"
            className="flex-1 pr-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Recently Visited
                </div>
              </div>
              <div className="p-3 pt-2 text-xs">
                {recentWebsites.length > 0 ? (
                  <div className="space-y-2">
                    {recentWebsites.slice(0, 3).map((site, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 transition-all duration-200 border border-transparent rounded-md shadow-sm bg-slate-50 dark:bg-slate-700/40 hover:shadow-md hover:bg-purple-50/50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800/30">
                        <div className="flex items-center overflow-hidden">
                          <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 mr-2 text-purple-500 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-purple-600 truncate hover:underline hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            title={site.name}>
                            {site.name.length > 30
                              ? `${site.name.substring(0, 27)}...`
                              : site.name}
                          </a>
                        </div>
                        <span className="ml-2 text-[10px] bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full text-purple-600 dark:text-purple-300 font-medium">
                          {site.dataCollected}
                        </span>
                      </div>
                    ))}
                    {recentWebsites.length > 3 && (
                      <p className="text-[11px] text-center pt-1 text-purple-500 dark:text-purple-400 font-medium">
                        + {recentWebsites.length - 3} more sites (view in Data
                        tab or Advanced Viewer)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">
                      No recent websites to show. Start browsing!
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Settings merged into Overview */}
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Extension Settings
                </div>
              </div>
              <div className="p-3 pt-1 text-xs">
                {config &&
                  BOOLEAN_USER_CONFIG_KEYS.map((setting) => {
                    // Create color class mappings for each setting based on its color
                    const colorClasses = {
                      indicator: {
                        purple: "bg-purple-300 dark:bg-purple-800/50",
                        indigo: "bg-indigo-300 dark:bg-indigo-800/50",
                        blue: "bg-blue-300 dark:bg-blue-800/50",
                        sky: "bg-sky-300 dark:bg-sky-800/50",
                        cyan: "bg-cyan-300 dark:bg-cyan-800/50",
                        teal: "bg-teal-300 dark:bg-teal-800/50",
                        green: "bg-green-300 dark:bg-green-800/50"
                      },
                      text: {
                        purple: "text-purple-500 dark:text-purple-400",
                        indigo: "text-indigo-500 dark:text-indigo-400",
                        blue: "text-blue-500 dark:text-blue-400",
                        sky: "text-sky-500 dark:text-sky-400",
                        cyan: "text-cyan-500 dark:text-cyan-400",
                        teal: "text-teal-500 dark:text-teal-400",
                        green: "text-green-500 dark:text-green-400"
                      },
                      switch: {
                        purple:
                          "data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500",
                        indigo:
                          "data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:bg-indigo-500",
                        blue: "data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500",
                        sky: "data-[state=checked]:bg-sky-600 dark:data-[state=checked]:bg-sky-500",
                        cyan: "data-[state=checked]:bg-cyan-600 dark:data-[state=checked]:bg-cyan-500",
                        teal: "data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500",
                        green:
                          "data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-500"
                      }
                    }

                    return (
                      <div
                        key={setting.key}
                        className={`flex items-center justify-between py-2.5 px-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-sm ${!hasEmail || !config.masterCollectionEnabled ? "opacity-50" : ""}`}>
                        <div className="flex items-center">
                          <div
                            className={`w-1 h-6 ${colorClasses.indicator[setting.color]} rounded-full mr-2 opacity-70`}></div>
                          <div>
                            <label
                              htmlFor={setting.key}
                              className="text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
                              {getSettingLabel(setting.key)}
                            </label>
                            <div
                              className={`text-[9px] ${colorClasses.text[setting.color]} font-medium`}>
                              {!hasEmail
                                ? "Email required"
                                : !config.masterCollectionEnabled
                                  ? "Paused by master toggle"
                                  : config[setting.key as keyof UserConfig]
                                    ? "Active"
                                    : "Inactive"}
                            </div>
                          </div>
                        </div>
                        <Switch
                          id={setting.key}
                          checked={
                            config &&
                            (config[setting.key as keyof UserConfig] as boolean)
                          }
                          onCheckedChange={() =>
                            toggleSetting(setting.key as keyof UserConfig)
                          }
                          disabled={
                            !hasEmail || !config.masterCollectionEnabled
                          }
                          className={`${colorClasses.switch[setting.color]} data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600 transition-colors duration-200`}
                        />
                      </div>
                    )
                  })}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3">
                <div className="text-sm font-semibold">Manage Domains</div>
              </div>
              <div className="p-3 pt-0 text-xs">
                <div className="flex items-center mb-2 space-x-2">
                  <input
                    type="text"
                    placeholder={
                      currentDomain
                        ? `e.g., ${currentDomain}`
                        : "e.g., example.com"
                    }
                    value={""}
                    onChange={(e) => {}}
                    className="h-8 text-xs"
                  />
                  <Button
                    onClick={() => {}}
                    className="h-8 text-xs whitespace-nowrap"
                    variant="outline"
                    style={{ borderColor: "#938EEA", color: "#938EEA" }}>
                    Block Site
                  </Button>
                </div>
                {currentUrl && (
                  <Button
                    onClick={toggleCurrentDomain}
                    variant={
                      isCurrentDomainBlacklisted ? "secondary" : "outline"
                    }
                    className="w-full h-8 mb-2 text-xs"
                    style={{ borderColor: "#938EEA", color: "#938EEA" }}>
                    {isCurrentDomainBlacklisted
                      ? `Unblock ${currentDomain}`
                      : `Block Current Site (${currentDomain})`}
                  </Button>
                )}
                <p className="text-[10px] mb-1" style={{ color: "#938EEA" }}>
                  Blocked sites ({config?.blacklistedDomains.length || 0}):
                </p>
                <div className="pr-1 space-y-1 overflow-y-auto max-h-20 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  {config?.blacklistedDomains.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-700/50 p-1 rounded-sm">
                      <span style={{ color: "#938EEA" }}>{d}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {}}
                        className="h-5 px-1 py-0"
                        style={{ color: "#938EEA" }}>
                        &times;
                      </Button>
                    </div>
                  ))}
                  {config?.blacklistedDomains.length === 0 && (
                    <p className="text-[11px]" style={{ color: "#938EEA" }}>
                      No sites blocked.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent
            value="data"
            className="flex-1 pr-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <div className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Data Summary & Actions
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="flex flex-col items-center justify-center p-3 transition-transform duration-200 border border-purple-100 rounded-lg bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800/30 hover:scale-105">
                    <div className="mb-1 text-purple-500 dark:text-purple-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Websites
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {websiteCount}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 transition-transform duration-200 border border-indigo-100 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800/30 hover:scale-105">
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="text-indigo-500 dark:text-indigo-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                          />
                        </svg>
                      </div>
                      <button
                        onClick={() => loadCollectedData(true)}
                        className="p-1 text-indigo-500 transition-colors duration-200 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                        title="Refresh data"
                        disabled={dataLoading}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-3 h-3 ${dataLoading ? "animate-spin" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Size
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {dataSize}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 transition-transform duration-200 border border-blue-100 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800/30 hover:scale-105">
                    <div className="mb-1 text-blue-500 dark:text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Last Activity
                    </span>
                    <span
                      className="font-bold text-[9px] text-slate-700 dark:text-slate-300 truncate max-w-full"
                      title={lastUpdated}>
                      {lastUpdated.split(",")[0]}
                    </span>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                  {!isReportReady ? (
                    <div className="flex items-center mb-2 text-orange-600 dark:text-orange-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs font-medium">
                        Collect at least {DATA_SIZE_THRESHOLD_KB}KB of data to
                        generate a report
                      </p>
                    </div>
                  ) : !canGenerateNewReport ? (
                    <div className="flex items-center mb-2 text-blue-600 dark:text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs font-medium">
                        Collect {DATA_SIZE_THRESHOLD_KB}KB more data to generate
                        another report
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center mb-2 text-green-600 dark:text-green-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs font-medium">
                        Report is ready to generate
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateReport}
                    className="w-full h-9 text-xs mb-2 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 dark:from-purple-500 dark:to-indigo-500 dark:hover:from-purple-600 dark:hover:to-indigo-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={
                      dataLoading || !isReportReady || isGeneratingReport
                      // Removed !canGenerateNewReport check since it's redundant with isReportReady
                    }>
                    {isGeneratingReport ? (
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 -ml-1 text-white animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Report...
                      </span>
                    ) : dataLoading ? (
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 -ml-1 text-white animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Data...
                      </span>
                    ) : !canGenerateNewReport ? (
                      "Collect More Data"
                    ) : (
                      "Generate Report"
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleExportData}
                      className="text-xs font-medium text-purple-600 transition-all duration-200 bg-white border border-purple-200 shadow-sm h-9 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-purple-400 dark:border-purple-800/30">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Export Data
                    </Button>
                    <Button
                      onClick={handleClearData}
                      className="text-xs font-medium text-red-600 transition-all duration-200 bg-white border border-red-200 shadow-sm h-9 hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800/30">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete All
                    </Button>
                  </div>

                  {exportSuccess && (
                    <div className="flex items-center justify-center text-green-600 dark:text-green-400 mt-2 text-center bg-green-50 dark:bg-green-900/20 p-1.5 rounded-md border border-green-200 dark:border-green-800/30 animate-pulse">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-xs font-medium">
                        Data exported successfully!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={() => openAdvancedSettingsWithTab("data")}
              className="flex items-center justify-center w-full gap-2 text-xs font-medium text-purple-600 transition-all duration-200 bg-white border rounded-lg shadow-sm h-9 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 dark:text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open Advanced Data Viewer
            </Button>
          </TabsContent>
        </Tabs>
        {/* Footer */}
        <div className="mt-auto pt-2 text-center text-[10px] border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          lens by{" "}
          <a
            href="https://lens.vael.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
            vael
          </a>{" "}
          <span
            onDoubleClick={testNotifications}
            className="cursor-pointer"
            title="Double-click to test notifications (dev only)">
            v{packageInfo.version}
          </span>
          <div className="mt-1">
            <a
              href="https://lens.vael.ai/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 underline hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
      {/* End of main content div */}
    </ErrorBoundary>
  )
}

export default IndexPopup
