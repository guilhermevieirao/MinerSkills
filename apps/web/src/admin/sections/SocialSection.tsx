import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Share2 } from 'lucide-react';
import {
  socialLinkSchema,
  SOCIAL_PLATFORMS,
  type SocialLinkDTO,
  type SocialLinkInput,
  type SocialPlatform,
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
import { SocialIcon } from '../../components/layout/SocialIcon';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';

/**
 * Nome de exibição de cada plataforma. `@minerskills/shared` só exporta os
 * valores (SOCIAL_PLATFORMS), sem rótulos — o mapa fica aqui, tipado por eles.
 */
const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  github: 'GitHub',
  email: 'E-mail',
  website: 'Site',
  other: 'Outra',
};

/** Rótulo da plataforma; valores fora da lista (dado antigo) aparecem como estão. */
function platformLabel(platform: string): string {
  return (PLATFORM_LABELS as Record<string, string>)[platform] ?? platform;
}

export function SocialSection() {
  const links = useQuery({
    queryKey: ['admin-social'],
    queryFn: adminApi.social.list,
  });
  const [editing, setEditing] = useState<SocialLinkDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SocialLinkDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-social'] });
    void queryClient.invalidateQueries({ queryKey: ['social-links'] });
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.social.remove(deleting.id);
      setDeleting(null);
      toast.success('Rede removida.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover a rede.');
    } finally {
      setRemoving(false);
    }
  };

  const newLink = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Nova rede
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Redes Sociais"
        description='Links exibidos no rodapé e na página "Como Entrar".'
        actions={newLink}
      />

      <QueryState
        query={links}
        skeleton={<ListSkeleton rows={4} lead={40} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Share2 />}
            title="Nenhuma rede cadastrada"
            description="Cadastre os perfis da equipe para aparecerem no rodapé do site."
            action={newLink}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Redes sociais"
            rows={list}
            rowKey={(l) => l.id}
            rowLabel={(l) => l.label}
            columns={[
              {
                key: 'icon',
                header: 'Ícone',
                hideHeader: true,
                lead: true,
                width: '48px',
                render: (l) => (
                  <span className="ms-adm__icon-cell">
                    <SocialIcon platform={l.platform} />
                  </span>
                ),
              },
              { key: 'label', header: 'Rótulo', primary: true, render: (l) => l.label },
              {
                key: 'platform',
                header: 'Plataforma',
                render: (l) => platformLabel(l.platform),
              },
              {
                key: 'url',
                header: 'URL',
                render: (l) => (
                  <span className="ms-adm__truncate ms-adm__muted" title={l.url}>
                    {l.url}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                render: (l) => <StatusBadge status={l.active ? 'active' : 'inactive'} />,
              },
            ]}
            actions={(l) => (
              <RowActions
                label={l.label}
                onEdit={() => setEditing(l)}
                onRemove={() => setDeleting(l)}
              />
            )}
          />
        )}
      </QueryState>

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
          title="Excluir rede social"
          message={`O link "${deleting.label}" sai do rodapé e da página Como Entrar e não pode ser recuperado.`}
          loading={removing}
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
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = socialLinkSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
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
    <Modal
      title={initial ? 'Editar rede' : 'Nova rede'}
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
        <Field label="Plataforma" required error={errors.platform}>
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
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rótulo" required error={errors.label}>
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            maxLength={80}
          />
        </Field>
        <Field label="URL" required error={errors.url}>
          <Input
            inputMode="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            maxLength={400}
          />
        </Field>
        <FieldGroup label="Exibição">
          <div className="ms-modal__row">
            <Field label="Ordem" hint="Posição no rodapé." error={errors.order}>
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
            Ativo (visível no site)
          </Switch>
        </FieldGroup>
      </form>
    </Modal>
  );
}
