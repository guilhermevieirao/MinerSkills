import { test, expect } from '@playwright/test';

/** Subconjunto do `MemberTagDTO` usado por estes testes. */
interface MemberTag {
  key: string;
  label: string;
  usageCount: number;
}

declare global {
  interface Window {
    /** Marcador gravado pelo teste: só sobrevive se o documento NÃO recarregar. */
    __msSpaMarker?: string;
  }
}

test.describe('Equipe', () => {
  test('exibe o grid de membros', async ({ page }) => {
    await page.goto('/equipe');
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
    await page.goto('/equipe');
    // o painel abre com o primeiro registro já selecionado
    await expect(page.locator('.ms-enc__detail .ms-enc-detail__name')).toBeVisible();
    // o marcador decorativo antes de "Sobre" não é contrato — só o rótulo da seção
    await expect(
      page.locator('.ms-enc__detail').getByText(/^[»\s]*Sobre$/),
    ).toBeVisible();
  });

  test('clicar num card faz deep-link para o registro', async ({ page }) => {
    await page.goto('/equipe');
    const card = page.locator('.ms-enc-card').nth(1);
    const name = (await card.locator('.ms-enc-card__name').textContent())!.trim();

    await card.click();
    await expect(page).toHaveURL(/\/equipe\/.+/);
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);

    // o deep-link sobrevive a um reload
    await page.reload();
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);
  });

  test('clicar num membro não recarrega nem remonta a página', async ({
    page,
    request,
  }) => {
    // Primeira tag do banco em uso — os chips seguem a mesma ordem, logo após "Todos".
    const tags = (await (await request.get('/api/member-tags')).json()) as MemberTag[];
    const tag = tags.find((t) => t.usageCount > 0);
    if (!tag) throw new Error('o seed precisa cadastrar ao menos uma tag em uso');
    // quantos cards o filtro deve exibir — a mesma consulta que a página faz
    const filtered = (await (
      await request.get(`/api/encyclopedia?tag=${tag.key}`)
    ).json()) as unknown[];
    expect(filtered.length).toBeGreaterThan(0);

    await page.goto('/equipe');
    const cards = page.locator('.ms-enc-card');
    await expect(cards.first()).toBeVisible();

    // Um reload de verdade cria outro documento e apaga o marcador.
    await page.evaluate(() => {
      window.__msSpaMarker = 'ok';
    });

    const chip = page
      .locator('.ms-enc__filters')
      .getByRole('button', { name: tag.label, exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    // o grid anima a troca de filtro: espera a lista estabilizar
    await expect.poll(() => cards.count(), { timeout: 7_000 }).toBe(filtered.length);

    const card = cards.first();
    const name = (await card.locator('.ms-enc-card__name').textContent())!.trim();
    await card.click();
    await expect(page).toHaveURL(/\/equipe\/.+/);
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);

    // sem reload: o marcador sobreviveu à navegação
    expect(await page.evaluate(() => window.__msSpaMarker)).toBe('ok');
    // sem remount: o filtro continua ativo e o grid não voltou para "Todos"
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(filtered.length);
  });

  test('rota antiga /enciclopedia redireciona para /equipe', async ({
    page,
    request,
  }) => {
    await page.goto('/enciclopedia');
    await expect(page).toHaveURL(/\/equipe$/);
    await expect(page.getByRole('heading', { name: /Membros & Robôs/i })).toBeVisible();

    // o slug é preservado no redirect
    const entries = (await (await request.get('/api/encyclopedia')).json()) as {
      slug: string;
      name: string;
    }[];
    const first = entries[0];
    if (!first)
      throw new Error('o seed precisa cadastrar ao menos um registro na equipe');
    await page.goto(`/enciclopedia/${first.slug}`);
    await expect(page).toHaveURL(new RegExp(`/equipe/${first.slug}$`));
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(first.name);
  });

  test('os filtros refletem as tags cadastradas', async ({ page, request }) => {
    // Tags criadas pelos specs do painel (outro projeto, mesmo banco) podem ser apagadas
    // entre esta leitura e a renderização dos chips: só as do seed contam aqui.
    const tags = (
      (await (await request.get('/api/member-tags')).json()) as MemberTag[]
    ).filter((t) => !/\b(e2e|duplicada)\b/i.test(t.label));
    expect(tags.length).toBeGreaterThan(0);

    await page.goto('/equipe');
    const filters = page.locator('.ms-enc__filters');
    await expect(
      filters.getByRole('button', { name: 'Todos', exact: true }),
    ).toBeVisible();
    // uma chip por tag do banco, com o rótulo cadastrado pelo admin
    for (const tag of tags) {
      await expect(
        filters.getByRole('button', { name: tag.label, exact: true }),
      ).toBeVisible();
    }
    await expect(
      filters.getByRole('button', { name: 'Robôs', exact: true }),
    ).toBeVisible();
  });

  test('filtro por função reduz os resultados', async ({ page }) => {
    await page.goto('/equipe');
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
      .poll(
        async () => {
          const c = await cards.count();
          return c > 0 && c < total;
        },
        { timeout: 7_000 },
      )
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
