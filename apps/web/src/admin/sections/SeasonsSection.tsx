import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { seasonSchema, type SeasonDTO, type SeasonInput } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, Field, Input, Loader, Textarea } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl } from '../../lib/format';
import { ApiError } from '../../lib/api';
import { SEASONS_QUERY_KEY } from '../../features/seasons/useSeasons';
import './SeasonsSection.scss';

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
  const { data, isLoading } = useQuery({
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
      ? `Remover a temporada "${deleting.name}"? Os registros vinculados (${deleting.robotsCount} robôs, ${deleting.awardsCount} prêmios) continuam existindo, sem temporada.`
      : `Remover a temporada "${deleting.name}"?`
    : '';

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Temporadas</h1>
          <p>Jogos da FRC por ano: robôs, prêmios e eventos de cada temporada.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nova temporada
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma temporada cadastrada"
          description="Cadastre as temporadas para vincular robôs e prêmios e montar a página Temporadas."
        />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Ano</th>
                <th>Jogo</th>
                <th>Atual</th>
                <th>Robôs</th>
                <th>Prêmios</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.badge ? (
                      <img
                        className="ms-adm__thumb"
                        src={mediaUrl(s.badge.thumbUrl ?? s.badge.url)}
                        alt=""
                      />
                    ) : (
                      <span className="ms-seasons-adm__badge-empty">
                        <Layers />
                      </span>
                    )}
                  </td>
                  <td>{s.name}</td>
                  <td>{s.year}</td>
                  <td>
                    {s.game ? (
                      <span className="ms-seasons-adm__game" title={s.game}>
                        {s.game}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {s.isCurrent ? (
                      <span className="ms-adm__status ms-adm__status--approved">Atual</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{s.robotsCount}</td>
                  <td>{s.awardsCount}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(s)}>
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
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // campo numérico vazio vira NaN — mensagem própria em vez da genérica do zod
    if (!Number.isInteger(form.year)) {
      setErrors({ year: 'Informe o ano' });
      return;
    }
    const parsed = seasonSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
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
    <Modal title={initial ? 'Editar temporada' : 'Nova temporada'} onClose={onClose}>
      <form onSubmit={save} noValidate>
        <Field label="Nome" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
            autoFocus
          />
        </Field>

        <div className="ms-modal__row">
          <Field label="Ano" error={errors.year}>
            <Input
              type="number"
              min={1990}
              max={2100}
              value={Number.isInteger(form.year) ? form.year : ''}
              onChange={(e) =>
                setForm({ ...form, year: e.target.value ? Number(e.target.value) : Number.NaN })
              }
            />
          </Field>
          <Field label="Ordem" hint="Menor primeiro; no empate, o ano mais recente." error={errors.order}>
            <Input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Jogo" hint="Nome oficial do jogo (ex.: REEFSCAPE presented by Haas)." error={errors.game}>
          <Input
            value={form.game ?? ''}
            onChange={(e) => setForm({ ...form, game: e.target.value })}
            maxLength={120}
          />
        </Field>

        <Field label="Resumo" error={errors.summary}>
          <Textarea
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

        <div className="ms-field">
          <label className="ms-checkbox">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
            />
            Temporada atual
          </label>
          <span className="ms-field__hint">
            Só uma temporada é a atual: marcar esta desmarca as demais.
          </span>
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
