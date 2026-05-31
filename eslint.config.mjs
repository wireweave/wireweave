// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier/flat'

export default tseslint.config(
  {
    ignores: ['**/dist', 'node_modules', '**/.vitepress/dist', '**/.vitepress/cache'],
  },

  // base: JS recommended
  js.configs.recommended,

  // TS recommended (type-checked rules enabled per-package; root stays type-unaware)
  ...tseslint.configs.recommended,

  // common rules
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Disable stylistic rules conflicting with Prettier — must be last
  prettier,
)
