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

const SCROLL_PREFIX = 'ms-scroll:';

function readScroll(key: string): number {
  try {
    return Number(sessionStorage.getItem(SCROLL_PREFIX + key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeScroll(key: string, y: number) {
  try {
    sessionStorage.setItem(SCROLL_PREFIX + key, String(Math.round(y)));
  } catch {
    // armazenamento indisponível (modo privado): sem restauração, sem erro
  }
}

/**
 * Rolagem entre páginas: PUSH/REPLACE vão ao topo (salvo `state.preserveScroll`,
 * usado ao abrir um membro em /equipe); Voltar/Avançar (POP) RESTAURAM a posição
 * em que a página estava — o comportamento nativo que uma SPA perde. A posição
 * de cada entrada do histórico fica em sessionStorage pela `location.key`.
 * A restauração é tentada mais de uma vez porque a página nova monta depois
 * da transição de saída e o conteúdo (esqueletos → dados) cresce depois.
 */
function ScrollManager() {
  const { key, state } = useLocation();
  const navType = useNavigationType();
  const prevKey = useRef(key);

  // o navegador não deve competir com a restauração manual
  useEffect(() => {
    if ('scrollRestoration' in window.history)
      window.history.scrollRestoration = 'manual';
  }, []);

  // grava a posição da entrada atual conforme o usuário rola
  useEffect(() => {
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => writeScroll(key, window.scrollY));
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      cancelAnimationFrame(raf);
    };
  }, [key]);

  useEffect(() => {
    if (prevKey.current === key) return; // montagem inicial (e o efeito duplo do StrictMode)
    prevKey.current = key;

    const timers: number[] = [];
    const goTo = (top: number) =>
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });

    if (navType === 'POP') {
      const y = readScroll(key);
      goTo(y);
      for (const delay of [200, 450])
        timers.push(window.setTimeout(() => goTo(y), delay));
    } else {
      const preserve = (state as LayoutNavState | null)?.preserveScroll === true;
      if (!preserve) goTo(0);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
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
      <ScrollManager />
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
