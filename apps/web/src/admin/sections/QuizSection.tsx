import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Trophy, Check } from 'lucide-react';
import { quizQuestionSchema, type QuizQuestionInput } from '@minerskills/shared';
import { adminApi, type AdminQuizQuestion } from '../adminApi';
import { Button, Input, Textarea, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';

export function QuizSection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-quiz'], queryFn: adminApi.quiz.list });
  const [editing, setEditing] = useState<AdminQuizQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminQuizQuestion | null>(null);
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-quiz'] });
    void queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.quiz.remove(deleting.id);
    setDeleting(null);
    toast.success('Pergunta removida.');
    refresh();
  };

  const resetLeaderboard = async () => {
    await adminApi.quiz.resetLeaderboard();
    setResetting(false);
    toast.success('Leaderboard zerado.');
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Quiz</h1>
          <p>Perguntas do jogo sobre a MinerSkills, a FRC e a FIRST.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--ms-space-2)' }}>
          <Button variant="danger" onClick={() => setResetting(true)}>
            <Trophy /> Zerar leaderboard
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nova pergunta
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhuma pergunta" description="Crie a primeira pergunta do quiz." />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Pergunta</th>
                <th>Opções</th>
                <th>Ativa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((q) => (
                <tr key={q.id}>
                  <td>{q.question}</td>
                  <td>{q.options.length}</td>
                  <td>
                    <span className={`ms-adm__status ms-adm__status--${q.active ? 'approved' : 'pending'}`}>
                      {q.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(q)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(q)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <QuizForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog message="Remover esta pergunta?" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
      {resetting && (
        <ConfirmDialog
          title="Zerar leaderboard"
          message="Todas as pontuações serão apagadas permanentemente. Continuar?"
          confirmLabel="Zerar"
          onConfirm={resetLeaderboard}
          onCancel={() => setResetting(false)}
        />
      )}
    </div>
  );
}

function QuizForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminQuizQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>(
    initial?.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) ?? [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const setCorrect = (index: number) =>
    setOptions((opts) => opts.map((o, i) => ({ ...o, isCorrect: i === index })));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: QuizQuestionInput = {
      question,
      explanation: explanation || null,
      active,
      order,
      options: options.map((o, i) => ({ ...o, order: i })),
    };
    const parsed = quizQuestionSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      if (initial) await adminApi.quiz.update(initial.id, parsed.data);
      else await adminApi.quiz.create(parsed.data);
      toast.success('Pergunta salva.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Editar pergunta' : 'Nova pergunta'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Pergunta">
          <Textarea
            value={question}
            style={{ minHeight: 70 }}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Field>

        <div className="ms-field">
          <span className="ms-field__label">Opções (marque a correta)</span>
          <div className="ms-repeater">
            {options.map((o, i) => (
              <div key={i} className="ms-repeater__item">
                <button
                  type="button"
                  className={`ms-quiz-correct ${o.isCorrect ? 'ms-quiz-correct--on' : ''}`}
                  onClick={() => setCorrect(i)}
                  aria-label="Marcar como correta"
                  title="Marcar como correta"
                >
                  <Check />
                </button>
                <Input
                  value={o.text}
                  placeholder={`Opção ${i + 1}`}
                  onChange={(e) =>
                    setOptions((opts) => opts.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))
                  }
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setOptions((opts) => opts.filter((_, k) => k !== i))}
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              style={{ marginTop: 'var(--ms-space-3)' }}
              onClick={() => setOptions((opts) => [...opts, { text: '', isCorrect: false }])}
            >
              <Plus /> Adicionar opção
            </Button>
          )}
        </div>

        <Field label="Explicação (mostrada no resultado)">
          <Textarea
            value={explanation}
            style={{ minHeight: 60 }}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </Field>

        <div className="ms-modal__row">
          <Field label="Ordem">
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label className="ms-checkbox">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Ativa no quiz
            </label>
          </div>
        </div>

        {error && <p style={{ color: 'var(--ms-danger)', fontSize: 'var(--ms-text-sm)' }}>{error}</p>}

        <div className="ms-modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
