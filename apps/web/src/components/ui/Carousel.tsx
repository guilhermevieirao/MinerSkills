import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../../lib/format';
import './Carousel.scss';

/**
 * Faixa horizontal de vitrine: os cards alinham com a coluna do conteúdo e
 * vazam pela borda direita da tela; rola com snap (toque, trackpad, teclado)
 * e tem setas que avançam uma "página" e se desativam nas pontas. A lista é
 * uma `<ul>` comum — leitores de tela percorrem os itens normalmente.
 */
export function Carousel({
  label,
  children,
  className,
  itemClassName,
}: {
  /** Nome da região ("Últimas notícias") — rótulo das setas e da lista. */
  label: string;
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const listId = useId();
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const scrollable = !(edges.start && edges.end);

  return (
    <div className={cx('ms-carousel', className)}>
      <ul
        ref={ref}
        id={listId}
        className="ms-carousel__track"
        role="list"
        aria-label={label}
      >
        {Children.map(children, (child) => (
          <li className={cx('ms-carousel__item', itemClassName)}>{child}</li>
        ))}
      </ul>
      {scrollable && (
        <div className="ms-container ms-carousel__controls">
          <button
            type="button"
            className="ms-carousel__arrow"
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-controls={listId}
            aria-label={`${label}: anteriores`}
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            className="ms-carousel__arrow"
            onClick={() => page(1)}
            disabled={edges.end}
            aria-controls={listId}
            aria-label={`${label}: próximos`}
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
