import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import {
  agendaEventSchema,
  AGENDA_KINDS,
  AGENDA_KIND_LABELS,
  type AgendaEventDTO,
  type AgendaEventInput,
  type AgendaKind,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  StatusBadge,
  Switch,
  Tag,
  Textarea,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { DateText } from '../../components/ui/DateText';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNewParam } from '../lib/useNewParam';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const kindLabel = (kind: string) => AGENDA_KIND_LABELS[kind as AgendaKind] ?? kind;

export function AgendaSection() {
  const events = useQuery({
    queryKey: ['admin-agenda'],
    queryFn: adminApi.agenda.list,
  });
  const [editing, setEditing] = useState<AgendaEventDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AgendaEventDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useNewParam(() => setCreating(true));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-agenda'] });
    void queryClient.invalidateQueries({ queryKey: ['agenda'] });
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.agenda.remove(deleting.id);
      setDeleting(null);
      toast.success('Evento removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover o evento.');
    } finally {
      setRemoving(false);
    }
  };

  const newEvent = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo evento
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Agenda"
        description="Competições, reuniões, workshops e eventos."
        actions={newEvent}
      />

      <QueryState
        query={events}
        skeleton={<ListSkeleton rows={5} lead={0} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<CalendarDays />}
            title="Nenhum evento cadastrado"
            description="Cadastre competições, reuniões e workshops para a agenda pública."
            action={newEvent}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Eventos da agenda"
            rows={list}
            rowKey={(e) => e.id}
            rowLabel={(e) => e.title}
            columns={[
              { key: 'title', header: 'Título', primary: true, render: (e) => e.title },
              {
                key: 'kind',
                header: 'Tipo',
                render: (e) => <Tag tone="neutral">{kindLabel(e.kind)}</Tag>,
              },
              {
                key: 'start',
                header: 'Início',
                render: (e) => <DateText iso={e.startsAt} format="datetime" />,
              },
              {
                key: 'published',
                header: 'Publicado',
                render: (e) => <StatusBadge status={e.published ? 'yes' : 'no'} />,
              },
            ]}
            actions={(e) => (
              <RowActions
                label={e.title}
                onEdit={() => setEditing(e)}
                onRemove={() => setDeleting(e)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editing) && (
        <AgendaForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir evento"
          message={`O evento "${deleting.title}" sai da agenda pública e do arquivo .ics e não pode ser recuperado.`}
          loading={removing}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function AgendaForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AgendaEventDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    startsAt: initial ? toLocalInput(initial.startsAt) : '',
    endsAt: initial?.endsAt ? toLocalInput(initial.endsAt) : '',
    kind: (initial?.kind as AgendaKind) ?? 'evento',
    url: initial?.url ?? '',
    published: initial?.published ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AgendaEventInput = {
      title: form.title,
      description: form.description,
      location: form.location || null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      kind: form.kind,
      url: form.url.trim() || null,
      published: form.published,
    };
    const parsed = agendaEventSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      toast.error('Verifique os campos do formulário.');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (initial) await adminApi.agenda.update(initial.id, parsed.data);
      else await adminApi.agenda.create(parsed.data);
      toast.success('Salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Editar evento' : 'Novo evento'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={save} noValidate>
        <Field label="Título" required error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Descrição" required error={errors.description}>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="ms-form-section">
          <span className="ms-form-section__title">Quando e onde</span>
          <div className="ms-modal__row">
            <Field label="Início" required error={errors.startsAt}>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </Field>
            <Field label="Término" optional error={errors.endsAt}>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </Field>
          </div>
          <div className="ms-modal__row">
            <Field label="Tipo" error={errors.kind}>
              <Select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as AgendaKind })}
              >
                {AGENDA_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {AGENDA_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Local" optional error={errors.location}>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="ms-form-section">
          <span className="ms-form-section__title">Publicação</span>
          {/* o "(opcional)" fica no próprio rótulo: a suíte e2e procura o texto inteiro */}
          <Field
            label="Link de inscrição ou detalhes (opcional)"
            hint="Vira o botão Inscrever-se na agenda pública e o link do evento no arquivo .ics."
            error={errors.url}
          >
            <Input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
          <Switch
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          >
            Publicado
          </Switch>
        </div>
      </form>
    </Modal>
  );
}
