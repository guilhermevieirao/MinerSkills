import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, MessagesSquare, Send } from 'lucide-react';
import { forumTopicSchema } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useForumTopics, useCreateTopic } from '../features/forum/useForum';
import { Button, Input, Textarea, Field, Loader, EmptyState } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { Reveal } from '../components/motion/Reveal';
import { timeAgo } from '../lib/format';
import { ApiError } from '../lib/api';
import './ForumPage.scss';

export function ForumPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useForumTopics(page);

  return (
    <>
      <PageHero
        kicker="Comunidade"
        title="Fórum"
        subtitle="Tire dúvidas, compartilhe ideias e converse com a comunidade MinerSkills."
      >
        <Button className="ms-forum__new-btn" onClick={() => setOpen((o) => !o)}>
          <Plus /> Novo tópico
        </Button>
      </PageHero>

      <section className="ms-section ms-container">
        {open && <NewTopicForm onDone={() => setOpen(false)} />}

        {isLoading ? (
          <Loader />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare />}
            title="Nenhum tópico ainda"
            description="Seja o primeiro a iniciar uma conversa."
          />
        ) : (
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
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
      </section>
    </>
  );
}

function NewTopicForm({ onDone }: { onDone: () => void }) {
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateTopic();
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumTopicSchema.safeParse({ nickname, title, body });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
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
    <form className="ms-forum__form" onSubmit={submit}>
      <p className="ms-forum__form-note">
        As mensagens passam por moderação antes de serem publicadas.
      </p>
      <div className="ms-forum__form-row">
        <Field label="Apelido" error={errors.nickname}>
          <Input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Field label="Título" error={errors.title}>
          <Input value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <Field label="Mensagem" error={errors.body}>
        <Textarea value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      </Field>
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
