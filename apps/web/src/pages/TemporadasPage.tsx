import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Award as AwardIcon, Bot, CalendarDays, ChevronDown, Layers } from 'lucide-react';
import type { SeasonDTO, SeasonDetailDTO } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useSeason, useSeasons } from '../features/seasons/useSeasons';
import { EmptyState, Tag } from '../components/ui';
import { Medallion, Thumb } from '../components/ui/tiles';
import { DateText } from '../components/ui/DateText';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { Reveal } from '../components/motion/Reveal';
import { DUR, EASE } from '../lib/motion';
import { cx } from '../lib/format';
import { useDocumentHead } from '../lib/useDocumentHead';
import './TemporadasPage.scss';

/** Abrir/fechar um card só troca o query param `t`: sem rolar ao topo (ver PublicLayout). */
const KEEP_SCROLL = { preserveScroll: true };

function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

const DESCRIPTION =
  'A cada ano a FRC revela um jogo novo. Aqui estão os robôs, os prêmios e os eventos de cada temporada da MinerSkills.';

export function TemporadasPage() {
  const seasons = useSeasons();
  // A temporada expandida vive na URL (/temporadas?t=<slug>): o link é compartilhável.
  const [params, setParams] = useSearchParams();
  const expanded = params.get('t');

  useDocumentHead({
    title: 'Temporadas',
    description: DESCRIPTION,
    canonicalPath: '/temporadas',
  });

  const toggle = (slug: string) =>
    setParams(expanded === slug ? {} : { t: slug }, {
      replace: true,
      state: KEEP_SCROLL,
    });

  return (
    <>
      <PageHero
        kicker="Linha do tempo competitiva"
        title="Temporadas"
        subtitle={DESCRIPTION}
      />

      <section className="ms-section ms-container">
        <QueryState
          query={seasons}
          skeleton={<ListSkeleton rows={3} lead={96} />}
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={<Layers />}
              title="Nenhuma temporada cadastrada"
              description="As temporadas da equipe aparecem aqui assim que forem publicadas."
            />
          }
        >
          {(list) => (
            <Reveal>
              <ul className="ms-seasons" role="list">
                {list.map((s) => (
                  <li key={s.id}>
                    <SeasonCard
                      season={s}
                      expanded={expanded === s.slug}
                      onToggle={() => toggle(s.slug)}
                    />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </QueryState>
      </section>
    </>
  );
}

function SeasonCard({
  season,
  expanded,
  onToggle,
}: {
  season: SeasonDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `season-${season.slug}`;
  return (
    <article
      className={cx(
        'ms-season',
        season.isCurrent && 'ms-season--current',
        expanded && 'ms-season--open',
      )}
    >
      {/* O cabeçalho inteiro abre o card ao clique (presentational); o botão dá o acesso
          por teclado e o estado ARIA. */}
      <div className="ms-season__head" role="presentation" onClick={onToggle}>
        <Medallion
          media={season.badge}
          icon={Layers}
          size="lg"
          className="ms-season__badge"
        />
        <div className="ms-season__info">
          <div className="ms-season__tags">
            <span className="ms-meta">{season.year}</span>
            {season.isCurrent && <Tag tone="success">Temporada atual</Tag>}
          </div>
          <h2 className="ms-season__name">{season.name}</h2>
          {season.game && <p className="ms-season__game">{season.game}</p>}
          {season.summary && <p className="ms-season__summary">{season.summary}</p>}
          <p className="ms-season__counts ms-meta">
            {count(season.robotsCount, 'robô', 'robôs')} ·{' '}
            {count(season.awardsCount, 'prêmio', 'prêmios')}
          </p>
        </div>
        <button
          type="button"
          className="ms-season__toggle ms-btn ms-btn--outline ms-btn--sm"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <span>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
          <ChevronDown aria-hidden />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            className="ms-season__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
          >
            <SeasonDetail slug={season.slug} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function SeasonDetail({ slug }: { slug: string }) {
  const season = useSeason(slug);
  return (
    <QueryState
      query={season}
      compact
      skeleton={
        <div className="ms-season__loading">
          <ListSkeleton rows={2} lead={48} />
        </div>
      }
    >
      {(data) => <SeasonColumns data={data} />}
    </QueryState>
  );
}

function SeasonColumns({ data }: { data: SeasonDetailDTO }) {
  return (
    <div className="ms-season__columns">
      <section className="ms-season__group">
        <h3 className="ms-season__group-title">
          <Bot aria-hidden /> Robôs
        </h3>
        {data.robots.length === 0 ? (
          <p className="ms-season__empty">Nenhum robô vinculado a esta temporada.</p>
        ) : (
          <ul className="ms-season__robots" role="list">
            {data.robots.map((r) => (
              <li key={r.id}>
                <Link to={`/equipe/${r.slug}`} className="ms-season__robot">
                  <Thumb media={r.photo} icon={Bot} />
                  <span className="ms-season__robot-text">
                    <span className="ms-season__robot-name">{r.name}</span>
                    {r.role && <span className="ms-season__robot-role">{r.role}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ms-season__group">
        <h3 className="ms-season__group-title">
          <AwardIcon aria-hidden /> Prêmios
        </h3>
        {data.awards.length === 0 ? (
          <p className="ms-season__empty">Nenhum prêmio nesta temporada.</p>
        ) : (
          <ul className="ms-season__list" role="list">
            {data.awards.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <span>
                  {a.event} · {a.year}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ms-season__group">
        <h3 className="ms-season__group-title">
          <CalendarDays aria-hidden /> Eventos de {data.year}
        </h3>
        {data.events.length === 0 ? (
          <p className="ms-season__empty">Nenhum evento publicado em {data.year}.</p>
        ) : (
          <ul className="ms-season__list" role="list">
            {data.events.map((e) => (
              <li key={e.id}>
                <strong>{e.title}</strong>
                <DateText iso={e.startsAt} format="long" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
