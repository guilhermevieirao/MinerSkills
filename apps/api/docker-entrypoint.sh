#!/bin/sh
# Entrypoint da API: carimba o provider a partir do .env, gera o Prisma Client,
# prepara o schema do banco e então executa o comando (dev ou prod).
set -e

cd /app/apps/api

PROVIDER="${DATABASE_PROVIDER:-sqlite}"
echo "→ Carimbando schema.prisma (DATABASE_PROVIDER=${PROVIDER})"
node scripts/stamp-schema.mjs

# Sempre gerar: o client precisa corresponder ao provider carimbado, que pode
# ter mudado desde o build da imagem (é rápido, ~1s).
echo "→ Gerando Prisma Client"
npx prisma generate

if [ "$PROVIDER" = "postgresql" ]; then
  echo "→ Aplicando migrations (prisma migrate deploy)"
  npx prisma migrate deploy
else
  echo "→ Sincronizando schema SQLite (prisma db push)"
  npx prisma db push --skip-generate --accept-data-loss
  # sem migrations no SQLite: o agregador roda todos os backfills (idempotentes)
  echo "→ Backfills (dados iniciais)"
  npx tsx prisma/backfill.ts
fi

if [ "$SEED_ON_BOOT" = "1" ]; then
  echo "→ Executando seed"
  npx tsx prisma/seed.ts || echo "⚠ seed falhou (ignorado)"
fi

echo "→ Iniciando API"
exec "$@"
