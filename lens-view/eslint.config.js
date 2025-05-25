import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
});

export default tseslint.config(
    {
        ignores: [".next"],
    },
    ...compat.extends("next/core-web-vitals"),
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        rules: {
            "@/prefer-const": "warn",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off", // Style preference, not critical
            "@typescript-eslint/no-unsafe-assignment": "off", // Too strict for data collection project
            "@typescript-eslint/no-unsafe-argument": "off", // Too strict for data collection project
            "@typescript-eslint/no-unsafe-member-access": "off", // Too strict for data collection project
            "@typescript-eslint/no-unsafe-call": "off", // Too strict for data collection project
            "@typescript-eslint/no-unsafe-return": "off", // Too strict for data collection project
            "@typescript-eslint/no-explicit-any": "off", // Pragmatic for external data handling
            "@typescript-eslint/restrict-template-expressions": "off", // Overly restrictive
            "@typescript-eslint/prefer-regexp-exec": "off", // Style preference
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/consistent-type-imports": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/no-misused-promises": "warn",
            "react/no-unescaped-entities": "off",
            "react-hooks/exhaustive-deps": "warn", // Keep as warning but don't be too strict
        },
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: true,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    }
);
