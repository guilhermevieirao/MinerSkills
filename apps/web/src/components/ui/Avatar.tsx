import type { MediaAssetDTO } from '@minerskills/shared';
import { cx } from '../../lib/format';
import { MediaImage } from './MediaImage';

/** Iniciais de um nome ("Davi Lucca Souza" → "DS"; "R.O.B." → "R"). */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]!;
  const last = words.length > 1 ? words[words.length - 1]! : '';
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

/**
 * Avatar: foto quando existe, iniciais quando não — nunca um retângulo vazio.
 * Decorativo por padrão (o nome aparece ao lado); `alt` o torna informativo.
 */
export function Avatar({
  name,
  media,
  size,
  tone,
  square,
  alt,
  className,
}: {
  name: string;
  media?: MediaAssetDTO | null;
  size?: 'sm' | 'lg' | 'xl';
  tone?: 'brand';
  square?: boolean;
  alt?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'ms-avatar',
        size && `ms-avatar--${size}`,
        tone && `ms-avatar--${tone}`,
        square && 'ms-avatar--square',
        className,
      )}
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt}
    >
      {media ? <MediaImage media={media} alt="" thumb /> : <span>{initials(name)}</span>}
    </span>
  );
}
