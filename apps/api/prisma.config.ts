/**
 * prisma.config.ts
 * ----------------------------------------------------------------
 * Configuração da CLI do Prisma. Substitui o bloco `prisma` do
 * package.json, descontinuado e removido no Prisma 7.
 *
 * O schema é um arquivo GERADO por scripts/stamp-schema.mjs a partir
 * de prisma/schema.template.prisma (ver scripts db:* no package.json).
 *
 * Como um arquivo de configuração desativa o carregamento automático
 * do .env pela CLI, o .env único da raiz é carregado aqui. `dotenv`
 * não sobrescreve variáveis já definidas, então o wrapper
 * `dotenv -e ../../.env --` dos scripts e as variáveis do Docker
 * continuam tendo prioridade.
 */
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
