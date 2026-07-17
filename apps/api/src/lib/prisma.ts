import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env.js';

/**
 * Prisma Client singleton. O provider (sqlite/postgresql) já foi carimbado
 * no schema.prisma pelo stamp-schema.mjs — o código nunca precisa saber qual é.
 */
export const prisma = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
