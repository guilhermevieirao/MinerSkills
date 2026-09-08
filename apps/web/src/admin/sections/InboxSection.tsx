import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Archive, Inbox, MailOpen, Trash2 } from 'lucide-react';
import {
  CONTACT_KIND_LABELS,
  CONTACT_STATUS_LABELS,
  type ContactKind,
  type ContactMessageDTO,
  type ContactStatus,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, FilterChip, Loader, Tag } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { cx, formatDateTime } from '../../lib/format';
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
  const { data, isLoading } = useQuery({
    queryKey: ['admin-contact', params],
    queryFn: () => adminApi.contact.list(params),
    placeholderData: keepPreviousData,
  });

  // Excluir a última mensagem de uma página deixa `page` além do fim: a API
  // responde vazio (sem os botões de paginação) — volta para a última página.
  useEffect(() => {
    if (data && page > data.totalPages) setPage(data.totalPages);
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

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Mensagens</h1>
          <p>Inscrições e contatos enviados pelo site.</p>
        </div>
      </div>

      <div className="ms-inbox__toolbar">
        <div className="ms-inbox__filters" role="group" aria-label="Status">
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
        </div>
        <div className="ms-inbox__filters" role="group" aria-label="Tipo">
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
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Nenhuma mensagem"
          description={
            status === 'all' && kind === 'all'
              ? 'As mensagens enviadas pelas páginas Contato e Como Entrar aparecem aqui.'
              : 'Nenhuma mensagem com esses filtros.'
          }
        />
      ) : (
        <>
          <p className="ms-inbox__count">
            {data.total} {data.total === 1 ? 'mensagem' : 'mensagens'}
          </p>
          <div className="ms-inbox__list">
            {data.items.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cx(
                  'ms-inbox__item',
                  m.status === 'new' && 'ms-inbox__item--new',
                )}
                onClick={() => open(m)}
              >
                <span className="ms-inbox__badges">
                  <span
                    className={cx('ms-inbox__status', `ms-inbox__status--${m.status}`)}
                  >
                    {statusLabel(m.status)}
                  </span>
                  <Tag variant="muted">{kindLabel(m.kind)}</Tag>
                </span>
                <span className="ms-inbox__who">
                  <strong>{m.name}</strong>
                  <span>{m.email}</span>
                </span>
                <span className="ms-inbox__date">{formatDateTime(m.createdAt)}</span>
                <span className="ms-inbox__preview">{preview(m.message)}</span>
              </button>
            ))}
          </div>
          {data.totalPages > 1 && (
            <nav className="ms-inbox__pagination" aria-label="Paginação">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                Próxima
              </Button>
            </nav>
          )}
        </>
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
    { label: 'Status', value: statusLabel(message.status) },
    { label: 'E-mail', value: <a href={`mailto:${message.email}`}>{message.email}</a> },
    { label: 'Telefone', value: message.phone ?? '—' },
    ...(message.kind === 'inscricao'
      ? [
          { label: 'Escola', value: message.school ?? '—' },
          { label: 'Série/ano', value: message.grade ?? '—' },
        ]
      : []),
    { label: 'Enviada em', value: formatDateTime(message.createdAt) },
    { label: 'Lida em', value: message.readAt ? formatDateTime(message.readAt) : '—' },
  ];

  return (
    <>
      <Modal title={message.name} onClose={onClose}>
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

          <div className="ms-inbox__actions">
            {message.status !== 'archived' && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setStatus('archived', 'Mensagem arquivada.')}
              >
                <Archive /> Arquivar
              </Button>
            )}
            {message.status !== 'new' && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setStatus('new', 'Mensagem marcada como nova.')}
              >
                <MailOpen /> Marcar como nova
              </Button>
            )}
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Trash2 /> Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {confirming && (
        <ConfirmDialog
          message={`Excluir a mensagem de "${message.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
          loading={busy}
        />
      )}
    </>
  );
}
