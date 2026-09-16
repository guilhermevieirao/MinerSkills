import type { ReactNode } from 'react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { ImageOff, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/format';
import { MediaImage } from './MediaImage';

/** Quadrado com ícone (pilares, etapas, intro do quiz). */
export function IconTile({
  icon: Icon,
  size,
  className,
}: {
  icon: LucideIcon;
  size?: 'lg';
  className?: string;
}) {
  return (
    <span
      className={cx('ms-icontile', size && `ms-icontile--${size}`, className)}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

/** Círculo com imagem ou ícone (selo de temporada, prêmio). */
export function Medallion({
  media,
  icon: Icon,
  alt = '',
  size,
  className,
}: {
  media?: MediaAssetDTO | null;
  icon?: LucideIcon;
  alt?: string;
  size?: 'sm' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <span className={cx('ms-medallion', size && `ms-medallion--${size}`, className)}>
      {media ? (
        <MediaImage media={media} alt={alt} thumb />
      ) : Icon ? (
        <Icon aria-hidden />
      ) : null}
    </span>
  );
}

/**
 * Miniatura de listagem com fallback: nunca uma célula vazia (a altura da linha
 * fica constante, e o leitor de tela não anuncia nada).
 */
export function Thumb({
  media,
  icon: Icon = ImageOff,
  alt = '',
  size,
  round,
  className,
  children,
}: {
  media?: MediaAssetDTO | null;
  icon?: LucideIcon;
  alt?: string;
  size?: 'lg';
  round?: boolean;
  className?: string;
  /** Conteúdo alternativo (ex.: ícone de vídeo). */
  children?: ReactNode;
}) {
  return (
    <span
      className={cx(
        'ms-thumb',
        size && `ms-thumb--${size}`,
        round && 'ms-thumb--round',
        className,
      )}
      aria-hidden={alt ? undefined : true}
    >
      {media ? (
        <MediaImage media={media} alt={alt} thumb />
      ) : (
        (children ?? <Icon aria-hidden />)
      )}
    </span>
  );
}
