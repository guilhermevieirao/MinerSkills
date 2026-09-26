import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Handshake, ExternalLink } from 'lucide-react';
import {
  sponsorSchema,
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
  type SponsorDTO,
  type SponsorInput,
  type SponsorTier,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  FieldGroup,
  Input,
  Select,
  StatusBadge,
  Switch,
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
import { isWebUrl } from '../../lib/format';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
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
  const sponsors = useQuery({
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

  const newSponsor = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo patrocinador
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Patrocinadores"
        description="Empresas e instituições que apoiam a equipe."
        actions={newSponsor}
      />

      <QueryState
        query={sponsors}
        skeleton={<ListSkeleton rows={4} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Handshake />}
            title="Nenhum patrocinador cadastrado"
            description="Cadastre quem apoia a equipe para aparecer na Home e no rodapé do site."
            action={newSponsor}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Patrocinadores"
            rows={list}
            rowKey={(s) => s.id}
            rowLabel={(s) => s.name}
            columns={[
              {
                key: 'logo',
                header: 'Logo',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (s) => (
                  <Thumb media={s.logo} icon={Handshake} className="ms-sponadm__logo" />
                ),
              },
              { key: 'name', header: 'Nome', primary: true, render: (s) => s.name },
              { key: 'tier', header: 'Nível', render: (s) => tierLabel(s.tier) },
              {
                key: 'url',
                header: 'Link',
                hideOnMobile: true,
                render: (s) =>
                  isWebUrl(s.url) ? (
                    <a
                      className="ms-sponadm__link"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.url}
                    >
                      <ExternalLink aria-hidden />
                      <span className="ms-adm__truncate">
                        {s.url.replace(/^https?:\/\//, '')}
                      </span>
                      <span className="ms-visually-hidden"> (abre em nova aba)</span>
                    </a>
                  ) : (
                    <span className="ms-adm__muted">—</span>
                  ),
              },
              {
                key: 'order',
                header: 'Ordem',
                align: 'end',
                width: '80px',
                hideOnMobile: true,
                render: (s) => s.order,
              },
              {
                key: 'active',
                header: 'Status',
                render: (s) =>
                  s.active ? (
                    <StatusBadge status="active">Ativo</StatusBadge>
                  ) : (
                    <StatusBadge status="inactive">Inativo</StatusBadge>
                  ),
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
          title="Excluir patrocinador"
          message={`O patrocinador "${deleting.name}" deixa de aparecer na Home e no rodapé do site. A exclusão não pode ser desfeita.`}
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
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = sponsorSchema.safeParse({ ...form, url: form.url.trim() || null });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
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
    <Modal
      title={initial ? 'Editar patrocinador' : 'Novo patrocinador'}
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
        <Field label="Nome" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
            autoFocus
          />
        </Field>
        <Field
          label="Site"
          optional
          hint="Endereço completo, com https://"
          error={errors.url}
        >
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            maxLength={400}
          />
        </Field>
        <MediaPicker
          value={form.logoId}
          preview={initial?.logo}
          onChange={(m) => setForm({ ...form, logoId: m?.id ?? null })}
          label="Logo"
        />
        {errors.logoId && (
          <span className="ms-field__error" role="alert">
            {errors.logoId}
          </span>
        )}
        <FieldGroup label="Exibição">
          <div className="ms-modal__row">
            <Field label="Nível" required error={errors.tier}>
              <Select
                value={form.tier}
                onChange={(e) =>
                  setForm({ ...form, tier: e.target.value as SponsorTier })
                }
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
          <Switch
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          >
            Ativo (aparece na Home e no rodapé)
          </Switch>
        </FieldGroup>
      </form>
    </Modal>
  );
}
