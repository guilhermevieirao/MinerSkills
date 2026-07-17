/**
 * stamp-schema.mjs
 * ----------------------------------------------------------------
 * Gera apps/api/prisma/schema.prisma a partir de schema.template.prisma,
 * substituindo o placeholder __PROVIDER__ pelo valor de DATABASE_PROVIDER.
 *
 * Prisma NÃO permite env() no campo `provider` do datasource, então este
 * "carimbo" é a forma robusta de alternar SQLite <-> PostgreSQL usando
 * apenas o .env único da raiz. Roda antes de TODO comando prisma
 * (ver scripts db:* no package.json).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prismaDir = resolve(__dirname, '..', 'prisma');
const templatePath = resolve(prismaDir, 'schema.template.prisma');
const outPath = resolve(prismaDir, 'schema.prisma');
const rootEnvPath = resolve(__dirname, '..', '..', '..', '.env');

/** Lê DATABASE_PROVIDER: process.env tem prioridade, depois o .env raiz. */
function resolveProvider() {
  if (process.env.DATABASE_PROVIDER) return process.env.DATABASE_PROVIDER.trim();
  if (existsSync(rootEnvPath)) {
    const line = readFileSync(rootEnvPath, 'utf8')
      .split(/\r?\n/)
      .find((l) => /^\s*DATABASE_PROVIDER\s*=/.test(l));
    if (line) {
      return line
        .replace(/^\s*DATABASE_PROVIDER\s*=/, '')
        .replace(/#.*$/, '')
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return 'sqlite';
}

const provider = resolveProvider();
const allowed = ['sqlite', 'postgresql'];
if (!allowed.includes(provider)) {
  console.error(
    `[stamp-schema] DATABASE_PROVIDER inválido: "${provider}". Use: ${allowed.join(' | ')}`,
  );
  process.exit(1);
}

if (!existsSync(templatePath)) {
  console.error(`[stamp-schema] template não encontrado: ${templatePath}`);
  process.exit(1);
}

const template = readFileSync(templatePath, 'utf8');
// Substitui APENAS a linha do datasource (não o texto de comentários).
const stampedTemplate = template.replace(
  /provider\s*=\s*"__PROVIDER__"/,
  `provider = "${provider}"`,
);
if (stampedTemplate === template) {
  console.error('[stamp-schema] placeholder provider = "__PROVIDER__" não encontrado no template');
  process.exit(1);
}
const stamped =
  `// ⚠️  ARQUIVO GERADO — não edite. Fonte: schema.template.prisma\n` +
  `// Provider carimbado: ${provider}\n\n` +
  stampedTemplate;

writeFileSync(outPath, stamped);
console.log(`[stamp-schema] schema.prisma gerado com provider="${provider}"`);
