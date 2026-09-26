# PWA

Configurado com `vite-plugin-pwa` (Workbox) em [`vite.config.ts`](../apps/web/vite.config.ts).
Os componentes de interface ficam em
[`src/components/pwa/`](../apps/web/src/components/pwa/) e são montados em
`main.tsx`, dentro do `ToastProvider` e ao lado do `RouterProvider` — valem para o
site público e para o painel.

## Manifest

| Campo | Valor |
| --- | --- |
| `name` / `short_name` | MinerSkills #10019 / MinerSkills |
| `lang` | `pt-BR` |
| `theme_color` / `background_color` | `#0A0A0A` |
| `display` | `standalone` |
| `start_url` | `/` |
| Ícones | 192, 512 e **maskable** 512 (+ apple-touch-icon) |
| `id` / `orientation` | `/` / `any` |
| Atalhos | Agenda, Blog, Como entrar |
| Capturas | `public/screenshots/wide.png` (1280×720) e `narrow.png` (390×844), da Home, exibidas no diálogo de instalação |

Os ícones são gerados a partir do selo circular da marca:

```bash
npm run icons     # → apps/web/public/icons/ (versionados)
```

O ícone maskable tem a arte dentro da *safe zone* (~80% central), para não ser
cortada em launchers que aplicam máscara circular.

---

## Atualização: `registerType: 'prompt'`

O service worker **não** se atualiza sozinho. Quando um deploy novo é detectado, o
SW novo fica em espera e o componente `ReloadPrompt` mostra uma barra fixa no
rodapé da tela — **"Nova versão disponível."** — com dois botões:

| Botão | Efeito |
| --- | --- |
| **Atualizar** | `updateServiceWorker(true)`: ativa o SW novo e recarrega a página. |
| **Depois** | Esconde a barra; a versão nova entra na próxima abertura do site. |

Por quê: com `autoUpdate` a página recarregava sozinha assim que o SW novo
assumia — no meio de um formulário do painel, isso descartava o que estava sendo
digitado. Agora quem decide o momento é a pessoa.

`ReloadPrompt` usa `useRegisterSW` de `virtual:pwa-register/react`. Na primeira
instalação (`offlineReady`), um toast confirma **"Pronto para uso offline"** — uma
vez por sessão.

---

## Instalação

`InstallPrompt` escuta `beforeinstallprompt` (Chromium), cancela o mini-infobar do
navegador e guarda o evento; o rodapé passa a exibir o botão discreto
**"Instalar app"** (bloco `.ms-footer__install` na coluna da marca, com uma linha de
benefício), que chama `prompt()`. O botão some:

- depois de `appinstalled`;
- quando o site já roda como app (`display-mode: standalone`, ou
  `navigator.standalone` no iOS);
- em navegadores que nunca disparam o evento (Firefox, Safari) — ali a instalação
  fica no menu do próprio navegador.

O evento é capturado no carregamento do módulo, não só na montagem do componente:
o Chrome pode dispará-lo antes de o rodapé existir.

---

## Offline

Três camadas, da mais silenciosa à mais visível:

1. **Shell precacheado.** O Workbox guarda o app shell, JS/CSS com hash, fontes e
   SVGs na instalação; as páginas já visitadas continuam abrindo sem rede, e a API
   pública tem cache curto de fallback (tabela abaixo).
2. **`OfflineBanner`.** Pílula fixa na base da tela (não cobre a navbar nem barras
   sticky) — **"Você está offline — o conteúdo pode estar desatualizado."** —
   controlada pelos eventos
   `online`/`offline` (estado inicial em `navigator.onLine`). A região viva
   (`role="status"`) existe sempre, vazia quando há rede, para que o leitor de tela
   anuncie a mudança.
3. **`ErrorState` offline.** Quando uma consulta falha sem conexão, o estado de erro
   troca o título por **"Você está offline"** e o ícone por `WifiOff`, com o botão
   "Tentar novamente" (ver [design-system.md](design-system.md)).

### Estratégias de cache

| Padrão | Estratégia | Por quê |
| --- | --- | --- |
| `GET /api/*` (público) | **NetworkFirst** (timeout 3s, cache 5 min, 80 entradas) | Conteúdo fresco quando há rede; o site continua utilizável sem ela. |
| `/api/admin/*` **e todo não-GET** | **NetworkOnly** | O painel **nunca** pode ler dados obsoletos, e mutações jamais são servidas do cache. |
| `/uploads/*` | **CacheFirst** (30 dias, 300 entradas) | Arquivos imutáveis (nome com hash). |

`navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/sitemap\.xml/, /^\/robots\.txt/, /^\/og\//]`
— o fallback de navegação do SPA nunca intercepta chamadas de API, mídia nem os
arquivos de SEO servidos pela API (`sitemap.xml`, `robots.txt`, imagens `/og/`).

> A regra `NetworkOnly` para `/api/admin` é deliberada: sem ela, um administrador
> poderia editar conteúdo enxergando uma versão em cache e sobrescrever dados novos.

---

## Desenvolvimento

`devOptions.enabled: false` — o service worker **não** roda em `npm run dev` (evita
cache confuso durante o desenvolvimento). Nesse modo `useRegisterSW` é um no-op:
`ReloadPrompt` nunca aparece e o toast de offline não dispara; `OfflineBanner` e
`InstallPrompt` funcionam normalmente (dependem só do navegador). Para testar o SW,
use um build real:

```bash
npm run build -w apps/web
npm run preview -w apps/web
```

…ou a stack de produção (`docker compose -f docker-compose.prod.yml up --build`).

---

## Verificação

No Chrome DevTools:

- **Application → Manifest** — nome, cores e ícones (incluindo o maskable).
- **Application → Service Workers** — `sw.js` ativo. Para ver a barra de atualização:
  faça um build novo e recarregue; o SW novo fica em *waiting* e a barra aparece.
- **Network → Offline** → recarregar: o shell e as imagens já visitadas continuam
  aparecendo, a pílula "Você está offline" surge na base da tela e uma consulta que
  falha mostra o `ErrorState` offline.
- Com o SW ativo, uma ação no `/admin` deve **sempre** aparecer em Network (nunca
  "from ServiceWorker").
- **Lighthouse → PWA**.

O nginx serve `sw.js` com `Cache-Control: no-store` e o `index.html` com `no-cache`,
para que atualizações cheguem imediatamente; só os assets com hash usam cache
imutável de 1 ano.
