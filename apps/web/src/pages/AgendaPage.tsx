import { useMemo } from 'react';
import { CalendarDays, MapPin, CalendarClock } from 'lucide-react';
import { AGENDA_KIND_LABELS, type AgendaKind } from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useAgenda } from '../features/agenda/useAgenda';
import { Loader, EmptyState, Tag } from '../components/ui';
import { Reveal } from '../components/motion/Reveal';
import { formatDateTime } from '../lib/format';
import './AgendaPage.scss';

export function AgendaPage() {
  const { data, isLoading } = useAgenda();
  const now = Date.now();

  const { upcoming, past } = useMemo(() => {
    const events = data ?? [];
    return {
      upcoming: events
        .filter((e) => new Date(e.startsAt).getTime() >= now)
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
      past: events
        .filter((e) => new Date(e.startsAt).getTime() < now)
        .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)),
    };
  }, [data, now]);

  return (
    <>
      <PageHero
        kicker="Programação"
        title="Agenda"
        subtitle="Competições, reuniões, workshops e eventos da MinerSkills."
      />

      <section className="ms-section ms-container">
        {isLoading ? (
          <Loader />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<CalendarDays />} title="Nenhum evento agendado" />
        ) : (
          <div className="ms-agenda">
            <div>
              <h2 className="ms-agenda__group-title">
                <CalendarClock /> Próximos eventos
              </h2>
              {upcoming.length === 0 ? (
                <p className="ms-agenda__empty">Nenhum evento futuro no momento.</p>
              ) : (
                <div className="ms-agenda__list">
                  {upcoming.map((e, i) => (
                    <EventCard key={e.id} event={e} delay={i * 0.04} highlight />
                  ))}
                </div>
              )}
            </div>

            {past.length > 0 && (
              <div>
                <h2 className="ms-agenda__group-title ms-agenda__group-title--muted">
                  <CalendarDays /> Eventos anteriores
                </h2>
                <div className="ms-agenda__list">
                  {past.map((e, i) => (
                    <EventCard key={e.id} event={e} delay={i * 0.03} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function EventCard({
  event,
  delay,
  highlight,
}: {
  event: import('@minerskills/shared').AgendaEventDTO;
  delay: number;
  highlight?: boolean;
}) {
  const date = new Date(event.startsAt);
  return (
    <Reveal delay={delay}>
      <article className={`ms-event ${highlight ? 'ms-event--next' : ''}`}>
        <div className="ms-event__date">
          <span className="ms-event__day">{date.getDate()}</span>
          <span className="ms-event__month">
            {date.toLocaleDateString('pt-BR', { month: 'short' })}
          </span>
          <span className="ms-event__year">{date.getFullYear()}</span>
        </div>
        <div className="ms-event__body">
          <Tag variant={highlight ? undefined : 'muted'}>
            {AGENDA_KIND_LABELS[event.kind as AgendaKind] ?? event.kind}
          </Tag>
          <h3>{event.title}</h3>
          <p>{event.description}</p>
          <div className="ms-event__meta">
            <span>
              <CalendarClock /> {formatDateTime(event.startsAt)}
            </span>
            {event.location && (
              <span>
                <MapPin /> {event.location}
              </span>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
}
