import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type FieldsetHTMLAttributes,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronDown, Inbox, Search } from 'lucide-react';
import { cx } from '../../lib/format';
import { StateBlock } from './StateBlock';
import { TextReveal } from '../motion/TextReveal';
import './ui.scss';

// ── Button ──
/** `link`: texto verde com seta que avança no hover ("Saiba mais ›") — ação secundária de vitrine. */
type Variant = 'primary' | 'outline' | 'ghost' | 'link' | 'danger' | 'danger-solid';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Em andamento: reserva a largura, mostra o spinner sobre o rótulo e desabilita. */
  loading?: boolean;
  /** Botão quadrado só com ícone — exige `aria-label`. */
  iconOnly?: boolean;
}

function buttonClasses(
  variant: Variant,
  size: Size,
  opts: { block?: boolean; iconOnly?: boolean; loading?: boolean; className?: string },
) {
  return cx(
    'ms-btn',
    `ms-btn--${variant}`,
    size !== 'md' && `ms-btn--${size}`,
    opts.block && 'ms-btn--block',
    opts.iconOnly && 'ms-btn--icon',
    opts.loading && 'ms-btn--loading',
    opts.className,
  );
}

/** `forwardRef`: quem abre um painel pode devolver o foco ao botão depois. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block,
    loading,
    iconOnly,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses(variant, size, { block, iconOnly, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="ms-btn__spinner" aria-hidden>
          <span className="ms-spinner" />
        </span>
      )}
      {children}
    </button>
  );
});

/** Açúcar para botão só de ícone (o `aria-label` é obrigatório). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'iconOnly'> & { 'aria-label': string }
>(function IconButton(props, ref) {
  return <Button ref={ref} iconOnly variant={props.variant ?? 'ghost'} {...props} />;
});

interface LinkButtonProps {
  /** Rota interna (react-router). */
  to?: string;
  /** Âncora nativa (download, mailto:, tel:). Com `external`, abre em nova aba. */
  href?: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  iconOnly?: boolean;
  className?: string;
  children: ReactNode;
  external?: boolean;
  download?: boolean | string;
  /** Marca a rota atual (`aria-current="page"`). */
  active?: boolean;
  'aria-label'?: string;
  onClick?: () => void;
}

export function LinkButton({
  to,
  href,
  variant = 'primary',
  size = 'md',
  block,
  iconOnly,
  className,
  children,
  external,
  download,
  active,
  onClick,
  ...aria
}: LinkButtonProps) {
  const cls = buttonClasses(variant, size, { block, iconOnly, className });
  const target = href ?? to ?? '#';
  if (external || href !== undefined) {
    return (
      <a
        href={target}
        className={cls}
        onClick={onClick}
        download={download}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...aria}
      >
        {children}
        {external && <span className="ms-visually-hidden"> (abre em nova aba)</span>}
      </a>
    );
  }
  return (
    <Link
      to={target}
      className={cls}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      {...aria}
    >
      {children}
    </Link>
  );
}

// ── SectionHeading ──
export function SectionHeading({
  title,
  subtitle,
  center,
  className,
  as: Tag = 'h2',
  size,
  dense,
  actions,
  tone,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
  className?: string;
  /** Nível semântico do título; o tamanho visual vem de `size`. */
  as?: 'h1' | 'h2' | 'h3';
  size?: 'sm' | 'lg';
  /** Menos margem abaixo (blocos compactos). */
  dense?: boolean;
  /** Ações à direita do título (botões, links). */
  actions?: ReactNode;
  /** Sobre superfície verde (CTA). */
  tone?: 'on-green';
  id?: string;
}) {
  return (
    <div
      className={cx(
        'ms-heading',
        center && 'ms-heading--center',
        size && `ms-heading--${size}`,
        dense && 'ms-heading--dense',
        actions ? 'ms-heading--row' : null,
        tone && `ms-heading--${tone}`,
        className,
      )}
    >
      <div className="ms-heading__text">
        <Tag className="ms-heading__title" id={id}>
          {/* texto simples entra palavra a palavra ao aparecer na tela */}
          {typeof title === 'string' ? <TextReveal text={title} /> : title}
        </Tag>
        {subtitle && <p className="ms-heading__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ms-heading__actions">{actions}</div>}
    </div>
  );
}

// ── Card ──
export function Card({
  hover,
  interactive,
  selected,
  pad,
  className,
  children,
  as: Tag = 'div',
  ...rest
}: {
  /** @deprecated use `interactive` */
  hover?: boolean;
  /** Levanta ao passar o mouse — só para cards que navegam. */
  interactive?: boolean;
  selected?: boolean;
  pad?: 'sm' | 'md' | 'none';
  as?: 'div' | 'article' | 'li' | 'section';
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cx(
        'ms-card',
        (hover || interactive) && 'ms-card--interactive',
        selected && 'ms-card--selected',
        pad === 'sm' && 'ms-card--pad-sm',
        pad === 'none' && 'ms-card--flush',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ── FilterChip / ChipRow ──
export function FilterChip({
  active,
  children,
  onClick,
  disabled,
  count,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Contagem à direita do rótulo. */
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx('ms-chip', active && 'ms-chip--active', className)}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      {children}
      {count !== undefined && <span className="ms-chip__count">{count}</span>}
    </button>
  );
}

/** Grupo de chips com rótulo acessível; `scroll` vira uma linha rolável no celular. */
export function ChipRow({
  label,
  visibleLabel,
  scroll,
  className,
  children,
}: {
  /** Nome do grupo para leitores de tela. */
  label: string;
  /** Mostra o rótulo também na tela (kicker à esquerda). */
  visibleLabel?: boolean;
  scroll?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('ms-chiprow', scroll && 'ms-chiprow--scroll', className)}
    >
      {visibleLabel && (
        <span className="ms-chiprow__label" aria-hidden>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

// ── Tag / StatusBadge ──
export type Tone =
  'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'on-green';

export function Tag({
  children,
  variant,
  tone,
  size,
  className,
  title,
}: {
  children: ReactNode;
  /** @deprecated `solid` → visual sólido da marca; `muted` → `tone="neutral"`. */
  variant?: 'solid' | 'muted';
  tone?: Tone;
  size?: 'lg';
  className?: string;
  title?: string;
}) {
  const resolved = tone ?? (variant === 'muted' ? 'neutral' : undefined);
  return (
    <span
      className={cx(
        'ms-tag',
        variant === 'solid' && 'ms-tag--solid',
        resolved && resolved !== 'brand' && `ms-tag--${resolved}`,
        size && `ms-tag--${size}`,
        className,
      )}
      title={title}
    >
      {children}
    </span>
  );
}

/** Estados de registro do painel e do site, com rótulo e tom únicos por status. */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  published: { label: 'Publicado', tone: 'success' },
  draft: { label: 'Rascunho', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  pending: { label: 'Pendente', tone: 'warning' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
  active: { label: 'Ativa', tone: 'success' },
  inactive: { label: 'Inativa', tone: 'neutral' },
  current: { label: 'Atual', tone: 'success' },
  former: { label: 'Antigo', tone: 'neutral' },
  new: { label: 'Nova', tone: 'success' },
  read: { label: 'Lida', tone: 'neutral' },
  archived: { label: 'Arquivada', tone: 'neutral' },
  open: { label: 'Aberta', tone: 'warning' },
  resolved: { label: 'Resolvida', tone: 'success' },
  yes: { label: 'Sim', tone: 'success' },
  no: { label: 'Não', tone: 'neutral' },
};

export type Status = keyof typeof STATUS;

/**
 * Pílula de status. Emite também `ms-adm__status ms-adm__status--<status>`: é o
 * gancho que a suíte e2e lê nas listagens do painel.
 */
export function StatusBadge({
  status,
  children,
}: {
  status: Status | string;
  children?: ReactNode;
}) {
  const meta = STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
  return (
    <Tag
      tone={meta.tone}
      className={`ms-status ms-adm__status ms-adm__status--${status}`}
    >
      {children ?? meta.label}
    </Tag>
  );
}

// ── Inputs ──
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { size?: never; compact?: boolean }
>(function Input({ className, compact, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx('ms-input', compact && 'ms-input--sm', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx('ms-textarea', className)} {...props} />;
});

/** `<select>` com o chevron do sistema (a seta nativa varia por SO e some no tema escuro). */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <span className="ms-select-wrap">
      <select ref={ref} className={cx('ms-select', className)} {...props} />
      <ChevronDown className="ms-select-wrap__icon" aria-hidden />
    </span>
  );
});

/** Campo de busca: ícone dentro do próprio campo, mesma altura dos botões. */
export const SearchField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function SearchField({ className, ...props }, ref) {
  return (
    <span className={cx('ms-search', className)}>
      <Search className="ms-search__icon" aria-hidden />
      <input ref={ref} type="search" className="ms-input ms-search__input" {...props} />
    </span>
  );
});

/** Interruptor: um `<input type="checkbox">` real, estilizado (o rótulo continua associado). */
export const Switch = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { children: ReactNode }
>(function Switch({ children, className, ...props }, ref) {
  return (
    <label className={cx('ms-switch', className)}>
      <input ref={ref} type="checkbox" className="ms-switch__input" {...props} />
      <span className="ms-switch__label">{children}</span>
    </label>
  );
});

/**
 * Campo de formulário: associa automaticamente o <label> ao controle filho
 * (injeta um `id` gerado quando o filho ainda não tem um) e conecta hint e erro
 * via aria-describedby/aria-invalid. O erro é uma região `alert` (leitor de tela
 * ouve na hora); o hint continua visível mesmo com erro.
 */
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  required,
  optional,
  orientation,
  visuallyHiddenLabel,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  /** Marca o controle como obrigatório (`aria-required`). */
  required?: boolean;
  /** Exibe "(opcional)" ao lado do rótulo — a convenção é marcar só o opcional. */
  optional?: boolean;
  orientation?: 'stack' | 'inline';
  /** Rótulo só para leitores de tela (ex.: campo de busca com placeholder). */
  visuallyHiddenLabel?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const hintId = `${autoId}-hint`;
  const errorId = `${autoId}-err`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  let controlId = htmlFor;
  let content = children;

  if (!controlId && isValidElement(children)) {
    const childProps = children.props as { id?: string };
    controlId = childProps.id ?? autoId;
    content = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: controlId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      'aria-required': required || undefined,
    });
  }

  return (
    <div
      className={cx(
        'ms-field',
        orientation === 'inline' && 'ms-field--inline',
        className,
      )}
    >
      {/* "(opcional)" fica FORA do <label>: é pista visual, não parte do nome do campo */}
      {label && (
        <span
          className={cx(
            'ms-field__labelrow',
            visuallyHiddenLabel && 'ms-visually-hidden',
          )}
        >
          <label className="ms-field__label" htmlFor={controlId}>
            {label}
          </label>
          {optional && (
            <span className="ms-field__optional" aria-hidden="true">
              (opcional)
            </span>
          )}
        </span>
      )}
      {content}
      {hint && (
        <span className="ms-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="ms-field__error" id={errorId} role="alert">
          <AlertCircle aria-hidden />
          {error}
        </span>
      )}
    </div>
  );
}

/** Grupo de controles com um rótulo só (chips, opções, upload): `fieldset` + `legend`. */
export function FieldGroup({
  label,
  hint,
  error,
  children,
  className,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
} & FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset className={cx('ms-fieldset', className)} {...rest}>
      <legend className="ms-field__label">{label}</legend>
      {children}
      {hint && <span className="ms-field__hint">{hint}</span>}
      {error && (
        <span className="ms-field__error" role="alert">
          <AlertCircle aria-hidden />
          {error}
        </span>
      )}
    </fieldset>
  );
}

// ── Form ──
/**
 * Formulário do kit: `noValidate` (a validação é o schema zod, igual à do
 * servidor — o balão nativo do navegador não entra) e espaçamento entre campos
 * pelo container, não pelo campo.
 */
export function Form({
  className,
  children,
  ...rest
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cx('ms-form', className)} noValidate {...rest}>
      {children}
    </form>
  );
}

/** Linha de 12 colunas; cada filho escolhe o `span` (`data-span="6"`, `"4"`, `"3"`…). */
export function FormRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx('ms-form__row', className)}>{children}</div>;
}

export function FormSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="ms-form__section">
      {title && <span className="ms-form__section-title">{title}</span>}
      {children}
    </div>
  );
}

export function FormActions({
  children,
  start,
}: {
  children: ReactNode;
  start?: ReactNode;
}) {
  return (
    <div className="ms-form__actions">
      {start && <div className="ms-form__actions-start">{start}</div>}
      {children}
    </div>
  );
}

/** Resumo de erros no topo do formulário (o foco vai ao primeiro campo inválido). */
export function FormSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="ms-form__summary" role="alert">
      <AlertCircle aria-hidden />
      <div>
        <strong>Verifique os campos destacados.</strong>
        <ul>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Feedback ──
export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return <span className="ms-spinner" role="status" aria-label={label} />;
}

export function Loader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="ms-loader" role="status">
      <span className="ms-spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({
  height = 20,
  width = '100%',
  radius,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
}) {
  return (
    <span
      className="ms-skeleton"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        borderRadius: radius,
      }}
    />
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  size,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Ação que resolve o vazio ("Novo post", "Limpar filtros"…). */
  action?: ReactNode;
  size?: 'sm';
}) {
  return (
    <StateBlock
      className="ms-empty"
      icon={icon ?? <Inbox />}
      title={title}
      text={description}
      actions={action}
      size={size}
    />
  );
}

export { StateBlock } from './StateBlock';
