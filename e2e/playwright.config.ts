import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// .env ÚNICO da raiz
loadDotenv({ path: resolve(root, '.env') });

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5273';
const API_PORT = process.env.E2E_API_PORT ?? '3101';
const DB_URL = process.env.E2E_DATABASE_URL ?? 'file:../data/e2e.db';
const WEB_PORT = new URL(BASE_URL).port || '5273';

// Por padrão a suíte roda no SQLite isolado. Para provar a portabilidade,
// pode-se rodar a MESMA suíte no PostgreSQL (ver docs/database.md):
//   E2E_DATABASE_PROVIDER=postgresql E2E_ALLOW_POSTGRES=1 \
//   E2E_DATABASE_URL="postgresql://…" npm run test:e2e
const DB_PROVIDER = process.env.E2E_DATABASE_PROVIDER ?? 'sqlite';

/**
 * Os servidores de e2e sobem em PORTAS PRÓPRIAS (3101/5273) para não
 * colidirem com o `npm run dev` (3001/5173) e para nunca tocarem no
 * banco de desenvolvimento. O banco de testes é resetado e populado
 * pelo script `db:prepare` antes do Playwright iniciar.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: [
    {
      // API apontando para o banco de testes
      command: 'npm run dev -w apps/api',
      cwd: root,
      port: Number(API_PORT),
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_PROVIDER: DB_PROVIDER,
        DATABASE_URL: DB_URL,
        API_PORT,
        WEB_ORIGIN: BASE_URL,
        SEED_MODE: 'test',
        // limites de rate-limit generosos para não derrubar a suíte
        RATE_LIMIT_MAX: '10000',
        RATE_LIMIT_FORUM_MAX: '1000',
        RATE_LIMIT_QUIZ_MAX: '1000',
      },
    },
    {
      // Front-end com proxy apontando para a API de testes
      command: `npm run dev -w apps/web -- --port ${WEB_PORT} --strictPort`,
      cwd: root,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
      env: {
        VITE_DEV_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
