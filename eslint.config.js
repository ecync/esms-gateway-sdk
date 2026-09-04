// @ts-check
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts", "examples/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      // The SDK targets Node 18+ and relies on Node's web-platform globals
      // (fetch, Response, URLSearchParams, AbortController) rather than a
      // browser DOM lib, so both globals.node and the relevant browser-ish
      // fetch API globals are included here.
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // TypeScript's own compiler is the authority on undefined identifiers
      // and ambient lib types (RequestInit, Response, and friends from the
      // "DOM" and "node" lib entries); the base no-undef rule doesn't know
      // about type-only positions and produces false positives on them.
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },
  {
    // Example scripts are meant to print their results to the console as
    // their whole point, so the library-wide console.log restriction
    // (aimed at src/) doesn't make sense here.
    files: ["examples/**/*.ts"],
    rules: {
      "no-console": "off"
    }
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  }
];
