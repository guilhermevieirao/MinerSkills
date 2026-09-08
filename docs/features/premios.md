# Prêmios e Conquistas

**Rota:** `/premios` · **Componente:** `apps/web/src/pages/PremiosPage.tsx` ·
**Admin:** `/admin/premios`

## Layout

| Grupo | Exibição |
| --- | --- |
| **Destaques** (`highlight: true`) | Faixas largas em gradiente verde, com badge circular grande, ano, evento e descrição. |
| **Demais** | Grid de cards com badge circular contornado — no espírito dos selos usados pela equipe. |

Os badges circulares seguem a referência visual das conquistas da MinerSkills
(`conteudo base/Miners Icons Example.png`). Sem imagem, entra um ícone da `lucide-react`.

## Campos (`Award`)

| Campo | Observação |
| --- | --- |
| `title` | Nome do prêmio. |
| `event` | Competição/evento. |
| `year` | Ano. |
| `description` | Texto. |
| `highlight` | Move para o grupo de destaques. |
| `order` | Ordenação (desempate por ano ↓). |
| `media` | Badge/imagem opcional. |
| `seasonId` / `seasonRef` | Temporada opcional (select "Temporada" no painel). A API responde `400` (`Temporada inválida`) se o id não existir; excluir a temporada deixa `null`. No site, o nome da temporada aparece como tag no card e no destaque; a página [Temporadas](temporadas.md) lista os prêmios de cada uma. |

## Conteúdo real

O **Rising All-Star Award** é uma conquista real da equipe e vem marcado como destaque
no seed, vinculado à temporada **Crescendo (2024)**. Os demais itens são fictícios e
devem ser substituídos pelo administrador.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/awards` |
| `POST`/`PUT`/`DELETE` | `/api/admin/awards[/:id]` (validam o `seasonId`) |
