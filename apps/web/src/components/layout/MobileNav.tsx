import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { LogoMark } from '../brand/Logo';
import { FOOTER_ITEMS } from './navItems';
import './MobileNav.scss';

const ALL = FOOTER_ITEMS;

/** Id do drawer — referenciado pelo `aria-controls` do botão de menu da Navbar. */
export const MOBILE_NAV_ID = 'ms-mobilenav';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  // Enquanto aberto, Tab cicla dentro do drawer, Esc fecha e o foco volta ao botão de menu.
  useFocusTrap(panelRef, open, { onEscape: onClose });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="ms-mobilenav__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            id={MOBILE_NAV_ID}
            className="ms-mobilenav"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="ms-mobilenav__head">
              <LogoMark className="ms-mobilenav__logo" />
              <button className="ms-mobilenav__close" onClick={onClose} aria-label="Fechar menu">
                <X />
              </button>
            </div>
            <nav className="ms-mobilenav__links" aria-label="Navegação principal">
              {ALL.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx('ms-mobilenav__link', isActive && 'ms-mobilenav__link--active')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
