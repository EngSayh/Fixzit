// Central ESLint configuration to reduce noise and focus on actionable issues
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'next/core-web-vitals',
  ],
  rules: {
    // Relax highly noisy rules across the codebase
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'react/no-unescaped-entities': 'off',
    '@next/next/no-assign-module-variable': 'off',
    '@next/next/no-img-element': 'warn',
    'no-useless-escape': 'warn',
  },
  overrides: [
    // JS/Config files
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      parser: 'espree',
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Config files with mixed indentation or special globals
    {
      files: [
        'tailwind.config.js',
        'tailwind.config.ts',
        'next.config.js',
        'postcss.config.js',
        'jest.config.js',
        'playwright.config.ts',
      ],
      rules: {
        'no-mixed-spaces-and-tabs': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Lib mongo file needs global var declaration
    {
      files: ['lib/mongodb.ts', 'src/lib/mongodb.ts'],
      rules: {
        'no-var': 'off',
      },
    },
    // ResponsiveContext uses conditional require and hooks access
    {
      files: ['src/contexts/ResponsiveContext.tsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
    },
    // Tests and QA utilities
    {
      files: ['**/*.test.*', '**/*.spec.*', 'qa/**/*'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'react/display-name': 'off',
      },
    },
    // Scripts and server package (CommonJS, node env, older style allowed)
    {
      files: [
        'scripts/**/*',
        'packages/fixzit-souq-server/**/*',
        'database/**/*',
        'deployment/**/*',
        'public/**/*',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        'no-undef': 'off',
      },
    },
  ],
  ignorePatterns: [
    '.next/**/*',
    'node_modules/**/*',
    '_artifacts/**/*',
    // Large non-critical trees
    'public/**/*',
    'packages/fixzit-souq-server/**/*',
    'scripts/**/*',
    'database/**/*',
    'deployment/**/*',
    'qa/**/*',
    'tests/**/*',
    'coverage/**/*',
    // Generated or external
    'playwright-report/**/*',
  ],
};

