#!/bin/sh
# Restaura um dump feito pelo backup-once.sh no banco atual. Roda DENTRO do
# serviço `backup` (tem pg_restore e vê /backups); é chamado pelo
# scripts/restore.sh do host. DESTRUTIVO: --clean apaga cada objeto antes de
# recriá-lo, então o conteúdo atual do banco é substituído pelo do dump.
#
# Uso: restore-db.sh <arquivo .dump em /backups>
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
NAME="${1:?informe o arquivo .dump (ex.: db-20260908T030000Z.dump)}"
FILE="$BACKUP_DIR/$(basename "$NAME")"

[ -f "$FILE" ] || { echo "arquivo não encontrado: $FILE" >&2; exit 1; }

echo "→ pg_restore de $(basename "$FILE") em '$PGDATABASE' ($PGHOST)"
# --if-exists evita erros nos DROPs de um banco vazio; --no-owner/--no-privileges
# porque o usuário do container pode não ser o dono original; --single-transaction
# desfaz tudo se algo falhar no meio.
pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction \
  -d "$PGDATABASE" "$FILE"
echo "→ banco restaurado"
