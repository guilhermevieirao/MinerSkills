# Funcionalidades

Um documento por tela/módulo. Todas seguem o mesmo padrão:

- **Front-end:** `apps/web/src/pages/<Tela>.tsx` + `.scss`, dados via hook em
  `apps/web/src/features/<feature>/`.
- **Back-end:** `apps/api/src/modules/<feature>/` com `xPublicRouter` e `xAdminRouter`.
- **Contrato:** schemas zod + DTOs em `packages/shared/src/schemas/`.
- **Admin:** tela correspondente em `apps/web/src/admin/sections/`.

| Documento | Rota pública | Rota admin |
| --- | --- | --- |
| [landing.md](landing.md) | `/` | `/admin/paginas` |
| [historia.md](historia.md) | `/historia` | `/admin/paginas` |
| [blog.md](blog.md) | `/blog`, `/blog/:slug` | `/admin/blog` |
| [galeria.md](galeria.md) | `/galeria` | `/admin/galeria` |
| [enciclopedia.md](enciclopedia.md) | `/enciclopedia`, `/enciclopedia/:slug` | `/admin/enciclopedia` |
| [quiz.md](quiz.md) | `/quiz` | `/admin/quiz` |
| [forum.md](forum.md) | `/forum`, `/forum/:id` | `/admin/forum` |
| [premios.md](premios.md) | `/premios` | `/admin/premios` |
| [agenda.md](agenda.md) | `/agenda` | `/admin/agenda` |
| [como-entrar.md](como-entrar.md) | `/como-entrar` | `/admin/paginas` |
| [admin.md](admin.md) | — | `/admin` |
| [social.md](social.md) | rodapé / Como Entrar | `/admin/social` |

**Tudo é alimentado pelo administrador** — nenhum texto, imagem ou item de lista
está fixo no código. Onde a API ainda não respondeu, as telas mostram um texto de
fallback para não “piscar” vazio.
