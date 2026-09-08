import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Handshake, ExternalLink } from 'lucide-react';
import {
  sponsorSchema,
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
  type SponsorDTO,
  type SponsorInput,
  type SponsorTier,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Select, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { isWebUrl, mediaUrl } from '../../lib/format';
import { ApiError } from '../../lib/api';
import { SPONSORS_QUERY_KEY } from '../../features/sponsors/useSponsors';
import './SponsorsSection.scss';

/** Salvar ou excluir afeta a lista do painel e o site (faixa da Home e rodapé). */
function invalidateSponsorQueries() {
  void queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
  void queryClient.invalidateQueries({ queryKey: SPONSORS_QUERY_KEY });
}

/** Rótulo do nível; valores fora de SPONSOR_TIERS (dado antigo) aparecem como estão. */
function tierLabel(tier: string): string {
  return (SPONSOR_TIER_LABELS as Record<string, string>)[tier] ?? tier;
}

export function SponsorsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: adminApi.sponsors.list,
  });
  const [editing, setEditing] = useState<SponsorDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SponsorDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.sponsors.remove(deleting.id);
      setDeleting(null);
      toast.success('Patrocinador removido.');
      invalidateSponsorQueries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Patrocinadores</h1>
          <p>Empresas e instituições que apoiam a equipe.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo patrocinador
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhum patrocinador cadastrado"
          description="Cadastre quem apoia a equipe para aparecer na Home e no rodapé do site."
        />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Nível</th>
                <th>Link</th>
                <th>Ordem</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className={s.active ? undefined : 'ms-sponadm__row--inactive'}>
                  <td>
                    {s.logo ? (
                      <img
                        className="ms-adm__thumb ms-sponadm__thumb"
                        src={mediaUrl(s.logo.thumbUrl ?? s.logo.url)}
                        alt=""
                      />
                    ) : (
                      <span className="ms-adm__thumb ms-sponadm__placeholder" aria-hidden>
                        <Handshake />
                      </span>
                    )}
                  </td>
                  <td>{s.name}</td>
                  <td>{tierLabel(s.tier)}</td>
                  <td className="ms-sponadm__link">
                    {isWebUrl(s.url) ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.url}>
                        <ExternalLink /> {s.url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{s.order}</td>
                  <td>{s.active ? 'Sim' : 'Não'}</td>
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
        <SponsorForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            invalidateSponsorQueries();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message={`Remover o patrocinador "${deleting.name}"? Ele deixa de aparecer na Home e no rodapé.`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          loading={removing}
        />
      )}
    </div>
  );
}

/** Estado do formulário: o site fica como texto (vazio = sem link) até a validação. */
interface SponsorFormState {
  name: string;
  url: string;
  tier: SponsorTier;
  logoId: string | null;
  order: number;
  active: boolean;
}

function SponsorForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: SponsorDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialTier = initial?.tier;
  const [form, setForm] = useState<SponsorFormState>({
    name: initial?.name ?? '',
    url: initial?.url ?? '',
    tier:
      initialTier && (SPONSOR_TIERS as readonly string[]).includes(initialTier)
        ? (initialTier as SponsorTier)
        : 'parceiro',
    logoId: initial?.logo?.id ?? null,
    order: initial?.order ?? 0,
    active: initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = sponsorSchema.safeParse({ ...form, url: form.url.trim() || null });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const data: SponsorInput = parsed.data;
      if (initial) await adminApi.sponsors.update(initial.id, data);
      else await adminApi.sponsors.create(data);
      toast.success('Patrocinador salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Editar patrocinador' : 'Novo patrocinador'} onClose={onClose}>
      <form onSubmit={save} noValidate>
        <Field label="Nome" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
            autoFocus
          />
        </Field>
        <Field label="Site" hint="Opcional. Endereço completo, com https://" error={errors.url}>
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            maxLength={400}
          />
        </Field>
        <div className="ms-modal__row">
          <Field label="Nível" error={errors.tier}>
            <Select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value as SponsorTier })}
            >
              {SPONSOR_TIERS.map((t) => (
                <option key={t} value={t}>
                  {SPONSOR_TIER_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem" hint="Posição dentro do nível." error={errors.order}>
            <Input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <MediaPicker
          value={form.logoId}
          preview={initial?.logo}
          onChange={(m) => setForm({ ...form, logoId: m?.id ?? null })}
          label="Logo"
        />
        {errors.logoId && <span className="ms-field__error">{errors.logoId}</span>}
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
