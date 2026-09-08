import { test, expect } from '@playwright/test';
import { login, ADMIN } from './helpers';

/** Subconjunto do `SponsorDTO` usado por estes testes. */
interface Sponsor {
  id: string;
  name: string;
}

test.describe('Patrocinadores (site)', () => {
  test('o rodapé lista os patrocinadores do banco', async ({ page }) => {
    await page.goto('/');
    // o seed cadastra FIEMG como patrocínio principal
    await expect(page.locator('.ms-footer__credit')).toContainText('Apoio:');
    await expect(page.locator('.ms-footer__credit')).toContainText('FIEMG');
  });

  test('a Home exibe a faixa de patrocinadores', async ({ page }) => {
    await page.goto('/');
    const strip = page.locator('.ms-sponsors');
    await expect(strip).toContainText('Patrocinadores e parceiros');
    await expect(strip).toContainText('FIEMG');
    // o patrocinador com site vira link externo
    const fiemg = strip.locator('a.ms-sponsors__card', { hasText: 'FIEMG' });
    await expect(fiemg).toHaveAttribute('target', '_blank');
    await expect(fiemg).toHaveAttribute('rel', /noopener/);
  });
});

/**
 * Os passos criam um patrocinador, conferem que ele aparece no site e o removem.
 * Rodam em ordem (serial) num único worker e só no desktop: o registro é estado
 * global do site e os dois projetos rodam em paralelo. O afterAll garante a
 * limpeza mesmo quando algum passo falha.
 */
test.describe('Patrocinadores (painel)', () => {
  test.describe.configure({ mode: 'serial' });

  const RUN = Date.now().toString(36);
  const NAME = `Patrocinador e2e ${RUN}`;

  test.afterAll(async ({ playwright }, workerInfo) => {
    if (workerInfo.project.name === 'mobile') return;
    const ctx = await playwright.request.newContext({ baseURL: workerInfo.project.use.baseURL });
    try {
      const auth = await ctx.post('/api/admin/auth/login', {
        data: { email: ADMIN.email, password: ADMIN.password },
      });
      if (!auth.ok()) return;
      const sponsors = (await (await ctx.get('/api/admin/sponsors')).json()) as Sponsor[];
      for (const s of sponsors.filter((x) => x.name === NAME)) {
        await ctx.delete(`/api/admin/sponsors/${s.id}`);
      }
    } finally {
      await ctx.dispose();
    }
  });

  test('cria um patrocinador pelo painel', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'muda estado global do site; roda só no desktop');

    await login(page);
    await page.goto('/admin/patrocinadores');
    await expect(page.getByRole('heading', { name: 'Patrocinadores' })).toBeVisible();

    await page.getByRole('button', { name: /Novo patrocinador/i }).click();
    await page.getByLabel('Nome').fill(NAME);
    await page.getByLabel('Nível').selectOption({ label: 'Parceiro' });
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Patrocinador salvo.')).toBeVisible();
    const row = page.locator('.ms-adm__table tr', { hasText: NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Parceiro');
  });

  test('o patrocinador novo aparece na Home e no rodapé', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'muda estado global do site; roda só no desktop');

    await page.goto('/');
    const strip = page.locator('.ms-sponsors');
    await expect(strip).toContainText(NAME);
    // sem site cadastrado, entra como texto e não como link
    await expect(strip.locator('span.ms-sponsors__card', { hasText: NAME })).toHaveCount(1);
    await expect(strip.locator('a.ms-sponsors__card', { hasText: NAME })).toHaveCount(0);
    await expect(page.locator('.ms-footer__credit')).toContainText(NAME);
  });

  test('remove o patrocinador criado', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'muda estado global do site; roda só no desktop');

    await login(page);
    await page.goto('/admin/patrocinadores');

    const row = page.locator('.ms-adm__table tr', { hasText: NAME });
    await row.locator('.ms-btn--danger').click();
    await page.getByRole('button', { name: 'Excluir' }).click();

    await expect(page.getByText('Patrocinador removido.')).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(NAME)).toHaveCount(0);
  });
});
