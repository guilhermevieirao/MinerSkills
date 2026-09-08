import { test, expect, type APIRequestContext } from '@playwright/test';
import { login, ADMIN, createApprovedTopic } from './helpers';

/**
 * Denúncias e honeypot do fórum.
 *
 * Cada teste cria o próprio tópico (aprovado via API) e denuncia só ele, então
 * nenhum depende da lista compartilhada nem da ordem de execução. Os dois
 * projetos rodam em paralelo sobre o mesmo banco, por isso os títulos levam o
 * nome do projeto. A dedupe é por alvo + IP: alvos diferentes não colidem.
 */

/** Subconjunto do `ForumReportDTO` usado aqui. */
interface ReportRow {
  id: string;
  reason: string;
  status: string;
  target: { type: 'topic' | 'reply'; id: string; topicId: string; topicTitle: string };
}

function stamp(): string {
  return `${Date.now()}`.slice(-6) + Math.floor(Math.random() * 1000);
}

/** Título único por projeto e por execução. */
function uniqueTitle(prefix: string): string {
  return `${prefix} ${test.info().project.name} ${stamp()}`;
}

/** Autentica o contexto de requisições como admin (cookie de sessão). */
async function loginApi(request: APIRequestContext): Promise<void> {
  const auth = await request.post('/api/admin/auth/login', {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(auth.ok()).toBeTruthy();
}

async function reportsFor(request: APIRequestContext, topicId: string): Promise<ReportRow[]> {
  const resp = await request.get('/api/admin/forum/reports');
  expect(resp.ok()).toBeTruthy();
  const rows = (await resp.json()) as ReportRow[];
  return rows.filter((r) => r.target.topicId === topicId);
}

test.describe('Fórum: denúncias e honeypot', () => {
  test('visitante denuncia um tópico pela página e a denúncia chega ao painel', async ({
    page,
  }) => {
    const title = uniqueTitle('Topico denunciavel');
    const topicId = await createApprovedTopic(page, title);

    await page.goto(`/forum/${topicId}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // o botão do tópico (cada resposta tem o seu; este tópico não tem respostas)
    const op = page.locator('.ms-topic__op');
    await op.getByRole('button', { name: 'Denunciar' }).click();
    await op.getByLabel('Motivo').selectOption('ofensivo');
    await op.getByLabel('Detalhes (opcional)').fill('Denúncia enviada pelo teste automatizado.');
    await op.getByRole('button', { name: 'Enviar denúncia' }).click();

    await expect(page.getByText('Denúncia registrada. Obrigado.')).toBeVisible();
    // o mini-formulário fecha e o botão volta
    await expect(op.getByLabel('Motivo')).toBeHidden();
    await expect(op.getByRole('button', { name: 'Denunciar' })).toBeVisible();

    // gravada como aberta, com o motivo escolhido (o setup já autenticou page.request)
    const rows = await reportsFor(page.request, topicId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reason).toBe('ofensivo');
    expect(rows[0]?.status).toBe('open');
    expect(rows[0]?.target.type).toBe('topic');
  });

  test('admin resolve a denúncia na aba Denúncias', async ({ page }) => {
    const title = uniqueTitle('Topico com denuncia');
    const topicId = await createApprovedTopic(page, title);
    const sent = await page.request.post(`/api/forum/topics/${topicId}/report`, {
      data: { reason: 'spam', details: 'Parece propaganda.' },
    });
    expect(sent.status()).toBe(202);

    await login(page);
    await page.goto('/admin/forum');
    await page.getByRole('button', { name: /Denúncias/ }).click();

    const item = page.locator('.ms-report-item', { hasText: title });
    await expect(item).toBeVisible();
    await expect(item).toContainText('Spam ou propaganda');
    await expect(item).toContainText('Parece propaganda.');
    await expect(item.getByRole('link', { name: 'Ver tópico' })).toHaveAttribute(
      'href',
      `/forum/${topicId}`,
    );

    await item.getByRole('button', { name: 'Resolver' }).click();
    await expect(page.getByText('Denúncia resolvida.')).toBeVisible();
    await expect(item).toBeHidden();

    await page.getByRole('button', { name: 'Resolvidas' }).click();
    await expect(item).toBeVisible();
    await expect(item).toContainText('Resolvida');
    await expect(item.getByRole('button', { name: 'Resolver' })).toHaveCount(0);

    // o tópico continua aprovado: resolver não mexe no conteúdo
    const topic = await page.request.get(`/api/forum/topics/${topicId}`);
    expect(topic.ok()).toBeTruthy();
  });

  test('honeypot preenchido responde 202 e o tópico não entra na fila', async ({ request }) => {
    const title = uniqueTitle('Robo no forum');
    const resp = await request.post('/api/forum/topics', {
      data: {
        nickname: 'RoboSpam',
        title,
        body: 'Mensagem automática com o campo-armadilha preenchido.',
        website: 'x',
      },
    });
    expect(resp.status()).toBe(202);

    await loginApi(request);
    const queue = (await (await request.get('/api/admin/forum/moderation')).json()) as {
      topics: { title: string }[];
    };
    expect(queue.topics.some((t) => t.title === title)).toBe(false);
    const all = (await (await request.get('/api/admin/forum/topics')).json()) as {
      title: string;
    }[];
    expect(all.some((t) => t.title === title)).toBe(false);
  });

  test('a mesma origem só conta uma denúncia por alvo', async ({ page }) => {
    const title = uniqueTitle('Topico denunciado duas vezes');
    const topicId = await createApprovedTopic(page, title);

    for (let i = 0; i < 2; i++) {
      const resp = await page.request.post(`/api/forum/topics/${topicId}/report`, {
        data: { reason: 'off-topic' },
      });
      expect(resp.status()).toBe(202);
      expect(await resp.json()).toEqual({ message: 'Denúncia registrada.' });
    }

    const rows = await reportsFor(page.request, topicId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reason).toBe('off-topic');
  });

  test('só conteúdo aprovado pode ser denunciado', async ({ request }) => {
    const title = uniqueTitle('Topico pendente');
    const created = await request.post('/api/forum/topics', {
      data: { nickname: 'SetupBot', title, body: 'Ainda aguardando moderação.' },
    });
    expect(created.status()).toBe(202);

    await loginApi(request);
    const all = (await (await request.get('/api/admin/forum/topics')).json()) as {
      id: string;
      title: string;
    }[];
    const pending = all.find((t) => t.title === title);
    expect(pending).toBeTruthy();

    const resp = await request.post(`/api/forum/topics/${pending!.id}/report`, {
      data: { reason: 'spam' },
    });
    expect(resp.status()).toBe(404);
  });
});
