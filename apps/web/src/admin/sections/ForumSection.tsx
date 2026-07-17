import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Trash2, ShieldCheck, MessageSquare } from 'lucide-react';
import type { ForumTopicDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Loader, EmptyState } from '../../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { timeAgo } from '../../lib/format';

export function ForumSection() {
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Fórum</h1>
          <p>Modere tópicos e respostas enviados pela comunidade.</p>
        </div>
      </div>
      <div className="ms-enc__filters" style={{ marginBottom: 'var(--ms-space-5)' }}>
        <Button variant={tab === 'queue' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('queue')}>
          <ShieldCheck /> Fila de moderação
        </Button>
        <Button variant={tab === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('all')}>
          <MessageSquare /> Todos os tópicos
        </Button>
      </div>
      {tab === 'queue' ? <ModerationQueueTab /> : <AllTopicsTab />}
    </div>
  );
}

function refreshForum() {
  void queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-forum-topics'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
}

function ModerationQueueTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-moderation'], queryFn: adminApi.forum.moderation });
  const toast = useToast();

  const moderateTopic = async (id: string, status: 'approved' | 'rejected') => {
    await adminApi.forum.setTopic(id, status);
    toast.success(status === 'approved' ? 'Tópico aprovado.' : 'Tópico rejeitado.');
    refreshForum();
  };
  const moderateReply = async (id: string, status: 'approved' | 'rejected') => {
    await adminApi.forum.setReply(id, status);
    toast.success(status === 'approved' ? 'Resposta aprovada.' : 'Resposta rejeitada.');
    refreshForum();
  };

  if (isLoading) return <Loader />;
  const empty = !data || (data.topics.length === 0 && data.replies.length === 0);
  if (empty) {
    return <EmptyState icon={<ShieldCheck />} title="Fila vazia" description="Nada aguardando moderação." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ms-space-8)' }}>
      {data.topics.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--ms-text-lg)', marginBottom: 'var(--ms-space-3)' }}>
            Tópicos pendentes ({data.topics.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ms-space-3)' }}>
            {data.topics.map((t) => (
              <div key={t.id} className="ms-mod-item">
                <div className="ms-mod-item__body">
                  <strong>{t.title}</strong>
                  <p>{t.body}</p>
                  <span className="ms-mod-item__meta">
                    por {t.nickname} · {timeAgo(t.createdAt)}
                  </span>
                </div>
                <div className="ms-mod-item__actions">
                  <Button size="sm" onClick={() => moderateTopic(t.id, 'approved')}>
                    <Check /> Aprovar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => moderateTopic(t.id, 'rejected')}>
                    <X /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.replies.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--ms-text-lg)', marginBottom: 'var(--ms-space-3)' }}>
            Respostas pendentes ({data.replies.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ms-space-3)' }}>
            {data.replies.map((r) => (
              <div key={r.id} className="ms-mod-item">
                <div className="ms-mod-item__body">
                  <span className="ms-mod-item__topic">em: {r.topicTitle}</span>
                  <p>{r.body}</p>
                  <span className="ms-mod-item__meta">
                    por {r.nickname} · {timeAgo(r.createdAt)}
                  </span>
                </div>
                <div className="ms-mod-item__actions">
                  <Button size="sm" onClick={() => moderateReply(r.id, 'approved')}>
                    <Check /> Aprovar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => moderateReply(r.id, 'rejected')}>
                    <X /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AllTopicsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-forum-topics'], queryFn: adminApi.forum.allTopics });
  const [deleting, setDeleting] = useState<ForumTopicDTO | null>(null);
  const toast = useToast();

  const remove = async () => {
    if (!deleting) return;
    await adminApi.forum.removeTopic(deleting.id);
    setDeleting(null);
    toast.success('Tópico removido.');
    refreshForum();
  };

  const setStatus = async (id: string, status: string) => {
    await adminApi.forum.setTopic(id, status);
    toast.success('Status atualizado.');
    refreshForum();
  };

  if (isLoading) return <Loader />;
  if (!data || data.length === 0) return <EmptyState title="Nenhum tópico" />;

  const STATUS_LABEL: Record<string, string> = {
    approved: 'Aprovado',
    pending: 'Pendente',
    rejected: 'Rejeitado',
  };

  return (
    <div className="ms-adm__table-wrap">
      <table className="ms-adm__table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Autor</th>
            <th>Status</th>
            <th>Respostas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.nickname}</td>
              <td>
                <span className={`ms-adm__status ms-adm__status--${t.status}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </td>
              <td>{t.replyCount}</td>
              <td>
                <div className="ms-adm__row-actions">
                  {t.status !== 'approved' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, 'approved')} title="Aprovar">
                      <Check />
                    </Button>
                  )}
                  {t.status !== 'rejected' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, 'rejected')} title="Rejeitar">
                      <X />
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => setDeleting(t)}>
                    <Trash2 />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deleting && (
        <ConfirmDialog
          message={`Remover o tópico "${deleting.title}" e todas as respostas?`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
