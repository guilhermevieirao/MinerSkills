import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button, LinkButton } from '../components/ui';
import { HexPattern } from '../components/motion/HexPattern';
import { useDocumentHead } from '../lib/useDocumentHead';
import { NotFoundPage } from './NotFoundPage';
import './RouteErrorPage.scss';

/**
 * Import dinâmico que falhou: quase sempre um deploy novo invalidou o chunk
 * que este documento ainda referenciava. Recarregar resolve.
 */
function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    message,
  );
}

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/**
 * `errorElement` das rotas públicas: erro de render de uma página, chunk
 * lazy que não baixou ou `Response` lançada por um loader. Um 404 do router
 * mostra a mesma tela do NotFoundPage; qualquer outro erro, esta.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return <RouteErrorView error={error} />;
}

function RouteErrorView({ error }: { error: unknown }) {
  useDocumentHead({ title: 'Algo deu errado', noindex: true });
  // fica no console do navegador para diagnóstico (o boundary engole o throw)
  useEffect(() => {
    console.error(error);
  }, [error]);

  const stale = isChunkLoadError(error);

  return (
    <section className="ms-route-error">
      <HexPattern />
      <div className="ms-route-error__inner">
        <AlertTriangle className="ms-route-error__icon" aria-hidden />
        <h1 className="ms-route-error__title">Algo deu errado</h1>
        <p className="ms-route-error__text">
          {stale
            ? 'Uma versão nova do site foi publicada e esta página ficou desatualizada. Recarregue para continuar.'
            : 'Ocorreu um erro inesperado ao montar esta página. Recarregue ou volte ao início.'}
        </p>
        <div className="ms-route-error__actions">
          <Button size="lg" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden /> Recarregar
          </Button>
          <LinkButton to="/" size="lg" variant="outline">
            <Home aria-hidden /> Início
          </LinkButton>
        </div>
        {import.meta.env.DEV && (
          <p className="ms-route-error__detail">{describe(error)}</p>
        )}
      </div>
    </section>
  );
}
