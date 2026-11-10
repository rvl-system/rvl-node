import { join } from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import importIntegrityPlugin from 'import-integrity-lint';
import tseslint from 'typescript-eslint';

// The monorepo pass: run with `-c eslint.config.mjs`, since ESLint otherwise
// lints each file under its own package's config
export default defineConfig([
  includeIgnoreFile(join(import.meta.dirname, '.gitignore')),
  {
    settings: {
      'import-integrity': {
        monorepoRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    // Registered with no rules, so a directive naming a package config's rule
    // resolves here. A plugin a package config adds is added here too
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
  },
  importIntegrityPlugin.configs.monorepoRecommended,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  {
    // The root's own config files, which no package lints
    files: ['*.mjs'],
    rules: {
      'prettier/prettier': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
]);
