import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';
import { HexPattern } from '../motion/HexPattern';
import { cx } from '../../lib/format';

/**
 * Tela inteira de mensagem — 404, erro de rota, conteúdo não encontrado. O
 * título é o h1 de verdade; o `code` ("404") é marca d'água decorativa.
 */
export function FullScreenMessage({
  code,
  codeClassName,
  title,
  text,
  actions,
  links,
  className,
}: {
  code?: string;
  /** Classe extra na marca d'água (a suíte e2e lê `.ms-404__code`). */
  codeClassName?: string;
  title: ReactNode;
  text?: ReactNode;
  actions?: ReactNode;
  /** Atalhos secundários (rotas prováveis). */
  links?: { to: string; label: string }[];
  className?: string;
}) {
  return (
    <section className={cx('ms-fullmsg', className)}>
      <HexPattern />
      {code && (
        <span className={cx('ms-fullmsg__code', codeClassName)} aria-hidden>
          {code}
        </span>
      )}
      <div className="ms-fullmsg__inner">
        <LogoMark className="ms-fullmsg__mark" decorative />
        <h1 className="ms-fullmsg__title">{title}</h1>
        {text && <p className="ms-fullmsg__text">{text}</p>}
        {actions && <div className="ms-fullmsg__actions">{actions}</div>}
        {links && links.length > 0 && (
          <nav className="ms-fullmsg__links" aria-label="Atalhos">
            {links.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
