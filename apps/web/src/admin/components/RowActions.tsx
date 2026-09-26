import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '../../components/ui';

/**
 * Ações de uma linha do painel, em slots fixos: extras · Editar · Excluir.
 * Os nomes acessíveis ("Editar {rótulo}", "Excluir {rótulo}") e as classes
 * `ms-btn--ghost`/`ms-btn--danger` são lidos pela suíte e2e. O Excluir fica
 * discreto em repouso e vermelho só ao apontar/focar.
 */
export function RowActions({
  label,
  onEdit,
  onRemove,
  removeLabel = 'Excluir',
  extra,
}: {
  /** Rótulo do registro (entra no nome acessível dos botões). */
  label: string;
  onEdit?: () => void;
  onRemove?: () => void;
  /** Verbo do botão destrutivo (ex.: "Remover" só se a API não exclui). */
  removeLabel?: string;
  /** Ações extras (antes de Editar). */
  extra?: ReactNode;
}) {
  return (
    <div className="ms-adm__row-actions">
      {extra}
      {onEdit && (
        <IconButton
          aria-label={`Editar ${label}`}
          title="Editar"
          size="sm"
          onClick={onEdit}
        >
          <Pencil aria-hidden />
        </IconButton>
      )}
      {onRemove && (
        <IconButton
          aria-label={`${removeLabel} ${label}`}
          title={removeLabel}
          size="sm"
          variant="danger"
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </IconButton>
      )}
    </div>
  );
}
