import type { MediaAssetDTO } from '@minerskills/shared';
import { cx, mediaUrl } from '../../lib/format';
import './ui-extras.scss';

export interface MediaImageProps {
  media: MediaAssetDTO;
  /** Texto alternativo; sem valor usa o `alt` cadastrado na mídia (ou vazio, decorativa). */
  alt?: string;
  /** Usa a miniatura (`thumbUrl`) quando existir — listas, grids e cards. */
  thumb?: boolean;
  /** Imagem acima da dobra (hero, capa): carrega já e com prioridade alta. */
  priority?: boolean;
  className?: string;
}

/**
 * `<img>` de uma mídia da API. Leva `width`/`height` do registro quando
 * existem: o navegador reserva a proporção antes do download (sem salto de
 * layout) e o container decide o tamanho final via CSS (`object-fit`,
 * `aspect-ratio`). A miniatura tem a mesma proporção do original, então os
 * atributos valem para as duas.
 *
 * Não há `srcset` (a API guarda um único original e uma miniatura de largura
 * fixa), logo também não há `sizes`: a escolha do arquivo é só `thumb` vs
 * original.
 */
export function MediaImage({ media, alt, thumb, priority, className }: MediaImageProps) {
  const src = mediaUrl(thumb ? (media.thumbUrl ?? media.url) : media.url);
  // React 18 só repassa `fetchpriority` como atributo em minúsculas (sem tipagem própria)
  const priorityAttrs = priority
    ? ({ fetchpriority: 'high' } as Record<string, string>)
    : undefined;
  return (
    <img
      className={cx('ms-media-img', className)}
      src={src}
      alt={alt ?? media.alt ?? ''}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...priorityAttrs}
    />
  );
}
