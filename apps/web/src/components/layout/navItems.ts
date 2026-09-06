export interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início' },
  { to: '/historia', label: 'História' },
  { to: '/blog', label: 'Blog' },
  { to: '/galeria', label: 'Galeria' },
  { to: '/equipe', label: 'Equipe' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/forum', label: 'Fórum' },
  { to: '/premios', label: 'Prêmios' },
  { to: '/agenda', label: 'Agenda' },
];

export const JOIN_ITEM: NavItem = { to: '/como-entrar', label: 'Como Entrar' };
