// SPDX-License-Identifier: GPL-3.0-or-later
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    files: ['src/**/*.{ts,tsx}', 'hardware/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Pages reach vendored code only through device/ and ui/ (VENDOR.md).
    files: ['src/pages/**/*.{ts,tsx}', 'src/plugins/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/vendor/**'] }],
    },
  },
  {
    // Vendored code is linted upstream, with upstream's rules.
    ignores: ['src/vendor/', 'dist/', 'node_modules/'],
  },
]
