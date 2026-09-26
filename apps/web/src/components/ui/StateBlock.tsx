import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cx } from '../../lib/format';
import './ui-extras.scss';

export interface StateBlockProps {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  actions?: ReactNode;
  /** `error` troca a cor do ícone; `neutral` é o vazio. */
  tone?: 'neutral' | 'error';
  /** Bloco baixo para dentro de cards e painéis. */
  size?: 'sm';
  /** Faixa de uma linha, para blocos que já têm conteúdo de fallback. */
  compact?: boolean;
  /** Papel ARIA (`alert` para erro, nada para vazio). */
  role?: 'alert' | 'status';
  titleAs?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

/**
 * Bloco de estado de uma área da página — vazio ou erro — com a mesma altura nos
 * dois casos: a tela não pula quando o esqueleto dá lugar a um deles. `EmptyState`
 * e `ErrorState` são fachadas deste componente.
 */
export function StateBlock({
  icon,
  title,
  text,
  actions,
  tone = 'neutral',
  size,
  compact,
  role,
  titleAs,
  className,
}: StateBlockProps) {
  const TitleTag = titleAs ?? (compact ? 'p' : 'h3');
  const decoratedIcon = isValidElement(icon)
    ? cloneElement(icon as ReactElement<Record<string, unknown>>, {
        className: cx('ms-state__icon', (icon.props as { className?: string }).className),
        'aria-hidden': true,
      })
    : icon;
  return (
    <div
      className={cx(
        'ms-state',
        tone === 'error' && 'ms-state--error',
        size && `ms-state--${size}`,
        compact && 'ms-state--compact',
        className,
      )}
      role={role}
    >
      {decoratedIcon}
      <TitleTag className="ms-state__title">{title}</TitleTag>
      {text && <p className="ms-state__text">{text}</p>}
      {actions && <div className="ms-state__actions">{actions}</div>}
    </div>
  );
}
