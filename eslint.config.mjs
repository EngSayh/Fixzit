// ESLint 9 Flat Config - Migration from .eslintrc.cjs
// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import nextPlugin from "@next/eslint-plugin-next";
import path from "node:path";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores (replaces .eslintignore)
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    ignores: [
      // Build outputs
      ".next/**",
      "**/.next/**",
      "node_modules/**",
      "_artifacts/**",
      "coverage/**",
      "playwright-report/**",
      "e2e-test-results/**",
      "jscpd-report/**",
      "test-results/**",
      "**/playwright-report/**",
      "**/e2e-test-results/**",
      "**/test-results/**",
      "tests/playwright-report/**",

      // Assets and static files
      "public/**",

      // Large non-critical directories
      "database/**",
      "_deprecated/**",
      "aws/dist/**",
      "models/**",
      "server/models/**",

      // Specific files
      "test-*.js",
      "test-auth.js",
      "create-guardrails.js",
      "smart-merge-conflicts.ts",
      "test-powershell-heredoc.ts",
      "webpack-entry.js",
    ],
  },

  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  // Base JavaScript/TypeScript configuration
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Additional browser/library globals
        google: "readonly",
        NodeJS: "readonly",
        RequestInit: "readonly",
        HeadersInit: "readonly",
        EventListener: "readonly",
        // Next.js 14+ uses new JSX transform - React is available globally
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      import: importPlugin,
      "@next/next": nextPlugin,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...eslint.configs.recommended.rules,

      /* TypeScript - Balanced approach between strict and permissive */
      "@typescript-eslint/no-explicit-any": "warn", // Re-enabled to measure type-safety debt
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      /* JavaScript */
      "no-var": "off",
      "no-empty": "off",
      "no-extra-semi": "off",
      "no-useless-escape": "warn",
      "no-console": "error",
      "no-mixed-spaces-and-tabs": "off",

      /* Next.js specific rules */
      ...nextPlugin.configs.recommended.rules,

      /* React Hooks Rules */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
    },
  },

  // TypeScript files - use typescript-eslint configs
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),

  // TypeScript files - enforce the TS-aware unused vars rule
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off",
    },
  },

  // JavaScript / JSX modules - keep the base unused vars rule
  {
    files: ["**/*.{js,jsx,mjs}"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Test files - allow CommonJS patterns and mutable variables for fixtures
  {
    files: ["tests/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
    },
  },

  // Schema-heavy files (Mongoose models, plugins, declaration files)
  {
    files: [
      "server/models/**/*",
      "models/**/*",
      "server/plugins/**/*",
      "**/*.d.ts",
    ],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },

  // Next.js specific overrides
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-img-element": "off", // Allow img tags for data URLs and dynamic images
    },
  },

  // CommonJS JavaScript files
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Configuration files
  {
    files: [
      "tailwind.config.js",
      "next.config.js",
      "postcss.config.js",
      "jest.config.js",
      "playwright.config.ts",
      "vitest.config.ts",
    ],
    rules: {
      "no-mixed-spaces-and-tabs": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // Database and MongoDB files
  {
    files: [
      "lib/mongodb.ts",
      "lib/mongo.ts",
      "lib/mongodb-unified.ts",
      "database/**/*",
    ],
    rules: {
      "no-var": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "off",
    },
  },

  // API Routes - Allow 'any' for Mongoose Model type casting (Mongoose v8 compatibility)
  {
    files: ["app/api/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Test files - More permissive with test framework globals
  {
    files: [
      "**/*.test.{ts,tsx,js,jsx,mjs}",
      "**/*.spec.{ts,tsx,js,jsx,mjs}",
      "qa/**/*",
      "tests/**/*",
      "server/**/__tests__/**/*",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Vitest/Jest globals
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off", // Also disable base rule for test files
      "no-console": "off",
      "no-undef": "off", // Disable for test files since we define globals
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["services/souq/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },

  // Warn on deprecated role usage in new code (STRICT v4 migration)
  // Skip test files, scripts, and migration files
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "services/**/*.{ts,tsx}", "server/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/tests/**", "scripts/**"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='EMPLOYEE']",
          message: "UserRole.EMPLOYEE is deprecated. Use MANAGER or a specific function role (HR, FINANCE, etc.) instead. See types/user.ts for migration guide.",
        },
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='DISPATCHER']",
          message: "UserRole.DISPATCHER is deprecated. Use FM_MANAGER or PROPERTY_MANAGER instead. See types/user.ts for migration guide.",
        },
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='FINANCE_MANAGER']",
          message: "UserRole.FINANCE_MANAGER is deprecated. Use FINANCE or FINANCE_OFFICER instead. See types/user.ts for migration guide.",
        },
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='SUPPORT']",
          message: "UserRole.SUPPORT is deprecated. Use SUPPORT_AGENT instead. See types/user.ts for migration guide.",
        },
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='CUSTOMER']",
          message: "UserRole.CUSTOMER is deprecated. Use TENANT or OWNER instead. See types/user.ts for migration guide.",
        },
        {
          selector: "MemberExpression[object.name='UserRole'][property.name='VIEWER']",
          message: "UserRole.VIEWER is deprecated. Use AUDITOR instead. See types/user.ts for migration guide.",
        },
      ],
    },
  },

  // Scripts and tooling - Most permissive
  {
    files: ["scripts/**/*", "packages/**/*", "deployment/**/*", "tools/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        $: "readonly", // zx
        cd: "readonly",
        db: "readonly", // mongo shell
        ObjectId: "readonly", // mongo shell
        __ENV: "readonly", // k6
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": ["error"],
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Client-side guardrails to prevent server-only imports in bundles
  {
    files: ["components/**/*.{ts,tsx}", "pages/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./components",
              from: [
                "./server",
                "./domain",
                "./models",
                "./server/models",
                "./domain/fm/fm.behavior",
                "mongoose",
              ],
              message:
                "Do not import server-only modules (models/mongoose/fm.behavior) into client components. Use client-safe facades (e.g., lib/rbac/client-roles).",
            },
            {
              target: "./pages",
              from: [
                "./server",
                "./domain",
                "./models",
                "./server/models",
                "./domain/fm/fm.behavior",
                "mongoose",
              ],
              message:
                "Do not import server-only modules (models/mongoose/fm.behavior) into client components. Use client-safe facades (e.g., lib/rbac/client-roles).",
            },
          ],
        },
      ],
    },
    settings: {
      "import/resolver": {
        node: true,
        alias: {
          map: [
            ["@", path.resolve("./")],
            ["@/app", path.resolve("./app")],
            ["@/components", path.resolve("./components")],
            ["@/lib", path.resolve("./lib")],
            ["@/domain", path.resolve("./domain")],
            ["@/server", path.resolve("./server")],
          ],
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        },
      },
    },
  },
];
