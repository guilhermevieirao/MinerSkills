import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Plus } from 'lucide-react';
import { seasonSchema, type SeasonDTO, type SeasonInput } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  Input,
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

/**
 * Robôs e prêmios carregam `seasonRef` e a temporada carrega as contagens
 * deles: qualquer mutação invalida os dois lados, no painel e no site.
 */
function invalidateSeasonQueries() {
  const keys = [
    ['admin-seasons'],
    SEASONS_QUERY_KEY,
    ['admin-encyclopedia'],
    ['encyclopedia'],
    ['admin-awards'],
    ['awards'],
  ];
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

/** Erros por campo vindos da API (`details: [{ path, message }]`), se houver. */
function apiFieldErrors(err: unknown): Record<string, string> {
  const errs: Record<string, string> = {};
  if (err instanceof ApiError && Array.isArray(err.details)) {
    for (const d of err.details as { path?: string; message?: string }[]) {
      if (d.path && d.message) errs[d.path] = d.message;
    }
  }
  return errs;
}

export function SeasonsSection() {
  const seasons = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: adminApi.seasons.list,
  });
  const [editing, setEditing] = useState<SeasonDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SeasonDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.seasons.remove(deleting.id);
      setDeleting(null);
      toast.success('Temporada removida.');
      invalidateSeasonQueries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  // Nada é apagado em cascata: o aviso só lista o que fica sem temporada.
  const deleteMessage = deleting
    ? deleting.robotsCount + deleting.awardsCount > 0
      ? `A temporada "${deleting.name}" sai do site. Os registros vinculados (${deleting.robotsCount} robôs, ${deleting.awardsCount} prêmios) continuam existindo, sem temporada.`
      : `A temporada "${deleting.name}" sai do site e não pode ser recuperada.`
    : '';

  const newSeason = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Nova temporada
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Temporadas"
        description="Jogos da FRC por ano: robôs, prêmios e eventos de cada temporada."
        actions={newSeason}
      />

      <QueryState
        query={seasons}
        skeleton={<ListSkeleton rows={4} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Layers />}
            title="Nenhuma temporada cadastrada"
            description="Cadastre as temporadas para vincular robôs e prêmios e montar a página Temporadas."
            action={newSeason}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Temporadas cadastradas"
            rows={list}
            rowKey={(s) => s.id}
            rowLabel={(s) => s.name}
            columns={[
              {
                key: 'badge',
                header: 'Selo',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (s) => <Thumb media={s.badge} icon={Layers} />,
              },
              { key: 'name', header: 'Nome', primary: true, render: (s) => s.name },
              { key: 'year', header: 'Ano', render: (s) => s.year },
              {
                key: 'game',
                header: 'Jogo',
                hideOnMobile: true,
                render: (s) =>
                  s.game ? (
                    <span className="ms-adm__truncate ms-adm__muted" title={s.game}>
                      {s.game}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                // o rótulo "Atual" só aparece na linha da temporada atual (a suíte conta)
                key: 'current',
                header: 'Situação',
                render: (s) => (s.isCurrent ? <StatusBadge status="current" /> : '—'),
              },
              {
                key: 'robots',
                header: 'Robôs',
                align: 'end',
                render: (s) => s.robotsCount,
              },
              {
                key: 'awards',
                header: 'Prêmios',
                align: 'end',
                render: (s) => s.awardsCount,
              },
            ]}
            actions={(s) => (
              <RowActions
                label={s.name}
                onEdit={() => setEditing(s)}
                onRemove={() => setDeleting(s)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editing) && (
        <SeasonForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            invalidateSeasonQueries();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir temporada"
          message={deleteMessage}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          loading={removing}
        />
      )}
    </div>
  );
}

function SeasonForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: SeasonDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SeasonInput>({
    name: initial?.name ?? '',
    year: initial?.year ?? new Date().getFullYear(),
    game: initial?.game ?? '',
    summary: initial?.summary ?? '',
    badgeId: initial?.badge?.id ?? null,
    order: initial?.order ?? 0,
    isCurrent: initial?.isCurrent ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const currentHintId = useId();
  const toast = useToast();

  const invalid = (errs: Record<string, string>) => {
    setErrors(errs);
    requestAnimationFrame(() => focusFirstInvalid(formRef.current));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // campo numérico vazio vira NaN — mensagem própria em vez da genérica do zod
    if (!Number.isInteger(form.year)) {
      invalid({ year: 'Informe o ano' });
      return;
    }
    const parsed = seasonSchema.safeParse(form);
    if (!parsed.success) {
      invalid(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (initial) await adminApi.seasons.update(initial.id, parsed.data);
      else await adminApi.seasons.create(parsed.data);
      toast.success('Temporada salva.');
      onSaved();
    } catch (err) {
      setErrors(apiFieldErrors(err));
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Editar temporada' : 'Nova temporada'}
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
          <Field label="Nome" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field label="Ano" required error={errors.year}>
            <Input
              type="number"
              inputMode="numeric"
              min={1990}
              max={2100}
              value={Number.isInteger(form.year) ? form.year : ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  year: e.target.value ? Number(e.target.value) : Number.NaN,
                })
              }
            />
          </Field>
        </div>

        <Field
          label="Jogo"
          optional
          hint="Nome oficial do jogo (ex.: REEFSCAPE presented by Haas)."
          error={errors.game}
        >
          <Input
            value={form.game ?? ''}
            onChange={(e) => setForm({ ...form, game: e.target.value })}
            maxLength={120}
          />
        </Field>

        <Field label="Resumo" optional error={errors.summary}>
          <Textarea
            rows={4}
            value={form.summary ?? ''}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            maxLength={2000}
          />
        </Field>

        <MediaPicker
          value={form.badgeId ?? null}
          preview={initial?.badge}
          onChange={(m) => setForm({ ...form, badgeId: m?.id ?? null })}
          label="Selo"
        />
        {errors.badgeId && <span className="ms-field__error">{errors.badgeId}</span>}

        <div className="ms-form-section">
          <span className="ms-form-section__title">Exibição</span>
          <Field
            label="Ordem"
            hint="Menor primeiro; no empate, o ano mais recente."
            error={errors.order}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
          <div className="ms-field">
            <Switch
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              aria-describedby={currentHintId}
            >
              Temporada atual
            </Switch>
            <span className="ms-field__hint" id={currentHintId}>
              Só uma temporada é a atual: marcar esta desmarca as demais.
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
