import { AnimatePresence, motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';
import { LogoMark } from '../brand/Logo';
import { FOOTER_ITEMS } from './navItems';
import './MobileNav.scss';

const ALL = FOOTER_ITEMS;

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            className="ms-mobilenav"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Menu"
          >
            <div className="ms-mobilenav__head">
              <LogoMark className="ms-mobilenav__logo" />
              <button className="ms-mobilenav__close" onClick={onClose} aria-label="Fechar menu">
                <X />
              </button>
            </div>
            <nav className="ms-mobilenav__links">
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
