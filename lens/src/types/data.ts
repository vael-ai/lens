// Raw Data Schema for Vael AI Context Bank extension
// Defines the structure of collected data for external use

/** Collection Data Types **/

/**
 * Overarching structure for all collected user data
 */
export interface CollectedData {
  // User identifier (anonymous)
  userId: string

  // One-time collected info
  deviceInfo: DeviceInfo
  // Timestamp in milliseconds since Unix epoch when user was first seen
  firstSeen: number
  // Timestamp in milliseconds since Unix epoch when data was last updated
  lastUpdated: number

  // Stackable website data by domain and path
  websites: {
    [key: string]: WebsiteData // Key format: "domain/path" or "domain"
  }

  // Browser history and tab activity patterns
  browserPatterns?: {
    averageDailyTabs?: number // Average number of tabs opened per day
    commonTabGroups?: string[][] // Groups of tabs frequently opened together
    tabSwitchFrequency?: number // Average number of tab switches per minute
    averageSessionDuration?: number // Average browsing session duration in milliseconds
    commonDomains?: {
      domain: string
      visitCount: number
      // Timestamp in milliseconds since Unix epoch of last visit
      lastVisited: number
    }[]
  }
}

/**
 * Base structure for a website's collected data
 */
export interface WebsiteData {
  // Timestamp in milliseconds since Unix epoch of first visit
  firstVisit: number
  // Timestamp in milliseconds since Unix epoch of most recent visit
  lastVisit: number
  // Number of visits to this website
  visitCount: number
  // Total time spent on this website in milliseconds
  totalFocusTime: number
  // Representative URL
  url: string
  // Domain without path
  domain: string
  // Path part of the URL (if specific)
  path?: string
  // Pattern for grouping similar URLs (e.g., product pages)
  urlPattern?: string

  // Page metadata (latest version)
  pageMetadata?: PageMetadata

  // User interactions (stacked by type)
  interactions: {
    [type: string]: StackedInteraction
  }

  // Domain-specific data
  domainSpecificData?: DomainSpecificData

  // Inferred domain classification based on content analysis
  inferredDomainClassification?: {
    primaryType:
      | "shopping"
      | "travel"
      | "productivity"
      | "news"
      | "miscellaneous"
    confidence: number // 0-1 score indicating confidence level
    secondaryType?:
      | "shopping"
      | "travel"
      | "productivity"
      | "news"
      | "miscellaneous"
    keywords?: string[] // Key terms that influenced the classification
    lastUpdated: number // Timestamp when classification was last updated
  }

  // Tab activity stats
  tabActivityStats?: {
    // Average time in milliseconds that the tab is in focus per visit
    averageFocusTime: number
    // Total number of times the tab was activated
    totalActivations: number
    // Average number of times the tab is activated per visit
    averageActivationsPerVisit: number
  }
}

/**
 * Page metadata information
 */
export interface PageMetadata {
  // Page title from document.title
  title: string
  // Full URL of the page
  url: string
  // Domain of the page
  domain: string
  // Page description from meta tags
  description: string
  // Timestamp in milliseconds since Unix epoch when metadata was last updated
  lastUpdated: number
  // Document language
  language: string
  // URL to the page favicon
  favicon: string
  // Keywords from meta tags
  keywords?: string[]
  // Whether the page is served over HTTPS
  isSecure?: boolean
  // Type of page (article, product, etc.) derived from meta tags or heuristics
  pageType?: string
}

/**
 * Stacked interaction data - aggregated interactions of the same type
 */
export interface StackedInteraction {
  // Type of interaction
  type: "click" | "scroll" | "hover" | "input" | "selection"
  // Number of times this interaction occurred
  count: number
  // Timestamp in milliseconds since Unix epoch of the first occurrence
  firstOccurrence: number
  // Timestamp in milliseconds since Unix epoch of the last occurrence
  lastOccurrence: number

  // Instance tracking for deduplication
  instances?: {
    instanceId: string
    // Timestamp in milliseconds since Unix epoch
    timestamp: number
  }[]

  // Aggregated metrics
  positions?: { x: number; y: number }[] // Sample of positions for heatmap
  targetElements?: {
    // Simplified identifier for interacted elements
    elementPath: string // Simplified hierarchy path (e.g., "div#main > article > button.submit")
    elementType: string // Basic element type (e.g., "button", "input", "link")
    contentHint?: string // Short hint about the content (truncated)
    count: number
    // Timestamp in milliseconds since Unix epoch
    lastInteracted: number
  }[]

  // Type-specific aggregated data
  // For hover interactions, duration in milliseconds
  averageDuration?: number
  scrollPatterns?: {
    // For scroll interactions
    averageDepth: number // Average scroll depth as percentage (0-100)
    preferredDirection: "up" | "down"
    maxDepthReached: number // Maximum scroll depth as percentage (0-100)
    recentScrollPositions: number[] // Store recent scroll positions to track reading patterns
  }
  inputFields?: {
    // For input interactions
    fieldName: string
    interactionCount: number
    // Average time in milliseconds the field is in focus
    averageFocusTime?: number
  }[]
  selectionStats?: {
    // For selection interactions
    averageLength: number // Average length in characters
    count: number
  }
}

/**
 * Base user interaction data
 * Used primarily for incoming data before stacking
 */
export interface InteractionData {
  // Type of interaction
  type: "click" | "scroll" | "hover" | "input" | "selection"
  // Timestamp in milliseconds since Unix epoch
  timestamp: number
  // URL where the interaction occurred
  url: string
  // Track multiple similar instances
  count?: number
  // Unique identifier to help with deduplication
  instanceId?: string
  // Additional properties specific to the interaction
  details?: {
    [key: string]: any
  }
  // Click and hover specific properties - coordinates in pixels
  position?: {
    x: number
    y: number
  }
  // Elements involved in the interaction
  elements?: {
    tag: string
    classes: string[]
    id?: string
    type?: string
    role?: string
    text?: string
  }[]
  // Hover specific - duration in milliseconds
  duration?: number
  // Scroll specific
  scrollData?: {
    position: number // Current scroll position in pixels
    delta: number // Change in scroll position in pixels
    direction: "up" | "down"
    percentScrolled: number // Percentage of the page scrolled (0-100)
  }
  // Input specific
  inputType?: string // Type of input (text, checkbox, etc.)
  fieldName?: string // Name or ID of the input field
  hasValue?: boolean // Whether the field has a value
  // Selection specific
  selectionLength?: number // Length of selected text in characters
  hasSelection?: boolean // Whether there is a selection
}

/**
 * Domain-specific data for different types of websites
 */
export interface DomainSpecificData {
  // Domain this data belongs to
  domain: string
  // Type of site (ecommerce, travel, productivity, news, etc.)
  siteType: string
  // Ecommerce specific data
  ecommerce?: {
    viewedProducts?: {
      name: string
      price?: string
      currency?: string
      count: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
      category?: string
      brand?: string
    }[]
    categoryInterests?: {
      category: string
      viewCount: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
    }[]
    searchQueries?: {
      query: string
      count: number
      // Timestamp in milliseconds since Unix epoch
      lastSearched: number
    }[]
    priceRanges?: {
      min: number
      max: number
      currency: string
      count: number
    }[]
  }
  // Travel site specific data
  travel?: {
    destinations?: {
      name: string
      viewCount: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
      searchCount?: number
    }[]
    searchedDates?: {
      start: string // Date format YYYY-MM-DD
      end: string // Date format YYYY-MM-DD
      count: number
      // Timestamp in milliseconds since Unix epoch
      lastSearched: number
    }[]
    travelType?: string
    accommodationPreferences?: {
      type: string // hotel, hostel, apartment, etc.
      count: number
    }[]
    transportPreferences?: {
      type: string // flight, train, car, etc.
      count: number
    }[]
  }
  // Productivity application specific data
  productivity?: {
    appName?: string
    toolUsage?: {
      tool: string
      usageCount: number
      // Average duration in milliseconds
      averageDuration: number
      // Timestamp in milliseconds since Unix epoch
      lastUsed: number
    }[]
    fileTypes?: {
      extension: string
      count: number
      // Timestamp in milliseconds since Unix epoch
      lastAccessed: number
    }[]
    workspaces?: {
      name: string
      usageCount: number
      // Timestamp in milliseconds since Unix epoch
      lastAccessed: number
    }[]
  }
  // News site specific data
  news?: {
    categories?: {
      name: string
      viewCount: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
    }[]
    authors?: {
      name: string
      viewCount: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
    }[]
    topics?: {
      name: string
      viewCount: number
      // Timestamp in milliseconds since Unix epoch
      lastViewed: number
    }[]
  }
}

/**
 * Tab activity information
 */
export interface TabActivity {
  // Total time in milliseconds the tab has been in focus
  focusTime: number
  visibilityEvents: {
    // Timestamp in milliseconds since Unix epoch
    timestamp: number
    type: "visible" | "hidden"
  }[]
  // Number of times the tab has been activated
  activationCount: number
  historyUpdates?: {
    // Timestamp in milliseconds since Unix epoch
    timestamp: number
    action: "pushed" | "replaced" | "popped"
    url: string
  }[]
}

/**
 * Device and browser information
 */
export interface DeviceInfo {
  userAgent: string
  platform: string
  browser?: string
  browserVersion?: string
  os?: string
  screenSize: {
    width: number // In pixels
    height: number // In pixels
  }
  viewport: {
    width: number // In pixels
    height: number // In pixels
  }
  devicePixelRatio: number
  timeZone: string
  language: string
  languages: string[]
  connection: {
    type: string // wifi, cellular, etc.
    downlink: number // Mbps
    rtt: number // Round-trip time in milliseconds
    effectiveType: string // slow-2g, 2g, 3g, 4g
    saveData: boolean
  }
  approximateLocation?: {
    country?: string
    region?: string
    timezone?: string
  }
}

/**
 * URL grouping strategies for data stacking
 */
export enum UrlGroupingStrategy {
  EXACT = "exact", // Exact URL match
  PATH = "path", // Group by path
  PATH_PATTERN = "path_pattern", // Group by path pattern (e.g., product/*)
  DOMAIN = "domain", // Group by domain only
  SUBDOMAIN = "subdomain" // Group by subdomain
}

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  // Type of analytics event
  type:
    | "page_view"
    | "extension_enabled"
    | "extension_disabled"
    | "settings_changed"
    | "data_exported"
    | "tab_interaction"
  // Timestamp in milliseconds since Unix epoch
  timestamp: number
  // URL associated with the event, if applicable
  url?: string
  // Page title associated with the event, if applicable
  title?: string
  // Extension settings at the time of the event, if applicable
  settings?: Record<string, any>
  // Browser tab ID associated with the event, if applicable
  tabId?: number
  // Browser session ID associated with the event
  sessionId?: string
  // For grouped event tracking
  count?: number
  // User identifier (anonymous)
  userId?: string
}
