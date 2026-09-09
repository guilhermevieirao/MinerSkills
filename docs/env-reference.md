# Referência do `.env`

O **`.env` na raiz do projeto é o único arquivo de configuração da plataforma**.
Não existem `.env` dentro de `apps/api`, `apps/web` ou `e2e` — e não devem existir.

## Como o arquivo único chega a cada parte

| Consumidor | Mecanismo |
| --- | --- |
| **Vite / front-end** | `vite.config.ts` define `envDir` para a raiz. Apenas variáveis com prefixo `VITE_` são expostas ao navegador. |
| **Express / API** | `apps/api/src/config/env.ts` resolve a raiz a partir do caminho do próprio módulo (independe do `cwd`), carrega com `dotenv` e **valida com zod** — o boot falha com mensagem clara se algo estiver ausente ou inválido. |
| **Prisma CLI** | Todo comando é embrulhado com `dotenv -e ../../.env --` nos scripts `db:*`. Nunca chame `prisma` diretamente. |
| **Docker Compose** | Os arquivos compose ficam na raiz, então o `.env` é lido automaticamente para `${VAR}`; os serviços também recebem `env_file: .env`. |
| **Playwright** | `e2e/playwright.config.ts` carrega o `.env` da raiz. |
| **CI (GitHub Actions)** | O `.env` não é versionado, então o workflow faz `cp .env.example .env` antes de qualquer script — os valores do exemplo bastam para o SQLite local do runner. Ver [testing.md](testing.md#integração-contínua). |

> ⚠️ Variáveis `VITE_*` são **embutidas no bundle em tempo de build**. Nunca coloque
> segredos nelas — tudo que é `VITE_*` é público.

---

## Variáveis

### Geral

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `production` \| `test`. Em `production` o cookie de sessão vira `Secure` e os logs deixam de ser formatados. |

### Banco de dados

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_PROVIDER` | `sqlite` | `sqlite` \| `postgresql`. **Carimbado** no `schema.prisma` por `scripts/stamp-schema.mjs`. Ver [database.md](database.md). |
| `DATABASE_URL` | `file:../data/dev.db` | String de conexão. No SQLite o caminho é relativo a `apps/api/prisma/`. Em Docker+Postgres o host é o serviço `postgres`, não `localhost`. |

### PostgreSQL (container)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `POSTGRES_USER` | `minerskills` | Usuário criado no container. |
| `POSTGRES_PASSWORD` | — | **Troque em produção.** |
| `POSTGRES_DB` | `minerskills` | Nome do banco. |
| `POSTGRES_PORT` | `5432` | Porta publicada no host. |

### API

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `API_PORT` | `3001` | Porta da API. |
| `API_HOST` | `0.0.0.0` | Interface de escuta. |
| `WEB_ORIGIN` | `http://localhost:5173` | Origem permitida no CORS. Deve ser a URL real do site. |
| `SITE_URL` | `http://localhost:5173` | URL pública canônica (**sem barra final**) usada pela API em `sitemap.xml`, `robots.txt` e na pré-visualização `/og/*` para bots sociais. Em produção, o mesmo domínio de `VITE_SITE_URL` (a versão do front, embutida no bundle). Ver [seo.md](seo.md). |
| `TRUST_PROXY` | `0` | Quantidade de **proxies confiáveis** (hops) à frente da API: `0` = nenhum (dev, `X-Forwarded-For` é ignorado); `1` = só o nginx; `2` = Caddy + nginx — o **padrão do `docker-compose.prod.yml`** (some 1 por proxy extra, como Cloudflare). Necessário para o rate limit por IP enxergar o IP real do cliente. `true`/`false` ainda são aceitos (→ `1`/`0`). |
| `BODY_LIMIT` | `1mb` | Tamanho máximo do corpo JSON. |

### HTTPS e backup (stack de produção)

Usadas só pelo `docker-compose.prod.yml` — ver [docker.md](docker.md#produção--docker-composeprodyml)
e [backup.md](backup.md).

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DOMAIN` | `localhost` | Domínio público servido pelo Caddy, que emite e renova o certificado (Let's Encrypt). `localhost` = certificado interno autoassinado, só para testar o stack. |
| `ACME_EMAIL` | — (vazio) | E-mail da conta ACME, para avisos de expiração do certificado. Opcional; com `DOMAIN=localhost` deixe vazio. |
| `BACKUP_DIR` | `./backups` | Pasta do **host** que recebe os backups (dump do Postgres + tar dos uploads). Está no `.gitignore`. |
| `BACKUP_INTERVAL_HOURS` | `24` | Intervalo entre backups automáticos do serviço `backup` (um ao subir e depois a cada N horas). |
| `BACKUP_KEEP_DAYS` | `14` | Retenção: backups mais antigos que N dias são apagados (`0` = nunca). |

### Autenticação (admin)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | — | **Mínimo 32 caracteres** (validado). Gere com `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` | `12h` | Validade do token. |
| `AUTH_COOKIE_NAME` | `ms_admin` | Nome do cookie httpOnly de sessão. |
| `ADMIN_EMAIL` | `admin@minerskills.com.br` | Usado **apenas pelo seeder** para criar o admin inicial. |
| `ADMIN_PASSWORD` | `MinerSkills@10019` | Idem. **Troque antes de rodar o seed em produção.** |
| `ADMIN_NAME` | `Administrador MinerSkills` | Idem. |

### Rate limiting

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Janela (15 min) usada por todos os limitadores. |
| `RATE_LIMIT_MAX` | `300` | Limite geral por IP em `/api`. |
| `RATE_LIMIT_LOGIN_MAX` | `5` | Tentativas de login por janela (só conta as que **falham**). |
| `RATE_LIMIT_FORUM_MAX` | `10` | Posts/respostas no fórum por janela. |
| `RATE_LIMIT_QUIZ_MAX` | `30` | Submissões de quiz por janela. |
| `RATE_LIMIT_CONTACT_MAX` | `5` | Envios do formulário de contato/inscrição (`POST /api/contact`) por janela. Cinco mensagens em 15 min já é muito para um visitante real; a suíte e2e sobe o valor para `1000`. |

### Uploads

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `UPLOADS_DIR` | `./data/uploads` | Relativo a `apps/api`. É um volume no Docker. |
| `UPLOAD_IMAGE_MAX_MB` | `8` | Tamanho máximo por imagem. |
| `UPLOAD_VIDEO_MAX_MB` | `60` | Tamanho máximo por vídeo. |
| `UPLOAD_ALLOWED_IMAGE_TYPES` | `image/jpeg,image/png,image/webp` | Allowlist verificada por **magic bytes**, não pelo mime enviado. |
| `UPLOAD_ALLOWED_VIDEO_TYPES` | `video/mp4,video/webm` | Idem. |
| `THUMB_WIDTH` | `480` | Largura dos thumbnails gerados pelo sharp. |

### Seeder

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `SEED_MODE` | `full` | `full` (site completo) \| `test` (dataset pequeno e determinístico para e2e). |
| `SEED_IMAGE_SOURCE` | `remote` | `remote` baixa fotos de picsum.photos; `local` gera placeholders da marca (funciona **offline**). |

### Front-end (público — vai para o bundle)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base das chamadas à API. |
| `VITE_UPLOADS_URL` | `/uploads` | Base das URLs de mídia. |
| `VITE_SITE_URL` | `http://localhost:5173` | URL canônica do site (**sem barra final**): `og:url`/`og:image` do `index.html`, `canonical` e JSON-LD das páginas. Mesmo domínio de `SITE_URL`. |
| `VITE_TEAM_NUMBER` | `10019` | Número da equipe. |
| `VITE_TEAM_NAME` | `MinerSkills` | Nome da equipe. |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:3001` | Alvo do proxy do Vite dev-server. Em Docker vira `http://api:3001`. |

### E2E (Playwright)

Os testes sobem servidores próprios, em portas separadas, para não colidirem com
`npm run dev` nem tocarem no banco de desenvolvimento.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:5273` | URL do front-end de testes. |
| `E2E_API_PORT` | `3101` | Porta da API de testes. |
| `E2E_DATABASE_URL` | `file:../data/e2e.db` | Banco **dedicado** aos testes (apagado a cada execução). |

---

## Checklist de produção

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` gerado com `openssl rand -hex 32`
- [ ] `ADMIN_PASSWORD` forte (e trocado após o primeiro login)
- [ ] `POSTGRES_PASSWORD` forte
- [ ] `DATABASE_PROVIDER=postgresql` e `DATABASE_URL` apontando para o serviço `postgres`
- [ ] `DOMAIN` com o domínio real (DNS já apontando para a máquina) e `ACME_EMAIL` preenchido
- [ ] `TRUST_PROXY=2` (Caddy + nginx à frente da API; some 1 por proxy extra)
- [ ] `WEB_ORIGIN`, `SITE_URL` e `VITE_SITE_URL` com o domínio real (`https://`, sem barra final) — os dois últimos alimentam sitemap, robots, canonical e Open Graph
- [ ] `BACKUP_DIR` numa pasta com espaço, copiada para fora da máquina de tempos em tempos ([backup.md](backup.md))
