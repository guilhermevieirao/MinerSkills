import type { QuizQuestionInput, QuizSubmitInput, QuizResultDTO } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { stripHtml } from '../../lib/sanitize.js';

/** Cria pergunta + opções. */
export async function createQuestion(input: QuizQuestionInput) {
  return prisma.quizQuestion.create({
    data: {
      question: input.question,
      explanation: input.explanation ?? null,
      active: input.active,
      order: input.order,
      options: {
        create: input.options.map((o, i) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order ?? i,
        })),
      },
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
}

export async function updateQuestion(id: string, input: QuizQuestionInput) {
  return prisma.$transaction(async (tx) => {
    await tx.quizOption.deleteMany({ where: { questionId: id } });
    return tx.quizQuestion.update({
      where: { id },
      data: {
        question: input.question,
        explanation: input.explanation ?? null,
        active: input.active,
        order: input.order,
        options: {
          create: input.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            order: o.order ?? i,
          })),
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  });
}

/**
 * Pontua a submissão NO SERVIDOR (o cliente nunca recebe isCorrect) e grava
 * no leaderboard mantendo a MELHOR pontuação por apelido.
 */
export async function submitQuiz(input: QuizSubmitInput): Promise<QuizResultDTO> {
  const nickname = stripHtml(input.nickname);
  const questions = await prisma.quizQuestion.findMany({
    where: { active: true },
    include: { options: true },
  });
  const totalQuestions = questions.length;

  const answerMap = new Map(input.answers.map((a) => [a.questionId, a.optionId]));
  let score = 0;
  const corrections: QuizResultDTO['corrections'] = [];

  for (const q of questions) {
    const correct = q.options.find((o) => o.isCorrect);
    if (!correct) continue;
    const chosen = answerMap.get(q.id);
    if (chosen === correct.id) score += 1;
    corrections.push({
      questionId: q.id,
      correctOptionId: correct.id,
      chosenOptionId: chosen ?? '',
      explanation: q.explanation,
    });
  }

  // grava mantendo a melhor pontuação por apelido (menor tempo desempata)
  const existing = await prisma.quizScore.findFirst({
    where: { nickname },
    orderBy: [{ score: 'desc' }, { durationMs: 'asc' }],
  });
  const isBetter =
    !existing ||
    score > existing.score ||
    (score === existing.score && input.durationMs < existing.durationMs);

  if (isBetter) {
    if (existing) await prisma.quizScore.delete({ where: { id: existing.id } });
    await prisma.quizScore.create({
      data: { nickname, score, totalQuestions, durationMs: input.durationMs },
    });
  }

  // rank = posição da melhor pontuação do apelido no ranking global
  const best = Math.max(score, existing?.score ?? 0);
  const rank =
    (await prisma.quizScore.count({ where: { score: { gt: best } } })) + 1;

  return { score, totalQuestions, durationMs: input.durationMs, rank, corrections };
}
