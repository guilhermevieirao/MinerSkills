import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { awardSchema, type AwardDTO, type AwardInput } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Select, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { SEASONS_QUERY_KEY } from '../../features/seasons/useSeasons';

export function AwardsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-awards'], queryFn: adminApi.awards.list });
  const [editing, setEditing] = useState<AwardDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AwardDTO | null>(null);
  const toast = useToast();

  // As temporadas contam prêmios vinculados: também precisam ser renovadas.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-awards'] });
    void queryClient.invalidateQueries({ queryKey: ['awards'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
    void queryClient.invalidateQueries({ queryKey: SEASONS_QUERY_KEY });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.awards.remove(deleting.id);
    setDeleting(null);
    toast.success('Prêmio removido.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Prêmios & Conquistas</h1>
          <p>Reconhecimentos da equipe.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo prêmio
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum prêmio cadastrado" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Evento</th>
                <th>Ano</th>
                <th>Temporada</th>
                <th>Destaque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.event}</td>
                  <td>{a.year}</td>
                  <td>{a.seasonRef?.name ?? '—'}</td>
                  <td>{a.highlight ? <Star style={{ width: 16, color: 'var(--ms-green)' }} /> : '—'}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(a)}>
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
        <AwardForm
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
          message={`Remover o prêmio "${deleting.title}"?`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function AwardForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AwardDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AwardInput>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    event: initial?.event ?? '',
    year: initial?.year ?? new Date().getFullYear(),
    highlight: initial?.highlight ?? false,
    order: initial?.order ?? 0,
    mediaId: initial?.media?.id ?? null,
    seasonId: initial?.seasonId ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { data: seasons } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: adminApi.seasons.list,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = awardSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial) await adminApi.awards.update(initial.id, parsed.data);
      else await adminApi.awards.create(parsed.data);
      toast.success('Salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Editar prêmio' : 'Novo prêmio'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" error={errors.title}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="ms-modal__row">
          <Field label="Evento" error={errors.event}>
            <Input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
          </Field>
          <Field label="Ano" error={errors.year}>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Descrição" error={errors.description}>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Temporada" hint="Opcional: agrupa o prêmio na página Temporadas." error={errors.seasonId}>
          <Select
            value={form.seasonId ?? ''}
            onChange={(e) => setForm({ ...form, seasonId: e.target.value || null })}
          >
            <option value="">—</option>
            {(seasons ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.year})
              </option>
            ))}
          </Select>
        </Field>
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem / badge (opcional)"
        />
        <label className="ms-checkbox">
          <input
            type="checkbox"
            checked={form.highlight}
            onChange={(e) => setForm({ ...form, highlight: e.target.checked })}
          />
          Destaque (aparece em evidência)
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
