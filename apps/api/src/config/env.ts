import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { serverEnvSchema, type ServerEnv } from '@minerskills/shared';

/**
 * Carrega o .env ÚNICO da raiz do monorepo de forma determinística
 * (independe do cwd) e valida com zod. Falha ruidosamente no boot.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
// src/config -> src -> api -> apps -> raiz
const rootEnvPath = resolve(__dirname, '..', '..', '..', '..', '.env');

loadDotenv({ path: rootEnvPath });

const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Configuração de ambiente inválida (.env raiz):');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: ServerEnv = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Diretório absoluto de uploads (resolve UPLOADS_DIR relativo à raiz de apps/api). */
export const apiRoot = resolve(__dirname, '..', '..');
export const uploadsRoot = resolve(apiRoot, env.UPLOADS_DIR);
