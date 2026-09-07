import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * As configurações são um registro ÚNICO compartilhado por toda a suíte: os
 * testes deste arquivo rodam em série, e o que altera o lema restaura o valor
 * original no final (mesmo quando uma asserção falha).
 */
test.describe.configure({ mode: 'serial' });

const SETTINGS_URL = '/admin/configuracoes';
const MOTTO_LABEL = 'Lema da equipe';

test.describe('Configurações', () => {
  test('formulário lista todas as chaves com os valores do seed', async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_URL);
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();

    // um controle por definição — o rótulo é o mesmo de SETTING_DEFINITIONS
    for (const label of [
      MOTTO_LABEL,
      'Cidade / região',
      'E-mail de contato',
      'Aviso sobre inscrições',
    ]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByLabel('Inscrições abertas')).toBeChecked();
    await expect(page.getByLabel('E-mail de contato')).toHaveValue(
      'contato@minerskills.com.br',
    );
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
  });

  test('alterar o lema reflete no rodapé do site', async ({ page, isMobile }) => {
    test.skip(
      !!isMobile,
      'a configuração é global: só um projeto a altera, para não haver corrida entre desktop e mobile',
    );
    const stamp = Date.now().toString().slice(-6);
    const newMotto = `Lema e2e ${stamp}`;

    await login(page);
    await page.goto(SETTINGS_URL);
    const motto = page.getByLabel(MOTTO_LABEL);
    await expect(motto).not.toHaveValue('');
    const original = await motto.inputValue();

    try {
      await motto.fill(newMotto);
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('Configurações salvas.')).toBeVisible();
      // o valor salvo sobrevive a um reload
      await page.reload();
      await expect(page.getByLabel(MOTTO_LABEL)).toHaveValue(newMotto);

      await page.goto('/');
      await expect(page.locator('.ms-footer')).toContainText(newMotto);
    } finally {
      // restaura pela API (sessão do admin já está no contexto), independente do estado da página
      const restored = await page.request.put('/api/admin/settings', {
        data: { key: 'team_motto', value: original },
      });
      expect(restored.ok()).toBeTruthy();
    }

    const settings = (await (await page.request.get('/api/settings')).json()) as Record<
      string,
      string
    >;
    expect(settings.team_motto).toBe(original);
  });

  test('chave desconhecida é rejeitada pela API', async ({ page }) => {
    await login(page);
    const resp = await page.request.put('/api/admin/settings/bulk', {
      data: [{ key: 'chave_inexistente', value: 'x' }],
    });
    expect(resp.status()).toBe(400);
  });
});
