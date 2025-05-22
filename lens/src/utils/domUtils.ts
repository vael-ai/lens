/**
 * DOM utilities for extension content scripts
 * Provides helper functions for working with DOM elements and selectors
 */

import { truncateField } from "../config/limits"

/**
 * Returns a simplified CSS selector for an element,
 * focusing on ID, meaningful classes, and element type
 * while keeping the result concise
 * @param element - The DOM element to get a selector for
 * @param maxLength - Maximum length of the selector
 * @returns A simplified CSS selector
 */
export function getSimplifiedSelector(element: Element): string {
  // If element has an ID, that's the simplest selector
  if (element.id) {
    return `${element.nodeName.toLowerCase()}#${element.id}`
  }

  // For standard inputs, include their type
  if (element.nodeName === "INPUT" && (element as HTMLInputElement).type) {
    const type = (element as HTMLInputElement).type
    // If it has a name, include that
    const name = (element as HTMLInputElement).name
    if (name) {
      return `input[type="${type}"][name="${name}"]`
    }
    return `input[type="${type}"]`
  }

  // For forms, include the action if available
  if (element.nodeName === "FORM" && (element as HTMLFormElement).action) {
    return `form[action="${
      new URL((element as HTMLFormElement).action).pathname
    }"]`
  }

  // For links, include the href pattern
  if (element.nodeName === "A" && (element as HTMLAnchorElement).href) {
    const href = (element as HTMLAnchorElement).href
    const url = new URL(href)
    return `a[href*="${url.pathname.split("/").pop() || ""}"]`
  }

  // For buttons with text content, include a snippet of text
  if (element.nodeName === "BUTTON" && element.textContent) {
    const text = element.textContent.trim()
    if (text) {
      const shortText = truncateField(text, "ELEMENT_CONTENT_HINT")
      return `button:contains("${shortText}")`
    }
  }

  // Get meaningful classes - skip layout/positioning classes
  const classes = Array.from(element.classList)
    .filter((cls) => {
      // Skip utility classes typically used for layout/styling only
      return !(
        /^(flex|grid|col|row|p[tblrxy]?-|m[tblrxy]?-|w-|h-|text-|font-|bg-|hidden|block|inline|absolute|relative|fixed|sticky|float-)/i.test(
          cls
        ) ||
        /^(d-|position-|justify-|align-|ms-|me-|mt-|mb-|mx-|my-|ps-|pe-|pt-|pb-|px-|py-)/i.test(
          cls
        )
      )
    })
    .slice(0, 2) // Only use up to 2 classes to avoid overly specific selectors

  if (classes.length > 0) {
    return `${element.nodeName.toLowerCase()}.${classes.join(".")}`
  }

  // Fallback to just the element type if no other identifiers
  return element.nodeName.toLowerCase()
}

/**
 * Creates a simplified path to an element, containing only the most
 * relevant parts of the hierarchy
 * @param element - The DOM element to create a path for
 * @param maxDepth - Maximum depth of the path (default 3)
 * @returns A simplified element path
 */
export function createElementPath(element: Element, maxDepth = 3): string {
  // Start with current element
  let currentElement: Element | null = element
  const pathParts: string[] = []

  // Build path by traversing up the DOM tree
  while (currentElement && pathParts.length < maxDepth) {
    // Add simplified representation of this element
    const selector = getSimplifiedSelector(currentElement)
    pathParts.unshift(selector)

    // If we have an ID, we can stop - that's unique
    if (selector.includes("#")) {
      break
    }

    // Move up to parent
    currentElement = currentElement.parentElement
  }

  // Join the path parts with >
  return truncateField(pathParts.join(" > "), "ELEMENT_PATH")
}

/**
 * Extracts a simplified type descriptor for an element
 * @param element - The DOM element to analyze
 * @returns A human-readable element type description
 */
export function getElementTypeDescription(element: Element): string {
  const nodeName = element.nodeName.toLowerCase()

  // Use role attribute if present
  const role = element.getAttribute("role")
  if (role) {
    return truncateField(role, "ELEMENT_TYPE_SIMPLE")
  }

  // Check for common elements
  switch (nodeName) {
    case "a":
      return "link"
    case "button":
      return "button"
    case "input":
      const type = (element as HTMLInputElement).type || "text"
      return `input-${type}`
    case "select":
      return "dropdown"
    case "textarea":
      return "textarea"
    case "img":
      return "image"
    case "video":
      return "video"
    case "audio":
      return "audio"
    case "form":
      return "form"
    case "table":
      return "table"
    case "ul":
    case "ol":
      return "list"
    case "li":
      return "list-item"
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading"
    case "p":
      return "paragraph"
    case "label":
      return "label"
    case "div":
      // Try to infer div purpose from classes
      const classList = Array.from(element.classList)
      if (classList.some((c) => /nav|menu|sidebar/i.test(c)))
        return "navigation"
      if (classList.some((c) => /btn|button/i.test(c))) return "button"
      if (classList.some((c) => /card|box|container|wrapper/i.test(c)))
        return "container"
      if (classList.some((c) => /modal|dialog|popup/i.test(c))) return "modal"
      return "container"
    default:
      return nodeName
  }
}

/**
 * Extracts a content hint from an element
 * @param element - The DOM element to extract content from
 * @returns A small content hint suitable for element identification
 */
export function getContentHint(element: Element): string | null {
  // First try text content
  const text = element.textContent?.trim()
  if (text && text.length > 0) {
    return truncateField(text, "ELEMENT_CONTENT_HINT")
  }

  // For images, use alt text or file name
  if (element.nodeName.toLowerCase() === "img") {
    const img = element as HTMLImageElement
    if (img.alt) return truncateField(img.alt, "ELEMENT_CONTENT_HINT")
    try {
      const fileName = new URL(img.src).pathname.split("/").pop()
      if (fileName) return truncateField(fileName, "ELEMENT_CONTENT_HINT")
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // For inputs, use placeholder or name
  if (element.nodeName.toLowerCase() === "input") {
    const input = element as HTMLInputElement
    if (input.placeholder)
      return truncateField(input.placeholder, "ELEMENT_CONTENT_HINT")
    if (input.name) return truncateField(input.name, "ELEMENT_CONTENT_HINT")
    if (input.value && input.type !== "password")
      return truncateField(input.value, "ELEMENT_CONTENT_HINT")
  }

  // For links, use href
  if (element.nodeName.toLowerCase() === "a") {
    const link = element as HTMLAnchorElement
    try {
      const path = new URL(link.href).pathname
      return truncateField(path, "ELEMENT_CONTENT_HINT")
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // For labels, use for attribute
  if (element.nodeName.toLowerCase() === "label") {
    const label = element as HTMLLabelElement
    if (label.htmlFor)
      return truncateField(label.htmlFor, "ELEMENT_CONTENT_HINT")
  }

  return null
}
