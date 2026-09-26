import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Download,
  MapPin,
  Rss,
} from 'lucide-react';
import {
  AGENDA_KIND_LABELS,
  googleCalendarUrl,
  type AgendaEventDTO,
  type AgendaKind,
} from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useAgenda } from '../features/agenda/useAgenda';
import { EmptyState, LinkButton, SectionHeading, Tag } from '../components/ui';
import { DateText } from '../components/ui/DateText';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { Reveal } from '../components/motion/Reveal';
import { cx, isWebUrl } from '../lib/format';
import { API_URL } from '../lib/api';
import { useDocumentHead } from '../lib/useDocumentHead';
import './AgendaPage.scss';

/** Arquivo .ics com todos os eventos publicados (assinável por qualquer calendário). */
const AGENDA_ICS_URL = `${API_URL}/agenda/ics`;

const DESCRIPTION = 'Competições, reuniões, workshops e eventos da MinerSkills.';

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

export function AgendaPage() {
  const agenda = useAgenda();
  // "agora" congelado na montagem: a divisão futuro/passado não muda a cada render
  const [now] = useState(() => Date.now());

  useDocumentHead({
    title: 'Agenda',
    description: DESCRIPTION,
    canonicalPath: '/agenda',
  });

  const { upcoming, pastByYear } = useMemo(() => {
    const events = agenda.data ?? [];
    const upcomingList = events
      .filter((e) => new Date(e.startsAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const past = events
      .filter((e) => new Date(e.startsAt).getTime() < now)
      .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    const byYear = new Map<number, AgendaEventDTO[]>();
    for (const e of past) {
      const year = new Date(e.startsAt).getFullYear();
      byYear.set(year, [...(byYear.get(year) ?? []), e]);
    }
    return { upcoming: upcomingList, pastByYear: [...byYear.entries()] };
  }, [agenda.data, now]);

  const subscribe = (
    <LinkButton href={AGENDA_ICS_URL} variant="outline">
      <Rss aria-hidden /> Assinar agenda (.ics)
    </LinkButton>
  );

  return (
    <>
      <PageHero
        kicker="Programação"
        title="Agenda"
        subtitle={DESCRIPTION}
        actions={subscribe}
      />

      <section className="ms-section ms-container">
        <QueryState
          query={agenda}
          skeleton={<ListSkeleton rows={4} lead={88} />}
          isEmpty={(events) => events.length === 0}
          empty={
            <EmptyState
              icon={<CalendarDays />}
              title="Nenhum evento agendado"
              description="Assine a agenda para receber os próximos eventos direto no seu calendário."
            />
          }
        >
          {() => (
            <div className="ms-agenda">
              <div className="ms-agenda__group">
                <SectionHeading title="Próximos eventos" dense />
                {upcoming.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={<CalendarClock />}
                    title="Nenhum evento futuro no momento"
                    description="Os próximos eventos aparecem aqui assim que forem publicados."
                  />
                ) : (
                  <Reveal>
                    <ul className="ms-agenda__list" role="list">
                      {upcoming.map((e, i) => (
                        <li key={e.id}>
                          <EventCard event={e} next={i === 0} />
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}
              </div>

              {pastByYear.length > 0 && (
                <div className="ms-agenda__group">
                  <SectionHeading title="Eventos anteriores" dense />
                  <div className="ms-agenda__years">
                    {pastByYear.map(([year, events], i) => (
                      <details key={year} className="ms-agenda__year" open={i === 0}>
                        <summary className="ms-agenda__year-summary">
                          <span className="ms-agenda__year-label">{year}</span>
                          <span className="ms-meta">
                            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                          </span>
                          <ChevronDown className="ms-agenda__year-chevron" aria-hidden />
                        </summary>
                        <ul className="ms-agenda__list" role="list">
                          {events.map((e) => (
                            <li key={e.id}>
                              <EventCard event={e} past />
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </section>
    </>
  );
}

/**
 * Cartão de evento: bloco de data à esquerda (metadado), título em destaque,
 * horário/local, descrição e as ações — Inscrever-se (quando há link) é o
 * único botão primário; Google Calendar e .ics são secundários.
 */
function EventCard({
  event,
  next,
  past,
}: {
  event: AgendaEventDTO;
  /** Primeiro evento futuro: recebe o selo "Próximo". */
  next?: boolean;
  past?: boolean;
}) {
  const date = new Date(event.startsAt);
  const kindLabel = AGENDA_KIND_LABELS[event.kind as AgendaKind] ?? event.kind;
  return (
    <article
      className={cx('ms-event', next && 'ms-event--next', past && 'ms-event--past')}
    >
      <time className="ms-event__date" dateTime={event.startsAt}>
        <span className="ms-event__day">{date.getDate()}</span>
        <span className="ms-event__month">{MONTH.format(date).replace('.', '')}</span>
        <span className="ms-event__year">{date.getFullYear()}</span>
      </time>

      <div className="ms-event__body">
        <div className="ms-event__tags">
          <Tag tone="neutral">{kindLabel}</Tag>
          {next && <Tag tone="success">Próximo</Tag>}
        </div>
        <h3 className="ms-event__title">{event.title}</h3>
        <div className="ms-event__meta">
          <span>
            <CalendarClock aria-hidden />
            <DateText iso={event.startsAt} format="time" meta={false} />
            {event.endsAt && (
              <>
                {' – '}
                <DateText iso={event.endsAt} format="time" meta={false} />
              </>
            )}
          </span>
          {event.location && (
            <span>
              <MapPin aria-hidden />
              {event.location}
            </span>
          )}
        </div>
        {event.description && <p className="ms-event__desc">{event.description}</p>}

        <div className="ms-event__actions">
          {isWebUrl(event.url) && !past && (
            <LinkButton href={event.url} external size="sm">
              Inscrever-se
            </LinkButton>
          )}
          <LinkButton
            href={googleCalendarUrl(event)}
            external
            size="sm"
            variant="outline"
          >
            <CalendarPlus aria-hidden /> Google Calendar
          </LinkButton>
          <LinkButton
            href={`${API_URL}/agenda/${event.id}/ics`}
            download
            size="sm"
            variant="ghost"
          >
            <Download aria-hidden /> .ics
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
