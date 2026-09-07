# Galeria

**Rota:** `/galeria` · **Componente:** `apps/web/src/pages/GaleriaPage.tsx` ·
**Admin:** `/admin/galeria`

## Grid dinâmico

Layout **masonry** com CSS `columns` — as fotos mantêm a proporção original e se
encaixam em alturas variadas, sem biblioteca de terceiros e sem cálculo em JS
(portanto sem "pulo" de layout).

```scss
.ms-gallery { columns: 4 240px; }          // desktop: até 4 colunas
@include below($bp-md) { columns: 2 160px; } // mobile: 2 colunas
```

Cada item entra com fade+scale ao aparecer no viewport, aplica zoom suave no hover e
revela a legenda sobre um gradiente.

## Lightbox

Clique abre o `<Lightbox>` em tela cheia: imagem em tamanho original, legenda,
navegação com as setas (ou `←`/`→`) e fechamento com `Esc`, clique fora ou botão.
O scroll da página fica travado enquanto estiver aberto.

O grid usa **thumbnails** (`THUMB_WIDTH`, webp); o lightbox carrega a imagem cheia.

## Painel

**Componente:** `apps/web/src/admin/sections/GallerySection.tsx` (+ `GallerySection.scss`,
classe base `.ms-galadm`).

Dropzone com **envio múltiplo** (todas as imagens de uma vez), campo de legenda
opcional aplicado aos próximos envios, e exclusão com confirmação (remove a foto **da
galeria**; a imagem continua na Biblioteca de mídia como "Sem uso" e pode ser apagada
de vez em `/admin/midia`). Fotos novas entram com `order: 0`, ou seja, no topo.

As fotos aparecem numa **lista vertical** (miniatura, posição, legenda e texto
alternativo da mídia) na mesma ordem da página pública:

- **Legenda editável** — o botão "Editar legenda" (ícone de lápis) abre um modal com
  a miniatura e um `<Textarea>` validado pelo `galleryPhotoSchema` (até 240
  caracteres; em branco remove a legenda). Salva com `PUT /api/admin/gallery/:id`
  mantendo `mediaId` e `order` da foto.
- **Reordenação** — arraste pela alça (`Reorder.Group`/`Reorder.Item` do Motion,
  eixo vertical; o arraste começa só pela alça para não roubar o clique dos botões)
  ou use os botões "Mover para cima"/"Mover para baixo" (teclado e celular). A
  nova ordem fica em **estado local**: "Salvar ordem" (só habilita quando algo
  mudou) envia `PUT /api/admin/gallery/reorder { ids }` e "Descartar" volta à ordem
  do servidor. Fotos removidas ou enviadas enquanto há um rascunho são reconciliadas
  sem perder o arraste (as novas entram no fim do rascunho).

Toda mutação invalida as queries `['admin-gallery']` e `['gallery']`, então o site
público reflete a mudança na hora. Testes: `e2e/tests/gallery.spec.ts`.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/gallery` |
| `POST`/`PUT`/`DELETE` | `/api/admin/gallery[/:id]` |
| `PUT` | `/api/admin/gallery/reorder` — `{ ids: [...] }` na nova ordem |
