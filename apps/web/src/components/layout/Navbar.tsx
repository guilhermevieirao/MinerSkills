import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cx } from '../../lib/format';
import { LogoWordmark } from '../brand/Logo';
import { LinkButton } from '../ui';
import { NAV_ITEMS, JOIN_ITEM } from './navItems';
import { MobileNav, MOBILE_NAV_ID } from './MobileNav';
import './Navbar.scss';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className={cx('ms-nav', scrolled && 'ms-nav--solid')}>
        <div className="ms-nav__inner">
          <NavLink to="/" className="ms-nav__brand" aria-label="MinerSkills — início">
            <LogoWordmark className="ms-nav__logo" />
          </NavLink>

          <nav className="ms-nav__links" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cx('ms-nav__link', isActive && 'ms-nav__link--active')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-nav__actions">
            <LinkButton to={JOIN_ITEM.to} size="sm" className="ms-nav__cta">
              {JOIN_ITEM.label}
            </LinkButton>
            <button
              className="ms-nav__burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls={MOBILE_NAV_ID}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
