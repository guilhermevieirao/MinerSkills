import { History } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePageBlocks, useTimeline } from '../features/content/useContent';
import { Reveal } from '../components/motion/Reveal';
import { EmptyState, SectionHeading } from '../components/ui';
import { ErrorState } from '../components/ui/ErrorState';
import { QueryState } from '../components/ui/QueryState';
import { Quote } from '../components/ui/Quote';
import { ListSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { useDocumentHead } from '../lib/useDocumentHead';
import './HistoriaPage.scss';

export function HistoriaPage() {
  const blocks = usePageBlocks('historia');
  const { byKey } = blocks;
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
        kicker="Nossa trajetória"
        title={intro?.title ?? 'Nossa História'}
        subtitle={intro?.subtitle ?? undefined}
      />

      <section className="ms-section ms-container ms-historia">
        {/* Os textos são complemento da linha do tempo: um erro vira uma faixa discreta */}
        {blocks.isError && (
          <ErrorState
            compact
            error={blocks.error}
            title="Não foi possível carregar os textos da página"
            onRetry={() => void blocks.refetch()}
            retrying={blocks.isFetching}
          />
        )}
        {intro?.body && (
          <div className="ms-prose ms-historia__intro">
            {intro.body.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        <SectionHeading kicker="Marcos" title="Linha do tempo" dense />

        <QueryState
          query={timeline}
          skeleton={<ListSkeleton rows={5} lead={0} />}
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
            <Reveal>
              <ol className="ms-timeline" role="list">
                {items.map((item) => (
                  <li key={item.id} className="ms-timeline__item">
                    <div className="ms-timeline__marker" aria-hidden>
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
                          alt={item.media.alt ?? ''}
                          thumb
                          sizes="(max-width: 767px) 100vw, 640px"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
        </QueryState>

        {quote?.body && (
          <Reveal>
            <Quote display className="ms-historia__quote">
              {quote.body}
            </Quote>
          </Reveal>
        )}
      </section>
    </>
  );
}
