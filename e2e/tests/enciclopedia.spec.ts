import { test, expect } from '@playwright/test';

test.describe('Enciclopédia', () => {
  test('exibe o grid de membros', async ({ page }) => {
    await page.goto('/enciclopedia');
    await expect(page.getByRole('heading', { name: /Membros & Robôs/i })).toBeVisible();

    const cards = page.locator('.ms-enc-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    // cada card traz nome e função
    await expect(cards.first().locator('.ms-enc-card__name')).not.toBeEmpty();
    await expect(cards.first().locator('.ms-enc-card__role')).not.toBeEmpty();
  });

  test('painel lateral de detalhe (desktop)', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no mobile o detalhe é uma tela cheia, não o painel lateral');
    await page.goto('/enciclopedia');
    // o painel abre com o primeiro registro já selecionado
    await expect(page.locator('.ms-enc__detail .ms-enc-detail__name')).toBeVisible();
    await expect(page.locator('.ms-enc__detail').getByText('» Sobre')).toBeVisible();
  });

  test('clicar num card faz deep-link para o registro', async ({ page }) => {
    await page.goto('/enciclopedia');
    const card = page.locator('.ms-enc-card').nth(1);
    const name = (await card.locator('.ms-enc-card__name').textContent())!.trim();

    await card.click();
    await expect(page).toHaveURL(/\/enciclopedia\/.+/);
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);

    // o deep-link sobrevive a um reload
    await page.reload();
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);
  });

  test('filtro por função reduz os resultados', async ({ page }) => {
    await page.goto('/enciclopedia');
    const cards = page.locator('.ms-enc-card');
    const countText = page.locator('.ms-enc__count');

    await expect(cards.first()).toBeVisible(); // aguarda o fetch
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);
    await expect(countText).toContainText(`${total}`);

    // filtra por "Robôs": só entradas do tipo robot.
    // O grid usa animação de saída/entrada (AnimatePresence), então esperamos
    // a lista ESTABILIZAR em vez de ler uma contagem intermediária.
    await page.getByRole('button', { name: 'Robôs', exact: true }).click();
    await expect
      .poll(async () => {
        const c = await cards.count();
        return c > 0 && c < total;
      }, { timeout: 7_000 })
      .toBe(true);

    const robots = await cards.count();
    await expect(countText).toContainText(`${robots}`);
    // todos os resultados são robôs
    const roles = await cards.locator('.ms-enc-card__role').allInnerTexts();
    expect(roles.every((r) => /Robô/i.test(r))).toBeTruthy();

    // "Todos" restaura
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(cards).toHaveCount(total);
  });
});
