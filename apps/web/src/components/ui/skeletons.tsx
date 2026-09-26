import type { CSSProperties, ReactNode } from 'react';
import { Skeleton } from './index';
import './ui-extras.scss';

/**
 * Placeholders de carregamento montados com o <Skeleton> do kit. Cada um
 * espelha o layout que vai substituir — mesma grade, mesma largura do bloco de
 * mídia — para o conteúdo real chegar sem salto. Todos ficam fora da árvore de
 * acessibilidade: a página anuncia o carregamento de outro jeito.
 */

function Range({
  count,
  children,
}: {
  count: number;
  children: (i: number) => ReactNode;
}) {
  return <>{Array.from({ length: count }, (_, i) => children(i))}</>;
}

/**
 * Grid de cards com mídia em cima (blog, galeria, equipe, prêmios). `min` é a
 * largura mínima de coluna da grade REAL (o mesmo valor passado ao mixin
 * `card-grid`), para o esqueleto ter o mesmo número de colunas. `body={false}`
 * para grades só de imagem (galeria).
 */
export function CardGridSkeleton({
  count = 6,
  aspect = '16 / 10',
  min = 260,
  body = true,
}: {
  count?: number;
  /** Proporção da área de mídia, no formato CSS (`'1'`, `'3 / 4'`). */
  aspect?: string;
  /** Largura mínima de coluna, em px. */
  min?: number;
  /** Linhas de texto abaixo da mídia. */
  body?: boolean;
}) {
  return (
    <div
      className="ms-skel__grid"
      aria-hidden
      style={{ '--ms-skel-min': `${min}px` } as CSSProperties}
    >
      <Range count={count}>
        {(i) => (
          <div key={i} className="ms-skel__card">
            <div className="ms-skel__media" style={{ aspectRatio: aspect }}>
              <Skeleton height="100%" radius={0} />
            </div>
            {body && (
              <div className="ms-skel__card-body ms-skel__lines">
                <Skeleton height={12} width="35%" />
                <Skeleton height={22} width="85%" />
                <Skeleton height={14} />
                <Skeleton height={14} width="70%" />
              </div>
            )}
          </div>
        )}
      </Range>
    </div>
  );
}

/**
 * Linhas com um bloco à esquerda (agenda, timeline, temporadas). `lead` é a
 * largura desse bloco na lista real; `0` para listas só de texto (fórum).
 */
export function ListSkeleton({ rows = 4, lead = 72 }: { rows?: number; lead?: number }) {
  return (
    <div className="ms-skel__list" aria-hidden>
      <Range count={rows}>
        {(i) => (
          <div
            key={i}
            className="ms-skel__row"
            style={{ '--ms-skel-lead': lead > 0 ? `${lead}px` : '0px' } as CSSProperties}
          >
            {lead > 0 && <Skeleton height={lead} width={lead} />}
            <div className="ms-skel__lines">
              <Skeleton height={12} width="25%" />
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="90%" />
            </div>
          </div>
        )}
      </Range>
    </div>
  );
}

/** Cabeçalho de página (mesma altura e largura de texto do PageHero). */
export function HeroSkeleton() {
  return (
    <div className="ms-skel__hero" aria-hidden>
      <div className="ms-container">
        <div className="ms-skel__hero-inner">
          <Skeleton height={12} width={160} />
          <Skeleton height={48} width="70%" />
          <Skeleton height={18} width="55%" />
        </div>
      </div>
    </div>
  );
}

/** Post do blog: hero + parágrafos, na mesma coluna de leitura do artigo. */
export function ArticleSkeleton() {
  return (
    <div aria-hidden>
      <HeroSkeleton />
      <div className="ms-container">
        <div className="ms-skel__article">
          <div className="ms-skel__lines">
            <Range count={4}>{(i) => <Skeleton key={i} height={16} />}</Range>
            <Skeleton height={16} width="60%" />
          </div>
          <div className="ms-skel__lines">
            <Range count={3}>{(i) => <Skeleton key={i} height={16} />}</Range>
            <Skeleton height={16} width="45%" />
          </div>
        </div>
      </div>
    </div>
  );
}
