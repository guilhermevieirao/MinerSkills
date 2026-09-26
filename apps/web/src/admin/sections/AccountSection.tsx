import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, UserRound } from 'lucide-react';
import { changePasswordSchema } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { useAdminMe } from '../useAdminAuth';
import { Button, Input, Field, Skeleton } from '../../components/ui';
import { Avatar } from '../../components/ui/Avatar';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { useToast } from '../../components/ui/Toast';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import './AccountSection.scss';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirm: '' };

export function AccountSection() {
  const { data: me } = useAdminMe();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hintId = useId();
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
      const errs: Record<string, string> = parsed.success
        ? {}
        : fieldErrors(parsed.error);
      if (mismatch) errs.confirm = 'As senhas não coincidem';
      setErrors(errs);
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
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
        requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao alterar a senha.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Minha conta"
        description="Seus dados de acesso ao painel."
      />

      <div className="ms-account">
        <section className="ms-account__card" aria-labelledby="ms-account-profile">
          <h2 id="ms-account-profile" className="ms-account__title">
            <UserRound aria-hidden /> Perfil
          </h2>
          {me ? (
            <div className="ms-account__profile">
              <Avatar name={me.name} size="lg" tone="brand" />
              <div className="ms-account__identity">
                <span className="ms-account__name">{me.name}</span>
                <span className="ms-account__email">{me.email}</span>
              </div>
            </div>
          ) : (
            <div className="ms-account__profile" aria-hidden>
              <Skeleton height={56} width={56} radius={28} />
              <div className="ms-account__identity">
                <Skeleton height={18} width={160} />
                <Skeleton height={14} width={220} />
              </div>
            </div>
          )}
          <p className="ms-account__hint">
            Nome e e-mail são editados em{' '}
            <Link to="/admin/administradores">Administradores</Link>.
          </p>
        </section>

        <section className="ms-account__card" aria-labelledby="ms-account-password">
          <h2 id="ms-account-password" className="ms-account__title">
            <KeyRound aria-hidden /> Alterar senha
          </h2>
          <p className="ms-account__hint" id={hintId}>
            Use pelo menos 10 caracteres. Sua sessão continua ativa depois da troca.
          </p>
          <form
            ref={formRef}
            className="ms-account__form"
            onSubmit={submit}
            noValidate
            aria-describedby={hintId}
          >
            <Field label="Senha atual" required error={errors.currentPassword}>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                maxLength={200}
              />
            </Field>
            <Field label="Nova senha" required error={errors.newPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                maxLength={200}
              />
            </Field>
            <Field label="Confirmar nova senha" required error={errors.confirm}>
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
