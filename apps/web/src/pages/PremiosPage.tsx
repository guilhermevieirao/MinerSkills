import { Award as AwardIcon, Star } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { useAwards } from '../features/awards/useAwards';
import { Loader, EmptyState } from '../components/ui';
import { Reveal } from '../components/motion/Reveal';
import { mediaUrl } from '../lib/format';
import './PremiosPage.scss';

export function PremiosPage() {
  const { data, isLoading } = useAwards();

  const highlights = (data ?? []).filter((a) => a.highlight);
  const rest = (data ?? []).filter((a) => !a.highlight);

  return (
    <>
      <PageHero
        kicker="Reconhecimento"
        title="Prêmios & Conquistas"
        subtitle="Cada troféu conta uma história de dedicação, trabalho em equipe e evolução."
      />

      <section className="ms-section ms-container">
        {isLoading ? (
          <Loader />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<AwardIcon />} title="Sem conquistas cadastradas" />
        ) : (
          <>
            {highlights.length > 0 && (
              <div className="ms-awards__highlights">
                {highlights.map((a, i) => (
                  <Reveal key={a.id} delay={i * 0.05}>
                    <div className="ms-award-hero">
                      <div className="ms-award-hero__badge">
                        {a.media ? (
                          <img src={mediaUrl(a.media.thumbUrl ?? a.media.url)} alt={a.title} />
                        ) : (
                          <Star />
                        )}
                      </div>
                      <div className="ms-award-hero__content">
                        <span className="ms-award-hero__year">{a.year}</span>
                        <h2>{a.title}</h2>
                        <span className="ms-award-hero__event">{a.event}</span>
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
                          <img src={mediaUrl(a.media.thumbUrl ?? a.media.url)} alt={a.title} />
                        ) : (
                          <AwardIcon />
                        )}
                      </div>
                      <span className="ms-award-card__year">{a.year}</span>
                      <h3>{a.title}</h3>
                      <span className="ms-award-card__event">{a.event}</span>
                      <p>{a.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
