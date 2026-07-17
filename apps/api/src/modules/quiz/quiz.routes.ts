import { Router } from 'express';
import {
  quizQuestionSchema,
  quizSubmitSchema,
  type QuizQuestionPublicDTO,
  type LeaderboardEntryDTO,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { quizLimiter } from '../../middleware/rateLimit.js';
import { createQuestion, submitQuiz, updateQuestion } from './quiz.service.js';

// ─── PÚBLICO ────────────────────────────────────────────────
export const quizPublicRouter = Router();

quizPublicRouter.get(
  '/questions',
  asyncHandler(async (_req, res) => {
    const questions = await prisma.quizQuestion.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    // NUNCA expõe isCorrect. Embaralha as opções.
    const dto: QuizQuestionPublicDTO[] = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: shuffle(q.options.map((o) => ({ id: o.id, text: o.text }))),
    }));
    res.json(dto);
  }),
);

quizPublicRouter.post(
  '/submit',
  quizLimiter,
  validate(quizSubmitSchema),
  asyncHandler(async (req, res) => {
    const result = await submitQuiz(req.body);
    res.status(201).json(result);
  }),
);

quizPublicRouter.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const scores = await prisma.quizScore.findMany({
      orderBy: [{ score: 'desc' }, { durationMs: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
    const dto: LeaderboardEntryDTO[] = scores.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      score: s.score,
      totalQuestions: s.totalQuestions,
      durationMs: s.durationMs,
      createdAt: s.createdAt.toISOString(),
    }));
    res.json(dto);
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const quizAdminRouter = Router();
quizAdminRouter.use(requireAdmin);

quizAdminRouter.get(
  '/questions',
  asyncHandler(async (_req, res) => {
    const questions = await prisma.quizQuestion.findMany({
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.json(questions);
  }),
);

quizAdminRouter.post(
  '/questions',
  validate(quizQuestionSchema),
  asyncHandler(async (req, res) => {
    const q = await createQuestion(req.body);
    res.status(201).json(q);
  }),
);

quizAdminRouter.put(
  '/questions/:id',
  validate(quizQuestionSchema),
  asyncHandler(async (req, res) => {
    const q = await updateQuestion(req.params.id!, req.body);
    res.json(q);
  }),
);

quizAdminRouter.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    await prisma.quizQuestion.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

quizAdminRouter.delete(
  '/leaderboard',
  asyncHandler(async (_req, res) => {
    await prisma.quizScore.deleteMany({});
    res.status(204).end();
  }),
);

/** Fisher-Yates determinístico o suficiente para embaralhar opções. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
