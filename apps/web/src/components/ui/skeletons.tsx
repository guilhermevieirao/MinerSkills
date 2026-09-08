import type { ReactNode } from 'react';
import { Skeleton } from './index';
import './ui-extras.scss';

/**
 * Placeholders de carregamento montados com o <Skeleton> do kit. Cada um
 * espelha o layout que vai substituir (grid de cards, lista, artigo, hero)
 * para o conteúdo real chegar sem salto de layout. Todos ficam fora da
 * árvore de acessibilidade: a página anuncia o carregamento de outro jeito.
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

/** Grid de cards com mídia em cima (blog, galeria, equipe, prêmios). */
export function CardGridSkeleton({
  count = 6,
  aspect = '16 / 10',
}: {
  count?: number;
  /** Proporção da área de mídia, no formato CSS (`'1'`, `'3 / 4'`). */
  aspect?: string;
}) {
  return (
    <div className="ms-skel__grid" aria-hidden>
      <Range count={count}>
        {(i) => (
          <div key={i} className="ms-skel__card">
            <div className="ms-skel__media" style={{ aspectRatio: aspect }}>
              <Skeleton height="100%" radius={0} />
            </div>
            <div className="ms-skel__card-body ms-skel__lines">
              <Skeleton height={12} width="35%" />
              <Skeleton height={22} width="85%" />
              <Skeleton height={14} />
              <Skeleton height={14} width="70%" />
            </div>
          </div>
        )}
      </Range>
    </div>
  );
}

/** Linhas com um bloco quadrado à esquerda (agenda, timeline, temporadas). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ms-skel__list" aria-hidden>
      <Range count={rows}>
        {(i) => (
          <div key={i} className="ms-skel__row">
            <Skeleton height={72} width={72} />
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

/** Cabeçalho de página (mesma altura do PageHero). */
export function HeroSkeleton() {
  return (
    <div className="ms-skel__hero" aria-hidden>
      <div className="ms-container ms-skel__hero-inner">
        <Skeleton height={12} width={160} />
        <Skeleton height={56} width="70%" />
        <Skeleton height={18} width="55%" />
      </div>
    </div>
  );
}

/** Post do blog: hero + parágrafos. */
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
