import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

/**
 * Nenhuma tela rola na horizontal na menor largura suportada (320px): o
 * documento nunca fica mais largo que a viewport. Roda só no projeto desktop
 * (com a viewport reduzida aqui) — a regra não depende do dispositivo.
 */

const PUBLIC = [
  '/',
  '/historia',
  '/blog',
  '/galeria',
  '/equipe',
  '/quiz',
  '/forum',
  '/premios',
  '/temporadas',
  '/agenda',
  '/como-entrar',
  '/contato',
  '/rota-inexistente',
];

const ADMIN = [
  '/admin',
  '/admin/paginas',
  '/admin/blog',
  '/admin/galeria',
  '/admin/midia',
  '/admin/equipe',
  '/admin/equipe/tags',
  '/admin/temporadas',
  '/admin/premios',
  '/admin/forum',
  '/admin/quiz',
  '/admin/mensagens',
  '/admin/agenda',
  '/admin/patrocinadores',
  '/admin/social',
  '/admin/configuracoes',
  '/admin/administradores',
  '/admin/conta',
];

async function overflow(page: Page): Promise<number> {
  // espera o conteúdo da API chegar (esqueletos têm a largura do layout final)
  await page.waitForLoadState('networkidle').catch(() => undefined);
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('Responsividade em 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test.beforeEach(({ isMobile }, info) => {
    test.skip(!!isMobile || info.project.name !== 'chromium', 'roda uma vez, no desktop');
  });

  test('páginas públicas não rolam na horizontal', async ({ page }) => {
    for (const route of PUBLIC) {
      await page.goto(route);
      expect(await overflow(page), route).toBeLessThanOrEqual(0);
    }
  });

  test('telas do painel não rolam na horizontal', async ({ page }) => {
    await login(page);
    for (const route of ADMIN) {
      await page.goto(route);
      await page.locator('.ms-admin__sidebar').waitFor({ state: 'attached' });
      expect(await overflow(page), route).toBeLessThanOrEqual(0);
    }
  });
});
