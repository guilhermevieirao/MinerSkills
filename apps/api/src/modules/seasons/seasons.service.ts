import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';

/**
 * 400 quando `seasonId` aponta para uma temporada que não existe. Equipe e
 * prêmios chamam isto antes de gravar o vínculo — sem a checagem, o P2003 do
 * banco viraria um genérico "Referência inválida", sem campo para o painel.
 * Fica fora de seasons.routes.ts para não criar ciclo de imports (as rotas de
 * temporada reutilizam os DTOs de equipe e prêmios).
 */
export async function assertSeasonExists(seasonId: string | null | undefined): Promise<void> {
  if (!seasonId) return;
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });
  if (!season) {
    throw ApiError.badRequest('Temporada inválida', [
      { path: 'seasonId', message: 'Temporada inválida' },
    ]);
  }
}
