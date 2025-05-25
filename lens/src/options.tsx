import { githubLightTheme, JsonEditor } from "json-edit-react"
import { useEffect, useState } from "react"

import packageInfo from "../package.json"
import { Header } from "./components"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "./components/ui/accordion"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
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
import { getSettingLabel } from "./utils/labels"
import {
  addToBlacklist,
  addToWhitelist,
  getUserConfig,
  removeFromBlacklist,
  removeFromWhitelist,
  resetConfig,
  updateUserConfig
} from "./utils/userPreferences"
import type { UserConfig } from "./utils/userPreferences"

import "./main.css"

/**
 * Main component for the extension's options page
 * Provides advanced configuration options and data management capabilities
 */
function OptionsPage() {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)
  const [activeTab, setActiveTab] = useState<string>("collection")
  const [newBlacklistDomain, setNewBlacklistDomain] = useState("")
  const [newWhitelistDomain, setNewWhitelistDomain] = useState("")
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Define the boolean config keys to display in settings with color coding (matching popup.tsx)
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
   * Loads user configuration from storage
   * Sets the configuration state and handles any loading errors
   */
  const loadConfig = async () => {
    try {
      const userConfig = await getUserConfig()
      setConfig(userConfig)
    } catch (error) {
      console.error("Error loading config:", error)
      setMessage({ text: "Failed to load configuration", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Load user configuration
  useEffect(() => {
    loadConfig()
  }, [])

  // Read hash from URL on component mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    const validTabs = ["collection", "domains", "data", "privacy", "about"]

    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL hash when tab changes
  useEffect(() => {
    window.location.hash = activeTab

    // Update page title based on active tab
    const tabTitles = {
      collection: "Data Collection",
      domains: "Domain Management",
      data: "Data Viewer",
      privacy: "Privacy Settings",
      about: "About"
    }

    document.title = `Lens by Vael AI - ${tabTitles[activeTab as keyof typeof tabTitles] || "Settings"}`
  }, [activeTab])

  // Load collected data when data tab is selected
  useEffect(() => {
    if (activeTab === "data") {
      loadCollectedData()
    }
  }, [activeTab])

  /**
   * Loads collected data from storage
   * Retrieves and processes stored data for display in the UI
   */
  const loadCollectedData = async () => {
    try {
      setDataLoading(true)
      const data = await getAllCollectedData()
      setCollectedData(data)
    } catch (error) {
      console.error("Error loading collected data:", error)
      setMessage({ text: "Failed to load collected data", type: "error" })
      setCollectedData(null)
    } finally {
      setDataLoading(false)
    }
  }

  /**
   * Copies all collected data to the clipboard as JSON
   * Shows a success message temporarily upon completion
   */
  const handleCopyToClipboard = async () => {
    try {
      if (!collectedData) return
      await navigator.clipboard.writeText(
        JSON.stringify(collectedData, null, 2)
      )
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      setMessage({ text: "Failed to copy data to clipboard", type: "error" })
    }
  }

  /**
   * Exports collected data as a downloadable JSON file
   * Creates a file with a timestamp-based name and triggers browser download
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
      setMessage({ text: "Failed to export data", type: "error" })
    }
  }

  /**
   * Clears all collected data after user confirmation
   * Removes data from storage and updates the UI
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
        setMessage({ text: "All data has been cleared", type: "success" })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        console.error("Error clearing data:", error)
        setMessage({ text: "Failed to clear data", type: "error" })
      }
    }
  }

  /**
   * Toggles a boolean configuration setting
   * Updates both local state and persisted storage
   * @param key - The configuration setting to toggle
   */
  const toggleSetting = async (key: keyof UserConfig) => {
    if (!config) return

    try {
      const newValue = !config[key]
      const updatedConfig = await updateUserConfig({ [key]: newValue })
      setConfig(updatedConfig)

      // Show success message
      setMessage({ text: "Settings updated successfully", type: "success" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error(`Error toggling ${key}:`, error)
      setMessage({ text: "Failed to update settings", type: "error" })
    }
  }

  /**
   * Toggles the master collection switch for the entire extension.
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

      setMessage({
        text: `Data collection ${newValue ? "enabled" : "disabled"}`,
        type: "success"
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error toggling master collection:", error)
      setMessage({ text: "Failed to update master setting", type: "error" })
    }
  }

  /**
   * Resets all settings to their default values after user confirmation
   * Restores the original extension configuration
   */
  const handleReset = async () => {
    if (
      confirm(
        "Are you sure you want to reset all settings to default? This will clear all your customizations."
      )
    ) {
      try {
        const defaultConfig = await resetConfig()
        setConfig(defaultConfig)

        // Show success message
        setMessage({ text: "Settings reset to defaults", type: "success" })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        console.error("Error resetting config:", error)
        setMessage({ text: "Failed to reset settings", type: "error" })
      }
    }
  }

  /**
   * Adds a domain to the blacklist
   * Normalizes the domain format before adding
   */
  const handleAddToBlacklist = async () => {
    if (!newBlacklistDomain || !config) return

    try {
      const normalizedDomain = newBlacklistDomain
        .trim()
        .toLowerCase()
        .replace(/^www\./, "")

      const updatedBlacklist = await addToBlacklist(normalizedDomain)
      setConfig({
        ...config,
        blacklistedDomains: updatedBlacklist
      })
      setNewBlacklistDomain("")
      setMessage({ text: "Domain added to blacklist", type: "success" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error adding domain to blacklist:", error)
      setMessage({ text: "Failed to add domain to blacklist", type: "error" })
    }
  }

  /**
   * Removes a domain from the blacklist
   * @param domain - The domain to remove from the blacklist
   */
  const handleRemoveFromBlacklist = async (domain: string) => {
    if (!config) return

    try {
      const updatedBlacklist = await removeFromBlacklist(domain)
      setConfig({
        ...config,
        blacklistedDomains: updatedBlacklist
      })
      setMessage({ text: "Domain removed from blacklist", type: "success" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error removing domain from blacklist:", error)
      setMessage({
        text: "Failed to remove domain from blacklist",
        type: "error"
      })
    }
  }

  /**
   * Adds a domain to the whitelist
   * Normalizes the domain format before adding
   */
  const handleAddToWhitelist = async () => {
    if (!newWhitelistDomain || !config) return

    try {
      const normalizedDomain = newWhitelistDomain
        .trim()
        .toLowerCase()
        .replace(/^www\./, "")

      const updatedWhitelist = await addToWhitelist(normalizedDomain)
      setConfig({
        ...config,
        whitelistedDomains: updatedWhitelist
      })
      setNewWhitelistDomain("")
      setMessage({ text: "Domain added to whitelist", type: "success" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error adding domain to whitelist:", error)
      setMessage({ text: "Failed to add domain to whitelist", type: "error" })
    }
  }

  /**
   * Removes a domain from the whitelist
   * @param domain - The domain to remove from the whitelist
   */
  const handleRemoveFromWhitelist = async (domain: string) => {
    if (!config) return

    try {
      const updatedWhitelist = await removeFromWhitelist(domain)
      setConfig({
        ...config,
        whitelistedDomains: updatedWhitelist
      })
      setMessage({ text: "Domain removed from whitelist", type: "success" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error removing domain from whitelist:", error)
      setMessage({
        text: "Failed to remove domain from whitelist",
        type: "error"
      })
    }
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

  // Get the most recently visited websites (limited to 15 for options page)
  const getRecentWebsites = (): [string, WebsiteData][] => {
    if (!collectedData?.websites) return []

    return Object.entries(collectedData.websites)
      .sort((a, b) => b[1].lastVisit - a[1].lastVisit)
      .slice(0, 6)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-100 dark:from-slate-800 dark:via-purple-900/20 dark:to-indigo-900/30 flex items-center justify-center p-4">
        <div className="text-lg animate-pulse text-slate-600 dark:text-slate-300">
          Loading settings...
        </div>
      </div>
    )
  }

  const { websiteCount, dataSize, lastUpdated } = getDataStats()
  const recentWebsites = getRecentWebsites()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-100 dark:from-slate-800 dark:via-purple-900/20 dark:to-indigo-900/30 transition-all duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Header />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Advanced Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Configure how Lens by Vael AI collects and processes your browsing
              data to provide context for AI agents.
            </p>
          </div>
        </div>

        {/* Notification message */}
        {message && (
          <div
            className={`p-4 mb-6 rounded-lg border transition-all duration-300 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/30"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/30"
            }`}>
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                {message.type === "success" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
              {message.text}
            </div>
          </div>
        )}

        {/* Main content with tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6">
          <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
            <TabsList className="grid w-full h-auto grid-cols-5 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-none">
              <TabsTrigger
                value="collection"
                className="h-12 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                Data Collection
              </TabsTrigger>
              <TabsTrigger
                value="domains"
                className="h-12 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                Domain Management
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="h-12 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                Data Viewer
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="h-12 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                Privacy
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="h-12 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-purple-400 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                About
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Collection Settings Tab */}
          <TabsContent value="collection" className="space-y-6">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400"
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
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Data Collection Settings
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Control what types of data Lens collects from your browsing
                    activity
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {config &&
                  BOOLEAN_USER_CONFIG_KEYS.map((setting) => {
                    // Create color class mappings for each setting based on its color (matching popup.tsx)
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
                        className={`flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${!config.masterCollectionEnabled ? "opacity-50" : ""}`}>
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-8 ${colorClasses.indicator[setting.color]} rounded-full mr-4 opacity-70`}></div>
                          <div>
                            <label
                              htmlFor={setting.key}
                              className="text-base font-medium cursor-pointer text-slate-700 dark:text-slate-300">
                              {getSettingLabel(setting.key)}
                            </label>
                            <div
                              className={`text-sm ${colorClasses.text[setting.color]} font-medium`}>
                              {config.masterCollectionEnabled
                                ? config[setting.key as keyof UserConfig]
                                  ? "Active"
                                  : "Inactive"
                                : "Paused by master toggle"}
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
                          disabled={!config.masterCollectionEnabled}
                          className={`${colorClasses.switch[setting.color]} data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600 transition-colors duration-200 scale-110`}
                        />
                      </div>
                    )
                  })}
              </div>
            </div>
          </TabsContent>

          {/* Domain Management Tab */}
          <TabsContent value="domains" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Blacklist Management */}
              <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
                <div className="flex items-center p-4 border-b bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-100/50 dark:border-red-900/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 mr-3 text-red-500 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                    />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-300">
                      Blacklisted Domains
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Data will never be collected from these domains
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newBlacklistDomain}
                      onChange={(e) => setNewBlacklistDomain(e.target.value)}
                      placeholder="example.com"
                      className="flex-1 border-red-200 dark:border-red-800/30 focus:ring-red-500 dark:focus:ring-red-400"
                    />
                    <Button
                      onClick={handleAddToBlacklist}
                      disabled={!newBlacklistDomain}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white">
                      Add
                    </Button>
                  </div>

                  {config?.blacklistedDomains.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      No domains blacklisted
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                      {config?.blacklistedDomains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                            {domain}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromBlacklist(domain)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Whitelist Management */}
              <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
                <div className="flex items-center p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100/50 dark:border-green-900/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 mr-3 text-green-500 dark:text-green-400"
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
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-300">
                      Whitelisted Domains
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Data will always be collected from these domains
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newWhitelistDomain}
                      onChange={(e) => setNewWhitelistDomain(e.target.value)}
                      placeholder="example.com"
                      className="flex-1 border-green-200 dark:border-green-800/30 focus:ring-green-500 dark:focus:ring-green-400"
                    />
                    <Button
                      onClick={handleAddToWhitelist}
                      disabled={!newWhitelistDomain}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white">
                      Add
                    </Button>
                  </div>

                  {config?.whitelistedDomains.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      No domains whitelisted
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                      {config?.whitelistedDomains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                            {domain}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromWhitelist(domain)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400"
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
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
                    Data Management
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    View, export, and manage the data collected by Lens
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {websiteCount}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Websites
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {dataSize}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Size
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {lastUpdated.split(",")[0]}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Last Updated
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-2 text-purple-600 bg-white border border-purple-200 shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-purple-400 dark:border-purple-800/30">
                    {copySuccess ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleExportData}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 dark:from-purple-500 dark:to-indigo-500 dark:hover:from-purple-600 dark:hover:to-indigo-600 text-white">
                    {exportSuccess ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Exported!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Export Data
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClearData}
                    className="flex items-center gap-2 text-red-600 bg-white border border-red-200 shadow-sm hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800/30">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear All Data
                  </Button>
                </div>

                <Separator className="mb-6" />

                {dataLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-lg animate-pulse text-slate-600 dark:text-slate-300">
                      Loading data...
                    </div>
                  </div>
                ) : !collectedData ? (
                  <div className="py-16 text-center">
                    <svg
                      className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">
                      No Data Collected Yet
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Browse the web with Lens enabled to collect data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {recentWebsites.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">
                          Recent Websites
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {recentWebsites.map(([key, website], index) => (
                            <div
                              key={index}
                              className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-all duration-200">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {website.url}
                                </h5>
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                  {new Date(
                                    website.lastVisit
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-3">
                                {website.pageMetadata?.title || "Unknown"}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {website.pageMetadata && (
                                  <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs text-blue-700 dark:text-blue-400">
                                    Metadata
                                  </span>
                                )}
                                {website.domainSpecificData && (
                                  <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-xs text-green-700 dark:text-green-400">
                                    Domain Data
                                  </span>
                                )}
                                {website.tabActivityStats && (
                                  <span className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded text-xs text-yellow-700 dark:text-yellow-400">
                                    Tab Activity
                                  </span>
                                )}
                                {Object.keys(website.interactions || {})
                                  .length > 0 && (
                                  <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs text-purple-700 dark:text-purple-400">
                                    Interactions
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                          Raw JSON Data
                        </h4>
                        <Input
                          type="text"
                          placeholder="Search data..."
                          className="w-64"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <div
                          className="json-viewer-container"
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            maxHeight: "500px",
                            padding: "0",
                            width: "100%",
                            overflow: "auto"
                          }}>
                          <JsonEditor
                            data={collectedData}
                            collapse={false}
                            rootName="collected_data"
                            theme={githubLightTheme}
                            searchText={searchText}
                            searchFilter="all"
                            searchDebounceTime={100}
                            enableClipboard={false}
                            restrictAdd={true}
                            restrictDelete={true}
                            restrictEdit={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Privacy Settings
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Control how your data is used and stored
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700/50 rounded-lg">
                  <div>
                    <h4 className="text-base font-medium text-slate-700 dark:text-slate-300">
                      Extension Analytics
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Send anonymous usage data about the extension to help us
                      improve. This only includes how you use the extension, not
                      your browsing data.
                    </p>
                  </div>
                  <Switch
                    checked={config?.collectAnalytics ?? false}
                    onCheckedChange={() => toggleSetting("collectAnalytics")}
                    className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 scale-110"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="overflow-hidden transition-all duration-300 bg-white border rounded-lg shadow-md dark:bg-slate-800/60 hover:shadow-lg border-purple-100/50 dark:border-purple-900/30">
              <div className="flex items-center p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100/50 dark:border-purple-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400"
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
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    About Lens by Vael AI
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Learn more about the extension and how it works
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-3">
                    What is Lens by Vael AI?
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Lens by Vael AI is a browser extension that intelligently
                    collects and organizes information from your browsing
                    activity to provide personalized context to AI agents and
                    assistants.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    With Lens, you can give AI tools a better understanding of
                    your interests, research, and preferences without having to
                    manually share your information each time.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-3">
                    How It Works
                  </h4>
                  <div className="space-y-3">
                    <div className="flex">
                      <div className="flex items-center justify-center w-10 h-10 mr-4 text-white bg-blue-600 rounded-full shrink-0">
                        1
                      </div>
                      <div>
                        <h5 className="text-lg font-medium">Browse the Web</h5>
                        <p className="text-gray-600">
                          Vael runs in the background as you browse, collecting
                          data based on your privacy preferences.
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex items-center justify-center w-10 h-10 mr-4 text-white bg-blue-600 rounded-full shrink-0">
                        2
                      </div>
                      <div>
                        <h5 className="text-lg font-medium">
                          Organize Context
                        </h5>
                        <p className="text-gray-600">
                          The extension automatically organizes this information
                          into a personal context database.
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex items-center justify-center w-10 h-10 mr-4 text-white bg-blue-600 rounded-full shrink-0">
                        3
                      </div>
                      <div>
                        <h5 className="text-lg font-medium">
                          Enhance AI Interactions
                        </h5>
                        <p className="text-gray-600">
                          When you use compatible AI tools, Vael can provide
                          this context for more personalized responses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Data & Privacy
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    All data collected by Vael is stored locally on your device.
                    No browsing data is sent to our servers or shared with third
                    parties.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    You have complete control over what data is collected and
                    can view, export, or clear your data at any time from the
                    Data Viewer tab.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reset Button */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleReset}
            variant="outline"
            className="text-slate-600 border-slate-300 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800/50">
            Reset All Settings to Defaults
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 text-center text-sm border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          Lens by{" "}
          <a
            href="https://lens.vael.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
            Vael AI
          </a>{" "}
          v{packageInfo.version}
        </div>
      </div>
    </div>
  )
}

export default OptionsPage
