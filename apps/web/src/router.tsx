import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PublicLayout } from './components/layout/PublicLayout';
import { Loader } from './components/ui';
import { HomePage } from './pages/HomePage';
import { HistoriaPage } from './pages/HistoriaPage';
import { BlogPage } from './pages/BlogPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { GaleriaPage } from './pages/GaleriaPage';
import { EquipePage } from './pages/EquipePage';
import { QuizPage } from './pages/QuizPage';
import { ForumPage } from './pages/ForumPage';
import { ForumTopicPage } from './pages/ForumTopicPage';
import { PremiosPage } from './pages/PremiosPage';
import { AgendaPage } from './pages/AgendaPage';
import { ComoEntrarPage } from './pages/ComoEntrarPage';
import { TemporadasPage } from './pages/TemporadasPage';
import { ContatoPage } from './pages/ContatoPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Área admin: chunk separado, carregado sob demanda (sem link público)
const AdminApp = lazy(() => import('./admin/AdminApp'));

/** URLs antigas /enciclopedia[/:slug] → /equipe[/:slug] (links externos/favoritos). */
function EnciclopediaRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/equipe/${slug}` : '/equipe'} replace />;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/historia', element: <HistoriaPage /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <BlogPostPage /> },
      { path: '/galeria', element: <GaleriaPage /> },
      // parâmetro opcional: lista e detalhe são a MESMA rota (a página não remonta ao abrir um membro)
      { path: '/equipe/:slug?', element: <EquipePage /> },
      { path: '/quiz', element: <QuizPage /> },
      { path: '/forum', element: <ForumPage /> },
      { path: '/forum/:id', element: <ForumTopicPage /> },
      { path: '/premios', element: <PremiosPage /> },
      { path: '/agenda', element: <AgendaPage /> },
      { path: '/como-entrar', element: <ComoEntrarPage /> },
      { path: '/temporadas', element: <TemporadasPage /> },
      { path: '/contato', element: <ContatoPage /> },
      { path: '*', element: <NotFoundPage /> },
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
