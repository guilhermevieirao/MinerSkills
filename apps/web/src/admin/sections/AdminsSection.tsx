import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  adminUserSchema,
  adminUserCreateSchema,
  type AdminUserDTO,
  type AdminUserInput,
  type AdminUserCreateInput,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { useAdminMe } from '../useAdminAuth';
import { Button, Input, Field, Tag, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { formatDate } from '../../lib/format';
import { ApiError } from '../../lib/api';

const ADMINS_QUERY_KEY = ['admin-admins'];

export function AdminsSection() {
  const { data, isLoading } = useQuery({
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

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Administradores</h1>
          <p>Quem pode entrar no painel.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo administrador
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum administrador cadastrado" />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => {
                const isMe = a.id === me?.id;
                return (
                  <tr key={a.id} data-row={a.name}>
                    <td>
                      {a.name}
                      {isMe && (
                        <>
                          {' '}
                          <Tag variant="muted">Você</Tag>
                        </>
                      )}
                    </td>
                    <td>{a.email}</td>
                    <td>{formatDate(a.createdAt, 'dd/MM/yyyy')}</td>
                    <td>
                      <div className="ms-adm__row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${a.name}`}
                          onClick={() => setEditing(a)}
                        >
                          <Pencil />
                        </Button>
                        {/* A própria conta não pode ser excluída (a API também barra). */}
                        {!isMe && (
                          <Button
                            variant="danger"
                            size="sm"
                            aria-label={`Excluir ${a.name}`}
                            onClick={() => setDeleting(a)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
          message={`Remover o acesso de "${deleting.name}" (${deleting.email})? Essa pessoa não conseguirá mais entrar no painel.`}
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
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
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
    >
      <form onSubmit={save}>
        <Field label="Nome" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
            autoComplete="off"
            autoFocus
          />
        </Field>

        <Field label="E-mail" error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            maxLength={200}
            autoComplete="off"
          />
        </Field>

        {isMe ? (
          <p style={{ color: 'var(--ms-text-dim)', fontSize: 'var(--ms-text-sm)' }}>
            Para alterar a sua senha, use Minha conta.
          </p>
        ) : (
          <Field
            label="Senha"
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
