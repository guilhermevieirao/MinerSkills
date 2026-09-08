import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_SPONSORS } from '@minerskills/shared';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';

/**
 * Backfill idempotente de Sponsor — o equivalente, para o SQLite (`db push`),
 * dos INSERTs da migration 20260907120000_sponsors no PostgreSQL: com a tabela
 * vazia, cria os patrocinadores que até então estavam fixos no rodapé
 * (DEFAULT_SPONSORS, ordem = posição na lista).
 *
 * Nunca altera nem apaga registros existentes: um patrocinador excluído pelo
 * admin não volta. Executado pelo agregador `prisma/backfill.ts` (encadeado em
 * `npm run db:push` e no docker-entrypoint, ramo SQLite) ou isolado via
 * `tsx prisma/backfill-sponsors.ts`.
 */
export async function backfillSponsors(): Promise<void> {
  const total = await prisma.sponsor.count();
  if (total > 0) {
    console.log(`  ✓ patrocinadores: nada a fazer (${total} no total)`);
    return;
  }

  for (let i = 0; i < DEFAULT_SPONSORS.length; i++) {
    const s = DEFAULT_SPONSORS[i]!;
    await prisma.sponsor.create({
      data: { name: s.name, url: s.url, tier: s.tier, order: i, active: true },
    });
  }
  console.log(`  ✓ patrocinadores: ${DEFAULT_SPONSORS.length} criado(s)`);
}

// Só executa quando chamado diretamente (`tsx prisma/backfill-sponsors.ts`);
// importado pelo agregador, apenas exporta a função.
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  backfillSponsors()
    .catch((err) => {
      console.error('❌ Backfill dos patrocinadores falhou:', err);
      process.exitCode = 1;
    })
    .finally(() => disconnectPrisma());
}
