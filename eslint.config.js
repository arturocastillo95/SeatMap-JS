import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.pages/**', '**/test-results/**', '**/playwright-report/**', '**/backups/**', '**/.pnpm-store/**'] },
  { files: ['**/*.{js,mjs}'], ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node, PIXI: 'readonly' } },
    rules: {
      ...js.configs.recommended.rules,
      // Existing editor modules contain many unused compatibility arguments.
      // Keep correctness checks blocking without turning this into a formatting rewrite.
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  { files: ['src/services/*.js'], rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }] } },
  { files: ['renderer/tests/browser/*.js'], languageOptions: { globals: { api: 'readonly', r: 'readonly', ready: 'readonly', map: 'readonly', editor: 'readonly', fixtures: 'readonly', mountExample: 'readonly', unmountExample: 'readonly' } } },
];
