import { useEffect, useState } from "react"

import packageInfo from "../package.json"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "./components/ui/accordion"
import { Button } from "./components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./components/ui/card"
import { Separator } from "./components/ui/separator"
import { Switch } from "./components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import type { CollectedData, WebsiteData } from "./types/data"
import {
  clearAllCollectedData,
  exportCollectedData,
  getAllCollectedData,
  sendAnalyticsEvent
} from "./utils/api"
import { createAnalyticsEvent } from "./utils/dataCollection"
import {
  addToBlacklist,
  getUserConfig,
  removeFromBlacklist,
  updateUserConfig
} from "./utils/userPreferences"
import type { UserConfig } from "./utils/userPreferences"

import "./main.css"

/**
 * Main popup component for the browser extension.
 * Handles user interface for data collection settings, current site information,
 * and collected data management.
 */
function IndexPopup() {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [currentDomain, setCurrentDomain] = useState<string>("")
  const [isCurrentDomainBlacklisted, setIsCurrentDomainBlacklisted] =
    useState(false)
  const [activeTab, setActiveTab] = useState("collection")
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

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

  // Count websites and calculate data size
  const getDataStats = () => {
    if (!collectedData) {
      return {
        websiteCount: 0,
        dataSize: "0 KB",
        lastUpdated: "Never"
      }
    }

    const websiteCount = Object.keys(collectedData.websites).length
    const dataSize = `~${Math.round(JSON.stringify(collectedData).length / 1024)} KB`
    const lastUpdated = new Date(collectedData.lastUpdated).toLocaleString()

    return { websiteCount, dataSize, lastUpdated }
  }

  /**
   * Returns the most recently visited websites from collected data.
   * Limited to 5 sites for UI purposes.
   * @returns Array of tuples containing website URL and associated data, sorted by last visit time
   */
  const getRecentWebsites = (): [string, WebsiteData][] => {
    if (!collectedData?.websites) return []

    return Object.entries(collectedData.websites)
      .sort((a, b) => b[1].lastVisit - a[1].lastVisit)
      .slice(0, 5)
  }

  if (loading) {
    return (
      <div className="p-4 w-[400px] h-[550px] flex items-center justify-center">
        <div className="text-lg animate-pulse">Loading...</div>
      </div>
    )
  }

  const { websiteCount, dataSize, lastUpdated } = getDataStats()
  const recentWebsites = getRecentWebsites()

  return (
    <div className="p-4 pb-8 w-[400px] h-[550px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h1 className="flex items-center text-xl font-bold">
          Vael AI Context Bank
          <Button
            variant="link"
            className="h-6 p-0 ml-2 text-xs underline"
            onClick={openAboutPage}>
            What is this?
          </Button>
        </h1>
        <a
          href="https://github.com/vael-ai/lens"
          target="_blank"
          className="text-xs underline opacity-50 hover:opacity-100">
          v{packageInfo.version}
        </a>
      </div>

      {/* Current URL display - SIMPLIFIED TO SINGLE LINE */}
      {currentUrl && (
        <div className="px-1 mb-3 text-sm font-medium">
          Currently collecting data on:{" "}
          <span className="font-normal underline">{currentDomain}</span>
        </div>
      )}

      {/* Big Stop/Start Button - UPDATED TO MATCH IMAGE */}
      <div className="flex flex-col items-center mb-3">
        <button
          onClick={toggleMasterCollection}
          className={`w-full py-3 rounded-md text-white font-medium text-center ${
            config?.masterCollectionEnabled
              ? "bg-[#ee4b44] hover:bg-[#d43f38]"
              : "bg-[#4bb85f] hover:bg-[#42a755]"
          }`}>
          {config?.masterCollectionEnabled
            ? "Stop Data Collection"
            : "Start Data Collection"}
        </button>
        <p className="mt-2 text-xs text-center text-gray-600">
          Quickly toggle data collection for all sites
        </p>
      </div>

      <Separator className="mb-3" />

      {/* Tabs for different sections */}
      <Tabs
        defaultValue="collection"
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="collection">Collection Settings</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        {/* Collection Settings Tab */}
        <TabsContent value="collection" className="flex flex-col flex-1 mt-2">
          <div className="mb-2">
            <h3 className="text-sm font-medium">Currently Collecting:</h3>
          </div>

          <div className="pb-3 mb-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-1">
              {config?.collectPageMetadata && (
                <div className="px-2 py-1 text-xs text-blue-700 rounded-md bg-blue-50">
                  Page Metadata
                </div>
              )}
              {config?.collectInteractions && (
                <div className="px-2 py-1 text-xs text-purple-700 rounded-md bg-purple-50">
                  User Interactions
                </div>
              )}
              {config?.collectDeviceInfo && (
                <div className="px-2 py-1 text-xs text-yellow-700 rounded-md bg-yellow-50">
                  Device Info
                </div>
              )}
              {config?.collectContent && (
                <div className="px-2 py-1 text-xs text-green-700 rounded-md bg-green-50">
                  Page Content
                </div>
              )}
              {config?.collectEcommerce && (
                <div className="px-2 py-1 text-xs text-orange-700 rounded-md bg-orange-50">
                  E-commerce
                </div>
              )}
              {config?.collectTravel && (
                <div className="px-2 py-1 text-xs text-indigo-700 rounded-md bg-indigo-50">
                  Travel
                </div>
              )}
              {config?.collectProductivity && (
                <div className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700">
                  Productivity
                </div>
              )}
              {config?.collectAnalytics && (
                <div className="px-2 py-1 text-xs rounded-md bg-cyan-50 text-cyan-700">
                  Extension Analytics
                </div>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-8 mb-3 text-xs"
            onClick={() => openAdvancedSettingsWithTab("collection")}>
            <svg
              className="w-3.5 h-3.5 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Advanced Collection Settings
          </Button>

          <Accordion
            type="single"
            collapsible
            className="w-full overflow-auto max-h-[280px]"
            defaultValue="general">
            <AccordionItem value="general">
              <AccordionTrigger className="py-2 text-sm font-medium">
                General Collection:
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Page Metadata:
                      </label>
                      <p className="text-xs text-gray-500">
                        URLs, titles, meta tags
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectPageMetadata}
                      onCheckedChange={() =>
                        toggleSetting("collectPageMetadata")
                      }
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectPageMetadata
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        User Interactions:
                      </label>
                      <p className="text-xs text-gray-500">
                        Clicks, scrolls, time spent
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectInteractions}
                      onCheckedChange={() =>
                        toggleSetting("collectInteractions")
                      }
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectInteractions
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Device Information:
                      </label>
                      <p className="text-xs text-gray-500">
                        Screen size, browser, platform
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectDeviceInfo}
                      onCheckedChange={() => toggleSetting("collectDeviceInfo")}
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectDeviceInfo
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Page Content:
                      </label>
                      <p className="text-xs text-gray-500">
                        Text from pages you visit
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectContent}
                      onCheckedChange={() => toggleSetting("collectContent")}
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectContent
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="domain-specific">
              <AccordionTrigger className="py-2 text-sm font-medium">
                Domain-Specific Data:
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        E-commerce Data:
                      </label>
                      <p className="text-xs text-gray-500">
                        Products, categories, pricing
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectEcommerce}
                      onCheckedChange={() => toggleSetting("collectEcommerce")}
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectEcommerce
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Travel Data:
                      </label>
                      <p className="text-xs text-gray-500">
                        Locations, dates, preferences
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectTravel}
                      onCheckedChange={() => toggleSetting("collectTravel")}
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectTravel
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Productivity Data:
                      </label>
                      <p className="text-xs text-gray-500">
                        Apps, tools, work context
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectProductivity}
                      onCheckedChange={() =>
                        toggleSetting("collectProductivity")
                      }
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectProductivity
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="browser">
              <AccordionTrigger className="py-2 text-sm font-medium">
                Browser Activity:
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Tab & Window Activity:
                      </label>
                      <p className="text-xs text-gray-500">
                        Navigation patterns, session data
                      </p>
                    </div>
                    <Switch
                      checked={true}
                      disabled={!config?.masterCollectionEnabled}
                      className="bg-green-600 data-[state=checked]:bg-green-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">
                        Extension Analytics:
                      </label>
                      <p className="text-xs text-gray-500">
                        Anonymous extension usage data
                      </p>
                    </div>
                    <Switch
                      checked={config?.collectAnalytics}
                      onCheckedChange={() => toggleSetting("collectAnalytics")}
                      disabled={!config?.masterCollectionEnabled}
                      className={
                        config?.collectAnalytics
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Data Management Tab - IMPROVED LAYOUT, NO MAIN SCROLLBAR */}
        <TabsContent value="data" className="flex flex-col flex-1">
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button
              size="sm"
              variant="default"
              onClick={handleExportData}
              className="w-full text-sm bg-green-600 h-9 hover:bg-green-700">
              {exportSuccess ? "Exported!" : "Export all data to JSON"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClearData}
              className="w-full text-sm h-9">
              Clear All Data
            </Button>
          </div>

          <div className="pb-2 mt-2 border-b">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium">
                Total websites visited:
              </span>
              <span className="text-sm font-bold">{websiteCount}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-medium">Data size:</span>
              <span className="text-sm font-bold">{dataSize}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-medium">Last updated:</span>
              <span className="text-sm">{lastUpdated}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openAdvancedSettingsWithTab("data")}
            className="w-full mt-3 text-xs">
            <svg
              className="w-3.5 h-3.5 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open Advanced Data Viewer
          </Button>

          <div className="flex-1 mt-3 overflow-auto">
            {dataLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm animate-pulse">Loading data...</div>
              </div>
            ) : !collectedData || recentWebsites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto">
                    <path d="M12 21h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7z" />
                    <path d="M12 21V5" />
                    <path d="M10 12H8" />
                    <path d="M16 12h-2" />
                    <path d="M10 16H8" />
                    <path d="M16 16h-2" />
                    <path d="M10 8H8" />
                    <path d="M16 8h-2" />
                  </svg>
                </div>
                <h4 className="mb-1 text-sm font-medium">
                  No Data Collected Yet
                </h4>
                <p className="text-xs text-gray-500">
                  Browse with data collection enabled to gather context for AI.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWebsites.map(([key, website], index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="p-3">
                      <CardTitle className="flex justify-between text-xs font-medium">
                        <span className="truncate max-w-[200px]">
                          {website.url}
                        </span>
                        <span className="text-gray-500">
                          {new Date(website.lastVisit).toLocaleString()}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xs text-gray-500">
                        <div>
                          Page: {website.pageMetadata?.title || "Unknown"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {website.pageMetadata && (
                            <span className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                              Metadata
                            </span>
                          )}
                          {website.domainSpecificData && (
                            <span className="bg-green-100 px-1.5 py-0.5 rounded text-[10px]">
                              Domain Data
                            </span>
                          )}
                          {website.tabActivityStats && (
                            <span className="bg-yellow-100 px-1.5 py-0.5 rounded text-[10px]">
                              Tab Activity
                            </span>
                          )}
                          {Object.keys(website.interactions || {}).length >
                            0 && (
                            <span className="bg-purple-100 px-1.5 py-0.5 rounded text-[10px]">
                              Interactions
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {websiteCount > 5 && (
                  <div className="pt-1 text-xs text-center text-gray-500">
                    +{websiteCount - 5} more websites...
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IndexPopup
