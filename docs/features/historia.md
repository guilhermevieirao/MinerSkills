# História

**Rota:** `/historia` · **Componente:** `apps/web/src/pages/HistoriaPage.tsx` ·
**Admin:** `/admin/paginas`

Linha do tempo da equipe.

## Estrutura

| Parte | Origem |
| --- | --- |
| Cabeçalho | bloco `intro` (`title`, `subtitle`, `body`) |
| Timeline | modelo `TimelineItem` |
| Citação final | bloco `quote` (campo `body`) |

A timeline é uma trilha vertical com gradiente verde: cada marco tem um ponto
luminoso e um card com ano, título, descrição e imagem opcional. Os cards entram com
`<Reveal>` escalonado conforme a rolagem.

## Marcos (`TimelineItem`)

| Campo | Observação |
| --- | --- |
| `year` | Exibido como "kicker" do card. |
| `title`, `description` | Texto do marco. |
| `order` | Ordenação (empate desempata por `year`). |
| `media` | Imagem opcional. |

Gerenciados em `/admin/paginas` → aba **Timeline**.

> Há teste automatizado verificando que os marcos saem em ordem crescente de ano.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/timeline` · `/api/pages/historia` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/timeline[/:id]` |
