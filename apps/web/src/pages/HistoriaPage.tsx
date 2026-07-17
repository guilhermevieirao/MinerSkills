import { Quote } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePageBlocks, useTimeline } from '../features/content/useContent';
import { Reveal } from '../components/motion/Reveal';
import { Loader } from '../components/ui';
import { mediaUrl } from '../lib/format';
import './HistoriaPage.scss';

export function HistoriaPage() {
  const { byKey } = usePageBlocks('historia');
  const { data: timeline, isLoading } = useTimeline();

  const intro = byKey('intro');
  const quote = byKey('quote');

  return (
    <>
      <PageHero
        kicker="Nossa Trajetória"
        title={intro?.title ?? 'Nossa História'}
        subtitle={intro?.subtitle ?? undefined}
      />

      <section className="ms-section ms-container">
        {intro?.body && <p className="ms-historia__intro">{intro.body}</p>}

        {isLoading ? (
          <Loader />
        ) : (
          <ol className="ms-timeline">
            {(timeline ?? []).map((item, i) => (
              <Reveal as="li" key={item.id} className="ms-timeline__item" delay={i * 0.03}>
                <div className="ms-timeline__marker">
                  <span className="ms-timeline__dot" />
                </div>
                <div className="ms-timeline__content">
                  <span className="ms-timeline__year">{item.year}</span>
                  <h3 className="ms-timeline__title">{item.title}</h3>
                  <p className="ms-timeline__desc">{item.description}</p>
                  {item.media && (
                    <img
                      className="ms-timeline__img"
                      src={mediaUrl(item.media.thumbUrl ?? item.media.url)}
                      alt={item.media.alt ?? item.title}
                      loading="lazy"
                    />
                  )}
                </div>
              </Reveal>
            ))}
          </ol>
        )}

        {quote?.body && (
          <Reveal>
            <blockquote className="ms-historia__quote">
              <Quote className="ms-historia__quote-icon" />
              <p>{quote.body}</p>
            </blockquote>
          </Reveal>
        )}
      </section>
    </>
  );
}
