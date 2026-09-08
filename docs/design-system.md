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
**`Field`** · `Spinner` · `Loader` · `Skeleton` · `EmptyState` · **`QueryState`** ·
**`ErrorState`** · **`MediaImage`** · skeletons (`CardGridSkeleton`, `ListSkeleton`,
`ArticleSkeleton`, `HeroSkeleton`) · `Toast` · `Lightbox` · `YouTubeEmbed`.

> **`Field`** associa automaticamente o `<label>` ao controle filho (injeta `id`,
> `aria-invalid` e `aria-describedby`). Use-o sempre — é o que mantém os
> formulários acessíveis a leitores de tela.

**Layout:** `PublicLayout` · `Navbar` (transparente → sólida ao rolar) ·
`MobileNav` (drawer) · `Footer` · `PageHero` · `SocialIcon` · `NavigationProgress`
(barra de 2px no topo enquanto o chunk da próxima página baixa).

**PWA:** [`src/components/pwa/`](../apps/web/src/components/pwa/) — `ReloadPrompt`
(barra "Nova versão disponível"), `OfflineBanner` (faixa abaixo da navbar) e
`InstallPrompt` (botão "Instalar app" no rodapé). Detalhes em [pwa.md](pwa.md).

---

## Estados de carregamento e erro

[`src/components/ui/QueryState.tsx`](../apps/web/src/components/ui/QueryState.tsx) ·
[`ErrorState.tsx`](../apps/web/src/components/ui/ErrorState.tsx) ·
[`skeletons.tsx`](../apps/web/src/components/ui/skeletons.tsx)

Toda consulta à API numa página pública passa pelo `QueryState`:

```tsx
<QueryState
  query={useAwards()}
  skeleton={<CardGridSkeleton count={6} />}
  isEmpty={(list) => list.length === 0}
  empty={<EmptyState title="Sem conquistas cadastradas" />}
>
  {(list) => <Grid items={list} />}
</QueryState>
```

- **Carregando** → o `skeleton`: `CardGridSkeleton({ count, aspect })`, `ListSkeleton({ rows })`,
  `ArticleSkeleton()` ou `HeroSkeleton()`, montados com o `<Skeleton>` do kit e espelhando o
  layout que vão substituir (sem salto quando o conteúdo chega). Ficam `aria-hidden`.
- **Erro sem dados** → `ErrorState`: ícone `AlertTriangle`, título "Não foi possível carregar",
  texto por status da API (`404`, `429`, `5xx`) e o botão **Tentar novamente** (refetch, com
  spinner enquanto tenta). Offline (`navigator.onLine === false`) troca o ícone por `WifiOff`
  e o título por "Você está offline"; o componente escuta `online`/`offline`.
- **Vazio** → `empty` (normalmente um `EmptyState`).
- `compact` transforma o erro numa faixa de uma linha (borda `--ms-warning`) para blocos com
  fallback textual — a Home e o painel de detalhe das temporadas usam assim.
- Dados já carregados nunca somem: um refetch em segundo plano que falha mantém a tela.

Estilos em `ui-extras.scss` (`.ms-error`, `.ms-skel__*`, `.ms-media-img`), importado pelos
próprios componentes — o kit principal continua em `ui.scss`.

---

## Imagens

[`src/components/ui/MediaImage.tsx`](../apps/web/src/components/ui/MediaImage.tsx)

Toda imagem vinda da API (`MediaAssetDTO`) é renderizada por `MediaImage` — nunca por
`<img src={mediaUrl(...)}>` solto:

| Prop | Efeito |
| --- | --- |
| `thumb` | Usa `thumbUrl` quando existe (grids, cards, listas). |
| `priority` | Imagem acima da dobra: `loading="eager"` + `fetchpriority="high"` (hero da Home, capa do post). Sem ela: `loading="lazy"` + `decoding="async"`. |
| `alt` | Padrão `media.alt ?? ''` (decorativa quando não há texto). |
| `sizes` | Dica de largura para o navegador. |
| `className` | Somada a `ms-media-img`. |

`width`/`height` do registro vão para o `<img>`: o navegador reserva a proporção antes do
download (sem salto de layout) e o container decide o tamanho final com
`object-fit`/`aspect-ratio`, como já fazem `.ms-blog__cover`, `.ms-enc-card__photo` etc. A
miniatura tem a mesma proporção do original, então os atributos valem para as duas.

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

## Acessibilidade

Além do foco visível (mixin `focus-ring`) e do `Field` que rotula os controles, o
site cobre a navegação por teclado e por leitor de tela de ponta a ponta. Tudo sem
biblioteca — só DOM.

### Skip link

`<a href="#conteudo" class="ms-skip-link">Pular para o conteúdo</a>` é o **primeiro
elemento focável** de toda página pública (`PublicLayout`). Fica fora da tela
(`top: -100%`) e aparece no topo, sobre a navbar, em fundo verde, enquanto tem o
foco. O alvo é `<main id="conteudo" tabindex="-1">`, que recebe o foco de verdade
(não só o scroll); o anel de foco do `main` é discreto e só aparece na navegação
por teclado (`:focus-visible`).

### Armadilha de foco — `useFocusTrap`

[`src/lib/useFocusTrap.ts`](../apps/web/src/lib/useFocusTrap.ts):

```ts
useFocusTrap(ref, active, { onEscape?, initialFocus?: 'first' | 'container' });
```

Ao ativar, guarda o elemento focado e leva o foco para o primeiro focável do
container (ou para o próprio container); Tab/Shift+Tab ciclam lá dentro; Escape
chama `onEscape`; ao desativar, o foco **volta** para onde estava. Armadilhas se
empilham (só a do topo responde ao teclado), o que permite modais aninhados no
painel.

| Onde | Container | Escape | Foco inicial |
| --- | --- | --- | --- |
| `MobileNav` (`role="dialog"`, `aria-label="Menu"`, `id="ms-mobilenav"`) | o `aside` | fecha o menu | botão "Fechar menu" |
| `Lightbox` (`role="dialog"`, `aria-label="Foto ampliada"`) | `.ms-lightbox` | fecha; setas continuam trocando a foto | botão "Fechar" |
| `Modal` do painel (`role="dialog"`, `aria-labelledby` no `h2`) | `.ms-modal__panel` | **fica com a pilha de modais** já existente (o hook não recebe `onEscape`) | o painel — o leitor de tela lê o título |

O botão de menu da navbar expõe `aria-expanded` e `aria-controls="ms-mobilenav"`.

### Anúncio de rota — `RouteAnnouncer`

Num SPA o leitor de tela não percebe a troca de página. `RouteAnnouncer`
(`PublicLayout`) é uma região viva invisível (`aria-live="polite"`,
`aria-atomic="true"`, classe `ms-route-announcer`) que, a cada mudança de
`pathname`, lê o `document.title` definido por `useDocumentHead` (após 300 ms —
tempo da transição de saída) e move o foco para `#conteudo`, para que o próximo
Tab continue do conteúdo novo. Nada acontece na carga inicial nem quando a
navegação pediu `state.preserveScroll` (a página cuida do próprio foco, como o
painel de membro em `/equipe`).

### ARIA corrigidos

- `MarqueeStrip` é decorativa: sem `role="marquee"`, com `aria-hidden="true"` na
  faixa inteira (o texto repetido oito vezes não diz nada) e animação **pausada**
  com `prefers-reduced-motion: reduce`.
- `HexPattern` gera o id do `<pattern>` com `useId()` — a Home renderiza várias
  instâncias, e ids repetidos faziam todos os `fill="url(#…)"` apontarem para o
  primeiro SVG.
- Regiões vivas do PWA (`OfflineBanner`, `ReloadPrompt`) existem antes de mudar de
  conteúdo — leitores de tela ignoram regiões inseridas já preenchidas.

Testes: `e2e/tests/a11y.spec.ts` (ver [testing.md](testing.md)).

---

## Regras

1. **Nunca use emoji.** Ícones vêm de `lucide-react` — há teste automatizado que falha se um emoji aparecer.
2. Cores sempre por token (`var(--ms-*)`), nunca hex solto.
3. Classes com prefixo `ms-`, padrão BEM (`ms-bloco__elemento--modificador`).
4. Movimento sempre respeita `prefers-reduced-motion`.
5. Foco visível em tudo que é interativo (mixin `focus-ring`).
