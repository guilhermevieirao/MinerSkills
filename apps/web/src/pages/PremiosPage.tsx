import { Award as AwardIcon, Star } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { useAwards } from '../features/awards/useAwards';
import { EmptyState, Tag } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Reveal } from '../components/motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';
import './PremiosPage.scss';

const DESCRIPTION =
  'Cada troféu conta uma história de dedicação, trabalho em equipe e evolução.';

export function PremiosPage() {
  const awards = useAwards();

  useDocumentHead({
    title: 'Prêmios',
    description: DESCRIPTION,
    canonicalPath: '/premios',
  });

  return (
    <>
      <PageHero
        kicker="Reconhecimento"
        title="Prêmios & Conquistas"
        subtitle={DESCRIPTION}
      />

      <section className="ms-section ms-container">
        <QueryState
          query={awards}
          skeleton={<CardGridSkeleton count={6} aspect="16 / 9" />}
          isEmpty={(list) => list.length === 0}
          empty={<EmptyState icon={<AwardIcon />} title="Sem conquistas cadastradas" />}
        >
          {(list) => {
            const highlights = list.filter((a) => a.highlight);
            const rest = list.filter((a) => !a.highlight);
            return (
              <>
                {highlights.length > 0 && (
                  <div className="ms-awards__highlights">
                    {highlights.map((a, i) => (
                      <Reveal key={a.id} delay={i * 0.05}>
                        <div className="ms-award-hero">
                          <div className="ms-award-hero__badge">
                            {a.media ? (
                              <MediaImage media={a.media} alt={a.title} thumb />
                            ) : (
                              <Star />
                            )}
                          </div>
                          <div className="ms-award-hero__content">
                            <span className="ms-award-hero__year">{a.year}</span>
                            <h2>{a.title}</h2>
                            <span className="ms-award-hero__event">{a.event}</span>
                            {a.seasonRef && (
                              <div className="ms-award-hero__season">
                                <Tag variant="muted">{a.seasonRef.name}</Tag>
                              </div>
                            )}
                            <p>{a.description}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}

                {rest.length > 0 && (
                  <div className="ms-awards__grid">
                    {rest.map((a, i) => (
                      <Reveal key={a.id} delay={i * 0.04}>
                        <div className="ms-award-card">
                          <div className="ms-award-card__icon">
                            {a.media ? (
                              <MediaImage media={a.media} alt={a.title} thumb />
                            ) : (
                              <AwardIcon />
                            )}
                          </div>
                          <span className="ms-award-card__year">{a.year}</span>
                          <h3>{a.title}</h3>
                          <span className="ms-award-card__event">{a.event}</span>
                          {a.seasonRef && (
                            <div className="ms-award-card__season">
                              <Tag variant="muted">{a.seasonRef.name}</Tag>
                            </div>
                          )}
                          <p>{a.description}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}
              </>
            );
          }}
        </QueryState>
      </section>
    </>
  );
}
