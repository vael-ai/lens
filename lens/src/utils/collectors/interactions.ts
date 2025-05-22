/**
 * Utility for collecting user interactions on web pages
 * Provides privacy-conscious tracking of clicks, scrolls, hovers, inputs, and text selections
 */

import type { InteractionData } from "../../types/data"
import {
  createElementPath,
  getContentHint,
  getElementTypeDescription
} from "../domUtils"
import { debounce, throttle } from "../helpers"

/**
 * Configure interaction collection parameters
 * Controls sampling rates and thresholds to balance data quality with privacy and performance
 */
const CONFIG = {
  scrollThreshold: 100, // Pixels of scroll to trigger an event
  clickSampleRate: 0.5, // Only track 50% of clicks to reduce volume
  hoverMinTime: 1000, // Minimum hover time to track (ms)
  scrollDebounceTime: 500, // Debounce time for scroll events (ms)
  maxInteractionsPerType: 50, // Maximum interactions to track per type
  maxElements: 5 // Maximum number of elements to track per interaction
}

/**
 * Sets up event listeners to track user interactions
 * Implements privacy-preserving collection of user behavior data
 * Uses debouncing and throttling to minimize performance impact
 * @param callback - Function to call when an interaction is detected
 * @returns Cleanup function to remove all event listeners
 */
export const collectUserInteractions = (
  callback: (interaction: InteractionData) => void
): (() => void) => {
  const trackedInteractions = {
    clicks: 0,
    scrolls: 0,
    hovers: 0,
    inputs: 0,
    selects: 0
  }

  /**
   * Handles click events by tracking and reporting interactions
   * @param event Mouse event to process
   */
  const handleClick = (event: MouseEvent) => {
    if (
      trackedInteractions.clicks >= CONFIG.maxInteractionsPerType ||
      Math.random() > CONFIG.clickSampleRate
    ) {
      return
    }

    trackedInteractions.clicks++
    const eventPath = getEventPath(event).slice(0, CONFIG.maxElements)

    // Use our new DOM utilities for simplified element information
    const elements = eventPath.map(getElementInfo)

    // Process the main target element with our new utilities
    const targetElement = event.target as Element
    const elementPath = createElementPath(targetElement)
    const elementType = getElementTypeDescription(targetElement)
    const contentHint = getContentHint(targetElement)

    callback({
      type: "click",
      timestamp: Date.now(),
      url: window.location.href,
      position: {
        x: event.clientX,
        y: event.clientY
      },
      elements,
      details: {
        // Add enhanced element information
        elementPath,
        elementType,
        contentHint
      }
    })
  }

  /**
   * Handles scroll events (debounced) by tracking and reporting interactions
   */
  let lastScrollPosition = window.scrollY
  const handleScroll = debounce(() => {
    if (trackedInteractions.scrolls >= CONFIG.maxInteractionsPerType) {
      return
    }

    const currentPosition = window.scrollY
    const scrollDelta = currentPosition - lastScrollPosition

    // Only track significant scrolls
    if (Math.abs(scrollDelta) < CONFIG.scrollThreshold) {
      return
    }

    trackedInteractions.scrolls++
    lastScrollPosition = currentPosition

    callback({
      type: "scroll",
      timestamp: Date.now(),
      url: window.location.href,
      scrollData: {
        position: currentPosition,
        delta: scrollDelta,
        direction: scrollDelta > 0 ? "down" : "up",
        // Calculate approximate percentage scrolled
        percentScrolled: Math.round(
          (currentPosition /
            (document.documentElement.scrollHeight - window.innerHeight)) *
            100
        )
      }
    })
  }, CONFIG.scrollDebounceTime)

  /**
   * Handles meaningful hover events by tracking and reporting interactions
   * @param event Mouse event to process
   */
  const hoverTimeouts: Map<Element, number> = new Map()
  const handleMouseover = (event: MouseEvent) => {
    if (trackedInteractions.hovers >= CONFIG.maxInteractionsPerType) {
      return
    }

    const target = event.target as Element
    if (!target || !isInteractiveElement(target)) {
      return
    }

    // Clear any existing timeout for this element
    if (hoverTimeouts.has(target)) {
      window.clearTimeout(hoverTimeouts.get(target))
    }

    // Set a timeout to record the hover if it lasts long enough
    const timeoutId = window.setTimeout(() => {
      trackedInteractions.hovers++
      const elements = [target]
        .concat(getElementParents(target).slice(0, CONFIG.maxElements - 1))
        .map(getElementInfo)

      // Use our new DOM utilities for enhanced element information
      const elementPath = createElementPath(target)
      const elementType = getElementTypeDescription(target)
      const contentHint = getContentHint(target)

      callback({
        type: "hover",
        timestamp: Date.now(),
        url: window.location.href,
        position: {
          x: event.clientX,
          y: event.clientY
        },
        elements,
        duration: CONFIG.hoverMinTime,
        details: {
          // Add enhanced element information
          elementPath,
          elementType,
          contentHint
        }
      })

      hoverTimeouts.delete(target)
    }, CONFIG.hoverMinTime)

    hoverTimeouts.set(target, timeoutId)
  }

  /**
   * Handles mouseout events by clearing hover timeouts
   * @param event Mouse event to process
   */
  const handleMouseout = (event: MouseEvent) => {
    const target = event.target as Element
    if (hoverTimeouts.has(target)) {
      window.clearTimeout(hoverTimeouts.get(target))
      hoverTimeouts.delete(target)
    }
  }

  /**
   * Handles input interactions by tracking and reporting form input events
   * @param event Input event to process
   */
  const handleInput = throttle((event: Event) => {
    if (trackedInteractions.inputs >= CONFIG.maxInteractionsPerType) {
      return
    }

    const target = event.target as HTMLInputElement
    if (!target || !isFormElement(target)) {
      return
    }

    trackedInteractions.inputs++
    const elementInfo = getElementInfo(target)

    // Use our new DOM utilities for enhanced element information
    const elementPath = createElementPath(target)
    const elementType = getElementTypeDescription(target)
    const contentHint = getContentHint(target) || target.name || target.id

    // Don't record actual input values for privacy, just the fact that input occurred
    callback({
      type: "input",
      timestamp: Date.now(),
      url: window.location.href,
      inputType: target.type || "text",
      fieldName: target.name || undefined,
      hasValue: !!target.value, // Just indicate if there's a value, not the value itself
      elements: [elementInfo],
      details: {
        // Add enhanced element information
        elementPath,
        elementType,
        contentHint
      }
    })
  }, 1000) // Throttle to avoid excessive tracking

  /**
   * Handles text selection events by tracking and reporting selection interactions
   */
  const handleSelection = () => {
    if (trackedInteractions.selects >= CONFIG.maxInteractionsPerType) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return
    }

    trackedInteractions.selects++

    // For privacy, don't record the actual selected text
    callback({
      type: "selection",
      timestamp: Date.now(),
      url: window.location.href,
      selectionLength: selection.toString().length,
      // No need to include the actual text for privacy reasons
      hasSelection: true
    })
  }

  // Add event listeners
  document.addEventListener("click", handleClick, { passive: true })
  document.addEventListener("scroll", handleScroll, { passive: true })
  document.addEventListener("mouseover", handleMouseover, { passive: true })
  document.addEventListener("mouseout", handleMouseout, { passive: true })
  document.addEventListener("input", handleInput as EventListener, {
    passive: true
  })
  document.addEventListener("selectionchange", handleSelection, {
    passive: true
  })

  // Return cleanup function
  return () => {
    document.removeEventListener("click", handleClick)
    document.removeEventListener("scroll", handleScroll)
    document.removeEventListener("mouseover", handleMouseover)
    document.removeEventListener("mouseout", handleMouseout)
    document.removeEventListener("input", handleInput as EventListener)
    document.removeEventListener("selectionchange", handleSelection)

    // Clear any pending timeouts
    hoverTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
    hoverTimeouts.clear()
  }
}

/**
 * Extracts safe information about a DOM element
 * Collects non-sensitive metadata while preserving privacy
 * @param element - DOM element to extract info from
 * @returns Object with element tag, classes, id, and other non-sensitive attributes
 */
const getElementInfo = (
  element: Element
): {
  tag: string
  classes: string[]
  id?: string
  type?: string
  role?: string
  text?: string
} => {
  const result: {
    tag: string
    classes: string[]
    id?: string
    type?: string
    role?: string
    text?: string
  } = {
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList)
  }

  // Add ID if present
  if (element.id) {
    result.id = element.id
  }

  // Add type for input elements
  if (
    element.tagName.toLowerCase() === "input" &&
    (element as HTMLInputElement).type
  ) {
    result.type = (element as HTMLInputElement).type
  }

  // Add ARIA role if present
  const role = element.getAttribute("role")
  if (role) {
    result.role = role
  }

  // For buttons and links, include abbreviated text content for context
  if (
    ["button", "a"].includes(element.tagName.toLowerCase()) ||
    role === "button"
  ) {
    const text = element.textContent?.trim()
    if (text) {
      // Truncate text for privacy and to avoid excessive data
      result.text = text.length > 20 ? text.substring(0, 20) + "..." : text
    }
  }

  return result
}

/**
 * Gets the event path (all elements from target to root)
 * Provides cross-browser compatible way to get event propagation path
 * @param event - Mouse event to get path from
 * @returns Array of elements in the event path
 */
const getEventPath = (event: MouseEvent): Element[] => {
  // Use event.composedPath() if available
  if (event.composedPath) {
    return event
      .composedPath()
      .filter((el) => el instanceof Element) as Element[]
  }

  // Fallback method
  const path: Element[] = []
  let currentElement = event.target as Element

  while (currentElement) {
    path.push(currentElement)
    if (currentElement.parentElement) {
      currentElement = currentElement.parentElement
    } else if (
      currentElement.getRootNode &&
      currentElement.getRootNode() instanceof ShadowRoot
    ) {
      // Handle shadow DOM
      const shadowRoot = currentElement.getRootNode() as ShadowRoot
      currentElement = shadowRoot.host
    } else {
      break
    }
  }

  return path
}

/**
 * Gets all parent elements of an element
 * Walks up the DOM tree from the given element to document body
 * @param element - Element to get parents for
 * @returns Array of parent elements in order from closest to furthest
 */
const getElementParents = (element: Element): Element[] => {
  const parents: Element[] = []
  let currentElement = element.parentElement

  while (currentElement) {
    parents.push(currentElement)
    currentElement = currentElement.parentElement
  }

  return parents
}

/**
 * Determines if an element is considered interactive
 * Checks element type, attributes, and roles to identify clickable elements
 * @param element - Element to check
 * @returns Boolean indicating if element is likely interactive
 */
const isInteractiveElement = (element: Element): boolean => {
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute("role")

  // Common interactive elements
  if (
    [
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "video",
      "audio",
      "details"
    ].includes(tag)
  ) {
    return true
  }

  // Elements with interactive roles
  if (
    role &&
    [
      "button",
      "link",
      "checkbox",
      "menuitem",
      "tab",
      "radio",
      "option",
      "switch"
    ].includes(role)
  ) {
    return true
  }

  // Elements with click handlers
  const clickAttr = element.getAttribute("onclick")
  if (clickAttr) {
    return true
  }

  // Elements that look interactive based on styling
  const style = window.getComputedStyle(element)
  if (style.cursor === "pointer") {
    return true
  }

  return false
}

/**
 * Checks if an element is a form input element
 * Identifies elements that can receive user input
 * @param element - Element to check
 * @returns Boolean indicating if element is a form element
 */
const isFormElement = (element: Element): boolean => {
  const tag = element.tagName.toLowerCase()
  return ["input", "select", "textarea"].includes(tag)
}
