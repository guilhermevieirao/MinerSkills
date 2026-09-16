/**
 * Breakpoints do layout — espelho de `$bp-*` em `styles/_mixins.scss`
 * (`styles/tokens.sync.test.ts` garante que os dois lados batem). Use `mq.below`
 * com `useMediaQuery` para lógica que precisa trocar junto com o CSS.
 */
export const BP = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const;

export type Breakpoint = keyof typeof BP;

export const mq = {
  /** Mesmo intervalo do mixin `below($bp)`: `(max-width: bp - 1px)`. */
  below: (bp: Breakpoint): string => `(max-width: ${BP[bp] - 1}px)`,
  /** Mesmo intervalo do mixin `from($bp)`: `(min-width: bp)`. */
  from: (bp: Breakpoint): string => `(min-width: ${BP[bp]}px)`,
};
