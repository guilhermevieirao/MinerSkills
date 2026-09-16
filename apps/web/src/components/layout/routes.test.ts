import { PUBLIC_ROUTES } from '@minerskills/shared';
import { describe, expect, it } from 'vitest';
import { CONTACT_ITEM, FOOTER_ITEMS, JOIN_ITEM, NAV_ITEMS } from './navItems';

/**
 * Navegação e sitemap saem da mesma lista (`PUBLIC_ROUTES`): um link novo sem
 * rota no sitemap — ou uma rota fixa sem link — falha aqui.
 */
describe('rotas públicas', () => {
  const linked = new Set([...NAV_ITEMS, JOIN_ITEM, CONTACT_ITEM].map((i) => i.to));

  it('todo item de navegação é uma rota pública fixa', () => {
    for (const to of linked) expect(PUBLIC_ROUTES, to).toContain(to);
  });

  it('toda rota pública fixa tem um link na navegação ou no rodapé', () => {
    for (const route of PUBLIC_ROUTES) expect(linked, route).toContain(route);
  });

  it('o rodapé lista cada destino uma única vez', () => {
    const tos = FOOTER_ITEMS.map((i) => i.to);
    expect(new Set(tos).size).toBe(tos.length);
  });
});
