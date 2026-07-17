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

Dropzone com **envio múltiplo** (todas as imagens de uma vez), campo de legenda
opcional aplicado aos próximos envios, e exclusão com confirmação (remove o registro
**e os arquivos**).

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/gallery` |
| `POST`/`PUT`/`DELETE` | `/api/admin/gallery[/:id]` |
| `PUT` | `/api/admin/gallery/reorder` — `{ ids: [...] }` na nova ordem |
