import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Award as AwardIcon, Bot, CalendarDays, ChevronDown, Layers } from 'lucide-react';
import type { SeasonDTO, SeasonDetailDTO } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useSeason, useSeasons } from '../features/seasons/useSeasons';
import { EmptyState, Tag } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Reveal } from '../components/motion/Reveal';
import { cx, formatDate } from '../lib/format';
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
          skeleton={<ListSkeleton rows={3} />}
          isEmpty={(list) => list.length === 0}
          empty={<EmptyState icon={<Layers />} title="Nenhuma temporada cadastrada" />}
        >
          {(list) => (
            <div className="ms-seasons">
              {list.map((s, i) => (
                <SeasonCard
                  key={s.id}
                  season={s}
                  expanded={expanded === s.slug}
                  onToggle={() => toggle(s.slug)}
                  delay={i * 0.05}
                />
              ))}
            </div>
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
  delay,
}: {
  season: SeasonDTO;
  expanded: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const panelId = `season-${season.slug}`;
  return (
    <Reveal
      as="article"
      delay={delay}
      className={cx(
        'ms-season',
        season.isCurrent && 'ms-season--current',
        expanded && 'ms-season--open',
      )}
    >
      {/* O cabeçalho inteiro abre o card ao clique (presentational); o botão dá o acesso
          por teclado e o estado ARIA. */}
      <div className="ms-season__head" role="presentation" onClick={onToggle}>
        <div className="ms-season__badge">
          {season.badge ? <MediaImage media={season.badge} alt="" thumb /> : <Layers />}
        </div>
        <div className="ms-season__info">
          <span className="ms-season__year">{season.year}</span>
          <h2 className="ms-season__name">{season.name}</h2>
          {season.game && <span className="ms-season__game">{season.game}</span>}
          {season.summary && <p className="ms-season__summary">{season.summary}</p>}
          <div className="ms-season__meta">
            <span className="ms-season__counts">
              {count(season.robotsCount, 'robô', 'robôs')} ·{' '}
              {count(season.awardsCount, 'prêmio', 'prêmios')}
            </span>
            {season.isCurrent && <Tag>Temporada atual</Tag>}
          </div>
        </div>
        <button
          type="button"
          className="ms-season__toggle"
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
            transition={{ duration: 0.3 }}
          >
            <SeasonDetail slug={season.slug} />
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
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
          <ListSkeleton rows={2} />
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
        <h3>
          <Bot /> Robôs
        </h3>
        {data.robots.length === 0 ? (
          <p className="ms-season__empty">Nenhum robô vinculado a esta temporada.</p>
        ) : (
          <ul className="ms-season__robots">
            {data.robots.map((r) => (
              <li key={r.id}>
                <Link to={`/equipe/${r.slug}`} className="ms-season__robot">
                  <span className="ms-season__robot-photo">
                    {r.photo ? <MediaImage media={r.photo} alt="" thumb /> : <Bot />}
                  </span>
                  <span className="ms-season__robot-name">{r.name}</span>
                  {r.role && <span className="ms-season__robot-role">{r.role}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ms-season__group">
        <h3>
          <AwardIcon /> Prêmios
        </h3>
        {data.awards.length === 0 ? (
          <p className="ms-season__empty">Nenhum prêmio nesta temporada.</p>
        ) : (
          <ul className="ms-season__list">
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
        <h3>
          <CalendarDays /> Eventos de {data.year}
        </h3>
        {data.events.length === 0 ? (
          <p className="ms-season__empty">Nenhum evento publicado em {data.year}.</p>
        ) : (
          <ul className="ms-season__list">
            {data.events.map((e) => (
              <li key={e.id}>
                <strong>{e.title}</strong>
                <span>{formatDate(e.startsAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
