import {
  cx,
  formatDate,
  formatDateShort,
  formatDateTime,
  timeAgo,
} from '../../lib/format';

type DateFormat = 'long' | 'short' | 'datetime' | 'relative' | 'time';

const FORMAT: Record<DateFormat, (iso: string) => string> = {
  long: (iso) => formatDate(iso),
  short: (iso) => formatDateShort(iso),
  datetime: (iso) => formatDateTime(iso),
  relative: (iso) => timeAgo(iso),
  time: (iso) => formatDate(iso, 'HH:mm'),
};

/**
 * Data com semântica: `<time dateTime>` sempre, num dos formatos canônicos —
 * `long` (5 de março de 2026), `short` (5 mar 2026), `datetime` (5 mar 2026 às 09:00),
 * `relative` (há 3 dias, com a data completa no `title`) ou `time` (09:00).
 */
export function DateText({
  iso,
  format = 'short',
  className,
  meta = true,
}: {
  iso: string;
  format?: DateFormat;
  className?: string;
  /** Estilo de metadado (mono, discreto). */
  meta?: boolean;
}) {
  return (
    <time
      dateTime={iso}
      className={cx(meta && 'ms-meta', className)}
      title={format === 'relative' ? formatDateTime(iso) : undefined}
    >
      {FORMAT[format](iso)}
    </time>
  );
}
