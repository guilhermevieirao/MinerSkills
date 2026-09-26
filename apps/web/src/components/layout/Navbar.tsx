import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cx } from '../../lib/format';
import { LogoWordmark } from '../brand/Logo';
import { LinkButton } from '../ui';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { JOIN_ITEM, NAV_DIRECT, NAV_GROUPS, isGroupActive } from './navItems';
import { MobileNav, MOBILE_NAV_ID } from './MobileNav';
import './Navbar.scss';

/**
 * Cabeçalho fixo do site. A partir de 1024px mostra o menu completo — dois
 * grupos com dropdown ("A equipe", "Conteúdo"), dois links diretos e a chamada
 * "Como entrar" — tudo dentro do mesmo `<nav aria-label="Navegação principal">`.
 * Abaixo disso ficam o logo, a chamada compacta e o botão que abre o drawer
 * (`MobileNav`), que carrega o outro `<nav>` com o mesmo nome: só um deles é
 * visível de cada vez.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // recolhe ao rolar para baixo (o conteúdo ganha a tela) e volta ao subir
  const [tucked, setTucked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      if (Math.abs(y - lastY) > 6) {
        setTucked(y > lastY && y > 480);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const joinActive = pathname === JOIN_ITEM.to;

  return (
    <>
      <header
        className={cx('ms-nav', scrolled && 'ms-nav--solid', tucked && 'ms-nav--tucked')}
      >
        <div className="ms-container ms-nav__inner">
          <Link to="/" className="ms-nav__brand" aria-label="MinerSkills — início">
            <LogoWordmark decorative className="ms-nav__logo" />
          </Link>

          <nav className="ms-nav__links" aria-label="Navegação principal">
            {NAV_GROUPS.map((group) => (
              <Dropdown
                key={group.key}
                label={group.label}
                hoverOpen
                active={isGroupActive(group, pathname)}
                triggerClassName="ms-nav__link"
                menuClassName="ms-nav__menu"
                cols={group.items.length > 4 ? 2 : undefined}
              >
                {group.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                  />
                ))}
              </Dropdown>
            ))}
            {NAV_DIRECT.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx('ms-nav__link', isActive && 'ms-nav__link--active')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <LinkButton to={JOIN_ITEM.to} className="ms-nav__cta" active={joinActive}>
              {JOIN_ITEM.label}
            </LinkButton>
          </nav>

          <div className="ms-nav__actions">
            <LinkButton to={JOIN_ITEM.to} size="sm" active={joinActive}>
              {JOIN_ITEM.label}
            </LinkButton>
            <button
              type="button"
              className="ms-nav__burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls={MOBILE_NAV_ID}
            >
              <Menu aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
