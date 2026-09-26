import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../../components/ui';

/**
 * Confirmação de ação destrutiva: título específico, texto explicando o efeito
 * (ligado por aria-describedby) e o botão de confirmação com peso de ação
 * primária, em vermelho. O botão mantém o rótulo "Excluir" por padrão — a
 * suíte e2e confirma por esse nome exato dentro do último diálogo.
 */
export function ConfirmDialog({
  title = 'Confirmar exclusão',
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
  loading,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      description={
        <span className="ms-confirm">
          <AlertTriangle aria-hidden className="ms-confirm__icon" />
          <span>{message}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger-solid" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
}
