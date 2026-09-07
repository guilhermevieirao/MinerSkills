import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from './helpers';

/** PNG 2x2 válido (RGB, sem alpha) — passa pelo file-type e pelo sharp. */
const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGPQvNnDxcXFwMXFpXmzBwAWsANZHsUVwgAAAABJRU5ErkJggg==',
  'base64',
);

/** Subconjunto do `AwardDTO` usado por estes testes. */
interface AwardRow {
  id: string;
  title: string;
  media: { id: string } | null;
}

/**
 * Cada teste cria a própria mídia e a vincula a um PRÊMIO novo, que é removido
 * ao final (mesmo quando uma asserção falha). Prêmios foram escolhidos como
 * "uso" porque nenhum outro spec assere a ordem ou a quantidade deles — a
 * galeria, por exemplo, tem ordem e contagem conferidas pelo gallery.spec.ts,
 * que roda em paralelo a este arquivo. A relação Award.media é SetNull: apagar
 * a mídia à força deixa o prêmio sem badge, e o teste confere isso também.
 */
test.describe.configure({ mode: 'serial' });

/**
 * Nomes únicos por execução, por projeto (desktop/mobile rodam em paralelo) e
 * por teste — a busca da biblioteca é por substring, então um nome nunca pode
 * estar contido no outro.
 */
function names(project: string, kind: 'ui' | 'api') {
  const suffix = `${kind === 'api' ? 'a' : ''}${project === 'mobile' ? 'm' : 'd'}`;
  const stamp = `${Date.now().toString().slice(-6)}${suffix}`;
  return {
    baseName: `e2e-media-${stamp}`,
    fileName: `e2e-media-${stamp}.png`,
    awardTitle: `Prêmio e2e ${stamp}`,
  };
}

async function uploadPng(request: APIRequestContext, fileName: string): Promise<string> {
  const resp = await request.post('/api/admin/media', {
    multipart: { file: { name: fileName, mimeType: 'image/png', buffer: PNG_2X2 } },
  });
  expect(resp.status()).toBe(201);
  return ((await resp.json()) as { id: string }).id;
}

async function createAward(
  request: APIRequestContext,
  title: string,
  mediaId: string,
): Promise<string> {
  const resp = await request.post('/api/admin/awards', {
    data: {
      title,
      description: 'Prêmio criado pela suíte e2e para testar a biblioteca de mídia.',
      event: 'Teste e2e',
      year: 2026,
      highlight: false,
      order: 999,
      mediaId,
    },
  });
  expect(resp.status()).toBe(201);
  return ((await resp.json()) as { id: string }).id;
}

async function findAward(request: APIRequestContext, id: string): Promise<AwardRow | undefined> {
  const resp = await request.get('/api/awards');
  expect(resp.ok()).toBeTruthy();
  return ((await resp.json()) as AwardRow[]).find((a) => a.id === id);
}

/** Limpeza: remove o prêmio e, se ainda existir, a mídia (à força). */
async function cleanup(request: APIRequestContext, awardId: string, mediaId: string) {
  await request.delete(`/api/admin/awards/${awardId}`);
  await request.delete(`/api/admin/media/${mediaId}?force=1`);
}

test.describe('Biblioteca de mídia', () => {
  test('alt, usos e exclusão em dois passos pelo painel', async ({ page }) => {
    const { baseName, fileName, awardTitle } = names(test.info().project.name, 'ui');

    // o cookie da sessão é compartilhado pelo contexto → page.request já está autenticado
    await login(page);
    const mediaId = await uploadPng(page.request, fileName);
    const awardId = await createAward(page.request, awardTitle, mediaId);

    try {
      // ── a biblioteca lista o arquivo e conta o uso ──
      await page.goto('/admin/midia');
      await expect(page.getByRole('heading', { name: 'Biblioteca de mídia' })).toBeVisible();
      await page.getByLabel('Buscar').fill(baseName);
      const card = page.locator('.ms-media__card', { hasText: fileName });
      await expect(card).toBeVisible();
      await expect(card.getByText('Usada em 1')).toBeVisible();

      // ── detalhes: alt + onde é usada ──
      await card.click();
      await expect(page.getByRole('heading', { name: 'Detalhes da mídia' })).toBeVisible();
      const usage = page.locator('.ms-media__usage');
      await expect(usage.getByText('Prêmios', { exact: true })).toBeVisible();
      await expect(usage.getByText(awardTitle)).toBeVisible();

      await page.getByLabel('Texto alternativo (alt)').fill('Alt e2e');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('Mídia atualizada.')).toBeVisible();

      // ── exclusão: 1º diálogo → API responde 409 → 2º diálogo (forçada) ──
      await page.getByRole('button', { name: 'Excluir', exact: true }).click();
      // o ConfirmDialog é o último modal aberto; seu botão também se chama "Excluir"
      await page.getByRole('button', { name: 'Excluir', exact: true }).last().click();
      await expect(page.getByText(/Mídia em uso em 1 item/)).toBeVisible();
      await page.getByRole('button', { name: 'Excluir mesmo assim' }).click();
      await expect(page.getByText('Mídia removida.')).toBeVisible();
      await expect(page.locator('.ms-media__card', { hasText: fileName })).toHaveCount(0);

      // o prêmio continua existindo, agora sem badge (SetNull)
      const award = await findAward(page.request, awardId);
      expect(award?.title).toBe(awardTitle);
      expect(award?.media).toBeNull();
    } finally {
      await cleanup(page.request, awardId, mediaId);
    }
  });

  test('API: DELETE sem force em mídia em uso responde 409 com o resumo por tipo', async ({
    page,
  }) => {
    const { fileName, awardTitle } = names(test.info().project.name, 'api');

    await login(page);
    const mediaId = await uploadPng(page.request, fileName);
    const awardId = await createAward(page.request, awardTitle, mediaId);

    try {
      // em uso → 409 e nada é apagado
      const blocked = await page.request.delete(`/api/admin/media/${mediaId}`);
      expect(blocked.status()).toBe(409);
      const body = (await blocked.json()) as {
        error: string;
        message: string;
        details: Record<string, number>;
      };
      expect(body.error).toBe('conflict');
      expect(body.message).toContain('Mídia em uso em 1 item');
      expect(body.details.award).toBe(1);

      const stillThere = await page.request.get(`/api/admin/media/${mediaId}/usage`);
      expect(stillThere.ok()).toBeTruthy();
      const usage = (await stillThere.json()) as { total: number; awards: { title: string }[] };
      expect(usage.total).toBe(1);
      expect(usage.awards.map((a) => a.title)).toEqual([awardTitle]);

      // forçada → 204, a mídia some da biblioteca e o prêmio fica sem badge
      const forced = await page.request.delete(`/api/admin/media/${mediaId}?force=1`);
      expect(forced.status()).toBe(204);
      const gone = await page.request.get(`/api/admin/media/${mediaId}/usage`);
      expect(gone.status()).toBe(404);
      expect((await findAward(page.request, awardId))?.media).toBeNull();
    } finally {
      await cleanup(page.request, awardId, mediaId);
    }
  });
});
