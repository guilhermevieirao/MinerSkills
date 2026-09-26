import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  X,
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
import {
  Button,
  ChipRow,
  EmptyState,
  FilterChip,
  IconButton,
  LinkButton,
  StatusBadge,
  Tag,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { DateText } from '../../components/ui/DateText';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { cx } from '../../lib/format';
import './ForumSection.scss';

type Tab = 'queue' | 'all' | 'reports';
type Moderation = 'approved' | 'rejected';

const TABS: { value: Tab; label: string; icon: typeof Flag }[] = [
  { value: 'queue', label: 'Fila de moderação', icon: ShieldCheck },
  { value: 'all', label: 'Todos os tópicos', icon: MessageSquare },
  { value: 'reports', label: 'Denúncias', icon: Flag },
];

const REPORT_FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'resolved', label: 'Resolvidas' },
];

/** Corpo acima deste tamanho (ou com muitas linhas) ganha o "Ver completo". */
const LONG_BODY = 240;

function reasonLabel(reason: string): string {
  return REPORT_REASON_LABELS[reason as ReportReason] ?? reason;
}

function isLong(body: string): boolean {
  return body.length > LONG_BODY || body.split('\n').length > 3;
}

/** Leva ao fórum público (resolve os vazios: nada para moderar ou denunciado). */
const openForum = (
  <LinkButton to="/forum" external variant="outline">
    <ExternalLink aria-hidden /> Abrir o fórum
  </LinkButton>
);

/**
 * Nome do admin a partir do id gravado em `moderatedBy`/`resolvedBy`. A lista
 * de administradores é a mesma de /admin/administradores (mesma query key);
 * um id sem correspondência (admin excluído) vira "—".
 */
function useAdminName(): (id: string | null | undefined) => string {
  const { data } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: adminApi.admins.list,
  });
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
      <AdminPageHeader
        title="Fórum"
        description="Modere tópicos e respostas enviados pela comunidade."
      />

      {/* botões com aria-pressed (não role=tab): a suíte e2e os clica por getByRole('button') */}
      <div className="ms-forum-adm__tabs" role="group" aria-label="Visão do fórum">
        {TABS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={tab === value ? 'primary' : 'outline'}
            size="sm"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            <Icon aria-hidden /> {label}
            {value === 'reports' && openCount > 0 && (
              <>
                <span className="ms-forum-adm__badge" aria-hidden>
                  {openCount}
                </span>
                <span className="ms-visually-hidden">
                  ({openCount} {openCount === 1 ? 'aberta' : 'abertas'})
                </span>
              </>
            )}
          </Button>
        ))}
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
  const queue = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: adminApi.forum.moderation,
  });
  // item em andamento: `${id}:${status}` (desabilita o par, gira só o clicado)
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const moderate = async (
    kind: 'topic' | 'reply',
    id: string,
    status: Moderation,
  ): Promise<void> => {
    setBusy(`${id}:${status}`);
    try {
      if (kind === 'topic') {
        await adminApi.forum.setTopic(id, status);
        toast.success(status === 'approved' ? 'Tópico aprovado.' : 'Tópico rejeitado.');
      } else {
        await adminApi.forum.setReply(id, status);
        toast.success(
          status === 'approved' ? 'Resposta aprovada.' : 'Resposta rejeitada.',
        );
      }
      refreshForum();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao moderar.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <QueryState
      query={queue}
      skeleton={<ListSkeleton rows={3} lead={0} />}
      isEmpty={(d) => d.topics.length === 0 && d.replies.length === 0}
      empty={
        <EmptyState
          icon={<ShieldCheck />}
          title="Fila vazia"
          description="Nada aguardando moderação. Tópicos e respostas novos aparecem aqui."
          action={openForum}
        />
      }
    >
      {(data) => (
        <div className="ms-forum-adm__groups">
          {data.topics.length > 0 && (
            <section className="ms-forum-adm__group" aria-labelledby="ms-forum-topics">
              <h2 id="ms-forum-topics" className="ms-forum-adm__subtitle">
                Tópicos pendentes ({data.topics.length})
              </h2>
              <ul className="ms-forum-adm__list" role="list">
                {data.topics.map((t) => (
                  <li key={t.id}>
                    <ModerationItem
                      title={t.title}
                      body={t.body}
                      nickname={t.nickname}
                      createdAt={t.createdAt}
                      busy={busy}
                      id={t.id}
                      onModerate={(status) => void moderate('topic', t.id, status)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.replies.length > 0 && (
            <section className="ms-forum-adm__group" aria-labelledby="ms-forum-replies">
              <h2 id="ms-forum-replies" className="ms-forum-adm__subtitle">
                Respostas pendentes ({data.replies.length})
              </h2>
              <ul className="ms-forum-adm__list" role="list">
                {data.replies.map((r) => (
                  <li key={r.id}>
                    <ModerationItem
                      context={r.topicTitle}
                      body={r.body}
                      nickname={r.nickname}
                      createdAt={r.createdAt}
                      busy={busy}
                      id={r.id}
                      onModerate={(status) => void moderate('reply', r.id, status)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </QueryState>
  );
}

/**
 * Item da fila: título (tópico) ou "em: tópico" (resposta), corpo em até 3
 * linhas com "Ver completo", autoria e as ações Aprovar/Rejeitar em slots
 * fixos. Os nomes acessíveis começam pelo verbo ("Aprovar {título}").
 */
function ModerationItem({
  id,
  title,
  context,
  body,
  nickname,
  createdAt,
  busy,
  onModerate,
}: {
  id: string;
  /** Tópico: o título. */
  title?: string;
  /** Resposta: o título do tópico em que ela entra. */
  context?: string;
  body: string;
  nickname: string;
  createdAt: string;
  busy: string | null;
  onModerate: (status: Moderation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = `ms-mod-body-${id}`;
  const subject = title ?? `resposta de ${nickname}`;
  const pending = busy?.startsWith(`${id}:`) ?? false;

  return (
    <article className={cx('ms-mod-item', expanded && 'ms-mod-item--expanded')}>
      <div className="ms-mod-item__body">
        {title ? (
          <strong>{title}</strong>
        ) : (
          <span className="ms-mod-item__topic">em: {context}</span>
        )}
        <p id={bodyId}>{body}</p>
        <span className="ms-mod-item__meta">
          por {nickname} · <DateText iso={createdAt} format="relative" meta={false} />
        </span>
        {isLong(body) && (
          <button
            type="button"
            className="ms-mod-item__more"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Ver menos' : 'Ver completo'}
          </button>
        )}
      </div>
      <div className="ms-mod-item__actions">
        <Button
          size="sm"
          variant="danger"
          aria-label={`Rejeitar ${subject}`}
          disabled={pending}
          loading={busy === `${id}:rejected`}
          onClick={() => onModerate('rejected')}
        >
          <X aria-hidden /> Rejeitar
        </Button>
        <Button
          size="sm"
          aria-label={`Aprovar ${subject}`}
          disabled={pending}
          loading={busy === `${id}:approved`}
          onClick={() => onModerate('approved')}
        >
          <Check aria-hidden /> Aprovar
        </Button>
      </div>
    </article>
  );
}

function AllTopicsTab() {
  const topics = useQuery({
    queryKey: ['admin-forum-topics'],
    queryFn: adminApi.forum.allTopics,
  });
  const adminName = useAdminName();
  const [deleting, setDeleting] = useState<ForumTopicDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.forum.removeTopic(deleting.id);
      setDeleting(null);
      toast.success('Tópico removido.');
      refreshForum();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover o tópico.');
    } finally {
      setRemoving(false);
    }
  };

  const setStatus = async (id: string, status: Moderation) => {
    setBusy(id);
    try {
      await adminApi.forum.setTopic(id, status);
      toast.success('Status atualizado.');
      refreshForum();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar o status.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <QueryState
        query={topics}
        skeleton={<ListSkeleton rows={5} lead={0} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<MessageSquare />}
            title="Nenhum tópico"
            description="Os tópicos criados no fórum público aparecem aqui."
            action={openForum}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Tópicos do fórum"
            rows={list}
            rowKey={(t) => t.id}
            rowLabel={(t) => t.title}
            columns={[
              { key: 'title', header: 'Título', primary: true, render: (t) => t.title },
              { key: 'author', header: 'Autor', render: (t) => t.nickname },
              {
                key: 'status',
                header: 'Status',
                render: (t) => <StatusBadge status={t.status} />,
              },
              {
                key: 'moderatedBy',
                header: 'Moderado por',
                hideOnMobile: true,
                render: (t) => adminName(t.moderatedBy),
              },
              {
                key: 'replies',
                header: 'Respostas',
                align: 'end',
                render: (t) => t.replyCount,
              },
            ]}
            actions={(t) => (
              <RowActions
                label={t.title}
                onRemove={() => setDeleting(t)}
                // slots fixos: o botão do status atual fica desabilitado, não some
                extra={
                  <>
                    <IconButton
                      size="sm"
                      aria-label={`Aprovar ${t.title}`}
                      title="Aprovar"
                      disabled={t.status === 'approved' || busy === t.id}
                      onClick={() => void setStatus(t.id, 'approved')}
                    >
                      <Check aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      aria-label={`Rejeitar ${t.title}`}
                      title="Rejeitar"
                      disabled={t.status === 'rejected' || busy === t.id}
                      onClick={() => void setStatus(t.id, 'rejected')}
                    >
                      <X aria-hidden />
                    </IconButton>
                  </>
                }
              />
            )}
          />
        )}
      </QueryState>

      {deleting && (
        <ConfirmDialog
          title="Excluir tópico"
          message={`O tópico "${deleting.title}" e todas as respostas saem do fórum e não podem ser recuperados.`}
          loading={removing}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

/**
 * Denúncias enviadas pelos visitantes. "Rejeitar conteúdo" tira o alvo do ar
 * (status `rejected`) e já resolve a denúncia; "Resolver" só a fecha (o
 * conteúdo continua como está).
 */
function ReportsTab() {
  const [filter, setFilter] = useState<ReportStatus>('open');
  const reports = useQuery({
    queryKey: ['admin-forum-reports', filter],
    queryFn: () => adminApi.forum.reports(filter),
  });
  const adminName = useAdminName();
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const run = async (
    report: ForumReportDTO,
    action: () => Promise<unknown>,
    done: string,
  ) => {
    setBusy(report.id);
    try {
      await action();
      toast.success(done);
      refreshForum();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Erro ao atualizar a denúncia.',
      );
    } finally {
      setBusy(null);
    }
  };

  const resolve = (r: ForumReportDTO) =>
    run(
      r,
      () => adminApi.forum.setReport(r.id, { status: 'resolved' }),
      'Denúncia resolvida.',
    );

  const reopen = (r: ForumReportDTO) =>
    run(
      r,
      () => adminApi.forum.setReport(r.id, { status: 'open' }),
      'Denúncia reaberta.',
    );

  const rejectContent = (r: ForumReportDTO) =>
    run(
      r,
      async () => {
        if (r.target.type === 'topic')
          await adminApi.forum.setTopic(r.target.id, 'rejected');
        else await adminApi.forum.setReply(r.target.id, 'rejected');
        if (r.status === 'open')
          await adminApi.forum.setReport(r.id, { status: 'resolved' });
      },
      'Conteúdo rejeitado.',
    );

  return (
    <div>
      <div className="ms-toolbar">
        <ChipRow label="Status da denúncia">
          {REPORT_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </ChipRow>
      </div>

      <QueryState
        query={reports}
        skeleton={<ListSkeleton rows={3} lead={0} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Flag />}
            title={
              filter === 'open' ? 'Nenhuma denúncia aberta' : 'Nenhuma denúncia resolvida'
            }
            description={
              filter === 'open'
                ? 'As denúncias enviadas pelos visitantes aparecem aqui.'
                : 'Denúncias resolvidas ficam registradas nesta lista.'
            }
            action={openForum}
          />
        }
      >
        {(list) => (
          <ul className="ms-forum-adm__list" role="list">
            {list.map((r) => (
              <li key={r.id}>
                <article
                  className={cx(
                    'ms-report-item',
                    r.status === 'resolved' && 'ms-report-item--resolved',
                  )}
                >
                  <div className="ms-report-item__head">
                    <Tag tone="neutral">{reasonLabel(r.reason)}</Tag>
                    <StatusBadge status={r.status} />
                    <DateText
                      iso={r.createdAt}
                      format="datetime"
                      className="ms-report-item__date"
                    />
                  </div>

                  {r.details && <p className="ms-report-item__details">{r.details}</p>}

                  <div className="ms-report-item__target">
                    <div className="ms-report-item__target-head">
                      <span className="ms-report-item__kind">
                        {r.target.type === 'topic' ? 'Tópico' : 'Resposta'}
                      </span>
                      <StatusBadge status={r.target.status} />
                    </div>
                    <span className="ms-report-item__topic">
                      em: {r.target.topicTitle}
                    </span>
                    <p className="ms-report-item__excerpt">{r.target.excerpt}</p>
                    <span className="ms-report-item__meta">por {r.target.nickname}</span>
                  </div>

                  {r.status === 'resolved' && r.resolvedAt && (
                    <span className="ms-report-item__meta">
                      Resolvida{' '}
                      <DateText iso={r.resolvedAt} format="relative" meta={false} /> por{' '}
                      {adminName(r.resolvedBy)}
                    </span>
                  )}

                  <div className="ms-report-item__actions">
                    <LinkButton
                      to={`/forum/${r.target.topicId}`}
                      external
                      variant="ghost"
                      size="sm"
                      className="ms-report-item__view"
                    >
                      <ExternalLink aria-hidden /> Ver tópico
                    </LinkButton>
                    {r.target.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy === r.id}
                        onClick={() => void rejectContent(r)}
                      >
                        <X aria-hidden /> Rejeitar conteúdo
                      </Button>
                    )}
                    {r.status === 'open' ? (
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() => void resolve(r)}
                      >
                        <Check aria-hidden /> Resolver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => void reopen(r)}
                      >
                        <RotateCcw aria-hidden /> Reabrir
                      </Button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
