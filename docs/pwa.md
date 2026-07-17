# PWA

Configurado com `vite-plugin-pwa` (Workbox) em [`vite.config.ts`](../apps/web/vite.config.ts).

## Manifest

| Campo | Valor |
| --- | --- |
| `name` / `short_name` | MinerSkills #10019 / MinerSkills |
| `lang` | `pt-BR` |
| `theme_color` / `background_color` | `#0A0A0A` |
| `display` | `standalone` |
| `start_url` | `/` |
| Ícones | 192, 512 e **maskable** 512 (+ apple-touch-icon) |

Os ícones são gerados a partir do selo circular da marca:

```bash
npm run icons     # → apps/web/public/icons/ (versionados)
```

O ícone maskable tem a arte dentro da *safe zone* (~80% central), para não ser
cortada em launchers que aplicam máscara circular.

---

## Estratégias de cache

`registerType: 'autoUpdate'` — o service worker se atualiza sozinho.

**Precache:** app shell, JS/CSS com hash, fontes (`.woff`/`.woff2`) e SVGs.

| Padrão | Estratégia | Por quê |
| --- | --- | --- |
| `GET /api/*` (público) | **NetworkFirst** (timeout 3s, cache 5 min, 80 entradas) | Conteúdo fresco quando há rede; o site continua utilizável sem ela. |
| `/api/admin/*` **e todo não-GET** | **NetworkOnly** | O painel **nunca** pode ler dados obsoletos, e mutações jamais são servidas do cache. |
| `/uploads/*` | **CacheFirst** (30 dias, 300 entradas) | Arquivos imutáveis (nome com hash). |

`navigateFallbackDenylist: [/^\/api/, /^\/uploads/]` — o fallback de navegação do SPA
nunca intercepta chamadas de API nem mídia.

> A regra `NetworkOnly` para `/api/admin` é deliberada: sem ela, um administrador
> poderia editar conteúdo enxergando uma versão em cache e sobrescrever dados novos.

---

## Desenvolvimento

`devOptions.enabled: false` — o service worker **não** roda em `npm run dev` (evita
cache confuso durante o desenvolvimento). Para testá-lo, use um build real:

```bash
npm run build -w apps/web
npm run preview -w apps/web
```

…ou a stack de produção (`docker compose -f docker-compose.prod.yml up --build`).

---

## Verificação

No Chrome DevTools:

- **Application → Manifest** — nome, cores e ícones (incluindo o maskable).
- **Application → Service Workers** — `sw.js` ativo.
- **Network → Offline** → recarregar: o shell e as imagens já visitadas continuam
  aparecendo.
- Com o SW ativo, uma ação no `/admin` deve **sempre** aparecer em Network (nunca
  "from ServiceWorker").
- **Lighthouse → PWA**.

O nginx serve `sw.js` com `Cache-Control: no-store` e o `index.html` com `no-cache`,
para que atualizações cheguem imediatamente; só os assets com hash usam cache
imutável de 1 ano.
