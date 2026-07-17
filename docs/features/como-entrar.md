# Como Entrar

**Rota:** `/como-entrar` · **Componente:** `apps/web/src/pages/ComoEntrarPage.tsx` ·
**Admin:** `/admin/paginas` → blocos da página `como-entrar`

Explica o processo seletivo. É o destino do CTA principal da landing e do botão fixo
da navbar.

## Seções

| Parte | Origem |
| --- | --- |
| Cabeçalho | bloco `hero` |
| Marquee | "INSCRIÇÕES · PROCESSO SELETIVO · #10019" |
| Etapas | blocos `step_*` (cards numerados com ícone) |
| Requisitos | bloco `requisitos` |
| CTA final | bloco `cta` + botões das redes sociais |

## Blocos (`page = como-entrar`)

| `key` | Campos |
| --- | --- |
| `hero` | `title`, `subtitle`, `body` |
| `step_1` … `step_4` | `title` = nome da etapa · `subtitle` = "Etapa N" · `body` = descrição |
| `requisitos` | `title`, `subtitle`, `body` |
| `cta` | `title`, `body` |

> As etapas são renderizadas **por prefixo** (`step_`) e ordenadas por `order` —
> criar `step_5` no painel adiciona uma etapa nova automaticamente, com ícone
> escolhido ciclicamente. Não é preciso mexer no código.

## Datas do processo seletivo

Não são fixas na página: o botão "Ver datas na agenda" leva para `/agenda`, onde o
administrador cadastra eventos do tipo **processo-seletivo**. Assim não há duas
fontes de verdade para a mesma informação.

## Redes sociais

O CTA final lista os links de `GET /api/social-links` — os mesmos do rodapé,
gerenciados em `/admin/social`.

## API

`GET /api/pages/como-entrar` · `GET /api/social-links`
