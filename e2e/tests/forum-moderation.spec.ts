import { test, expect } from '@playwright/test';
import { login, createApprovedTopic } from './helpers';

test.describe('Fórum + moderação', () => {
  test('tópico novo fica invisível até o admin aprovar', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const title = `Duvida de teste ${stamp}`;
    const nickname = `Visitante${stamp}`;

    // ── visitante cria o tópico ──
    await page.goto('/forum');
    await page.getByRole('button', { name: /Novo tópico/i }).click();
    await page.getByLabel('Apelido').fill(nickname);
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Mensagem').fill('Esta é uma mensagem de teste automatizado.');
    await page.getByRole('button', { name: /Enviar/i }).click();

    await expect(page.getByText(/aparecerá após a moderação/i)).toBeVisible();

    // ── não aparece publicamente ──
    await page.reload();
    await expect(page.getByText(title)).toBeHidden();

    // ── admin aprova ──
    await login(page);
    await page.goto('/admin/forum');
    const item = page.locator('.ms-mod-item', { hasText: title });
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: /Aprovar/i }).click();
    await expect(page.getByText(/Tópico aprovado/i)).toBeVisible();

    // ── agora aparece publicamente ──
    await page.goto('/forum');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('conteúdo malicioso é neutralizado (XSS)', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const title = `XSS ${stamp}`;

    // envia payload via API (mais direto que pela UI)
    const resp = await page.request.post('/api/forum/topics', {
      data: {
        nickname: `Hacker${stamp}`,
        title,
        body: '<script>window.__xss = true</script><img src=x onerror="window.__xss=true">texto',
      },
    });
    expect(resp.status()).toBe(202);

    await login(page);
    await page.goto('/admin/forum');
    const item = page.locator('.ms-mod-item', { hasText: title });
    await item.getByRole('button', { name: /Aprovar/i }).click();
    await expect(page.getByText(/Tópico aprovado/i)).toBeVisible();

    await page.goto('/forum');
    await expect(page.getByText(title)).toBeVisible();
    // o HTML foi removido no servidor: nenhum script executou
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
    // o texto puro sobrou
    await expect(page.getByText('texto', { exact: false }).first()).toBeVisible();
  });

  test('respostas também passam por moderação', async ({ page }) => {
    const stamp = `${Date.now()}`.slice(-6) + Math.floor(Math.random() * 1000);
    const title = `Topico para resposta ${stamp}`;

    // cria e aprova um tópico PRÓPRIO (isola o teste da lista compartilhada)
    const topicId = await createApprovedTopic(page, title);

    await page.goto(`/forum/${topicId}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    const body = `Resposta automatizada ${stamp}`;
    await page.getByLabel('Apelido').fill(`Resp${stamp}`);
    await page.getByLabel('Mensagem').fill(body);
    await page.getByRole('button', { name: /Enviar resposta/i }).click();
    await expect(page.getByText(/Aparecerá após a moderação/i)).toBeVisible();

    // pendente → invisível publicamente
    await page.reload();
    await expect(page.getByText(body)).toBeHidden();

    // admin aprova a resposta → aparece
    await page.goto('/admin/forum');
    const item = page.locator('.ms-mod-item', { hasText: body });
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: /Aprovar/i }).click();
    await expect(page.getByText(/Resposta aprovada/i)).toBeVisible();

    await page.goto(`/forum/${topicId}`);
    await expect(page.getByText(body)).toBeVisible();
  });
});
