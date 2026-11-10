import { join } from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import importIntegrityPlugin from 'import-integrity-lint';
import tseslint from 'typescript-eslint';

export default defineConfig([
  includeIgnoreFile(join(import.meta.dirname, '.gitignore')),
  globalIgnores(['dist/**/*']),
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
  {
    // The client runs in the browser
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    settings: {
      'import-integrity': {
        packageRootDir: import.meta.dirname,
      },
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
]);
