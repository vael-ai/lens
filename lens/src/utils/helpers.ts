/**
 * Collection of utility helper functions for the Vael Context Bank extension
 */

/**
 * Generates a UUID v4 string using the crypto API for better security
 * @returns A UUID string
 * @example
 * const uuid = generateUUID()
 */
export const generateUUID = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // Set the version (4) and variant (RFC 4122 compliant)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Set the version to 4 (0100xxxx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Set the variant to 10xxxxxx

  return [...bytes]
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, "0")
      return [4, 6, 8, 10].includes(i) ? `-${hex}` : hex
    })
    .join("")
}

/**
 * Safely parses a JSON string without throwing exceptions
 * @param jsonString String to parse as JSON
 * @param fallback Optional fallback value if parsing fails
 * @returns Parsed object or fallback value
 * @example
 * const jsonString = '{"name": "John Doe"}'
 * const parsedJson = safeJSONParse(jsonString)
 * console.log(parsedJson) // Output: { name: 'John Doe' }
 */
export const safeJSONParse = <T>(
  jsonString: string,
  fallback: T = null as T
): T => {
  try {
    return JSON.parse(jsonString) as T
  } catch (e) {
    return fallback
  }
}

/**
 * Truncates text to a maximum length with an ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * @example
 * const text = 'This is a very long text that needs to be truncated'
 * const truncatedText = truncateText(text, 20)
 * console.log(truncatedText) // Output: This is a very long...
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

/**
 * Validates if a string is a valid URL
 * @param url - The string to check if it's a valid URL
 * @returns True if the string is a valid URL, false otherwise
 * @example
 * const url = 'https://www.example.com'
 * const isValid = isValidUrl(url)
 * console.log(isValid) // Output: true
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Creates a debounced version of a function that delays execution until after wait milliseconds
 * @param fn Function to debounce
 * @param wait Milliseconds to wait before executing
 * @returns Debounced function
 * @example
 * const debouncedFunction = debounce(() => console.log('Hello World'), 1000)
 * debouncedFunction() // Output: Hello World (after 1 second)
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = window.setTimeout(() => {
      fn(...args)
      timeout = null
    }, wait)
  }
}

/**
 * Creates a throttled version of a function that limits execution to once per wait milliseconds
 * @param fn Function to throttle
 * @param wait Milliseconds to wait between executions
 * @returns Throttled function
 * @example
 * const throttledFunction = throttle(() => console.log('Hello World'), 1000)
 * throttledFunction() // Output: Hello World (only once per second)
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null
  let lastArgs: Parameters<T> | null = null

  return (...args: Parameters<T>) => {
    lastArgs = args

    if (timeout === null) {
      fn(...args)
      timeout = window.setTimeout(() => {
        timeout = null
        if (lastArgs) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, wait)
    }
  }
}
