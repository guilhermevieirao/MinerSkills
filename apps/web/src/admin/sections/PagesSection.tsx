import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  contentBlockSchema,
  timelineItemSchema,
  EDITABLE_PAGES,
  type ContentBlockDTO,
  type ContentBlockInput,
  type TimelineItemDTO,
  type TimelineItemInput,
  type EditablePage,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Select, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';

const PAGE_LABELS: Record<EditablePage, string> = {
  landing: 'Landing (Início)',
  historia: 'História',
  'como-entrar': 'Como Entrar',
};

export function PagesSection() {
  const [tab, setTab] = useState<'blocks' | 'timeline'>('blocks');
  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Páginas & Timeline</h1>
          <p>Edite os textos das páginas institucionais e a linha do tempo.</p>
        </div>
      </div>
      <div className="ms-enc__filters" style={{ marginBottom: 'var(--ms-space-5)' }}>
        <Button variant={tab === 'blocks' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('blocks')}>
          Blocos de conteúdo
        </Button>
        <Button variant={tab === 'timeline' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('timeline')}>
          Timeline (História)
        </Button>
      </div>
      {tab === 'blocks' ? <BlocksTab /> : <TimelineTab />}
    </div>
  );
}

// ─── Blocos ─────────────────────────────────────────────────
function BlocksTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-blocks'], queryFn: () => adminApi.contentBlocks.list() });
  const [editing, setEditing] = useState<ContentBlockDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ContentBlockDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-blocks'] });
    for (const p of EDITABLE_PAGES) void queryClient.invalidateQueries({ queryKey: ['pages', p] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.contentBlocks.remove(deleting.id);
    setDeleting(null);
    toast.success('Bloco removido.');
    refresh();
  };

  if (isLoading) return <Loader />;

  const grouped = EDITABLE_PAGES.map((page) => ({
    page,
    blocks: (data ?? []).filter((b) => b.page === page).sort((a, b) => a.order - b.order),
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ms-space-4)' }}>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo bloco
        </Button>
      </div>
      {grouped.map((g) => (
        <div key={g.page} style={{ marginBottom: 'var(--ms-space-6)' }}>
          <h2 style={{ fontSize: 'var(--ms-text-lg)', marginBottom: 'var(--ms-space-3)' }}>
            {PAGE_LABELS[g.page]}
          </h2>
          {g.blocks.length === 0 ? (
            <EmptyState title="Sem blocos" />
          ) : (
            <div className="ms-adm__table-wrap">
              <table className="ms-adm__table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Título</th>
                    <th>Ordem</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {g.blocks.map((b) => (
                    <tr key={b.id}>
                      <td><code>{b.key}</code></td>
                      <td>{b.title ?? <em style={{ color: 'var(--ms-text-faint)' }}>(sem título)</em>}</td>
                      <td>{b.order}</td>
                      <td>
                        <div className="ms-adm__row-actions">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                            <Pencil />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleting(b)}>
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
        </div>
      ))}

      {(creating || editing) && (
        <BlockForm
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
        <ConfirmDialog message={`Remover o bloco "${deleting.key}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function BlockForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: ContentBlockDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ContentBlockInput>({
    page: (initial?.page as EditablePage) ?? 'landing',
    key: initial?.key ?? '',
    order: initial?.order ?? 0,
    title: initial?.title ?? '',
    subtitle: initial?.subtitle ?? '',
    body: initial?.body ?? '',
    mediaId: initial?.media?.id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contentBlockSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial) await adminApi.contentBlocks.update(initial.id, parsed.data);
      else await adminApi.contentBlocks.create(parsed.data);
      toast.success('Salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? `Editar bloco "${initial.key}"` : 'Novo bloco'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="ms-modal__row">
          <Field label="Página">
            <Select
              value={form.page}
              disabled={!!initial}
              onChange={(e) => setForm({ ...form, page: e.target.value as EditablePage })}
            >
              {EDITABLE_PAGES.map((p) => (
                <option key={p} value={p}>
                  {PAGE_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Key (identificador)" error={errors.key}>
            <Input value={form.key} disabled={!!initial} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          </Field>
        </div>
        <Field label="Título">
          <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Subtítulo">
          <Input value={form.subtitle ?? ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </Field>
        <Field label="Corpo (texto)">
          <Textarea value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        <div className="ms-modal__row">
          <Field label="Ordem">
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem (opcional)"
        />
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

// ─── Timeline ───────────────────────────────────────────────
function TimelineTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-timeline'], queryFn: adminApi.timeline.list });
  const [editing, setEditing] = useState<TimelineItemDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TimelineItemDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-timeline'] });
    void queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.timeline.remove(deleting.id);
    setDeleting(null);
    toast.success('Marco removido.');
    refresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ms-space-4)' }}>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo marco
        </Button>
      </div>
      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sem marcos na timeline" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Título</th>
                <th>Ordem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td>{t.year}</td>
                  <td>{t.title}</td>
                  <td>{t.order}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(t)}>
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
        <TimelineForm
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
        <ConfirmDialog message={`Remover o marco "${deleting.title}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function TimelineForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: TimelineItemDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TimelineItemInput>({
    year: initial?.year ?? new Date().getFullYear(),
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    order: initial?.order ?? 0,
    mediaId: initial?.media?.id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = timelineItemSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (initial) await adminApi.timeline.update(initial.id, parsed.data);
      else await adminApi.timeline.create(parsed.data);
      toast.success('Salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Editar marco' : 'Novo marco'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="ms-modal__row">
          <Field label="Ano" error={errors.year}>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ordem">
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Título" error={errors.title}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Descrição" error={errors.description}>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem (opcional)"
        />
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
