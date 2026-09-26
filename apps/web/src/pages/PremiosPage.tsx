import { Award as AwardIcon, Star } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { useAwards } from '../features/awards/useAwards';
import { EmptyState, SectionHeading, Tag } from '../components/ui';
import { Medallion } from '../components/ui/tiles';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
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

      <section className="ms-section ms-container ms-awards">
        <QueryState
          query={awards}
          skeleton={<CardGridSkeleton count={6} aspect="16 / 9" min={260} />}
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={<AwardIcon />}
              title="Sem conquistas cadastradas"
              description="Os prêmios da equipe aparecem aqui assim que forem publicados."
            />
          }
        >
          {(list) => {
            const highlights = list.filter((a) => a.highlight);
            const rest = list.filter((a) => !a.highlight);
            return (
              <>
                {highlights.length > 0 && (
                  <div className="ms-awards__section">
                    <SectionHeading title="Destaques" dense />
                    <Reveal>
                      <ul className="ms-awards__highlights" role="list">
                        {highlights.map((a) => (
                          <li key={a.id}>
                            <article className="ms-award-hero">
                              <Medallion
                                media={a.media}
                                icon={Star}
                                size="xl"
                                className="ms-award-hero__badge"
                              />
                              <div className="ms-award-hero__content">
                                <div className="ms-award-hero__tags">
                                  <Tag tone="on-green">{a.year}</Tag>
                                  {a.seasonRef && (
                                    <Tag tone="on-green">{a.seasonRef.name}</Tag>
                                  )}
                                </div>
                                <h3 className="ms-award-hero__title">{a.title}</h3>
                                <p className="ms-award-hero__event">{a.event}</p>
                                {a.description && (
                                  <p className="ms-award-hero__desc">{a.description}</p>
                                )}
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  </div>
                )}

                {rest.length > 0 && (
                  <div className="ms-awards__section">
                    <SectionHeading
                      title={highlights.length > 0 ? 'Todas as conquistas' : 'Conquistas'}
                      dense
                    />
                    <Reveal>
                      <ul className="ms-awards__grid" role="list">
                        {rest.map((a) => (
                          <li key={a.id} className="ms-award-card">
                            <Medallion media={a.media} icon={AwardIcon} />
                            <div className="ms-award-card__tags">
                              <span className="ms-meta">{a.year}</span>
                              {a.seasonRef && (
                                <Tag tone="neutral">{a.seasonRef.name}</Tag>
                              )}
                            </div>
                            <h3 className="ms-award-card__title">{a.title}</h3>
                            <p className="ms-award-card__event">{a.event}</p>
                            {a.description && (
                              <p className="ms-award-card__desc">{a.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Reveal>
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
