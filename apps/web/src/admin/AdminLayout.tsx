import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ExternalLink, LogOut, Menu, X } from 'lucide-react';
import type { AdminMe } from '@minerskills/shared';
import { useLogout } from './useAdminAuth';
import { adminApi, type DashboardStats } from './adminApi';
import { ADMIN_NAV, currentNav, type AdminNavGroup } from './adminNav';
import { LogoMark } from '../components/brand/Logo';
import { Avatar } from '../components/ui/Avatar';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { IconButton } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { RouteAnnouncer } from '../components/layout/RouteAnnouncer';
import { cx } from '../lib/format';
import { mq } from '../lib/breakpoints';
import { useDocumentHead } from '../lib/useDocumentHead';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useScrollLock } from '../lib/useScrollLock';

const COLLAPSED_KEY = 'ms-admin-nav-collapsed';

function readCollapsed(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeCollapsed(keys: string[]) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(keys));
  } catch {
    // armazenamento indisponível: os grupos só não lembram o estado
  }
}

/**
 * Shell do painel: sidebar agrupada (fixa a partir de 1024px, drawer modal
 * abaixo), topbar com trilha e "Ver site", link de pular para o conteúdo,
 * título da aba por seção e anúncio de rota. `.ms-admin__sidebar`,
 * `--open` e o botão "Menu" são lidos pela suíte e2e.
 */
export function AdminLayout({
  admin,
  children,
}: {
  admin: AdminMe;
  children: ReactNode;
}) {
  const logout = useLogout();
  const toast = useToast();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  // Pendências das badges: a mesma query do dashboard, renovada a cada minuto.
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const current = currentNav(pathname);
  useDocumentHead({
    title: `${current?.item.label ?? 'Página não encontrada'} · Painel`,
    noindex: true,
  });

  // Drawer (abaixo de 1024px): diálogo modal com foco preso, Esc e rolagem travada.
  const isDrawer = useMediaQuery(mq.below('lg'));
  const drawerOpen = isDrawer && open;
  const sidebarRef = useRef<HTMLElement>(null);
  useFocusTrap(sidebarRef, drawerOpen, { onEscape: () => setOpen(false) });
  useScrollLock(drawerOpen);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      writeCollapsed(next);
      return next;
    });

  const doLogout = () =>
    logout.mutate(undefined, {
      onError: () => toast.error('Não foi possível sair. Tente novamente.'),
    });

  // fechado no celular: fora da tabulação e da árvore de acessibilidade
  const inert = isDrawer && !open ? ({ inert: '' } as Record<string, string>) : {};

  return (
    <div className="ms-admin">
      <a href="#conteudo" className="ms-skip-link">
        Pular para o conteúdo
      </a>
      <RouteAnnouncer />

      <aside
        ref={sidebarRef}
        id="ms-admin-sidebar"
        className={cx('ms-admin__sidebar', open && 'ms-admin__sidebar--open')}
        {...(isDrawer
          ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Menu do painel' }
          : { 'aria-label': 'Menu do painel' })}
        {...inert}
      >
        <div className="ms-admin__brand">
          <NavLink to="/admin" end className="ms-admin__brand-link">
            <LogoMark decorative className="ms-admin__brand-logo" />
            <span>
              <span className="ms-admin__brand-name">MinerSkills</span>
              <span className="ms-admin__brand-sub">Painel</span>
            </span>
          </NavLink>
          {isDrawer && (
            <IconButton
              aria-label="Fechar"
              size="sm"
              className="ms-admin__close"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden />
            </IconButton>
          )}
        </div>

        <nav className="ms-admin__nav" aria-label="Seções do painel">
          {ADMIN_NAV.map((group) => (
            <NavGroup
              key={group.key}
              group={group}
              collapsed={collapsed.includes(group.key)}
              onToggle={() => toggleGroup(group.key)}
              stats={stats}
              activeGroup={current?.group.key}
            />
          ))}
        </nav>

        <div className="ms-admin__sidebar-foot">
          <Avatar name={admin.name} size="sm" tone="brand" />
          <span className="ms-admin__me">
            <span className="ms-admin__me-name">{admin.name}</span>
            <span className="ms-admin__me-mail">Administrador</span>
          </span>
          <IconButton
            aria-label="Sair"
            title="Sair"
            size="sm"
            className="ms-admin__logout"
            loading={logout.isPending}
            onClick={doLogout}
          >
            <LogOut aria-hidden />
          </IconButton>
        </div>
      </aside>

      <div
        className={cx('ms-admin__overlay', open && 'ms-admin__overlay--open')}
        role="presentation"
        onClick={() => setOpen(false)}
      />

      <div className="ms-admin__content">
        <header className="ms-admin__topbar">
          <button
            type="button"
            className="ms-admin__burger"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="ms-admin-sidebar"
          >
            <Menu aria-hidden />
          </button>
          <Breadcrumb
            className="ms-admin__crumb"
            items={[
              { label: 'Painel', to: '/admin' },
              ...(current && current.item.to !== '/admin'
                ? [
                    ...(current.group.label ? [{ label: current.group.label }] : []),
                    { label: current.item.label },
                  ]
                : [{ label: current ? 'Dashboard' : 'Página não encontrada' }]),
            ]}
          />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ms-btn ms-btn--ghost ms-btn--sm ms-admin__site"
          >
            <ExternalLink aria-hidden />
            <span className="ms-admin__site-label">Ver site</span>
            <span className="ms-visually-hidden"> (abre em nova aba)</span>
          </a>
        </header>
        <main className="ms-admin__main" id="conteudo" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  group,
  collapsed,
  onToggle,
  stats,
  activeGroup,
}: {
  group: AdminNavGroup;
  collapsed: boolean;
  onToggle: () => void;
  stats?: DashboardStats;
  activeGroup?: string;
}) {
  const listId = `ms-admin-nav-${group.key}`;
  // o grupo da rota atual nunca fica recolhido (o item ativo precisa aparecer)
  const isCollapsed = collapsed && activeGroup !== group.key;
  const pending = group.items.reduce(
    (sum, i) => sum + (stats && i.badge ? i.badge(stats) : 0),
    0,
  );

  return (
    <div className="ms-admin__group">
      {group.label && (
        <button
          type="button"
          className="ms-admin__group-toggle"
          aria-expanded={!isCollapsed}
          aria-controls={listId}
          onClick={onToggle}
        >
          <span>{group.label}</span>
          {isCollapsed && pending > 0 && (
            <span className="ms-admin__badge" aria-label={`${pending} pendentes`}>
              {pending}
            </span>
          )}
          <ChevronDown className="ms-admin__group-chevron" aria-hidden />
        </button>
      )}
      <ul className="ms-admin__list" id={listId} role="list" hidden={isCollapsed}>
        {group.items.map((l) => {
          const count = stats && l.badge ? l.badge(stats) : 0;
          return (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cx('ms-admin__link', isActive && 'ms-admin__link--active')
                }
              >
                <l.icon aria-hidden />
                <span className="ms-admin__link-label">{l.label}</span>
                {count > 0 && (
                  <span className="ms-admin__badge" aria-label={`${count} pendentes`}>
                    {count}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
