import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma, prisma } from './lib/prisma.js';

async function main() {
  // valida conexão com o banco antes de subir
  await prisma.$connect();
  const app = createApp();

  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    logger.info(
      `🚀 API MinerSkills em http://${env.API_HOST}:${env.API_PORT} (provider=${env.DATABASE_PROVIDER})`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}, encerrando...`);
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Falha ao iniciar a API');
  process.exit(1);
});
