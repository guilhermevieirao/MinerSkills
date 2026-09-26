# Landing (Início)

**Rota:** `/` · **Componente:** `apps/web/src/pages/HomePage.tsx` ·
**Admin:** `/admin/paginas` → aba "Blocos de conteúdo" → página `landing`

Primeira tela: apresenta a MinerSkills e o ecossistema FRC / FIRST / STEM.

## Seções

Ordem de leitura: hero → números → marquee → próxima competição → quem somos →
pilares → últimas notícias → patrocinadores → chamada final. Um CTA primário por
seção; a cor da marca vira superfície só na chamada final.

| Seção | Origem | Comportamento |
| --- | --- | --- |
| **Hero** | bloco `hero` (+ imagem) | Sob a navbar transparente, `min(88dvh, 820px)`. Com foto do CMS: foto + scrim e textura hexagonal a 6%; sem foto: textura a 10%. Kicker, título com gradiente, lead e dois botões (Faça parte · Nossa história). Entrada com fade curto em CSS. |
| **Números** | blocos `stat_*` | `<StatsStrip>`: valores em voz de marca com divisórias, 4 → 2×2 → 1 colunas; `<StatCounter>` conta até o valor; esqueleto enquanto carrega. |
| **Marquee** | fixo | Faixa escura com texto verde-profundo; trilho duplicado que fecha o laço sem emenda em qualquer largura; parada com reduced-motion. |
| **Próxima competição** | `GET /api/agenda` (primeiro evento publicado de tipo `competicao` com início no futuro) | `<NextCompetition>` (`.ms-next`): kicker, título, data, local, "Ver agenda" junto do evento e `<Countdown>` regressivo. Esqueleto enquanto carrega; some sem competição futura ou com erro. Ver [agenda.md](agenda.md). |
| **Quem Somos** | bloco `about` (+ imagem) | Duas colunas alinhadas ao topo: prosa + "Conheça a equipe"; à direita a imagem do bloco ou o selo. |
| **FRC / FIRST / STEM** | blocos `frc`, `first`, `stem` | Três cards informativos (3 → 2 → 1), sem hover (não navegam). |
| **Últimas notícias** | `GET /api/posts?perPage=3` | `<LatestPosts>`: três `PostCard` + "Ver todas"; some sem posts publicados. |
| **Patrocinadores** | `GET /api/sponsors` | `<SponsorsStrip>`: grupos por nível (principal → apoio → parceiro) com logo ou nome; só o cartão com link levanta no hover; esqueleto enquanto carrega. Ver [patrocinadores.md](patrocinadores.md). |
| **Chamada final** | bloco `cta` | Bloco em gradiente verde → `/como-entrar` (botão invertido, anel de foco escuro) + link para o Quiz. |

Erro ao carregar os blocos vira uma faixa discreta com "Tentar novamente" — a página
tem textos de fallback e nunca fica vazia.

## Blocos editáveis (`page = landing`)

| `key` | Campos usados |
| --- | --- |
| `hero` | `title`, `subtitle`, `body`, `media` (imagem de fundo) |
| `about` | `title`, `subtitle`, `body`, `media` (imagem opcional ao lado do texto) |
| `frc` / `first` / `stem` | `title`, `subtitle`, `body` |
| `stat_hours`, `stat_team`, `stat_members`, `stat_award` | `title` = valor · `subtitle` = rótulo |
| `cta` | `title`, `subtitle`, `body` |

> Os blocos `stat_*` são renderizados por prefixo: criar `stat_qualquercoisa` no painel
> adiciona um número novo automaticamente.

> O `key` de um bloco existente **não pode** ser alterado (o componente o procura pelo
> nome). Criar blocos com outros `key` é seguro — eles simplesmente não são exibidos.

## Conteúdo real vs. fictício

Texto real da equipe: Rising All-Star, patrocínio FIEMG, SESI/SENAI, 12h semanais,
FIRST fundada em 1989 por Dean Kamen, Gracious Professionalism/Coopertition.
O que não é público consta como lorem ipsum e deve ser substituído pelo admin.

Os patrocinadores (FIEMG, SESI, SENAI) vêm do banco (`Sponsor`) e são editáveis em
`/admin/patrocinadores` — o rodapé só mostra o texto fixo "Apoio: FIEMG · SESI · SENAI"
enquanto a API não respondeu ou quando não há patrocinador ativo (ver
[patrocinadores.md](patrocinadores.md)).

## API

`GET /api/pages/landing` → `ContentBlockDTO[]` (ordenados por `order`).
