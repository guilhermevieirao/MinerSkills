# Docker

Duas stacks, ambas configuradas pelo **`.env` único da raiz** (o compose lê o arquivo
automaticamente para `${VAR}` e o repassa aos serviços via `env_file`).

---

## Desenvolvimento — `docker-compose.yml`

```bash
docker compose up                       # web + api (SQLite)
docker compose --profile postgres up    # + PostgreSQL
docker compose logs -f api              # logs
docker compose down                     # parar
```

| Serviço | Porta | Detalhes |
| --- | --- | --- |
| `web` | 5173 | Vite dev-server com HMR. Proxy de `/api` para o serviço `api`. |
| `api` | 3001 | `tsx watch` com hot reload. Healthcheck em `/api/health`. |
| `postgres` | 5432 | **Só sobe com `--profile postgres`.** |

**Hot reload:** o código-fonte é montado (`apps/api/src`, `apps/web/src`,
`packages/shared/src`) — editar no host recarrega no container.

**Volumes:** `api-data` guarda o SQLite e os uploads; `pgdata` guarda o PostgreSQL.

Popular o banco dentro do container:

```bash
docker compose exec api npx tsx prisma/seed.ts
```

---

## Produção — `docker-compose.prod.yml`

```
internet ──443/80──▶ caddy (TLS, HSTS, http→https) ──▶ web (nginx: SPA + proxy) ──▶ api ──▶ postgres
                                                                                       │
                                                                  backup (pg_dump + tar) ┘
```

Ajuste o `.env` antes:

```dotenv
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://minerskills:SENHA@postgres:5432/minerskills?schema=public"
#                                            ^ host = nome do serviço, não localhost
DOMAIN=minerskills.com.br            # o Caddy emite o certificado para este nome
ACME_EMAIL=contato@minerskills.com.br # opcional: avisos de expiração do certificado
TRUST_PROXY=2                        # Caddy + nginx à frente da API
WEB_ORIGIN=https://minerskills.com.br
SITE_URL=https://minerskills.com.br       # sem barra final (sitemap/robots/og da API)
VITE_SITE_URL=https://minerskills.com.br  # idem, embutido no bundle do front
JWT_SECRET=<openssl rand -hex 32>
POSTGRES_PASSWORD=<senha forte>
BACKUP_DIR=./backups                 # pasta do host que recebe os backups
```

O DNS do domínio precisa apontar para a máquina **antes** de subir — o Let's Encrypt
valida o domínio conectando nas portas 80/443, que devem estar abertas no firewall.

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

| Serviço | Porta | Detalhes |
| --- | --- | --- |
| `caddy` | **80, 443** (+443/udp) | Único serviço publicado. Certificado automático (Let's Encrypt, renovado sozinho), redirect `http://` → `https://` (308), `Strict-Transport-Security`. Config em [`Caddyfile`](../Caddyfile). |
| `web` | interna | **nginx** servindo o SPA buildado + proxy de `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` e `/og/` para a API. Só o Caddy o acessa. |
| `api` | interna | Sem porta publicada — só o nginx a acessa. |
| `postgres` | interna | Volume `pgdata`. |
| `backup` | — | Dump do Postgres + tar dos uploads a cada `BACKUP_INTERVAL_HOURS` em `BACKUP_DIR`. Ver [backup.md](backup.md). |

O `api` só sobe depois do `postgres` estar **healthy**, o `web` depois do `api`, e o
`caddy` depois do `web`.

**Testar o stack sem domínio:** deixe `DOMAIN=localhost` (e `ACME_EMAIL` vazio). O
Caddy emite um certificado da sua CA interna, autoassinado — o navegador avisa e o
`curl` precisa de `-k`:

```bash
curl -kI https://localhost/            # 200 + strict-transport-security
curl -I  http://localhost/             # 308 → https://localhost/
```

**Já tem um proxy TLS na frente (Cloudflare, Traefik, nginx do host)?** Remova o
serviço `caddy` e devolva ao `web` um `ports: ['8080:80']`; ajuste `TRUST_PROXY` para a
quantidade de proxies que restarem à frente da API (só o nginx do stack = `1`).

**Cookie do admin:** com `NODE_ENV=production` o cookie de sessão é `Secure`, ou seja,
o navegador só o envia em HTTPS. Sem TLS na borda o login do painel não funciona — é o
Caddy que torna isso viável sem configuração extra.

Primeira carga de dados:

```bash
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

> ⚠️ O seeder **apaga todos os dados** antes de inserir. Use apenas na carga inicial —
> para voltar um estado anterior, use [a restauração de backup](backup.md#restaurar).

---

## Imagens

| Dockerfile | Alvos |
| --- | --- |
| `apps/api/Dockerfile` | `dev` (tsx watch) e `prod` (tsx). Base `node:22-alpine` + `openssl` (Prisma) + `libc6-compat` (sharp). |
| `apps/web/Dockerfile` | `dev` (Vite) e `prod` (build → **nginx:1.27-alpine**). |

### Entrypoint da API

`apps/api/docker-entrypoint.sh` roda a cada boot:

1. **carimba** o `schema.prisma` a partir de `DATABASE_PROVIDER`;
2. **gera** o Prisma Client (sempre — o provider pode ter mudado desde o build);
3. PostgreSQL → `prisma migrate deploy` · SQLite → `prisma db push` + backfills de
   dados iniciais (agregador `prisma/backfill.ts`, idempotente — ver
   [database.md](database.md#agregador-de-backfills-sqlite));
4. `SEED_ON_BOOT=1` (opcional) roda o seeder;
5. inicia a API.

Isso é o que permite trocar de banco mexendo só no `.env`, sem reconstruir a imagem.

### Variáveis `VITE_*` e o build

Variáveis `VITE_*` são **embutidas no bundle em tempo de build**, não lidas em runtime.
Por isso o `docker-compose.prod.yml` as passa como **build args**. Ao mudar qualquer
`VITE_*`, é preciso **reconstruir** o `web`:

```bash
docker compose -f docker-compose.prod.yml up --build web
```

---

## Notas de manutenção

**Healthcheck usa `127.0.0.1`, não `localhost`.** A API escuta em IPv4; `localhost`
dentro do container resolve para `::1` primeiro e a checagem falharia com
"connection refused".

**Cabeçalhos de segurança do nginx** ficam em `nginx-security.conf` e são
**incluídos em cada `location`** — o nginx descarta os `add_header` herdados quando o
nível atual declara qualquer `add_header` próprio. Ver [security.md](security.md).

**Contexto `http` do nginx (`nginx-map.conf`).** `map` e `upstream` não podem ficar
num bloco `server`, então vivem em `apps/web/nginx-map.conf`, que o Dockerfile copia
para `/etc/nginx/conf.d/00-map.conf`. O `nginx.conf` da imagem inclui `conf.d/*.conf`
em ordem alfabética, por isso o `00-` — ele precisa ser carregado antes do
`default.conf` (nosso `nginx.conf`), que usa a variável `$ms_preview_bot` (bots de
pré-visualização de links, que recebem `/og/*` da API em vez do SPA) e o upstream
`minerskills_api`. Ver [seo.md](seo.md). Para validar as três configurações sem subir
o stack:

```bash
docker run --rm --add-host api:127.0.0.1 \
  -v "$PWD/apps/web/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/apps/web/nginx-map.conf:/etc/nginx/conf.d/00-map.conf:ro" \
  -v "$PWD/apps/web/nginx-security.conf:/etc/nginx/snippets/minerskills-security.conf:ro" \
  nginx:1.27-alpine nginx -t
```

(`--add-host` porque `proxy_pass http://api:3001` e o upstream resolvem o host no boot.)

O mesmo arquivo define `$ms_forwarded_proto`: o esquema que o **cliente** usou, lido do
`X-Forwarded-Proto` que o Caddy envia (a conexão Caddy → nginx é sempre `http`, então
`$scheme` mentiria). Sem proxy à frente, cai em `$scheme`. É esse valor que o nginx
repassa à API.

**Caddyfile** — validar sem subir o stack (é o que o CI faz):

```bash
docker run --rm -e DOMAIN=localhost -e ACME_EMAIL= \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile
```

Os certificados e a conta ACME ficam no volume `caddy_data`; não o apague entre
deploys, senão o Caddy pede tudo de novo (o Let's Encrypt limita emissões por semana).

**Ícones do PWA** não são gerados no build da imagem (o `sharp` vive no workspace da
API). São assets versionados em `apps/web/public/icons`; regere com `npm run icons`.

---

## Solução de problemas

| Sintoma | Causa provável |
| --- | --- |
| `EPERM` no `prisma generate` (Windows) | A API está rodando e mantém o engine aberto. Pare-a antes. |
| API `unhealthy` | Veja `docker compose logs api`. Com Postgres, confirme que `DATABASE_URL` usa o host `postgres`. |
| Front-end não fala com a API | Em Docker, `VITE_DEV_PROXY_TARGET` deve ser `http://api:3001` (o compose já define). |
| Mudei `VITE_*` e nada aconteceu | Reconstrua o `web` (`--build`). |
| Uploads sumiram | Eles vivem no volume `api-data`/`uploads`. `docker compose down -v` apaga volumes. Restaure o último `uploads-*.tar.gz` ([backup.md](backup.md)). |
| `https://` não sobe / certificado não emitido | `docker compose logs caddy`. DNS do `DOMAIN` apontando para a máquina? Portas 80 e 443 abertas? Com `DOMAIN=localhost` o certificado é interno (use `curl -k`). |
| Login do admin não “pega” em produção | O cookie é `Secure`: só funciona em HTTPS. Acesse pelo Caddy (`https://`), não pelo nginx direto. |
| Rate limit disparando para todo mundo | `TRUST_PROXY` errado: no stack são **2** proxies (Caddy + nginx). Ver [security.md](security.md#rate-limiting). |
| Serviço `backup` reiniciando | `docker compose logs backup`. `BACKUP_DIR` existe e é gravável? Postgres healthy? |
