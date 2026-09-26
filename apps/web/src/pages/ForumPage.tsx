import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, MessageSquare, MessagesSquare, Plus, Send } from 'lucide-react';
import { forumTopicSchema, HONEYPOT_FIELD } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useForumTopics, useCreateTopic } from '../features/forum/useForum';
import { Button, Card, EmptyState, Field, Input, Textarea } from '../components/ui';
import { Avatar } from '../components/ui/Avatar';
import { DateText } from '../components/ui/DateText';
import { Pagination } from '../components/ui/Pagination';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { Reveal } from '../components/motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';
import { fieldErrors, focusFirstInvalid } from '../lib/forms';
import { ApiError } from '../lib/api';
import './ForumPage.scss';

const FORUM_DESCRIPTION =
  'Tire dúvidas, compartilhe ideias e converse com a comunidade MinerSkills.';

/** Id do formulário de tópico novo — alvo do `aria-controls` do botão que o abre. */
const NEW_TOPIC_FORM_ID = 'ms-forum-new-topic';

export function ForumPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const topics = useForumTopics(page);
  const newTopicBtn = useRef<HTMLButtonElement>(null);

  useDocumentHead({
    title: 'Fórum',
    description: FORUM_DESCRIPTION,
    canonicalPath: '/forum',
  });

  // O formulário fica em outra região da página (abaixo do cabeçalho): ao
  // fechar por Cancelar/Enviar, o foco volta ao botão que o abriu.
  const closeForm = () => {
    setOpen(false);
    newTopicBtn.current?.focus();
  };

  return (
    <>
      <PageHero
        title="Fórum"
        subtitle={FORUM_DESCRIPTION}
        actions={
          <Button
            ref={newTopicBtn}
            aria-expanded={open}
            aria-controls={NEW_TOPIC_FORM_ID}
            onClick={() => setOpen((o) => !o)}
          >
            <Plus aria-hidden /> Novo tópico
          </Button>
        }
      />

      <section className="ms-section ms-container ms-forum">
        {open && <NewTopicForm onDone={closeForm} />}

        <QueryState
          query={topics}
          skeleton={<ListSkeleton rows={5} lead={0} />}
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              icon={<MessagesSquare />}
              title="Nenhum tópico ainda"
              description="Seja o primeiro a iniciar uma conversa."
              action={
                !open && (
                  <Button variant="outline" onClick={() => setOpen(true)}>
                    Iniciar conversa
                  </Button>
                )
              }
            />
          }
        >
          {(data) => (
            <Reveal>
              <ul
                className="ms-forum__list"
                role="list"
                aria-busy={topics.isFetching || undefined}
              >
                {data.items.map((t) => (
                  <li key={t.id}>
                    <Link to={`/forum/${t.id}`} className="ms-forum__topic">
                      <div className="ms-forum__topic-main">
                        <h3 className="ms-forum__topic-title">{t.title}</h3>
                        <p className="ms-forum__topic-preview">{t.body}</p>
                        <p className="ms-forum__topic-meta">
                          <Avatar name={t.nickname} size="sm" />
                          <span>{t.nickname}</span>
                          <span aria-hidden>·</span>
                          <DateText iso={t.createdAt} format="relative" meta={false} />
                        </p>
                      </div>
                      <span
                        className="ms-forum__replies"
                        aria-label={`${t.replyCount} ${t.replyCount === 1 ? 'resposta' : 'respostas'}`}
                      >
                        <MessageSquare aria-hidden /> {t.replyCount}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </QueryState>

        <Pagination
          page={page}
          totalPages={topics.data?.totalPages ?? 1}
          onChange={setPage}
          loading={topics.isFetching}
        />
      </section>
    </>
  );
}

/**
 * Formulário de tópico novo. O campo-armadilha (`HONEYPOT_FIELD`) vai junto no
 * envio, vazio para pessoas: fica fora da tela via CSS — nunca `type="hidden"`,
 * senão os robôs o ignoram — e a API descarta em silêncio quando vem preenchido.
 */
function NewTopicForm({ onDone }: { onDone: () => void }) {
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const create = useCreateTopic();
  const toast = useToast();

  // Aberto pelo botão do cabeçalho: o foco vai direto ao primeiro campo.
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstField.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumTopicSchema.safeParse({
      nickname,
      title,
      body,
      [HONEYPOT_FIELD]: trap,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
    try {
      await create.mutateAsync(parsed.data);
      toast.success('Tópico enviado! Ele aparecerá após a moderação.');
      setNickname('');
      setTitle('');
      setBody('');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao enviar tópico.');
    }
  };

  return (
    <Card as="section" className="ms-forum__new" aria-labelledby="ms-forum-new-title">
      <form
        ref={formRef}
        className="ms-form"
        id={NEW_TOPIC_FORM_ID}
        onSubmit={submit}
        noValidate
      >
        <h2 id="ms-forum-new-title" className="ms-forum__new-title">
          Novo tópico
        </h2>
        <p className="ms-forum__note">
          <Info aria-hidden /> As mensagens passam por moderação antes de serem
          publicadas.
        </p>
        <div className="ms-form__grid">
          <Field label="Apelido" required error={errors.nickname}>
            <Input
              ref={firstField}
              value={nickname}
              maxLength={20}
              autoComplete="nickname"
              onChange={(e) => setNickname(e.target.value)}
            />
          </Field>
          <Field label="Título" required error={errors.title}>
            <Input
              value={title}
              maxLength={140}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
        </div>
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
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            <Send aria-hidden /> Enviar
          </Button>
        </div>
      </form>
    </Card>
  );
}
