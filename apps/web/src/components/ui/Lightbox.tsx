import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaUrl } from '../../lib/format';
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

  const prev = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const next = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, prev, next]);

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="ms-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <button className="ms-lightbox__close" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
          {items.length > 1 && (
            <button
              className="ms-lightbox__nav ms-lightbox__nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Anterior"
            >
              <ChevronLeft />
            </button>
          )}
          <motion.figure
            className="ms-lightbox__figure"
            onClick={(e) => e.stopPropagation()}
            key={current.url}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <img src={mediaUrl(current.url)} alt={current.alt ?? ''} />
            {current.caption && <figcaption>{current.caption}</figcaption>}
          </motion.figure>
          {items.length > 1 && (
            <button
              className="ms-lightbox__nav ms-lightbox__nav--next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Próxima"
            >
              <ChevronRight />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
