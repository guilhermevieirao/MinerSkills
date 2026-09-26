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
| `/admin` | **Dashboard** — saudação com a data; **Pendências** acionáveis (mensagens novas, itens na fila de moderação, denúncias abertas) ou "Tudo em dia"; 8 **números** (posts, membros, robôs, eventos, fotos, prêmios, tópicos, temporadas); **atalhos** (Novo post, Novo evento, Enviar fotos, Novo membro, Nova pergunta — abrem a seção com `?novo=1`); **próximos eventos** e **últimas mensagens**. |
| `/admin/paginas` | **Blocos de conteúdo** (landing, história, como entrar) + **Timeline**. |
| `/admin/blog` | Posts: editor rich-text, capa, fotos, vídeos, YouTube, links, rascunho/publicado. |
| `/admin/galeria` | Upload múltiplo, **legenda editável** por foto, **reordenação** (arraste pela alça ou botões "Mover para cima/baixo", com "Salvar ordem"/"Descartar"), exclusão. |
| `/admin/midia` | **Biblioteca de mídia** — tudo o que foi enviado (imagens e vídeos): filtro por tipo, busca pelo nome do arquivo, contagem de usos por card, edição do texto alternativo e lista de onde cada arquivo é usado. Exclusão em dois passos: se a mídia estiver em uso a API responde 409 e o painel pede confirmação forçada ("Excluir mesmo assim"). Dashboard ganhou o card **Mídias**. |
| `/admin/quiz` | Perguntas e opções; zerar leaderboard. |
| `/admin/equipe` | **Equipe** — membros e robôs: foto, tags, geração, sobre, citação; robôs têm o select **Temporada** (vínculo com `/admin/temporadas`) e o campo livre "Rótulo da temporada". |
| `/admin/equipe/tags` | **Tags da equipe** — nome, ícone e ordem das tags de membro. Excluir uma tag a remove de todos os registros. |
| `/admin/forum` | Fila de moderação; todos os tópicos (coluna **Moderado por**); aba **Denúncias** com badge de abertas, chips Abertas / Resolvidas e ações Ver tópico, Rejeitar conteúdo, Resolver e Reabrir. A sidebar soma pendentes + denúncias abertas no badge do item Fórum. |
| `/admin/mensagens` | **Mensagens** — caixa de entrada das inscrições e contatos enviados pelo site: chips de status (Novas, Lidas, Arquivadas, Todas) e de tipo (Inscrições, Contatos, Todos), cards com prévia, modal com todos os campos (abrir uma mensagem nova já a marca como lida; e-mail vira `mailto:`), botões Arquivar / Marcar como nova / Excluir (com confirmação) e paginação. A sidebar mostra um badge com as novas e o dashboard, um alerta. |
| `/admin/premios` | Prêmios, com destaque, badge e **Temporada** opcional. |
| `/admin/temporadas` | **Temporadas** — jogos da FRC por ano: nome, ano, jogo, resumo, selo, ordem e **Temporada atual** (só uma; marcar desmarca as demais). A tabela mostra quantos robôs e prêmios estão vinculados; excluir não apaga nada (ficam sem temporada). |
| `/admin/agenda` | Eventos, com data/hora, tipo e link de inscrição ou detalhes (opcional). |
| `/admin/social` | Links de redes sociais (aparecem no rodapé e em Como Entrar). |
| `/admin/patrocinadores` | **Patrocinadores** — nome, site, nível (principal / apoio / parceiro), logo (`<MediaPicker>`), ordem e ativo. Aparecem na faixa da Home e na linha "Apoio" do rodapé. |
| `/admin/configuracoes` | **Configurações** — lema, cidade, e-mail de contato, inscrições abertas e aviso. |
| `/admin/administradores` | **Administradores** — quem entra no painel: nome, e-mail e senha. A própria conta não pode ser excluída e sempre resta ao menos um admin. |
| `/admin/conta` | **Minha conta** — nome e e-mail da sessão e **troca de senha** (exige a senha atual; a sessão continua ativa). |

## Shell

- **Sidebar agrupada** por intenção — Dashboard · Conteúdo (Páginas & Timeline, Blog,
  Galeria, Mídia) · Equipe (Membros & robôs, Tags, Temporadas, Prêmios) · Comunidade
  (Fórum, Quiz, Mensagens) · Site (Agenda, Patrocinadores, Redes sociais,
  Configurações) · Acesso (Administradores, Minha conta). Fonte única em
  `admin/adminNav.ts`, que também alimenta a trilha da topbar e o título da aba
  (`Blog · Painel`). Grupos recolhíveis (estado no `localStorage`; o grupo da rota
  atual nunca recolhe). Pendências (fórum: fila + denúncias; mensagens novas) em
  badge de aviso, somadas no grupo recolhido.
- **Topbar**: botão "Menu" (abaixo de 1024px), trilha "Painel › grupo › seção" e "Ver site".
- **Rodapé da sidebar**: avatar, nome e "Sair" (com estado pendente e erro em toast).
- Abaixo de 1024px a sidebar é um **drawer modal** (armadilha de foco, Esc, rolagem
  travada, botão "Fechar", `inert` quando fechado).
- "Pular para o conteúdo", `<main id="conteudo">`, anúncio de rota, `noindex`.
- URL inexistente dentro do painel mostra **"Página não encontrada"**; erro de rede ao
  verificar a sessão mostra "Tentar novamente" (só `401` leva ao login).

## Padrões

Todas as telas seguem a mesma forma: **cabeçalho** (`AdminPageHeader`: título,
descrição e a ação primária) + **lista** (`DataTable` ou grade) com `QueryState`
(esqueleto, erro com nova tentativa, vazio **com ação**) + **modal** de criação/edição +
**confirmação** para excluir + **toast** de resultado.

> Exceção: **Configurações** é um formulário único (sem lista/modal), gerado a partir de
> `SETTING_DEFINITIONS` e salvo de uma vez em `PUT /api/admin/settings/bulk`.

| Peça | Papel |
| --- | --- |
| `<AdminPageHeader>` | Título em escala de produto (Inter), descrição e ações; a ação primária nunca some durante o carregamento. |
| `<DataTable>` | Tabela a partir de 768px e **cartões** abaixo (só um dos dois no DOM). Colunas com `primary` (título do cartão), `lead` (miniatura), `hideOnMobile`; `caption` para leitores de tela; toda linha com `data-row`. |
| `<RowActions>` | Botões de linha em slots fixos com nome acessível ("Editar X", "Excluir X"); o excluir é discreto em repouso e vermelho só ao apontar/focar. |
| `<Modal>` | Portal com pilha (Esc fecha só o de cima), `size` sm/md/lg, `description`, `footer` fixo (Salvar ligado ao `<form>` por `form=`), corpo rolável, tela cheia no celular. O fundo só fecha num clique que começa e termina nele. |
| `<ConfirmDialog>` | Título específico, texto explicando o efeito, confirmação em vermelho sólido. Nenhuma exclusão sem confirmação. |
| `useNewParam` | `?novo=1` abre o formulário de criação (atalhos do dashboard) e limpa o parâmetro. |
| `<MediaPicker>` | Upload de imagem única com preview, ou **Escolher da biblioteca**. |
| `<MediaLibraryModal>` | Escolha de imagem existente (busca + paginação). |
| `<RichTextEditor>` | TipTap (blog); o conteúdo usa a mesma prosa do post publicado. |
| `<Field>` / `<Switch>` | Rótulo, dica e erro associados; booleanos como interruptor. |

Validação com os **mesmos schemas zod do servidor** (`packages/shared`): erro no campo,
foco no primeiro inválido, antes mesmo da requisição. Após cada mutação, as queries
públicas correspondentes são invalidadas, então o site reflete a mudança imediatamente.

## Mobile

Abaixo de 1024px a sidebar vira um **drawer**; abaixo de 768px as listagens viram
**cartões** (título, campos em duas colunas e ações no rodapé do cartão) e os modais
ocupam a tela inteira com as ações fixas na base. A página nunca rola na horizontal.

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
