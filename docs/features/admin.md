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
| `/admin/galeria` | Upload múltiplo, **legenda editável** por foto, **reordenação** (arraste pela alça ou botões "Mover para cima/baixo", com "Salvar ordem"/"Descartar"), exclusão. |
| `/admin/midia` | **Biblioteca de mídia** — tudo o que foi enviado (imagens e vídeos): filtro por tipo, busca pelo nome do arquivo, contagem de usos por card, edição do texto alternativo e lista de onde cada arquivo é usado. Exclusão em dois passos: se a mídia estiver em uso a API responde 409 e o painel pede confirmação forçada ("Excluir mesmo assim"). Dashboard ganhou o card **Mídias**. |
| `/admin/quiz` | Perguntas e opções; zerar leaderboard. |
| `/admin/equipe` | **Equipe** — membros e robôs: foto, tags, geração, sobre, citação. |
| `/admin/equipe/tags` | **Tags da equipe** — nome, ícone e ordem das tags de membro. Excluir uma tag a remove de todos os registros. |
| `/admin/forum` | Fila de moderação + todos os tópicos. |
| `/admin/premios` | Prêmios, com destaque e badge. |
| `/admin/agenda` | Eventos, com data/hora e tipo. |
| `/admin/social` | Links de redes sociais (aparecem no rodapé e em Como Entrar). |
| `/admin/configuracoes` | **Configurações** — lema, cidade, e-mail de contato, inscrições abertas e aviso. |
| `/admin/administradores` | **Administradores** — quem entra no painel: nome, e-mail e senha. A própria conta não pode ser excluída e sempre resta ao menos um admin. |
| `/admin/conta` | **Minha conta** — nome e e-mail da sessão e **troca de senha** (exige a senha atual; a sessão continua ativa). |

## Padrões

Todas as telas seguem a mesma forma: **lista** (tabela ou grid) + **modal** de
criação/edição + **confirmação** para excluir + **toast** de resultado.

> Exceção: **Configurações** é um formulário único (sem lista/modal), gerado a partir de
> `SETTING_DEFINITIONS` e salvo de uma vez em `PUT /api/admin/settings/bulk`.

| Peça | Papel |
| --- | --- |
| `<Modal>` | Formulário em portal, fecha com `Esc`. |
| `<ConfirmDialog>` | Nenhuma exclusão acontece sem confirmação. |
| `<MediaPicker>` | Upload de imagem única com preview, ou **Escolher da biblioteca** (reaproveita uma imagem já enviada). |
| `<MediaLibraryModal>` | Modal de escolha de imagem existente (busca + paginação); usado pelo `<MediaPicker>`. |
| `<RichTextEditor>` | TipTap (blog). |
| `<Field>` | Rótulo + erro + acessibilidade (associa `<label>` ao controle). |

Validação com os **mesmos schemas zod do servidor** (`packages/shared`) — os erros
aparecem no campo antes mesmo da requisição. Após cada mutação, as queries públicas
correspondentes são invalidadas, então o site reflete a mudança imediatamente.

## Mobile

Abaixo de 1024px a sidebar vira um **drawer** com overlay. Tabelas rolam na horizontal
dentro do próprio contêiner — a página nunca rola lateralmente.

## Administradores

O seeder cria **um** admin a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. A partir daí
tudo acontece pelo painel, sem tocar no `.env` nem no banco:

- **`/admin/administradores`** lista quem tem acesso e permite **criar**, **editar**
  (nome, e-mail e, opcionalmente, redefinir a senha) e **remover** administradores.
  Não há papéis: qualquer admin autenticado gerencia os demais.
- **`/admin/conta`** mostra os dados da sessão e permite **trocar a própria senha**,
  informando a senha atual. A nova senha precisa de 10+ caracteres e ser diferente
  da atual; a confirmação é validada no cliente antes de enviar.

Duas guardas evitam trancar a porta por fora: um admin **não exclui a própria conta**
(o botão nem aparece na linha marcada com "Você", e a API responde `409`) e
**sempre resta ao menos um** administrador. As senhas são gravadas em bcrypt (custo 12)
e o hash nunca sai da API. Detalhes em [security.md](../security.md).

> **Troque `ADMIN_PASSWORD` antes de rodar o seed em produção** e, no primeiro
> acesso, troque a senha novamente em `/admin/conta`. A senha padrão é pública
> neste repositório.
