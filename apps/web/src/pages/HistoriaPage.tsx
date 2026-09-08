import { History, Quote } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePageBlocks, useTimeline } from '../features/content/useContent';
import { Reveal } from '../components/motion/Reveal';
import { EmptyState } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { useDocumentHead } from '../lib/useDocumentHead';
import './HistoriaPage.scss';

export function HistoriaPage() {
  const { byKey } = usePageBlocks('historia');
  const timeline = useTimeline();

  const intro = byKey('intro');
  const quote = byKey('quote');

  useDocumentHead({
    title: 'História',
    description: intro?.subtitle || intro?.body || undefined,
    canonicalPath: '/historia',
  });

  return (
    <>
      <PageHero
        kicker="Nossa Trajetória"
        title={intro?.title ?? 'Nossa História'}
        subtitle={intro?.subtitle ?? undefined}
      />

      <section className="ms-section ms-container">
        {intro?.body && <p className="ms-historia__intro">{intro.body}</p>}

        <QueryState
          query={timeline}
          skeleton={<ListSkeleton rows={5} />}
          isEmpty={(items) => items.length === 0}
          empty={
            <EmptyState
              icon={<History />}
              title="Linha do tempo em construção"
              description="Em breve, os marcos da equipe."
            />
          }
        >
          {(items) => (
            <ol className="ms-timeline">
              {items.map((item, i) => (
                <Reveal
                  as="li"
                  key={item.id}
                  className="ms-timeline__item"
                  delay={i * 0.03}
                >
                  <div className="ms-timeline__marker">
                    <span className="ms-timeline__dot" />
                  </div>
                  <div className="ms-timeline__content">
                    <span className="ms-timeline__year">{item.year}</span>
                    <h3 className="ms-timeline__title">{item.title}</h3>
                    <p className="ms-timeline__desc">{item.description}</p>
                    {item.media && (
                      <MediaImage
                        className="ms-timeline__img"
                        media={item.media}
                        alt={item.media.alt ?? item.title}
                        thumb
                      />
                    )}
                  </div>
                </Reveal>
              ))}
            </ol>
          )}
        </QueryState>

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
