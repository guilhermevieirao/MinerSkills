import { useEffect } from 'react';

/** Overlays abertos neste instante (drawers, modais aninhados, lightbox). */
let locks = 0;

/**
 * Trava a rolagem do documento enquanto `active` for verdadeiro. Conta
 * referências: com modais aninhados, a rolagem só volta quando o último fecha.
 * `scrollbar-gutter: stable` no `html` evita o salto de layout ao esconder a barra.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    if (locks === 1) document.body.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = '';
    };
  }, [active]);
}
