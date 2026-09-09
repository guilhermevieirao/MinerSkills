#!/bin/sh
# Restaura um backup no stack de produção: o banco a partir do dump
# (pg_restore, no serviço `backup`) e, opcionalmente, os uploads a partir do
# tar.gz (extraído dentro do container da API, que é quem escreve no volume).
#
# DESTRUTIVO: o conteúdo atual do banco é substituído pelo do dump; os
# uploads do tar sobrescrevem arquivos de mesmo nome (os demais ficam).
#
# Uso (na raiz do projeto, com o stack no ar):
#   scripts/restore.sh db-20260908T030000Z.dump [uploads-20260908T030000Z.tar.gz] [--yes]
# Os nomes podem ser só o arquivo (procurado em BACKUP_DIR) ou um caminho.
set -eu

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

BACKUP_DIR="$(grep -E '^BACKUP_DIR=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

DUMP=""
TAR=""
YES=0
for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    *.dump) DUMP="$arg" ;;
    *.tar.gz) TAR="$arg" ;;
    *) echo "argumento não reconhecido: $arg" >&2; exit 2 ;;
  esac
done
[ -n "$DUMP" ] || { echo "uso: scripts/restore.sh <db-*.dump> [uploads-*.tar.gz] [--yes]" >&2; exit 2; }

# aceita nome de arquivo (em BACKUP_DIR) ou caminho
[ -f "$DUMP" ] || DUMP="$BACKUP_DIR/$DUMP"
[ -f "$DUMP" ] || { echo "dump não encontrado: $DUMP" >&2; exit 1; }
if [ -n "$TAR" ]; then
  [ -f "$TAR" ] || TAR="$BACKUP_DIR/$TAR"
  [ -f "$TAR" ] || { echo "tar não encontrado: $TAR" >&2; exit 1; }
fi

echo "Banco:   $DUMP"
[ -n "$TAR" ] && echo "Uploads: $TAR"
if [ "$YES" -ne 1 ]; then
  printf 'Isso SUBSTITUI os dados atuais do stack de produção. Continuar? [s/N] '
  read -r answer
  case "$answer" in s | S | sim | SIM) ;; *) echo "cancelado"; exit 1 ;; esac
fi

# 1. banco — o serviço `backup` vê BACKUP_DIR em /backups; passa só o nome
echo "→ restaurando o banco"
$COMPOSE run --rm --no-deps backup sh /backup/restore-db.sh "$(basename "$DUMP")"

# 2. uploads — o tar foi feito a partir da raiz do volume de dados da API
if [ -n "$TAR" ]; then
  echo "→ restaurando os uploads"
  $COMPOSE cp "$TAR" api:/tmp/uploads-restore.tar.gz
  $COMPOSE exec api sh -c 'tar -xzf /tmp/uploads-restore.tar.gz -C /app/apps/api/data && rm -f /tmp/uploads-restore.tar.gz'
fi

# 3. a API continua no ar; conferir a saúde e algumas contagens
echo "→ health da API:"
$COMPOSE exec api wget -qO- "http://127.0.0.1:${API_PORT:-3001}/api/health"
echo
echo "Pronto. Confira o site e o painel (/admin) — contagens do dashboard devem bater com o backup."
