import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/dev-dist/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      'apps/api/prisma/schema.prisma',
      'e2e/playwright-report/**',
      'e2e/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Scripts de manutenção em Node puro (stamp-schema, generate-icons, prepare-db)
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prisma portabilidade: raw SQL quebra a troca SQLite<->Postgres
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[property.name=/^(\\$queryRaw|\\$executeRaw|\\$queryRawUnsafe|\\$executeRawUnsafe)$/]",
          message:
            'SQL cru quebra a portabilidade SQLite<->Postgres. Use a API do Prisma Client.',
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
