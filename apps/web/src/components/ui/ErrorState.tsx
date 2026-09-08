import { useSyncExternalStore } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './index';
import { ApiError } from '../../lib/api';
import { cx } from '../../lib/format';
import './ui-extras.scss';

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

/** `true` enquanto o navegador reporta conexão; re-renderiza quando ela cai ou volta. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
}

/** Texto mais específico quando a API respondeu com um status conhecido. */
function describeError(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.status === 404) return 'O conteúdo não foi encontrado.';
  if (error.status === 429) return 'Muitas requisições em pouco tempo. Aguarde um instante.';
  if (error.status >= 500) return 'O servidor não respondeu como esperado.';
  return undefined;
}

export interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  description?: string;
  /** Faixa discreta (uma linha) para páginas que já têm conteúdo de fallback. */
  compact?: boolean;
  /** Nova tentativa em andamento: o botão mostra o spinner e fica desabilitado. */
  retrying?: boolean;
}

/**
 * Estado de erro de uma consulta. Offline (`navigator.onLine === false`) tem
 * prioridade sobre o título recebido: o problema é a conexão, não o servidor.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  description,
  compact,
  retrying,
}: ErrorStateProps) {
  const online = useOnline();
  const Icon = online ? AlertTriangle : WifiOff;
  const heading = online ? (title ?? 'Não foi possível carregar') : 'Você está offline';
  const text = online
    ? (description ?? describeError(error) ?? 'Algo deu errado ao buscar os dados. Tente novamente em instantes.')
    : 'Verifique a conexão e tente novamente.';
  const TitleTag = compact ? 'p' : 'h3';

  return (
    <div className={cx('ms-error', compact && 'ms-error--compact')} role="alert">
      <Icon className="ms-error__icon" aria-hidden />
      <TitleTag className="ms-error__title">{heading}</TitleTag>
      <p className="ms-error__text">{text}</p>
      {onRetry && (
        <div className="ms-error__actions">
          <Button
            variant="outline"
            size={compact ? 'sm' : 'md'}
            onClick={onRetry}
            loading={retrying}
          >
            <RefreshCw aria-hidden /> Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
