# Painel administrativo

**Rota:** `/admin` · **Código:** `apps/web/src/admin/`

Área onde **todo** o conteúdo da plataforma é gerenciado.

## Acesso

Só é alcançável **digitando a URL**. Não existe botão de "entrar" em nenhum lugar do
site público — há teste automatizado que varre as páginas e falha se algum
`href` contendo `/admin` aparecer. O `robots.txt` também bloqueia a rota.

O bundle do painel é um **chunk lazy**: visitantes comuns nunca o baixam.

Autenticação: e-mail + senha → cookie `httpOnly` + `SameSite=Strict`.
Detalhes em [security.md](../security.md).

## Telas

| Rota | O quê |
| --- | --- |
| `/admin` | **Dashboard** — contadores e alerta de moderação pendente. |
| `/admin/paginas` | **Blocos de conteúdo** (landing, história, como entrar) + **Timeline**. |
| `/admin/blog` | Posts: editor rich-text, capa, fotos, vídeos, YouTube, links, rascunho/publicado. |
| `/admin/galeria` | Upload múltiplo, legenda, exclusão. |
| `/admin/quiz` | Perguntas e opções; zerar leaderboard. |
| `/admin/equipe` | **Equipe** — membros e robôs: foto, tags, geração, sobre, citação. |
| `/admin/equipe/tags` | **Tags da equipe** — nome, ícone e ordem das tags de membro. Excluir uma tag a remove de todos os registros. |
| `/admin/forum` | Fila de moderação + todos os tópicos. |
| `/admin/premios` | Prêmios, com destaque e badge. |
| `/admin/agenda` | Eventos, com data/hora e tipo. |
| `/admin/social` | Links de redes sociais (aparecem no rodapé e em Como Entrar). |

## Padrões

Todas as telas seguem a mesma forma: **lista** (tabela ou grid) + **modal** de
criação/edição + **confirmação** para excluir + **toast** de resultado.

| Peça | Papel |
| --- | --- |
| `<Modal>` | Formulário em portal, fecha com `Esc`. |
| `<ConfirmDialog>` | Nenhuma exclusão acontece sem confirmação. |
| `<MediaPicker>` | Upload de imagem única com preview. |
| `<RichTextEditor>` | TipTap (blog). |
| `<Field>` | Rótulo + erro + acessibilidade (associa `<label>` ao controle). |

Validação com os **mesmos schemas zod do servidor** (`packages/shared`) — os erros
aparecem no campo antes mesmo da requisição. Após cada mutação, as queries públicas
correspondentes são invalidadas, então o site reflete a mudança imediatamente.

## Mobile

Abaixo de 1024px a sidebar vira um **drawer** com overlay. Tabelas rolam na horizontal
dentro do próprio contêiner — a página nunca rola lateralmente.

## Administradores

O seeder cria **um** admin a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Não há tela
de gestão de usuários (a equipe tem poucos administradores). Para adicionar outro,
insira uma linha em `Admin` com a senha em bcrypt (custo 12) — por exemplo via
`npm run db:studio` — ou acrescente ao seeder.

> **Troque `ADMIN_PASSWORD` antes de rodar o seed em produção.** A senha padrão é
> pública neste repositório.
