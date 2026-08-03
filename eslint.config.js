import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

/**
 * Flat config.
 *
 * Two deliberate choices:
 *  - Markdown is not linted. Authored lesson content is prose, and a tool that
 *    reflows it does more harm than good.
 *  - eslint-plugin-vue is used at `flat/essential`, not `flat/recommended`.
 *    The extra layers are stylistic, and formatting belongs to Prettier; two
 *    tools with opinions about line breaks only produce noise.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/docs/.vitepress/cache/**',
      'native/**',
      'apps/docs/public/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // The single explorer component is already named unambiguously; the
      // multi-word rule adds nothing here.
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    files: ['**/*.mjs', '*.config.ts', 'apps/docs/.vitepress/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },

  {
    // The Anki build script is a CLI: printing is its job.
    files: ['anki/scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
);
