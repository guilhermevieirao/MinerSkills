import type { ReactNode } from 'react';
import { Quote as QuoteIcon } from 'lucide-react';
import { cx } from '../../lib/format';

/** Citação em duas escalas: inline (ficha de membro) e destaque (História). */
export function Quote({
  children,
  cite,
  display,
  className,
}: {
  children: ReactNode;
  cite?: ReactNode;
  display?: boolean;
  className?: string;
}) {
  return (
    <blockquote className={cx('ms-quote', display && 'ms-quote--display', className)}>
      <QuoteIcon aria-hidden />
      <p>{children}</p>
      {cite && <cite>{cite}</cite>}
    </blockquote>
  );
}
