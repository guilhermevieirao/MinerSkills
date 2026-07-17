# Redes sociais

**Onde aparece:** rodapé (todas as páginas) e CTA de `/como-entrar` ·
**Admin:** `/admin/social`

## Como funciona

Os links vêm do banco (`SocialLink`) — nada fica fixo no código. Adicionar,
reordenar, desativar ou remover uma rede é feito pelo painel e reflete no site na
hora (a query pública é invalidada após cada mutação).

| Campo | Observação |
| --- | --- |
| `platform` | Define o **ícone**. Ver `SOCIAL_PLATFORMS`. |
| `label` | Texto do `aria-label`/`title` e do botão em Como Entrar. |
| `url` | Destino (aceita `mailto:` para e-mail). |
| `order` | Ordem de exibição. |
| `active` | Desativa sem apagar. |

## Ícones

Mapeados em [`SocialIcon.tsx`](../../apps/web/src/components/layout/SocialIcon.tsx) a
partir da `lucide-react` — **nunca emojis**:

| `platform` | Ícone |
| --- | --- |
| `instagram` | Instagram |
| `linkedin` | Linkedin |
| `youtube` | Youtube |
| `tiktok` | Music2 |
| `x` / `twitter` | Twitter |
| `facebook` | Facebook |
| `github` | Github |
| `email` | Mail |
| `website` / `other` | Globe |

Para suportar uma rede nova: acrescente o valor em `SOCIAL_PLATFORMS`
([`constants.ts`](../../packages/shared/src/constants.ts)) e o ícone no mapa acima.

## Segurança

Todos os links externos usam `target="_blank"` com **`rel="noopener noreferrer"`**
(verificado por teste automatizado).

## Seed

Instagram, LinkedIn, YouTube, TikTok e e-mail de contato — com URLs de exemplo.
**Confirme os endereços reais** antes de publicar.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/social-links` (só ativos) |
| `GET` | `/api/admin/social-links` (todos) |
| `POST`/`PUT`/`DELETE` | `/api/admin/social-links[/:id]` |
