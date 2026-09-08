import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import {
  contactMessageSchema,
  HONEYPOT_FIELD,
  type ContactKind,
  type ContactMessageInput,
} from '@minerskills/shared';
import { Button, Field, Input, Textarea } from '../ui';
import { useToast } from '../ui/Toast';
import { useSendMessage } from '../../features/contact/useContact';
import { ApiError } from '../../lib/api';
import './ContactForm.scss';

const SUCCESS: Record<ContactKind, string> = {
  inscricao: 'Inscrição enviada! Entraremos em contato.',
  contato: 'Recebemos sua mensagem. Obrigado!',
};

/**
 * Formulário público de contato ou de inscrição no processo seletivo. Valida
 * com o mesmo schema da API (erro por campo) e, depois do envio, substitui os
 * campos pela confirmação. O campo-armadilha (`HONEYPOT_FIELD`) fica fora da
 * tela via CSS — nunca `type="hidden"`, senão os robôs o ignoram.
 */
export function ContactForm({
  kind,
  title,
  onSent,
}: {
  kind: ContactKind;
  title?: string;
  onSent?: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [message, setMessage] = useState('');
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const send = useSendMessage();
  const toast = useToast();

  const isApplication = kind === 'inscricao';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: ContactMessageInput = {
      kind,
      name,
      email,
      phone: phone.trim() || null,
      school: isApplication ? school.trim() || null : null,
      grade: isApplication ? grade.trim() || null : null,
      message,
      ...(trap ? { [HONEYPOT_FIELD]: trap } : {}),
    };
    const parsed = contactMessageSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError(null);
    try {
      await send.mutateAsync(parsed.data);
      setSent(true);
      toast.success(SUCCESS[kind]);
      onSent?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível enviar. Tente novamente.';
      // 409 = inscrições fechadas: a mensagem da API fica visível no formulário
      if (err instanceof ApiError && err.status === 409) setApiError(msg);
      toast.error(msg);
    }
  };

  if (sent) {
    return (
      <div className="ms-contact ms-contact--done" role="status">
        <CheckCircle2 aria-hidden />
        <h2 className="ms-contact__title">{SUCCESS[kind]}</h2>
        <p>Assim que possível alguém da equipe responde pelo e-mail informado.</p>
      </div>
    );
  }

  return (
    <form className="ms-contact" onSubmit={submit} noValidate>
      {title && <h2 className="ms-contact__title">{title}</h2>}

      <div className="ms-contact__row">
        <Field label="Nome" error={errors.name}>
          <Input
            value={name}
            maxLength={120}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <Input
            type="email"
            value={email}
            maxLength={200}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>

      <div className="ms-contact__row">
        <Field label="Telefone (opcional)" error={errors.phone}>
          <Input
            type="tel"
            value={phone}
            maxLength={30}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        {isApplication && (
          <Field label="Escola" error={errors.school}>
            <Input
              value={school}
              maxLength={160}
              onChange={(e) => setSchool(e.target.value)}
            />
          </Field>
        )}
      </div>

      {isApplication && (
        <Field label="Série/ano" hint="Ex.: 1º ano do ensino médio" error={errors.grade}>
          <Input
            value={grade}
            maxLength={40}
            onChange={(e) => setGrade(e.target.value)}
          />
        </Field>
      )}

      <Field
        label="Mensagem"
        hint={
          isApplication
            ? 'Conte por que quer entrar na equipe e o que gosta de fazer.'
            : undefined
        }
        error={errors.message}
      >
        <Textarea
          value={message}
          maxLength={3000}
          rows={6}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

      {/* campo-armadilha: visitantes não veem nem alcançam pelo teclado */}
      <input
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="ms-contact__hp"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />

      {apiError && (
        <p className="ms-contact__error" role="alert">
          {apiError}
        </p>
      )}

      <div className="ms-contact__actions">
        <Button type="submit" loading={send.isPending}>
          <Send /> Enviar
        </Button>
      </div>
    </form>
  );
}
