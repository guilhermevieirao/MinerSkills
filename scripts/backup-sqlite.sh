#!/bin/sh
# Backup do ambiente de DESENVOLVIMENTO (SQLite + uploads locais), sem Docker.
# Em produção o banco é PostgreSQL — use scripts/backup.sh.
#
# Uso (na raiz do projeto):
#   scripts/backup-sqlite.sh            # grava em BACKUP_DIR (padrão ./backups)
#   BACKUP_DIR=/algum/lugar scripts/backup-sqlite.sh
set -eu

cd "$(dirname "$0")/.."
DB="apps/api/data/dev.db"
DATA_DIR="apps/api/data"
OUT="${BACKUP_DIR:-./backups}"
# Git Bash no Windows: um caminho "C:/..." é lido pelo tar como host remoto
command -v cygpath >/dev/null 2>&1 && OUT="$(cygpath -u "$OUT")"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

[ -f "$DB" ] || { echo "banco não encontrado: $DB (rode npm run db:push)" >&2; exit 1; }
mkdir -p "$OUT"

# ─── Banco ───────────────────────────────────────────────────
# `.backup` do sqlite3 copia de forma consistente mesmo com a API aberta.
# Sem o sqlite3, cai na cópia de arquivo: aí pare o `npm run dev` antes —
# com o banco em uso (modo WAL) parte dos dados pode estar em dev.db-wal.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$OUT/dev-$STAMP.db'"
  echo "banco:   $OUT/dev-$STAMP.db (sqlite3 .backup)"
else
  echo "aviso: sqlite3 não encontrado — copiando o arquivo (pare a API antes para garantir consistência)" >&2
  cp "$DB" "$OUT/dev-$STAMP.db"
  for ext in -wal -shm; do
    [ -f "$DB$ext" ] && cp "$DB$ext" "$OUT/dev-$STAMP.db$ext"
  done
  echo "banco:   $OUT/dev-$STAMP.db (cópia de arquivo)"
fi

# ─── Uploads ─────────────────────────────────────────────────
if [ -d "$DATA_DIR/uploads" ]; then
  tar -czf "$OUT/uploads-dev-$STAMP.tar.gz" -C "$DATA_DIR" \
    --exclude='./uploads/tmp' --exclude='./uploads/tmp/*' ./uploads
  echo "uploads: $OUT/uploads-dev-$STAMP.tar.gz"
fi

echo "Restaurar: copie o .db de volta para $DB (com a API parada) e extraia o tar em $DATA_DIR."
