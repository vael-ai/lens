import { githubLightTheme, JsonEditor } from "json-edit-react"
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
  const [tabActivityEnabled, setTabActivityEnabled] = useState(true)

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
      <div className="flex items-center justify-center w-full min-h-screen p-4">
        <div className="text-lg animate-pulse">Loading settings...</div>
      </div>
    )
  }

  const { websiteCount, dataSize, lastUpdated } = getDataStats()
  const recentWebsites = getRecentWebsites()

  return (
    <div className="max-w-full p-3 mx-auto text-base md:p-6 md:max-w-7xl">
      <header className="mb-4 md:mb-8">
        <div className="flex flex-col mb-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex flex-col mb-2 text-2xl font-bold sm:flex-row sm:items-center md:text-4xl sm:mb-0">
            <span className="mr-2">Lens by Vael AI Context Bank</span>
            <Button
              variant="link"
              className="h-6 p-0 ml-0 text-sm underline sm:ml-3"
              onClick={() => window.open("https://lens.vael.ai", "_blank")}>
              What is this?
            </Button>
          </h1>
          <a
            href="https://github.com/vael-ai/lens"
            target="_blank"
            className="text-sm underline opacity-50 hover:opacity-100">
            v{packageInfo.version}
          </a>
        </div>
        <p className="text-base text-gray-500 md:text-xl">
          Configure how Vael collects and processes your browsing data to
          provide context for AI agents.
        </p>
      </header>

      {/* Notification message */}
      {message && (
        <div
          className={`p-3 md:p-4 mb-4 md:mb-6 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}>
          {message.text}
        </div>
      )}

      {/* Main container with sidebar */}
      <div className="flex flex-col gap-4 lg:flex-row md:gap-8">
        {/* Sidebar navigation */}
        <aside className="flex-shrink-0 order-2 w-full lg:w-72 lg:order-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure your Vael experience</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs
                orientation="vertical"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full">
                <TabsList className="flex h-auto gap-1 p-2 overflow-x-auto bg-transparent lg:flex-col">
                  <TabsTrigger
                    value="collection"
                    className="justify-start w-full h-10 px-4 py-2 text-left rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Data Collection
                  </TabsTrigger>
                  <TabsTrigger
                    value="domains"
                    className="justify-start w-full h-10 px-4 py-2 text-left rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Domain Management
                  </TabsTrigger>
                  <TabsTrigger
                    value="data"
                    className="justify-start w-full h-10 px-4 py-2 text-left rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Data Viewer
                  </TabsTrigger>
                  <TabsTrigger
                    value="privacy"
                    className="justify-start w-full h-10 px-4 py-2 text-left rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Privacy
                  </TabsTrigger>
                  <TabsTrigger
                    value="about"
                    className="justify-start w-full h-10 px-4 py-2 text-left rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    About
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Separator className="my-2" />

              <div className="p-4">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full">
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main content area */}
        <main className="flex-1 order-1 lg:order-2">
          {/* Collection Settings Tab */}
          {activeTab === "collection" && config && (
            <Card>
              <CardHeader className="pb-6 border-b">
                <CardTitle className="text-3xl">
                  Data Collection Settings
                </CardTitle>
                <CardDescription className="text-lg">
                  Control what types of data Lens by Vael AI collects from your
                  browsing activity
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-8 space-y-8">
                {/* Master Toggle */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-medium">
                        Master Data Collection
                      </div>
                      <p className="text-base text-gray-600">
                        Enables or disables all data collection. When off, no
                        data will be collected regardless of other settings.
                      </p>
                    </div>
                    <Switch
                      checked={config.masterCollectionEnabled}
                      onCheckedChange={() =>
                        toggleSetting("masterCollectionEnabled")
                      }
                      className={`ml-16 scale-125 ${
                        config.masterCollectionEnabled
                          ? "bg-green-600 data-[state=checked]:bg-green-600"
                          : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                      }`}
                    />
                  </div>
                </div>

                {/* Currently Collecting Types */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="mb-3 text-base font-medium">
                    Currently Collecting:
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {config.collectPageMetadata && (
                      <div className="px-2 py-1 text-xs text-blue-700 rounded-md bg-blue-50">
                        Page Metadata
                      </div>
                    )}
                    {config.collectInteractions && (
                      <div className="px-2 py-1 text-xs text-purple-700 rounded-md bg-purple-50">
                        User Interactions
                      </div>
                    )}
                    {config.collectDeviceInfo && (
                      <div className="px-2 py-1 text-xs text-yellow-700 rounded-md bg-yellow-50">
                        Device Info
                      </div>
                    )}
                    {config.collectContent && (
                      <div className="px-2 py-1 text-xs text-green-700 rounded-md bg-green-50">
                        Page Content
                      </div>
                    )}
                    {config.collectEcommerce && (
                      <div className="px-2 py-1 text-xs text-orange-700 rounded-md bg-orange-50">
                        E-commerce
                      </div>
                    )}
                    {config.collectTravel && (
                      <div className="px-2 py-1 text-xs text-indigo-700 rounded-md bg-indigo-50">
                        Travel
                      </div>
                    )}
                    {config.collectProductivity && (
                      <div className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700">
                        Productivity
                      </div>
                    )}
                    {config.collectAnalytics && (
                      <div className="px-2 py-1 text-xs rounded-md bg-cyan-50 text-cyan-700">
                        Extension Analytics
                      </div>
                    )}
                  </div>
                </div>

                <Accordion
                  type="single"
                  collapsible
                  defaultValue="general"
                  className="w-full">
                  <AccordionItem value="general">
                    <AccordionTrigger>General Collection</AccordionTrigger>
                    <AccordionContent className="px-1 pt-3 space-y-4">
                      {/* Page Metadata */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Page Metadata:
                          </label>
                          <p className="text-sm text-gray-500">
                            Collects basic page information like URL, title, and
                            meta tags. This provides essential context about the
                            websites you visit.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Page title, URL, meta description, canonical links,
                            Open Graph tags
                          </div>
                        </div>
                        <Switch
                          checked={config.collectPageMetadata}
                          onCheckedChange={() =>
                            toggleSetting("collectPageMetadata")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectPageMetadata
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* User Interactions */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            User Interactions:
                          </label>
                          <p className="text-sm text-gray-500">
                            Tracks how you interact with websites, including
                            clicks, scrolls, and time spent on pages. This helps
                            AI agents understand your browsing habits.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Click events, scroll depth, hover actions, form
                            interactions, time spent on page
                          </div>
                        </div>
                        <Switch
                          checked={config.collectInteractions}
                          onCheckedChange={() =>
                            toggleSetting("collectInteractions")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectInteractions
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* Device Info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Device Information:
                          </label>
                          <p className="text-sm text-gray-500">
                            Collects basic information about your device and
                            browser. This helps contextualize your browsing
                            experience.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Screen size, browser type/version, operating system,
                            language settings, general location (country/region
                            only)
                          </div>
                        </div>
                        <Switch
                          checked={config.collectDeviceInfo}
                          onCheckedChange={() =>
                            toggleSetting("collectDeviceInfo")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectDeviceInfo
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* Page Content */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Page Content:
                          </label>
                          <p className="text-sm text-gray-500">
                            Extracts visible text content from web pages. This
                            provides detailed context about what you're reading.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Main text content, headings, paragraphs, lists,
                            table data, article content
                          </div>
                        </div>
                        <Switch
                          checked={config.collectContent}
                          onCheckedChange={() =>
                            toggleSetting("collectContent")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectContent
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="domain-specific">
                    <AccordionTrigger>
                      Domain-Specific Collection
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pt-3 space-y-4">
                      {/* E-commerce */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            E-commerce Data:
                          </label>
                          <p className="text-sm text-gray-500">
                            Enhances collection on shopping sites to help AI
                            understand your shopping preferences and research.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Product names, categories, pricing information,
                            ratings/reviews, product specifications
                          </div>
                          <div className="mt-1 text-sm italic text-blue-500">
                            We never collect payment details, addresses, or
                            account information.
                          </div>
                        </div>
                        <Switch
                          checked={config.collectEcommerce}
                          onCheckedChange={() =>
                            toggleSetting("collectEcommerce")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectEcommerce
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* Travel */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Travel Data:
                          </label>
                          <p className="text-sm text-gray-500">
                            Enhances collection on travel and booking sites to
                            help AI understand your travel interests.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Destinations, travel dates, accommodation
                            preferences, points of interest, travel itineraries
                          </div>
                          <div className="mt-1 text-sm italic text-blue-500">
                            We never collect booking confirmations, payment
                            information, or personal identification details.
                          </div>
                        </div>
                        <Switch
                          checked={config.collectTravel}
                          onCheckedChange={() => toggleSetting("collectTravel")}
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectTravel
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* Productivity */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Productivity Data:
                          </label>
                          <p className="text-sm text-gray-500">
                            Enhances collection from productivity apps and tools
                            to help AI understand your work context.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Tool usage, application categories, document types,
                            productivity patterns, content categories
                          </div>
                          <div className="mt-1 text-sm italic text-blue-500">
                            We never collect actual document contents, messages,
                            or private workspace data.
                          </div>
                        </div>
                        <Switch
                          checked={config.collectProductivity}
                          onCheckedChange={() =>
                            toggleSetting("collectProductivity")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectProductivity
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="browser">
                    <AccordionTrigger>
                      Browser Activity & Analytics
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pt-3 space-y-4">
                      {/* Tab & Window Activity */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Tab & Window Activity:
                          </label>
                          <p className="text-sm text-gray-500">
                            Tracks your navigation patterns and session data
                            across browser tabs and windows.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Tab opening/closing patterns, tab switching
                            behavior, session durations, browsing sequences
                          </div>
                        </div>
                        <Switch
                          checked={tabActivityEnabled}
                          onCheckedChange={() =>
                            setTabActivityEnabled(!tabActivityEnabled)
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            tabActivityEnabled
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>

                      <Separator />

                      {/* Extension Analytics */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium">
                            Extension Analytics:
                          </label>
                          <p className="text-sm text-gray-500">
                            Collects anonymous data about how you use the
                            extension to help us improve it.
                          </p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Examples: </span>
                            Feature usage, settings changes, extension
                            interaction patterns
                          </div>
                          <div className="mt-1 text-sm italic text-blue-500">
                            This only tracks how you use the extension, not your
                            browsing data.
                          </div>
                        </div>
                        <Switch
                          checked={config.collectAnalytics}
                          onCheckedChange={() =>
                            toggleSetting("collectAnalytics")
                          }
                          disabled={!config.masterCollectionEnabled}
                          className={`ml-16 scale-125 ${
                            config.collectAnalytics
                              ? "bg-green-600 data-[state=checked]:bg-green-600"
                              : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                          }`}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Domain Management Tab */}
          {activeTab === "domains" && config && (
            <Card>
              <CardHeader className="pb-4 border-b md:pb-6">
                <CardTitle className="text-2xl md:text-3xl">
                  Domain Management
                </CardTitle>
                <CardDescription className="text-base md:text-lg">
                  Control which websites Lens by Vael AI can collect data from
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-6 space-y-6 md:px-6 md:py-8 md:space-y-8">
                {/* Blacklist Management */}
                <div>
                  <h3 className="mb-3 text-lg font-medium md:mb-4 md:text-xl">
                    Blacklisted Domains
                  </h3>
                  <p className="mb-4 text-sm text-gray-600 md:mb-5 md:text-base">
                    Data will never be collected from these domains. Add
                    websites that you want to exclude from data collection.
                  </p>

                  <div className="flex flex-col gap-2 mb-4 sm:flex-row md:mb-5 sm:gap-0">
                    <Input
                      type="text"
                      value={newBlacklistDomain}
                      onChange={(e) => setNewBlacklistDomain(e.target.value)}
                      placeholder="example.com"
                      className="h-10 text-sm md:h-12 md:text-base sm:rounded-r-none"
                    />
                    <Button
                      onClick={handleAddToBlacklist}
                      disabled={!newBlacklistDomain}
                      className="h-10 text-sm bg-blue-600 md:h-12 md:text-base sm:rounded-l-none hover:bg-blue-700">
                      Add to Blacklist
                    </Button>
                  </div>

                  {config.blacklistedDomains.length === 0 ? (
                    <div className="p-4 text-sm italic text-center text-gray-500 rounded-lg md:p-5 md:text-base bg-gray-50">
                      No domains have been blacklisted
                    </div>
                  ) : (
                    <div className="overflow-y-auto border rounded-lg max-h-60 md:max-h-72">
                      <ul className="divide-y divide-gray-100">
                        {config.blacklistedDomains.map((domain) => (
                          <li
                            key={domain}
                            className="flex items-center justify-between px-3 py-3 md:px-5 md:py-4">
                            <span className="pr-2 text-sm truncate md:text-base">
                              {domain}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromBlacklist(domain)}
                              className="text-red-600 shrink-0 hover:text-red-700 hover:bg-red-50">
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Whitelist Management */}
                <div>
                  <h3 className="mb-2 text-lg font-medium md:mb-3">
                    Whitelisted Domains
                  </h3>
                  <p className="mb-3 text-sm text-gray-600 md:mb-4">
                    Data will always be collected from these domains, even if
                    they would otherwise match blacklist patterns.
                  </p>

                  <div className="flex flex-col gap-2 mb-3 sm:flex-row md:mb-4 sm:gap-0">
                    <Input
                      type="text"
                      value={newWhitelistDomain}
                      onChange={(e) => setNewWhitelistDomain(e.target.value)}
                      placeholder="example.com"
                      className="h-10 text-sm md:h-12 md:text-base sm:rounded-r-none"
                    />
                    <Button
                      onClick={handleAddToWhitelist}
                      disabled={!newWhitelistDomain}
                      className="h-10 text-sm bg-green-600 md:h-12 md:text-base sm:rounded-l-none hover:bg-green-700">
                      Add to Whitelist
                    </Button>
                  </div>

                  {config.whitelistedDomains.length === 0 ? (
                    <div className="p-3 text-sm italic text-center text-gray-500 rounded-lg md:p-4 bg-gray-50">
                      No domains have been whitelisted
                    </div>
                  ) : (
                    <div className="overflow-y-auto border rounded-lg max-h-48 md:max-h-64">
                      <ul className="divide-y divide-gray-100">
                        {config.whitelistedDomains.map((domain) => (
                          <li
                            key={domain}
                            className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
                            <span className="pr-2 text-sm truncate">
                              {domain}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromWhitelist(domain)}
                              className="text-red-600 shrink-0 hover:text-red-700 hover:bg-red-50">
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Management Tab */}
          {activeTab === "data" && (
            <Card>
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-3xl">Data Management</CardTitle>
                <CardDescription className="text-lg">
                  View, export, and manage the data collected by Lens by Vael AI
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Data Overview</div>
                    <div className="flex flex-wrap gap-2 text-xs sm:gap-4 sm:text-sm">
                      <div>
                        <span className="text-gray-500">Pages: </span>
                        <span className="font-medium">{websiteCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Size: </span>
                        <span className="font-medium">{dataSize}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated: </span>
                        <span className="font-medium">{lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleCopyToClipboard}
                      className="flex items-center px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm"
                      variant="outline">
                      {copySuccess ? (
                        <>
                          <svg
                            className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
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
                            className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleExportData}
                      className="flex items-center px-2 py-1 text-xs text-white bg-green-600 sm:px-3 sm:py-2 sm:text-sm hover:bg-green-700">
                      {exportSuccess ? (
                        <>
                          <svg
                            className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
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
                            className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Export
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleClearData}
                      variant="destructive"
                      className="flex items-center px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm">
                      <svg
                        className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Clear
                    </Button>
                  </div>
                </div>

                <Separator className="mb-6" />

                {dataLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-lg animate-pulse">Loading data...</div>
                  </div>
                ) : !collectedData ? (
                  <div className="py-16 text-center">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-300 sm:w-16 sm:h-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium sm:text-xl">
                      No Data Collected Yet
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Browse the web with Lens by Vael AI Context Bank enabled
                      to collect data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {recentWebsites.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-medium">
                          Recent websites:
                        </h3>
                        {recentWebsites.length < 3 ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                            {recentWebsites.map(([key, website], index) => (
                              <Card key={index} className="overflow-hidden">
                                <CardHeader className="p-1.5 sm:p-2.5">
                                  <CardTitle className="flex justify-between text-xs font-medium">
                                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                                      {website.url}
                                    </span>
                                    <span className="text-gray-500 text-[9px] sm:text-[10px] ml-1 min-w-[70px] text-right">
                                      {new Date(
                                        website.lastVisit
                                      ).toLocaleString()}
                                    </span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-1.5 pt-0 sm:p-2.5 sm:pt-0">
                                  <div className="text-[10px] sm:text-xs text-gray-500">
                                    <div className="truncate">
                                      Page:{" "}
                                      {website.pageMetadata?.title || "Unknown"}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {website.pageMetadata && (
                                        <span className="bg-blue-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                          Metadata
                                        </span>
                                      )}
                                      {website.domainSpecificData && (
                                        <span className="bg-green-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                          Domain Data
                                        </span>
                                      )}
                                      {website.tabActivityStats && (
                                        <span className="bg-yellow-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                          Tab Activity
                                        </span>
                                      )}
                                      {Object.keys(website.interactions || {})
                                        .length > 0 && (
                                        <span className="bg-purple-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                          Interactions
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex items-center">
                              <button
                                onClick={() =>
                                  setCarouselIndex(
                                    Math.max(0, carouselIndex - 1)
                                  )
                                }
                                className="absolute left-0 z-10 flex items-center justify-center w-6 h-6 text-gray-500 bg-white rounded-full shadow-md sm:w-8 sm:h-8 hover:bg-gray-100">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                  />
                                </svg>
                              </button>

                              <div className="w-full px-8 overflow-hidden sm:px-10">
                                <div
                                  className="flex transition-transform duration-300 ease-in-out"
                                  style={{
                                    transform: `translateX(-${carouselIndex * 40}%)`
                                  }}>
                                  {recentWebsites.map(
                                    ([key, website], index) => (
                                      <div
                                        key={index}
                                        className="flex-shrink-0 w-2/5 px-1">
                                        <div className="w-full mx-auto">
                                          <Card className="overflow-hidden">
                                            <CardHeader className="p-1.5 sm:p-2">
                                              <CardTitle className="flex items-start justify-between text-xs font-medium">
                                                <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                                  {website.url}
                                                </span>
                                                <span className="text-gray-500 text-[9px] sm:text-[10px] ml-1 min-w-[60px] text-right">
                                                  {new Date(
                                                    website.lastVisit
                                                  ).toLocaleString()}
                                                </span>
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-1.5 pt-0 sm:p-2 sm:pt-0">
                                              <div className="text-[10px] sm:text-xs text-gray-500">
                                                <div className="truncate">
                                                  Page:{" "}
                                                  {website.pageMetadata
                                                    ?.title || "Unknown"}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {website.pageMetadata && (
                                                    <span className="bg-blue-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                                      Metadata
                                                    </span>
                                                  )}
                                                  {website.domainSpecificData && (
                                                    <span className="bg-green-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                                      Domain Data
                                                    </span>
                                                  )}
                                                  {website.tabActivityStats && (
                                                    <span className="bg-yellow-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                                      Tab Activity
                                                    </span>
                                                  )}
                                                  {Object.keys(
                                                    website.interactions || {}
                                                  ).length > 0 && (
                                                    <span className="bg-purple-100 px-1 py-0.5 rounded text-[8px] sm:text-[9px]">
                                                      Interactions
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  setCarouselIndex(
                                    Math.min(
                                      recentWebsites.length - 2,
                                      carouselIndex + 1
                                    )
                                  )
                                }
                                disabled={
                                  carouselIndex >= recentWebsites.length - 2
                                }
                                className="absolute right-0 z-10 flex items-center justify-center w-6 h-6 text-gray-500 bg-white rounded-full shadow-md sm:w-8 sm:h-8 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-col justify-between gap-2 mb-4 sm:flex-row sm:items-center">
                        <h3 className="text-lg font-medium">Raw JSON data:</h3>
                        <div className="relative w-full sm:w-64">
                          <Input
                            type="text"
                            placeholder="Search data..."
                            className="w-full pr-8 rounded-md"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                          />
                          <svg
                            className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 right-3 top-1/2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="w-full border rounded-lg">
                        <div
                          className="json-viewer-container"
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            maxHeight: "400px",
                            padding: "0",
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "auto",
                            overflowX: "hidden",
                            wordBreak: "break-word"
                          }}>
                          <div
                            className="w-full"
                            style={{
                              overflowX: "hidden",
                              maxWidth: "100%",
                              whiteSpace: "normal"
                            }}>
                            <JsonEditor
                              data={collectedData}
                              collapse={false}
                              rootName="raw_data"
                              theme={{
                                ...githubLightTheme,
                                base00: "#fafafa",
                                fontSize: "12px",
                                indentWidth: 2,
                                valueGap: 0
                              }}
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Privacy Settings Tab */}
          {activeTab === "privacy" && config && (
            <Card>
              <CardHeader className="pb-6 border-b">
                <CardTitle className="text-3xl">Privacy Settings</CardTitle>
                <CardDescription className="text-lg">
                  Control how your data is used and stored
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-base font-medium">
                      Extension Analytics
                    </div>
                    <p className="text-sm text-gray-500">
                      Send anonymous usage data about the extension to help us
                      improve. This only includes how you use the extension, not
                      your browsing data.
                    </p>
                  </div>
                  <Switch
                    checked={config.collectAnalytics}
                    onCheckedChange={() => toggleSetting("collectAnalytics")}
                    className={`ml-16 scale-125 ${
                      config.collectAnalytics
                        ? "bg-green-600 data-[state=checked]:bg-green-600"
                        : "bg-gray-200 data-[state=unchecked]:bg-red-200"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <Card>
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-3xl">
                  About Lens by Vael AI Context Bank
                </CardTitle>
                <CardDescription className="text-lg">
                  Learn more about the extension, how it works, and who created
                  it
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-medium">
                    What is Lens by Vael AI?
                  </h3>
                  <p className="text-gray-700">
                    Lens by Vael AI Context Bank is a browser extension that
                    intelligently collects and organizes information from your
                    browsing activity to provide personalized context to AI
                    agents and assistants.
                  </p>
                  <p className="text-gray-700">
                    With Vael, you can give AI tools a better understanding of
                    your interests, research, and preferences without having to
                    manually share your information each time.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-xl font-medium">How It Works</h3>
                  <div className="space-y-3">
                    <div className="flex">
                      <div className="flex items-center justify-center w-10 h-10 mr-4 text-white bg-blue-600 rounded-full shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-lg font-medium">Browse the Web</h4>
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
                        <h4 className="text-lg font-medium">
                          Organize Context
                        </h4>
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
                        <h4 className="text-lg font-medium">
                          Enhance AI Interactions
                        </h4>
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
                  <h3 className="text-xl font-medium">Data & Privacy</h3>
                  <p className="text-gray-700">
                    All data collected by Vael is stored locally on your device.
                    No browsing data is sent to our servers or shared with third
                    parties.
                  </p>
                  <p className="text-gray-700">
                    You have complete control over what data is collected and
                    can view, export, or clear your data at any time from the
                    Data Viewer tab.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-8 md:grid-cols-2">
                  <div className="p-5 border rounded-lg">
                    <h3 className="mb-3 text-lg font-medium">Resources</h3>
                    <ul className="space-y-2">
                      <li>
                        <a
                          href="https://docs.lens.vael.ai"
                          target="_blank"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Documentation
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://github.com/vael-ai/lens"
                          target="_blank"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                          GitHub Repository
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://lens.vael.ai/privacy"
                          target="_blank"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Privacy Policy
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 border rounded-lg">
                    <h3 className="mb-3 text-lg font-medium">
                      Contact & Support
                    </h3>
                    <ul className="space-y-2">
                      <li>
                        <a
                          href="mailto:support@lens.vael.ai"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          support@lens.vael.ai
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://twitter.com/vael_ai"
                          target="_blank"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                            />
                          </svg>
                          @vael_ai
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://discord.gg/vael"
                          target="_blank"
                          className="flex items-center text-blue-600 hover:underline">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                            />
                          </svg>
                          Discord Community
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 mt-6 text-center text-gray-500 border rounded-lg bg-gray-50">
                  <p>Lens by Vael AI Context Bank v{packageInfo.version}</p>
                  <p className="mt-1 text-sm">
                    &copy; {new Date().getFullYear()} Lens by Vael AI, Inc. All
                    rights reserved.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default OptionsPage
