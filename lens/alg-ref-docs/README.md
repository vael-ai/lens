# Algorithm Reference Documentation

This directory contains reference documentation for the future algorithm that will process data collected by the Vael AI Context Bank.

## Dynamic Documentation System

The files in this directory are automatically updated when key configuration files change. This ensures that the documentation always reflects the actual implementation and can be trusted by the algorithm.

### alg-data-guide.md

This document provides comprehensive information about:

- The data truncation system (including the current truncation symbol)
- Character limits for various field types
- The domain classification system and its categories
- Element context structure
- Key data structures
- Implementation guidelines

## How It Works

The documentation is kept up-to-date through a template variable system and an automatic update script:

1. Template variables in the format `{{VARIABLE_NAME}}` are placed in the markdown files
2. When the update script runs, it:
   - Extracts current values from the codebase (src/config/limits.ts, src/types/data.ts, etc.)
   - Identifies all template variables in the markdown
   - Replaces each variable with its current value
   - Updates the "last updated" timestamp

The update script will automatically be triggered by:

1. A [Cursor](https://cursor.sh/) rule that runs when key files like `src/config/limits.ts` or `src/types/data.ts` are modified
2. CI/CD pipelines during the build process

You can also manually update the documentation by running:

```bash
pnpm update-alg-doc
```

## For Developers

When making changes to the data schema, character limits, or truncation system:

1. If you need to add new dynamic data to the documentation, add template variables using the `{{VARIABLE_NAME}}` format
2. Update the `variableMap` in the update script to provide values for any new variables
3. Run `pnpm update-alg-doc` to verify your changes
4. If adding new fields or concepts that aren't easily automated, add manual documentation sections

This approach ensures that the algorithm always has access to the latest specification details, which is crucial for proper data processing, ranking, and similarity finding.
