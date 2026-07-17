import { z } from 'zod';
import { MODERATION_STATUSES } from '../constants.js';
import { nicknameSchema } from './quiz.js';

export const forumTopicSchema = z.object({
  nickname: nicknameSchema,
  title: z.string().trim().min(4, 'Título muito curto').max(140),
  body: z.string().trim().min(4, 'Mensagem muito curta').max(4000),
});
export type ForumTopicInput = z.infer<typeof forumTopicSchema>;

export const forumReplySchema = z.object({
  nickname: nicknameSchema,
  body: z.string().trim().min(2, 'Mensagem muito curta').max(4000),
});
export type ForumReplyInput = z.infer<typeof forumReplySchema>;

export const moderationSchema = z.object({
  status: z.enum(MODERATION_STATUSES),
});
export type ModerationInput = z.infer<typeof moderationSchema>;

export interface ForumReplyDTO {
  id: string;
  nickname: string;
  body: string;
  status: string;
  createdAt: string;
}

export interface ForumTopicDTO {
  id: string;
  nickname: string;
  title: string;
  body: string;
  status: string;
  replyCount: number;
  createdAt: string;
}

export interface ForumTopicDetailDTO extends ForumTopicDTO {
  replies: ForumReplyDTO[];
}
