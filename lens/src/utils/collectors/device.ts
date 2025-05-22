/**
 * Collector module for device and browser information
 * Extracts detailed information about the user's device, browser, and system capabilities
 * This data helps provide context for AI agents to understand the user's environment
 */

/**
 * Collects device information for user profiling
 * Safely gathers device capabilities and specifications
 */
import type { DeviceInfo } from "../../types/data"

/**
 * Interface defining the NetworkInformation API properties
 * Used to type-check the non-standard navigator.connection object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation {
  effectiveType?: string
  type?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

/**
 * Interface for navigator.userAgentData
 * Part of User-Agent Client Hints API
 */
interface UserAgentData {
  brands?: { brand: string; version: string }[]
  mobile?: boolean
  platform?: string
  getHighEntropyValues?(hints: string[]): Promise<{
    architecture?: string
    bitness?: string
    model?: string
    platformVersion?: string
    uaFullVersion?: string
  }>
}

// Augment the Navigator interface to add userAgentData
declare global {
  interface Navigator {
    userAgentData?: UserAgentData
    connection?: NetworkInformation
  }

  interface Permissions {
    query(permissionDesc: {
      name: string
    }): Promise<{ state: "granted" | "denied" | "prompt" }>
  }
}

/**
 * Detects the platform/OS in a cross-browser compatible way
 * Falls back through multiple methods to determine the platform
 * @returns The detected platform string
 */
function getPlatform(): string {
  // Use modern User-Agent Client Hints API if available
  if (navigator.userAgentData && navigator.userAgentData.platform) {
    return navigator.userAgentData.platform
  }

  // Fallback 1: Use deprecated navigator.platform if available
  if (navigator.platform) {
    return navigator.platform
  }

  // Fallback 2: Extract from userAgent (least reliable)
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("win")) return "Windows"
  if (userAgent.includes("mac")) return "MacOS"
  if (userAgent.includes("linux")) return "Linux"
  if (userAgent.includes("android")) return "Android"
  if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "iOS"

  // Default fallback
  return "Unknown"
}

/**
 * Collects device information including screen size, browser details,
 * and connectivity information.
 * @returns DeviceInfo object with collected device data
 */
export const collectDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    // Extract browser information
    const browserInfo = getBrowserInfo()

    // Get network information
    const connectionInfo = getConnectionInfo()

    return {
      userAgent: navigator.userAgent,
      platform: getPlatform(),
      browser: browserInfo.browser,
      browserVersion: browserInfo.browserVersion,
      os: browserInfo.os,
      screenSize: {
        width: screen.width,
        height: screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      connection: connectionInfo
    }
  } catch (error) {
    console.error("Error collecting device info:", error)
    // Return minimal device info
    return {
      userAgent: navigator.userAgent,
      platform: getPlatform(),
      screenSize: {
        width: screen.width || 1920,
        height: screen.height || 1080
      },
      viewport: {
        width: window.innerWidth || 1280,
        height: window.innerHeight || 720
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      connection: {
        type: "unknown",
        downlink: 0,
        rtt: 0,
        effectiveType: "unknown",
        saveData: false
      }
    }
  }
}

/**
 * Gets browser and OS information based on user agent analysis
 * @returns Object containing browser name, version, and OS details
 */
function getBrowserInfo(): {
  browser: string
  browserVersion: string
  os: string
} {
  const ua = navigator.userAgent

  // Default values
  let browser = "Unknown"
  let browserVersion = "Unknown"
  let os = "Unknown"

  // Browser detection
  if (ua.includes("Firefox/")) {
    browser = "Firefox"
    browserVersion = ua.split("Firefox/")[1].split(" ")[0]
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome"
    browserVersion = ua.split("Chrome/")[1].split(" ")[0]
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari"
    if (ua.includes("Version/")) {
      browserVersion = ua.split("Version/")[1].split(" ")[0]
    }
  } else if (ua.includes("Edge/") || ua.includes("Edg/")) {
    browser = "Edge"
    if (ua.includes("Edge/")) {
      browserVersion = ua.split("Edge/")[1].split(" ")[0]
    } else if (ua.includes("Edg/")) {
      browserVersion = ua.split("Edg/")[1].split(" ")[0]
    }
  } else if (ua.includes("Opera/") || ua.includes("OPR/")) {
    browser = "Opera"
    if (ua.includes("OPR/")) {
      browserVersion = ua.split("OPR/")[1].split(" ")[0]
    } else {
      browserVersion = ua.split("Opera/")[1].split(" ")[0]
    }
  }

  // OS detection
  if (ua.includes("Windows")) {
    os = "Windows"
    if (ua.includes("Windows NT")) {
      const ntVersion = ua.split("Windows NT ")[1].split(";")[0]
      switch (ntVersion) {
        case "10.0":
          os = "Windows 10/11"
          break
        case "6.3":
          os = "Windows 8.1"
          break
        case "6.2":
          os = "Windows 8"
          break
        case "6.1":
          os = "Windows 7"
          break
        default:
          os = `Windows (NT ${ntVersion})`
      }
    }
  } else if (ua.includes("Mac OS X")) {
    os = "macOS"
    const macVersion = ua.split("Mac OS X ")[1]?.split(")")[0]
    if (macVersion) {
      os = `macOS ${macVersion.replace(/_/g, ".")}`
    }
  } else if (ua.includes("Linux")) {
    os = "Linux"
    if (ua.includes("Android")) {
      os = "Android"
      const androidVersion = ua.match(/Android\s([0-9.]+)/)
      if (androidVersion && androidVersion[1]) {
        os = `Android ${androidVersion[1]}`
      }
    }
  } else if (ua.includes("iOS")) {
    os = "iOS"
    const iosVersion = ua.match(/OS\s([0-9_]+)/)
    if (iosVersion && iosVersion[1]) {
      os = `iOS ${iosVersion[1].replace(/_/g, ".")}`
    }
  }

  return { browser, browserVersion, os }
}

/**
 * Safely get connection information from Navigator API
 * Falls back to default values if the API is not available
 * @returns Connection information object
 */
function getConnectionInfo(): DeviceInfo["connection"] {
  try {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection

    if (connection) {
      return {
        type: connection.type || "unknown",
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        effectiveType: connection.effectiveType || "unknown",
        saveData: connection.saveData || false
      }
    }
  } catch (error) {
    console.warn("Error getting connection info:", error)
  }

  // Default connection info if API not available
  return {
    type: "unknown",
    downlink: 0,
    rtt: 0,
    effectiveType: "unknown",
    saveData: false
  }
}

/**
 * Safely checks if a particular permission is granted
 * Will not throw errors for unsupported permission types
 * @param permissionName - The name of the permission to check
 * @returns Promise resolving to permission state or null if unsupported
 */
export async function safeCheckPermission(
  permissionName: string
): Promise<"granted" | "denied" | "prompt" | null> {
  try {
    // First check if the Permissions API is supported
    if (!navigator.permissions) {
      console.warn("Permissions API not supported")
      return null
    }

    // Try to query for the permission
    const permissionStatus = await navigator.permissions.query({
      name: permissionName as any
    })

    return permissionStatus.state
  } catch (error) {
    // Log but don't rethrow the error
    console.warn(`Permission check failed, continuing: ${error}`)
    return null
  }
}
