/**
 * Configuration file defining character limits for various data fields
 * Used to prevent excessively large values from being stored
 */

/**
 * Maximum character lengths for different types of collected data
 * These limits help ensure data remains manageable and performant
 */
export const CHAR_LIMITS = {
  // General field limits
  TEXT_CONTENT: 200,
  URL: 250,
  DESCRIPTION: 300,
  ELEMENT_IDENTIFIER: 100,
  PAGE_TITLE: 100,
  META_TAG: 200,

  // Domain-specific limits
  PRODUCT_NAME: 100,
  SEARCH_QUERY: 50,
  CATEGORY_NAME: 50,
  DESTINATION_NAME: 75,
  ARTICLE_TITLE: 150,

  // Interaction data limits
  ELEMENT_TEXT: 150,
  ELEMENT_ROLE: 50,
  ELEMENT_TYPE: 50,
  ELEMENT_CLASS: 150,

  // New element selector limits
  ELEMENT_PATH: 150,
  ELEMENT_CONTENT_HINT: 50,
  ELEMENT_TYPE_SIMPLE: 20,

  // Classification limits
  DOMAIN_KEYWORDS: 25,
  DOMAIN_TYPE: 20,

  // Other limits
  ERROR_MESSAGE: 200,
  ANALYTICS_EVENT: 100
}

/**
 * Truncation symbol to indicate text has been cut off
 * Using Unicode ellipsis character for better typography
 */
export const TRUNCATION_SYMBOL = "…"

/**
 * Utility function to truncate text based on the specified limit type
 * Adds truncation symbol to indicate text was cut off
 * @param value Text value to truncate
 * @param limitType Type of limit to apply from CHAR_LIMITS
 * @returns Truncated string with truncation symbol if needed
 */
export function truncateField(
  value: string,
  limitType: keyof typeof CHAR_LIMITS
): string {
  if (!value) return value

  const limit = CHAR_LIMITS[limitType]
  if (value.length <= limit) return value

  return (
    value.substring(0, limit - TRUNCATION_SYMBOL.length) + TRUNCATION_SYMBOL
  )
}

/**
 * Utility function to truncate an object's string fields
 * @param obj Object containing string fields to truncate
 * @param fieldLimits Map of field names to their limit types
 * @returns New object with truncated string fields
 */
export function truncateObjectFields<T extends Record<string, any>>(
  obj: T,
  fieldLimits: Partial<Record<keyof T, keyof typeof CHAR_LIMITS>>
): T {
  const result = { ...obj }

  for (const [field, limitType] of Object.entries(fieldLimits)) {
    const key = field as keyof T
    if (typeof result[key] === "string") {
      // Safe casting since we've checked the type
      result[key] = truncateField(
        result[key] as string,
        limitType as keyof typeof CHAR_LIMITS
      ) as unknown as T[keyof T]
    }
  }

  return result
}
