import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, Flag } from 'lucide-react';
import {
  forumReplySchema,
  forumReportSchema,
  HONEYPOT_FIELD,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ForumReportInput,
  type ForumTopicDetailDTO,
  type ReportReason,
} from '@minerskills/shared';
import {
  useForumTopic,
  useCreateReply,
  useReportTopic,
  useReportReply,
} from '../features/forum/useForum';
import {
  Button,
  Input,
  Textarea,
  Select,
  Field,
  EmptyState,
  LinkButton,
} from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { useDocumentHead } from '../lib/useDocumentHead';
import { timeAgo } from '../lib/format';
import { ApiError } from '../lib/api';
import './ForumTopicPage.scss';

/** Tamanho da descrição (meta/OG) tirada do início do corpo do tópico. */
const DESCRIPTION_LENGTH = 160;

function describe(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > DESCRIPTION_LENGTH
    ? `${oneLine.slice(0, DESCRIPTION_LENGTH)}…`
    : oneLine;
}

/** Id que não existe (ou tópico ainda em moderação): tela própria, sem "tentar novamente". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function ForumTopicPage() {
  const { id } = useParams();
  const query = useForumTopic(id);
  const topic = query.data;

  // Antes dos retornos condicionais: hooks precisam rodar em toda renderização.
  useDocumentHead({
    title: topic?.title ?? 'Fórum',
    description: topic ? describe(topic.body) : undefined,
    canonicalPath: topic ? `/forum/${topic.id}` : undefined,
    type: topic ? 'article' : 'website',
    noindex: query.isError,
  });

  if (isNotFound(query.error))
    return (
      <div className="ms-section ms-container">
        <EmptyState
          title="Tópico não encontrado"
          description="Ele pode ter sido removido ou ainda estar em moderação."
          action={
            <LinkButton to="/forum" variant="outline">
              Voltar ao fórum
            </LinkButton>
          }
        />
      </div>
    );

  // O link de volta fica fora do QueryState: aparece também durante o
  // carregamento e no erro com "Tentar novamente".
  return (
    <section className="ms-section ms-container ms-topic">
      <Link to="/forum" className="ms-topic__back">
        <ArrowLeft /> Fórum
      </Link>

      <QueryState query={query} skeleton={<ListSkeleton rows={3} />}>
        {(data) => <TopicThread topic={data} />}
      </QueryState>
    </section>
  );
}

function TopicThread({ topic }: { topic: ForumTopicDetailDTO }) {
  return (
    <>
      <article className="ms-topic__op">
        <h1>{topic.title}</h1>
        <span className="ms-topic__meta">
          por <strong>{topic.nickname}</strong> · {timeAgo(topic.createdAt)}
        </span>
        <p className="ms-topic__body">{topic.body}</p>
        <TopicReport id={topic.id} />
      </article>

      <h2 className="ms-topic__replies-title">
        <MessageSquare /> {topic.replies.length}{' '}
        {topic.replies.length === 1 ? 'resposta' : 'respostas'}
      </h2>

      <div className="ms-topic__replies">
        {topic.replies.map((r) => (
          <div key={r.id} className="ms-topic__reply">
            <div className="ms-topic__reply-head">
              <strong>{r.nickname}</strong>
              <span>{timeAgo(r.createdAt)}</span>
            </div>
            <p>{r.body}</p>
            <ReplyReport id={r.id} />
          </div>
        ))}
      </div>

      <ReplyForm topicId={topic.id} />
    </>
  );
}

/**
 * Formulário de resposta. O campo-armadilha (`HONEYPOT_FIELD`) vai junto no
 * envio, vazio para pessoas: fica fora da tela via CSS — nunca `type="hidden"`,
 * senão os robôs o ignoram — e a API descarta em silêncio quando vem preenchido.
 */
function ReplyForm({ topicId }: { topicId: string }) {
  const [nickname, setNickname] = useState('');
  const [body, setBody] = useState('');
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateReply(topicId);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumReplySchema.safeParse({ nickname, body, [HONEYPOT_FIELD]: trap });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await create.mutateAsync(parsed.data);
      toast.success('Resposta enviada! Aparecerá após a moderação.');
      setBody('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao enviar resposta.');
    }
  };

  return (
    <form className="ms-topic__form" onSubmit={submit}>
      <h3>Deixe sua resposta</h3>
      <p className="ms-topic__form-note">As respostas passam por moderação.</p>
      <Field label="Apelido" error={errors.nickname}>
        <Input
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
        />
      </Field>
      <Field label="Mensagem" error={errors.body}>
        <Textarea
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      {/* campo-armadilha: visitantes não veem nem alcançam pelo teclado */}
      <input
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="ms-hp"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />
      <div className="ms-topic__form-actions">
        <Button type="submit" loading={create.isPending}>
          <Send /> Enviar resposta
        </Button>
      </div>
    </form>
  );
}

// ─── Denúncias ──────────────────────────────────────────────

function TopicReport({ id }: { id: string }) {
  const report = useReportTopic(id);
  return (
    <ReportPanel
      label="Denunciar tópico"
      pending={report.isPending}
      send={(input) => report.mutateAsync(input)}
    />
  );
}

function ReplyReport({ id }: { id: string }) {
  const report = useReportReply(id);
  return (
    <ReportPanel
      label="Denunciar resposta"
      pending={report.isPending}
      send={(input) => report.mutateAsync(input)}
    />
  );
}

/**
 * Botão "Denunciar" que abre um mini-formulário inline (motivo + detalhes).
 * A API responde 202 sempre — inclusive quando descarta por repetição ou
 * honeypot —, então o visitante vê o mesmo agradecimento em qualquer caso.
 */
function ReportPanel({
  label,
  pending,
  send,
}: {
  label: string;
  pending: boolean;
  send: (input: ForumReportInput) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [trap, setTrap] = useState('');
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  const close = () => {
    setOpen(false);
    setDetails('');
    setError(undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumReportSchema.safeParse({
      reason,
      details: details.trim() || null,
      [HONEYPOT_FIELD]: trap,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setError(undefined);
    try {
      await send(parsed.data);
      toast.success('Denúncia registrada. Obrigado.');
      close();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao enviar denúncia.');
    }
  };

  if (!open) {
    return (
      <div className="ms-report">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Flag /> Denunciar
        </Button>
      </div>
    );
  }

  return (
    <form className="ms-report ms-report--open" onSubmit={submit} aria-label={label}>
      <p className="ms-report__note">
        A denúncia vai para a moderação da equipe. Nenhum dado seu é publicado.
      </p>
      <div className="ms-report__fields">
        <Field label="Motivo">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {REPORT_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Detalhes (opcional)" error={error}>
          <Textarea
            value={details}
            rows={2}
            maxLength={500}
            onChange={(e) => setDetails(e.target.value)}
          />
        </Field>
      </div>
      {/* campo-armadilha: visitantes não veem nem alcançam pelo teclado */}
      <input
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="ms-hp"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />
      <div className="ms-report__actions">
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          <Flag /> Enviar denúncia
        </Button>
      </div>
    </form>
  );
}
