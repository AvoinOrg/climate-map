import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const sourceFiles = ['**/*.{js,jsx,ts,tsx,mjs,cjs}']

const cleanGlobals = (...globalSets) =>
  Object.fromEntries(
    globalSets.flatMap((globalSet) =>
      Object.entries(globalSet).map(([name, value]) => [name.trim(), value])
    )
  )

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    '.yarn/**',
    'agents/**',
    '.codex/**',
    '.tmp/**',
    '.codex-orch/**',
    '.dev/**',
    'coverage/**',
    'i18n/**',
    'public/**',
    '.tanstack/**',
    '.nitro/**',
    '.output/**',
    'dist/**',
    '.netlify/**',
    'src/routeTree.gen.ts',
    'legacy/**',
    'legacy/map/map.ts',
  ]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: {
      globals: cleanGlobals(globals.browser, globals.node, globals.jest),
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'utils/scripts/**/*.js',
      'utils/visual/**/*.js',
      'utils/test/energyAreas/*.cjs',
      '__tests__/utils/scripts/**/*.js',
      '__tests__/visual/**/*.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
])

export default eslintConfig
