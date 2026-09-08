import type { ContactMessage } from '@prisma/client';
import { logger } from './logger.js';

/**
 * Ponto de extensão para avisar a equipe de uma mensagem nova (inscrição ou
 * contato). Hoje só registra no log — não há envio de e-mail: a caixa de
 * entrada do painel (/admin/mensagens) é o canal oficial, e o badge da
 * sidebar mostra quantas mensagens ainda não foram lidas.
 *
 * Para notificar por e-mail, webhook etc., troque a implementação aqui, sem
 * tocar na rota. Nunca inclua o conteúdo da mensagem no log: ele pode conter
 * dados pessoais de menores.
 */
export function notifyNewMessage(message: Pick<ContactMessage, 'id' | 'kind'>): void {
  logger.info({ id: message.id, kind: message.kind }, 'Nova mensagem recebida');
}
