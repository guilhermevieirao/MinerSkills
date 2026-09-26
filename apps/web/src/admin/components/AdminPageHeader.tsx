import type { ReactNode } from 'react';
import { cx } from '../../lib/format';

/**
 * Cabeçalho de seção do painel: título em escala de produto (Inter), descrição
 * curta e ações à direita — a ação primária da seção mora aqui, nunca dentro
 * do ramo de carregamento. Emite `ms-adm__head` (classe histórica das seções).
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('ms-adm__head', className)}>
      <div className="ms-adm__head-text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ms-adm__head-actions">{actions}</div>}
    </header>
  );
}
