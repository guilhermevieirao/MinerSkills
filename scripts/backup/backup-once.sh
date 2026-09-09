#!/bin/sh
# Um backup completo: dump do PostgreSQL (formato custom, comprimido) + tar.gz
# dos uploads, com retenção por idade. Roda DENTRO do serviço `backup`
# (imagem postgres:17-alpine, que traz pg_dump, tar e find) — ver
# docker-compose.prod.yml e docs/backup.md.
#
# Variáveis (definidas pelo compose):
#   PGHOST PGUSER PGPASSWORD PGDATABASE   conexão (lidas pelo pg_dump)
#   BACKUP_DIR        onde gravar (padrão /backups — bind mount do host)
#   DATA_DIR          volume de dados da API, montado só leitura (padrão /data)
#   BACKUP_KEEP_DAYS  apaga arquivos mais antigos que N dias (padrão 14; 0 = nunca)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATA_DIR="${DATA_DIR:-/data}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

log() { printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

mkdir -p "$BACKUP_DIR"

# ─── Banco ───────────────────────────────────────────────────
# -Fc: formato custom (já comprimido, restaurável com pg_restore, permite
# escolher tabelas). Grava num nome temporário e renomeia no fim, para um
# backup interrompido nunca parecer completo.
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
log "pg_dump de '$PGDATABASE' em $PGHOST → $(basename "$DB_FILE")"
pg_dump -Fc --no-owner --no-privileges -f "$DB_FILE.part"
mv "$DB_FILE.part" "$DB_FILE"

# ─── Uploads ─────────────────────────────────────────────────
# O volume inteiro (uploads/images, uploads/thumbs); uploads/tmp é descartável.
# Se houver um SQLite ali (stack sem Postgres), ele entra no tar, mas uma cópia
# de arquivo aberto pode sair inconsistente — para SQLite use backup-sqlite.sh.
UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
if [ -d "$DATA_DIR" ]; then
  log "tar dos uploads em $DATA_DIR → $(basename "$UP_FILE")"
  tar -czf "$UP_FILE.part" -C "$DATA_DIR" --exclude='./uploads/tmp' --exclude='./uploads/tmp/*' .
  mv "$UP_FILE.part" "$UP_FILE"
else
  log "AVISO: $DATA_DIR não existe — uploads não copiados"
fi

# ─── Retenção ────────────────────────────────────────────────
if [ "$KEEP_DAYS" -gt 0 ] 2>/dev/null; then
  removed="$(find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) \
    -mtime +"$KEEP_DAYS" -print -delete | wc -l)"
  [ "$removed" -gt 0 ] && log "retenção: $removed arquivo(s) com mais de $KEEP_DAYS dias removido(s)"
fi

# Restos de execuções interrompidas
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.part' -mmin +120 -delete 2>/dev/null || true

log "concluído: $(du -h "$DB_FILE" | cut -f1) banco$([ -f "$UP_FILE" ] && printf ', %s uploads' "$(du -h "$UP_FILE" | cut -f1)")"
