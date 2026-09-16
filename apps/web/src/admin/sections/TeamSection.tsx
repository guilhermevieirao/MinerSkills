import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Tags, TriangleAlert } from 'lucide-react';
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
  LinkButton,
  Input,
  Textarea,
  Select,
  Field,
  Loader,
  EmptyState,
  FilterChip,
} from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl } from '../../lib/format';
import { ApiError } from '../../lib/api';
import { TagIcon } from '../../features/encyclopedia/roleIcons';
import { MEMBER_TAGS_QUERY_KEY } from '../../features/encyclopedia/useMemberTags';
import { SEASONS_QUERY_KEY } from '../../features/seasons/useSeasons';

export function TeamSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-encyclopedia'],
    queryFn: adminApi.encyclopedia.list,
  });
  const [editing, setEditing] = useState<EncyclopediaEntryDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EncyclopediaEntryDTO | null>(null);
  const toast = useToast();

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
    await adminApi.encyclopedia.remove(deleting.id);
    setDeleting(null);
    toast.success('Registro removido.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Equipe</h1>
          <p>Membros (atuais e antigos), treinadores e robôs.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--ms-space-2)' }}>
          <LinkButton variant="outline" to="/admin/equipe/tags">
            <Tags /> Gerenciar tags
          </LinkButton>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Novo registro
          </Button>
        </div>
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
                <tr key={e.id} data-row={e.name}>
                  <td>
                    {e.photo && (
                      <img
                        className="ms-adm__thumb"
                        src={mediaUrl(e.photo.thumbUrl ?? e.photo.url)}
                        alt=""
                      />
                    )}
                  </td>
                  <td>{e.name}</td>
                  <td>{e.kind === 'robot' ? 'Robô' : 'Membro'}</td>
                  <td>{e.role ?? '—'}</td>
                  <td>
                    {e.generation ? GENERATION_LABELS[e.generation as Generation] : '—'}
                  </td>
                  <td>
                    <span
                      className={`ms-adm__status ms-adm__status--${e.isFormer ? 'pending' : 'approved'}`}
                    >
                      {e.isFormer ? 'Antigo' : 'Atual'}
                    </span>
                  </td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${e.name}`}
                        onClick={() => setEditing(e)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Excluir ${e.name}`}
                        onClick={() => setDeleting(e)}
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
          message={`Remover "${deleting.name}"?`}
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
  const tagsLabelId = useId();
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
          <Field label="Nome" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
        </div>

        <div className="ms-modal__row">
          <Field label="Função (rótulo do card)">
            <Input
              value={form.role ?? ''}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </Field>
          {isRobot ? (
            <Field
              label="Temporada"
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
            <Field label="Idade" error={errors.age}>
              <Input
                type="number"
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
            hint="Texto livre exibido no painel do robô (ex.: Temporada 2025)."
          >
            <Input
              value={form.season ?? ''}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
            />
          </Field>
        )}

        {!isRobot && (
          <>
            <Field label="Geração">
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

            <div className="ms-field">
              <span className="ms-field__label" id={tagsLabelId}>
                Tags (filtros da página Equipe)
              </span>
              {tagsLoading ? (
                <Loader label="Carregando tags…" />
              ) : tagsError ? (
                <span className="ms-field__error">
                  Não foi possível carregar as tags.
                </span>
              ) : memberTags && memberTags.length === 0 && unknownTags.length === 0 ? (
                <span className="ms-field__hint">
                  Nenhuma tag cadastrada. <Link to="/admin/equipe/tags">Criar tags</Link>
                </span>
              ) : (
                <div className="ms-tagpick" role="group" aria-labelledby={tagsLabelId}>
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
                      <TriangleAlert />
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
              {errors.tags && <span className="ms-field__error">{errors.tags}</span>}
            </div>
          </>
        )}

        <Field
          label="Sobre"
          hint="Separe parágrafos com uma linha em branco."
          error={errors.about}
        >
          <Textarea
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </Field>

        <Field label="Citação (opcional)">
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
