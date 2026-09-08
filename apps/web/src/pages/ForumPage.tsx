import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, MessagesSquare, Send } from 'lucide-react';
import { forumTopicSchema, HONEYPOT_FIELD } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useForumTopics, useCreateTopic } from '../features/forum/useForum';
import { Button, Input, Textarea, Field, EmptyState } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { useToast } from '../components/ui/Toast';
import { Reveal } from '../components/motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';
import { timeAgo } from '../lib/format';
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

  // O formulário fica em outra região da página (abaixo do hero): ao fechar
  // por Cancelar/Enviar, o foco volta ao botão que o abriu.
  const closeForm = () => {
    setOpen(false);
    newTopicBtn.current?.focus();
  };

  return (
    <>
      <PageHero kicker="Comunidade" title="Fórum" subtitle={FORUM_DESCRIPTION}>
        <Button
          ref={newTopicBtn}
          className="ms-forum__new-btn"
          aria-expanded={open}
          aria-controls={NEW_TOPIC_FORM_ID}
          onClick={() => setOpen((o) => !o)}
        >
          <Plus /> Novo tópico
        </Button>
      </PageHero>

      <section className="ms-section ms-container">
        {open && <NewTopicForm onDone={closeForm} />}

        <QueryState
          query={topics}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              icon={<MessagesSquare />}
              title="Nenhum tópico ainda"
              description="Seja o primeiro a iniciar uma conversa."
            />
          }
        >
          {(data) => (
            <>
              <div className="ms-forum__list">
                {data.items.map((t, i) => (
                  <Reveal key={t.id} delay={i * 0.03}>
                    <Link to={`/forum/${t.id}`} className="ms-forum__topic">
                      <div className="ms-forum__topic-main">
                        <h3>{t.title}</h3>
                        <p>{t.body}</p>
                        <span className="ms-forum__topic-meta">
                          por <strong>{t.nickname}</strong> · {timeAgo(t.createdAt)}
                        </span>
                      </div>
                      <span className="ms-forum__replies">
                        <MessageSquare /> {t.replyCount}
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="ms-forum__pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    {page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </QueryState>
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
  const create = useCreateTopic();
  const toast = useToast();

  // Aberto pelo botão do hero: o foco vai direto ao primeiro campo, sem
  // tabular pela seção até achá-lo.
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
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
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
    <form className="ms-forum__form" id={NEW_TOPIC_FORM_ID} onSubmit={submit}>
      <p className="ms-forum__form-note">
        As mensagens passam por moderação antes de serem publicadas.
      </p>
      <div className="ms-forum__form-row">
        <Field label="Apelido" error={errors.nickname}>
          <Input
            ref={firstField}
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
          />
        </Field>
        <Field label="Título" error={errors.title}>
          <Input
            value={title}
            maxLength={140}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
      </div>
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
      <div className="ms-forum__form-actions">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending}>
          <Send /> Enviar
        </Button>
      </div>
    </form>
  );
}
