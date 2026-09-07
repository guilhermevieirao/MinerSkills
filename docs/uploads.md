# Uploads de mídia

Endpoint único: `POST /api/admin/media` (multipart, campo `file`) — **exige sessão de admin**.

---

## Pipeline

```
multipart → multer (limite de tamanho, arquivo em data/uploads/tmp)
  → file-type: detecta o tipo REAL por magic bytes  ← o mime do cliente é ignorado
  → allowlist + limite POR TIPO (imagem vs vídeo)
  → imagem: sharp reprocessa (remove EXIF, máx. 2560px) + gera thumbnail webp
     vídeo: move para a pasta final (sem reprocessar)
  → cria o registro MediaAsset
  → remove o arquivo temporário (sempre, mesmo em erro)
```

Implementação: [`media.service.ts`](../apps/api/src/modules/media/media.service.ts) ·
[`upload.ts`](../apps/api/src/middleware/upload.ts).

---

## Controles de segurança

| Controle | Como |
| --- | --- |
| **Tipo real** | `file-type` lê os magic bytes. Um `.exe` renomeado para `.jpg` é rejeitado. |
| **Allowlist** | `UPLOAD_ALLOWED_IMAGE_TYPES` / `UPLOAD_ALLOWED_VIDEO_TYPES` do `.env`. |
| **Tamanho** | `multer` corta no maior dos limites; o limite **por tipo** é reforçado depois da detecção → `413`. |
| **Metadados** | `sharp` reprocessa a imagem: EXIF/GPS e payloads escondidos somem. |
| **Nome** | `nanoid(20)` + extensão derivada do tipo **real**. O nome original nunca vira caminho (sem path traversal). |
| **Servir** | `X-Content-Type-Options: nosniff` e `Content-Disposition: inline`. |
| **Limpeza** | O `tmp` é removido no `finally`, mesmo quando a validação falha. |

---

## Estrutura em disco

```
apps/api/data/uploads/          # UPLOADS_DIR — volume no Docker
├── tmp/       # transitório
├── images/    # imagens processadas
├── videos/    # vídeos
└── thumbs/    # thumbnails webp (THUMB_WIDTH)
```

URLs públicas: `/uploads/images/<arquivo>` · `/uploads/videos/<arquivo>` ·
`/uploads/thumbs/<arquivo>`. Cache imutável de 30 dias.

---

## Configuração

| Variável | Padrão |
| --- | --- |
| `UPLOADS_DIR` | `./data/uploads` |
| `UPLOAD_IMAGE_MAX_MB` | `8` |
| `UPLOAD_VIDEO_MAX_MB` | `60` |
| `UPLOAD_ALLOWED_IMAGE_TYPES` | `image/jpeg,image/png,image/webp` |
| `UPLOAD_ALLOWED_VIDEO_TYPES` | `video/mp4,video/webm` |
| `THUMB_WIDTH` | `480` |

> Ao aumentar os limites, lembre do `client_max_body_size` no
> [`nginx.conf`](../apps/web/nginx.conf) (hoje 100M).

---

## No painel

| Componente | Onde |
| --- | --- |
| `<MediaPicker>` | Campo de imagem única (capa do post, foto do membro, badge do prêmio, imagem do bloco). Botão **Enviar** (upload novo) ou **Escolher da biblioteca** (reaproveita uma imagem existente). |
| `<MediaLibraryModal>` | Modal aberto pelo `<MediaPicker>`: só imagens, com busca e paginação; clicar seleciona. |
| Dropzone de galeria | `/admin/galeria` — envio múltiplo, com legenda opcional. |
| Dropzone do post | `/admin/blog` — fotos **e** vídeos (mp4/webm) do post. |
| **Biblioteca de mídia** | `/admin/midia` — tudo o que foi enviado, com os usos de cada arquivo. |

Vídeos longos devem ir para o **YouTube** e ser adicionados como embed (o editor aceita
a URL) — isso evita ocupar disco e servir streaming pela API.

### Biblioteca de mídia (`/admin/midia`)

Grade paginada (24 por página) de todos os `MediaAsset`, do mais recente ao mais antigo.
Código: [`MediaSection.tsx`](../apps/web/src/admin/sections/MediaSection.tsx).

| Recurso | Como funciona |
| --- | --- |
| **Filtro** | Chips **Todas / Imagens / Vídeos** (`?kind=`). |
| **Busca** | Pelo nome original do arquivo (`?q=`, debounce de 300 ms), com `contains`. No SQLite o `LIKE` ignora caixa (ASCII); no PostgreSQL distingue — para ficar insensível nos dois bancos, aplicar `mode: 'insensitive'` quando o provider for `postgresql`. |
| **Usos** | Cada card mostra **Usada em N** ou **Sem uso**. `N` soma as 7 relações: capa de post, mídia de post, galeria, timeline, bloco de conteúdo, foto de membro/robô e badge de prêmio. |
| **Detalhes** | Clicar no card abre preview, dimensões, tipo, tamanho e data; o campo **Texto alternativo (alt)** é a única edição possível (`PATCH`, máx. 240 caracteres). |
| **Onde é usada** | Lista com rótulos (título do post, nome do membro, `página / chave` do bloco, "N fotos" da galeria). Vazia: "Não é usada em nenhum lugar." |
| **Excluir** | Dois passos quando a mídia está em uso — ver abaixo. |

A API que sustenta a tela está em [api.md](api.md) (`GET /api/admin/media`,
`GET /api/admin/media/:id/usage`, `PATCH`, `DELETE`).

---

## Exclusão

`DELETE /api/admin/media/:id` remove o registro **e os arquivos** (original + thumbnail).

Antes de apagar, a API conta as referências. Se houver alguma e a requisição **não**
trouxer `?force=1`, ela responde **`409 conflict`** sem tocar em nada:

```json
{
  "error": "conflict",
  "message": "Mídia em uso em 3 itens. Confirme a exclusão forçada.",
  "details": { "postCover": 1, "postMedia": 0, "gallery": 2, "timeline": 0,
               "contentBlock": 0, "encyclopedia": 0, "award": 0 }
}
```

`DELETE /api/admin/media/:id?force=1` apaga mesmo em uso. Mídias sem uso são
removidas direto (`204`), com ou sem `force`.

No painel isso vira **dois diálogos**: o `ConfirmDialog` normal e, se a API devolver
409, um segundo com a mensagem da API e o aviso do que acontece com cada relação —
o botão **Excluir mesmo assim** repete a chamada com `force=1`.

Relações usam `onDelete: SetNull` (capa, foto de membro, badge, imagem de bloco e
timeline) ou `Cascade` (mídia do post, foto da galeria) — apagar uma mídia nunca deixa
referência quebrada: fotos da galeria e mídias de posts somem, o resto fica sem imagem.

---

## Imagens do seeder

O seeder cria mídias pelo mesmo pipeline do sharp:

- `SEED_IMAGE_SOURCE=remote` — baixa de `picsum.photos` com IDs fixos (determinístico);
- `SEED_IMAGE_SOURCE=local` — gera placeholders da marca (gradiente verde + textura
  hexagonal + rótulo). **Funciona offline** e é o que os testes e2e usam.

Se o download falhar, o seeder cai automaticamente para o placeholder local.
