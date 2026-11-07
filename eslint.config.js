import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import jsdoc from 'eslint-plugin-jsdoc'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/*.config.js',
    '**/*.config.ts',
    '**/*.vue',
    'scripts/**',
    'examples/**'
  ]),

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['e2e/*.ts']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },

  {
    plugins: {
      prettier: eslintPluginPrettier,
      jsdoc,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      ...eslintPluginPrettier.configs.recommended.rules,
      'prettier/prettier': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'never'],
      indent: 'off',
      'no-tabs': 'error',
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true
          }
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ArrowFunctionExpression: false }
        }
      ],
      'jsdoc/check-syntax': 'error',
      'jsdoc/no-bad-blocks': 'error',
      'jsdoc/no-blank-blocks': 'error',
      'jsdoc/require-asterisk-prefix': 'error',
      'jsdoc/sort-tags': 'error'
    }
  },

  {
    files: ['packages/*/tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off'
    }
  }
)
