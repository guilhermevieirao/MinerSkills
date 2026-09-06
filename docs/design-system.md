# Design System

Identidade **preta + verde menta**, tipografia técnica em caixa alta, movimento como
parte da linguagem. Baseado nas peças da equipe (selo #10019, logo horizontal,
pôsteres do processo seletivo).

---

## Cores

Definidas como CSS custom properties em [`src/styles/_tokens.scss`](../apps/web/src/styles/_tokens.scss).

| Token | Valor | Uso |
| --- | --- | --- |
| `--ms-black` / `--ms-bg` | `#0A0A0A` | Fundo da página. |
| `--ms-surface` | `#111413` | Cards, navbar sólida, rodapé. |
| `--ms-surface-2` | `#181D1B` | Inputs, superfícies internas. |
| `--ms-surface-3` | `#20261F` | Realce dentro de superfícies. |
| `--ms-border` | `#2A322D` | Bordas padrão. |
| `--ms-border-strong` | `#3B463F` | Bordas de destaque. |
| **`--ms-green`** | **`#29D98C`** | **Cor primária** (do selo #10019). |
| `--ms-green-strong` | `#2ECC71` | Hover de botões. |
| `--ms-green-deep` | `#3B9C7A` | Verde do logo horizontal; detalhes. |
| `--ms-cream` | `#F2EEE3` | Off-white do selo. |
| `--ms-text` | `#E8EDEA` | Texto principal. |
| `--ms-text-dim` | `#9BA8A1` | Texto secundário. |
| `--ms-text-faint` | `#6B756F` | Legendas, placeholders. |
| `--ms-on-green` | `#06231A` | Texto sobre fundo verde. |
| `--ms-danger` / `--ms-warning` | `#FF5A5A` / `#F2B134` | Estados. |

**Gradientes:** `--ms-gradient` (135°, verde→verde profundo — dos pôsteres),
`--ms-gradient-dark` (fundos de hero), `--ms-gradient-text` (títulos).

---

## Tipografia

Fontes **self-hosted** via `@fontsource` (importadas em `main.tsx`) — sem CDN externo,
o que mantém a CSP restrita e o PWA funcional offline.

| Token | Fonte | Uso |
| --- | --- | --- |
| `--ms-font-display` | **Chakra Petch** | Títulos, botões, navegação. Cortes angulares que ecoam o wordmark. |
| `--ms-font-body` | **Inter Variable** | Corpo de texto. |
| `--ms-font-mono` | **JetBrains Mono** | Números, "kickers", datas, #10019. |

Títulos usam sempre `text-transform: uppercase` e `letter-spacing` amplo
(mixin `display-heading`). Escala de `--ms-text-xs` (0.75rem) a `--ms-text-5xl`
(`clamp(2.75rem, 8vw, 6rem)`).

> O **"E" de três barras** do wordmark é reproduzido como **SVG**, nunca como fonte.

---

## Espaçamento, raios, sombras

Escala de 4px: `--ms-space-1` (0.25rem) … `--ms-space-16` (8rem).
Raios: `--ms-radius-sm` 6px · `--ms-radius` 12px · `--ms-radius-lg` 18px ·
`--ms-radius-xl` 28px · `--ms-radius-pill`.
Sombras: `--ms-shadow-sm/-/-lg` e **`--ms-shadow-glow`** (halo verde da marca).

---

## Movimento

Tokens em [`_motion.scss`](../apps/web/src/styles/_motion.scss).

| Token | Valor |
| --- | --- |
| `--ms-dur-fast` / `--ms-dur` / `--ms-dur-slow` / `--ms-dur-hero` | 150 / 250 / 500 / 900 ms |
| `--ms-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` — easing "da casa" |

**Acessibilidade:** `@media (prefers-reduced-motion: reduce)` neutraliza todas as
animações globalmente, e os componentes de motion checam `useReducedMotion()`.

### Componentes de movimento

| Componente | O quê |
| --- | --- |
| `<Reveal>` | Entrada ao aparecer no viewport. |
| `<RevealGroup>` / `<RevealItem>` | Entrada escalonada (stagger). |
| `<PageTransition>` | Transição entre rotas (`AnimatePresence`). |
| `<MarqueeStrip>` | Faixa infinita "MINERSKILLS · 10019 · FRC" — direto dos pôsteres. |
| `<HexPattern>` | Textura hexagonal de fundo (SVG). |
| `<StatCounter>` | Contagem animada de números. |

---

## Marca

| Componente | Uso |
| --- | --- |
| `<LogoWordmark>` | Navbar. O **M** é desenhado com o capacete de minerador e completa "INERSKILLS". |
| `<LogoBadge>` | Selo circular com picaretas cruzadas. Rodapé, login, hero. |
| `<LogoMark>` | Ícone compacto (capacete + M). Menu mobile, 404. |

Todos usam `fill="currentColor"` — a cor vem do contexto.

**Ícones PWA:** gerados do selo com `npm run icons`
(→ `apps/web/public/icons/`, versionados).

---

## Componentes de UI

[`src/components/ui/`](../apps/web/src/components/ui/)

`Button` (primary/outline/ghost/danger × sm/md/lg) · `LinkButton` · `SectionHeading`
(com kicker) · `Card` · `FilterChip` · `Tag` · `Input` / `Textarea` / `Select` ·
**`Field`** · `Spinner` · `Loader` · `Skeleton` · `EmptyState` · `Toast` ·
`Lightbox` · `YouTubeEmbed`.

> **`Field`** associa automaticamente o `<label>` ao controle filho (injeta `id`,
> `aria-invalid` e `aria-describedby`). Use-o sempre — é o que mantém os
> formulários acessíveis a leitores de tela.

**Layout:** `PublicLayout` · `Navbar` (transparente → sólida ao rolar) ·
`MobileNav` (drawer) · `Footer` · `PageHero` · `SocialIcon`.

---

## Responsividade

Breakpoints em [`_mixins.scss`](../apps/web/src/styles/_mixins.scss):
`sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280.

Não é apenas "encolher" — o mobile é redesenhado:

| Tela | Adaptação |
| --- | --- |
| Navegação | Menu completo ≥1280px; abaixo disso, drawer lateral. |
| Equipe | Painel lateral no desktop → **tela cheia** no mobile. |
| Galeria | 4 colunas → 2 colunas. |
| Quiz | Leaderboard lateral → empilhado abaixo. |
| Admin | Sidebar fixa → drawer com overlay. |
| Hero | Selo decorativo escondido; tipografia com `clamp()`. |

Áreas seguras (`env(safe-area-inset-*)`) respeitadas nos drawers.

---

## Regras

1. **Nunca use emoji.** Ícones vêm de `lucide-react` — há teste automatizado que falha se um emoji aparecer.
2. Cores sempre por token (`var(--ms-*)`), nunca hex solto.
3. Classes com prefixo `ms-`, padrão BEM (`ms-bloco__elemento--modificador`).
4. Movimento sempre respeita `prefers-reduced-motion`.
5. Foco visível em tudo que é interativo (mixin `focus-ring`).
