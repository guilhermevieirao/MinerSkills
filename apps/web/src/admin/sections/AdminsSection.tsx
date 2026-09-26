import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react';
import {
  adminUserSchema,
  adminUserCreateSchema,
  type AdminUserDTO,
  type AdminUserInput,
  type AdminUserCreateInput,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { useAdminMe } from '../useAdminAuth';
import { Button, EmptyState, Field, Input, Tag } from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { Avatar } from '../../components/ui/Avatar';
import { DateText } from '../../components/ui/DateText';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';

const ADMINS_QUERY_KEY = ['admin-admins'];

export function AdminsSection() {
  const admins = useQuery({
    queryKey: ADMINS_QUERY_KEY,
    queryFn: adminApi.admins.list,
  });
  const { data: me } = useAdminMe();
  const [editing, setEditing] = useState<AdminUserDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUserDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ADMINS_QUERY_KEY });
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.admins.remove(deleting.id);
      setDeleting(null);
      toast.success('Administrador removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  const newAdmin = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo administrador
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Administradores"
        description="Quem pode entrar no painel."
        actions={newAdmin}
      />

      <QueryState
        query={admins}
        skeleton={<ListSkeleton rows={3} lead={40} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<ShieldCheck />}
            title="Nenhum administrador cadastrado"
            description="Dê acesso ao painel a quem cuida do site."
            action={newAdmin}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Administradores do painel"
            rows={list}
            rowKey={(a) => a.id}
            rowLabel={(a) => a.name}
            columns={[
              {
                key: 'avatar',
                header: 'Avatar',
                hideHeader: true,
                lead: true,
                width: '56px',
                render: (a) => <Avatar name={a.name} size="sm" />,
              },
              {
                key: 'name',
                header: 'Nome',
                primary: true,
                render: (a) =>
                  a.id === me?.id ? (
                    <>
                      {a.name} <Tag tone="neutral">Você</Tag>
                    </>
                  ) : (
                    a.name
                  ),
              },
              {
                key: 'email',
                header: 'E-mail',
                render: (a) => <span className="ms-adm__muted">{a.email}</span>,
              },
              {
                key: 'created',
                header: 'Criado em',
                hideOnMobile: true,
                render: (a) => <DateText iso={a.createdAt} format="short" />,
              },
            ]}
            actions={(a) => (
              <RowActions
                label={a.name}
                onEdit={() => setEditing(a)}
                // a própria conta não pode ser excluída (a API também barra)
                onRemove={a.id === me?.id ? undefined : () => setDeleting(a)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editing) && (
        <AdminForm
          initial={editing}
          isMe={!!editing && editing.id === me?.id}
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
          title="Remover acesso ao painel"
          message={`"${deleting.name}" (${deleting.email}) não conseguirá mais entrar no painel. A exclusão não pode ser desfeita.`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          loading={removing}
        />
      )}
    </div>
  );
}

function AdminForm({
  initial,
  isMe,
  onClose,
  onSaved,
}: {
  initial: AdminUserDTO | null;
  /**
   * Editando a própria conta: o topo do painel precisa refletir o novo nome/e-mail
   * e a senha fica de fora — muda só em Minha conta (a API responde 403 aqui).
   */
  isMe: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: AdminUserInput = {
      name: form.name,
      email: form.email.trim(),
      // na edição, senha em branco significa "manter a atual"; na criação ela
      // segue como string vazia para o `.min(10)` acusar em português (com
      // `undefined` o zod responderia "Required")
      password: initial && form.password === '' ? undefined : form.password,
    };
    const parsed = (initial ? adminUserSchema : adminUserCreateSchema).safeParse(
      candidate,
    );
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (initial) {
        await adminApi.admins.update(initial.id, parsed.data);
        // a API reemite o cookie com o novo nome/e-mail; o topo do painel lê o /me
        if (isMe) void queryClient.invalidateQueries({ queryKey: ['admin-me'] });
      } else {
        // sem `initial` o parse usou adminUserCreateSchema: a senha é string garantida
        await adminApi.admins.create(parsed.data as AdminUserCreateInput);
      }
      toast.success('Administrador salvo.');
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: err.message });
        requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Editar administrador' : 'Novo administrador'}
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
            autoComplete="off"
            autoFocus
          />
        </Field>

        <Field label="E-mail" required error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            maxLength={200}
            autoComplete="off"
          />
        </Field>

        {isMe ? (
          <p className="ms-adm__muted">Para alterar a sua senha, use Minha conta.</p>
        ) : (
          <Field
            label="Senha"
            required={!initial}
            optional={!!initial}
            error={errors.password}
            hint={
              initial
                ? 'Deixe em branco para manter a senha atual.'
                : 'Mínimo de 10 caracteres.'
            }
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              maxLength={200}
              autoComplete="new-password"
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
