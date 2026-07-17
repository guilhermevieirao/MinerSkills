import { test, expect } from '@playwright/test';

/** Todas as páginas públicas devem renderizar com o conteúdo do seed. */

test.describe('Páginas públicas', () => {
  test('landing exibe hero, seções e CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MinerSkills/);
    await expect(page.getByRole('heading', { name: 'MINERSKILLS', level: 1 })).toBeVisible();
    await expect(page.getByText('#10019 · FIRST Robotics Competition')).toBeVisible();
    // seções institucionais
    await expect(page.getByRole('heading', { name: /Quem Somos/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /FRC · FIRST · STEM/i })).toBeVisible();
    // conteúdo real da equipe
    await expect(page.getByText(/Rising All-Star/i).first()).toBeVisible();
  });

  test('história exibe a timeline', async ({ page }) => {
    await page.goto('/historia');
    await expect(page.getByRole('heading', { name: /Nossa História/i })).toBeVisible();
    const items = page.locator('.ms-timeline__item');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
    // os marcos vêm ordenados por ano
    const years = await items.locator('.ms-timeline__year').allInnerTexts();
    const nums = years.map(Number);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  test('blog lista posts publicados e abre um post', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: /Blog da Mina/i })).toBeVisible();
    const cards = page.locator('.ms-blog__card');
    await expect(cards.first()).toBeVisible();

    const title = await cards.first().locator('.ms-blog__title').textContent();
    await cards.first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);
    await expect(page.locator('.ms-post__title')).toHaveText(title!.trim());
    await expect(page.locator('.ms-post__content')).toBeVisible();
  });

  test('galeria exibe fotos e abre o lightbox', async ({ page }) => {
    await page.goto('/galeria');
    await expect(page.getByRole('heading', { name: 'Galeria' })).toBeVisible();
    const items = page.locator('.ms-gallery__item');
    await expect(items.first()).toBeVisible();

    await items.first().click();
    await expect(page.locator('.ms-lightbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ms-lightbox')).toBeHidden();
  });

  test('prêmios exibe conquistas', async ({ page }) => {
    await page.goto('/premios');
    await expect(page.getByRole('heading', { name: /Prêmios & Conquistas/i })).toBeVisible();
    await expect(page.getByText(/Rising All-Star/i).first()).toBeVisible();
  });

  test('agenda exibe eventos', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
    await expect(page.locator('.ms-event').first()).toBeVisible();
  });

  test('como entrar exibe as etapas do processo seletivo', async ({ page }) => {
    await page.goto('/como-entrar');
    await expect(page.getByRole('heading', { name: /Como Entrar na MinerSkills/i })).toBeVisible();
    const steps = page.locator('.ms-join-step');
    await expect(steps.first()).toBeVisible(); // aguarda o fetch dos blocos
    expect(await steps.count()).toBe(4);
    await expect(page.getByRole('heading', { name: 'Requisitos' })).toBeVisible();
  });

  test('rodapé exibe os links de redes sociais', async ({ page }) => {
    await page.goto('/');
    const icons = page.locator('.ms-footer__icons a');
    await expect(icons.first()).toBeVisible();
    expect(await icons.count()).toBeGreaterThanOrEqual(4);

    const hrefs = await icons.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.some((h) => h?.includes('instagram'))).toBeTruthy();
    expect(hrefs.some((h) => h?.includes('linkedin'))).toBeTruthy();
    expect(hrefs.some((h) => h?.includes('youtube'))).toBeTruthy();
    // links externos devem abrir com segurança
    const rels = await icons.evaluateAll((els) => els.map((e) => e.getAttribute('rel')));
    expect(rels.every((r) => r?.includes('noopener'))).toBeTruthy();
  });

  test('rota inexistente mostra o 404 temático', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.locator('.ms-404__code')).toHaveText('404');
    await expect(page.getByRole('link', { name: /Voltar ao início/i })).toBeVisible();
  });

  test('não há emojis no conteúdo renderizado (usa biblioteca de ícones)', async ({ page }) => {
    // © ® ™ são símbolos tipográficos legítimos, não emojis — embora o Unicode
    // os classifique como Extended_Pictographic.
    const TYPOGRAPHIC = new Set(['©', '®', '™']);

    for (const path of ['/', '/historia', '/blog', '/premios', '/como-entrar', '/agenda']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const text = await page.locator('body').innerText();
      const found = [...text.matchAll(/\p{Extended_Pictographic}/gu)]
        .map((m) => m[0])
        .filter((c) => !TYPOGRAPHIC.has(c));
      expect(found, `emoji encontrado em ${path}: ${JSON.stringify(found)}`).toEqual([]);
    }
    // os ícones são SVGs (lucide-react), não caracteres
    await page.goto('/');
    expect(await page.locator('svg').count()).toBeGreaterThan(0);
  });
});
