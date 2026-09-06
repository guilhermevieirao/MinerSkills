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

Ajuste o `.env` antes:

```dotenv
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://minerskills:SENHA@postgres:5432/minerskills?schema=public"
#                                            ^ host = nome do serviço, não localhost
TRUST_PROXY=1
WEB_ORIGIN=http://localhost:8080     # ou seu domínio
VITE_SITE_URL=http://localhost:8080
JWT_SECRET=<openssl rand -hex 32>
POSTGRES_PASSWORD=<senha forte>
```

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

| Serviço | Porta | Detalhes |
| --- | --- | --- |
| `web` | `WEB_PORT` (8080) | **nginx** servindo o SPA buildado + proxy de `/api` e `/uploads`. |
| `api` | interna | Sem porta publicada — só o nginx a acessa. |
| `postgres` | interna | Volume `pgdata`. |

O `api` só sobe depois do `postgres` estar **healthy**, e o `web` só depois do `api`.

Primeira carga de dados:

```bash
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

> ⚠️ O seeder **apaga todos os dados** antes de inserir. Use apenas na carga inicial.

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
3. PostgreSQL → `prisma migrate deploy` · SQLite → `prisma db push` + backfill das
   tags da equipe (`prisma/backfill-member-tags.ts`, idempotente);
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
| Uploads sumiram | Eles vivem no volume `api-data`/`uploads`. `docker compose down -v` apaga volumes. |
