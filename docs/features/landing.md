# Landing (Início)

**Rota:** `/` · **Componente:** `apps/web/src/pages/HomePage.tsx` ·
**Admin:** `/admin/paginas` → aba "Blocos de conteúdo" → página `landing`

Primeira tela: apresenta a MinerSkills e o ecossistema FRC / FIRST / STEM.

## Seções

| Seção | Origem | Movimento |
| --- | --- | --- |
| **Hero** | bloco `hero` (+ imagem) | Título com gradiente entrando de baixo; selo girando ao fundo; textura hexagonal. |
| **Marquee** | fixo | Faixa infinita "MINERSKILLS · 10019 · FRC". |
| **Próxima competição** | `GET /api/agenda` (primeiro evento publicado de tipo `competicao` com início no futuro) | `<NextCompetition>` (`.ms-next`): kicker, título, data, local, `<Countdown>` regressivo (dias/horas/minutos/segundos, atualizado a cada segundo; "Acontecendo agora" após a data) e botão "Ver agenda". Não é renderizada quando não há competição futura. Ver [agenda.md](agenda.md). |
| **Quem Somos** | bloco `about` | `<Reveal>` ao entrar no viewport. |
| **Estatísticas** | blocos `stat_*` | `<StatCounter>` conta de 0 até o valor; entrada escalonada. |
| **FRC / FIRST / STEM** | blocos `frc`, `first`, `stem` | Três cards com ícone, elevando no hover. |
| **Patrocinadores** | `GET /api/sponsors` (painel `/admin/patrocinadores`) | `<SponsorsStrip>`: grupos por nível (principal → apoio → parceiro) com logo ou nome, `<Reveal>` por grupo; some quando não há patrocinador ativo. Ver [patrocinadores.md](patrocinadores.md). |
| **CTA** | bloco `cta` | Bloco em gradiente verde → `/como-entrar`. |

## Blocos editáveis (`page = landing`)

| `key` | Campos usados |
| --- | --- |
| `hero` | `title`, `subtitle`, `body`, `media` (imagem de fundo) |
| `about` | `title`, `subtitle`, `body` |
| `frc` / `first` / `stem` | `title`, `subtitle`, `body` |
| `stat_hours`, `stat_team`, `stat_members`, `stat_award` | `title` = valor · `subtitle` = rótulo |
| `cta` | `title`, `subtitle`, `body` |

> Os blocos `stat_*` são renderizados por prefixo: criar `stat_qualquercoisa` no painel
> adiciona um card novo automaticamente. O ícone é escolhido ciclicamente.

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
