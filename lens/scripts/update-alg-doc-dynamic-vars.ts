#!/usr/bin/env node
/**
 * This script updates the alg-ref-docs/alg-data-guide.md file
 * with the latest dynamic values from the codebase (truncation symbols, character limits, etc.)
 * Run this script with `pnpm update-alg-doc` to keep documentation in sync
 *
 * The markdown file uses template variables in the format {{VAR_NAME}}
 * This script will detect and replace these variables with their current values
 */
import * as fs from "fs"
import * as path from "path"
import ts from "typescript"

// Paths (relative to project root)
const LIMITS_FILE_PATH = "src/config/limits.ts"
const PROTOCOL_DOCS_PATH = "alg-ref-docs/alg-data-guide.md"
const TYPES_DATA_PATH = "src/types/data.ts"

/**
 * Extract constant values from TypeScript files
 * @param filePath Path to the TypeScript file
 * @param exportedConstName Name of the exported constant to extract
 * @returns Extracted value or null if not found
 */
function extractExportedConst(
  filePath: string,
  exportedConstName: string
): any {
  const absolutePath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    return null
  }

  const fileContent = fs.readFileSync(absolutePath, "utf8")

  // For simple constants like strings, we can use regex
  if (exportedConstName === "TRUNCATION_SYMBOL") {
    const match = fileContent.match(
      new RegExp(
        `export\\s+const\\s+${exportedConstName}\\s*=\\s*["'](.+?)["']`
      )
    )
    if (match && match[1]) {
      return match[1]
    }
  }

  // For more complex structures like objects, we'll parse the TypeScript
  // Create a temporary file to help with evaluation
  const tempFilePath = path.join(process.cwd(), "temp-extract.js")

  try {
    // Transpile TS to JS
    const result = ts.transpileModule(fileContent, {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    })

    // Write the JS to a temp file
    fs.writeFileSync(tempFilePath, result.outputText)

    // Import the temp file and get the exported constants
    const imported = require(tempFilePath)
    return imported[exportedConstName]
  } catch (error) {
    console.error(
      `Error extracting ${exportedConstName} from ${filePath}:`,
      error
    )
    return null
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}

/**
 * Extract primary categories from the schema
 * @param filePath Path to the data.ts file
 * @returns Array of primary categories
 */
function extractPrimaryCategories(filePath: string): string[] {
  const absolutePath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    return []
  }

  const fileContent = fs.readFileSync(absolutePath, "utf8")

  // Find the hypotheticalDomainClassification field and extract primaryCategory values
  const match = fileContent.match(
    /primaryCategory:\s*"([^"]+)"\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"/
  )

  if (match) {
    return [match[1], match[2], match[3], match[4]]
  }

  return []
}

/**
 * Generate a markdown table from the character limits object
 * @param charLimits The CHAR_LIMITS object from limits.ts
 * @returns Markdown table as a string
 */
function generateCharLimitsTable(charLimits: Record<string, number>): string {
  let table =
    "| Field Type | Character Limit |\n|------------|----------------|\n"

  for (const [key, value] of Object.entries(charLimits)) {
    table += `| ${key} | ${value} |\n`
  }

  return table
}

/**
 * Update the markdown documentation file with the latest values
 */
function updateDocumentation() {
  // 1. Extract the current values from the codebase
  const truncationSymbol = extractExportedConst(
    LIMITS_FILE_PATH,
    "TRUNCATION_SYMBOL"
  )
  const charLimits = extractExportedConst(LIMITS_FILE_PATH, "CHAR_LIMITS")
  const primaryCategories = extractPrimaryCategories(TYPES_DATA_PATH)

  if (!truncationSymbol || !charLimits) {
    console.error("Failed to extract required values from the codebase.")
    process.exit(1)
  }

  // 2. Read the documentation file
  const docsPath = path.resolve(process.cwd(), PROTOCOL_DOCS_PATH)
  if (!fs.existsSync(docsPath)) {
    console.error(`Documentation file not found: ${docsPath}`)
    process.exit(1)
  }

  let docsContent = fs.readFileSync(docsPath, "utf8")

  // 3. Prepare variable values
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  const charLimitsTable = generateCharLimitsTable(charLimits)
  const primaryCategoriesStr =
    primaryCategories.length === 4
      ? `"${primaryCategories[0]}" | "${primaryCategories[1]}" | "${primaryCategories[2]}" | "${primaryCategories[3]}"`
      : '"shopping" | "travel" | "productivity" | "miscellaneous"'

  // 4. Build a variable replacement map
  const variableMap: Record<string, string> = {
    TRUNCATION_SYMBOL: truncationSymbol,
    CHAR_LIMITS_TABLE: charLimitsTable,
    PRIMARY_CATEGORIES: primaryCategoriesStr,
    LAST_UPDATED: currentDate,
    NUM_CATEGORIES: primaryCategories.length.toString(),
    TOTAL_CHAR_LIMIT_FIELDS: Object.keys(charLimits).length.toString()
  }

  // 5. Find all template variables in the markdown
  const templateVariableRegex = /\{\{([A-Z_]+)\}\}/g
  const foundVariables = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = templateVariableRegex.exec(docsContent)) !== null) {
    foundVariables.add(match[1])
  }

  // 6. Replace all template variables with their values
  for (const varName of foundVariables) {
    if (variableMap[varName]) {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, "g")
      docsContent = docsContent.replace(regex, variableMap[varName])
    } else {
      console.warn(
        `⚠️ Warning: Template variable {{${varName}}} found in markdown but no value is defined`
      )
    }
  }

  // 7. Write the updated content back to the file
  fs.writeFileSync(docsPath, docsContent)

  // 8. Report on the updates
  console.log(`✅ Algorithm reference documentation updated successfully!`)
  console.log(`📝 Updated values:`)
  console.log(
    `   - Variables replaced: ${Array.from(foundVariables).join(", ")}`
  )
  console.log(`   - Truncation symbol: ${truncationSymbol}`)
  console.log(
    `   - Character limits: ${Object.keys(charLimits).length} entries`
  )
  console.log(`   - Primary categories: ${primaryCategories.join(", ")}`)
  console.log(`   - Last updated: ${currentDate}`)
  console.log(
    `\n🧠 This documentation serves as the authoritative reference for the`
  )
  console.log(
    `   future algorithm to understand, rank, and find similarities in`
  )
  console.log(`   the data collected by Lens by Vael AI Context Bank.`)
}

// Run the update function
updateDocumentation()
