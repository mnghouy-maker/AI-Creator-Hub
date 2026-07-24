// Flat ESLint config shared across the monorepo (ESLint 9). Individual apps can
// extend this with framework-specific rules (Next.js, NestJS) in their own config.
// Kept intentionally lean here — correctness rules over stylistic ones, since
// Prettier owns formatting.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/*.generated.*'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
