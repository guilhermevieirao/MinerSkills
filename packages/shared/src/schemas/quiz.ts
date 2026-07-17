import { z } from 'zod';

// ─── Admin: gestão de perguntas ─────────────────────────────
const quizOptionInputSchema = z.object({
  text: z.string().min(1).max(300),
  isCorrect: z.boolean(),
  order: z.number().int().min(0).default(0),
});

export const quizQuestionSchema = z
  .object({
    question: z.string().min(1).max(500),
    explanation: z.string().max(1000).nullish(),
    active: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
    options: z.array(quizOptionInputSchema).min(2).max(6),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Exatamente uma opção deve ser a correta',
    path: ['options'],
  });
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

// ─── Público: jogar ─────────────────────────────────────────
export const nicknameSchema = z
  .string()
  .trim()
  .min(3, 'Apelido muito curto')
  .max(20, 'Apelido muito longo')
  .regex(/^[\p{L}\p{N} ._-]+$/u, 'Apelido contém caracteres inválidos');

export const quizSubmitSchema = z.object({
  nickname: nicknameSchema,
  durationMs: z.number().int().min(0).max(2 * 60 * 60 * 1000),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        optionId: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
});
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>;

// perguntas enviadas ao cliente NUNCA contêm isCorrect
export interface QuizQuestionPublicDTO {
  id: string;
  question: string;
  options: { id: string; text: string }[];
}

export interface QuizResultDTO {
  score: number;
  totalQuestions: number;
  durationMs: number;
  rank: number;
  corrections: {
    questionId: string;
    correctOptionId: string;
    chosenOptionId: string;
    explanation: string | null;
  }[];
}

export interface LeaderboardEntryDTO {
  id: string;
  nickname: string;
  score: number;
  totalQuestions: number;
  durationMs: number;
  createdAt: string;
}
