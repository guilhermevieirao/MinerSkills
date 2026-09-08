import { useMemo } from 'react';
import { ArrowRight, CalendarClock, MapPin } from 'lucide-react';
import { useAgenda } from '../../features/agenda/useAgenda';
import { LinkButton, SectionHeading } from '../ui';
import { Reveal } from '../motion/Reveal';
import { Countdown } from '../motion/Countdown';
import { formatDateTime } from '../../lib/format';
import './NextCompetition.scss';

/**
 * Faixa da Home com a próxima competição (evento publicado de tipo
 * `competicao` com início no futuro) e um contador regressivo. Não renderiza
 * nada enquanto carrega ou quando não há competição futura.
 */
export function NextCompetition() {
  const { data } = useAgenda();

  const next = useMemo(() => {
    const now = Date.now();
    return (
      (data ?? [])
        .filter((e) => e.kind === 'competicao' && new Date(e.startsAt).getTime() > now)
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0] ?? null
    );
  }, [data]);

  if (!next) return null;

  return (
    <section className="ms-next" aria-label="Próxima competição">
      <div className="ms-container">
        <Reveal>
          <div className="ms-next__inner">
            <div className="ms-next__info">
              <SectionHeading kicker="Próxima competição" title={next.title} />
              <div className="ms-next__meta">
                <span>
                  <CalendarClock /> {formatDateTime(next.startsAt)}
                </span>
                {next.location && (
                  <span>
                    <MapPin /> {next.location}
                  </span>
                )}
              </div>
            </div>
            <div className="ms-next__timer">
              <Countdown target={next.startsAt} />
              <LinkButton to="/agenda" variant="outline">
                Ver agenda <ArrowRight />
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
