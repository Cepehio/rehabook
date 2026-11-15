/** Bendra ESLint 10 konfigūracija React ir Node kodui. */
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/**',
      '**/node_modules/**',
      'server/logs/**',
      'server/outbox/**',
      'server/config-tests/.tmp-env-*/**',
      'server/prisma/migrations/**',
      '**/package-lock.json',
    ],
  },

  js.configs.recommended,

  // ─── Frontend (React/JSX, naršyklė) ───
  // JSX žymėse naudojami komponentai laikomi panaudotais kintamaisiais (ESLint ≥ 9),
  // todėl atskiro React įskiepio nereikia.
  {
    files: ['src/**/*.{js,jsx}', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ─── Konfigūracijos failai (Node kontekstas) ───
  {
    files: ['vite.config.js', 'vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // ─── Backend (Node, Express) ───
  {
    files: ['server/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' }],
    },
  },

  prettier,
];
