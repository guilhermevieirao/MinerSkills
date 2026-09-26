import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Archive, Inbox, MailOpen, Reply, Trash2 } from 'lucide-react';
import {
  CONTACT_KIND_LABELS,
  CONTACT_STATUS_LABELS,
  type ContactKind,
  type ContactMessageDTO,
  type ContactStatus,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  ChipRow,
  EmptyState,
  FilterChip,
  LinkButton,
  StatusBadge,
  Tag,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { DateText } from '../../components/ui/DateText';
import { Pagination } from '../../components/ui/Pagination';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { cx } from '../../lib/format';
import './InboxSection.scss';

type StatusFilter = ContactStatus | 'all';
type KindFilter = ContactKind | 'all';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'new', label: 'Novas' },
  { value: 'read', label: 'Lidas' },
  { value: 'archived', label: 'Arquivadas' },
  { value: 'all', label: 'Todas' },
];

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'inscricao', label: 'Inscrições' },
  { value: 'contato', label: 'Contatos' },
  { value: 'all', label: 'Todos' },
];

const PER_PAGE = 20;
const PREVIEW_LENGTH = 140;

/** Lista da caixa de entrada e o badge da sidebar (contagem de novas) mudam juntos. */
function refreshInbox() {
  void queryClient.invalidateQueries({ queryKey: ['admin-contact'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
}

function statusLabel(status: string): string {
  return CONTACT_STATUS_LABELS[status as ContactStatus] ?? status;
}

function kindLabel(kind: string): string {
  return CONTACT_KIND_LABELS[kind as ContactKind] ?? kind;
}

function preview(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > PREVIEW_LENGTH
    ? `${oneLine.slice(0, PREVIEW_LENGTH)}…`
    : oneLine;
}

export function InboxSection() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactMessageDTO | null>(null);

  const params = {
    page,
    perPage: PER_PAGE,
    status: status === 'all' ? undefined : status,
    kind: kind === 'all' ? undefined : kind,
  };
  const messages = useQuery({
    queryKey: ['admin-contact', params],
    queryFn: () => adminApi.contact.list(params),
    placeholderData: keepPreviousData,
  });
  const data = messages.data;
  const filtered = status !== 'all' || kind !== 'all';

  // Excluir a última mensagem de uma página deixa `page` além do fim: a API
  // responde vazio (sem os botões de paginação) — volta para a última página.
  useEffect(() => {
    const last = Math.max(1, data?.totalPages ?? 1);
    if (data && page > last) setPage(last);
  }, [data, page]);

  /** Abrir uma mensagem nova já a marca como lida (o badge da sidebar diminui). */
  const open = (m: ContactMessageDTO) => {
    setSelected(m);
    if (m.status !== 'new') return;
    adminApi.contact
      .setStatus(m.id, { status: 'read' })
      .then((updated) => {
        setSelected((current) => (current?.id === updated.id ? updated : current));
        refreshInbox();
      })
      .catch(() => {
        // fica como nova; o admin pode tentar de novo pelos botões do modal
      });
  };

  const clearFilters = () => {
    setStatus('all');
    setKind('all');
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Mensagens"
        description="Inscrições e contatos enviados pelo site."
      />

      <div className="ms-toolbar">
        <ChipRow label="Status">
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow label="Tipo">
          {KIND_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={kind === f.value}
              onClick={() => {
                setKind(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </FilterChip>
          ))}
        </ChipRow>
        {data && data.total > 0 && (
          <div className="ms-toolbar__end">
            <span className="ms-toolbar__count" aria-live="polite">
              {data.total} {data.total === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </div>
        )}
      </div>

      <QueryState
        query={messages}
        skeleton={<ListSkeleton rows={5} lead={0} />}
        isEmpty={(d) => d.items.length === 0}
        empty={
          filtered ? (
            <EmptyState
              icon={<Inbox />}
              title="Nenhuma mensagem"
              description="Nenhuma mensagem com esses filtros."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Inbox />}
              title="Nenhuma mensagem"
              description="As mensagens enviadas pelas páginas Contato e Como Entrar aparecem aqui."
              action={
                <LinkButton to="/contato" external variant="outline">
                  Abrir a página de contato
                </LinkButton>
              }
            />
          )
        }
      >
        {(d) => (
          <ul className="ms-inbox__list" role="list">
            {d.items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cx(
                    'ms-inbox__item',
                    m.status === 'new' && 'ms-inbox__item--new',
                  )}
                  aria-label={`${m.name}, ${kindLabel(m.kind).toLowerCase()}, ${statusLabel(m.status).toLowerCase()}`}
                  onClick={() => open(m)}
                >
                  <span className="ms-inbox__badges">
                    <span className="ms-inbox__status">
                      <StatusBadge status={m.status}>{statusLabel(m.status)}</StatusBadge>
                    </span>
                    <Tag tone="neutral">{kindLabel(m.kind)}</Tag>
                  </span>
                  <span className="ms-inbox__who">
                    <strong>{m.name}</strong>
                    <span>{m.email}</span>
                  </span>
                  <DateText
                    iso={m.createdAt}
                    format="relative"
                    className="ms-inbox__date"
                  />
                  <span className="ms-inbox__preview">{preview(m.message)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onChange={setPage}
          loading={messages.isPlaceholderData}
        />
      )}

      {selected && (
        <MessageDetail
          message={selected}
          onChange={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MessageDetail({
  message,
  onChange,
  onClose,
}: {
  message: ContactMessageDTO;
  onChange: (m: ContactMessageDTO) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const setStatus = async (status: ContactStatus, done: string) => {
    setBusy(true);
    try {
      const updated = await adminApi.contact.setStatus(message.id, { status });
      onChange(updated);
      toast.success(done);
      refreshInbox();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.contact.remove(message.id);
      toast.success('Mensagem excluída.');
      refreshInbox();
      setConfirming(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Tipo', value: kindLabel(message.kind) },
    {
      label: 'Status',
      value: (
        <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
      ),
    },
    { label: 'E-mail', value: <a href={`mailto:${message.email}`}>{message.email}</a> },
    { label: 'Telefone', value: message.phone ?? '—' },
    ...(message.kind === 'inscricao'
      ? [
          { label: 'Escola', value: message.school ?? '—' },
          { label: 'Série/ano', value: message.grade ?? '—' },
        ]
      : []),
    {
      label: 'Enviada em',
      value: <DateText iso={message.createdAt} format="datetime" meta={false} />,
    },
    {
      label: 'Lida em',
      value: message.readAt ? (
        <DateText iso={message.readAt} format="datetime" meta={false} />
      ) : (
        '—'
      ),
    },
  ];

  return (
    <>
      <Modal
        title={message.name}
        onClose={onClose}
        footer={
          <>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden /> Excluir
            </Button>
            {message.status !== 'new' && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void setStatus('new', 'Mensagem marcada como nova.')}
              >
                <MailOpen aria-hidden /> Marcar como nova
              </Button>
            )}
            {message.status !== 'archived' && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setStatus('archived', 'Mensagem arquivada.')}
              >
                <Archive aria-hidden /> Arquivar
              </Button>
            )}
            <LinkButton href={`mailto:${message.email}`}>
              <Reply aria-hidden /> Responder
            </LinkButton>
          </>
        }
      >
        <div className="ms-inbox__detail">
          <dl className="ms-inbox__facts">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          <p className="ms-inbox__message">{message.message}</p>
        </div>
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="Excluir mensagem"
          message={`A mensagem de "${message.name}" sai da caixa de entrada e não pode ser recuperada.`}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
          loading={busy}
        />
      )}
    </>
  );
}
