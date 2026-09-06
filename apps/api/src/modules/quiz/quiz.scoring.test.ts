import { describe, expect, it } from 'vitest';
import { scoreAnswers, type ScorableQuestion } from './quiz.scoring.js';

const questions: ScorableQuestion[] = [
  {
    id: 'q1',
    explanation: 'Porque sim',
    options: [
      { id: 'q1a', isCorrect: false },
      { id: 'q1b', isCorrect: true },
    ],
  },
  {
    id: 'q2',
    explanation: null,
    options: [
      { id: 'q2a', isCorrect: true },
      { id: 'q2b', isCorrect: false },
    ],
  },
  {
    id: 'q3',
    explanation: null,
    options: [
      { id: 'q3a', isCorrect: false },
      { id: 'q3b', isCorrect: true },
    ],
  },
];

describe('scoreAnswers', () => {
  it('pontua acertos e ignora erros e perguntas não respondidas', () => {
    const { score, corrections } = scoreAnswers(questions, [
      { questionId: 'q1', optionId: 'q1b' }, // certa
      { questionId: 'q2', optionId: 'q2b' }, // errada
      // q3 não respondida
    ]);
    expect(score).toBe(1);
    expect(corrections).toEqual([
      {
        questionId: 'q1',
        correctOptionId: 'q1b',
        chosenOptionId: 'q1b',
        explanation: 'Porque sim',
      },
      {
        questionId: 'q2',
        correctOptionId: 'q2a',
        chosenOptionId: 'q2b',
        explanation: null,
      },
      { questionId: 'q3', correctOptionId: 'q3b', chosenOptionId: '', explanation: null },
    ]);
  });

  it('pontuação máxima quando todas estão certas', () => {
    const { score } = scoreAnswers(questions, [
      { questionId: 'q1', optionId: 'q1b' },
      { questionId: 'q2', optionId: 'q2a' },
      { questionId: 'q3', optionId: 'q3b' },
    ]);
    expect(score).toBe(3);
  });

  it('zero quando nada foi respondido', () => {
    const { score, corrections } = scoreAnswers(questions, []);
    expect(score).toBe(0);
    expect(corrections).toHaveLength(3);
    expect(corrections.every((c) => c.chosenOptionId === '')).toBe(true);
  });

  it('ignora pergunta sem opção correta (não pontua nem corrige)', () => {
    const semCorreta: ScorableQuestion = {
      id: 'q4',
      explanation: null,
      options: [
        { id: 'q4a', isCorrect: false },
        { id: 'q4b', isCorrect: false },
      ],
    };
    const { score, corrections } = scoreAnswers(
      [semCorreta, ...questions],
      [{ questionId: 'q4', optionId: 'q4a' }],
    );
    expect(score).toBe(0);
    expect(corrections.map((c) => c.questionId)).toEqual(['q1', 'q2', 'q3']);
  });

  it('mantém a ordem das perguntas nas correções, não a das respostas', () => {
    const { corrections } = scoreAnswers(questions, [
      { questionId: 'q3', optionId: 'q3b' },
      { questionId: 'q1', optionId: 'q1a' },
    ]);
    expect(corrections.map((c) => c.questionId)).toEqual(['q1', 'q2', 'q3']);
  });

  it('resposta para pergunta inexistente ou opção de outra pergunta não pontua', () => {
    const { score } = scoreAnswers(questions, [
      { questionId: 'nope', optionId: 'q1b' },
      { questionId: 'q1', optionId: 'q2a' },
    ]);
    expect(score).toBe(0);
  });
});
