/**
 * Utility for collecting domain-specific data from different types of websites
 */

import type { DomainSpecificData } from "../../types/data"

/**
 * Configuration for domain-specific data collection
 */
export interface DomainCollectionConfig {
  collectEcommerce: boolean
  collectTravel: boolean
  collectProductivity: boolean
}

/**
 * Collects domain-specific data based on the current site type
 * @param config Configuration specifying which types of domain data to collect
 * @returns Object containing domain-specific data
 */
export const collectDomainSpecificData = async (
  config: DomainCollectionConfig
): Promise<DomainSpecificData | null> => {
  const hostname = window.location.hostname
  const path = window.location.pathname
  const url = window.location.href

  // Initialize domain-specific data
  const domainSpecificData: DomainSpecificData = {
    domain: hostname,
    siteType: determineSiteType(hostname, url)
  }

  // Check if we should collect data for this site type
  const siteType = domainSpecificData.siteType

  if (siteType === "e-commerce" && config.collectEcommerce) {
    // Collect e-commerce specific data
    const ecommerceData = await collectEcommerceData()
    if (ecommerceData) {
      domainSpecificData.ecommerce = ecommerceData
    }
  } else if (siteType === "travel" && config.collectTravel) {
    // Collect travel specific data
    const travelData = await collectTravelData()
    if (travelData) {
      domainSpecificData.travel = travelData
    }
  } else if (siteType === "productivity" && config.collectProductivity) {
    // Collect productivity app specific data
    const productivityData = await collectProductivityData()
    if (productivityData) {
      domainSpecificData.productivity = productivityData
    }
  } else if (siteType === "news") {
    // Always collect basic news data
    const newsData = await collectNewsData()
    if (newsData) {
      domainSpecificData.news = newsData
    }
  }

  // If we didn't collect any specific data, return null
  if (Object.keys(domainSpecificData).length <= 2) {
    return null
  }

  return domainSpecificData
}

/**
 * Determines the type of website based on hostname and URL patterns
 * @param hostname Website hostname
 * @param url Full URL of the page
 * @returns String representing the website type
 */
const determineSiteType = (hostname: string, url: string): string => {
  // Common e-commerce domains and patterns
  const ecommercePatterns = [
    "amazon",
    "ebay",
    "etsy",
    "shopify",
    "shop",
    "store",
    "product",
    "buy",
    "walmart",
    "target"
  ]

  // Common travel domains and patterns
  const travelPatterns = [
    "booking",
    "expedia",
    "hotel",
    "flight",
    "airline",
    "travel",
    "trip",
    "airbnb",
    "tripadvisor"
  ]

  // Common productivity domains
  const productivityPatterns = [
    "docs.google",
    "office",
    "notion",
    "trello",
    "asana",
    "atlassian",
    "jira",
    "confluence",
    "slack",
    "teams",
    "zoom"
  ]

  // Common news domains
  const newsPatterns = [
    "news",
    "cnn",
    "bbc",
    "nytimes",
    "washingtonpost",
    "reuters",
    "guardian",
    "medium",
    "blog"
  ]

  // Check hostname against each pattern
  const lowerHostname = hostname.toLowerCase()

  for (const pattern of ecommercePatterns) {
    if (lowerHostname.includes(pattern)) return "e-commerce"
  }

  for (const pattern of travelPatterns) {
    if (lowerHostname.includes(pattern)) return "travel"
  }

  for (const pattern of productivityPatterns) {
    if (lowerHostname.includes(pattern)) return "productivity"
  }

  for (const pattern of newsPatterns) {
    if (lowerHostname.includes(pattern)) return "news"
  }

  // Check URL for indicators in the path
  const lowerUrl = url.toLowerCase()

  if (
    lowerUrl.includes("/product") ||
    lowerUrl.includes("/item") ||
    lowerUrl.includes("/shop")
  ) {
    return "e-commerce"
  }

  if (
    lowerUrl.includes("/flight") ||
    lowerUrl.includes("/hotel") ||
    lowerUrl.includes("/booking")
  ) {
    return "travel"
  }

  if (lowerUrl.includes("/news") || lowerUrl.includes("/article")) {
    return "news"
  }

  // Check page content for indicators
  if (document.querySelector(".product, #product, [data-product-id]")) {
    return "e-commerce"
  }

  if (document.querySelector(".article, article, [itemprop='article']")) {
    return "news"
  }

  // Default to generic if we can't determine
  return "generic"
}

/**
 * Collects e-commerce specific data from product pages
 * Extracts product information including price, availability, and features
 * Uses structured data (JSON-LD), meta tags, and DOM elements as data sources
 * @returns Object containing detailed e-commerce product data if available
 */
const collectEcommerceData = async (): Promise<
  DomainSpecificData["ecommerce"]
> => {
  // Initialize data with correct structure
  const ecommerceData: DomainSpecificData["ecommerce"] = {
    viewedProducts: []
  }

  try {
    // Create a single product object to collect data for current page
    const productData: {
      name: string
      price?: string
      currency?: string
      count: number
      lastViewed: number
      category?: string
      brand?: string
    } = {
      name: "",
      count: 1,
      lastViewed: Date.now()
    }

    // First try to extract from structured data (JSON-LD)
    const jsonLdElements = document.querySelectorAll(
      'script[type="application/ld+json"]'
    )
    for (const element of Array.from(jsonLdElements)) {
      try {
        const data = JSON.parse(element.textContent || "{}")

        // Check for product schema
        if (data["@type"] === "Product") {
          productData.name = data.name || productData.name

          // Get price info
          if (data.offers) {
            if (Array.isArray(data.offers)) {
              if (data.offers.length > 0) {
                productData.price =
                  data.offers[0].price?.toString() || productData.price
                productData.currency =
                  data.offers[0].priceCurrency || productData.currency
                // Note: availability is not stored in our data model, so we'll ignore it
              }
            } else {
              productData.price =
                data.offers.price?.toString() || productData.price
              productData.currency =
                data.offers.priceCurrency || productData.currency
              // Note: availability is not stored in our data model, so we'll ignore it
            }
          }

          // Get other product details
          productData.brand =
            data.brand?.name || data.brand || productData.brand
          productData.category = data.category || productData.category
        }
      } catch (e) {
        console.error("Error parsing JSON-LD:", e)
      }
    }

    // Fallback to meta tags and DOM elements if structured data is incomplete
    if (!productData.name) {
      // Common selectors for product titles
      const titleSelectors = [
        "h1.product-title",
        "h1.product-name",
        "h1.productName",
        ".product-title",
        ".product-name",
        "[data-testid='product-title']",
        "[itemprop='name']"
      ]

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector)
        if (element && element.textContent) {
          productData.name = element.textContent.trim()
          break
        }
      }

      // If still no name found, try the page title
      if (!productData.name) {
        productData.name = document.title
      }
    }

    // Get price if not found in structured data
    if (!productData.price) {
      const priceSelectors = [
        ".price",
        ".product-price",
        ".offer-price",
        "[data-testid='price']",
        "[itemprop='price']",
        "[data-price]"
      ]

      for (const selector of priceSelectors) {
        const element = document.querySelector(selector)
        if (element && element.textContent) {
          // Clean up the price text
          const priceText = element.textContent.trim()

          // Try to extract numeric price
          const match = priceText.match(/[\d,.]+/)
          if (match) {
            productData.price = match[0]

            // Try to extract currency
            if (!productData.currency) {
              const currencyMatch = priceText.match(/[$€£¥₹]/)
              if (currencyMatch) {
                const currencyMap: Record<string, string> = {
                  $: "USD",
                  "€": "EUR",
                  "£": "GBP",
                  "¥": "JPY",
                  "₹": "INR"
                }
                productData.currency =
                  currencyMap[currencyMatch[0]] || currencyMatch[0]
              }
            }

            break
          }
        }
      }
    }

    // Only add the product if we have at least a name
    if (productData.name) {
      ecommerceData.viewedProducts?.push(productData)
    }

    // Return the collected data
    return ecommerceData
  } catch (error) {
    console.error("Error collecting ecommerce data:", error)
    return ecommerceData
  }
}

/**
 * Collects travel-specific data from booking and travel sites
 * Extracts information about destinations, dates, and travel options
 * Uses structured data, meta tags, and common travel site DOM patterns
 * @returns Object containing travel booking and itinerary data if available
 */
const collectTravelData = async (): Promise<DomainSpecificData["travel"]> => {
  // Initialize data with correct structure
  const travelData: DomainSpecificData["travel"] = {
    destinations: [],
    searchedDates: []
  }

  try {
    let destination = ""
    // Extract destination from page title or headings
    const pageTitle = document.title
    const h1 = document.querySelector("h1")
    const h1Text = h1 ? h1.textContent?.trim() : ""

    // Try to extract destination from title
    if (
      /hotel|stay|resort|flight to|trip to/i.test(pageTitle) ||
      /hotel|stay|resort|flight to|trip to/i.test(h1Text || "")
    ) {
      const titleMatch = (pageTitle || h1Text || "").match(
        /(?:in|to|at)\s+([A-Za-z\s,]+)(?:from|\||\/|-|$)/i
      )
      if (titleMatch && titleMatch[1]) {
        destination = titleMatch[1].trim()
      }
    }

    // Look for destination in meta data
    if (!destination) {
      const destMeta = document.querySelector(
        'meta[name="destination"], meta[property="travel:destination"]'
      )
      if (destMeta) {
        destination = destMeta.getAttribute("content") || ""
      }
    }

    // Add destination to the destinations array if found
    if (destination) {
      travelData.destinations?.push({
        name: destination,
        viewCount: 1,
        lastViewed: Date.now()
      })
    }

    // Look for dates in the DOM
    const dateInputs = document.querySelectorAll(
      'input[type="date"], [placeholder*="date"], [aria-label*="date"]'
    )
    if (dateInputs.length > 0) {
      const dateValues: string[] = []
      dateInputs.forEach((input) => {
        const value = (input as HTMLInputElement).value
        if (value) dateValues.push(value)
      })

      if (dateValues.length >= 2) {
        // Assuming first date is start, second is end
        travelData.searchedDates?.push({
          start: dateValues[0],
          end: dateValues[1],
          count: 1,
          lastSearched: Date.now()
        })
      }
    }

    // Determine travel type from URL and content
    const url = window.location.href.toLowerCase()
    if (/flight|airline|plane|airport/i.test(url)) {
      travelData.travelType = "flight"
    } else if (/hotel|resort|stay|lodging|accommodation/i.test(url)) {
      travelData.travelType = "hotel"
    } else if (/car\s*rental|rental\s*car/i.test(url)) {
      travelData.travelType = "car rental"
    } else if (/cruise|ship/i.test(url)) {
      travelData.travelType = "cruise"
    }

    return travelData
  } catch (error) {
    console.error("Error collecting travel data:", error)
    return travelData
  }
}

/**
 * Collects productivity app-specific data from work and collaboration tools
 * Extracts information about document types, collaboration features, and app context
 * Preserves privacy by avoiding collection of actual document content
 * @returns Object containing productivity tool context data if available
 */
const collectProductivityData = async (): Promise<
  DomainSpecificData["productivity"]
> => {
  // Initialize data with correct structure
  const productivityData: DomainSpecificData["productivity"] = {
    toolUsage: [],
    fileTypes: [],
    workspaces: []
  }

  try {
    const url = window.location.href.toLowerCase()
    const domain = window.location.hostname.toLowerCase()
    let appName = ""
    let toolContext = ""
    let documentTitle = ""

    // Determine app name
    if (domain.includes("docs.google.com")) {
      appName = "Google Docs"

      // Get document title
      const docTitle = document.querySelector(".docs-title-input")
      if (docTitle) {
        documentTitle = docTitle.textContent?.trim() || ""
      }

      // Determine context based on URL
      if (url.includes("document")) {
        toolContext = "document editing"
      } else if (url.includes("spreadsheets")) {
        toolContext = "spreadsheet editing"
      } else if (url.includes("presentation")) {
        toolContext = "presentation editing"
      }
    } else if (domain.includes("notion.so")) {
      appName = "Notion"
      toolContext = "note taking"

      // Get page title
      const notionTitle = document.querySelector(".notion-page-block")
      if (notionTitle) {
        documentTitle = notionTitle.textContent?.trim() || ""
      }
    } else if (domain.includes("trello.com")) {
      appName = "Trello"
      toolContext = "task management"

      // Get board name
      const boardTitle = document.querySelector(".board-header-btn-text")
      if (boardTitle) {
        documentTitle = boardTitle.textContent?.trim() || ""
      }
    } else if (domain.includes("github.com")) {
      appName = "GitHub"

      // Determine context based on URL
      if (url.includes("/issues/")) {
        toolContext = "issue tracking"
      } else if (url.includes("/pull/")) {
        toolContext = "code review"
      } else {
        toolContext = "code management"
      }

      // Get repo name
      const repoName = document.querySelector("strong[itemprop='name'] a")
      if (repoName) {
        documentTitle = repoName.textContent?.trim() || ""
      }
    }

    // Store the app name
    productivityData.appName = appName

    // Add tool usage entry if we have context
    if (toolContext) {
      productivityData.toolUsage?.push({
        tool: toolContext,
        usageCount: 1,
        averageDuration: 0, // Will be updated later
        lastUsed: Date.now()
      })
    }

    // Add workspace if we have a document title
    if (documentTitle) {
      productivityData.workspaces?.push({
        name: documentTitle,
        usageCount: 1,
        lastAccessed: Date.now()
      })
    }

    return productivityData
  } catch (error) {
    console.error("Error collecting productivity data:", error)
    return productivityData
  }
}

/**
 * Collects news article-specific data from news and media sites
 * Extracts information about article topics, publication date, and source
 * Focuses on metadata rather than article content for privacy preservation
 * @returns Object containing news article metadata if available
 */
const collectNewsData = async (): Promise<DomainSpecificData["news"]> => {
  // Initialize data with correct structure
  const newsData: DomainSpecificData["news"] = {
    categories: [],
    authors: [],
    topics: []
  }

  try {
    // Get headline from article heading
    const headlineElement = document.querySelector("h1")
    let headline = ""
    if (headlineElement) {
      headline = headlineElement.textContent?.trim() || ""
    }

    // Get author info
    const authorElements = document.querySelectorAll(
      "[rel='author'], [class*='author'], [itemprop='author']"
    )
    if (authorElements.length > 0) {
      const authorName = authorElements[0].textContent?.trim() || ""
      if (authorName) {
        newsData.authors?.push({
          name: authorName,
          viewCount: 1,
          lastViewed: Date.now()
        })
      }
    }

    // Get publish date - we don't store this directly in our model but could be useful for grouping
    let publishDate = ""
    const timeElements = document.querySelectorAll(
      "time, [itemprop='datePublished'], [class*='publish-date']"
    )
    if (timeElements.length > 0) {
      const timeEl = timeElements[0]
      const dateStr = timeEl.getAttribute("datetime") || timeEl.textContent
      if (dateStr) {
        publishDate = dateStr.trim()
      }
    }

    // Get category
    const categoryElements = document.querySelectorAll(
      "[itemprop='articleSection'], [class*='category']"
    )
    if (categoryElements.length > 0) {
      const categoryName = categoryElements[0].textContent?.trim() || ""
      if (categoryName) {
        newsData.categories?.push({
          name: categoryName,
          viewCount: 1,
          lastViewed: Date.now()
        })
      }
    }

    // Add headline as a topic if available
    if (headline) {
      newsData.topics?.push({
        name: headline,
        viewCount: 1,
        lastViewed: Date.now()
      })
    }

    return newsData
  } catch (error) {
    console.error("Error collecting news data:", error)
    return newsData
  }
}
