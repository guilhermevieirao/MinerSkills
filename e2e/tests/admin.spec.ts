import { test, expect } from '@playwright/test';
import { login, openAdminSidebar, ADMIN } from './helpers';

test.describe('Área administrativa', () => {
  test('a rota /admin não é linkada em nenhum lugar do site público', async ({ page }) => {
    for (const path of ['/', '/blog', '/galeria', '/forum', '/como-entrar']) {
      await page.goto(path);
      const adminLinks = page.locator('a[href*="/admin"]');
      expect(await adminLinks.count()).toBe(0);
    }
  });

  test('robots.txt bloqueia /admin', async ({ page }) => {
    const resp = await page.request.get('/robots.txt');
    expect(resp.ok()).toBeTruthy();
    expect(await resp.text()).toContain('Disallow: /admin');
  });

  test('login com credenciais erradas é rejeitado', async ({ page }) => {
    await page.goto('/admin');
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Senha').fill('senha-errada-123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page.getByText(/Credenciais inválidas/i)).toBeVisible();
    await expect(page.locator('.ms-admin__sidebar')).toBeHidden();
  });

  test('login correto abre o dashboard com os contadores', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.locator('.ms-dash-card').first()).toBeVisible();
    await expect(page.getByText(/Olá,/)).toBeVisible();
  });

  test('CRUD de post: cria, publica e aparece no blog', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const title = `Post automatizado ${stamp}`;

    await login(page);
    await page.goto('/admin/blog');
    await page.getByRole('button', { name: /Novo post/i }).click();

    // "exact" evita colidir com os botões "Título 2"/"Título 3" do editor
    await page.getByLabel('Título', { exact: true }).fill(title);
    await page.getByLabel('Resumo').fill('Resumo do post criado por teste automatizado.');
    await page.locator('.ms-rte__content .tiptap').fill('Conteúdo do post de teste.');
    await page.getByLabel(/Publicado/).check();
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(/Post salvo/i)).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(title)).toBeVisible();

    // aparece no blog público
    await page.goto('/blog');
    await expect(page.getByText(title)).toBeVisible();

    // limpa: remove o post
    await page.goto('/admin/blog');
    const row = page.locator('tr', { hasText: title });
    await row.locator('.ms-btn--danger').click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText(/Post removido/i)).toBeVisible();
  });

  test('CRUD de agenda: cria e aparece na página pública', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const title = `Evento teste ${stamp}`;

    await login(page);
    await page.goto('/admin/agenda');
    await page.getByRole('button', { name: /Novo evento/i }).click();

    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Descrição').fill('Evento criado por teste automatizado.');
    await page.getByLabel('Início').fill('2030-06-01T10:00');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Salvo.')).toBeVisible();
    await page.goto('/agenda');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('CRUD de tag: cria, aparece no formulário de membro e nos filtros públicos, e é removida', async ({
    page,
  }) => {
    const stamp = Date.now().toString().slice(-6);
    const label = `Tag e2e ${stamp}`;

    await login(page);
    await page.goto('/admin/equipe/tags');
    await expect(page.getByRole('heading', { name: 'Tags da equipe' })).toBeVisible();
    await page.getByRole('button', { name: /Nova tag/i }).click();
    await page.getByLabel('Nome da tag').fill(label);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Tag salva.')).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(label)).toBeVisible();

    // o formulário de membro lista as tags do banco
    await page.goto('/admin/equipe');
    await expect(page.getByRole('heading', { name: 'Equipe' })).toBeVisible();
    await page.getByRole('button', { name: /Novo registro/i }).click();
    await expect(
      page.locator('.ms-tagpick').getByRole('button', { name: new RegExp(label) }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // e os chips de filtro do site também
    await page.goto('/equipe');
    await expect(
      page.locator('.ms-enc__filters').getByRole('button', { name: label, exact: true }),
    ).toBeVisible();

    // limpa: remove a tag
    await page.goto('/admin/equipe/tags');
    const row = page.locator('tr', { hasText: label });
    await row.locator('.ms-btn--danger').click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Tag removida.')).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(label)).toHaveCount(0);
  });

  test('nome de tag duplicado é rejeitado', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const label = `Tag duplicada ${stamp}`;

    await login(page);
    await page.goto('/admin/equipe/tags');
    await page.getByRole('button', { name: /Nova tag/i }).click();
    await page.getByLabel('Nome da tag').fill(label);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Tag salva.')).toBeVisible();

    // mesmo nome com caixa e espaços diferentes: a comparação ignora os dois → 409
    await page.getByRole('button', { name: /Nova tag/i }).click();
    await page.getByLabel('Nome da tag').fill(`  ${label.toUpperCase()}  `);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('.ms-toast--error, .ms-field__error').first()).toBeVisible();
    await page.keyboard.press('Escape');
    // continua existindo uma linha só (hasText ignora caixa)
    await expect(page.locator('.ms-adm__table tr', { hasText: label })).toHaveCount(1);

    // limpa
    const row = page.locator('tr', { hasText: label });
    await row.locator('.ms-btn--danger').click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Tag removida.')).toBeVisible();
  });

  test('quiz: admin cria pergunta e ela aparece no jogo', async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const question = `Pergunta automatizada ${stamp}?`;

    await login(page);
    await page.goto('/admin/quiz');
    await page.getByRole('button', { name: /Nova pergunta/i }).click();

    await page.getByLabel('Pergunta').fill(question);
    await page.getByPlaceholder('Opção 1').fill('Resposta certa');
    await page.getByPlaceholder('Opção 2').fill('Resposta errada');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(/Pergunta salva/i)).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(question)).toBeVisible();

    // aparece na API pública (sem revelar a correta)
    const resp = await page.request.get('/api/quiz/questions');
    const body = await resp.text();
    expect(body).toContain(question);
    expect(body).not.toContain('isCorrect');
  });

  test('logout encerra a sessão', async ({ page, isMobile }) => {
    await login(page);
    // em mobile a sidebar é um drawer: precisa abrir antes
    await openAdminSidebar(page, isMobile);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('heading', { name: /Painel MinerSkills/i })).toBeVisible();

    // a sessão realmente acabou: a API rejeita
    const resp = await page.request.get('/api/admin/dashboard');
    expect(resp.status()).toBe(401);
  });
});
