import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useScrollLock } from '../../lib/useScrollLock';
import { LogoMark } from '../brand/Logo';
import { LinkButton } from '../ui';
import {
  JOIN_ITEM,
  NAV_DIRECT,
  NAV_GROUPS,
  type NavGroup,
  type NavItem,
} from './navItems';
import './MobileNav.scss';

/** Id do drawer — alvo do `aria-controls` do botão de menu da Navbar. */
export const MOBILE_NAV_ID = 'ms-mobilenav';

/** Os mesmos grupos da navbar; os links diretos viram o grupo "Participe". */
const DRAWER_GROUPS: NavGroup[] = [
  ...NAV_GROUPS,
  { key: 'participe', label: 'Participe', items: NAV_DIRECT },
];

function DrawerLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) =>
          cx('ms-mobilenav__link', isActive && 'ms-mobilenav__link--active')
        }
      >
        <Icon aria-hidden />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

/**
 * Drawer de navegação (abaixo de 1024px). Fica SEMPRE montado — fechado, sai da
 * árvore de acessibilidade (`aria-hidden`, `inert`, `visibility: hidden`) — para
 * o `aria-controls` do botão de menu apontar a um id que existe. Aberto: diálogo
 * modal com armadilha de foco, Escape fecha e devolve o foco ao botão, rolagem do
 * fundo travada. Fecha ao seguir um link (a Navbar também fecha ao trocar de rota).
 */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, open, { onEscape: onClose });
  useScrollLock(open);

  // `inert` não está na tipagem do React 18; como atributo, a string vazia liga.
  const inert = open ? {} : ({ inert: '' } as Record<string, string>);

  return (
    <>
      <div
        className={cx('ms-mobilenav__overlay', open && 'ms-mobilenav__overlay--open')}
        role="presentation"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        id={MOBILE_NAV_ID}
        className={cx('ms-mobilenav', open && 'ms-mobilenav--open')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        {...inert}
      >
        <div className="ms-mobilenav__head">
          <span className="ms-mobilenav__brand">
            <LogoMark decorative className="ms-mobilenav__logo" />
            Menu
          </span>
          <button
            type="button"
            className="ms-mobilenav__close"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X aria-hidden />
          </button>
        </div>

        <nav className="ms-mobilenav__nav" aria-label="Navegação principal">
          {DRAWER_GROUPS.map((group) => {
            const headingId = `${MOBILE_NAV_ID}-${group.key}`;
            return (
              <section
                key={group.key}
                className="ms-mobilenav__group"
                aria-labelledby={headingId}
              >
                <h2 id={headingId} className="ms-mobilenav__kicker">
                  {group.label}
                </h2>
                <ul className="ms-mobilenav__list" role="list">
                  {group.items.map((item) => (
                    <DrawerLink key={item.to} item={item} onClose={onClose} />
                  ))}
                </ul>
              </section>
            );
          })}
        </nav>

        <div className="ms-mobilenav__foot">
          <LinkButton to={JOIN_ITEM.to} block onClick={onClose}>
            {JOIN_ITEM.label}
          </LinkButton>
        </div>
      </aside>
    </>
  );
}
