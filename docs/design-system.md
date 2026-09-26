> **Atualizado em 2026-09:** o site público ganhou o design system **v3** (escuro profundo +
> verde, Geist em caixa normal, blocos de vitrine e movimento ligado à rolagem). A fonte de
> verdade agora é o [`DESIGN.md`](../DESIGN.md) na raiz (com o sidecar `.impeccable/design.json`).
> O conteúdo abaixo descreve a **v2** e fica como histórico — valores de cor, fonte, raio e
> ritmo mudaram; consulte sempre `apps/web/src/styles/_tokens.scss`.

# Design System (v2)

Identidade **preta + verde menta**, voz de marca técnica (Chakra Petch em caixa alta)
reservada para os títulos grandes, interface em Inter caixa normal. Tudo é token:
nenhuma folha de estilo fora de `_tokens.scss` tem cor literal — um teste unitário
reprova qualquer hex ou `rgb()` novo.

Código: [`apps/web/src/styles/`](../apps/web/src/styles) (tokens, mixins, base,
movimento, camadas) e [`apps/web/src/components/ui/`](../apps/web/src/components/ui) (kit).

---

## Princípios

| Princípio         | Como aparece                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarquia        | Três vozes: **display** (h1/h2 e números, Chakra Petch caixa alta), **interface** (h3+, botões, navegação, tabelas, Inter), **meta** (datas, contadores, mono discreto). Um CTA primário por seção. |
| Contraste         | Texto ≥ 4,5:1 e contorno de controle ≥ 3:1 em toda superfície em que aparecem — verificado por `tokens.contrast.test.ts`.                                                                           |
| Respiro           | Ritmo vertical por tokens de seção (`--ms-section-y`), dois gaps canônicos (lista e grade), padding de card por token.                                                                              |
| Consistência      | Um card, um cabeçalho de página, uma paginação, um estado vazio/erro, um formato de data por papel.                                                                                                 |
| Verde com papel   | Rótulo (kicker), interativo (hover, ativo, foco, link) e superfície de ação (CTA). Metadado, autoria e avisos não usam verde.                                                                       |
| Movimento contido | Fades curtos; `Reveal` por lista, não por item; hover com deslocamento só em elementos que navegam; `prefers-reduced-motion` respeitado sem congelar spinner/esqueleto.                             |

---

## Camadas da cascata

`@layer reset, tokens, base, components, pages, utilities;`

A ordem é a **primeira regra do documento** (no `<style>` inline de `index.html`,
espelho de `styles/_layers.scss`): no dev e nas rotas lazy o CSS dos componentes
chega antes da folha global, e a primeira folha a citar uma camada fixa a
prioridade. `scss-rules.test.ts` confere que as duas cópias são iguais e que toda
folha (exceto `_mixins`, `_layers` e `main`) declara sua camada:
`src/components/**` → `components`, `src/pages/**` e `src/admin/**` → `pages`.

---

## Cores

Superfícies em rampa perceptível; **campo sempre um degrau abaixo** da superfície que o contém.

| Token                                                                      | Valor                                     | Uso                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `--ms-bg` / `--ms-black`                                                   | `#0A0A0A`                                 | Fundo da página.                                                      |
| `--ms-surface`                                                             | `#151A18`                                 | Cards, rodapé, cabeçalho de página, sidebar.                          |
| `--ms-surface-2`                                                           | `#1C2320`                                 | Superfície interna, hover de item.                                    |
| `--ms-surface-3`                                                           | `#262E2A`                                 | Realce dentro de superfícies, trilhos.                                |
| `--ms-field-bg`                                                            | `#0F1311`                                 | Fundo de input/select/textarea.                                       |
| `--ms-border-subtle`                                                       | branco 6%                                 | Divisórias internas.                                                  |
| `--ms-border`                                                              | `#303934`                                 | Contorno de card (decorativo).                                        |
| `--ms-border-strong`                                                       | `#3F4A44`                                 | Separador em destaque.                                                |
| `--ms-border-control`                                                      | `#667470`                                 | **Contorno de controle** (input, chip, botão outline, burger): ≥ 3:1. |
| **`--ms-green`**                                                           | **`#29D98C`**                             | Cor da marca (selo #10019).                                           |
| `--ms-green-hover`                                                         | `#24C47E`                                 | Hover do botão primário.                                              |
| `--ms-green-deep`                                                          | `#3B9C7A`                                 | Ícones de apoio, bordas de destaque.                                  |
| `--ms-green-soft` / `-soft-strong` / `-line`                               | verde 10% / 16% / 35%                     | Fundo de ativo/selecionado e contorno de tag.                         |
| `--ms-text`                                                                | `#E8EDEA`                                 | Texto principal.                                                      |
| `--ms-text-dim`                                                            | `#9BA8A1`                                 | Texto secundário, placeholder.                                        |
| `--ms-text-faint`                                                          | `#8F9993`                                 | Legendas de 12–13px.                                                  |
| `--ms-text-disabled`                                                       | `#6B756F`                                 | Controles desabilitados.                                              |
| `--ms-on-green` / `--ms-on-green-soft`                                     | `#06231A` / `#15382D`                     | Texto sobre verde (sólido, nunca por opacidade).                      |
| `--ms-success` · `--ms-warning` · `--ms-danger` · `--ms-info`              | verde · `#F2B134` · `#FF5A5A` · `#5AB0FF` | Estados, cada um com `-soft` (fundo) e `-line` (contorno).            |
| `--ms-podium-1/2/3`                                                        | `#F2C14E` · `#C9D1CC` · `#E0955B`         | Ranking do quiz.                                                      |
| `--ms-overlay` · `--ms-overlay-strong` · `--ms-scrim` · `--ms-scrim-image` | —                                         | Fundo de modal/drawer, lightbox, navbar sólida, legenda sobre foto.   |

Gradientes: `--ms-gradient` (a única superfície verde: chamada final da Home e
destaques de prêmio), `--ms-gradient-dark` (fundos de hero), `--ms-gradient-text`
(título da Home).

### Matriz de contraste (texto × fundo)

Razões WCAG calculadas a partir dos tokens. Mínimos: 4,5 para texto, 3,0 para
contorno de controle e ícone informativo.

| Texto \ Fundo              | `--ms-bg` | `--ms-surface` | `--ms-surface-2` | `--ms-surface-3` | `--ms-field-bg` |
| -------------------------- | --------- | -------------- | ---------------- | ---------------- | --------------- |
| `--ms-text`                | 16.7      | 14.9           | 13.5             | 11.8             | 15.8            |
| `--ms-text-dim`            | 8.0       | 7.1            | 6.5              | 5.6              | 7.6             |
| `--ms-text-faint`          | 6.7       | 6.0            | 5.5              | 4.7              | 6.4             |
| `--ms-green`               | 10.7      | 9.6            | 8.7              | 7.6              | 10.2            |
| `--ms-green-deep`          | 5.9       | 5.2            | 4.7              | 4.1              | 5.5             |
| `--ms-danger`              | 6.5       | 5.8            | 5.2              | 4.6              | 6.1             |
| `--ms-warning`             | 10.5      | 9.3            | 8.5              | 7.4              | 9.9             |
| `--ms-info`                | 8.6       | 7.6            | 6.9              | 6.0              | 8.1             |
| `--ms-border-control`      | 4.1       | 3.6            | 3.3              | 2.9              | 3.8             |
| `--ms-text-disabled`       | 4.1       | 3.7            | 3.4              | 2.9              | 3.9             |
| `--ms-border` (decorativa) | 1.7       | 1.5            | 1.3              | 1.2              | 1.6             |

Sobre verde: `--ms-on-green` 9,0:1 no `#29D98C` e 6,5:1 na ponta escura do
gradiente; `--ms-on-green-soft` 5,0:1. Preto sobre `--ms-danger`: 6,5:1.
`--ms-green-deep` e `--ms-border-control` não levam texto sobre `--ms-surface-3`
(ficam como ícone/contorno em `bg`/`surface`/`surface-2`). `--ms-text-disabled` é
isento (WCAG 1.4.3 exclui controles inativos).

---

## Tipografia

Fontes self-hosted via `@fontsource` (CSP restrita, PWA offline).

| Papel                       | Fonte                                                    | Caixa  | Onde                                                           |
| --------------------------- | -------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| Display XL / LG             | Chakra Petch 700, `--ms-display-xl` / `--ms-display-lg`  | alta   | h1 da Home; h1 das páginas públicas                            |
| Título de seção (h2)        | Chakra Petch 700, `--ms-title-lg`, lh 1.15               | alta   | `SectionHeading` público                                       |
| Número                      | Chakra Petch 700, `--ms-display-num`, `tabular-nums`     | —      | estatísticas, contador, KPI do painel, "404"                   |
| Título de card/item (h3/h4) | Inter 600, `--ms-title` / `--ms-title-sm`                | normal | cards, linhas, títulos de modal                                |
| Títulos do painel           | Inter 600, 22–24px / 1.25                                | normal | `AdminPageHeader`, blocos do dashboard, login                  |
| Kicker                      | JetBrains Mono 500, 12px, 0.14em, verde                  | alta   | rótulo acima do título, colunas do rodapé, grupos da navegação |
| Meta                        | Mono 500, 12–13px, `--ms-text-dim`, 0.04em               | normal | datas, contadores, anos                                        |
| UI                          | Inter 500/600, 14px                                      | normal | botões, navegação, chips, `th`, labels                         |
| Corpo                       | Inter 400, 16px / 1.6                                    | —      | texto; texto longo em `.ms-prose` (68ch)                       |
| Legenda                     | Inter 400, 13px (`--ms-text-caption`), `--ms-text-faint` | —      | nunca abaixo de 12px                                           |

Nomes de pessoas e títulos escritos por visitantes nunca vão em caixa alta.

---

## Espaço, layout e raios

- **Passos** `--ms-space-1…16` (0,25rem → 8rem; escala de passos, não múltiplos exatos de 4px).
- **Ritmo:** `--ms-section-y` (clamp 3,5–6rem), `--ms-section-y-sm`, `--ms-section-x`; gaps `--ms-gap-list` e `--ms-gap-grid`; padding de card `--ms-card-pad` / `-sm`.
- **Larguras:** `--ms-container` 1200px (navbar, conteúdo e rodapé na mesma coluna), `--ms-container-wide` 1440px, `--ms-container-narrow` 760px, `--ms-measure` 68ch (sempre num filho, nunca no mesmo elemento que `.ms-container`).
- **Cabeçalho:** `--ms-navbar-h` 64px (56px abaixo de 768px); `--ms-header-h` soma a safe-area. O `<main>` compensa a navbar fixa uma vez; só a Home volta para baixo dela.
- **Controles:** `--ms-control-sm/-/-lg` 36/40/48px; `--ms-touch` 44px (mínimo em `pointer: coarse`, mixin `touch-target`); ícones `--ms-icon-xs…xl` 14–32px.
- **Raios:** `sm` 6px (chip, tag) · `md` 10px (input, botão só-ícone) · 12px (card) · `lg` 18px · `xl` 28px (bloco de destaque) · `pill` (botões).
- **Elevação:** `--ms-elev-1/2/3`; `--ms-lift` −2px, o único deslocamento de hover.
- **z-index:** nav 100 · drawer 200 · modal 300 · toast 400 · sistema 500 (avisos do PWA).

Breakpoints: `sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280 — espelhados em
`lib/breakpoints.ts` (`mq.below('lg')` para lógica JS); teste de sincronia garante a igualdade.

---

## Mixins principais

`below/from($bp)`, `hover` (só `hover: hover` + `pointer: fine`), `container`,
`focus-ring` / `focus-ring-inset` (anel de 2px que segue o raio; sobre verde o
contexto redefine `--ms-focus-color`), `card-surface`, `card($pad)`,
`card-grid($min, $gap)`, `stack`, `cluster`, `kicker`, `kicker-bar`, `meta`,
`display-heading($lh)`, `ui-heading`, `prose`, `scroll-row`, `sticky-panel`,
`honeypot`, `touch-target`, `line-clamp`, `scrollbar-x`, `visually-hidden`.

---

## Componentes (kit)

| Componente                                                                                                                                                                                | Notas                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button` / `IconButton` / `LinkButton`                                                                                                                                                    | `primary · outline · ghost · danger · danger-solid`; `sm/md/lg`; `iconOnly` exige `aria-label`; `loading` reserva a largura e usa `aria-busy`; `LinkButton` aceita `href` (download, mailto) e `external` (aviso "abre em nova aba"). |
| `Card`                                                                                                                                                                                    | `interactive` (só para cards que navegam), `selected`, `pad`.                                                                                                                                                                         |
| `SectionHeading`                                                                                                                                                                          | `kicker`, `as` (nível), `size`, `dense`, `actions`, `tone="on-green"`.                                                                                                                                                                |
| `PageHero`                                                                                                                                                                                | cabeçalho compacto: `kicker`, `title`, `subtitle`, `breadcrumb`, `actions`, `toolbar`, `media`, `size`, `decor`.                                                                                                                      |
| `Field` / `FieldGroup` / `Form`                                                                                                                                                           | associa label, hint e erro (`role="alert"`); `required` vira `aria-required`; "(opcional)" fica fora do `<label>`.                                                                                                                    |
| `Input` · `Select` · `Textarea` · `SearchField` · `Switch`                                                                                                                                | fundo `--ms-field-bg`, contorno `--ms-border-control`, 40px.                                                                                                                                                                          |
| `FilterChip` / `ChipRow`                                                                                                                                                                  | botões com `aria-pressed` num `role="group"` (filtros não são abas); linha rolável no celular.                                                                                                                                        |
| `Tabs`                                                                                                                                                                                    | WAI-ARIA `tablist` — só no painel, para trocar de visão.                                                                                                                                                                              |
| `Tag` / `StatusBadge`                                                                                                                                                                     | tons `brand · neutral · success · warning · danger · info · on-green`; `StatusBadge` mapeia status → rótulo e tom.                                                                                                                    |
| `QueryState`                                                                                                                                                                              | esqueleto → erro (inclusive consulta pausada offline) → vazio → dados; dados antigos ficam na tela se um refetch falhar.                                                                                                              |
| `StateBlock` (`EmptyState`, `ErrorState`)                                                                                                                                                 | mesma altura nos dois casos; `EmptyState` com `action`; `compact` para faixa discreta.                                                                                                                                                |
| Esqueletos                                                                                                                                                                                | `CardGridSkeleton({ min, aspect, body })`, `ListSkeleton({ rows, lead })`, `HeroSkeleton`, `ArticleSkeleton` — espelham a grade real.                                                                                                 |
| `Pagination`                                                                                                                                                                              | fora do `QueryState`, `loading` durante a troca.                                                                                                                                                                                      |
| `Breadcrumb`, `Dropdown`, `Avatar`, `DateText`, `FullScreenMessage`, `Quote`, `SocialPill`, `IconTile`, `Medallion`, `Thumb`, `MediaImage` (`sizes`), `Toast`, `Lightbox`, `YouTubeEmbed` | ver JSDoc de cada arquivo.                                                                                                                                                                                                            |

Painel (`apps/web/src/admin/components/`): `AdminPageHeader`, `DataTable`
(tabela ≥768px, cartões abaixo — só um no DOM; toda linha com `data-row`),
`RowActions` ("Editar X" / "Excluir X"), `Modal` (`size`, `description`,
`footer`; cabeçalho e rodapé fixos, corpo rolável, tela cheia no celular, fundo
fecha só em clique que começa e termina nele), `ConfirmDialog`, `useNewParam`
(`?novo=1`).

---

## Responsividade

| Componente       | <480                       | 480–767    | 768–1023                | 1024–1279              | ≥1280  |
| ---------------- | -------------------------- | ---------- | ----------------------- | ---------------------- | ------ |
| Navbar           | logo · CTA · menu → drawer | idem       | idem (drawer 2 colunas) | menu completo (grupos) | idem   |
| Home — números   | 1                          | 2×2        | 4                       | 4                      | 4      |
| Blog / posts     | 1                          | 1–2        | 2                       | 3                      | 3      |
| Equipe           | 2 col, ficha tela cheia    | 2–3        | 3, ficha tela cheia     | grade + ficha 400px    | idem   |
| Galeria          | 2                          | 2–3        | 3                       | 4                      | 4+     |
| Quiz             | 1                          | 1          | 1                       | jogo + ranking         | idem   |
| Rodapé           | marca + 1 coluna           | idem       | marca + 3 colunas       | marca · 3 colunas      | idem   |
| Painel — sidebar | drawer                     | drawer     | drawer                  | fixa 256px             | idem   |
| Painel — listas  | cartões                    | cartões    | tabela                  | tabela                 | tabela |
| Painel — KPIs    | 2                          | 2          | 3                       | 3                      | 4      |
| Modal            | tela cheia                 | tela cheia | 440 / 640 / 880         | idem                   | idem   |

Nenhuma página rola na horizontal em 320px; alvos de toque ≥ 44px em `pointer: coarse`;
`env(safe-area-inset-*)` em tudo o que é fixo.

---

## Acessibilidade e movimento

- Link "Pular para o conteúdo" como primeiro focável; `<main id="conteudo">`; anúncio de rota (site e painel).
- Drawer do site e do painel: diálogo modal com armadilha de foco, Esc, rolagem travada, botão de fechar próprio, `inert` quando fechado.
- Navbar: grupos em `Dropdown` (padrão disclosure: `aria-expanded`, setas, Esc devolve o foco); descrição do item como `aria-describedby`.
- Formulários: `noValidate`, erro por campo em `role="alert"`, foco no primeiro campo inválido.
- Toasts em duas regiões vivas (sucesso/info educadas; erro assertivo), pausa no hover/foco.
- `<MotionConfig reducedMotion="user">`; o bloco global de reduced-motion não congela spinner nem esqueleto (vira pulso).

---

## Marca

Geometria em [`components/brand/paths.json`](../apps/web/src/components/brand/paths.json),
fonte única de `LogoWordmark`, `LogoBadge`, `LogoMark`, do favicon e dos ícones
PWA/OG (`npm run icons` em `apps/web`). O wordmark mantém "INERSKILLS" como
`<text>` em Chakra Petch self-hosted (sempre disponível). Logos ao lado de um texto
que já os nomeia usam `decorative` (`aria-hidden`).
