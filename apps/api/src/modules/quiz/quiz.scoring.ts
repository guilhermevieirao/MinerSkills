import type { QuizResultDTO } from '@minerskills/shared';

/** Forma mínima da pergunta necessária para pontuar (subconjunto do Prisma). */
export interface ScorableQuestion {
  id: string;
  explanation: string | null;
  options: Array<{ id: string; isCorrect: boolean }>;
}

export interface ScoreResult {
  score: number;
  corrections: QuizResultDTO['corrections'];
}

/**
 * Pontua as respostas de forma pura (sem banco). Uma pergunta sem opção
 * correta é ignorada; pergunta não respondida entra nas correções com
 * `chosenOptionId` vazio. A ordem das correções segue a das perguntas.
 */
export function scoreAnswers(
  questions: ScorableQuestion[],
  answers: Array<{ questionId: string; optionId: string }>,
): ScoreResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.optionId]));
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

  return { score, corrections };
}
