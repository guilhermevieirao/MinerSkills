import { useRef, useState } from 'react';
import { Check, Clock, Medal, Play, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type {
  LeaderboardEntryDTO,
  QuizQuestionPublicDTO,
  QuizResultDTO,
} from '@minerskills/shared';
import { nicknameSchema } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import {
  useQuizQuestions,
  useLeaderboard,
  useSubmitQuiz,
} from '../features/quiz/useQuiz';
import { Button, Card, EmptyState, Field, Input, SectionHeading } from '../components/ui';
import { IconTile } from '../components/ui/tiles';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { cx, formatDuration } from '../lib/format';
import { queryClient } from '../lib/queryClient';
import { useDocumentHead } from '../lib/useDocumentHead';
import './QuizPage.scss';

const DESCRIPTION =
  'Teste seus conhecimentos sobre a MinerSkills, a FRC e a FIRST. Entre para o ranking!';

type Phase = 'intro' | 'playing' | 'result';

/** Pausa entre escolher uma opção e avançar (a escolha fica visível antes da troca). */
const ADVANCE_DELAY_MS = 220;

export function QuizPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  // opções travadas entre a escolha e a próxima pergunta (sem clique duplo)
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<QuizResultDTO | null>(null);
  const startRef = useRef(0);
  const toast = useToast();

  const questionsQuery = useQuizQuestions(phase === 'playing');
  const { data: questions, refetch } = questionsQuery;
  const leaderboard = useLeaderboard();
  const submit = useSubmitQuiz();

  useDocumentHead({ title: 'Quiz', description: DESCRIPTION, canonicalPath: '/quiz' });

  const total = questions?.length ?? 0;
  const q = questions?.[current];

  const start = () => {
    const parsed = nicknameSchema.safeParse(nickname.trim());
    if (!parsed.success) {
      setNickError(parsed.error.issues[0]?.message);
      return;
    }
    setNickError(undefined);
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setLocked(false);
    startRef.current = performance.now();
    setPhase('playing');
    void refetch();
  };

  const choose = (optionId: string) => {
    if (!q || locked) return;
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      if (current + 1 < total) {
        setCurrent((c) => c + 1);
      } else {
        void finish(next);
      }
    }, ADVANCE_DELAY_MS);
  };

  const finish = async (finalAnswers: Record<string, string>) => {
    const durationMs = Math.round(performance.now() - startRef.current);
    try {
      const res = await submit.mutateAsync({
        nickname: nickname.trim(),
        durationMs,
        answers: Object.entries(finalAnswers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        })),
      });
      setResult(res);
      setPhase('result');
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } catch {
      toast.error('Não foi possível enviar suas respostas. Tente novamente.');
    }
  };

  const reset = () => {
    setPhase('intro');
    setResult(null);
  };

  return (
    <>
      <PageHero kicker="Jogo" title="Quiz MinerSkills" subtitle={DESCRIPTION} size="sm" />

      <section className="ms-section ms-container ms-quiz">
        <div className="ms-quiz__main">
          {phase === 'intro' && (
            <Card className="ms-quiz__card">
              <IconTile icon={Trophy} size="lg" />
              <h2 className="ms-quiz__heading">Pronto para o desafio?</h2>
              <p className="ms-quiz__lead">
                Escolha um apelido para aparecer no ranking e comece a jogar.
              </p>
              <form
                className="ms-quiz__nick"
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
                noValidate
              >
                <Field label="Apelido" required error={nickError}>
                  <Input
                    placeholder="Seu apelido"
                    value={nickname}
                    maxLength={20}
                    autoComplete="nickname"
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </Field>
                <Button type="submit" size="lg">
                  <Play aria-hidden /> Começar
                </Button>
              </form>
            </Card>
          )}

          {phase === 'playing' && (
            <Card className="ms-quiz__card">
              <QueryState
                query={questionsQuery}
                skeleton={<ListSkeleton rows={4} lead={0} />}
                isEmpty={(list) => list.length === 0}
                empty={
                  <EmptyState
                    title="Nenhuma pergunta disponível"
                    description="Volte mais tarde para jogar."
                    action={
                      <Button variant="outline" onClick={reset}>
                        Voltar
                      </Button>
                    }
                  />
                }
              >
                {() =>
                  q && (
                    <>
                      <div
                        className="ms-quiz__progress"
                        role="progressbar"
                        aria-label="Progresso do quiz"
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={current + 1}
                      >
                        <div
                          className="ms-quiz__progress-bar"
                          style={{ width: `${((current + 1) / total) * 100}%` }}
                        />
                      </div>
                      <p className="ms-quiz__counter">
                        Pergunta {current + 1} de {total}
                      </p>
                      <h2 className="ms-quiz__question" key={q.id}>
                        {q.question}
                      </h2>
                      <div
                        className="ms-quiz__options"
                        role="group"
                        aria-label="Opções de resposta"
                      >
                        {q.options.map((opt, i) => {
                          const picked = answers[q.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={cx(
                                'ms-quiz__option',
                                picked && 'ms-quiz__option--picked',
                              )}
                              onClick={() => choose(opt.id)}
                              disabled={locked}
                              aria-pressed={picked}
                            >
                              <span className="ms-quiz__option-letter" aria-hidden>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )
                }
              </QueryState>
            </Card>
          )}

          {phase === 'result' && result && (
            <Card className="ms-quiz__card">
              <QuizResult result={result} questions={questions ?? []} onReset={reset} />
            </Card>
          )}
        </div>

        <aside className="ms-quiz__leaderboard" aria-labelledby="ms-quiz-lb">
          <SectionHeading
            as="h2"
            size="sm"
            id="ms-quiz-lb"
            kicker="Ranking"
            title="Melhores pontuações"
            dense
          />
          <QueryState
            query={leaderboard}
            compact
            skeleton={<ListSkeleton rows={5} lead={0} />}
            isEmpty={(list) => list.length === 0}
            empty={
              <EmptyState
                size="sm"
                title="Sem pontuações"
                description="Seja o primeiro a jogar!"
              />
            }
          >
            {(list) => (
              <Leaderboard
                entries={list}
                me={phase === 'result' ? nickname.trim() : undefined}
              />
            )}
          </QueryState>
        </aside>
      </section>
    </>
  );
}

function QuizResult({
  result,
  questions,
  onReset,
}: {
  result: QuizResultDTO;
  questions: QuizQuestionPublicDTO[];
  onReset: () => void;
}) {
  const ratio = result.totalQuestions ? result.score / result.totalQuestions : 0;
  const message =
    ratio === 1
      ? 'Perfeito! Você é um verdadeiro Miner.'
      : ratio >= 0.6
        ? 'Muito bem! Você conhece a equipe.'
        : 'Continue estudando a MinerSkills e tente de novo!';

  return (
    <>
      <div className="ms-quiz__result">
        <p className="ms-quiz__result-big">
          {result.score}
          <span className="ms-quiz__result-total">/{result.totalQuestions}</span>
        </p>
        <div className="ms-quiz__result-meta">
          <span>
            <Medal aria-hidden /> {result.rank}º no ranking
          </span>
          <span>
            <Clock aria-hidden /> {formatDuration(result.durationMs)}
          </span>
        </div>
      </div>
      <h2 className="ms-quiz__heading">{message}</h2>
      <Button onClick={onReset} variant="outline">
        <RotateCcw aria-hidden /> Jogar novamente
      </Button>

      <ol
        className="ms-quiz__corrections"
        role="list"
        aria-label="Correção das respostas"
      >
        {result.corrections.map((c, i) => {
          const question = questions.find((qq) => qq.id === c.questionId);
          const chosen = question?.options.find((o) => o.id === c.chosenOptionId)?.text;
          const right = question?.options.find((o) => o.id === c.correctOptionId)?.text;
          const ok = c.chosenOptionId === c.correctOptionId;
          return (
            <li
              key={c.questionId}
              className={cx(
                'ms-quiz__correction',
                ok ? 'ms-quiz__correction--ok' : 'ms-quiz__correction--wrong',
              )}
            >
              {ok ? <Check aria-hidden /> : <XCircle aria-hidden />}
              <div className="ms-quiz__correction-body">
                <p className="ms-quiz__correction-q">
                  <span className="ms-meta">Questão {i + 1}</span>
                  {question?.question && <span>{question.question}</span>}
                </p>
                {!ok && chosen && (
                  <p className="ms-quiz__correction-a">
                    Sua resposta: <strong>{chosen}</strong>
                  </p>
                )}
                {right && (
                  <p className="ms-quiz__correction-a">
                    Resposta correta: <strong>{right}</strong>
                  </p>
                )}
                {c.explanation && (
                  <p className="ms-quiz__correction-x">{c.explanation}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Ranking: pódio com as cores dos tokens; a linha do jogador atual fica destacada. */
function Leaderboard({ entries, me }: { entries: LeaderboardEntryDTO[]; me?: string }) {
  return (
    <ol className="ms-lb" role="list">
      {entries.map((e, i) => (
        <li
          key={e.id}
          className={cx(
            'ms-lb__row',
            i < 3 && `ms-lb__row--top ms-lb__row--${i + 1}`,
            me && e.nickname === me && 'ms-lb__row--me',
          )}
          aria-current={me && e.nickname === me ? 'true' : undefined}
        >
          <span className="ms-lb__rank">{i + 1}</span>
          <span className="ms-lb__nick">{e.nickname}</span>
          <span className="ms-lb__score">
            {e.score}/{e.totalQuestions}
          </span>
        </li>
      ))}
    </ol>
  );
}
