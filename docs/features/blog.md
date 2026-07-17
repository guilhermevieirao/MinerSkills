# Blog

**Rotas:** `/blog` e `/blog/:slug` · **Componentes:** `BlogPage.tsx`, `BlogPostPage.tsx` ·
**Admin:** `/admin/blog`

Notícias, novidades e bastidores. Um post pode ter título, conteúdo formatado,
**várias** fotos, **vários** vídeos, embeds do YouTube e links.

## Público

- **Lista:** grid de cards (capa, data, título, resumo), busca por texto e paginação
  (9 por página). Só posts **publicados**.
- **Post:** capa em destaque, conteúdo formatado, vídeos enviados, embeds do YouTube,
  galeria de fotos com lightbox e lista de links relacionados.

## Mídia

| Tipo | Como |
| --- | --- |
| **Fotos** | Upload (limite `UPLOAD_IMAGE_MAX_MB`). Grid clicável → lightbox. |
| **Vídeos** | Upload de mp4/webm (limite `UPLOAD_VIDEO_MAX_MB`), com `<video controls>`. |
| **YouTube** | Cole a URL; o painel extrai o ID. Player "lite": mostra a miniatura e só carrega o iframe (`youtube-nocookie`) ao clicar. |
| **Links** | Rótulo + URL, abrem com `noopener noreferrer`. |

Vídeos longos devem ir para o YouTube — upload direto é para clipes curtos.

## Editor

**TipTap** (`RichTextEditor.tsx`): negrito, itálico, riscado, títulos 2–3, listas,
citação, link, embed de YouTube, desfazer/refazer.

> O HTML produzido é **sanitizado no servidor** (`sanitizePostHtml`) antes de gravar —
> allowlist estrita, `iframe` só de `youtube-nocookie`. Nunca confie no editor.
> Por isso o `dangerouslySetInnerHTML` na página do post é seguro.

## Publicação

`published: false` = rascunho (invisível publicamente). Ao publicar pela primeira vez,
`publishedAt` é gravado; despublicar e republicar **preserva** a data original.

O `slug` é gerado do título (único, com sufixo numérico em caso de colisão) e
**atualizado** se o título mudar — links antigos deixam de funcionar. Evite renomear
posts já divulgados.

## Modelo

`Post` + `PostMedia` / `PostYoutube` / `PostLink` (tabelas relacionais — não `Json`,
por portabilidade). Ao atualizar, as relações são recriadas dentro de uma transação.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/posts?page&perPage&q` |
| `GET` | `/api/posts/:slug` |
| `GET` | `/api/admin/posts` · `/api/admin/posts/:id` |
| `POST`/`PUT`/`DELETE` | `/api/admin/posts[/:id]` |
