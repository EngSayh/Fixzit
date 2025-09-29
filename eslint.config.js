const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'error',
    },
  },
];