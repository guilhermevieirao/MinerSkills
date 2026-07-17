import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  encyclopediaEntrySchema,
  MEMBER_TAGS,
  MEMBER_TAG_LABELS,
  GENERATIONS,
  GENERATION_LABELS,
  ENTRY_KINDS,
  type EncyclopediaEntryDTO,
  type EncyclopediaEntryInput,
  type MemberTag,
  type Generation,
  type EntryKind,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Select, Field, Loader, EmptyState, FilterChip } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl } from '../../lib/format';
import { ApiError } from '../../lib/api';

export function EncyclopediaSection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-encyclopedia'], queryFn: adminApi.encyclopedia.list });
  const [editing, setEditing] = useState<EncyclopediaEntryDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EncyclopediaEntryDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-encyclopedia'] });
    void queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.encyclopedia.remove(deleting.id);
    setDeleting(null);
    toast.success('Registro removido.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Enciclopédia</h1>
          <p>Membros (atuais e antigos), treinadores e robôs.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo registro
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum registro" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Função</th>
                <th>Geração</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.photo && <img className="ms-adm__thumb" src={mediaUrl(e.photo.thumbUrl ?? e.photo.url)} alt="" />}
                  </td>
                  <td>{e.name}</td>
                  <td>{e.kind === 'robot' ? 'Robô' : 'Membro'}</td>
                  <td>{e.role ?? '—'}</td>
                  <td>{e.generation ? GENERATION_LABELS[e.generation as Generation] : '—'}</td>
                  <td>
                    <span className={`ms-adm__status ms-adm__status--${e.isFormer ? 'pending' : 'approved'}`}>
                      {e.isFormer ? 'Antigo' : 'Atual'}
                    </span>
                  </td>
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
        <EntryForm
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
        <ConfirmDialog message={`Remover "${deleting.name}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function EntryForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EncyclopediaEntryDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EncyclopediaEntryInput>({
    kind: (initial?.kind as EntryKind) ?? 'member',
    name: initial?.name ?? '',
    role: initial?.role ?? '',
    generation: (initial?.generation as Generation) ?? null,
    age: initial?.age ?? null,
    season: initial?.season ?? '',
    about: initial?.about ?? '',
    quote: initial?.quote ?? '',
    isFormer: initial?.isFormer ?? false,
    order: initial?.order ?? 0,
    photoId: initial?.photo?.id ?? null,
    tags: (initial?.tags as MemberTag[]) ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const toggleTag = (tag: MemberTag) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = encyclopediaEntrySchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial) await adminApi.encyclopedia.update(initial.id, parsed.data);
      else await adminApi.encyclopedia.create(parsed.data);
      toast.success('Registro salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const isRobot = form.kind === 'robot';

  return (
    <Modal title={initial ? `Editar ${initial.name}` : 'Novo registro'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="ms-modal__row">
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EntryKind })}>
              {ENTRY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === 'robot' ? 'Robô' : 'Membro'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome" error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
        </div>

        <div className="ms-modal__row">
          <Field label="Função (rótulo do card)">
            <Input value={form.role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </Field>
          {isRobot ? (
            <Field label="Temporada">
              <Input value={form.season ?? ''} onChange={(e) => setForm({ ...form, season: e.target.value })} />
            </Field>
          ) : (
            <Field label="Idade" error={errors.age}>
              <Input
                type="number"
                value={form.age ?? ''}
                onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
          )}
        </div>

        {!isRobot && (
          <>
            <Field label="Geração">
              <Select
                value={form.generation ?? ''}
                onChange={(e) =>
                  setForm({ ...form, generation: (e.target.value || null) as Generation | null })
                }
              >
                <option value="">—</option>
                {GENERATIONS.map((g) => (
                  <option key={g} value={g}>
                    {GENERATION_LABELS[g]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="ms-field">
              <span className="ms-field__label">Tags (filtros da enciclopédia)</span>
              <div className="ms-tagpick">
                {MEMBER_TAGS.map((t) => (
                  <FilterChip key={t} active={form.tags.includes(t)} onClick={() => toggleTag(t)}>
                    {MEMBER_TAG_LABELS[t]}
                  </FilterChip>
                ))}
              </div>
            </div>
          </>
        )}

        <Field label="Sobre" hint="Separe parágrafos com uma linha em branco." error={errors.about}>
          <Textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        </Field>

        <Field label="Citação (opcional)">
          <Input value={form.quote ?? ''} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </Field>

        <MediaPicker
          value={form.photoId ?? null}
          preview={initial?.photo}
          onChange={(m) => setForm({ ...form, photoId: m?.id ?? null })}
          label="Foto"
        />

        <div className="ms-modal__row">
          <Field label="Ordem">
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label className="ms-checkbox">
              <input
                type="checkbox"
                checked={form.isFormer}
                onChange={(e) => setForm({ ...form, isFormer: e.target.checked })}
              />
              {isRobot ? 'Robô antigo' : 'Ex-membro'}
            </label>
          </div>
        </div>

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
