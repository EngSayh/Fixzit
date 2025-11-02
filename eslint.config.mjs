// ESLint 9 Flat Config - Migration from .eslintrc.cjs
// Note: @ts-check disabled for react-hooks plugin (legacy plugin format not fully compatible with flat config types)

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      // Build outputs
      '.next/**',
      'node_modules/**',
      '_artifacts/**',
      'coverage/**',
      'playwright-report/**',
      'e2e-test-results/**',
      'jscpd-report/**',
      'test-results/**',
      
      // Assets and static files
      'public/**',
      
      // Large non-critical directories
      'packages/**',
      'database/**',
      'deployment/**',
      'scripts/**',
      'tools/**',
      'qa/**',
      '_deprecated/**',
      'aws/dist/**',
      
      // Specific files
      'test-*.js',
      'test-auth.js',
      'create-guardrails.js',
      'smart-merge-conflicts.ts',
      'test-powershell-heredoc.ts',
      'webpack-entry.js',
    ],
  },

  // Base JavaScript/TypeScript configuration
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      
      /* TypeScript - Balanced approach between strict and permissive */
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',

      /* React Hooks - CRITICAL (PR #69/#71 flagged missing rules) */
      'react-hooks/rules-of-hooks': 'error',  // ✅ Enforce Hook calling rules
      'react-hooks/exhaustive-deps': 'warn',   // ✅ Validate Hook dependencies

      /* JavaScript */
      'no-var': 'off',
      'no-empty': 'off',
      'no-extra-semi': 'off',
      'no-useless-escape': 'warn',
      'no-mixed-spaces-and-tabs': 'off',

      /* Next.js specific rules - handled by eslint-config-next */
    },
  },

  // CommonJS JavaScript files
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      parser: null, // Use default parser
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Configuration files
  {
    files: [
      'tailwind.config.js',
      'next.config.js',
      'postcss.config.js',
      'jest.config.js',
      'playwright.config.ts',
      'vitest.config.ts',
    ],
    rules: {
      'no-mixed-spaces-and-tabs': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // Database and MongoDB files
  {
    files: ['lib/mongodb.ts', 'lib/mongo.ts', 'lib/mongodb-unified.ts', 'database/**/*'],
    rules: {
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // 'no-undef' NOT disabled - TypeScript handles undefined variable checks
    },
  },

  // Test files - More permissive
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', 'qa/**/*', 'tests/**/*'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Scripts and tooling - Most permissive
  {
    files: ['scripts/**/*', 'packages/**/*', 'deployment/**/*', 'tools/**/*'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Keep 'no-undef' disabled for scripts (may use Node.js globals like __dirname, process)
      'no-undef': 'off',
    },
  },
];
