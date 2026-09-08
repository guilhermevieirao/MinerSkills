import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente do back-end.
 * O boot da API falha ruidosamente se algo estiver ausente/inválido.
 * Todas as variáveis vêm do .env ÚNICO na raiz do projeto.
 */

const intFromEnv = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int());

/**
 * Quantidade de proxies confiáveis (hops) à frente da API: 0 = nenhum,
 * 1 = nginx, 2 = Caddy + nginx… Aceita "true"/"false" por compatibilidade
 * com o formato booleano antigo (→ 1/0).
 */
const hopsFromEnv = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim() === '') return def;
      const s = v.trim().toLowerCase();
      if (s === 'true') return 1;
      if (s === 'false') return 0;
      return Number(s);
    })
    .pipe(z.number().int().min(0));

const csv = (def: string[]) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ''
        ? def
        : v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    );

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  API_PORT: intFromEnv(3001),
  API_HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  /**
   * URL pública canônica (sem barra final) usada pela API em sitemap.xml,
   * robots.txt e na pré-visualização /og. VITE_SITE_URL é a equivalente do
   * front — em produção as duas apontam para o mesmo domínio.
   */
  SITE_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: hopsFromEnv(0),
  BODY_LIMIT: z.string().default('1mb'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  AUTH_COOKIE_NAME: z.string().default('ms_admin'),
  ADMIN_EMAIL: z.string().email().default('admin@minerskills.com.br'),
  ADMIN_PASSWORD: z.string().min(8).default('MinerSkills@10019'),
  ADMIN_NAME: z.string().default('Administrador MinerSkills'),

  RATE_LIMIT_WINDOW_MS: intFromEnv(900000),
  RATE_LIMIT_MAX: intFromEnv(300),
  RATE_LIMIT_LOGIN_MAX: intFromEnv(5),
  RATE_LIMIT_FORUM_MAX: intFromEnv(10),
  RATE_LIMIT_QUIZ_MAX: intFromEnv(30),
  RATE_LIMIT_CONTACT_MAX: intFromEnv(5),

  UPLOADS_DIR: z.string().default('./data/uploads'),
  UPLOAD_IMAGE_MAX_MB: intFromEnv(8),
  UPLOAD_VIDEO_MAX_MB: intFromEnv(60),
  UPLOAD_ALLOWED_IMAGE_TYPES: csv(['image/jpeg', 'image/png', 'image/webp']),
  UPLOAD_ALLOWED_VIDEO_TYPES: csv(['video/mp4', 'video/webm']),
  THUMB_WIDTH: intFromEnv(480),

  SEED_MODE: z.enum(['full', 'test']).default('full'),
  SEED_IMAGE_SOURCE: z.enum(['remote', 'local']).default('remote'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
