import {
  Award,
  CalendarDays,
  CircleUserRound,
  FileText,
  Handshake,
  HelpCircle,
  Images,
  Inbox,
  LayoutDashboard,
  Layers,
  Library,
  MessagesSquare,
  Newspaper,
  Settings,
  Share2,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardStats } from './adminApi';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** `NavLink end`: só casa a rota exata. */
  end?: boolean;
  /** Pendências do item (lidas do dashboard); a badge some quando zero. */
  badge?: (stats: DashboardStats) => number;
}

export interface AdminNavGroup {
  key: string;
  /** Sem rótulo: grupo de topo (Dashboard). */
  label?: string;
  items: AdminNavItem[];
}

/** Pendências do fórum: tópicos/respostas na fila + denúncias abertas (mesma conta do dashboard). */
export const forumPending = (s: DashboardStats) => s.forum.pending + s.forum.reports;
export const inboxPending = (s: DashboardStats) => s.contact.new;

/**
 * Navegação do painel agrupada por intenção. É a fonte da sidebar, da trilha
 * da topbar e do título da aba (`{Seção} · Painel`).
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: 'inicio',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    key: 'conteudo',
    label: 'Conteúdo',
    items: [
      { to: '/admin/paginas', label: 'Páginas & Timeline', icon: FileText },
      { to: '/admin/blog', label: 'Blog', icon: Newspaper },
      { to: '/admin/galeria', label: 'Galeria', icon: Images },
      { to: '/admin/midia', label: 'Mídia', icon: Library },
    ],
  },
  {
    key: 'equipe',
    label: 'Equipe',
    items: [
      { to: '/admin/equipe', label: 'Membros & robôs', icon: Users, end: true },
      { to: '/admin/equipe/tags', label: 'Tags da equipe', icon: Tags },
      { to: '/admin/temporadas', label: 'Temporadas', icon: Layers },
      { to: '/admin/premios', label: 'Prêmios', icon: Award },
    ],
  },
  {
    key: 'comunidade',
    label: 'Comunidade',
    items: [
      { to: '/admin/forum', label: 'Fórum', icon: MessagesSquare, badge: forumPending },
      { to: '/admin/quiz', label: 'Quiz', icon: HelpCircle },
      { to: '/admin/mensagens', label: 'Mensagens', icon: Inbox, badge: inboxPending },
    ],
  },
  {
    key: 'site',
    label: 'Site',
    items: [
      { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/admin/patrocinadores', label: 'Patrocinadores', icon: Handshake },
      { to: '/admin/social', label: 'Redes sociais', icon: Share2 },
      { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
  {
    key: 'acesso',
    label: 'Acesso',
    items: [
      { to: '/admin/administradores', label: 'Administradores', icon: UserCog },
      { to: '/admin/conta', label: 'Minha conta', icon: CircleUserRound },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((g) => g.items.map((item) => ({ item, group: g })));

/** Item e grupo da rota atual (o mais específico vence: /admin/equipe/tags ≠ /admin/equipe). */
export function currentNav(
  pathname: string,
): { item: AdminNavItem; group: AdminNavGroup } | undefined {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  return ALL_ITEMS.filter(({ item }) =>
    item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`),
  ).sort((a, b) => b.item.to.length - a.item.to.length)[0];
}
