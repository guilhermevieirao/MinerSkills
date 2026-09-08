import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Images,
  HelpCircle,
  Users,
  Tags,
  MessagesSquare,
  Award,
  CalendarDays,
  Share2,
  Handshake,
  Layers,
  Inbox,
  Library,
  Settings,
  UserCog,
  CircleUserRound,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import type { AdminMe } from '@minerskills/shared';
import { useLogout } from './useAdminAuth';
import { adminApi, type DashboardStats } from './adminApi';
import { LogoMark } from '../components/brand/Logo';
import { cx } from '../lib/format';

/** Itens da sidebar; `badge` lê um contador do dashboard (pendências) e some quando zero. */
const LINKS: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: (stats: DashboardStats) => number;
}> = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/paginas', label: 'Páginas & Timeline', icon: FileText },
  { to: '/admin/blog', label: 'Blog', icon: Newspaper },
  { to: '/admin/galeria', label: 'Galeria', icon: Images },
  { to: '/admin/quiz', label: 'Quiz', icon: HelpCircle },
  { to: '/admin/equipe', label: 'Equipe', icon: Users, end: true },
  { to: '/admin/equipe/tags', label: 'Tags da equipe', icon: Tags },
  { to: '/admin/forum', label: 'Fórum', icon: MessagesSquare, badge: (s) => s.forum.pending },
  { to: '/admin/premios', label: 'Prêmios', icon: Award },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/social', label: 'Redes Sociais', icon: Share2 },
  { to: '/admin/patrocinadores', label: 'Patrocinadores', icon: Handshake },
  { to: '/admin/temporadas', label: 'Temporadas', icon: Layers },
  { to: '/admin/mensagens', label: 'Mensagens', icon: Inbox, badge: (s) => s.contact.new },
  { to: '/admin/midia', label: 'Mídia', icon: Library },
  { to: '/admin/administradores', label: 'Administradores', icon: UserCog },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export function AdminLayout({ admin, children }: { admin: AdminMe; children: ReactNode }) {
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  // Contadores das badges (mensagens novas, moderação pendente): a mesma query
  // do dashboard, renovada a cada minuto enquanto o painel está aberto.
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="ms-admin">
      <aside className={cx('ms-admin__sidebar', open && 'ms-admin__sidebar--open')}>
        <div className="ms-admin__brand">
          <LogoMark className="ms-admin__brand-logo" />
          <div>
            <span className="ms-admin__brand-name">MinerSkills</span>
            <span className="ms-admin__brand-sub">Painel Admin</span>
          </div>
        </div>

        <nav className="ms-admin__nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx('ms-admin__link', isActive && 'ms-admin__link--active')
              }
            >
              <l.icon />
              {l.label}
              {stats && l.badge && l.badge(stats) > 0 && (
                <span className="ms-admin__badge" aria-label={`${l.badge(stats)} pendentes`}>
                  {l.badge(stats)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ms-admin__sidebar-foot">
          <NavLink
            to="/admin/conta"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cx('ms-admin__link', isActive && 'ms-admin__link--active')
            }
          >
            <CircleUserRound /> Minha conta
          </NavLink>
          <a href="/" className="ms-admin__link" target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Ver site
          </a>
          <button className="ms-admin__link ms-admin__logout" onClick={() => logout.mutate()}>
            <LogOut /> Sair
          </button>
        </div>
      </aside>

      {open && <div className="ms-admin__overlay" onClick={() => setOpen(false)} />}

      <div className="ms-admin__content">
        <header className="ms-admin__topbar">
          <button className="ms-admin__burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
          <span className="ms-admin__user">
            Olá, <strong>{admin.name}</strong>
          </span>
        </header>
        <main className="ms-admin__main">{children}</main>
      </div>
    </div>
  );
}
