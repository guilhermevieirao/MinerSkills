import { useMemo } from 'react';
import { ArrowRight, CalendarClock, MapPin } from 'lucide-react';
import { useAgenda } from '../../features/agenda/useAgenda';
import { LinkButton, SectionHeading, Skeleton } from '../ui';
import { DateText } from '../ui/DateText';
import { Countdown } from '../motion/Countdown';
import './NextCompetition.scss';

/**
 * Faixa da Home com a próxima competição (evento publicado de tipo
 * `competicao` com início no futuro) e um contador regressivo. Enquanto a
 * agenda carrega, reserva a altura com um esqueleto; sem competição futura
 * (ou com erro — a Home não depende dela) não renderiza nada.
 */
export function NextCompetition() {
  const agenda = useAgenda();

  const next = useMemo(() => {
    const now = Date.now();
    return (
      (agenda.data ?? [])
        .filter((e) => e.kind === 'competicao' && new Date(e.startsAt).getTime() > now)
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0] ?? null
    );
  }, [agenda.data]);

  if (agenda.data === undefined) {
    if (agenda.isError || agenda.fetchStatus === 'paused') return null;
    return (
      <section className="ms-section ms-next ms-next--loading" aria-hidden>
        <div className="ms-container ms-next__inner">
          <div className="ms-next__info">
            <Skeleton height={12} width={180} />
            <Skeleton height={36} width="70%" />
            <Skeleton height={16} width="45%" />
          </div>
          <Skeleton height={92} width={320} />
        </div>
      </section>
    );
  }

  if (!next) return null;

  return (
    <section className="ms-section ms-next" aria-labelledby="ms-next-title">
      <div className="ms-container ms-next__inner">
        <div className="ms-next__info">
          <SectionHeading
            id="ms-next-title"
            kicker="Próxima competição"
            title={next.title}
            dense
          />
          <div className="ms-next__meta">
            <span>
              <CalendarClock aria-hidden />
              <DateText iso={next.startsAt} format="datetime" meta={false} />
            </span>
            {next.location && (
              <span>
                <MapPin aria-hidden />
                {next.location}
              </span>
            )}
          </div>
          <LinkButton to="/agenda" variant="outline" size="sm">
            Ver agenda <ArrowRight aria-hidden />
          </LinkButton>
        </div>
        <div className="ms-next__timer">
          <Countdown target={next.startsAt} />
        </div>
      </div>
    </section>
  );
}
