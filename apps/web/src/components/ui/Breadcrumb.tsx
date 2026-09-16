import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format';

export interface Crumb {
  label: string;
  /** Sem `to`, é o item atual. */
  to?: string;
}

/** Trilha "onde estou" — cabeçalhos de detalhe (tópico, post) e topbar do painel. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Você está aqui" className={className}>
      <ol className="ms-breadcrumb">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              className={cx('ms-breadcrumb__item', last && 'ms-breadcrumb__current')}
              aria-current={last ? 'page' : undefined}
            >
              {item.to && !last ? (
                <Link to={item.to} className="ms-breadcrumb__link">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              {!last && <ChevronRight className="ms-breadcrumb__sep" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
