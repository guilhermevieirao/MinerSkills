import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../lib/useFocusTrap';

type ModalEntry = { onClose: () => void };

/**
 * Pilha dos modais abertos, em nível de módulo. Modais se aninham (o formulário
 * de um post abre "Escolher da biblioteca"; os detalhes da mídia abrem um
 * ConfirmDialog): Esc fecha só o de cima e o scroll do fundo volta quando o
 * último sai — com um listener por modal, um Esc fecharia todos de uma vez e
 * descartaria o formulário pai.
 */
const openModals: ModalEntry[] = [];

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') openModals[openModals.length - 1]?.onClose();
}

function pushModal(entry: ModalEntry) {
  openModals.push(entry);
  if (openModals.length === 1) {
    window.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
  }
}

function popModal(entry: ModalEntry) {
  const i = openModals.lastIndexOf(entry);
  if (i >= 0) openModals.splice(i, 1);
  if (openModals.length === 0) {
    window.removeEventListener('keydown', onEscape);
    document.body.style.overflow = '';
  }
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // A entrada é estável pela vida do modal (a posição na pilha não muda quando o
  // pai re-renderiza com um onClose novo); só o callback é atualizado.
  const entry = useRef<ModalEntry>({ onClose });
  entry.current.onClose = onClose;

  useEffect(() => {
    const current = entry.current;
    pushModal(current);
    return () => popModal(current);
  }, []);

  // O foco entra no painel (o leitor de tela lê o título) e o Tab não sai dele.
  // O Escape continua com a pilha acima — por isso o hook não recebe onEscape.
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, true, { initialFocus: 'container' });

  // O backdrop fecha só quando ELE é o alvo do clique — um clique dentro do painel
  // nunca chega aqui como alvo, então o dialog não precisa interceptar eventos.
  return createPortal(
    <div
      className="ms-modal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ms-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ms-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button className="ms-modal__close" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
