import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers';

test.describe('Segurança', () => {
  test('rotas admin exigem autenticação', async ({ request }) => {
    const routes = [
      '/api/admin/dashboard',
      '/api/admin/posts',
      '/api/admin/media',
      '/api/admin/forum/moderation',
      '/api/admin/encyclopedia',
      '/api/admin/agenda',
      '/api/admin/social-links',
    ];
    for (const route of routes) {
      const resp = await request.get(route);
      expect(resp.status(), `${route} deveria exigir login`).toBe(401);
    }
  });

  test('mutações admin sem sessão são bloqueadas', async ({ request }) => {
    const resp = await request.post('/api/admin/posts', {
      data: { title: 'x', excerpt: 'x', contentHtml: '<p>x</p>', published: true },
    });
    expect(resp.status()).toBe(401);
  });

  test('o cookie de sessão é httpOnly + SameSite=Strict', async ({ request }) => {
    const resp = await request.post('/api/admin/auth/login', {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(resp.ok()).toBeTruthy();
    const setCookie = resp.headers()['set-cookie'] ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toContain('Path=/api');
  });

  test('validação zod rejeita payload inválido', async ({ request }) => {
    const resp = await request.post('/api/forum/topics', {
      data: { nickname: 'a', title: 'x', body: '' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('bad_request');
    expect(Array.isArray(body.details)).toBeTruthy();
  });

  test('a API não expõe o header X-Powered-By', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.headers()['x-powered-by']).toBeUndefined();
  });

  test('uploads são servidos com nosniff', async ({ request, page }) => {
    await page.goto('/galeria');
    const src = await page.locator('.ms-gallery__item img').first().getAttribute('src');
    expect(src).toBeTruthy();
    const resp = await request.get(src!);
    expect(resp.ok()).toBeTruthy();
    expect(resp.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('healthcheck responde com o provider ativo', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(['sqlite', 'postgresql']).toContain(body.provider);
  });
});
