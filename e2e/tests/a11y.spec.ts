import { test, expect, type Page } from '@playwright/test';

/**
 * Acessibilidade por teclado: skip link, armadilhas de foco (menu mobile e
 * lightbox), anúncio de rota, papéis ARIA corrigidos e ids únicos nos SVGs.
 */

/**
 * Largura a partir da qual a navbar mostra o menu completo (`$bp-lg` em
 * `_mixins.scss`); abaixo dela existem o botão de menu e o drawer.
 */
const FULL_MENU_MIN_WIDTH = 1024;

/** Verdadeiro quando o elemento focado é o alvo do seletor ou está dentro dele. */
async function focusIsInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const active = document.activeElement;
    return !!root && !!active && root.contains(active);
  }, selector);
}

test.describe('Acessibilidade', () => {
  test('skip link é o primeiro focável e leva ao conteúdo', async ({ page }) => {
    await page.goto('/');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeAttached();

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    await expect.poll(() => focusIsInside(page, '#conteudo')).toBe(true);
  });

  test('menu mobile prende o foco, fecha com Escape e devolve o foco ao botão', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, `o botão de menu só existe abaixo de ${FULL_MENU_MIN_WIDTH}px`);
    await page.goto('/');
    const burger = page.getByRole('button', { name: 'Abrir menu' });
    await burger.click();

    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await expect.poll(() => focusIsInside(page, '#ms-mobilenav')).toBe(true);

    // Mais tabs do que itens no menu: o ciclo precisa dar a volta sem escapar.
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      expect(await focusIsInside(page, '#ms-mobilenav'), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await focusIsInside(page, '#ms-mobilenav'), 'Shift+Tab').toBe(true);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(burger).toBeFocused();
  });

  test('lightbox prende o foco e devolve o foco à foto que o abriu', async ({
    page,
    isMobile,
  }) => {
    test.skip(!!isMobile, 'o comportamento não depende do viewport; coberto no desktop');
    await page.goto('/galeria');
    const first = page.locator('.ms-gallery__item').first();
    await expect(first).toBeVisible();
    await first.click();

    const lightbox = page.locator('.ms-lightbox');
    await expect(lightbox).toBeVisible();
    await expect.poll(() => focusIsInside(page, '.ms-lightbox')).toBe(true);

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await focusIsInside(page, '.ms-lightbox'), `Tab ${i + 1}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('filtros sem papéis ARIA indevidos', async ({ page }) => {
    await page.goto('/equipe');
    await expect(page.locator('.ms-enc__filters')).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toHaveCount(0);
  });

  test('aria-expanded do botão de menu acompanha o drawer', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, `o botão de menu só existe abaixo de ${FULL_MENU_MIN_WIDTH}px`);
    await page.goto('/');
    const burger = page.getByRole('button', { name: 'Abrir menu' });
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(burger).toHaveAttribute('aria-controls', 'ms-mobilenav');

    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#ms-mobilenav')).toBeVisible();

    await page.getByRole('button', { name: 'Fechar menu' }).click();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#ms-mobilenav')).toBeHidden();
  });

  test('troca de rota anuncia o título e leva o foco ao conteúdo', async ({ page }) => {
    await page.goto('/');
    const announcer = page.locator('.ms-route-announcer');
    await expect(announcer).toBeAttached();
    // Carga inicial: nada a anunciar (o leitor de tela já lê o documento inteiro).
    expect(((await announcer.textContent()) ?? '').trim()).toBe('');

    // O rodapé existe nos dois projetos (a navbar some no mobile).
    await page.locator('.ms-footer__link', { hasText: 'História' }).click();
    await expect(page).toHaveURL(/\/historia$/);
    await expect
      .poll(async () => (await announcer.textContent())?.trim() ?? '')
      .not.toBe('');
    await expect.poll(() => focusIsInside(page, '#conteudo')).toBe(true);
  });
});
