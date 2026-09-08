import {
  createBrowserRouter,
  Navigate,
  useParams,
  type RouteObject,
} from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { PublicLayout } from './components/layout/PublicLayout';
import { Loader } from './components/ui';
import { HeroSkeleton } from './components/ui/skeletons';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

// Área admin: chunk separado, carregado sob demanda (sem link público)
const AdminApp = lazy(() => import('./admin/AdminApp'));

/** URLs antigas /enciclopedia[/:slug] → /equipe[/:slug] (links externos/favoritos). */
function EnciclopediaRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/equipe/${slug}` : '/equipe'} replace />;
}

/**
 * Página pública em chunk próprio, via `lazy` do react-router (não React.lazy):
 * o router só troca de rota depois de baixar o módulo, então a página atual
 * fica na tela durante o download (com a NavigationProgress no topo) e não há
 * Suspense dentro da transição do layout — o id da rota, que a PageTransition
 * usa como chave, continua estável. Erros de render ou de download do chunk
 * caem no `errorElement` da própria rota, preservando Navbar e rodapé.
 */
function page(
  path: string,
  load: () => Promise<{ Component: ComponentType }>,
): RouteObject {
  return {
    path,
    lazy: load,
    errorElement: <RouteErrorPage />,
    // acesso direto à URL: o layout aparece já; só o miolo espera o chunk
    hydrateFallbackElement: <HeroSkeleton />,
  };
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    // erro no próprio layout (Navbar, rodapé): tela de erro sem o shell
    errorElement: <RouteErrorPage />,
    children: [
      // Home e 404 ficam no bundle principal: são as telas do primeiro acesso
      { path: '/', element: <HomePage />, errorElement: <RouteErrorPage /> },
      page('/historia', () =>
        import('./pages/HistoriaPage').then((m) => ({ Component: m.HistoriaPage })),
      ),
      page('/blog', () =>
        import('./pages/BlogPage').then((m) => ({ Component: m.BlogPage })),
      ),
      page('/blog/:slug', () =>
        import('./pages/BlogPostPage').then((m) => ({ Component: m.BlogPostPage })),
      ),
      page('/galeria', () =>
        import('./pages/GaleriaPage').then((m) => ({ Component: m.GaleriaPage })),
      ),
      // parâmetro opcional: lista e detalhe são a MESMA rota (a página não remonta ao abrir um membro)
      page('/equipe/:slug?', () =>
        import('./pages/EquipePage').then((m) => ({ Component: m.EquipePage })),
      ),
      page('/quiz', () =>
        import('./pages/QuizPage').then((m) => ({ Component: m.QuizPage })),
      ),
      page('/forum', () =>
        import('./pages/ForumPage').then((m) => ({ Component: m.ForumPage })),
      ),
      page('/forum/:id', () =>
        import('./pages/ForumTopicPage').then((m) => ({ Component: m.ForumTopicPage })),
      ),
      page('/premios', () =>
        import('./pages/PremiosPage').then((m) => ({ Component: m.PremiosPage })),
      ),
      page('/agenda', () =>
        import('./pages/AgendaPage').then((m) => ({ Component: m.AgendaPage })),
      ),
      page('/como-entrar', () =>
        import('./pages/ComoEntrarPage').then((m) => ({ Component: m.ComoEntrarPage })),
      ),
      page('/temporadas', () =>
        import('./pages/TemporadasPage').then((m) => ({ Component: m.TemporadasPage })),
      ),
      page('/contato', () =>
        import('./pages/ContatoPage').then((m) => ({ Component: m.ContatoPage })),
      ),
      { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
    ],
  },
  // fora do layout público: redireciona sem passar pela transição de página
  { path: '/enciclopedia/:slug?', element: <EnciclopediaRedirect /> },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<Loader label="Carregando painel…" />}>
        <AdminApp />
      </Suspense>
    ),
  },
]);
