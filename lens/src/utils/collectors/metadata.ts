/**
 * Utility for collecting page metadata from web pages
 * Extracts information about the current page for context analysis
 */

import type { PageMetadata } from "../../types/data"

/**
 * Collects comprehensive page metadata from the current page
 * Extracts title, description, language, favicon, and other relevant information
 * Handles various fallback strategies when primary metadata elements aren't available
 * @returns Complete PageMetadata object with page information
 */
export const collectPageMetadata = async (): Promise<PageMetadata> => {
  try {
    const url = window.location.href
    const domain = window.location.hostname
    const title = document.title || "Untitled Page"

    // Extract page description
    let description = ""
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription && metaDescription.getAttribute("content")) {
      description = metaDescription.getAttribute("content") || ""
    } else {
      // Fallback to Open Graph description
      const ogDescription = document.querySelector(
        'meta[property="og:description"]'
      )
      if (ogDescription && ogDescription.getAttribute("content")) {
        description = ogDescription.getAttribute("content") || ""
      }
    }

    // Get page language
    let language = document.documentElement.lang
    if (!language) {
      const langMeta = document.querySelector(
        'meta[http-equiv="content-language"]'
      )
      language = langMeta ? langMeta.getAttribute("content") || "en" : "en"
    }

    // Extract favicon
    let favicon = ""
    const faviconLink =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]')
    if (faviconLink && faviconLink.getAttribute("href")) {
      const faviconHref = faviconLink.getAttribute("href") || ""
      // Convert relative URLs to absolute
      if (faviconHref.startsWith("/")) {
        favicon = `${window.location.origin}${faviconHref}`
      } else if (faviconHref.startsWith("http")) {
        favicon = faviconHref
      } else {
        favicon = `${window.location.origin}/${faviconHref}`
      }
    } else {
      // Default favicon path
      favicon = `${window.location.origin}/favicon.ico`
    }

    // Extract keywords
    let keywords: string[] = []
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords && metaKeywords.getAttribute("content")) {
      const keywordsStr = metaKeywords.getAttribute("content") || ""
      keywords = keywordsStr
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    }

    // Determine if page is secure
    const isSecure = window.location.protocol === "https:"

    // Try to determine page type
    let pageType = "unknown"

    // Check page URL for clues
    if (url.includes("product") || url.includes("item")) {
      pageType = "product"
    } else if (url.includes("category") || url.includes("collection")) {
      pageType = "category"
    } else if (
      url.includes("blog") ||
      url.includes("article") ||
      url.includes("post")
    ) {
      pageType = "article"
    } else if (url.includes("about")) {
      pageType = "about"
    } else if (url.includes("contact")) {
      pageType = "contact"
    } else if (
      domain.includes("checkout") ||
      url.includes("checkout") ||
      url.includes("cart")
    ) {
      pageType = "checkout"
    } else if (
      domain.includes("login") ||
      url.includes("login") ||
      url.includes("signin")
    ) {
      pageType = "login"
    } else if (
      url === domain ||
      url.endsWith(domain + "/") ||
      url.endsWith("index.html")
    ) {
      pageType = "homepage"
    }

    // Try to get last updated time
    let lastUpdated = Date.now()
    const timeElements = document.querySelectorAll("time")
    if (timeElements.length > 0) {
      for (const timeEl of Array.from(timeElements)) {
        const datetime = timeEl.getAttribute("datetime")
        if (datetime) {
          try {
            const timestamp = new Date(datetime).getTime()
            if (timestamp > 0) {
              lastUpdated = timestamp
              break
            }
          } catch (e) {
            // Continue checking other time elements
          }
        }
      }
    } else {
      // Try meta tags for date
      const modifiedMeta =
        document.querySelector('meta[property="article:modified_time"]') ||
        document.querySelector('meta[name="last-modified"]')
      if (modifiedMeta && modifiedMeta.getAttribute("content")) {
        try {
          const dateStr = modifiedMeta.getAttribute("content") || ""
          const timestamp = new Date(dateStr).getTime()
          if (timestamp > 0) {
            lastUpdated = timestamp
          }
        } catch (e) {
          // Use current time as fallback
        }
      }
    }

    // Create metadata object according to the schema
    const metadata: PageMetadata = {
      title,
      url,
      domain,
      description,
      lastUpdated,
      language,
      favicon,
      keywords,
      isSecure,
      pageType
    }

    return metadata
  } catch (error) {
    console.error("Error collecting page metadata:", error)

    // Return basic metadata if there's an error
    return {
      title: document.title || "Unknown Title",
      url: window.location.href,
      domain: window.location.hostname,
      description: "",
      lastUpdated: Date.now(),
      language: "en",
      favicon: ""
    }
  }
}

/**
 * Attempts to determine the type of page based on content and structure
 * Uses URL patterns, pathname, and DOM structure to classify the page
 * @returns String representing the detected page type (product, article, etc.)
 */
const determinePageType = (): string => {
  const url = window.location.href.toLowerCase()
  const path = window.location.pathname.toLowerCase()

  // Check URL patterns first
  if (url.includes("product") || url.includes("item")) return "product"
  if (url.includes("article") || url.includes("blog") || url.includes("post"))
    return "article"
  if (url.includes("category") || url.includes("collection")) return "category"
  if (url.includes("search")) return "search"
  if (path === "/" || path === "" || path === "/index.html") return "homepage"
  if (url.includes("checkout") || url.includes("cart")) return "checkout"
  if (url.includes("account") || url.includes("profile")) return "account"
  if (url.includes("contact")) return "contact"
  if (url.includes("about")) return "about"

  // Check page content and structure if URL didn't give us enough information
  if (document.querySelector("article")) return "article"
  if (document.querySelector(".product, #product, [data-product]"))
    return "product"
  if (document.querySelector("form")) return "form"

  // Default if we can't determine
  return "unknown"
}
