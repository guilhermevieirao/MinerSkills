# Backup e restauração

O stack de produção (`docker-compose.prod.yml`) tem um serviço `backup` que copia,
sozinho, tudo o que não dá para reconstruir a partir do repositório: o **banco
PostgreSQL** e os **uploads** (fotos, vídeos e miniaturas). O resto — código, imagens
Docker, configuração — está no git e no `.env`.

| O quê | Como | Arquivo gerado |
| --- | --- | --- |
| Banco | `pg_dump -Fc` (formato custom, já comprimido; `--no-owner --no-privileges`) | `db-<UTC>.dump` |
| Uploads | `tar -czf` do volume `uploads` (raiz de dados da API, sem `uploads/tmp`) | `uploads-<UTC>.tar.gz` |

`<UTC>` é o instante do backup, `20260908T030000Z`. Os dois arquivos de uma rodada
têm o mesmo carimbo; restaure sempre o par.

---

## Onde ficam e por quanto tempo

Os arquivos caem em **`BACKUP_DIR`** (padrão `./backups`, ao lado do compose), uma
pasta do **host** montada no container — de propósito, para ficarem fora dos volumes
Docker e fáceis de copiar para outro lugar. A pasta está no `.gitignore`.

| Variável (`.env`) | Padrão | Efeito |
| --- | --- | --- |
| `BACKUP_DIR` | `./backups` | Pasta do host que recebe os backups. |
| `BACKUP_INTERVAL_HOURS` | `24` | Um backup ao subir o serviço e depois a cada N horas. |
| `BACKUP_KEEP_DAYS` | `14` | Apaga backups mais antigos que N dias (`0` = nunca apagar). |

> ⚠️ Um backup na **mesma máquina** protege contra erro humano e bug, não contra o
> disco morrer ou a VPS sumir. Copie `BACKUP_DIR` para fora periodicamente (rclone
> para um bucket, `rsync` para outra máquina, um `scp` no cron) — o formato é só
> arquivos, qualquer ferramenta serve.

Acompanhar:

```bash
docker compose -f docker-compose.prod.yml logs -f backup
ls -lh backups/
```

Cada rodada registra uma linha `[backup] concluído: 1.2M banco, 340M uploads`. Uma
falha (banco fora do ar, disco cheio) aparece no log com `FALHOU` e o serviço tenta de
novo na próxima rodada — ele não derruba o stack.

---

## Backup manual

Antes de uma atualização, de mexer no banco à mão ou de testar uma migration:

```bash
scripts/backup.sh
```

Roda o mesmo `backup-once.sh` num container descartável do serviço `backup` e lista
os arquivos mais recentes. O stack precisa estar no ar (o script não sobe o Postgres
só para isso).

---

## Restaurar

`scripts/restore.sh` recebe o dump do banco e, opcionalmente, o tar dos uploads
(nome do arquivo em `BACKUP_DIR` ou caminho completo). Ele **pede confirmação** — a
operação substitui os dados atuais:

```bash
scripts/restore.sh db-20260908T030000Z.dump uploads-20260908T030000Z.tar.gz
```

O que acontece, na ordem:

1. **Banco** — `pg_restore --clean --if-exists --single-transaction` dentro do
   serviço `backup` (`scripts/backup/restore-db.sh`): cada tabela é apagada e recriada
   a partir do dump; se algo falhar no meio, nada muda (transação única). Funciona
   também num banco **vazio**, recém-criado — é o cenário de reinstalar o stack do
   zero.
2. **Uploads** — o tar é copiado para o container da API e extraído na raiz de dados
   dela (`/app/apps/api/data`), que é quem escreve nesse volume. Arquivos de mesmo
   nome são sobrescritos; os que existem só no volume atual ficam.
3. **Conferência** — imprime o `/api/health`. Abra o site e o painel: as contagens do
   dashboard (posts, fotos, membros, tópicos…) devem bater com a época do backup.

Sem argumentos de confirmação interativa (um script de reinstalação, por exemplo),
passe `--yes`.

### Reinstalar do zero

Numa máquina nova: clone o repositório, recrie o `.env`, copie a pasta de backups e
suba o stack — o Prisma cria o schema vazio (`migrate deploy` no entrypoint da API).
Depois `scripts/restore.sh <dump> <tar>`. Os certificados do Caddy são reemitidos
sozinhos.

> ⚠️ **Não rode o seeder** (`prisma/seed.ts`) numa base que vai receber um restore:
> ele apaga tudo antes de inserir. O restore já traz o admin, as configurações e o
> conteúdo.

---

## Teste de restauração

Backup que nunca foi restaurado é uma esperança, não um backup. Uma vez por
trimestre (ou antes de cada temporada), faça a prova num ambiente à parte — a
mesma máquina serve, com outro `name` de projeto:

```bash
# 1. um stack paralelo, só banco + serviço de backup, com um .env de teste
docker compose -f docker-compose.prod.yml -p ms-restore-test --env-file .env.restore-test up -d postgres

# 2. restaurar o dump mais recente nele
docker compose -f docker-compose.prod.yml -p ms-restore-test --env-file .env.restore-test \
  run --rm --no-deps backup sh /backup/restore-db.sh db-<UTC>.dump

# 3. conferir contagens direto no banco
docker compose -f docker-compose.prod.yml -p ms-restore-test --env-file .env.restore-test \
  exec postgres psql -U minerskills -d minerskills -c 'select count(*) from "Post";'

# 4. derrubar tudo, inclusive o volume
docker compose -f docker-compose.prod.yml -p ms-restore-test --env-file .env.restore-test down -v
```

Anote a data e o resultado em algum lugar da equipe. Se o `pg_restore` reclamar de
versão, a imagem do serviço `backup` e a do `postgres` precisam ser a mesma
(`postgres:17-alpine` nas duas — é por isso que o backup usa a imagem do banco).

---

## Desenvolvimento (SQLite)

Fora do Docker o banco é um arquivo (`apps/api/data/dev.db`). Para guardar uma cópia
antes de experimentar algo:

```bash
scripts/backup-sqlite.sh                    # → ./backups/dev-<UTC>.db + uploads-dev-<UTC>.tar.gz
BACKUP_DIR=/outro/lugar scripts/backup-sqlite.sh
```

Com o `sqlite3` instalado, o script usa `.backup`, que copia de forma consistente
mesmo com a API aberta. Sem ele, cai numa cópia de arquivo — **pare o `npm run dev`
antes**, porque no modo WAL parte dos dados pode estar em `dev.db-wal` (o script copia
`-wal`/`-shm` junto, mas a cópia só é garantida com a API parada). Restaurar é copiar o
`.db` de volta (API parada) e extrair o tar em `apps/api/data`.

> A suíte e2e usa outro arquivo (`e2e.db`) e apaga as imagens `seed_*` dos uploads
> compartilhados — depois de rodá-la, `npm run db:seed` refaz o ambiente de dev.
> Ver [testing.md](testing.md).

---

## Arquivos

| Arquivo | Onde roda | Papel |
| --- | --- | --- |
| `scripts/backup/backup-loop.sh` | container `backup` (entrypoint) | Um backup ao subir e depois a cada `BACKUP_INTERVAL_HOURS`; falha não derruba o loop. |
| `scripts/backup/backup-once.sh` | container `backup` | `pg_dump` + `tar` + retenção. Grava em `.part` e renomeia no fim (um backup interrompido nunca parece completo). |
| `scripts/backup/restore-db.sh` | container `backup` | `pg_restore` de um dump em `/backups`. |
| `scripts/backup.sh` | host | Backup manual (`compose run --rm backup`). |
| `scripts/restore.sh` | host | Restauração completa (banco + uploads) com confirmação. |
| `scripts/backup-sqlite.sh` | host (dev) | Cópia do SQLite e dos uploads locais. |

Os scripts do container são montados do host (`./scripts/backup:/backup:ro`) e
invocados com `sh` explícito, porque o bit de execução se perde em checkouts no
Windows. O `.gitattributes` força `LF` em `*.sh` — com `CRLF` o `sh` do Alpine falha.
O CI valida os scripts com `shellcheck` e o compose com `docker compose config`.
