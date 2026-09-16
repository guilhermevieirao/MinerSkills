import { test, expect, type Page } from '@playwright/test';
import { login, openAdminSidebar, row, rowAction, confirmAction, ADMIN } from './helpers';

/**
 * Os passos compartilham o administrador criado no primeiro teste e rodam em
 * ordem (serial), num único worker; o último passo remove o que foi criado e o
 * afterAll garante a limpeza mesmo quando algum passo falha. Cada projeto do
 * Playwright tem seu próprio worker, por isso o e-mail leva a inicial do projeto —
 * eles nunca disputam o mesmo registro.
 */
test.describe.configure({ mode: 'serial' });

const RUN = Date.now().toString(36);

function e2eAdmin(project: string) {
  const stamp = `${RUN}${project.slice(0, 1)}`;
  return {
    name: `Admin e2e ${stamp}`,
    email: `e2e-${stamp}@minerskills.test`,
    password: `SenhaForte${stamp}!`,
    newPassword: `NovaSenha${stamp}!`,
  };
}

/** Login pela tela com credenciais arbitrárias (o helper `login` usa o admin principal). */
async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/admin');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.locator('.ms-admin__sidebar').waitFor({ state: 'visible' });
}

async function logout(page: Page, isMobile: boolean | undefined): Promise<void> {
  await openAdminSidebar(page, isMobile);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: /Painel MinerSkills/i })).toBeVisible();
}

test.describe('Administradores e minha conta', () => {
  test.afterAll(async ({ playwright }, workerInfo) => {
    // limpeza defensiva: se um passo falhou antes da exclusão, remove o admin e2e pela API
    const novo = e2eAdmin(workerInfo.project.name);
    const ctx = await playwright.request.newContext({
      baseURL: workerInfo.project.use.baseURL,
    });
    try {
      const auth = await ctx.post('/api/admin/auth/login', {
        data: { email: ADMIN.email, password: ADMIN.password },
      });
      if (!auth.ok()) return;
      const admins = (await (await ctx.get('/api/admin/admins')).json()) as {
        id: string;
        email: string;
      }[];
      for (const a of admins.filter((x) => x.email === novo.email)) {
        await ctx.delete(`/api/admin/admins/${a.id}`);
      }
    } finally {
      await ctx.dispose();
    }
  });

  test('cria um administrador pelo painel', async ({ page }) => {
    const novo = e2eAdmin(test.info().project.name);

    await login(page);
    await page.goto('/admin/administradores');
    await expect(page.getByRole('heading', { name: 'Administradores' })).toBeVisible();

    await page.getByRole('button', { name: /Novo administrador/i }).click();
    await page.getByLabel('Nome').fill(novo.name);
    await page.getByLabel('E-mail').fill(novo.email);
    await page.getByLabel('Senha').fill(novo.password);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Administrador salvo.')).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(novo.email)).toBeVisible();
  });

  test('a própria conta não pode ser excluída', async ({ page }) => {
    const novo = e2eAdmin(test.info().project.name);

    await login(page);
    await page.goto('/admin/administradores');

    // a linha do admin logado é marcada e não tem botão de excluir
    const own = row(page, ADMIN.email);
    await expect(own.getByText('Você')).toBeVisible();
    await expect(rowAction(own, 'Excluir')).toHaveCount(0);

    // o admin criado pelo teste tem
    const other = row(page, novo.email);
    await expect(rowAction(other, 'Excluir')).toHaveCount(1);

    // e a API recusa mesmo sem passar pela tela
    const me = (await (await page.request.get('/api/admin/auth/me')).json()) as {
      id: string;
    };
    const resp = await page.request.delete(`/api/admin/admins/${me.id}`);
    expect(resp.status()).toBe(409);
  });

  test('o novo admin entra, troca a própria senha e volta com a nova', async ({
    page,
    isMobile,
  }) => {
    const novo = e2eAdmin(test.info().project.name);

    await loginAs(page, novo.email, novo.password);
    await page.goto('/admin/conta');
    await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
    await expect(page.getByText(novo.email)).toBeVisible();

    await page.getByLabel('Senha atual').fill(novo.password);
    await page.getByLabel('Nova senha', { exact: true }).fill(novo.newPassword);
    await page.getByLabel('Confirmar nova senha').fill(novo.newPassword);
    await page.getByRole('button', { name: 'Alterar senha' }).click();

    await expect(page.getByText('Senha alterada.')).toBeVisible();
    await expect(page.getByLabel('Senha atual')).toHaveValue('');
    // o cookie foi reemitido: a sessão continua válida
    expect((await page.request.get('/api/admin/auth/me')).ok()).toBeTruthy();

    // sai e entra com a senha nova
    await logout(page, isMobile);
    await loginAs(page, novo.email, novo.newPassword);
    await page.goto('/admin/conta');
    await expect(page.getByText(novo.email)).toBeVisible();
  });

  test('o admin principal remove o administrador criado', async ({ page }) => {
    const novo = e2eAdmin(test.info().project.name);

    await login(page);
    await page.goto('/admin/administradores');

    const linha = row(page, novo.email);
    await rowAction(linha, 'Excluir').click();
    await confirmAction(page).click();

    await expect(page.getByText('Administrador removido.')).toBeVisible();
    await expect(page.locator('.ms-adm__table').getByText(novo.email)).toHaveCount(0);
  });
});
