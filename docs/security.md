# Segurança

## Autenticação

| Aspecto | Implementação |
| --- | --- |
| Senhas | `bcryptjs`, custo **12**. |
| Token | JWT HS256 via `jose`, `JWT_SECRET` com **mínimo 32 caracteres** (validado no boot). |
| Transporte | Cookie **`httpOnly`** + **`SameSite=Strict`** + `Path=/api` + `Secure` quando `NODE_ENV=production`. |
| Expiração | `JWT_EXPIRES_IN` (padrão 12h). Antes disso a sessão cai se o admin for **excluído** ou **trocar a senha**: `requireAdmin` confere o registro e `passwordChangedAt` a cada requisição (uma busca por chave primária) e rejeita tokens emitidos antes da troca. |
| Força bruta | Máx. `RATE_LIMIT_LOGIN_MAX` (5) tentativas **que falham** por janela de 15 min — no login **e na troca de senha**. |
| Enumeração | Mensagem genérica ("Credenciais inválidas") para e-mail e senha errados. |
| Timing | O `bcrypt.compare` roda **mesmo quando o e-mail não existe**, contra um hash fictício **real** gerado no boot (60 caracteres, custo 12) — com um hash malformado o `bcryptjs` responde na hora e o tempo revelaria quais e-mails existem. |
| E-mail | Normalizado (`trim` + minúsculas) no login, no seed e na gestão de admins (`lib/email.ts`). Bases antigas são ajustadas pela migration `20260906130000_admin_session_revocation` (PostgreSQL) ou pelo backfill `backfill-admin-emails.ts` (SQLite). |

**Troca de senha (`PUT /api/admin/auth/password`, tela `/admin/conta`):** exige a
**senha atual** — uma sessão sequestrada não consegue trocar a senha sem conhecê-la —
e a nova precisa ter ao menos 10 caracteres e ser diferente da atual (validação
compartilhada com o front). Passa pelo mesmo rate limit do login, já que também
é alvo de força bruta; o `requireAdmin` vem antes do limiter, então um 401 por
falta de sessão não consome o balde. Ao trocar, a API grava `passwordChangedAt`,
**reemite o cookie** com um token novo (mesma validade de um login) e a sessão atual
segue ativa — todas as **outras** sessões desse admin, inclusive uma sequestrada,
passam a receber `401`.

**Gestão de administradores (`/api/admin/admins`, tela `/admin/administradores`):**
qualquer admin autenticado cria, edita e remove outros admins — não há papéis.
As senhas entram sempre em bcrypt (custo 12) e o `passwordHash` **nunca** sai da
API. Duas guardas evitam trancar a porta por fora: um admin **não exclui a própria
conta** (409) e **sempre resta ao menos um** administrador (409). Editar o próprio
registro reemite o cookie, já que o token carrega nome e e-mail. Redefinir a senha de
**outro** admin por essa tela é intencional (recuperação de acesso) e derruba as sessões
dele; a **própria** senha só muda em Minha conta — `PUT /api/admin/admins/:id` com
`password` no próprio registro responde `403`, senão uma sessão sequestrada trocaria a
senha do dono sem conhecê-la. Criar novos admins continua possível a partir de qualquer
sessão: a exigência da senha atual protege a conta, não o conjunto de administradores.
Excluir um admin invalida as sessões dele na hora (`requireAdmin` não encontra o registro).

**CSRF:** o cookie é `SameSite=Strict`, o CORS aceita apenas `WEB_ORIGIN` com
`credentials: true`, e a API só aceita JSON. Um site terceiro não consegue enviar
requisições autenticadas — por isso não há token anti-CSRF adicional.

**Rota administrativa:** `/admin` só é alcançável digitando a URL. Não há nenhum
link para ela no site público (há teste automatizado verificando isso) e o
`robots.txt` a bloqueia. O bundle do admin é um chunk separado, carregado sob demanda.

---

## Entrada

- **Toda** rota que escreve passa por `validate(schema)` com **zod** — os mesmos
  schemas usados no front (`packages/shared`).
- **HTML do blog:** sanitizado **no servidor** com `sanitize-html`, allowlist estrita
  (formatação, listas, links, imagens e `iframe` **apenas** de `youtube-nocookie`).
  Links recebem `rel="noopener noreferrer"`.
- **Fórum:** aceita **texto puro** — todo HTML é removido (`stripHtml`) antes de gravar.
  Há teste automatizado que envia `<script>` e `<img onerror>` e verifica que nada executa.
- **Apelidos:** 3–20 caracteres, regex de caracteres permitidos, HTML removido.
- Corpo JSON limitado a `BODY_LIMIT` (1mb).

### Formulários públicos

`POST /api/contact` (página Contato e inscrição em Como Entrar — ver
[features/contato.md](features/contato.md)) é a única rota pública que grava dados
pessoais, e a mais exposta a robôs. Camadas, na ordem em que rodam:

| Camada | Implementação |
| --- | --- |
| Rate limit | `RATE_LIMIT_CONTACT_MAX` (5 envios por IP a cada 15 min) — antes mesmo da validação. |
| Validação | `contactMessageSchema` (zod, o mesmo do front): tamanhos, e-mail, tipo. |
| Honeypot | Campo `website` (`HONEYPOT_FIELD`) presente no HTML mas fora da tela via CSS (`position: absolute; left: -9999px`, `tabIndex=-1`, `aria-hidden`) — **nunca** `type="hidden"`, que os robôs pulam. O schema aceita qualquer valor (um `400` revelaria o mecanismo — valor longo ou não textual vira preenchido via `.catch()`); se vier preenchido a rota responde `202` **sem gravar**. |
| Inscrição fechada | `kind: 'inscricao'` com `applications_open` diferente de `'true'` → `409`, independentemente do que o front mostrava. |
| Texto puro | `stripHtml` em nome, mensagem, escola, série e telefone antes de gravar (`&`, `<` e `>` ficam como digitados); o texto limpo passa pelo schema de novo, para uma tag removida não deixar nome ou mensagem abaixo do mínimo. |
| IP | Nunca em claro: `ipHash = sha256(ip + '|' + JWT_SECRET)`; `userAgent` cortado em 200 caracteres. Servem só para agrupar abuso e **não saem pela API** (o DTO não os inclui). |
| Resposta | `202 { ok: true }`, sem o registro — só o painel (`/api/admin/contact`, com sessão) lê as mensagens. |

Não há envio de e-mail: nada do formulário sai do servidor (nem para um SMTP), e o
`notifyNewMessage()` de `lib/notify.ts` registra apenas `{ id, kind }` no log — o
conteúdo, que pode ter dados de menores, fica só no banco.

---

## Integridade do quiz

- `GET /api/quiz/questions` **nunca** inclui `isCorrect` — as opções saem só com `id` e `text`
  (verificado por teste automatizado que inspeciona o payload).
- A pontuação é calculada **inteiramente no servidor**, comparando as respostas
  enviadas com o gabarito do banco. O cliente não pode forjar um resultado.
- Submissões são rate-limited.

---

## Uploads

Detalhes em [uploads.md](uploads.md). Resumo:

- Tipo real detectado por **magic bytes** (`file-type`) — o mime enviado pelo cliente
  é ignorado. Um `.exe` renomeado para `.jpg` é rejeitado.
- Allowlist e limites de tamanho **por tipo**, vindos do `.env`.
- Imagens são **reprocessadas com sharp** (remove EXIF/GPS, limita a 2560px) — o que
  também neutraliza payloads escondidos em metadados.
- Nomes de arquivo gerados com `nanoid` + extensão derivada do tipo **real**
  (o nome original nunca vira caminho).
- Servidos com `X-Content-Type-Options: nosniff`.

---

## Cabeçalhos HTTP

**API** (`helmet`): `nosniff`, `X-Powered-By` removido, `Cross-Origin-Resource-Policy`.

**Front-end** (nginx, [`nginx-security.conf`](../apps/web/nginx-security.conf)):

```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com;
  media-src 'self' blob:; font-src 'self'; connect-src 'self';
  frame-src https://www.youtube-nocookie.com https://www.youtube.com;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

As fontes são **self-hosted**, então não há origem externa em `font-src`.
`i.ytimg.com` aparece apenas para as miniaturas dos vídeos.

> ⚠️ **Atenção ao editar o `nginx.conf`:** o nginx só herda `add_header` de níveis
> superiores quando o nível atual **não declara nenhum**. Por isso os cabeçalhos de
> segurança ficam num snippet **incluído em cada `location`**. Se você adicionar um
> `add_header` novo em um `location`, o `include` precisa continuar lá — caso
> contrário os cabeçalhos de segurança somem silenciosamente.

---

## Rate limiting

| Superfície | Padrão | Variável |
| --- | --- | --- |
| Geral (`/api`) | 300 / 15 min | `RATE_LIMIT_MAX` |
| Login e troca de senha | 5 falhas / 15 min | `RATE_LIMIT_LOGIN_MAX` |
| Fórum | 10 / 15 min | `RATE_LIMIT_FORUM_MAX` |
| Quiz | 30 / 15 min | `RATE_LIMIT_QUIZ_MAX` |
| Contato / inscrição | 5 / 15 min | `RATE_LIMIT_CONTACT_MAX` |

Em produção, `TRUST_PROXY=1` é **necessário** para que o IP real (atrás do nginx)
seja usado — sem isso, todos os visitantes compartilham o mesmo balde.

---

## Banco de dados

- **Sem SQL cru.** `$queryRaw`/`$executeRaw` são bloqueados por regra do ESLint.
  Toda consulta passa pelo Prisma Client, que parametriza — SQL injection não é
  uma superfície acessível.
- Erros do Prisma são traduzidos para status HTTP sem vazar detalhes internos.

## Logs

`pino` com **redação** de `cookie`, `authorization` e qualquer campo `password`.
Apenas erros 5xx registram o stack.

---

## Cobertura automatizada

`e2e/tests/security.spec.ts` verifica a cada execução:

- Todas as rotas `/api/admin/*` respondem **401** sem sessão.
- Mutações sem sessão são bloqueadas — inclusive a troca de senha.
- O cookie tem `HttpOnly`, `SameSite=Strict` e `Path=/api`.
- A validação zod rejeita payloads inválidos com `details`.
- `X-Powered-By` não é exposto.
- Uploads são servidos com `nosniff`.

`e2e/tests/forum-moderation.spec.ts` verifica que payloads XSS ficam inertes e que
nada aparece publicamente sem aprovação.

`e2e/tests/admins.spec.ts` cria um administrador pelo painel, confirma que a própria
conta não pode ser excluída (na tela e na API), troca a senha do novo admin com a
sessão preservada, entra com a senha nova e remove o registro ao final.

`e2e/tests/contact.spec.ts` envia o honeypot preenchido pela API e confirma o `202`
sem nenhum registro na caixa de entrada, além de exercitar o envio real e o painel.

---

## Antes de ir para produção

- [ ] `JWT_SECRET` novo (`openssl rand -hex 32`)
- [ ] `ADMIN_PASSWORD` forte e trocado após o primeiro acesso — agora em `/admin/conta`, sem mexer no `.env`
- [ ] `POSTGRES_PASSWORD` forte
- [ ] `NODE_ENV=production` (ativa o `Secure` no cookie)
- [ ] `TRUST_PROXY=1` (quantidade de proxies à frente da API; some 1 por proxy extra)
- [ ] `WEB_ORIGIN` com o domínio real
- [ ] **HTTPS** no proxy de borda (o cookie `Secure` exige)
- [ ] Considerar adicionar `Strict-Transport-Security` no proxy TLS
