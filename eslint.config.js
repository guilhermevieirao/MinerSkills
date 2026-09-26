import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

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
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    // CommonJS (scripts que carregam o Playwright do workspace)
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
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
            'MemberExpression[property.name=/^(\\$queryRaw|\\$executeRaw|\\$queryRawUnsafe|\\$executeRawUnsafe)$/]',
          message:
            'SQL cru quebra a portabilidade SQLite<->Postgres. Use a API do Prisma Client.',
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Acessibilidade verificada no lint, não só nos 6 testes de a11y.spec.ts
      ...jsxA11y.flatConfigs.recommended.rules,
      // Foco no primeiro campo de um diálogo recém-aberto é o comportamento esperado
      // (WAI-ARIA dialog); a regra proíbe qualquer autoFocus.
      'jsx-a11y/no-autofocus': 'off',
      // `role="list"` em <ul> sem marcador: o Safari/VoiceOver perde a semântica de lista com list-style: none
      'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
      // Vídeos enviados pela equipe não têm faixa de legenda para oferecer.
      'jsx-a11y/media-has-caption': 'off',
    },
  },
);
