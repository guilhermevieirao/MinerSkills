import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CircleHelp, Plus, Trophy, X } from 'lucide-react';
import { quizQuestionSchema, type QuizQuestionInput } from '@minerskills/shared';
import { adminApi, type AdminQuizQuestion } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  FieldGroup,
  IconButton,
  Input,
  StatusBadge,
  Switch,
  Textarea,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNewParam } from '../lib/useNewParam';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { cx } from '../../lib/format';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** Letra da opção (A, B, C…): o rótulo real de cada campo de opção. */
const letter = (index: number) => String.fromCharCode(65 + index);

export function QuizSection() {
  const questions = useQuery({
    queryKey: ['admin-quiz'],
    queryFn: adminApi.quiz.list,
  });
  const [editing, setEditing] = useState<AdminQuizQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminQuizQuestion | null>(null);
  const [resetting, setResetting] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useNewParam(() => setCreating(true));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-quiz'] });
    void queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminApi.quiz.remove(deleting.id);
      setDeleting(null);
      toast.success('Pergunta removida.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover a pergunta.');
    } finally {
      setBusy(false);
    }
  };

  const resetLeaderboard = async () => {
    setBusy(true);
    try {
      await adminApi.quiz.resetLeaderboard();
      setResetting(false);
      toast.success('Leaderboard zerado.');
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao zerar o leaderboard.');
    } finally {
      setBusy(false);
    }
  };

  const newQuestion = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Nova pergunta
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Quiz"
        description="Perguntas do jogo sobre a MinerSkills, a FRC e a FIRST."
        actions={
          <>
            <Button variant="danger" onClick={() => setResetting(true)}>
              <Trophy aria-hidden /> Zerar leaderboard
            </Button>
            {newQuestion}
          </>
        }
      />

      <QueryState
        query={questions}
        skeleton={<ListSkeleton rows={5} lead={0} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<CircleHelp />}
            title="Nenhuma pergunta"
            description="Crie a primeira pergunta do quiz."
            action={newQuestion}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Perguntas do quiz"
            rows={list}
            rowKey={(q) => q.id}
            rowLabel={(q) => q.question}
            columns={[
              {
                key: 'question',
                header: 'Pergunta',
                primary: true,
                render: (q) => q.question,
              },
              {
                key: 'options',
                header: 'Opções',
                align: 'end',
                width: '96px',
                render: (q) => q.options.length,
              },
              {
                key: 'status',
                header: 'Status',
                width: '120px',
                render: (q) => <StatusBadge status={q.active ? 'active' : 'inactive'} />,
              },
            ]}
            actions={(q) => (
              <RowActions
                label={q.question}
                onEdit={() => setEditing(q)}
                onRemove={() => setDeleting(q)}
              />
            )}
          />
        )}
      </QueryState>

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
        <ConfirmDialog
          title="Excluir pergunta"
          message={`A pergunta "${deleting.question}" sai do quiz e não pode ser recuperada.`}
          loading={busy}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
      {resetting && (
        <ConfirmDialog
          title="Zerar leaderboard"
          message="Todas as pontuações do ranking serão apagadas permanentemente."
          confirmLabel="Zerar"
          loading={busy}
          onConfirm={() => void resetLeaderboard()}
          onCancel={() => setResetting(false)}
        />
      )}
    </div>
  );
}

type OptionDraft = { text: string; isCorrect: boolean };

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
  const [options, setOptions] = useState<OptionDraft[]>(
    initial?.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) ?? [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Erro de cada opção (texto vazio/longo), pelo índice. */
  const [optionErrors, setOptionErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const setCorrect = (index: number) =>
    setOptions((opts) => opts.map((o, i) => ({ ...o, isCorrect: i === index })));

  const setOptionText = (index: number, text: string) =>
    setOptions((opts) => opts.map((o, i) => (i === index ? { ...o, text } : o)));

  const removeOption = (index: number) => {
    setOptions((opts) => opts.filter((_, i) => i !== index));
    setOptionErrors({});
  };

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
      const errs = fieldErrors(parsed.error);
      const perOption: Record<number, string> = {};
      let groupError: string | undefined;
      for (const issue of parsed.error.issues) {
        if (issue.path[0] !== 'options') continue;
        const index = issue.path[1];
        if (typeof index === 'number') {
          if (!(index in perOption)) perOption[index] = issue.message;
        } else {
          groupError ??= issue.message;
        }
      }
      // no grupo fica só o erro do conjunto (quantidade, "exatamente uma correta")
      if (groupError) errs.options = groupError;
      else delete errs.options;
      setErrors(errs);
      setOptionErrors(perOption);
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      toast.error('Verifique os campos do formulário.');
      return;
    }
    setErrors({});
    setOptionErrors({});
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
    <Modal
      title={initial ? 'Editar pergunta' : 'Nova pergunta'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={save} noValidate>
        <Field label="Pergunta" required error={errors.question}>
          <Textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Field>

        <FieldGroup
          label="Opções"
          hint={`Marque a opção correta. De ${MIN_OPTIONS} a ${MAX_OPTIONS} opções.`}
          error={errors.options}
        >
          <ul className="ms-repeater" role="list">
            {options.map((o, i) => (
              <li key={i} className="ms-repeater__item">
                <button
                  type="button"
                  className={cx('ms-quiz-correct', o.isCorrect && 'ms-quiz-correct--on')}
                  onClick={() => setCorrect(i)}
                  aria-pressed={o.isCorrect}
                  aria-label={`Marcar opção ${letter(i)} como correta`}
                  title="Marcar como correta"
                >
                  <Check aria-hidden />
                </button>
                <Field
                  label={`Opção ${letter(i)}`}
                  visuallyHiddenLabel
                  required
                  error={optionErrors[i]}
                >
                  <Input
                    value={o.text}
                    placeholder={`Opção ${i + 1}`}
                    onChange={(e) => setOptionText(i, e.target.value)}
                  />
                </Field>
                {options.length > MIN_OPTIONS && (
                  <IconButton
                    type="button"
                    size="sm"
                    variant="danger"
                    aria-label={`Remover opção ${letter(i)}`}
                    onClick={() => removeOption(i)}
                  >
                    <X aria-hidden />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
          {options.length < MAX_OPTIONS && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOptions((opts) => [...opts, { text: '', isCorrect: false }])
                }
              >
                <Plus aria-hidden /> Adicionar opção
              </Button>
            </div>
          )}
        </FieldGroup>

        <Field
          label="Explicação"
          optional
          hint="Mostrada no resultado, junto da resposta correta."
          error={errors.explanation}
        >
          <Textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </Field>

        <FieldGroup label="Exibição">
          <Switch checked={active} onChange={(e) => setActive(e.target.checked)}>
            Ativa no quiz
          </Switch>
          <div className="ms-modal__row">
            <Field
              label="Ordem"
              hint="Menor número aparece primeiro."
              error={errors.order}
            >
              <Input
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
          </div>
        </FieldGroup>
      </form>
    </Modal>
  );
}
