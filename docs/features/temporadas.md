# Temporadas

**Rota:** `/temporadas` (com `?t=<slug>` para a temporada expandida) ·
**Componente:** `apps/web/src/pages/TemporadasPage.tsx` ·
**Admin:** `/admin/temporadas`

Linha do tempo competitiva da equipe: a cada ano a FRC revela um jogo novo, e a
temporada agrupa os **robôs** da Equipe, os **prêmios** e os **eventos** da Agenda
daquele ano. É o eixo que liga as outras três telas.

## Layout

Lista de cards `.ms-season`, um por temporada, na ordem `order ↑, year ↓`:

| Área | Conteúdo |
| --- | --- |
| **Cabeçalho** | Selo circular (imagem ou ícone `Layers`), ano em destaque, nome, jogo, resumo, contadores "N robôs · N prêmios" e a tag **Temporada atual** (`.ms-season--current`, borda verde à esquerda). |
| **Ver detalhes** | Botão com `aria-expanded`/`aria-controls`; clicar em qualquer ponto do cabeçalho também abre. Só um card fica aberto (`.ms-season--open`). |
| **Painel** | Três colunas (uma no mobile): **Robôs** (links para `/equipe/<slug>`, com foto), **Prêmios** (título, evento, ano) e **Eventos de <ano>** (título e data). Cada grupo tem texto de vazio próprio. |

O card expandido vive na URL (`/temporadas?t=reefscape`): o link é compartilhável e
sobrevive a reload. Abrir/fechar usa `setSearchParams` com `replace` e
`state.preserveScroll`, então a página não rola ao topo (ver `PublicLayout`).

O detalhe é buscado sob demanda (`useSeason(slug)`, `enabled: !!slug`) — a lista só
traz as contagens.

## Campos (`Season`)

| Campo | Observação |
| --- | --- |
| `name`, `slug` | Nome do jogo (ex.: Reefscape). Slug gerado no servidor, único; **só é recalculado quando o nome muda** (está em links públicos). |
| `year` | 1990..2100. Define quais eventos da Agenda entram no painel. |
| `game` | Nome oficial do jogo (ex.: REEFSCAPE presented by Haas). Opcional. |
| `summary` | Resumo (até 2000 caracteres). Opcional. |
| `badge` | Selo via `<MediaPicker>` (`badgeId`). Id inexistente responde `400` (`Selo inválido`). Excluir a mídia deixa `null` (`SetNull`). |
| `order` | Ordenação manual; empate → ano mais recente primeiro. |
| `isCurrent` | **Só uma temporada é a atual.** Marcar uma desmarca as demais na mesma transação (`POST`/`PUT`). |

## Vínculos

| Origem | Campo | Regra |
| --- | --- | --- |
| Robô (`EncyclopediaEntry`, `kind = robot`) | `seasonId` | Select "Temporada" no formulário de robô (`/admin/equipe`). A API responde `400` (`Temporada inválida`) se o id não existir e ignora o campo em membros. O texto livre `season` continua como "Rótulo da temporada". |
| Prêmio (`Award`) | `seasonId` | Select "Temporada" opcional em `/admin/premios`; mesma validação. |
| Evento (`AgendaEvent`) | — | Sem coluna: entram os eventos **publicados** cujo `startsAt` cai no ano civil da temporada (limites em UTC). |

Excluir uma temporada não apaga nada: robôs e prêmios ficam com `seasonId = null`
(`onDelete: SetNull`). O painel avisa quantos estão vinculados antes de confirmar.

Robôs e prêmios devolvem `seasonRef = { id, name, slug, year } | null`; a página
Equipe mostra o nome como tag no painel do robô e a página Prêmios, no card.

## Painel

`/admin/temporadas`: tabela (selo, nome, ano, jogo, **Atual**, robôs, prêmios) +
modal (nome, ano, ordem, jogo, resumo, selo, checkbox "Temporada atual") + confirmação
de exclusão. Toasts `Temporada salva.` / `Temporada removida.`.

Qualquer mutação invalida `['admin-seasons']`, `['seasons']`, `['admin-encyclopedia']`,
`['encyclopedia']`, `['admin-awards']` e `['awards']` — robôs e prêmios carregam
`seasonRef`, e a temporada carrega as contagens deles. No sentido inverso, salvar um
robô ou um prêmio invalida as duas chaves de temporada.

## Dados iniciais

O seed cria **Crescendo (2024)** e **Reefscape (2025, atual)**, cada uma com selo,
vincula os robôs pelo nome (R.O.B. Reefscape → Reefscape, R.O.B. Crescendo →
Crescendo; R.O.B. Rebuilt fica sem temporada) e os prêmios pelo ano (Rising All-Star
2024 → Crescendo). Não há backfill nem `INSERT` na migration: em bancos existentes o
administrador cadastra as temporadas e vincula os registros pelo painel.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/seasons` | `SeasonDTO[]` (`order ↑, year ↓`) com `badge`, `robotsCount` (só `kind = robot`) e `awardsCount`. |
| `GET` | `/api/seasons/:slug` | `SeasonDetailDTO`: a temporada + `robots` (`EncyclopediaEntryDTO[]`), `awards` (`AwardDTO[]`) e `events` (`AgendaEventDTO[]`, publicados, do ano). `404` se não existir. |
| `GET` | `/api/admin/seasons` | Todas. |
| `POST` | `/api/admin/seasons` | Cria (`seasonSchema`); slug gerado; `isCurrent: true` desmarca as demais. `201`. |
| `PUT` | `/api/admin/seasons/:id` | Atualiza; slug recalculado só se o nome mudou; `404` se não existir. |
| `DELETE` | `/api/admin/seasons/:id` | `204`; robôs e prêmios ficam sem temporada. |

Contrato em `packages/shared/src/schemas/season.ts` (`seasonSchema`, `SeasonRefDTO`,
`SeasonDTO`, `SeasonDetailDTO`); regras do schema testadas em `season.test.ts`.
