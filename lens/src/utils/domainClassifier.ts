/**
 * Domain classifier utility for categorizing websites
 * Analyzes page content and metadata to determine the site's purpose
 */

import { truncateField } from "../config/limits"

/**
 * Primary domain types that a website can be classified as
 */
export type DomainType =
  | "shopping"
  | "travel"
  | "productivity"
  | "news"
  | "miscellaneous"

/**
 * Domain classification result with confidence score and supporting data
 */
export interface DomainClassification {
  primaryType: DomainType
  confidence: number // 0-1 score
  secondaryType?: DomainType
  keywords?: string[]
  lastUpdated: number
}

// Pattern collections for domain type matching
const DOMAIN_PATTERNS = {
  shopping: [
    // Domains
    "amazon",
    "ebay",
    "etsy",
    "walmart",
    "target",
    "shop",
    "store",
    "buy",
    "product",
    "cart",
    "checkout",
    "commerce",
    "retail",
    "mall",
    "market",
    // URL patterns
    "/product",
    "/item",
    "/shop",
    "/cart",
    "/checkout",
    "/category",
    // Content patterns
    "add to cart",
    "add to bag",
    "buy now",
    "checkout",
    "shopping cart",
    "payment",
    "shipping",
    "price",
    "discount",
    "sale",
    "product",
    "shop",
    "order",
    "inventory",
    "in stock",
    "out of stock"
  ],
  travel: [
    // Domains
    "booking",
    "expedia",
    "airbnb",
    "tripadvisor",
    "hotel",
    "airline",
    "flight",
    "travel",
    "trip",
    "vacation",
    "resort",
    "cruise",
    "tour",
    "destination",
    // URL patterns
    "/hotel",
    "/flight",
    "/booking",
    "/reservation",
    "/destination",
    "/trip",
    // Content patterns
    "book now",
    "reservation",
    "accommodation",
    "check-in",
    "check-out",
    "departing",
    "arriving",
    "hotel",
    "flight",
    "car rental",
    "cruise",
    "vacation",
    "travel",
    "tourism",
    "destination",
    "itinerary"
  ],
  productivity: [
    // Domains
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
    "zoom",
    "meet",
    "calendar",
    "mail",
    "project",
    "task",
    "work",
    "collaborate",
    "workflow",
    // URL patterns
    "/dashboard",
    "/project",
    "/task",
    "/workspace",
    "/document",
    "/doc",
    // Content patterns
    "dashboard",
    "project",
    "task",
    "organize",
    "productivity",
    "workflow",
    "collaboration",
    "document",
    "spreadsheet",
    "slide",
    "presentation",
    "meeting",
    "calendar",
    "appointment",
    "workspace",
    "assignment"
  ],
  news: [
    // Domains
    "news",
    "cnn",
    "bbc",
    "nytimes",
    "washingtonpost",
    "reuters",
    "guardian",
    "medium",
    "blog",
    "article",
    "press",
    "report",
    "journal",
    "times",
    // URL patterns
    "/news",
    "/article",
    "/post",
    "/blog",
    "/story",
    "/opinion",
    "/editorial",
    // Content patterns
    "breaking news",
    "latest",
    "headline",
    "article",
    "story",
    "report",
    "journalist",
    "editor",
    "publication",
    "press",
    "media",
    "coverage"
  ]
}

/**
 * Identifies domain type keywords in the content
 * @param content - Text content to analyze
 * @param domainType - Domain type to check for
 * @returns Array of matched keywords
 */
function findDomainKeywords(content: string, domainType: DomainType): string[] {
  const pattern = DOMAIN_PATTERNS[domainType] || []
  const matches: string[] = []
  const lowerContent = content.toLowerCase()

  for (const keyword of pattern) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      matches.push(keyword)
      // Limit to prevent excessive matches
      if (matches.length >= 10) break
    }
  }

  return matches
}

/**
 * Gets all visible text content from the page
 * Focuses on meaningful content, skipping navigation, footers, etc.
 * @returns Concatenated visible text content
 */
function getPageTextContent(): string {
  // Skip elements that typically contain non-essential content
  const IGNORED_SELECTORS = [
    "nav",
    "footer",
    "header",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    // Common class names for navigation/footer/header
    ".navbar",
    ".footer",
    ".header",
    ".navigation",
    ".menu",
    // Common IDs for navigation/footer/header
    "#navbar",
    "#footer",
    "#header",
    "#navigation",
    "#menu"
  ]

  let visibleText = ""

  // Get all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // Skip empty text nodes
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT
        }

        // Skip if parent is in ignored selectors
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        // Skip if parent or any ancestor matches ignored selectors
        let current = parent
        while (current) {
          // Check if this element should be ignored
          if (
            IGNORED_SELECTORS.some((selector) => {
              if (selector.startsWith(".")) {
                return current.classList.contains(selector.substring(1))
              } else if (selector.startsWith("#")) {
                return current.id === selector.substring(1)
              } else if (selector.startsWith("[")) {
                const attr = selector.match(/\[([^=]+)(?:=([^\]]+))?\]/)
                if (attr) {
                  const [_, name, value] = attr
                  if (value) {
                    return (
                      current.getAttribute(name) === value.replace(/"/g, "")
                    )
                  } else {
                    return current.hasAttribute(name)
                  }
                }
                return false
              } else {
                return current.nodeName.toLowerCase() === selector.toLowerCase()
              }
            })
          ) {
            return NodeFilter.FILTER_REJECT
          }
          current = current.parentElement
        }

        // Check if element is visible
        const style = window.getComputedStyle(parent)
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          parent.offsetHeight === 0
        ) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      }
    } as NodeFilter
  )

  // Collect all visible text
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent) {
      visibleText += node.textContent.trim() + " "
    }
  }

  return visibleText
}

/**
 * Extracts meta tag content from the page
 * @param names - Array of meta tag names to extract
 * @returns Concatenated meta tag content
 */
function getMetaContent(names: string[]): string {
  let content = ""

  for (const name of names) {
    // Try various meta tag formats
    const metaElements = [
      ...document.querySelectorAll(`meta[name="${name}"]`),
      ...document.querySelectorAll(`meta[property="${name}"]`),
      ...document.querySelectorAll(`meta[property="og:${name}"]`),
      ...document.querySelectorAll(`meta[property="twitter:${name}"]`)
    ]

    for (const element of metaElements) {
      const metaContent = element.getAttribute("content")
      if (metaContent) {
        content += metaContent + " "
      }
    }
  }

  return content
}

/**
 * Classifies the current page based on content, URL, and metadata
 * @returns Domain classification with confidence score
 */
export function classifyCurrentPage(): DomainClassification {
  const url = window.location.href
  const hostname = window.location.hostname
  const pathname = window.location.pathname

  // Gather page content
  const pageTitle = document.title
  const metaContent = getMetaContent([
    "description",
    "keywords",
    "category",
    "og:type",
    "og:site_name"
  ])
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((h) => h.textContent)
    .filter(Boolean)
    .join(" ")

  // Get a sample of the page content (no need for the entire content)
  const pageContent = getPageTextContent().substring(0, 5000)

  // Combine all content for analysis
  const combinedContent =
    `${hostname} ${pathname} ${pageTitle} ${metaContent} ${headings} ${pageContent}`.toLowerCase()

  // Count matches for each domain type
  const counts: Record<DomainType, { count: number; keywords: string[] }> = {
    shopping: { count: 0, keywords: [] },
    travel: { count: 0, keywords: [] },
    productivity: { count: 0, keywords: [] },
    news: { count: 0, keywords: [] },
    miscellaneous: { count: 0, keywords: [] }
  }

  // Check for domain type keywords
  for (const type of Object.keys(counts) as DomainType[]) {
    if (type === "miscellaneous") continue
    const keywords = findDomainKeywords(combinedContent, type)
    counts[type].count = keywords.length
    counts[type].keywords = keywords
  }

  // Get primary domain type (highest match count)
  let primaryType: DomainType = "miscellaneous"
  let maxCount = 0
  let secondaryType: DomainType | undefined
  let secondMaxCount = 0

  for (const [type, data] of Object.entries(counts) as [
    DomainType,
    { count: number; keywords: string[] }
  ][]) {
    if (type === "miscellaneous") continue
    if (data.count > maxCount) {
      secondaryType = primaryType
      secondMaxCount = maxCount
      primaryType = type
      maxCount = data.count
    } else if (data.count > secondMaxCount) {
      secondaryType = type
      secondMaxCount = data.count
    }
  }

  // Calculate confidence based on match count
  const totalMatches = Object.values(counts).reduce(
    (sum, data) => sum + data.count,
    0
  )
  let confidence = totalMatches > 0 ? maxCount / totalMatches : 0

  // Adjust confidence if it's too close to call
  if (secondaryType && maxCount > 0 && secondMaxCount / maxCount > 0.8) {
    confidence = 0.6 // Lower confidence when there's a close second
  }

  // If confidence is too low, default to miscellaneous
  if (confidence < 0.4 && primaryType !== "miscellaneous") {
    secondaryType = primaryType
    primaryType = "miscellaneous"
    confidence = 0.5
  }

  // Truncate keywords to avoid excessive data
  const keywords = counts[
    primaryType === "miscellaneous" && secondaryType
      ? secondaryType
      : primaryType
  ].keywords
    .slice(0, 10)
    .map((kw) => truncateField(kw, "DOMAIN_KEYWORDS"))

  return {
    primaryType,
    confidence,
    secondaryType: secondaryType !== primaryType ? secondaryType : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    lastUpdated: Date.now()
  }
}
