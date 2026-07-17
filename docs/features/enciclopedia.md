# Enciclopédia

**Rotas:** `/enciclopedia` e `/enciclopedia/:slug` ·
**Componente:** `apps/web/src/pages/EnciclopediaPage.tsx` · **Admin:** `/admin/enciclopedia`

Catálogo de membros (atuais e antigos), treinadores e robôs — no espírito de uma
"pokédex" da equipe: chips de filtro, grid de cards e painel de detalhe.

## Estrutura

| Área | Comportamento |
| --- | --- |
| **Chips de filtro** | `Todos` · uma por função (`MEMBER_TAGS`) · uma por geração · `Robôs`. |
| **Grid** | Cards com foto, nome, função (com marcador verde) e ícone da função. O card ativo ganha borda verde + halo. |
| **Detalhe** | **Desktop:** painel lateral fixo (sticky). **Mobile:** tela cheia sobreposta, com botão de fechar. |
| **Contador** | "N registros encontrados". |

O detalhe traz foto, nome, idade (ou temporada, para robôs), geração, tags de função,
seção **» Sobre** (parágrafos separados por linha em branco) e a citação.

## Filtros

Traduzidos para query params: `?tag=`, `?generation=`, `?kind=robot`.
A filtragem acontece **no servidor**; o grid reanima com `layout` + `AnimatePresence`.

Valores possíveis vêm de [`constants.ts`](../../packages/shared/src/constants.ts)
(`MEMBER_TAGS`, `GENERATIONS`) — a mesma fonte usada pelo select do painel. Adicionar
uma função nova é editar esse array.

## Deep link

Clicar num card navega para `/enciclopedia/<slug>` — a URL é compartilhável e
sobrevive a reload. Se o slug não existir no filtro atual, a rota volta para
`/enciclopedia`. Sem slug, o desktop pré-seleciona o primeiro registro.

## Campos (`EncyclopediaEntry`)

| Campo | Observação |
| --- | --- |
| `kind` | `member` \| `robot` — muda o formulário (idade ↔ temporada). |
| `name`, `slug` | Slug gerado automaticamente do nome, único. |
| `role` | Rótulo exibido no card. |
| `generation` | `1` \| `2` \| `3` (só membros). |
| `age` / `season` | Membro / robô. |
| `about` | Texto do painel. Parágrafos = linha em branco. |
| `quote` | Citação no rodapé do painel. |
| `isFormer` | Ex-membro / robô antigo. |
| `order` | Ordenação do grid. |
| `photo` | Upload via `<MediaPicker>`. |
| `tags` | Chips de filtro (multi-seleção). |

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/encyclopedia?kind&tag&generation&former` |
| `GET` | `/api/encyclopedia/:slug` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/encyclopedia[/:id]` |

## Referência visual

A estrutura segue a imagem de referência (`conteudo base/Enciclopedia.png`) — chips,
grid e painel lateral. **Apenas a estrutura**: a identidade visual é a da MinerSkills
(preto + verde), não a da referência.
