import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  agendaEventSchema,
  AGENDA_KINDS,
  AGENDA_KIND_LABELS,
  type AgendaEventDTO,
  type AgendaEventInput,
  type AgendaKind,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Select, Textarea, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { formatDateTime } from '../../lib/format';
import { ApiError } from '../../lib/api';

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function AgendaSection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-agenda'], queryFn: adminApi.agenda.list });
  const [editing, setEditing] = useState<AgendaEventDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AgendaEventDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-agenda'] });
    void queryClient.invalidateQueries({ queryKey: ['agenda'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.agenda.remove(deleting.id);
    setDeleting(null);
    toast.success('Evento removido.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Agenda</h1>
          <p>Competições, reuniões, workshops e eventos.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo evento
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum evento cadastrado" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Início</th>
                <th>Publicado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{AGENDA_KIND_LABELS[e.kind as AgendaKind] ?? e.kind}</td>
                  <td>{formatDateTime(e.startsAt)}</td>
                  <td>{e.published ? 'Sim' : 'Não'}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(e)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          message={`Remover o evento "${deleting.title}"?`}
          onConfirm={remove}
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
    published: initial?.published ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
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
      published: form.published,
    };
    const parsed = agendaEventSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
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
    <Modal title={initial ? 'Editar evento' : 'Novo evento'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" error={errors.title}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Descrição" error={errors.description}>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="ms-modal__row">
          <Field label="Início" error={errors.startsAt}>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </Field>
          <Field label="Término (opcional)" error={errors.endsAt}>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </Field>
        </div>
        <div className="ms-modal__row">
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AgendaKind })}>
              {AGENDA_KINDS.map((k) => (
                <option key={k} value={k}>
                  {AGENDA_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Local">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
        </div>
        <label className="ms-checkbox">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Publicado
        </label>
        <div className="ms-modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
