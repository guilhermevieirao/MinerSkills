/**
 * Prepara o banco de dados dedicado aos testes e2e:
 *   1. apaga o ARQUIVO SQLite de testes (se existir)
 *   2. recria o schema (prisma db push)
 *   3. roda o seeder no modo "test" (dataset pequeno e determinístico)
 *
 * Roda ANTES do Playwright (ver script "test" no package.json), garantindo
 * que cada execução parta exatamente do mesmo estado.
 *
 * SEGURANÇA: este script recusa-se a rodar se E2E_DATABASE_URL não for um
 * arquivo SQLite local (`file:`). Ele NUNCA consegue tocar em PostgreSQL nem
 * em qualquer banco remoto/produção — por isso apagamos o arquivo em vez de
 * usar `prisma db push --force-reset`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const apiDir = resolve(root, 'apps', 'api');
const prismaDir = resolve(apiDir, 'prisma');

/** Lê uma chave do .env da raiz (sem dependências). */
function readEnv(key, fallback) {
  try {
    const line = readFileSync(resolve(root, '.env'), 'utf8')
      .split(/\r?\n/)
      .find((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (!line) return fallback;
    return line
      .replace(new RegExp(`^\\s*${key}\\s*=`), '')
      .replace(/#.*$/, '')
      .trim()
      .replace(/^["']|["']$/g, '');
  } catch {
    return fallback;
  }
}

const dbUrl = process.env.E2E_DATABASE_URL ?? readEnv('E2E_DATABASE_URL', 'file:../data/e2e.db');
const provider = process.env.E2E_DATABASE_PROVIDER ?? 'sqlite';

// ─── Guarda de segurança ─────────────────────────────────────
// Padrão: só SQLite local. Rodar a suíte contra PostgreSQL (para provar a
// portabilidade) exige opt-in EXPLÍCITO via E2E_ALLOW_POSTGRES=1, porque o
// seeder APAGA todos os dados do banco apontado.
if (provider === 'sqlite' && !dbUrl.startsWith('file:')) {
  console.error(
    `[e2e] ABORTADO: com DATABASE_PROVIDER=sqlite, E2E_DATABASE_URL deve ser um arquivo local (file:...).\n` +
      `      Valor atual: ${dbUrl}`,
  );
  process.exit(1);
}
if (provider === 'postgresql' && process.env.E2E_ALLOW_POSTGRES !== '1') {
  console.error(
    `[e2e] ABORTADO: rodar os testes no PostgreSQL apaga TODOS os dados do banco apontado.\n` +
      `      Banco: ${dbUrl}\n` +
      `      Se este é um banco de desenvolvimento descartável, confirme com E2E_ALLOW_POSTGRES=1.`,
  );
  process.exit(1);
}
if (provider !== 'sqlite' && provider !== 'postgresql') {
  console.error(`[e2e] ABORTADO: E2E_DATABASE_PROVIDER inválido: ${provider}`);
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_PROVIDER: provider,
  DATABASE_URL: dbUrl,
  SEED_MODE: 'test',
  // placeholders gerados localmente: seed offline e determinístico
  SEED_IMAGE_SOURCE: 'local',
  NODE_ENV: 'test',
};

// ─── 1. zera o banco de testes ───────────────────────────────
// SQLite: apaga o ARQUIVO (best-effort). Se uma API de e2e ainda estiver
// rodando, o Windows mantém o arquivo travado — sem problema: o seeder limpa
// todas as tabelas (clearAll), então o estado final é igualmente determinístico.
if (provider === 'sqlite') {
  // o caminho no DATABASE_URL do SQLite é relativo à pasta prisma/
  const dbFile = resolve(prismaDir, dbUrl.replace(/^file:/, ''));
  for (const file of [dbFile, `${dbFile}-journal`, `${dbFile}-wal`, `${dbFile}-shm`]) {
    if (!existsSync(file)) continue;
    try {
      rmSync(file, { force: true });
    } catch (err) {
      if (file === dbFile) {
        console.warn(
          `[e2e] não foi possível remover ${file} (${err.code}) — provavelmente há uma API de teste em execução.\n` +
            `      Seguindo com db push + seed (o seeder limpa todas as tabelas).`,
        );
      }
    }
  }
  if (!existsSync(dbFile)) console.log('[e2e] banco de testes zerado.');
}

function run(args, label) {
  console.log(`\n[e2e] ${label}`);
  const res = spawnSync('npx', args, { cwd: apiDir, env, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error(`[e2e] falhou: ${label}`);
    if (label.includes('gerando')) {
      console.error(
        `      No Windows, o "prisma generate" falha com EPERM se algum processo estiver\n` +
          `      com o engine aberto. Pare a API (npm run dev) e tente de novo.`,
      );
    }
    process.exit(res.status ?? 1);
  }
}

/** Provider com que o Prisma Client atualmente gerado foi construído (ou null). */
function generatedProvider() {
  const generated = resolve(root, 'node_modules', '.prisma', 'client', 'schema.prisma');
  if (!existsSync(generated)) return null;
  const m = readFileSync(generated, 'utf8').match(/provider\s*=\s*"(sqlite|postgresql)"/);
  return m?.[1] ?? null;
}

// ─── 2 e 3. prepara o schema e popula ────────────────────────
// O Prisma Client só é regerado quando o provider já gerado difere do desejado.
// Regerar sempre quebraria o fluxo normal no Windows: com `npm run dev` aberto,
// o processo mantém o engine travado e o generate falha com EPERM.
if (generatedProvider() !== provider) {
  console.log(`\n[e2e] client atual (${generatedProvider() ?? 'nenhum'}) ≠ ${provider}: regerando`);
  run(['prisma', 'generate'], `gerando Prisma Client (provider=${provider})`);
}

if (provider === 'postgresql') {
  run(['prisma', 'migrate', 'deploy'], 'aplicando migrations no PostgreSQL');
} else {
  run(
    ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
    'sincronizando schema no banco de testes',
  );
}
run(['tsx', 'prisma/seed.ts'], 'populando banco de testes (SEED_MODE=test)');
console.log(`\n[e2e] banco pronto (provider=${provider}).\n`);
