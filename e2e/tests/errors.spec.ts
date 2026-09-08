import { test, expect } from '@playwright/test';

/**
 * Estados de erro e carregamento das páginas públicas, rota inexistente e a
 * navegação entre chunks lazy (react-router `lazy`): a troca de página nunca
 * recarrega o documento.
 */

declare global {
  interface Window {
    /** Marcador gravado pelo teste: só sobrevive se o documento NÃO recarregar. */
    __msSpaMarker?: string;
  }
}

test.describe('Erros e carregamento', () => {
  test('API fora do ar mostra "Tentar novamente" e a nova tentativa recupera a página', async ({
    page,
  }) => {
    await page.route('**/api/awards', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/premios');
    await expect(
      page.getByRole('heading', { name: /Prêmios & Conquistas/i }),
    ).toBeVisible();

    // o TanStack Query tenta mais duas vezes (com espera crescente) antes de desistir
    const retry = page.getByRole('button', { name: 'Tentar novamente' });
    await expect(retry).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.ms-award-card, .ms-award-hero')).toHaveCount(0);

    // a API "volta": a nova tentativa refaz a consulta e os prêmios aparecem
    await page.unroute('**/api/awards');
    await retry.click();
    await expect(page.getByText(/Rising All-Star/i).first()).toBeVisible();
    await expect(retry).toBeHidden();
  });

  test('blog exibe skeleton enquanto os posts carregam', async ({ page }) => {
    await page.route('**/api/posts**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto('/blog');

    // placeholder primeiro; os cards só quando a resposta (atrasada) chega
    await expect(page.locator('.ms-skeleton').first()).toBeVisible();
    await expect(page.locator('.ms-blog__card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.ms-skeleton')).toHaveCount(0);
  });

  test('rota inexistente mostra o 404 temático', async ({ page }) => {
    await page.goto('/rota-inexistente');
    await expect(page.locator('.ms-404__code')).toHaveText('404');
    await expect(page.getByRole('link', { name: /Voltar ao início/i })).toBeVisible();
    // a tela de erro não deve ser indexada
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });

  test('navegar para uma página lazy não recarrega o documento', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'MINERSKILLS', level: 1 }),
    ).toBeVisible();

    // Um reload de verdade cria outro documento e apaga o marcador.
    await page.evaluate(() => {
      window.__msSpaMarker = 'ok';
    });

    // no mobile a navegação fica no drawer
    if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Blog', exact: true })
      .click();

    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole('heading', { name: /Blog da Mina/i })).toBeVisible();
    await expect(page).toHaveTitle(/^Blog · MinerSkills/);
    expect(await page.evaluate(() => window.__msSpaMarker)).toBe('ok');
  });
});
