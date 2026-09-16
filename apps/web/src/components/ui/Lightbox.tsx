import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaUrl } from '../../lib/format';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useScrollLock } from '../../lib/useScrollLock';
import { DUR, EASE } from '../../lib/motion';
import './Lightbox.scss';

export interface LightboxItem {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const open = index !== null;
  const current = open ? items[index] : undefined;
  const panelRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const next = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  // Tab fica dentro do lightbox, Esc fecha e o foco volta à foto que o abriu.
  useFocusTrap(panelRef, open, { onEscape: onClose });
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  const position = open ? `${index + 1} de ${items.length}` : '';

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          ref={panelRef}
          className="ms-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.base, ease: EASE }}
          onClick={(e) => {
            // só o fundo fecha; cliques na figura e nos controles não
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada${items.length > 1 ? `, ${position}` : ''}`}
        >
          <div className="ms-lightbox__bar">
            {items.length > 1 && (
              <span className="ms-lightbox__count ms-meta">{position}</span>
            )}
            <button
              type="button"
              className="ms-lightbox__close"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X aria-hidden />
            </button>
          </div>
          <motion.figure
            className="ms-lightbox__figure"
            key={current.url}
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: DUR.base, ease: EASE }}
          >
            <img src={mediaUrl(current.url)} alt={current.alt ?? ''} />
            {current.caption && <figcaption>{current.caption}</figcaption>}
          </motion.figure>
          {items.length > 1 && (
            <div className="ms-lightbox__nav">
              <button
                type="button"
                className="ms-lightbox__navbtn"
                onClick={prev}
                aria-label="Anterior"
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                className="ms-lightbox__navbtn"
                onClick={next}
                aria-label="Próxima"
              >
                <ChevronRight aria-hidden />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
