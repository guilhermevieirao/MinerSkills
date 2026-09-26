import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { EASE } from '../lib/motion';
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

        <SectionHeading title="Linha do tempo" dense />

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
          {(items) => <Timeline items={items} />}
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

type TimelineItem = NonNullable<ReturnType<typeof useTimeline>['data']>[number];

/**
 * Linha do tempo: o trilho verde se preenche conforme a lista atravessa a tela
 * (progresso da leitura); cada marco entra deslizando e o ponto "acende".
 */
function Timeline({ items }: { items: TimelineItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 75%', 'end 60%'],
  });
  const fill = useTransform(scrollYProgress, (v) => `scaleY(${v})`);

  return (
    <div ref={ref} className="ms-timeline-wrap">
      <motion.span
        className="ms-timeline__fill"
        aria-hidden
        style={reduce ? { transform: 'scaleY(1)' } : { transform: fill }}
      />
      <ol className="ms-timeline" role="list">
        {items.map((item) => (
          <motion.li
            key={item.id}
            className="ms-timeline__item"
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.5 }}
          >
            <div className="ms-timeline__marker" aria-hidden>
              <motion.span
                className="ms-timeline__dot"
                variants={{
                  hidden: { transform: 'scale(0.4)', opacity: 0.4 },
                  shown: {
                    transform: 'scale(1)',
                    opacity: 1,
                    transition: { type: 'spring', duration: 0.5, bounce: 0.3 },
                  },
                }}
              />
            </div>
            <motion.div
              className="ms-timeline__content"
              variants={{
                hidden: reduce
                  ? { opacity: 0 }
                  : { opacity: 0, transform: 'translateX(-16px)', filter: 'blur(6px)' },
                shown: {
                  opacity: 1,
                  transform: 'translateX(0px)',
                  filter: 'blur(0px)',
                  transition: { duration: 0.7, ease: EASE },
                },
              }}
            >
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
            </motion.div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
