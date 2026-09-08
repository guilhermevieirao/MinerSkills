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
  { to: '/temporadas', label: 'Temporadas' },
  { to: '/agenda', label: 'Agenda' },
];

export const JOIN_ITEM: NavItem = { to: '/como-entrar', label: 'Como Entrar' };

/** Só no rodapé e no menu mobile (a navbar já está cheia). */
export const CONTACT_ITEM: NavItem = { to: '/contato', label: 'Contato' };

export const FOOTER_ITEMS: NavItem[] = [...NAV_ITEMS, JOIN_ITEM, CONTACT_ITEM];
