import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from './helpers';

/** Subconjunto do `SeasonDTO` usado por estes testes. */
interface SeasonRow {
  id: string;
  name: string;
  slug: string;
  year: number;
  game: string | null;
  summary: string | null;
  order: number;
  isCurrent: boolean;
  badge: { id: string } | null;
  robotsCount: number;
  awardsCount: number;
}

/** Subconjunto do `SeasonDetailDTO`. */
interface SeasonDetail extends SeasonRow {
  robots: { slug: string; name: string }[];
  awards: { title: string }[];
  events: { startsAt: string }[];
}

async function listSeasons(request: APIRequestContext): Promise<SeasonRow[]> {
  const resp = await request.get('/api/seasons');
  expect(resp.ok()).toBeTruthy();
  return (await resp.json()) as SeasonRow[];
}

test.describe('Temporadas', () => {
  test('lista as temporadas do seed e marca a atual', async ({ page }) => {
    await page.goto('/temporadas');
    await expect(page.getByRole('heading', { name: 'Temporadas', level: 1 })).toBeVisible();

    const cards = page.locator('.ms-season');
    const crescendo = cards.filter({ hasText: 'Crescendo' }).first();
    await expect(cards.filter({ hasText: 'Reefscape' }).first()).toBeVisible();
    await expect(crescendo).toBeVisible();
    await expect(crescendo).toContainText('2024');
    await expect(crescendo).toContainText(/\d+ robôs? · \d+ prêmios?/);

    // Exatamente uma temporada é a atual: a API garante numa transação, e o spec
    // do painel (que roda em paralelo) pode estar trocando qual é nesse instante.
    const current = page.locator('.ms-season--current');
    await expect(current).toHaveCount(1);
    await expect(current.getByText('Temporada atual')).toBeVisible();
  });

  test('expandir uma temporada mostra robôs e prêmios e leva ao robô', async ({ page }) => {
    await page.goto('/temporadas');
    const card = page.locator('.ms-season', { hasText: 'Crescendo' }).first();
    await card.getByRole('button', { name: 'Ver detalhes' }).click();
    await expect(card).toHaveClass(/ms-season--open/);
    await expect(page).toHaveURL(/[?&]t=crescendo/);

    const robots = card.locator('.ms-season__robot');
    await expect(robots.first()).toBeVisible();
    // exact: o resumo da temporada também cita o prêmio
    await expect(card.getByText('Rising All-Star Award', { exact: true })).toBeVisible();

    // o deep link (?t=) sobrevive a um reload
    await page.reload();
    await expect(page.locator('.ms-season--open', { hasText: 'Crescendo' })).toBeVisible();

    // o robô leva ao seu registro na página Equipe
    const name = (await robots.first().locator('.ms-season__robot-name').textContent())!.trim();
    await robots.first().click();
    await expect(page).toHaveURL(/\/equipe\/.+/);
    await expect(page.locator('.ms-enc-detail__name').first()).toHaveText(name);
  });

  test('GET /api/seasons/:slug devolve robôs, prêmios e eventos do ano', async ({ request }) => {
    const seasons = await listSeasons(request);
    const crescendo = seasons.find((s) => s.slug === 'crescendo');
    if (!crescendo) throw new Error('o seed precisa cadastrar a temporada Crescendo');
    expect(seasons.filter((s) => s.isCurrent)).toHaveLength(1);

    const resp = await request.get(`/api/seasons/${crescendo.slug}`);
    expect(resp.ok()).toBeTruthy();
    const detail = (await resp.json()) as SeasonDetail;
    expect(detail.year).toBe(2024);
    expect(detail.robots.length).toBeGreaterThan(0);
    expect(detail.robots).toHaveLength(crescendo.robotsCount);
    expect(detail.awards.some((a) => /Rising All-Star/.test(a.title))).toBeTruthy();
    expect(detail.awards).toHaveLength(crescendo.awardsCount);
    // só eventos publicados do ano civil da temporada
    expect(Array.isArray(detail.events)).toBeTruthy();
    for (const e of detail.events) {
      expect(new Date(e.startsAt).getUTCFullYear()).toBe(2024);
    }

    expect((await request.get('/api/seasons/nao-existe')).status()).toBe(404);
  });

  test('robôs e prêmios expõem a temporada vinculada', async ({ request }) => {
    const robots = (await (await request.get('/api/encyclopedia?kind=robot')).json()) as {
      seasonRef: { slug: string } | null;
    }[];
    expect(robots.some((r) => r.seasonRef?.slug === 'crescendo')).toBeTruthy();

    const awards = (await (await request.get('/api/awards')).json()) as {
      title: string;
      seasonRef: { name: string } | null;
    }[];
    const rising = awards.find((a) => /Rising All-Star/.test(a.title));
    expect(rising?.seasonRef?.name).toBe('Crescendo');
  });
});

/** Rede de segurança: a temporada original volta a ser a atual e a e2e some. */
async function restore(request: APIRequestContext, original: SeasonRow, e2eName: string) {
  const resp = await request.get('/api/admin/seasons');
  if (!resp.ok()) return;
  const seasons = (await resp.json()) as SeasonRow[];
  for (const s of seasons) {
    if (s.name === e2eName) await request.delete(`/api/admin/seasons/${s.id}`);
  }
  if (!seasons.find((s) => s.isCurrent && s.id === original.id)) {
    await request.put(`/api/admin/seasons/${original.id}`, {
      data: {
        name: original.name,
        year: original.year,
        game: original.game,
        summary: original.summary,
        badgeId: original.badge?.id ?? null,
        order: original.order,
        isCurrent: true,
      },
    });
  }
}

test.describe('Temporadas (painel)', () => {
  // Troca a temporada atual — estado global lido pelo site — por isso é serial
  // e roda só no desktop (os dois projetos executam em paralelo no mesmo banco).
  test.describe.configure({ mode: 'serial' });

  test('cria, marca como atual, restaura a original e exclui', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'altera a temporada atual (estado global); roda só no desktop');
    const stamp = Date.now().toString().slice(-6);
    const name = `Temporada e2e ${stamp}`;

    await login(page);
    const original = (await listSeasons(page.request)).find((s) => s.isCurrent);
    if (!original) throw new Error('o seed precisa marcar uma temporada como atual');

    try {
      await page.goto('/admin/temporadas');
      await expect(page.getByRole('heading', { name: 'Temporadas' })).toBeVisible();
      await page.getByRole('button', { name: /Nova temporada/i }).click();
      await page.getByLabel('Nome', { exact: true }).fill(name);
      await page.getByLabel('Ano', { exact: true }).fill('2031');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('Temporada salva.').first()).toBeVisible();

      const row = page.locator('.ms-adm__table tr', { hasText: name });
      const originalRow = page.locator('.ms-adm__table tr', { hasText: original.name });
      await expect(row).toBeVisible();
      await expect(row).toContainText('2031');
      await expect(row.locator('.ms-adm__status')).toHaveCount(0);
      await expect(originalRow.locator('.ms-adm__status')).toHaveCount(1);

      // marcar a nova como atual desmarca a anterior
      await row.locator('.ms-btn--ghost').click();
      await expect(page.getByRole('heading', { name: 'Editar temporada' })).toBeVisible();
      await page.getByLabel('Temporada atual').check();
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByRole('heading', { name: 'Editar temporada' })).toBeHidden();
      await expect(row.locator('.ms-adm__status')).toHaveCount(1);
      await expect(originalRow.locator('.ms-adm__status')).toHaveCount(0);

      // restaura a original como atual
      await originalRow.locator('.ms-btn--ghost').click();
      await expect(page.getByRole('heading', { name: 'Editar temporada' })).toBeVisible();
      await page.getByLabel('Temporada atual').check();
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByRole('heading', { name: 'Editar temporada' })).toBeHidden();
      await expect(originalRow.locator('.ms-adm__status')).toHaveCount(1);
      await expect(row.locator('.ms-adm__status')).toHaveCount(0);

      // exclui a temporada e2e
      await row.locator('.ms-btn--danger').click();
      await page.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByText('Temporada removida.').first()).toBeVisible();
      await expect(row).toHaveCount(0);
    } finally {
      await restore(page.request, original, name);
    }
  });
});
