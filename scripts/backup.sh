#!/bin/sh
# Backup manual do stack de produção (banco + uploads), fora do horário do
# serviço `backup` — útil antes de uma atualização. Roda o mesmo
# backup-once.sh dentro de um container descartável do serviço `backup`,
# então o resultado cai na mesma pasta (BACKUP_DIR, padrão ./backups).
#
# Uso (na raiz do projeto, com o stack no ar):
#   scripts/backup.sh
set -eu

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

# BACKUP_DIR do .env (o compose já o usa no bind mount); aqui só para listar
BACKUP_DIR="$(grep -E '^BACKUP_DIR=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# --no-deps: o postgres precisa já estar rodando (não faz sentido subi-lo só
# para o backup); `sh` explícito porque o bit de execução pode não existir.
$COMPOSE run --rm --no-deps backup sh /backup/backup-once.sh

echo
echo "Backups em $BACKUP_DIR (mais recentes):"
ls -lht "$BACKUP_DIR" 2>/dev/null | head -n 5
