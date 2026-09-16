import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  socialLinkSchema,
  SOCIAL_PLATFORMS,
  type SocialLinkDTO,
  type SocialLinkInput,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Select, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';

export function SocialSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-social'],
    queryFn: adminApi.social.list,
  });
  const [editing, setEditing] = useState<SocialLinkDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SocialLinkDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-social'] });
    void queryClient.invalidateQueries({ queryKey: ['social-links'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.social.remove(deleting.id);
    setDeleting(null);
    toast.success('Rede removida.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Redes Sociais</h1>
          <p>Links exibidos no rodapé e na página "Como Entrar".</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nova rede
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhuma rede cadastrada" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Rótulo</th>
                <th>URL</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} data-row={l.label}>
                  <td>{l.platform}</td>
                  <td>{l.label}</td>
                  <td
                    style={{
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {l.url}
                  </td>
                  <td>{l.active ? 'Sim' : 'Não'}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${l.label}`}
                        onClick={() => setEditing(l)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Excluir ${l.label}`}
                        onClick={() => setDeleting(l)}
                      >
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
        <SocialForm
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
          message={`Remover a rede "${deleting.label}"?`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function SocialForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: SocialLinkDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SocialLinkInput>({
    platform: (initial?.platform as SocialLinkInput['platform']) ?? 'instagram',
    label: initial?.label ?? '',
    url: initial?.url ?? '',
    order: initial?.order ?? 0,
    active: initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = socialLinkSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial) await adminApi.social.update(initial.id, parsed.data);
      else await adminApi.social.create(parsed.data);
      toast.success('Salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Editar rede' : 'Nova rede'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="ms-modal__row">
          <Field label="Plataforma">
            <Select
              value={form.platform}
              onChange={(e) =>
                setForm({
                  ...form,
                  platform: e.target.value as SocialLinkInput['platform'],
                })
              }
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem">
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Rótulo" error={errors.label}>
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </Field>
        <Field label="URL" error={errors.url}>
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </Field>
        <label className="ms-checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Ativo
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
