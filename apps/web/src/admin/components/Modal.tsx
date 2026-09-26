import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useScrollLock } from '../../lib/useScrollLock';

type ModalEntry = { onClose: () => void };

/**
 * Pilha dos modais abertos, em nível de módulo. Modais se aninham (o formulário
 * de um post abre "Escolher da biblioteca"; os detalhes da mídia abrem um
 * ConfirmDialog): Esc fecha só o de cima — com um listener por modal, um Esc
 * fecharia todos de uma vez e descartaria o formulário pai. A rolagem do fundo
 * fica com `useScrollLock`, compartilhado com drawer e lightbox.
 */
const openModals: ModalEntry[] = [];

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') openModals[openModals.length - 1]?.onClose();
}

function pushModal(entry: ModalEntry) {
  openModals.push(entry);
  if (openModals.length === 1) window.addEventListener('keydown', onEscape);
}

function popModal(entry: ModalEntry) {
  const i = openModals.lastIndexOf(entry);
  if (i >= 0) openModals.splice(i, 1);
  if (openModals.length === 0) window.removeEventListener('keydown', onEscape);
}

/**
 * Diálogo do painel. Cabeçalho fixo, corpo rolável e — quando o conteúdo tem
 * `.ms-modal__actions` (ou `footer`) — barra de ações fixa na base: salvar
 * nunca some num formulário longo. Tela cheia abaixo de 768px. O fundo só
 * fecha num clique que COMEÇA e termina nele (arrastar para selecionar texto
 * de um campo não descarta o formulário). `.ms-modal` é lido pela suíte e2e.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string;
  /** Uma linha abaixo do título (ligada por aria-describedby). */
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Ações fixas na base (alternativa a `.ms-modal__actions` dentro do corpo). */
  footer?: ReactNode;
  /** sm 440px (confirmação) · md 640px · lg 880px (formulários longos). */
  size?: 'sm' | 'md' | 'lg';
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
  const descId = useId();
  const pressedOnBackdrop = useRef(false);
  useFocusTrap(panelRef, true, { initialFocus: 'container' });
  useScrollLock(true);

  return createPortal(
    <div
      className="ms-modal"
      role="presentation"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        className={cx('ms-modal__panel', `ms-modal__panel--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <div className="ms-modal__head">
          <div className="ms-modal__heading">
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descId} className="ms-modal__desc">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="ms-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X aria-hidden />
          </button>
        </div>
        <div className="ms-modal__body">{children}</div>
        {footer && <div className="ms-modal__actions ms-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
