#!/bin/sh
# Entrypoint do serviço `backup`: um backup ao subir e depois a cada
# BACKUP_INTERVAL_HOURS (padrão 24). Uma falha não derruba o loop — fica no
# log (`docker compose -f docker-compose.prod.yml logs backup`) e a próxima
# rodada tenta de novo.
set -u

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
SLEEP_SECONDS=$((INTERVAL_HOURS * 3600))
HERE="$(dirname "$0")"

# `sh` explícito: o bit de execução se perde em checkouts no Windows
# e o diretório é montado direto do host.
while :; do
  if ! sh "$HERE/backup-once.sh"; then
    printf '%s [backup] FALHOU — nova tentativa em %sh\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$INTERVAL_HOURS" >&2
  fi
  sleep "$SLEEP_SECONDS"
done
