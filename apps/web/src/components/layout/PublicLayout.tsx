import { useLocation, useMatches, useNavigationType, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PageTransition } from '../motion/PageTransition';
import { RouteAnnouncer } from './RouteAnnouncer';
import { NavigationProgress } from './NavigationProgress';

/** Estado de navegação reconhecido pelo layout (`navigate(to, { state })`). */
interface LayoutNavState {
  /** Opt-out explícito do scroll ao topo — ex.: abrir um membro em /equipe. */
  preserveScroll?: boolean;
}

/**
 * Id da rota casada mais profunda. Diferente do pathname, ele não muda quando
 * só um parâmetro muda: '/equipe' e '/equipe/:slug' são a mesma rota
 * ('/equipe/:slug?'), então a página NÃO é remontada ao abrir um membro.
 */
function useRouteId(): string {
  const matches = useMatches();
  return matches[matches.length - 1]?.id ?? '';
}

/**
 * Rola ao topo a cada navegação (`location.key` muda em todo push/replace/pop),
 * exceto quando a própria página pediu `state.preserveScroll`. O opt-out só
 * vale para PUSH/REPLACE: no Voltar/Avançar o state gravado no histórico volta
 * junto e não deve contar — senão um Back para /equipe/:slug pararia num
 * scroll arbitrário em vez do topo.
 */
function ScrollToTop() {
  const { key, state } = useLocation();
  const navType = useNavigationType();
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current === key) return; // montagem inicial (e o efeito duplo do StrictMode)
    prevKey.current = key;
    const preserve =
      navType !== 'POP' && (state as LayoutNavState | null)?.preserveScroll === true;
    if (!preserve) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [key, navType, state]);
  return null;
}

export function PublicLayout() {
  const routeId = useRouteId();
  // O elemento da rota é capturado AQUI (e não via <Outlet /> dentro da
  // transição): o AnimatePresence mantém a página antiga montada durante o
  // exit, e um <Outlet /> nela renderizaria a rota NOVA por ~150 ms (flash +
  // montagem dupla). O elemento congelado carrega o RouteContext antigo.
  const outlet = useOutlet();
  return (
    <>
      {/* Primeiro elemento focável da página: leva o teclado direto ao conteúdo */}
      <a href="#conteudo" className="ms-skip-link">
        Pular para o conteúdo
      </a>
      <ScrollToTop />
      <RouteAnnouncer />
      <NavigationProgress />
      <Navbar />
      <main className="ms-main" id="conteudo" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <PageTransition key={routeId}>{outlet}</PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
