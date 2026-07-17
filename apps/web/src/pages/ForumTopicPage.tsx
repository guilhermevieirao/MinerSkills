import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { forumReplySchema } from '@minerskills/shared';
import { useForumTopic, useCreateReply } from '../features/forum/useForum';
import { Button, Input, Textarea, Field, Loader, EmptyState, LinkButton } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { timeAgo } from '../lib/format';
import { ApiError } from '../lib/api';
import './ForumTopicPage.scss';

export function ForumTopicPage() {
  const { id } = useParams();
  const { data: topic, isLoading, isError } = useForumTopic(id);

  if (isLoading) return <div className="ms-section ms-container"><Loader /></div>;
  if (isError || !topic)
    return (
      <div className="ms-section ms-container">
        <EmptyState
          title="Tópico não encontrado"
          description="Ele pode ter sido removido ou ainda estar em moderação."
          action={<LinkButton to="/forum" variant="outline">Voltar ao fórum</LinkButton>}
        />
      </div>
    );

  return (
    <section className="ms-section ms-container ms-topic">
      <Link to="/forum" className="ms-topic__back">
        <ArrowLeft /> Fórum
      </Link>

      <article className="ms-topic__op">
        <h1>{topic.title}</h1>
        <span className="ms-topic__meta">
          por <strong>{topic.nickname}</strong> · {timeAgo(topic.createdAt)}
        </span>
        <p className="ms-topic__body">{topic.body}</p>
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
          </div>
        ))}
      </div>

      <ReplyForm topicId={topic.id} />
    </section>
  );
}

function ReplyForm({ topicId }: { topicId: string }) {
  const [nickname, setNickname] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateReply(topicId);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forumReplySchema.safeParse({ nickname, body });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
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
        <Input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
      </Field>
      <Field label="Mensagem" error={errors.body}>
        <Textarea value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="ms-topic__form-actions">
        <Button type="submit" loading={create.isPending}>
          <Send /> Enviar resposta
        </Button>
      </div>
    </form>
  );
}
