import { useRef, useState } from 'react';
import { ArrowLeft, LogIn, ShieldCheck } from 'lucide-react';
import { loginSchema } from '@minerskills/shared';
import { useLogin } from './useAdminAuth';
import { Button, Field, Input } from '../components/ui';
import { LogoBadge } from '../components/brand/Logo';
import { ApiError } from '../lib/api';
import { fieldErrors, focusFirstInvalid } from '../lib/forms';
import { useDocumentHead } from '../lib/useDocumentHead';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const login = useLogin();

  useDocumentHead({ title: 'Entrar · Painel', noindex: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setErrors({});
    try {
      await login.mutateAsync(parsed.data);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível conectar ao servidor. Tente novamente.',
      );
      emailRef.current?.focus();
    }
  };

  return (
    <main className="ms-login">
      <form ref={formRef} className="ms-login__card ms-form" onSubmit={submit} noValidate>
        <div className="ms-login__head">
          <LogoBadge decorative className="ms-login__logo" />
          <h1 className="ms-login__title">Painel MinerSkills</h1>
          <p className="ms-login__sub">
            <ShieldCheck aria-hidden /> Área administrativa restrita
          </p>
        </div>

        {formError && (
          <p className="ms-login__error" role="alert">
            {formError}
          </p>
        )}

        <Field label="E-mail" error={errors.email}>
          <Input
            ref={emailRef}
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

        <Button type="submit" block size="lg" loading={login.isPending}>
          <LogIn aria-hidden /> Entrar
        </Button>

        <a href="/" className="ms-login__back">
          <ArrowLeft aria-hidden /> Voltar ao site
        </a>
      </form>
    </main>
  );
}
