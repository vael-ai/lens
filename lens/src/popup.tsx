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
import { getSettingLabel } from "@/utils/labels"
import React, { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

import packageInfo from "../package.json"
import ErrorBoundary from "./components/ErrorBoundary"
import type { CollectedData, WebsiteData } from "./types/data"
import {
  clearAllCollectedData,
  exportCollectedData,
  getAllCollectedData,
  sendAnalyticsEvent
} from "./utils/api"
import {
  DATA_SIZE_THRESHOLD_BYTES,
  DATA_SIZE_THRESHOLD_MB,
  ONBOARDING_COMPLETE_KEY,
  USER_EMAIL_KEY
} from "./utils/constants"
import { createAnalyticsEvent } from "./utils/dataCollection"
import {
  addToBlacklist,
  getUserConfig,
  removeFromBlacklist,
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
  const [dataSizeInBytes, setDataSizeInBytes] = useState<number>(0)
  const [websiteCount, setWebsiteCount] = useState<number>(0)
  const [dataSize, setDataSize] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isReportReady, setIsReportReady] = useState<boolean>(false)

  // Define the boolean config keys to display in settings
  const BOOLEAN_USER_CONFIG_KEYS = [
    "collectHistory",
    "collectPageMetadata",
    "collectInteractions",
    "collectTabActivity",
    "collectContent",
    "collectDeviceInfo",
    "collectAnalytics"
  ] as const

  // Load user configuration
  useEffect(() => {
    /**
     * Loads the user configuration from storage and determines the current active tab's information.
     * Sets up state for domain blacklist status and current URL/domain.
     */
    const loadConfig = async () => {
      try {
        const userConfig = await getUserConfig()
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
      } catch (error) {
        console.error("Error loading config:", error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  // Load collected data when data tab is selected
  useEffect(() => {
    if (activeTab === "data") {
      loadCollectedData()
    }
  }, [activeTab])

  /**
   * Loads all collected data from storage and updates the UI state.
   * Used when switching to the data management tab.
   */
  const loadCollectedData = async () => {
    try {
      setDataLoading(true)
      const data = await getAllCollectedData()
      setCollectedData(data)
      // Calculate and set data size in bytes
      const rawDataSizeInBytes = data ? JSON.stringify(data).length : 0
      setDataSizeInBytes(rawDataSizeInBytes)
      const websitesArray = Object.values(data.websites || {})
      const websiteCount = websitesArray.length
      let currentTotalSize = 0
      if (data.websites && typeof data.websites === "object") {
        Object.values(data.websites).forEach((siteData) => {
          if (siteData) {
            currentTotalSize += JSON.stringify(siteData).length
          }
        })
      }
      const calculatedDataSizeInBytes = currentTotalSize
      const dataSizeFormatted =
        (calculatedDataSizeInBytes / 1024).toFixed(2) + " KB"
      const lastUpdatedTimestamp = data.lastUpdated || Date.now()
      const lastUpdatedFormatted = new Date(
        lastUpdatedTimestamp
      ).toLocaleString()
      const reportIsReady =
        calculatedDataSizeInBytes >= DATA_SIZE_THRESHOLD_BYTES
      setWebsiteCount(websiteCount)
      setDataSize(dataSizeFormatted)
      setLastUpdated(lastUpdatedFormatted)
      setIsReportReady(reportIsReady)
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
    if (!onboardingEmailInput || !/\S+@\S+\.\S+/.test(onboardingEmailInput)) {
      alert("Please enter a valid email address.")
      return
    }

    // In dev mode, skip backend; otherwise send to API (no 200 check needed)
    if (!USE_LOCAL_API) {
      try {
        const encodedEmail = encodeURIComponent(onboardingEmailInput)
        await fetch(`${API_BASE_URL}/api/save-email/${encodedEmail}`, {
          method: "POST"
        })
        // ignoring response status
      } catch (apiError) {
        console.error("Error saving email to backend:", apiError)
      }
    }

    // Update UI to reflect onboarding completion immediately
    // This ensures the user proceeds even if subsequent storage operations fail.
    setUserEmail(onboardingEmailInput)
    setShowOnboarding(false)

    // Attempt to save email and onboarding status locally (and via cookie in dev)
    try {
      const storage = new Storage()
      await storage.set(USER_EMAIL_KEY, onboardingEmailInput)
      await storage.set(ONBOARDING_COMPLETE_KEY, true)
      // Also store in cookie for dev mode
      if (USE_LOCAL_API) {
        document.cookie = `userEmail=${onboardingEmailInput}; path=/;`
      }
    } catch (error) {
      console.error(
        "Error saving email/onboarding status to local storage:",
        error
      )
      // UI has already proceeded, so we just log this error.
      // No alert, to avoid confusing the user.
    }
  }

  // New function to handle report generation
  const handleGenerateReport = async () => {
    if (!userEmail) {
      alert("Email not found. Please complete onboarding.")
      return
    }
    if (dataSizeInBytes < DATA_SIZE_THRESHOLD_BYTES) {
      alert(
        `Please collect at least ${DATA_SIZE_THRESHOLD_MB}MB of data to generate a report.`
      )
      return
    }

    const reportId = crypto.randomUUID()

    // Ensure userEmail and collectedData are available (already in component state)
    if (!userEmail || !collectedData) {
      alert(
        "User email or data not available. Please ensure onboarding is complete and data is collected."
      )
      return
    }

    if (USE_LOCAL_API) {
      // Development mode: Simulate report generation
      console.log(
        `[DEV MODE] Simulating report generation for reportId: ${reportId}, email: ${userEmail}`
      )
      alert(
        `[DEV MODE] Simulating report generation. Opening report page for ID: ${reportId}`
      )
      try {
        chrome.tabs.create({
          url: `${REPORTS_BASE_URL}/reports/${reportId}` // REPORTS_BASE_URL will be http://localhost:3000 in dev mode
        })
      } catch (error) {
        console.error("[DEV MODE] Error opening simulated report page:", error)
        if (error instanceof Error) {
          alert(
            `[DEV MODE] An error occurred while opening the simulated report page: ${error.message}`
          )
        } else {
          alert(
            "[DEV MODE] An unknown error occurred while opening the simulated report page."
          )
        }
      }
    } else {
      // Production mode: Actual API call to submit data
      try {
        const response = await fetch(`${API_BASE_URL}/api/submit-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reportId: reportId,
            email: userEmail,
            userData: collectedData // Send the actual collected data object
          })
        })

        const result = await response.json()

        if (result.success) {
          chrome.tabs.create({
            url: `${REPORTS_BASE_URL}/reports/${reportId}`
          })
        } else {
          console.error("Failed to submit data:", result.error)
          alert(
            `Failed to submit data for report: ${result.error || "Unknown error"}`
          )
        }
      } catch (error) {
        console.error("Error generating report:", error)
        if (error instanceof Error) {
          alert(
            `An error occurred while generating the report: ${error.message}`
          )
        } else {
          alert("An unknown error occurred while generating the report.")
        }
      }
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
      <div className="p-4 w-[400px] h-[550px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900/50">
        <div className="w-full max-w-sm shadow-xl border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-800 p-6">
          <h2 className="text-center text-xl font-bold mb-4 text-purple-600 dark:text-purple-400">
            Welcome to Lens by Vael AI
          </h2>
          <p className="text-center text-sm mb-6 text-slate-600 dark:text-slate-400">
            Enter your email to enable personalized report generation and unlock
            full features.
          </p>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="you@example.com"
              value={onboardingEmailInput}
              onChange={(e) => setOnboardingEmailInput(e.target.value)}
              className="w-full p-3 border border-purple-300 dark:border-purple-600 rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-shadow dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Button
              onClick={handleOnboardingSubmit}
              className="w-full h-10 text-sm text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors">
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
      <div className="p-4 pb-2 w-[400px] h-[550px] flex flex-col bg-gradient-to-br from-slate-50 to-purple-100 dark:from-slate-800 dark:to-purple-900/20 border border-transparent rounded-lg text-sm text-slate-800 dark:text-slate-200">
        {/* Header */}
        <Header />
        {/* Master Toggle */}
        <MasterToggle
          enabled={config?.masterCollectionEnabled ?? false}
          onToggle={toggleMasterCollection}
        />
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 -mb-2">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-9">
            <TabsTrigger
              value="overview"
              className="text-xs h-7 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-700 dark:data-[state=active]:text-purple-400 dark:data-[state=active]:border-purple-400 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="text-xs h-7 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-700 dark:data-[state=active]:text-purple-400 dark:data-[state=active]:border-purple-400 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
              Data
            </TabsTrigger>
          </TabsList>
          {/* Overview Tab */}
          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3">
                <div className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Recently Visited
                </div>
              </div>
              <div className="p-3 pt-0 text-xs">
                {recentWebsites.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentWebsites.slice(0, 3).map((site, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-700/50 rounded-md shadow-sm">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:underline text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          title={site.name}>
                          {site.name.length > 30
                            ? `${site.name.substring(0, 27)}...`
                            : site.name}
                        </a>
                        <span className="ml-2 text-[10px] text-purple-500 dark:text-purple-400">
                          {site.dataCollected}
                        </span>
                      </div>
                    ))}
                    {recentWebsites.length > 3 && (
                      <p className="text-[11px] text-center pt-1 text-purple-500 dark:text-purple-400">
                        + {recentWebsites.length - 3} more sites (view in Data
                        tab or Advanced Viewer)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    No recent websites to show. Start browsing!
                  </p>
                )}
              </div>
            </div>
            {/* Settings merged into Overview */}
            <div className="bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3">
                <div className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Extension Settings
                </div>
              </div>
              <div className="p-3 pt-0 text-xs">
                {config &&
                  BOOLEAN_USER_CONFIG_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                      <label
                        htmlFor={key}
                        className="text-xs text-slate-700 dark:text-slate-300">
                        {getSettingLabel(key)}
                      </label>
                      <Switch
                        id={key}
                        checked={
                          config && (config[key as keyof UserConfig] as boolean)
                        }
                        onCheckedChange={() =>
                          toggleSetting(key as keyof UserConfig)
                        }
                        className={
                          "data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600"
                        }
                      />
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3">
                <div className="text-sm font-semibold">Manage Domains</div>
              </div>
              <div className="p-3 pt-0 text-xs">
                <div className="flex items-center space-x-2 mb-2">
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
                    className="w-full h-8 text-xs mb-2"
                    style={{ borderColor: "#938EEA", color: "#938EEA" }}>
                    {isCurrentDomainBlacklisted
                      ? `Unblock ${currentDomain}`
                      : `Block Current Site (${currentDomain})`}
                  </Button>
                )}
                <p className="text-[10px] mb-1" style={{ color: "#938EEA" }}>
                  Blocked sites ({config?.blacklistedDomains.length || 0}):
                </p>
                <div className="max-h-20 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
            className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3">
                <div className="text-sm font-semibold">
                  Data Summary & Actions
                </div>
              </div>
              <div className="p-3 pt-0 text-xs space-y-1.5">
                <p>
                  Websites tracked:{" "}
                  <span className="font-medium">{websiteCount}</span>
                </p>
                <p>
                  Total data size:{" "}
                  <span className="font-medium">{dataSize}</span>
                </p>
                <p>
                  Last activity:{" "}
                  <span className="font-medium">{lastUpdated}</span>
                </p>
                {isReportReady ? (
                  <p className="text-green-600 dark:text-green-400">
                    Report is ready to generate.
                  </p>
                ) : (
                  <p className="text-orange-600 dark:text-orange-400">
                    Collect at least {DATA_SIZE_THRESHOLD_MB}MB of data to
                    generate a report.
                  </p>
                )}
                <Button
                  onClick={handleGenerateReport}
                  className="mt-2 w-full h-8 text-xs"
                  disabled={dataLoading || !isReportReady}>
                  {dataLoading ? "Generating Report..." : "Generate Report"}
                </Button>
                <Button
                  onClick={handleExportData}
                  className="mt-1.5 w-full h-8 text-xs"
                  variant="outline">
                  Export Raw Data
                </Button>
                {exportSuccess && (
                  <p className="text-green-600 dark:text-green-400 mt-1 text-center">
                    Data exported successfully!
                  </p>
                )}
                <Button
                  onClick={handleClearData}
                  className="mt-1.5 w-full h-8 text-xs"
                  variant="destructive">
                  Delete All Data
                </Button>
              </div>
            </div>
            <Button
              onClick={() => openAdvancedSettingsWithTab("data")}
              className="w-full h-8 text-xs"
              variant="link">
              Open Advanced Data Viewer
            </Button>
          </TabsContent>
        </Tabs>
        {/* Footer */}
        {/*
          Display the extension version from package.json. This works because 'resolveJsonModule' is enabled in tsconfig.json and the bundler supports importing JSON. 
          Note: For browser extensions, you can also use chrome.runtime.getManifest().version for the actual installed version. 
        */}
        <div className="mt-auto pt-2 text-center text-[10px] border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          Lens by{" "}
          <a
            href="https://lens.vael.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline">
            Vael AI
          </a>{" "}
          v{packageInfo.version}
        </div>
      </div>
      {/* End of main content div */}
    </ErrorBoundary>
  )
}

export default IndexPopup
