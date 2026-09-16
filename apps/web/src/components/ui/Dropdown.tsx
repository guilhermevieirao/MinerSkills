import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/format';

const ITEMS = 'a[href], button:not([disabled])';

/** Seguir um link ou acionar uma ação do menu fecha o painel. */
const DropdownContext = createContext<() => void>(() => {});

/**
 * Menu de revelação (disclosure) sem biblioteca: botão com `aria-expanded` /
 * `aria-controls`, painel com links ou ações. Fecha com Escape (devolvendo o
 * foco ao botão), com clique fora e ao trocar de rota; setas ↑/↓ percorrem os
 * itens, Home/End vão às pontas. `hoverOpen` abre também ao pousar o ponteiro
 * (com intenção de 120 ms) — só para a navbar em telas com mouse.
 */
export function Dropdown({
  label,
  children,
  icon: Icon,
  align = 'left',
  cols,
  hoverOpen,
  active,
  className,
  triggerClassName,
  menuClassName,
  menuLabel,
}: {
  label: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  align?: 'left' | 'right';
  /** Painel em duas colunas (grupos grandes). */
  cols?: 2;
  hoverOpen?: boolean;
  /** Um dos itens é a rota atual: o gatilho fica marcado. */
  active?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  /** Nome acessível do painel quando o rótulo do gatilho não basta. */
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const menuId = useId();
  const { pathname } = useLocation();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Trocar de rota fecha o menu (um item foi seguido)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Clique/toque fora fecha
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (!open) return;
      e.preventDefault();
      close(true);
      return;
    }
    if (
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        // o painel entra no próximo frame; foca o primeiro item depois
        requestAnimationFrame(() => items()[0]?.focus());
        return;
      }
      const list = items();
      if (list.length === 0) return;
      const current = list.indexOf(document.activeElement as HTMLElement);
      let next = 0;
      if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % list.length;
      if (e.key === 'ArrowUp') next = current <= 0 ? list.length - 1 : current - 1;
      if (e.key === 'End') next = list.length - 1;
      list[next]?.focus();
    }
  };

  const hoverProps = hoverOpen
    ? {
        onPointerEnter: (e: React.PointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setOpen(true), 120);
        },
        onPointerLeave: (e: React.PointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setOpen(false), 200);
        },
      }
    : {};

  // O contêiner só delega o teclado (setas/Escape) do gatilho e dos itens —
  // não é um controle: `presentation` deixa isso explícito.
  return (
    <div
      ref={rootRef}
      role="presentation"
      className={cx('ms-dropdown', open && 'ms-dropdown--open', className)}
      onKeyDown={onKeyDown}
      {...hoverProps}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cx(
          'ms-dropdown__trigger',
          active && 'ms-dropdown__trigger--active',
          triggerClassName,
        )}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && <Icon aria-hidden />}
        <span>{label}</span>
        <ChevronDown className="ms-dropdown__chevron" aria-hidden />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        role="group"
        aria-label={menuLabel}
        hidden={!open}
        className={cx(
          'ms-dropdown__menu',
          align === 'right' && 'ms-dropdown__menu--right',
          cols === 2 && 'ms-dropdown__menu--cols',
          menuClassName,
        )}
      >
        <DropdownContext.Provider value={close}>{children}</DropdownContext.Provider>
      </div>
    </div>
  );
}

/** Link de navegação dentro do menu (ícone, rótulo e descrição opcional). */
export function DropdownItem({
  to,
  icon: Icon,
  label,
  description,
  end,
}: {
  to: string;
  icon?: LucideIcon;
  label: string;
  description?: string;
  end?: boolean;
}) {
  const close = useContext(DropdownContext);
  // A descrição entra como aria-describedby, não no nome: o link continua
  // sendo "Blog", e o leitor de tela ouve a linha extra em seguida.
  const descId = useId();
  return (
    <NavLink
      to={to}
      end={end}
      className="ms-dropdown__item"
      onClick={() => close()}
      aria-describedby={description ? descId : undefined}
    >
      {Icon && <Icon aria-hidden />}
      <span>
        <span className="ms-dropdown__item-label">{label}</span>
        {description && (
          <span id={descId} className="ms-dropdown__item-desc" aria-hidden="true">
            {description}
          </span>
        )}
      </span>
    </NavLink>
  );
}

/** Ação (botão) dentro do menu — sair, alternar, etc. */
export function DropdownButton({
  icon: Icon,
  label,
  description,
  danger,
  className,
  onClick,
  ...rest
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  danger?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const close = useContext(DropdownContext);
  const descId = useId();
  return (
    <button
      type="button"
      className={cx(
        'ms-dropdown__item',
        danger && 'ms-dropdown__item--danger',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      aria-describedby={description ? descId : undefined}
      {...rest}
    >
      {Icon && <Icon aria-hidden />}
      <span>
        <span className="ms-dropdown__item-label">{label}</span>
        {description && (
          <span id={descId} className="ms-dropdown__item-desc" aria-hidden="true">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="ms-dropdown__sep" role="separator" />;
}
