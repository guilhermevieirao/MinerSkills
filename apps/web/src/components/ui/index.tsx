import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2 } from 'lucide-react';
import { cx } from '../../lib/format';
import './ui.scss';

// ── Button ──
type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        'ms-btn',
        `ms-btn--${variant}`,
        size !== 'md' && `ms-btn--${size}`,
        block && 'ms-btn--block',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="ms-spinner" aria-hidden />}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: ReactNode;
  external?: boolean;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  external,
}: LinkButtonProps) {
  const cls = cx(
    'ms-btn',
    `ms-btn--${variant}`,
    size !== 'md' && `ms-btn--${size}`,
    block && 'ms-btn--block',
    className,
  );
  if (external) {
    return (
      <a href={to} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

// ── SectionHeading ──
export function SectionHeading({
  kicker,
  title,
  subtitle,
  center,
  className,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('ms-heading', center && 'ms-heading--center', className)}>
      {kicker && <span className="ms-heading__kicker">{kicker}</span>}
      <h2 className="ms-heading__title">{title}</h2>
      {subtitle && <p className="ms-heading__subtitle">{subtitle}</p>}
    </div>
  );
}

// ── Card ──
export function Card({
  hover,
  className,
  children,
  ...rest
}: { hover?: boolean; children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('ms-card', hover && 'ms-card--hover', className)} {...rest}>
      {children}
    </div>
  );
}

// ── FilterChip ──
export function FilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cx('ms-chip', active && 'ms-chip--active')}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// ── Tag ──
export function Tag({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: 'solid' | 'muted';
}) {
  return <span className={cx('ms-tag', variant && `ms-tag--${variant}`)}>{children}</span>;
}

// ── Inputs ──
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} className={cx('ms-input', props.className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return <textarea ref={ref} className={cx('ms-textarea', props.className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select(props, ref) {
    return <select ref={ref} className={cx('ms-select', props.className)} {...props} />;
  },
);

/**
 * Campo de formulário: associa automaticamente o <label> ao controle filho
 * (injeta um `id` gerado quando o filho ainda não tem um) e conecta a
 * mensagem de erro via aria-describedby/aria-invalid.
 */
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  const autoId = useId();
  const describedById = `${autoId}-desc`;

  let controlId = htmlFor;
  let content = children;

  if (!controlId && isValidElement(children)) {
    const childProps = children.props as { id?: string };
    controlId = childProps.id ?? autoId;
    content = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: controlId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': hint || error ? describedById : undefined,
    });
  }

  return (
    <div className="ms-field">
      {label && (
        <label className="ms-field__label" htmlFor={controlId}>
          {label}
        </label>
      )}
      {content}
      {hint && !error && (
        <span className="ms-field__hint" id={describedById}>
          {hint}
        </span>
      )}
      {error && (
        <span className="ms-field__error" id={describedById}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Feedback ──
export function Spinner() {
  return <span className="ms-spinner" aria-label="Carregando" />;
}

export function Loader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="ms-loader">
      <Loader2 className="ms-spinner" style={{ border: 'none' }} />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: number }) {
  return (
    <span
      className="ms-skeleton"
      style={{
        display: 'block',
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
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ms-empty">
      {icon ?? <Inbox />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
