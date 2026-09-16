import type { ContentBlockDTO } from '@minerskills/shared';
import { Skeleton } from '../ui';
import { StatCounter } from '../motion/StatCounter';
import './StatsStrip.scss';

/**
 * Faixa de números da Home (blocos `stat_*` da página "landing"): valor grande
 * em voz de marca e legenda em Inter, separados por divisórias. Enquanto os
 * blocos carregam, reserva a mesma altura; sem blocos, não renderiza.
 */
export function StatsStrip({
  stats,
  loading,
}: {
  stats: ContentBlockDTO[];
  loading?: boolean;
}) {
  if (stats.length === 0 && !loading) return null;

  return (
    <section className="ms-stats" aria-label="Números da equipe">
      <div className="ms-container">
        {stats.length === 0 ? (
          <div className="ms-stats__grid" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="ms-stats__item">
                <Skeleton height={40} width="60%" />
                <Skeleton height={14} width="80%" />
              </div>
            ))}
          </div>
        ) : (
          <dl className="ms-stats__grid">
            {stats.map((s) => (
              <div key={s.key} className="ms-stats__item">
                <dt className="ms-stats__label">{s.subtitle}</dt>
                <dd className="ms-stats__value">
                  <StatCounter value={s.title ?? ''} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
