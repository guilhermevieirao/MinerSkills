import { useId, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Flag, MessageSquare, Send } from 'lucide-react';
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
import { PageHero } from '../components/layout/PageHero';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Select,
  Textarea,
} from '../components/ui';
import { Avatar } from '../components/ui/Avatar';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { DateText } from '../components/ui/DateText';
import { FullScreenMessage } from '../components/ui/FullScreenMessage';
import { QueryState } from '../components/ui/QueryState';
import { HeroSkeleton, ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { useDocumentHead } from '../lib/useDocumentHead';
import { cx } from '../lib/format';
import { fieldErrors, focusFirstInvalid } from '../lib/forms';
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

  if (isNotFound(query.error)) {
    return (
      <FullScreenMessage
        title="Tópico não encontrado"
        text="Ele pode ter sido removido ou ainda estar em moderação."
        actions={
          <LinkButton to="/forum" variant="outline">
            <ArrowLeft aria-hidden /> Voltar ao fórum
          </LinkButton>
        }
      />
    );
  }

  return (
    <QueryState
      query={query}
      skeleton={
        <>
          <HeroSkeleton />
          <div className="ms-section ms-container">
            <ListSkeleton rows={3} lead={0} />
          </div>
        </>
      }
    >
      {(data) => <TopicView topic={data} />}
    </QueryState>
  );
}

function TopicView({ topic }: { topic: ForumTopicDetailDTO }) {
  const count = topic.replies.length;
  return (
    <>
      <PageHero
        size="sm"
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Fórum', to: '/forum' }, { label: topic.title }]}
          />
        }
        title={topic.title}
        subtitle={
          <span className="ms-topic__byline">
            <Avatar name={topic.nickname} size="sm" />
            <span>{topic.nickname}</span>
            <span aria-hidden>·</span>
            <DateText iso={topic.createdAt} format="relative" meta={false} />
          </span>
        }
      />

      <section className="ms-section ms-container ms-topic">
        <article className="ms-topic__op">
          <p className="ms-topic__body">{topic.body}</p>
          <div className="ms-topic__foot">
            <TopicReport id={topic.id} />
          </div>
        </article>

        <div className="ms-topic__thread">
          <h2 className="ms-topic__replies-title">
            <MessageSquare aria-hidden /> {count} {count === 1 ? 'resposta' : 'respostas'}
          </h2>
          {count === 0 ? (
            <EmptyState
              size="sm"
              title="Nenhuma resposta ainda"
              description="Seja o primeiro a responder."
            />
          ) : (
            <ul className="ms-topic__replies" role="list">
              {topic.replies.map((r) => (
                <li key={r.id} className="ms-topic__reply">
                  <div className="ms-topic__reply-head">
                    <Avatar name={r.nickname} size="sm" />
                    <strong>{r.nickname}</strong>
                    <DateText iso={r.createdAt} format="relative" />
                  </div>
                  <p className="ms-topic__reply-body">{r.body}</p>
                  <div className="ms-topic__foot">
                    <ReplyReport id={r.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ReplyForm topicId={topic.id} />
      </section>
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
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const create = useCreateReply(topicId);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumReplySchema.safeParse({ nickname, body, [HONEYPOT_FIELD]: trap });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
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
    <Card as="section" className="ms-topic__form" aria-labelledby={titleId}>
      <form ref={formRef} className="ms-form" onSubmit={submit} noValidate>
        <h2 id={titleId} className="ms-topic__form-title">
          Deixe sua resposta
        </h2>
        <p className="ms-topic__note">As respostas passam por moderação.</p>
        <Field label="Apelido" required error={errors.nickname}>
          <Input
            value={nickname}
            maxLength={20}
            autoComplete="nickname"
            onChange={(e) => setNickname(e.target.value)}
          />
        </Field>
        <Field label="Mensagem" required error={errors.body}>
          <Textarea
            value={body}
            maxLength={4000}
            rows={5}
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
        <div className="ms-form__actions">
          <Button type="submit" loading={create.isPending}>
            <Send aria-hidden /> Enviar resposta
          </Button>
        </div>
      </form>
    </Card>
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
 * Botão "Denunciar" (sempre montado, com `aria-expanded`) que abre um
 * mini-formulário inline (motivo + detalhes). Ao fechar — por Cancelar ou
 * envio — o foco volta ao botão. A API responde 202 sempre, inclusive quando
 * descarta por repetição ou honeypot: o visitante vê o mesmo agradecimento.
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
  const toggleRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const toast = useToast();

  const close = () => {
    setOpen(false);
    setDetails('');
    setError(undefined);
    requestAnimationFrame(() => toggleRef.current?.focus());
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

  return (
    <div className={cx('ms-report', open && 'ms-report--open')}>
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="sm"
        className="ms-report__toggle"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Flag aria-hidden /> Denunciar
      </Button>

      {open && (
        <form
          id={formId}
          className="ms-report__form ms-form"
          onSubmit={submit}
          aria-label={label}
          noValidate
        >
          <p className="ms-report__note">
            A denúncia vai para a moderação da equipe. Nenhum dado seu é publicado.
          </p>
          <div className="ms-form__grid">
            <Field label="Motivo">
              <Select
                autoFocus
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
          <div className="ms-form__actions">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              <Flag aria-hidden /> Enviar denúncia
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
