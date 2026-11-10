import { join } from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import importIntegrityPlugin from 'import-integrity-lint';
import tseslint from 'typescript-eslint';

export default [
  includeIgnoreFile(join(import.meta.dirname, '.gitignore')),
  {
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      js,
      'simple-import-sort': simpleImportSort,
    },
    extends: ['js/recommended'],
    rules: {
      'simple-import-sort/imports': 'error',
      'object-shorthand': 'error',

      // Handled by TypeScript eslint
      'no-unused-vars': 'off',
    },
  },
  importIntegrityPlugin.configs.recommended,
  eslintPluginPrettierRecommended,
  tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      // Inline type specifiers only, which the rule above fixes toward
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[importKind='type']",
          message: 'Use inline type specifiers: import { type T }',
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },
  {
    // disable type-aware linting on JS files
    files: ['**/*.{jsx,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
];
