import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trophy, Play, Check, XCircle, RotateCcw, Medal, Clock } from 'lucide-react';
import type { LeaderboardEntryDTO, QuizResultDTO } from '@minerskills/shared';
import { nicknameSchema } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import {
  useQuizQuestions,
  useLeaderboard,
  useSubmitQuiz,
} from '../features/quiz/useQuiz';
import { Button, Input, EmptyState, Field } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { formatDuration } from '../lib/format';
import { queryClient } from '../lib/queryClient';
import { useDocumentHead } from '../lib/useDocumentHead';
import './QuizPage.scss';

const DESCRIPTION =
  'Teste seus conhecimentos sobre a MinerSkills, a FRC e a FIRST. Entre para o ranking!';

type Phase = 'intro' | 'playing' | 'result';

export function QuizPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
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
  const progress = total ? Math.round((current / total) * 100) : 0;

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
    startRef.current = performance.now();
    setPhase('playing');
    void refetch();
  };

  const choose = (optionId: string) => {
    if (!q) return;
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    setTimeout(() => {
      if (current + 1 < total) {
        setCurrent((c) => c + 1);
      } else {
        finish(next);
      }
    }, 220);
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
      <PageHero kicker="Jogo" title="Quiz MinerSkills" subtitle={DESCRIPTION} />

      <section className="ms-section ms-container ms-quiz">
        <div className="ms-quiz__main">
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                key="intro"
                className="ms-quiz__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="ms-quiz__intro-icon">
                  <Trophy />
                </div>
                <h2>Pronto para o desafio?</h2>
                <p>Escolha um apelido para aparecer no leaderboard e comece a jogar.</p>
                <div className="ms-quiz__nick">
                  <Field error={nickError}>
                    <Input
                      placeholder="Seu apelido"
                      value={nickname}
                      maxLength={20}
                      onChange={(e) => setNickname(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && start()}
                      aria-label="Apelido"
                    />
                  </Field>
                  <Button onClick={start} size="lg">
                    <Play /> Começar
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === 'playing' && (
              <motion.div
                key="playing"
                className="ms-quiz__card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <QueryState
                  query={questionsQuery}
                  skeleton={<ListSkeleton rows={4} />}
                  isEmpty={(list) => list.length === 0}
                  empty={
                    <EmptyState
                      title="Nenhuma pergunta disponível"
                      description="Volte mais tarde para jogar."
                    />
                  }
                >
                  {() =>
                    q && (
                      <>
                        <div className="ms-quiz__progress">
                          <div
                            className="ms-quiz__progress-bar"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="ms-quiz__counter">
                          Pergunta {current + 1} de {total}
                        </span>
                        <motion.h2
                          key={q.id}
                          className="ms-quiz__question"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {q.question}
                        </motion.h2>
                        <div className="ms-quiz__options">
                          {q.options.map((opt, i) => (
                            <button
                              key={opt.id}
                              className={`ms-quiz__option ${answers[q.id] === opt.id ? 'ms-quiz__option--picked' : ''}`}
                              onClick={() => choose(opt.id)}
                            >
                              <span className="ms-quiz__option-letter">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      </>
                    )
                  }
                </QueryState>
              </motion.div>
            )}

            {phase === 'result' && result && (
              <motion.div
                key="result"
                className="ms-quiz__card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="ms-quiz__result-score">
                  <span className="ms-quiz__result-big">
                    {result.score}
                    <span className="ms-quiz__result-total">
                      /{result.totalQuestions}
                    </span>
                  </span>
                  <div className="ms-quiz__result-meta">
                    <span>
                      <Medal /> {result.rank}º no ranking
                    </span>
                    <span>
                      <Clock /> {formatDuration(result.durationMs)}
                    </span>
                  </div>
                </div>
                <p className="ms-quiz__result-msg">
                  {result.score === result.totalQuestions
                    ? 'Perfeito! Você é um verdadeiro Miner.'
                    : result.score >= result.totalQuestions * 0.6
                      ? 'Muito bem! Você conhece a equipe.'
                      : 'Continue estudando a MinerSkills e tente de novo!'}
                </p>
                <Button onClick={reset} variant="outline">
                  <RotateCcw /> Jogar novamente
                </Button>

                <div className="ms-quiz__corrections">
                  {result.corrections.map((c, i) => {
                    const correct = c.chosenOptionId === c.correctOptionId;
                    return (
                      <div
                        key={c.questionId}
                        className={`ms-quiz__correction ${correct ? 'is-correct' : 'is-wrong'}`}
                      >
                        {correct ? <Check /> : <XCircle />}
                        <div>
                          <span>Questão {i + 1}</span>
                          {c.explanation && <p>{c.explanation}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="ms-quiz__leaderboard">
          <h3 className="ms-quiz__lb-title">
            <Trophy /> Leaderboard
          </h3>
          <QueryState
            query={leaderboard}
            compact
            skeleton={<ListSkeleton rows={5} />}
            isEmpty={(list) => list.length === 0}
            empty={
              <EmptyState title="Sem pontuações" description="Seja o primeiro a jogar!" />
            }
          >
            {(list) => <Leaderboard entries={list} />}
          </QueryState>
        </aside>
      </section>
    </>
  );
}

function Leaderboard({ entries }: { entries: LeaderboardEntryDTO[] }) {
  return (
    <ol className="ms-lb">
      {entries.map((e, i) => (
        <li
          key={e.id}
          className={`ms-lb__row ${i < 3 ? `ms-lb__row--top ms-lb__row--${i + 1}` : ''}`}
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
