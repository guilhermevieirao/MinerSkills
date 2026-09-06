import { disconnectPrisma } from '../src/lib/prisma.js';
import { backfillMemberTags } from './backfill-member-tags.js';

/**
 * Agregador dos backfills de dados iniciais — o equivalente, para o SQLite
 * (`db push`, sem migrations), do que as migrations SQL fazem no PostgreSQL.
 * Encadeado em `npm run db:push` / `db:push:reset` e no docker-entrypoint
 * (ramo SQLite). Todo backfill deve ser idempotente.
 *
 * Backfills novos entram na lista abaixo, em ordem de dependência; cada um
 * vive no seu próprio arquivo `prisma/backfill-<tema>.ts`, que exporta a
 * função e continua executável isolado.
 */
const backfills: Array<[name: string, run: () => Promise<void>]> = [
  ['tags da equipe', backfillMemberTags],
];

async function main(): Promise<void> {
  console.log(`→ Backfills (${backfills.length})`);
  for (const [name, run] of backfills) {
    try {
      await run();
    } catch (err) {
      console.error(`❌ Backfill "${name}" falhou:`, err);
      throw err;
    }
  }
}

main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
