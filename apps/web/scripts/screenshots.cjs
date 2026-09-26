/* global window, document -- usados dentro de page.evaluate (rodam no navegador) */
/**
 * Capturas headless do site e do painel em três larguras (390 / 834 / 1440),
 * para revisar o visual depois de uma mudança de interface.
 *
 *   npm run dev                                   # API :3001 + web :5173
 *   npm run screenshots -w apps/web               # tudo em ./screenshots
 *   npm run screenshots -w apps/web -- out public # só o site, na pasta "out"
 *   npm run screenshots -w apps/web -- out admin  # só o painel
 *
 * Usa o Playwright instalado para a suíte e2e. Credenciais: ADMIN_EMAIL /
 * ADMIN_PASSWORD do ambiente (padrão: as do seed). Páginas longas são roladas
 * até o fim antes da captura (blocos com Reveal só aparecem ao entrar na tela).
 * O limitador geral da API conta estas requisições: não rode duas vezes seguidas
 * sem reiniciar a API.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(ROOT, 'node_modules/@playwright/test'));

const OUT = path.resolve(process.argv[2] || 'screenshots');
const ONLY = process.argv[3]; // 'public' | 'admin' | undefined
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@minerskills.com.br',
  password: process.env.ADMIN_PASSWORD || 'MinerSkills@10019',
};
const VIEWPORTS = {
  mob: { width: 390, height: 844 },
  tab: { width: 834, height: 1112 },
  desk: { width: 1440, height: 900 },
};
const PUBLIC = [
  '/',
  '/historia',
  '/blog',
  '/galeria',
  '/equipe',
  '/quiz',
  '/forum',
  '/premios',
  '/temporadas',
  '/agenda',
  '/como-entrar',
  '/contato',
  '/pagina-inexistente',
];
const ADMIN_PAGES = [
  '/admin',
  '/admin/paginas',
  '/admin/blog',
  '/admin/galeria',
  '/admin/midia',
  '/admin/equipe',
  '/admin/equipe/tags',
  '/admin/temporadas',
  '/admin/premios',
  '/admin/forum',
  '/admin/quiz',
  '/admin/mensagens',
  '/admin/agenda',
  '/admin/patrocinadores',
  '/admin/social',
  '/admin/configuracoes',
  '/admin/administradores',
  '/admin/conta',
];

const slug = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[/:?=]/g, '-'));

async function waitForApi(ctx) {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await ctx.request.get(`${BASE}/api/health`, { timeout: 5000 })).ok()) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`API não respondeu em ${BASE}/api/health`);
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

async function shot(page, name, full = true) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  if (full) await scrollThrough(page).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  console.log('ok', name);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const probe = await browser.newContext();
  await waitForApi(probe);
  await probe.close();

  for (const [vp, viewport] of Object.entries(VIEWPORTS)) {
    const options = { viewport, reducedMotion: 'reduce', colorScheme: 'dark' };

    if (ONLY !== 'admin') {
      const ctx = await browser.newContext(options);
      const page = await ctx.newPage();
      for (const route of PUBLIC) {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
        await shot(page, `pub-${vp}-${slug(route)}`);
      }
      if (vp !== 'desk') {
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await page
          .getByRole('button', { name: 'Abrir menu' })
          .click()
          .catch(() => {});
        await shot(page, `pub-${vp}-menu`, false);
      }
      await ctx.close();
    }

    if (ONLY !== 'public') {
      const ctx = await browser.newContext(options);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      await page
        .getByLabel('E-mail')
        .waitFor({ timeout: 30000 })
        .catch(() => {});
      await shot(page, `adm-${vp}-login`, false);

      const auth = await ctx.request.post(`${BASE}/api/admin/auth/login`, {
        data: ADMIN,
      });
      if (!auth.ok()) throw new Error(`login do painel falhou: ${auth.status()}`);
      for (const route of ADMIN_PAGES) {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
        await page
          .locator('.ms-admin__sidebar')
          .waitFor({ timeout: 30000 })
          .catch(() => {});
        await shot(page, `adm-${vp}-${slug(route)}`);
      }
      await page.goto(`${BASE}/admin/blog?novo=1`, { waitUntil: 'domcontentloaded' });
      await shot(page, `adm-${vp}-modal-post`, false);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`capturas em ${OUT}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
