import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  memberTagSchema,
  MEMBER_TAG_ICONS,
  type MemberTagDTO,
  type MemberTagInput,
  type MemberTagIcon,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { cx } from '../../lib/format';
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
  const { data, isLoading } = useQuery({
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
      ? `Remover a tag "${deleting.label}"? Ela está vinculada a ${deleting.usageCount} ${
          deleting.usageCount === 1 ? 'registro' : 'registros'
        }, que perderão essa tag.`
      : `Remover a tag "${deleting.label}"?`
    : '';

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Tags da equipe</h1>
          <p>Categorias usadas para classificar e filtrar os membros.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nova tag
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma tag cadastrada"
          description="Crie tags para classificar os membros e gerar os filtros da página Equipe."
        />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Chave</th>
                <th>Em uso</th>
                <th>Ordem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="ms-adm__icon-cell">
                      <TagIcon icon={t.icon} />
                    </span>
                  </td>
                  <td>{t.label}</td>
                  <td>
                    <code className="ms-adm__code">{t.key}</code>
                  </td>
                  <td>{t.usageCount}</td>
                  <td>{t.order}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(t)}>
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
  const toast = useToast();

  // Clicar no ícone já selecionado limpa a escolha (a tag cai no ícone padrão).
  const pickIcon = (icon: MemberTagIcon) =>
    setForm((f) => ({ ...f, icon: f.icon === icon ? null : icon }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = memberTagSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
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
    <Modal title={initial ? 'Editar tag' : 'Nova tag'} onClose={onClose}>
      <form onSubmit={save}>
        <Field
          label="Nome da tag"
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

        <div className="ms-field">
          <span className="ms-field__label">Ícone</span>
          <div className="ms-iconpick" role="group" aria-label="Ícone da tag">
            {MEMBER_TAG_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={cx('ms-iconpick__item', form.icon === icon && 'ms-iconpick__item--active')}
                aria-label={ICON_LABELS[icon]}
                aria-pressed={form.icon === icon}
                title={ICON_LABELS[icon]}
                onClick={() => pickIcon(icon)}
              >
                <TagIcon icon={icon} />
              </button>
            ))}
          </div>
          {errors.icon && <span className="ms-field__error">{errors.icon}</span>}
        </div>

        <Field label="Ordem" hint="Define a posição do filtro na página Equipe." error={errors.order}>
          <Input
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </Field>

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
