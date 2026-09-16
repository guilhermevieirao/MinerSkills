import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// .env ÚNICO na raiz do monorepo (apps/web -> apps -> raiz)
const rootDir = resolve(here, '..', '..');

/** Mesmo padrão de SITE_URL na API (packages/shared/src/env.schema.ts). */
const DEFAULT_SITE_URL = 'http://localhost:5173';

/**
 * Substitui `%VITE_SITE_URL%` no index.html por uma URL sempre absoluta e sem
 * barra final. O hook de env do próprio Vite deixaria o marcador LITERAL no
 * HTML quando a variável não existe (ou vazio, se ela vier vazia do build arg
 * do compose) e repassaria uma barra final tal qual (`https://site//`). Em
 * runtime o useDocumentHead já normaliza; este plugin cobre o HTML estático,
 * que é o que bots sem JS leem. `order: 'pre'` roda antes do hook do Vite.
 */
function siteUrlHtml(siteUrl: string): Plugin {
  return {
    name: 'ms:site-url-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/%VITE_SITE_URL%/g, siteUrl),
    },
  };
}

export default defineConfig(({ mode }) => {
  // carrega TODAS as variáveis do .env raiz (não só as VITE_*) para uso no config
  const env = loadEnv(mode, rootDir, '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:3001';
  const siteUrl =
    (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '') || DEFAULT_SITE_URL;

  return {
    // Vite só expõe variáveis com prefixo VITE_ ao cliente
    envDir: rootDir,
    plugins: [
      siteUrlHtml(siteUrl),
      react(),
      VitePWA({
        // 'prompt': o usuário decide quando recarregar (ReloadPrompt) — nada some no meio de um formulário
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'MinerSkills #10019',
          short_name: 'MinerSkills',
          description:
            'Equipe de robótica MinerSkills #10019 — FIRST Robotics Competition',
          lang: 'pt-BR',
          theme_color: '#0A0A0A',
          background_color: '#0A0A0A',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
          // sitemap/robots/og vêm da API; nunca devem cair no fallback do SPA
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/uploads/,
            /^\/sitemap\.xml/,
            /^\/robots\.txt/,
            /^\/og\//,
          ],
          runtimeCaching: [
            {
              // conteúdo público da API: rede primeiro, cache curto de fallback
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') &&
                !url.pathname.startsWith('/api/admin'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-public',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 80, maxAgeSeconds: 300 },
              },
            },
            {
              // admin: SEMPRE rede (nunca serve dados obsoletos)
              urlPattern: ({ url }) => url.pathname.startsWith('/api/admin'),
              handler: 'NetworkOnly',
            },
            {
              // uploads: cache agressivo (arquivos imutáveis)
              urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'uploads',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/uploads': { target: proxyTarget, changeOrigin: true },
        '/sitemap.xml': { target: proxyTarget, changeOrigin: true },
        '/robots.txt': { target: proxyTarget, changeOrigin: true },
        '/og': { target: proxyTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/uploads': { target: proxyTarget, changeOrigin: true },
        '/sitemap.xml': { target: proxyTarget, changeOrigin: true },
        '/robots.txt': { target: proxyTarget, changeOrigin: true },
        '/og': { target: proxyTarget, changeOrigin: true },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // separa vendors pesados para melhorar o cache do navegador
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['motion'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
