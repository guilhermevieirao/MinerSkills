import { Modal } from './Modal';
import { Button } from '../../components/ui';

export function ConfirmDialog({
  title = 'Confirmar',
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
    <Modal title={title} onClose={onCancel}>
      <p className="ms-modal__text">{message}</p>
      <div className="ms-modal__actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
