// Comprehensive ESLint configuration balancing code quality with pragmatic development
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    'next/core-web-vitals',
    /**
     * The Next.js core-web-vitals config already includes eslint-config-next
     * with sensible defaults. We customize rules that are too strict for the
     * current codebase while maintaining code quality standards.
     */
  ],
  ignorePatterns: [
    // Generated or bundled assets
    '.next/**/*',
    'node_modules/**/*',
    '_artifacts/**/*',
    'coverage/**/*',
    'playwright-report/**/*',
    // Large non-critical directories
    'public/**/*',
    'packages/**/*',
    'database/**/*',
    'deployment/**/*',
    'scripts/**/*',
    'tools/**/*',
    'qa/**/*',
    'tests/**/*',
    '_deprecated/**/*',
    'aws/dist/**/*',
    // Test files
    '**/__tests__/**/*',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    // Specific files
    'test-*.js',
    'test-auth.js',
    'create-guardrails.js',
    'smart-merge-conflicts.ts',
    'test-powershell-heredoc.ts',
  ],
  rules: {
    /* TypeScript - Balanced approach between strict and permissive */
    '@typescript-eslint/no-explicit-any': 'warn', // Warning allows progress while encouraging better types
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    '@typescript-eslint/no-var-requires': 'off', // CommonJS compatibility
    '@typescript-eslint/ban-ts-comment': 'warn', // Allow with warning for documented exceptions

    /* JavaScript */
    'no-var': 'off', // Legacy code compatibility
    'no-empty': 'off', // Sometimes needed for catch blocks
    'no-extra-semi': 'off', // Style preference
    'no-useless-escape': 'warn', // Warn but don't break builds
    'no-mixed-spaces-and-tabs': 'off', // Config files may need mixed indentation

    /* React */
    'react/no-unescaped-entities': 'off', // Common in content-heavy applications
    'react/display-name': 'off', // Not critical for functionality
    'react-hooks/exhaustive-deps': 'warn', // Important for performance but not breaking
    'react-hooks/rules-of-hooks': 'warn',

    /* Next.js */
    '@next/next/no-img-element': 'warn', // Encourage Next.js Image but don't block
    '@next/next/no-assign-module-variable': 'off',

    /* Accessibility - Keep as warnings for awareness */
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
  },
  overrides: [
    // JavaScript and CommonJS files
    {
      files: ['*.js', '*.cjs'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'script',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // ES Modules JavaScript
    {
      files: ['*.mjs'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Configuration files that may have special requirements
    {
      files: [
        'tailwind.config.js',
        'next.config.js',
        'postcss.config.js',
        'jest.config.js',
      ],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      rules: {
        'no-mixed-spaces-and-tabs': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // TypeScript config files using ES modules
    {
      files: ['playwright.config.ts', 'tailwind.config.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      rules: {
        'no-mixed-spaces-and-tabs': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // Database and MongoDB files
    {
      files: ['lib/mongodb.ts', 'src/lib/mongodb.ts', 'database/**/*'],
      rules: {
        'no-var': 'off', // Global variable declarations
        '@typescript-eslint/no-explicit-any': 'off', // MongoDB types can be complex
        'no-undef': 'off', // MongoDB shell context
      },
    },
    // Context files with dynamic imports
    {
      files: ['src/contexts/ResponsiveContext.tsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
    },
    // Test files - More permissive for testing utilities
    {
      files: ['**/*.test.*', '**/*.spec.*', 'qa/**/*', 'tests/**/*'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'react/display-name': 'off',
      },
    },
    // Scripts and tooling - Most permissive
    {
      files: [
        'scripts/**/*',
        'packages/**/*',
        'deployment/**/*',
        'tools/**/*',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
