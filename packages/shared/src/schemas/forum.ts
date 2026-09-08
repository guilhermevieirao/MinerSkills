import { z } from 'zod';
import { MODERATION_STATUSES, REPORT_REASONS, REPORT_STATUSES } from '../constants.js';
import { nicknameSchema } from './quiz.js';

/**
 * Honeypot dos formulários públicos: aceito pelo schema (um 400 revelaria o
 * mecanismo) e checado na rota, que responde 202 sem gravar quando preenchido.
 * Valor inválido vira 'bot' (truthy) pelo mesmo motivo.
 */
const honeypotField = z.string().max(200).optional().catch('bot');

export const forumTopicSchema = z.object({
  nickname: nicknameSchema,
  title: z.string().trim().min(4, 'Título muito curto').max(140),
  body: z.string().trim().min(4, 'Mensagem muito curta').max(4000),
  website: honeypotField,
});
export type ForumTopicInput = z.infer<typeof forumTopicSchema>;

export const forumReplySchema = z.object({
  nickname: nicknameSchema,
  body: z.string().trim().min(2, 'Mensagem muito curta').max(4000),
  website: honeypotField,
});
export type ForumReplyInput = z.infer<typeof forumReplySchema>;

export const moderationSchema = z.object({
  status: z.enum(MODERATION_STATUSES),
});
export type ModerationInput = z.infer<typeof moderationSchema>;

/** Denúncia pública de um tópico ou resposta aprovados (`POST .../report`). */
export const forumReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).nullish(),
  website: honeypotField,
});
export type ForumReportInput = z.infer<typeof forumReportSchema>;

export const forumReportStatusSchema = z.object({
  status: z.enum(REPORT_STATUSES),
});
export type ForumReportStatusInput = z.infer<typeof forumReportStatusSchema>;

export interface ForumReportDTO {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  /** Alvo resumido para o painel. */
  target: {
    type: 'topic' | 'reply';
    id: string;
    topicId: string;
    topicTitle: string;
    excerpt: string;
    nickname: string;
    status: string;
  };
}

export interface ForumReplyDTO {
  id: string;
  nickname: string;
  body: string;
  status: string;
  createdAt: string;
  /** Só nas respostas do painel: id do admin que moderou. */
  moderatedBy?: string | null;
}

export interface ForumTopicDTO {
  id: string;
  nickname: string;
  title: string;
  body: string;
  status: string;
  replyCount: number;
  createdAt: string;
  /** Só nas respostas do painel: id do admin que moderou. */
  moderatedBy?: string | null;
}

export interface ForumTopicDetailDTO extends ForumTopicDTO {
  replies: ForumReplyDTO[];
}
