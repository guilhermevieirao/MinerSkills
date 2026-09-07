import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleUserRound, KeyRound } from 'lucide-react';
import { changePasswordSchema } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { useAdminMe } from '../useAdminAuth';
import { Button, Input, Field } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import './AccountSection.scss';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirm: '' };

export function AccountSection() {
  const { data: me } = useAdminMe();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    // a confirmação existe só no cliente: evita gravar uma senha digitada errado
    const mismatch = form.confirm !== form.newPassword;
    if (!parsed.success || mismatch) {
      const errs: Record<string, string> = {};
      if (!parsed.success) {
        for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      }
      if (mismatch) errs.confirm = 'As senhas não coincidem';
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await adminApi.auth.changePassword(parsed.data);
      toast.success('Senha alterada.');
      setForm(EMPTY_FORM);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErrors({ currentPassword: err.message });
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao alterar a senha.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Minha conta</h1>
          <p>Seus dados de acesso ao painel.</p>
        </div>
      </div>

      <div className="ms-account">
        <section className="ms-account__card" aria-labelledby="ms-account-profile">
          <h2 id="ms-account-profile">Perfil</h2>
          <div className="ms-account__profile">
            <span className="ms-account__avatar" aria-hidden>
              <CircleUserRound />
            </span>
            <div>
              <span className="ms-account__name">{me?.name}</span>
              <span className="ms-account__email">{me?.email}</span>
            </div>
          </div>
          <p className="ms-account__hint">
            Nome e e-mail são editados em <Link to="/admin/administradores">Administradores</Link>.
          </p>
        </section>

        <section className="ms-account__card" aria-labelledby="ms-account-password">
          <h2 id="ms-account-password">
            <KeyRound /> Alterar senha
          </h2>
          <p className="ms-account__hint">
            Use pelo menos 10 caracteres. Sua sessão continua ativa depois da troca.
          </p>
          <form onSubmit={submit}>
            <Field label="Senha atual" error={errors.currentPassword}>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                maxLength={200}
              />
            </Field>
            <Field label="Nova senha" error={errors.newPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                maxLength={200}
              />
            </Field>
            <Field label="Confirmar nova senha" error={errors.confirm}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                maxLength={200}
              />
            </Field>
            <div className="ms-account__actions">
              <Button type="submit" loading={saving}>
                Alterar senha
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
