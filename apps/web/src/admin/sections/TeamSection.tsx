import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bot, Plus, Tags, TriangleAlert, User, Users } from 'lucide-react';
import {
  encyclopediaEntrySchema,
  GENERATIONS,
  GENERATION_LABELS,
  ENTRY_KINDS,
  type EncyclopediaEntryDTO,
  type EncyclopediaEntryInput,
  type Generation,
  type EntryKind,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  FieldGroup,
  FilterChip,
  Input,
  LinkButton,
  Select,
  Skeleton,
  StatusBadge,
  Switch,
  Tag,
  Textarea,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { Thumb } from '../../components/ui/tiles';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useNewParam } from '../lib/useNewParam';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import { TagIcon } from '../../features/encyclopedia/roleIcons';
import { MEMBER_TAGS_QUERY_KEY } from '../../features/encyclopedia/useMemberTags';
import { SEASONS_QUERY_KEY } from '../../features/seasons/useSeasons';

export function TeamSection() {
  const entries = useQuery({
    queryKey: ['admin-encyclopedia'],
    queryFn: adminApi.encyclopedia.list,
  });
  const [editing, setEditing] = useState<EncyclopediaEntryDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EncyclopediaEntryDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useNewParam(() => setCreating(true));

  // `usageCount` das tags é derivado dos registros: as listas de tags também
  // precisam ser invalidadas, senão a tela de tags mostra contagens antigas.
  // As temporadas contam robôs vinculados: também precisam ser renovadas.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-encyclopedia'] });
    void queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-member-tags'] });
    void queryClient.invalidateQueries({ queryKey: MEMBER_TAGS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
    void queryClient.invalidateQueries({ queryKey: SEASONS_QUERY_KEY });
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.encyclopedia.remove(deleting.id);
      setDeleting(null);
      toast.success('Registro removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  const newEntry = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo registro
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Equipe"
        description="Membros (atuais e antigos), treinadores e robôs."
        actions={
          <>
            <LinkButton variant="outline" to="/admin/equipe/tags">
              <Tags aria-hidden /> Gerenciar tags
            </LinkButton>
            {newEntry}
          </>
        }
      />

      <QueryState
        query={entries}
        skeleton={<ListSkeleton rows={6} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Users />}
            title="Nenhum registro"
            description="Cadastre membros, treinadores e robôs para montar a página Equipe."
            action={newEntry}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Membros e robôs da equipe"
            rows={list}
            rowKey={(e) => e.id}
            rowLabel={(e) => e.name}
            columns={[
              {
                key: 'photo',
                header: 'Foto',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (e) => (
                  <Thumb media={e.photo} icon={e.kind === 'robot' ? Bot : User} />
                ),
              },
              { key: 'name', header: 'Nome', primary: true, render: (e) => e.name },
              {
                key: 'kind',
                header: 'Tipo',
                render: (e) => (e.kind === 'robot' ? 'Robô' : 'Membro'),
              },
              {
                key: 'role',
                header: 'Função',
                hideOnMobile: true,
                render: (e) => e.role || '—',
              },
              {
                key: 'generation',
                header: 'Geração',
                hideOnMobile: true,
                render: (e) =>
                  e.generation ? GENERATION_LABELS[e.generation as Generation] : '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (e) =>
                  e.isFormer ? (
                    <Tag tone="neutral">Antigo</Tag>
                  ) : (
                    <StatusBadge status="current" />
                  ),
              },
            ]}
            actions={(e) => (
              <RowActions
                label={e.name}
                onEdit={() => setEditing(e)}
                onRemove={() => setDeleting(e)}
              />
            )}
          />
        )}
      </QueryState>

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
        <ConfirmDialog
          title="Excluir registro"
          message={`"${deleting.name}" sai da página Equipe e não pode ser recuperado.`}
          loading={removing}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
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
  // Tags cadastradas pelo admin (fonte da verdade para os chips abaixo).
  const {
    data: memberTags,
    isLoading: tagsLoading,
    isError: tagsError,
  } = useQuery({
    queryKey: ['admin-member-tags'],
    queryFn: adminApi.memberTags.list,
  });
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
    seasonId: initial?.seasonId ?? null,
    tags: initial?.tags ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  // Temporadas cadastradas — só robôs têm o vínculo, então só eles carregam a lista.
  const { data: seasons } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: adminApi.seasons.list,
    enabled: form.kind === 'robot',
  });

  const toggleTag = (key: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key],
    }));

  // Chaves gravadas no registro que não existem mais em MemberTag (tag excluída
  // ou banco sem backfill). Aparecem como chips de aviso e são descartadas ao
  // salvar (a API rejeitaria com 400). Só com a lista carregada — sem ela,
  // manter as chaves e deixar o servidor validar evita apagar tags por um
  // erro de rede.
  const known = memberTags ? new Set(memberTags.map((t) => t.key)) : null;
  const unknownTags = known ? form.tags.filter((t) => !known.has(t)) : [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = known ? form.tags.filter((t) => known.has(t)) : form.tags;
    // membro nunca leva temporada (a API também zera)
    const seasonId = form.kind === 'robot' ? form.seasonId : null;
    const parsed = encyclopediaEntrySchema.safeParse({ ...form, tags, seasonId });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
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
    <Modal
      title={initial ? `Editar ${initial.name}` : 'Novo registro'}
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
          <Field label="Tipo">
            <Select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as EntryKind })}
            >
              {ENTRY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === 'robot' ? 'Robô' : 'Membro'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
        </div>

        <div className="ms-modal__row">
          <Field label="Função (rótulo do card)" optional error={errors.role}>
            <Input
              value={form.role ?? ''}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </Field>
          {isRobot ? (
            <Field
              label="Temporada"
              optional
              hint="Vincula o robô à página Temporadas."
              error={errors.seasonId}
            >
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
          ) : (
            <Field label="Idade" optional error={errors.age}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.age ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    age: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          )}
        </div>

        {isRobot && (
          <Field
            label="Rótulo da temporada"
            optional
            hint="Texto livre exibido no painel do robô (ex.: Temporada 2025)."
            error={errors.season}
          >
            <Input
              value={form.season ?? ''}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
            />
          </Field>
        )}

        {!isRobot && (
          <>
            <Field label="Geração" optional error={errors.generation}>
              <Select
                value={form.generation ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    generation: (e.target.value || null) as Generation | null,
                  })
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

            <FieldGroup label="Tags (filtros da página Equipe)" error={errors.tags}>
              {tagsLoading ? (
                <Skeleton height={32} />
              ) : tagsError ? (
                <span className="ms-field__error">
                  Não foi possível carregar as tags.
                </span>
              ) : memberTags && memberTags.length === 0 && unknownTags.length === 0 ? (
                <span className="ms-field__hint">
                  Nenhuma tag cadastrada. <Link to="/admin/equipe/tags">Criar tags</Link>
                </span>
              ) : (
                <div className="ms-tagpick">
                  {(memberTags ?? []).map((t) => (
                    <FilterChip
                      key={t.key}
                      active={form.tags.includes(t.key)}
                      onClick={() => toggleTag(t.key)}
                    >
                      <TagIcon icon={t.icon} />
                      {t.label}
                    </FilterChip>
                  ))}
                  {unknownTags.map((key) => (
                    <FilterChip key={key} active onClick={() => toggleTag(key)}>
                      <TriangleAlert aria-hidden />
                      {key}
                    </FilterChip>
                  ))}
                </div>
              )}
              {unknownTags.length > 0 && (
                <span className="ms-field__hint">
                  Tags não cadastradas (serão removidas ao salvar):{' '}
                  {unknownTags.join(', ')}.{' '}
                  <Link to="/admin/equipe/tags">Gerenciar tags</Link>
                </span>
              )}
            </FieldGroup>
          </>
        )}

        <Field
          label="Sobre"
          required
          hint="Separe parágrafos com uma linha em branco."
          error={errors.about}
        >
          <Textarea
            rows={6}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </Field>

        <Field label="Citação" optional error={errors.quote}>
          <Input
            value={form.quote ?? ''}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
          />
        </Field>

        <MediaPicker
          value={form.photoId ?? null}
          preview={initial?.photo}
          onChange={(m) => setForm({ ...form, photoId: m?.id ?? null })}
          label="Foto"
        />

        <div className="ms-form-section">
          <span className="ms-form-section__title">Exibição</span>
          <Field label="Ordem" error={errors.order}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
          <Switch
            checked={form.isFormer}
            onChange={(e) => setForm({ ...form, isFormer: e.target.checked })}
          >
            {isRobot ? 'Robô antigo' : 'Ex-membro'}
          </Switch>
        </div>
      </form>
    </Modal>
  );
}
