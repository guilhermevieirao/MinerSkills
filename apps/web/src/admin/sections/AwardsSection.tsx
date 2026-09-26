import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trophy } from 'lucide-react';
import { awardSchema, type AwardDTO, type AwardInput } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  StatusBadge,
  Switch,
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
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import { SEASONS_QUERY_KEY } from '../../features/seasons/useSeasons';

export function AwardsSection() {
  const awards = useQuery({
    queryKey: ['admin-awards'],
    queryFn: adminApi.awards.list,
  });
  const [editing, setEditing] = useState<AwardDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AwardDTO | null>(null);
  const [removing, setRemoving] = useState(false);
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
    setRemoving(true);
    try {
      await adminApi.awards.remove(deleting.id);
      setDeleting(null);
      toast.success('Prêmio removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  const newAward = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo prêmio
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Prêmios & Conquistas"
        description="Reconhecimentos da equipe."
        actions={newAward}
      />

      <QueryState
        query={awards}
        skeleton={<ListSkeleton rows={5} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Trophy />}
            title="Nenhum prêmio cadastrado"
            description="Registre os prêmios e conquistas para montar a página Prêmios."
            action={newAward}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Prêmios e conquistas"
            rows={list}
            rowKey={(a) => a.id}
            rowLabel={(a) => a.title}
            columns={[
              {
                key: 'media',
                header: 'Imagem',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (a) => <Thumb media={a.media} icon={Trophy} />,
              },
              { key: 'title', header: 'Título', primary: true, render: (a) => a.title },
              {
                key: 'event',
                header: 'Evento',
                render: (a) => (
                  <span className="ms-adm__truncate" title={a.event}>
                    {a.event}
                  </span>
                ),
              },
              { key: 'year', header: 'Ano', render: (a) => a.year },
              {
                key: 'season',
                header: 'Temporada',
                hideOnMobile: true,
                render: (a) => a.seasonRef?.name ?? '—',
              },
              {
                key: 'highlight',
                header: 'Destaque',
                render: (a) => <StatusBadge status={a.highlight ? 'yes' : 'no'} />,
              },
            ]}
            actions={(a) => (
              <RowActions
                label={a.title}
                onEdit={() => setEditing(a)}
                onRemove={() => setDeleting(a)}
              />
            )}
          />
        )}
      </QueryState>

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
          title="Excluir prêmio"
          message={`O prêmio "${deleting.title}" sai da página Prêmios e não pode ser recuperado.`}
          loading={removing}
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
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();
  const { data: seasons } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: adminApi.seasons.list,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = awardSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
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
    <Modal
      title={initial ? 'Editar prêmio' : 'Novo prêmio'}
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
        <div className="ms-modal__row">
          <Field label="Evento" required error={errors.event}>
            <Input
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
            />
          </Field>
          <Field label="Ano" required error={errors.year}>
            <Input
              type="number"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Descrição" required error={errors.description}>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field
          label="Temporada"
          optional
          hint="Agrupa o prêmio na página Temporadas."
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
        <MediaPicker
          value={form.mediaId ?? null}
          preview={initial?.media}
          onChange={(m) => setForm({ ...form, mediaId: m?.id ?? null })}
          label="Imagem / badge (opcional)"
        />
        <Switch
          checked={form.highlight}
          onChange={(e) => setForm({ ...form, highlight: e.target.checked })}
        >
          Destaque (aparece em evidência)
        </Switch>
      </form>
    </Modal>
  );
}
