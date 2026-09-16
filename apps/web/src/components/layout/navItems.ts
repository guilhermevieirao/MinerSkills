import {
  CalendarDays,
  History,
  HelpCircle,
  Images,
  Layers,
  Mail,
  MessagesSquare,
  Newspaper,
  Rocket,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PublicRoute } from '@minerskills/shared';

/**
 * Arquitetura da navegação pública — fonte única para a navbar (grupos com
 * dropdown a partir de 1024px), o drawer do celular e as colunas do rodapé.
 * Os destinos vêm de `PUBLIC_ROUTES` (shared); `routes.test.ts` garante que
 * todo destino é uma rota fixa e que nenhuma rota fica sem link.
 */
export interface NavItem {
  to: PublicRoute;
  label: string;
  icon: LucideIcon;
  /** Uma linha no painel do dropdown. */
  description?: string;
  /** `NavLink end`: só casa a rota exata. */
  end?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'equipe',
    label: 'A equipe',
    items: [
      {
        to: '/equipe',
        label: 'Membros & robôs',
        icon: Users,
        description: 'Quem faz a MinerSkills e os robôs de cada temporada',
      },
      {
        to: '/historia',
        label: 'História',
        icon: History,
        description: 'A linha do tempo desde a fundação',
      },
      {
        to: '/premios',
        label: 'Prêmios',
        icon: Trophy,
        description: 'Conquistas em competições e eventos',
      },
      {
        to: '/temporadas',
        label: 'Temporadas',
        icon: Layers,
        description: 'Cada ano de FRC: desafio, robô e resultados',
      },
    ],
  },
  {
    key: 'conteudo',
    label: 'Conteúdo',
    items: [
      {
        to: '/blog',
        label: 'Blog',
        icon: Newspaper,
        description: 'Notícias e bastidores da equipe',
      },
      {
        to: '/galeria',
        label: 'Galeria',
        icon: Images,
        description: 'Fotos da oficina e das competições',
      },
      {
        to: '/forum',
        label: 'Fórum',
        icon: MessagesSquare,
        description: 'Perguntas e conversas com a comunidade',
      },
      {
        to: '/quiz',
        label: 'Quiz',
        icon: HelpCircle,
        description: 'Teste o que você sabe sobre robótica',
      },
    ],
  },
];

/** Links diretos na navbar (sem grupo). */
export const NAV_DIRECT: NavItem[] = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/contato', label: 'Contato', icon: Mail },
];

/** Chamada principal: botão destacado na navbar, no drawer e no rodapé. */
export const JOIN_ITEM: NavItem = {
  to: '/como-entrar',
  label: 'Como entrar',
  icon: Rocket,
  description: 'Processo seletivo, requisitos e inscrição',
};

export const CONTACT_ITEM: NavItem = NAV_DIRECT[1]!;

/** Colunas do rodapé: espelham os grupos da navbar mais "Participe". */
export const FOOTER_COLUMNS: NavGroup[] = [
  ...NAV_GROUPS,
  {
    key: 'participe',
    label: 'Participe',
    items: [NAV_DIRECT[0]!, JOIN_ITEM, CONTACT_ITEM],
  },
];

/** Todos os destinos linkados (a Home é o logo, não entra aqui). */
export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...NAV_DIRECT,
  JOIN_ITEM,
];

/** Um grupo está ativo quando a rota atual é (ou está sob) um dos seus itens. */
export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
}
