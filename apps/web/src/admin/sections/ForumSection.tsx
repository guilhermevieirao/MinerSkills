import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  X,
  Trash2,
  ShieldCheck,
  MessageSquare,
  Flag,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import {
  REPORT_REASON_LABELS,
  type ForumReportDTO,
  type ForumTopicDTO,
  type ReportReason,
  type ReportStatus,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, FilterChip, Loader, Tag } from '../../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { cx, formatDateTime, timeAgo } from '../../lib/format';
import './ForumSection.scss';

type Tab = 'queue' | 'all' | 'reports';

const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  rejected: 'Rejeitado',
};

const REPORT_FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'resolved', label: 'Resolvidas' },
];

function reasonLabel(reason: string): string {
  return REPORT_REASON_LABELS[reason as ReportReason] ?? reason;
}

/**
 * Nome do admin a partir do id gravado em `moderatedBy`/`resolvedBy`. A lista
 * de administradores é a mesma de /admin/administradores (mesma query key);
 * um id sem correspondência (admin excluído) vira "—".
 */
function useAdminName(): (id: string | null | undefined) => string {
  const { data } = useQuery({ queryKey: ['admin-admins'], queryFn: adminApi.admins.list });
  return (id) => {
    if (!id) return '—';
    return data?.find((a) => a.id === id)?.name ?? '—';
  };
}

export function ForumSection() {
  const [tab, setTab] = useState<Tab>('queue');
  // Contador da aba Denúncias: a mesma query que a aba usa com o filtro "Abertas".
  const { data: openReports } = useQuery({
    queryKey: ['admin-forum-reports', 'open'],
    queryFn: () => adminApi.forum.reports('open'),
  });
  const openCount = openReports?.length ?? 0;

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Fórum</h1>
          <p>Modere tópicos e respostas enviados pela comunidade.</p>
        </div>
      </div>
      <div className="ms-forum-adm__tabs">
        <Button variant={tab === 'queue' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('queue')}>
          <ShieldCheck /> Fila de moderação
        </Button>
        <Button variant={tab === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('all')}>
          <MessageSquare /> Todos os tópicos
        </Button>
        <Button
          variant={tab === 'reports' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('reports')}
        >
          <Flag /> Denúncias
          {openCount > 0 && (
            <span
              className="ms-forum-adm__badge"
              aria-label={`${openCount} ${openCount === 1 ? 'aberta' : 'abertas'}`}
            >
              {openCount}
            </span>
          )}
        </Button>
      </div>
      {tab === 'queue' && <ModerationQueueTab />}
      {tab === 'all' && <AllTopicsTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

/**
 * Moderar ou resolver uma denúncia muda a fila, a lista de tópicos, os
 * contadores do dashboard (badge da sidebar) e o que o site público mostra.
 */
function refreshForum() {
  void queryClient.invalidateQueries({ queryKey: ['admin-forum-reports'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-forum-topics'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
  void queryClient.invalidateQueries({ queryKey: ['forum-topic'] });
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
  const adminName = useAdminName();
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

  return (
    <div className="ms-adm__table-wrap">
      <table className="ms-adm__table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Autor</th>
            <th>Status</th>
            <th>Moderado por</th>
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
              <td>{adminName(t.moderatedBy)}</td>
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

/**
 * Denúncias enviadas pelos visitantes. "Rejeitar conteúdo" tira o alvo do ar
 * (status `rejected`) e já resolve a denúncia; "Resolver" só a fecha (o
 * conteúdo continua como está).
 */
function ReportsTab() {
  const [filter, setFilter] = useState<ReportStatus>('open');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-forum-reports', filter],
    queryFn: () => adminApi.forum.reports(filter),
  });
  const adminName = useAdminName();
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const run = async (report: ForumReportDTO, action: () => Promise<unknown>, done: string) => {
    setBusy(report.id);
    try {
      await action();
      toast.success(done);
      refreshForum();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar a denúncia.');
    } finally {
      setBusy(null);
    }
  };

  const resolve = (r: ForumReportDTO) =>
    run(r, () => adminApi.forum.setReport(r.id, { status: 'resolved' }), 'Denúncia resolvida.');

  const reopen = (r: ForumReportDTO) =>
    run(r, () => adminApi.forum.setReport(r.id, { status: 'open' }), 'Denúncia reaberta.');

  const rejectContent = (r: ForumReportDTO) =>
    run(
      r,
      async () => {
        if (r.target.type === 'topic') await adminApi.forum.setTopic(r.target.id, 'rejected');
        else await adminApi.forum.setReply(r.target.id, 'rejected');
        if (r.status === 'open') await adminApi.forum.setReport(r.id, { status: 'resolved' });
      },
      'Conteúdo rejeitado.',
    );

  return (
    <div>
      <div className="ms-forum-adm__filters" role="group" aria-label="Status da denúncia">
        {REPORT_FILTERS.map((f) => (
          <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title={filter === 'open' ? 'Nenhuma denúncia aberta' : 'Nenhuma denúncia resolvida'}
          description={
            filter === 'open'
              ? 'As denúncias enviadas pelos visitantes aparecem aqui.'
              : 'Denúncias resolvidas ficam registradas nesta lista.'
          }
        />
      ) : (
        <div className="ms-forum-adm__list">
          {data.map((r) => (
            <article
              key={r.id}
              className={cx('ms-report-item', r.status === 'resolved' && 'ms-report-item--resolved')}
            >
              <div className="ms-report-item__head">
                <Tag>{reasonLabel(r.reason)}</Tag>
                <span className={`ms-adm__status ms-adm__status--${r.target.status}`}>
                  {STATUS_LABEL[r.target.status] ?? r.target.status}
                </span>
                <span className="ms-report-item__date">{formatDateTime(r.createdAt)}</span>
              </div>

              {r.details && <p className="ms-report-item__details">{r.details}</p>}

              <div className="ms-report-item__target">
                <span className="ms-report-item__kind">
                  {r.target.type === 'topic' ? 'Tópico' : 'Resposta'}
                </span>
                <span className="ms-report-item__topic">em: {r.target.topicTitle}</span>
                <p className="ms-report-item__excerpt">{r.target.excerpt}</p>
                <span className="ms-report-item__meta">por {r.target.nickname}</span>
              </div>

              {r.status === 'resolved' && r.resolvedAt && (
                <span className="ms-report-item__meta">
                  Resolvida {timeAgo(r.resolvedAt)} por {adminName(r.resolvedBy)}
                </span>
              )}

              <div className="ms-report-item__actions">
                <Link
                  to={`/forum/${r.target.topicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-btn ms-btn--outline ms-btn--sm"
                >
                  <ExternalLink /> Ver tópico
                </Link>
                {r.target.status !== 'rejected' && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy === r.id}
                    onClick={() => void rejectContent(r)}
                  >
                    <X /> Rejeitar conteúdo
                  </Button>
                )}
                {r.status === 'open' ? (
                  <Button size="sm" disabled={busy === r.id} onClick={() => void resolve(r)}>
                    <Check /> Resolver
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === r.id}
                    onClick={() => void reopen(r)}
                  >
                    <RotateCcw /> Reabrir
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
