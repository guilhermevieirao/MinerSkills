import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './index';
import { cx } from '../../lib/format';

/**
 * Paginação única do site e do painel ("Anterior · Página X de Y · Próxima").
 * Fica FORA do QueryState para não sumir enquanto a próxima página carrega;
 * `loading` desabilita os botões nesse intervalo.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  loading,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  loading?: boolean;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className={cx('ms-pagination', className)} aria-label="Paginação">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1 || loading}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden /> Anterior
      </Button>
      <span className="ms-pagination__info" aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages || loading}
        onClick={() => onChange(page + 1)}
      >
        Próxima <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
