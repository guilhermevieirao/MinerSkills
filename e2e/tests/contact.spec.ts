import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { login, ADMIN } from './helpers';

/**
 * Contato + inscrição + caixa de entrada do painel.
 *
 * O fluxo do admin depende da mensagem enviada pelo primeiro teste, por isso o
 * arquivo roda em série. Cada projeto (desktop/mobile) usa nomes próprios e
 * remove o que criou; a suíte inteira faz no máximo 3 `POST /api/contact` por
 * projeto — o limite `RATE_LIMIT_CONTACT_MAX` é elevado no webServer da API.
 */
test.describe.configure({ mode: 'serial' });

const STAMP = Date.now().toString().slice(-6);

/** Nome único por projeto: os dois projetos escrevem no mesmo banco em paralelo. */
function visitor(prefix: string): string {
  return `${prefix} ${test.info().project.name} ${STAMP}`;
}

interface ContactMessage {
  id: string;
  name: string;
  status: string;
}

/** Autentica o contexto de requisições como admin (cookie de sessão). */
async function loginApi(request: APIRequestContext): Promise<void> {
  const auth = await request.post('/api/admin/auth/login', {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(auth.ok()).toBeTruthy();
}

async function findByName(
  request: APIRequestContext,
  name: string,
): Promise<ContactMessage[]> {
  const resp = await request.get(`/api/admin/contact?q=${encodeURIComponent(name)}`);
  expect(resp.ok()).toBeTruthy();
  const body = (await resp.json()) as { items: ContactMessage[] };
  return body.items;
}

/** Remove pela API tudo o que tiver o nome informado (limpeza ao final do teste). */
async function removeByName(request: APIRequestContext, name: string): Promise<void> {
  await loginApi(request);
  for (const m of await findByName(request, name)) {
    await request.delete(`/api/admin/contact/${m.id}`);
  }
}

async function fillContact(page: Page, name: string, email: string, message: string) {
  await page.getByLabel('Nome', { exact: true }).fill(name);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Mensagem', { exact: true }).fill(message);
}

test.describe('Contato e inscrição', () => {
  test('a página de contato envia uma mensagem', async ({ page }) => {
    const name = visitor('Visitante');
    await page.goto('/contato');
    await expect(page.getByRole('heading', { name: 'Contato', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Envie uma mensagem' })).toBeVisible();

    await fillContact(
      page,
      name,
      `visitante-${STAMP}@example.com`,
      'Mensagem enviada pelo teste automatizado da página de contato.',
    );
    await page.getByRole('button', { name: 'Enviar' }).click();

    // a confirmação substitui o formulário (o toast repete o texto, por isso `.ms-contact--done`)
    await expect(page.locator('.ms-contact--done')).toContainText(
      'Recebemos sua mensagem',
    );
    await expect(page.getByLabel('Nome', { exact: true })).toBeHidden();
  });

  test('honeypot preenchido responde 202 e não grava nada', async ({ request }) => {
    const name = visitor('Robo');
    const resp = await request.post('/api/contact', {
      data: {
        kind: 'contato',
        name,
        email: `robo-${STAMP}@example.com`,
        message: 'Mensagem automática com o campo-armadilha preenchido.',
        website: 'http://spam',
      },
    });
    expect(resp.status()).toBe(202);
    expect(await resp.json()).toEqual({ ok: true });

    await loginApi(request);
    expect(await findByName(request, name)).toEqual([]);
  });

  test('o painel lê, arquiva e exclui a mensagem', async ({ page }) => {
    const name = visitor('Visitante');
    try {
      await login(page);
      await page.goto('/admin/mensagens');
      await expect(page.getByRole('heading', { name: 'Mensagens' })).toBeVisible();

      // chega como "Nova"
      const item = page.locator('.ms-inbox__item', { hasText: name });
      await expect(item).toBeVisible();
      await expect(item.locator('.ms-inbox__status')).toHaveText('Nova');

      // abrir marca como lida
      await item.click();
      const modal = page.locator('.ms-modal');
      await expect(modal.getByRole('heading', { name })).toBeVisible();
      await expect(modal.getByText('Lida', { exact: true })).toBeVisible();
      await expect(
        modal.getByRole('link', { name: `visitante-${STAMP}@example.com` }),
      ).toHaveAttribute('href', `mailto:visitante-${STAMP}@example.com`);

      // arquivar
      await modal.getByRole('button', { name: 'Arquivar' }).click();
      await expect(page.getByText('Mensagem arquivada.')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();

      await page.getByRole('button', { name: 'Arquivadas' }).click();
      await expect(item).toBeVisible();
      await expect(item.locator('.ms-inbox__status')).toHaveText('Arquivada');

      // excluir (com confirmação: o diálogo é um segundo .ms-modal sobre o detalhe)
      await item.click();
      await page
        .locator('.ms-modal')
        .first()
        .getByRole('button', { name: 'Excluir' })
        .click();
      await expect(page.locator('.ms-modal')).toHaveCount(2);
      await page
        .locator('.ms-modal')
        .last()
        .getByRole('button', { name: 'Excluir' })
        .click();
      await expect(page.getByText('Mensagem excluída.')).toBeVisible();
      await expect(item).toBeHidden();
    } finally {
      // se algo falhou antes da exclusão, a mensagem não fica no banco
      await removeByName(page.request, name);
    }
  });

  test('como entrar exibe o formulário de inscrição e envia uma inscrição', async ({
    page,
  }) => {
    const name = visitor('Candidato');
    try {
      await page.goto('/como-entrar');
      // seed de teste: applications_open = 'true'
      await expect(page.getByRole('heading', { name: 'Inscreva-se' })).toBeVisible();

      await fillContact(
        page,
        name,
        `candidato-${STAMP}@example.com`,
        'Quero participar da equipe porque gosto de robótica e programação.',
      );
      await page.getByLabel('Escola', { exact: true }).fill('Escola SESI');
      await page.getByLabel('Série/ano', { exact: true }).fill('1º ano');
      await page.getByRole('button', { name: 'Enviar' }).click();

      await expect(page.locator('.ms-contact--done')).toContainText('Inscrição enviada');

      // gravada como inscrição nova
      await loginApi(page.request);
      const [saved] = await findByName(page.request, name);
      expect(saved?.status).toBe('new');
    } finally {
      await removeByName(page.request, name);
    }
  });
});
