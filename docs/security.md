# Segurança

## Autenticação

| Aspecto | Implementação |
| --- | --- |
| Senhas | `bcryptjs`, custo **12**. |
| Token | JWT HS256 via `jose`, `JWT_SECRET` com **mínimo 32 caracteres** (validado no boot). |
| Transporte | Cookie **`httpOnly`** + **`SameSite=Strict`** + `Path=/api` + `Secure` quando `NODE_ENV=production`. |
| Expiração | `JWT_EXPIRES_IN` (padrão 12h). |
| Força bruta | Máx. `RATE_LIMIT_LOGIN_MAX` (5) tentativas **que falham** por janela de 15 min. |
| Enumeração | Mensagem genérica ("Credenciais inválidas") para e-mail e senha errados. |
| Timing | O `bcrypt.compare` roda **mesmo quando o e-mail não existe** (hash fictício). |

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
| Login | 5 falhas / 15 min | `RATE_LIMIT_LOGIN_MAX` |
| Fórum | 10 / 15 min | `RATE_LIMIT_FORUM_MAX` |
| Quiz | 30 / 15 min | `RATE_LIMIT_QUIZ_MAX` |

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
- Mutações sem sessão são bloqueadas.
- O cookie tem `HttpOnly`, `SameSite=Strict` e `Path=/api`.
- A validação zod rejeita payloads inválidos com `details`.
- `X-Powered-By` não é exposto.
- Uploads são servidos com `nosniff`.

`e2e/tests/forum-moderation.spec.ts` verifica que payloads XSS ficam inertes e que
nada aparece publicamente sem aprovação.

---

## Antes de ir para produção

- [ ] `JWT_SECRET` novo (`openssl rand -hex 32`)
- [ ] `ADMIN_PASSWORD` forte e trocado após o primeiro acesso
- [ ] `POSTGRES_PASSWORD` forte
- [ ] `NODE_ENV=production` (ativa o `Secure` no cookie)
- [ ] `TRUST_PROXY=1`
- [ ] `WEB_ORIGIN` com o domínio real
- [ ] **HTTPS** no proxy de borda (o cookie `Secure` exige)
- [ ] Considerar adicionar `Strict-Transport-Security` no proxy TLS
