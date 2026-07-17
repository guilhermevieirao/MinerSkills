import { expect, type Page } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '..', '..', '.env') });

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@minerskills.com.br',
  password: process.env.ADMIN_PASSWORD ?? 'MinerSkills@10019',
};

/** Autentica no painel administrativo via a tela de login. */
export async function login(page: Page): Promise<void> {
  await page.goto('/admin');
  // já autenticado?
  if (await page.locator('.ms-admin__sidebar').isVisible().catch(() => false)) return;

  await page.getByLabel('E-mail').fill(ADMIN.email);
  await page.getByLabel('Senha').fill(ADMIN.password);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.locator('.ms-admin__sidebar').waitFor({ state: 'visible' });
}

/**
 * Abre a sidebar do painel. Em telas pequenas ela é um drawer fechado —
 * é preciso tocar no botão de menu antes de interagir com seus links.
 */
export async function openAdminSidebar(page: Page, isMobile: boolean | undefined): Promise<void> {
  if (!isMobile) return;
  const sidebar = page.locator('.ms-admin__sidebar');
  if (await sidebar.evaluate((el) => el.classList.contains('ms-admin__sidebar--open'))) return;
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(sidebar).toHaveClass(/ms-admin__sidebar--open/);
}
