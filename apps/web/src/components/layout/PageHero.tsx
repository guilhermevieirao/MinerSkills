import type { ReactNode } from 'react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { cx } from '../../lib/format';
import { HexPattern } from '../motion/HexPattern';
import { MediaImage } from '../ui/MediaImage';
import './PageHero.scss';

export interface PageHeroProps {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trilha "Fórum › Tópico" acima do título (`<Breadcrumb>`). */
  breadcrumb?: ReactNode;
  /** Botões à direita do título (assinar agenda, novo tópico…). */
  actions?: ReactNode;
  /** Barra de busca ou filtros abaixo do título. */
  toolbar?: ReactNode;
  /** Compat: filhos vão para o slot `toolbar`. */
  children?: ReactNode;
  /** Imagem de fundo (capa do post) — o texto fica sobre um scrim. */
  media?: MediaAssetDTO | null;
  /** Altura e tamanho do título. */
  size?: 'sm' | 'md' | 'lg';
  /** Textura hexagonal de fundo (só onde a marca pede: Home). */
  decor?: boolean;
  className?: string;
}

/**
 * Cabeçalho de página compacto: kicker, h1 e subtítulo numa coluna de leitura,
 * com slots para trilha, ações e barra de ferramentas. Mesmo container do
 * conteúdo — o título alinha com o que vem abaixo. Sem animação de entrada
 * (o `<main>` já compensa a navbar fixa; a página não "pula").
 */
export function PageHero({
  kicker,
  title,
  subtitle,
  breadcrumb,
  actions,
  toolbar,
  children,
  media,
  size = 'md',
  decor = false,
  className,
}: PageHeroProps) {
  const tools = toolbar ?? children;
  return (
    <header
      className={cx(
        'ms-pagehero',
        size !== 'md' && `ms-pagehero--${size}`,
        media && 'ms-pagehero--media',
        className,
      )}
    >
      {decor && <HexPattern />}
      {media && (
        <div className="ms-pagehero__media" aria-hidden>
          <MediaImage media={media} alt="" priority sizes="100vw" />
        </div>
      )}
      <div className="ms-container ms-pagehero__inner">
        {breadcrumb && <div className="ms-pagehero__crumb">{breadcrumb}</div>}
        <div className="ms-pagehero__row">
          <div className="ms-pagehero__text">
            {kicker && <p className="ms-pagehero__kicker">{kicker}</p>}
            <h1 className="ms-pagehero__title">{title}</h1>
            {subtitle && <p className="ms-pagehero__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ms-pagehero__actions">{actions}</div>}
        </div>
        {tools && <div className="ms-pagehero__toolbar">{tools}</div>}
      </div>
    </header>
  );
}
