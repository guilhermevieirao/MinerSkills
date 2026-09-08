import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Estado de navegação reconhecido (o mesmo `preserveScroll` do PublicLayout). */
interface AnnouncerNavState {
  preserveScroll?: boolean;
}

/**
 * Espera a transição de saída da página anterior (0,15 s) mais a montagem da
 * nova, cujo `useDocumentHead` grava o título no primeiro efeito.
 */
const TITLE_DELAY_MS = 300;

/**
 * Região viva que anuncia o título da página a cada troca de rota — num SPA o
 * leitor de tela não percebe a "navegação" sozinho — e leva o foco ao
 * `<main id="conteudo">`, para que o Tab seguinte continue do conteúdo novo, e
 * não do topo da navbar. Nada acontece na carga inicial (o documento inteiro
 * já é lido) nem quando a página pediu `state.preserveScroll` (ela cuida do
 * próprio foco, ex.: painel de membro em /equipe).
 */
export function RouteAnnouncer() {
  const { pathname, state } = useLocation();
  const [message, setMessage] = useState('');
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current === pathname) return; // montagem inicial (e o efeito duplo do StrictMode)
    prevPath.current = pathname;
    const preserve = (state as AnnouncerNavState | null)?.preserveScroll === true;

    // Esvazia antes de escrever: título igual ao anterior também precisa ser anunciado.
    setMessage('');
    const timer = window.setTimeout(() => {
      setMessage(document.title);
      if (preserve) return;
      const main = document.getElementById('conteudo');
      // Se a página já colocou o foco em algo dela (um campo, um painel), respeita.
      const focused = document.activeElement;
      const alreadyInside =
        focused instanceof HTMLElement && focused !== document.body && main?.contains(focused);
      if (main && !alreadyInside) main.focus({ preventScroll: true });
    }, TITLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, state]);

  return (
    <div className="ms-visually-hidden ms-route-announcer" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
