import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Tags } from 'lucide-react';
import {
  memberTagSchema,
  MEMBER_TAG_ICONS,
  type MemberTagDTO,
  type MemberTagInput,
  type MemberTagIcon,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, Field, FieldGroup, Input } from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { cx } from '../../lib/format';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import { TagIcon } from '../../features/encyclopedia/roleIcons';
import { MEMBER_TAGS_QUERY_KEY } from '../../features/encyclopedia/useMemberTags';

/** Nome de cada ícone para o usuário (tooltip e leitor de tela) — as chaves são técnicas. */
const ICON_LABELS: Record<MemberTagIcon, string> = {
  user: 'Pessoa',
  swords: 'Espadas',
  'graduation-cap': 'Formatura',
  wrench: 'Chave inglesa',
  'circuit-board': 'Placa de circuito',
  code: 'Código',
  box: 'Caixa',
  megaphone: 'Megafone',
  gamepad: 'Controle',
  cpu: 'Processador',
  lightbulb: 'Lâmpada',
  camera: 'Câmera',
  rocket: 'Foguete',
  trophy: 'Troféu',
  shield: 'Escudo',
  flask: 'Frasco de laboratório',
  ruler: 'Régua',
  hammer: 'Martelo',
  palette: 'Paleta',
  briefcase: 'Maleta',
  heart: 'Coração',
  star: 'Estrela',
  zap: 'Raio',
  settings: 'Engrenagem',
  book: 'Livro',
  users: 'Grupo',
  wallet: 'Carteira',
  presentation: 'Apresentação',
  video: 'Vídeo',
  pen: 'Caneta',
};

/**
 * Qualquer mutação de tag afeta o painel (lista de tags, chips do formulário
 * de membro) e o site público (filtros e ícones da página Equipe).
 */
function invalidateTagQueries() {
  void queryClient.invalidateQueries({ queryKey: ['admin-member-tags'] });
  void queryClient.invalidateQueries({ queryKey: MEMBER_TAGS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['admin-encyclopedia'] });
  void queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
}

export function MemberTagsSection() {
  const tags = useQuery({
    queryKey: ['admin-member-tags'],
    queryFn: adminApi.memberTags.list,
  });
  const [editing, setEditing] = useState<MemberTagDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MemberTagDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.memberTags.remove(deleting.id);
      setDeleting(null);
      toast.success('Tag removida.');
      invalidateTagQueries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  const deleteMessage = deleting
    ? deleting.usageCount > 0
      ? `A tag "${deleting.label}" sai dos filtros da página Equipe. Ela está vinculada a ${deleting.usageCount} ${
          deleting.usageCount === 1 ? 'registro' : 'registros'
        }, que perderão essa tag.`
      : `A tag "${deleting.label}" sai dos filtros da página Equipe e não pode ser recuperada.`
    : '';

  const newTag = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Nova tag
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Tags da equipe"
        description="Categorias usadas para classificar e filtrar os membros."
        actions={newTag}
      />

      <QueryState
        query={tags}
        skeleton={<ListSkeleton rows={4} lead={0} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Tags />}
            title="Nenhuma tag cadastrada"
            description="Crie tags para classificar os membros e gerar os filtros da página Equipe."
            action={newTag}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Tags da equipe"
            rows={list}
            rowKey={(t) => t.id}
            rowLabel={(t) => t.label}
            columns={[
              {
                key: 'icon',
                header: 'Ícone',
                hideHeader: true,
                lead: true,
                width: '56px',
                render: (t) => (
                  <span className="ms-adm__icon-cell">
                    <TagIcon icon={t.icon} />
                  </span>
                ),
              },
              { key: 'label', header: 'Nome', primary: true, render: (t) => t.label },
              {
                key: 'key',
                header: 'Chave',
                hideOnMobile: true,
                render: (t) => <code className="ms-adm__code">{t.key}</code>,
              },
              {
                key: 'usage',
                header: 'Em uso',
                align: 'end',
                render: (t) => t.usageCount,
              },
              { key: 'order', header: 'Ordem', align: 'end', render: (t) => t.order },
            ]}
            actions={(t) => (
              <RowActions
                label={t.label}
                onEdit={() => setEditing(t)}
                onRemove={() => setDeleting(t)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editing) && (
        <TagForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            invalidateTagQueries();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir tag"
          message={deleteMessage}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          loading={removing}
        />
      )}
    </div>
  );
}

function TagForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: MemberTagDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MemberTagInput>({
    label: initial?.label ?? '',
    icon: (initial?.icon as MemberTagIcon | null) ?? null,
    order: initial?.order ?? 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  // Clicar no ícone já selecionado limpa a escolha (a tag cai no ícone padrão).
  const pickIcon = (icon: MemberTagIcon) =>
    setForm((f) => ({ ...f, icon: f.icon === icon ? null : icon }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = memberTagSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (initial) await adminApi.memberTags.update(initial.id, parsed.data);
      else await adminApi.memberTags.create(parsed.data);
      toast.success('Tag salva.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Editar tag' : 'Nova tag'}
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
        <Field
          label="Nome da tag"
          required
          error={errors.label}
          hint={initial ? `Chave: ${initial.key} (não muda ao renomear)` : undefined}
        >
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            maxLength={40}
            autoFocus
          />
        </Field>

        <FieldGroup
          label="Ícone"
          hint="Clique no ícone escolhido de novo para voltar ao padrão."
          error={errors.icon}
        >
          <div className="ms-iconpick">
            {MEMBER_TAG_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={cx(
                  'ms-iconpick__item',
                  form.icon === icon && 'ms-iconpick__item--active',
                )}
                aria-label={ICON_LABELS[icon]}
                aria-pressed={form.icon === icon}
                title={ICON_LABELS[icon]}
                onClick={() => pickIcon(icon)}
              >
                <TagIcon icon={icon} />
              </button>
            ))}
          </div>
        </FieldGroup>

        <Field
          label="Ordem"
          hint="Define a posição do filtro na página Equipe."
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
      </form>
    </Modal>
  );
}
