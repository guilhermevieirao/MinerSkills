import { defineConfig } from 'vitest/config';

// Testes puros do front (lib/, styles/): sem DOM, sem servidor. Componentes
// continuam cobertos pela suíte e2e.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
