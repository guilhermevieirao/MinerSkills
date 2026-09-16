import { useId, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/format';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  /** Contador ao lado do rótulo (pendências). */
  badge?: number;
}

/**
 * Abas (troca de VISÃO da mesma tela — painel). Padrão WAI-ARIA `tablist`:
 * setas ←/→ movem e ativam, Home/End vão às pontas. Para FILTRAR um conjunto,
 * use `FilterChip`/`ChipRow`. Só o painel usa `role="tablist"` — a suíte a11y
 * proíbe o papel nos chips do site.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
  children,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Nome acessível do conjunto de abas. */
  label: string;
  className?: string;
  /** Conteúdo da aba ativa (opcional; pode ser renderizado fora). */
  children?: ReactNode;
}) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = items.findIndex((t) => t.key === value);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    const target = items[next];
    if (!target) return;
    onChange(target.key);
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-tab-${target.key}`)}`)
      ?.focus();
  };

  return (
    <>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={cx('ms-tabs', className)}
      >
        {items.map((t) => {
          const selected = t.key === value;
          return (
            <button
              key={t.key}
              id={`${id}-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              className="ms-tabs__tab"
              onClick={() => onChange(t.key)}
              onKeyDown={onKeyDown}
            >
              {t.icon && <t.icon aria-hidden />}
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="ms-tabs__badge" aria-label={`${t.badge} pendentes`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${value}`}
        className="ms-tabs__panel"
      >
        {children}
      </div>
    </>
  );
}
