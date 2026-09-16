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
  /**
   * Dica de largura de exibição (`(max-width: 768px) 100vw, 33vw`). A API guarda
   * um único original e uma miniatura, então não há `srcset`; a dica ainda ajuda o
   * navegador a priorizar o download.
   */
  sizes?: string;
  className?: string;
}

/**
 * `<img>` de uma mídia da API. Leva `width`/`height` do registro quando
 * existem: o navegador reserva a proporção antes do download (sem salto de
 * layout) e o container decide o tamanho final via CSS (`object-fit`,
 * `aspect-ratio`). A miniatura tem a mesma proporção do original, então os
 * atributos valem para as duas.
 */
export function MediaImage({
  media,
  alt,
  thumb,
  priority,
  sizes,
  className,
}: MediaImageProps) {
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
      sizes={sizes}
      {...priorityAttrs}
    />
  );
}
