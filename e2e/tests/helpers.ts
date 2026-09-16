import { expect, type Locator, type Page } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '..', '..', '.env') });

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@minerskills.com.br',
  password: process.env.ADMIN_PASSWORD ?? 'MinerSkills@10019',
};

/**
 * Linha de uma listagem do painel — `<tr>` da tabela ou, no mobile, o cartão que a
 * substitui — localizada pelo texto que exibe. Toda linha leva `data-row` com o
 * rótulo do registro; é esse atributo (e não a tag) que os testes observam.
 */
export function row(page: Page, text: string | RegExp): Locator {
  return page.locator('[data-row]', { hasText: text });
}

/**
 * Botão de ação de uma linha pelo nome acessível ("Editar X", "Excluir X"…). Os
 * botões de linha são só ícone: o `aria-label` é o contrato, não a variante visual.
 */
export function rowAction(
  line: Locator,
  action: 'Editar' | 'Excluir' | 'Aprovar' | 'Rejeitar',
): Locator {
  return line.getByRole('button', { name: new RegExp(`^${action}\\b`) });
}

/**
 * Botão de confirmação do diálogo aberto por cima (ex.: "Excluir" do ConfirmDialog).
 * Escopado ao último `dialog` e com nome exato: o botão da linha chama-se
 * "Excluir <nome>" e continua visível atrás do modal — sem o escopo, os dois casam.
 */
export function confirmAction(page: Page, name = 'Excluir'): Locator {
  return page.getByRole('dialog').last().getByRole('button', { name, exact: true });
}

/** Autentica no painel administrativo via a tela de login. */
export async function login(page: Page): Promise<void> {
  await page.goto('/admin');
  // O painel é um chunk sob demanda e ainda confere a sessão: espera aparecer
  // OU a sidebar (contexto já autenticado, ex.: cookie obtido via page.request)
  // OU o formulário de login — sem isso a checagem "já autenticado?" corre
  // contra o carregamento e o teste fica esperando um formulário que não vem.
  const sidebar = page.locator('.ms-admin__sidebar');
  const emailField = page.getByLabel('E-mail');
  await expect(sidebar.or(emailField)).toBeVisible();
  if (await sidebar.isVisible()) return;

  await emailField.fill(ADMIN.email);
  await page.getByLabel('Senha').fill(ADMIN.password);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.locator('.ms-admin__sidebar').waitFor({ state: 'visible' });
}

/**
 * Abre a sidebar do painel. Em telas pequenas ela é um drawer fechado —
 * é preciso tocar no botão de menu antes de interagir com seus links.
 */
export async function openAdminSidebar(
  page: Page,
  isMobile: boolean | undefined,
): Promise<void> {
  if (!isMobile) return;
  const sidebar = page.locator('.ms-admin__sidebar');
  if (await sidebar.evaluate((el) => el.classList.contains('ms-admin__sidebar--open')))
    return;
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(sidebar).toHaveClass(/ms-admin__sidebar--open/);
}

/**
 * Cria um tópico e o aprova via API, devolvendo o id. Deixa o contexto de
 * requisições (`page.request`, que compartilha os cookies do navegador)
 * autenticado como admin. Mantém os testes independentes da lista
 * compartilhada do fórum.
 */
export async function createApprovedTopic(page: Page, title: string): Promise<string> {
  const created = await page.request.post('/api/forum/topics', {
    data: { nickname: 'SetupBot', title, body: 'Tópico criado pelo setup do teste.' },
  });
  expect(created.status()).toBe(202);

  const auth = await page.request.post('/api/admin/auth/login', {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(auth.ok()).toBeTruthy();

  const list = await (await page.request.get('/api/admin/forum/topics')).json();
  const topic = list.find((t: { title: string }) => t.title === title);
  expect(topic, `tópico "${title}" não encontrado`).toBeTruthy();

  const patched = await page.request.patch(`/api/admin/forum/topics/${topic.id}`, {
    data: { status: 'approved' },
  });
  expect(patched.ok()).toBeTruthy();
  return topic.id as string;
}
