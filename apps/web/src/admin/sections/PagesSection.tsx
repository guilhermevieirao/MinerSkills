import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, LayoutTemplate, Plus } from 'lucide-react';
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
import {
  Button,
  EmptyState,
  Field,
  FieldGroup,
  Input,
  Select,
  Textarea,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { Thumb } from '../../components/ui/tiles';
import { Tabs } from '../../components/ui/Tabs';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import './PagesSection.scss';

const PAGE_LABELS: Record<EditablePage, string> = {
  landing: 'Landing (Início)',
  historia: 'História',
  'como-entrar': 'Como Entrar',
};

type PagesTab = 'blocks' | 'timeline';

const TABS = [
  { key: 'blocks' as const, label: 'Blocos de conteúdo', icon: LayoutTemplate },
  { key: 'timeline' as const, label: 'Timeline (História)', icon: History },
];

/** Rótulo de um bloco nas listas, nos botões da linha e na confirmação. */
const blockLabel = (b: ContentBlockDTO) => b.title ?? b.key;

export function PagesSection() {
  const [tab, setTab] = useState<PagesTab>('blocks');
  // a ação primária mora no cabeçalho; a aba ativa decide o que ela cria
  const [creating, setCreating] = useState(false);

  const newItem =
    tab === 'blocks' ? (
      <Button onClick={() => setCreating(true)}>
        <Plus aria-hidden /> Novo bloco
      </Button>
    ) : (
      <Button onClick={() => setCreating(true)}>
        <Plus aria-hidden /> Novo marco
      </Button>
    );

  return (
    <div>
      <AdminPageHeader
        title="Páginas & Timeline"
        description="Edite os textos das páginas institucionais e a linha do tempo."
        actions={newItem}
      />

      <Tabs
        items={TABS}
        value={tab}
        onChange={(t) => {
          setCreating(false);
          setTab(t);
        }}
        label="Conteúdo editável"
      >
        {tab === 'blocks' ? (
          <BlocksTab
            creating={creating}
            onCreatingChange={setCreating}
            newAction={newItem}
          />
        ) : (
          <TimelineTab
            creating={creating}
            onCreatingChange={setCreating}
            newAction={newItem}
          />
        )}
      </Tabs>
    </div>
  );
}

// ─── Blocos ─────────────────────────────────────────────────
function BlocksTab({
  creating,
  onCreatingChange,
  newAction,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
  newAction: React.ReactNode;
}) {
  const blocks = useQuery({
    queryKey: ['admin-blocks'],
    queryFn: () => adminApi.contentBlocks.list(),
  });
  const [editing, setEditing] = useState<ContentBlockDTO | null>(null);
  // "Adicionar bloco" no vazio de uma página já abre o formulário nela
  const [newFor, setNewFor] = useState<EditablePage | null>(null);
  const [deleting, setDeleting] = useState<ContentBlockDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-blocks'] });
    for (const p of EDITABLE_PAGES)
      void queryClient.invalidateQueries({ queryKey: ['pages', p] });
  };

  const closeForm = () => {
    onCreatingChange(false);
    setNewFor(null);
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.contentBlocks.remove(deleting.id);
      setDeleting(null);
      toast.success('Bloco removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover o bloco.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <QueryState
        query={blocks}
        skeleton={<ListSkeleton rows={5} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<LayoutTemplate />}
            title="Nenhum bloco de conteúdo"
            description="Crie o primeiro bloco de texto de uma página institucional."
            action={newAction}
          />
        }
      >
        {(list) => (
          <div className="ms-pagesadm">
            {EDITABLE_PAGES.map((page) => {
              const rows = list
                .filter((b) => b.page === page)
                .sort((a, b) => a.order - b.order);
              return (
                <section
                  key={page}
                  className="ms-pagesadm__group"
                  aria-labelledby={`ms-pagesadm-${page}`}
                >
                  <h2 id={`ms-pagesadm-${page}`} className="ms-pagesadm__title">
                    {PAGE_LABELS[page]}
                  </h2>
                  {rows.length === 0 ? (
                    <EmptyState
                      size="sm"
                      title="Sem blocos nesta página"
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNewFor(page)}
                        >
                          <Plus aria-hidden /> Adicionar bloco
                        </Button>
                      }
                    />
                  ) : (
                    <DataTable
                      caption={`Blocos da página ${PAGE_LABELS[page]}`}
                      rows={rows}
                      rowKey={(b) => b.id}
                      rowLabel={blockLabel}
                      columns={[
                        {
                          key: 'media',
                          header: 'Imagem',
                          hideHeader: true,
                          lead: true,
                          width: '72px',
                          render: (b) => <Thumb media={b.media} />,
                        },
                        {
                          key: 'title',
                          header: 'Título',
                          primary: true,
                          render: (b) =>
                            b.title ?? <em className="ms-adm__muted">(sem título)</em>,
                        },
                        {
                          key: 'key',
                          header: 'Key',
                          render: (b) => <code className="ms-adm__code">{b.key}</code>,
                        },
                        {
                          key: 'order',
                          header: 'Ordem',
                          align: 'end',
                          width: '80px',
                          render: (b) => b.order,
                        },
                      ]}
                      actions={(b) => (
                        <RowActions
                          label={blockLabel(b)}
                          onEdit={() => setEditing(b)}
                          onRemove={() => setDeleting(b)}
                        />
                      )}
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </QueryState>

      {(creating || newFor || editing) && (
        <BlockForm
          initial={editing}
          defaultPage={newFor ?? 'landing'}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            refresh();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir bloco"
          message={`O bloco "${deleting.key}" sai da página ${
            PAGE_LABELS[deleting.page as EditablePage] ?? deleting.page
          } e não pode ser recuperado.`}
          loading={removing}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function BlockForm({
  initial,
  defaultPage,
  onClose,
  onSaved,
}: {
  initial: ContentBlockDTO | null;
  defaultPage: EditablePage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ContentBlockInput>({
    page: (initial?.page as EditablePage) ?? defaultPage,
    key: initial?.key ?? '',
    order: initial?.order ?? 0,
    title: initial?.title ?? '',
    subtitle: initial?.subtitle ?? '',
    body: initial?.body ?? '',
    mediaId: initial?.media?.id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contentBlockSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
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
    <Modal
      title={initial ? `Editar bloco "${initial.key}"` : 'Novo bloco'}
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
        <div className="ms-modal__row">
          <Field
            label="Página"
            required
            hint={initial ? 'Não muda depois de criado.' : undefined}
            error={errors.page}
          >
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
          <Field
            label="Key (identificador)"
            required
            hint={
              initial
                ? 'Não muda depois de criado.'
                : 'Usado pelo site para achar o bloco.'
            }
            error={errors.key}
          >
            <Input
              value={form.key}
              disabled={!!initial}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Título" optional error={errors.title}>
          <Input
            value={form.title ?? ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Subtítulo" optional error={errors.subtitle}>
          <Input
            value={form.subtitle ?? ''}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </Field>
        <Field label="Corpo (texto)" optional error={errors.body}>
          <Textarea
            rows={6}
            value={form.body ?? ''}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem (opcional)"
        />
        <FieldGroup label="Exibição">
          <div className="ms-modal__row">
            <Field label="Ordem" hint="Posição do bloco na página." error={errors.order}>
              <Input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </Field>
          </div>
        </FieldGroup>
      </form>
    </Modal>
  );
}

// ─── Timeline ───────────────────────────────────────────────
function TimelineTab({
  creating,
  onCreatingChange,
  newAction,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
  newAction: React.ReactNode;
}) {
  const timeline = useQuery({
    queryKey: ['admin-timeline'],
    queryFn: adminApi.timeline.list,
  });
  const [editing, setEditing] = useState<TimelineItemDTO | null>(null);
  const [deleting, setDeleting] = useState<TimelineItemDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-timeline'] });
    void queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };

  const closeForm = () => {
    onCreatingChange(false);
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.timeline.remove(deleting.id);
      setDeleting(null);
      toast.success('Marco removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover o marco.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <QueryState
        query={timeline}
        skeleton={<ListSkeleton rows={5} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<History />}
            title="Sem marcos na timeline"
            description="Registre o primeiro marco da história da equipe."
            action={newAction}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Marcos da linha do tempo"
            rows={list}
            rowKey={(t) => t.id}
            rowLabel={(t) => t.title}
            columns={[
              {
                key: 'media',
                header: 'Imagem',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (t) => <Thumb media={t.media} />,
              },
              { key: 'title', header: 'Título', primary: true, render: (t) => t.title },
              { key: 'year', header: 'Ano', width: '96px', render: (t) => t.year },
              {
                key: 'order',
                header: 'Ordem',
                align: 'end',
                width: '80px',
                render: (t) => t.order,
              },
            ]}
            actions={(t) => (
              <RowActions
                label={t.title}
                onEdit={() => setEditing(t)}
                onRemove={() => setDeleting(t)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editing) && (
        <TimelineForm
          initial={editing}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            refresh();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir marco"
          message={`O marco "${deleting.title}" sai da linha do tempo da página História e não pode ser recuperado.`}
          loading={removing}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
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
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = timelineItemSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
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
    <Modal
      title={initial ? 'Editar marco' : 'Novo marco'}
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
        <div className="ms-modal__row">
          <Field label="Ano" required error={errors.year}>
            <Input
              type="number"
              min={1900}
              max={2100}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ordem" hint="Posição na linha do tempo." error={errors.order}>
            <Input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>
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
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem (opcional)"
        />
      </form>
    </Modal>
  );
}
