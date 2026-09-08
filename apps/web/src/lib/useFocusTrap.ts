import { useEffect, useRef, type RefObject } from 'react';

/** Seletor dos elementos que entram na navegação por Tab. */
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export interface FocusTrapOptions {
  /** Chamado ao pressionar Escape. Omita quando outro mecanismo já trata a tecla. */
  onEscape?: () => void;
  /** Para onde vai o foco ao ativar: primeiro focável ('first', padrão) ou o próprio container. */
  initialFocus?: 'first' | 'container';
}

/**
 * Pilha das armadilhas ativas. Modais se aninham (o formulário de um post abre a
 * biblioteca de mídia, que abre um ConfirmDialog): só a do topo responde ao
 * teclado; quando ela sai, a anterior volta a valer.
 */
const active: HTMLElement[] = [];

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0,
  );
}

function focusInside(container: HTMLElement, mode: 'first' | 'container') {
  if (container.contains(document.activeElement) && document.activeElement !== container) return;
  if (mode === 'container') {
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    container.focus({ preventScroll: true });
    return;
  }
  const [first] = focusables(container);
  if (first) {
    first.focus({ preventScroll: true });
  } else {
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    container.focus({ preventScroll: true });
  }
}

/**
 * Mantém o foco do teclado dentro de `ref` enquanto `active` for verdadeiro
 * (menus, lightbox, modais). Ao ativar, guarda o elemento focado e leva o foco
 * para dentro; Tab/Shift+Tab ciclam entre os focáveis do container; Escape
 * chama `onEscape`; ao desativar, devolve o foco ao elemento anterior.
 * Sem dependências — só DOM.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  opts: FocusTrapOptions = {},
): void {
  const { onEscape, initialFocus = 'first' } = opts;
  // O callback muda a cada render do pai; o efeito não precisa reiniciar por isso.
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!isActive) return;
    const container = ref.current;
    if (!container) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active.push(container);
    focusInside(container, initialFocus);

    const onKeyDown = (e: KeyboardEvent) => {
      if (active[active.length - 1] !== container) return;

      if (e.key === 'Escape') {
        if (!onEscapeRef.current) return;
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables(container);
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && container.contains(current);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        focusInside(container, 'container');
        return;
      }
      if (e.shiftKey) {
        // Do container em si (foco inicial) ou do primeiro item, volta para o último.
        if (!inside || current === container || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
      // Do container em si, o Tab nativo já cai no primeiro item (ele vem logo depois no DOM).
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const i = active.lastIndexOf(container);
      if (i >= 0) active.splice(i, 1);
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref, isActive, initialFocus]);
}
