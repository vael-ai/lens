# Vael AI Context Bank Data Processing Guidelines

## Purpose of This Document

This document serves as a reference for the future algorithm or system that processes data collected by the Vael AI Context Bank browser extension. It outlines key aspects of the data structure, formatting rules, special fields that require specific handling, and any other nuances to understand the data. When developing data processing algorithms, ML models, or analysis systems, should be able to refer to this document to ensure proper interpretation of the collected data.

**Note for Future AI Assistants and Algorithms**: This document is designed to help systems understand and process the browsing data collected by Vael. It provides critical information about how to:

1. Interpret truncated data fields and their limits
2. Understand the domain classification system for contextual awareness
3. Process element context data for user interaction understanding
4. Handle specialized data structures for different website categories
5. Implement proper ranking and similarity matching across collected data points

This documentation is dynamically maintained to always reflect the current implementation, ensuring that algorithms can correctly process, rank, and find similarities in the collected data to support Vael's context-aware AI systems.

## Data Truncation System

### Truncation Indicators

The extension implements a character limit system to prevent excessive data storage. When a string exceeds its limit, it is truncated and appended with the truncation symbol: `…`

When processing data, if a string ends with `…`, it indicates that the original content was longer and has been truncated. The exact character limits are defined in `src/config/limits.ts` and include 17 different field types:

| Field Type         | Character Limit |
| ------------------ | --------------- |
| TEXT_CONTENT       | 200             |
| URL                | 250             |
| DESCRIPTION        | 300             |
| ELEMENT_IDENTIFIER | 100             |
| PAGE_TITLE         | 100             |
| META_TAG           | 150             |
| PRODUCT_NAME       | 100             |
| SEARCH_QUERY       | 50              |
| CATEGORY_NAME      | 50              |
| DESTINATION_NAME   | 75              |
| ARTICLE_TITLE      | 150             |
| ELEMENT_TEXT       | 100             |
| ELEMENT_ROLE       | 50              |
| ELEMENT_TYPE       | 30              |
| ELEMENT_CLASS      | 150             |
| ERROR_MESSAGE      | 200             |
| ANALYTICS_EVENT    | 100             |

### Processing Truncated Data

When encountering truncated fields:

- Recognize that the data is incomplete
- Do not treat truncation symbols as part of the semantic content
- Consider implementing similarity matching that is robust to truncation
- For classification or analysis, assign less weight to truncated fields

## Domain Classification System

### hypotheticalDomainClassification Field

The `hypotheticalDomainClassification` field represents an automatic classification of websites into specific categories. This classification is intended to help context-aware AI agents understand the general purpose of a website without requiring detailed content analysis.

The current version of the system supports 4 primary domain categories that help organize all browsing activity into meaningful groups.

The field has the following structure:

```typescript
hypotheticalDomainClassification: {
  primaryCategory: "shopping" | "travel" | "productivity" | "miscellaneous"
  confidence: number // 0-1 indicating classification confidence
  subCategory?: string // More specific classification (e.g., "electronics", "hotels")
  classificationMethod: "url-pattern" | "content-analysis" | "manual" | "hybrid"
}
```

### Classification Properties

1. **primaryCategory**: The main domain category

   - `shopping`: E-commerce, retail, product sites
   - `travel`: Travel booking, destination research, accommodation
   - `productivity`: Work tools, document editing, project management
   - `miscellaneous`: General websites, news, entertainment, etc.

2. **confidence**: A decimal value between 0 and 1 indicating how certain the system is about the classification

   - Values above 0.8: High confidence, likely accurate
   - Values between 0.5-0.8: Medium confidence
   - Values below 0.5: Low confidence, treat with caution

3. **subCategory**: A more specific classification within the primary category

   - Shopping: electronics, fashion, home, beauty, grocery
   - Travel: hotels, flights, car rentals, vacation packages, cruises
   - Productivity: document editing, project management, communication, calendar, development

4. **classificationMethod**: Indicates how the classification was determined
   - `url-pattern`: Based on domain name or URL patterns
   - `content-analysis`: Based on page content analysis
   - `manual`: Manually classified
   - `hybrid`: Combination of multiple methods

### Using Domain Classification

When processing the data:

- Prioritize classifications with higher confidence scores
- Consider both the primary category and subcategory for more granular understanding
- The classification method can indicate the reliability (URL-pattern is generally more reliable than content-analysis)
- Use domain classification for initial filtering and context-setting

## Element Context Structure

### elementContext vs. targetElements

The data schema originally used a `targetElements` field with long CSS selectors to identify elements users interacted with. This has been replaced with a more semantic `elementContext` structure that focuses on element content rather than styling details.

The new structure looks like:

```typescript
elementContext: {
  identifier: string // Short semantic identifier (e.g., "product-price", "search-box")
  textContent: string // Actual text content (trimmed)
  role: string // ARIA role or HTML element purpose
  elementType: string // Element type (button, input, div, etc.)
  interactionCount: number // How many times user interacted with this element
}
;[]
```

### Processing Element Context

When working with element context data:

- The `identifier` combines the element's tag, attributes, and content in a concise format
- `textContent` contains the actual visible text of the element (may be truncated)
- `role` provides accessibility context which can help determine the element's purpose
- `elementType` indicates the HTML element type
- `interactionCount` shows how frequently the user has interacted with this element

## Key Data Structures

### Website Data

The core of the collected data is stored in the `websites` object with keys formatted as either "domain" or "domain/path". Each entry contains:

- Visit metrics (firstVisit, lastVisit, visitCount, totalFocusTime)
- URL information (url, domain, path)
- Page metadata
- User interactions
- Domain-specific data
- Domain classification
- Tab activity statistics

### Interaction Data

User interactions are grouped by type:

- click
- scroll
- hover
- input
- selection

Each interaction type accumulates metrics like count, positions, element context, and type-specific information like scroll patterns or input field stats.

### Domain-Specific Data

Based on the website category, specialized data is collected:

**Shopping Sites**:

- Viewed products
- Price information
- Product categories

**Travel Sites**:

- Destinations
- Date ranges
- Accommodation/transportation preferences

**Productivity Sites**:

- Tool usage
- File types
- Workspace information

## Implementation Guidelines

When implementing algorithms to process this data:

1. **Privacy-Preserving Processing**:

   - Respect user privacy by avoiding reconstruction of full text from truncated content
   - Process data in aggregate when possible
   - Apply differential privacy techniques for sensitive analysis

2. **Performance Considerations**:

   - Account for varying data completeness across websites
   - Implement caching for frequently accessed data points
   - Design for incremental processing as new data arrives

3. **Context Enrichment**:

   - Correlate data across domains to build comprehensive user context
   - Consider temporal patterns in website visits
   - Analyze interaction patterns to determine user preferences

4. **Data Validation**:
   - Check for the presence of required fields
   - Validate confidence scores when using classification information
   - Verify timestamps for logical ordering (firstVisit <= lastVisit)

## Extending the Schema

When extending the data schema, follow these guidelines:

1. Add new fields with appropriate defaults to maintain backward compatibility
2. Apply the truncation system to new string fields
3. Document new fields in this specification
4. Include confidence scores for any new classification systems
5. Maintain the distinction between observed data and inferred data

---

_This document was last updated: March 30, 2025_
