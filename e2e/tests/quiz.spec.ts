import { test, expect } from '@playwright/test';

test.describe('Quiz', () => {
  test('fluxo completo: apelido → perguntas → resultado → leaderboard', async ({ page }) => {
    const nickname = `Tester${Date.now().toString().slice(-6)}`;

    await page.goto('/quiz');
    await expect(page.getByRole('heading', { name: /Pronto para o desafio/i })).toBeVisible();

    await page.getByLabel('Apelido').fill(nickname);
    await page.getByRole('button', { name: /Começar/i }).click();

    // responde todas as perguntas escolhendo sempre a primeira opção,
    // aguardando o contador avançar antes de cada clique
    await expect(page.locator('.ms-quiz__question')).toBeVisible();
    const counter = page.locator('.ms-quiz__counter');
    const total = Number((await counter.textContent())!.match(/de (\d+)/)![1]);
    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      await expect(counter).toHaveText(`Pergunta ${i + 1} de ${total}`);
      await page.locator('.ms-quiz__option').first().click();
    }

    // resultado
    await expect(page.locator('.ms-quiz__result-big')).toBeVisible();
    await expect(page.getByText(/º no ranking/)).toBeVisible();
    await expect(page.locator('.ms-quiz__corrections')).toBeVisible();

    // o apelido entra no leaderboard
    await expect(page.locator('.ms-quiz__leaderboard').getByText(nickname)).toBeVisible();
  });

  test('apelido inválido é rejeitado', async ({ page }) => {
    await page.goto('/quiz');
    await page.getByLabel('Apelido').fill('ab'); // curto demais
    await page.getByRole('button', { name: /Começar/i }).click();
    await expect(page.getByText(/Apelido muito curto/i)).toBeVisible();
    await expect(page.locator('.ms-quiz__question')).toBeHidden();
  });

  test('as perguntas enviadas ao cliente NÃO revelam a resposta correta', async ({ page }) => {
    const resp = await page.request.get('/api/quiz/questions');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.text();
    expect(body).not.toContain('isCorrect');
    const questions = JSON.parse(body);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      for (const o of q.options) {
        expect(Object.keys(o).sort()).toEqual(['id', 'text']);
      }
    }
  });
});
