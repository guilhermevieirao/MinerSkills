import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from './ErrorState';

export interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Placeholder exibido enquanto a consulta ainda não tem dados. */
  skeleton: ReactNode;
  /** Quando devolve `true`, renderiza `empty` no lugar de `children`. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  /** Erro como faixa discreta (blocos que não bloqueiam a página). */
  compact?: boolean;
  children: (data: T) => ReactNode;
}

/**
 * Estados padrão de uma consulta TanStack Query, na ordem: sem dados e
 * carregando → `skeleton`; sem dados e com erro → `ErrorState` com
 * "Tentar novamente" (refetch); `isEmpty(data)` → `empty`; senão
 * `children(data)`. Dados já carregados continuam na tela mesmo que uma
 * atualização em segundo plano falhe — a página nunca "some" por um refetch.
 */
export function QueryState<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  compact,
  children,
}: QueryStateProps<T>) {
  if (query.data === undefined) {
    if (query.isError) {
      return (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          compact={compact}
        />
      );
    }
    return <>{skeleton}</>;
  }
  if (isEmpty?.(query.data)) return <>{empty ?? null}</>;
  return <>{children(query.data)}</>;
}
