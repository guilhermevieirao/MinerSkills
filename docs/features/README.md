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
| [equipe.md](equipe.md) | `/equipe`, `/equipe/:slug` | `/admin/equipe`, `/admin/equipe/tags` |
| [quiz.md](quiz.md) | `/quiz` | `/admin/quiz` |
| [forum.md](forum.md) | `/forum`, `/forum/:id` | `/admin/forum` |
| [premios.md](premios.md) | `/premios` | `/admin/premios` |
| [temporadas.md](temporadas.md) | `/temporadas` (`?t=<slug>` expande uma) | `/admin/temporadas` |
| [agenda.md](agenda.md) | `/agenda` (+ `.ics`, Google Calendar e contador na Home) | `/admin/agenda` |
| [como-entrar.md](como-entrar.md) | `/como-entrar` | `/admin/paginas`, `/admin/configuracoes` |
| [contato.md](contato.md) | `/contato`, Como Entrar (bloco Inscreva-se) | `/admin/mensagens` |
| [admin.md](admin.md) | — | `/admin`, `/admin/midia`, `/admin/administradores`, `/admin/conta` |
| [social.md](social.md) | rodapé / Como Entrar | `/admin/social` |
| [patrocinadores.md](patrocinadores.md) | Home (faixa) / rodapé | `/admin/patrocinadores` |
| [configuracoes.md](configuracoes.md) | rodapé (lema, cidade, e-mail) e Como Entrar (inscrições) | `/admin/configuracoes` |

**Tudo é alimentado pelo administrador** — nenhum texto, imagem ou item de lista
está fixo no código. Onde a API ainda não respondeu, as telas mostram um texto de
fallback para não “piscar” vazio.
