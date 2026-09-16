import { PUBLIC_ROUTES } from '@minerskills/shared';
import { describe, expect, it } from 'vitest';
import {
  ALL_NAV_ITEMS,
  FOOTER_COLUMNS,
  JOIN_ITEM,
  NAV_DIRECT,
  NAV_GROUPS,
  isGroupActive,
} from './navItems';

/**
 * Navegação e sitemap saem da mesma lista (`PUBLIC_ROUTES`): um link novo sem
 * rota no sitemap — ou uma rota fixa sem link — falha aqui.
 */
describe('rotas públicas', () => {
  const linked = new Set(ALL_NAV_ITEMS.map((i) => i.to));

  it('todo item de navegação é uma rota pública fixa', () => {
    for (const to of linked) expect(PUBLIC_ROUTES, to).toContain(to);
  });

  it('toda rota pública fixa tem um link (a Home é o logo)', () => {
    for (const route of PUBLIC_ROUTES) {
      if (route === '/') continue;
      expect(linked, route).toContain(route);
    }
  });

  it('nenhum destino se repete entre grupos, links diretos e CTA', () => {
    const tos = ALL_NAV_ITEMS.map((i) => i.to);
    expect(new Set(tos).size).toBe(tos.length);
  });

  it('o rodapé cobre cada destino uma única vez', () => {
    const tos = FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.to));
    expect(new Set(tos).size).toBe(tos.length);
    expect(new Set(tos)).toEqual(linked);
  });

  it('grupos têm rótulo, ícone e descrição em cada item', () => {
    for (const g of NAV_GROUPS) {
      expect(g.label).toBeTruthy();
      expect(g.items.length).toBeGreaterThanOrEqual(2);
      for (const i of g.items) {
        expect(i.icon, i.to).toBeTruthy();
        expect(i.description, i.to).toBeTruthy();
      }
    }
    expect(NAV_DIRECT.length).toBeGreaterThan(0);
    expect(JOIN_ITEM.to).toBe('/como-entrar');
  });

  it('um grupo fica ativo na rota do item e nas suas filhas', () => {
    const equipe = NAV_GROUPS[0]!;
    expect(isGroupActive(equipe, '/equipe')).toBe(true);
    expect(isGroupActive(equipe, '/equipe/ana')).toBe(true);
    expect(isGroupActive(equipe, '/equipes')).toBe(false);
    expect(isGroupActive(equipe, '/blog')).toBe(false);
  });
});
