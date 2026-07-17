import { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { loginSchema } from '@minerskills/shared';
import { useLogin } from './useAdminAuth';
import { Button, Input, Field } from '../components/ui';
import { LogoBadge } from '../components/brand/Logo';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const login = useLogin();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await login.mutateAsync(parsed.data);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha no login.');
    }
  };

  return (
    <div className="ms-login">
      <form className="ms-login__card" onSubmit={submit}>
        <LogoBadge className="ms-login__logo" />
        <h1 className="ms-login__title">Painel MinerSkills</h1>
        <p className="ms-login__sub">
          <ShieldCheck /> Área administrativa restrita
        </p>

        <Field label="E-mail" error={errors.email}>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Senha" error={errors.password}>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {formError && <p className="ms-login__error">{formError}</p>}

        <Button type="submit" block size="lg" loading={login.isPending}>
          <LogIn /> Entrar
        </Button>
      </form>
    </div>
  );
}
