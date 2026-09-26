import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Bot,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Flag,
  HelpCircle,
  ImagePlus,
  Images,
  Inbox,
  Layers,
  MessagesSquare,
  Newspaper,
  PenSquare,
  UserPlus,
  Users,
} from 'lucide-react';
import { CONTACT_KIND_LABELS, type ContactKind } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { useAdminMe } from '../useAdminAuth';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { LinkButton, Skeleton, Tag } from '../../components/ui';
import { DateText } from '../../components/ui/DateText';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { formatDate } from '../../lib/format';

/** Atalhos para as tarefas mais frequentes (a seção abre o formulário com `?novo=1`). */
const SHORTCUTS = [
  { to: '/admin/blog?novo=1', label: 'Novo post', icon: PenSquare },
  { to: '/admin/agenda?novo=1', label: 'Novo evento', icon: CalendarPlus },
  { to: '/admin/galeria', label: 'Enviar fotos', icon: ImagePlus },
  { to: '/admin/equipe?novo=1', label: 'Novo membro', icon: UserPlus },
  { to: '/admin/quiz?novo=1', label: 'Nova pergunta', icon: HelpCircle },
];

function DashboardSkeleton() {
  return (
    <div className="ms-dash" aria-hidden>
      <div className="ms-dash-kpis">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="ms-dash-card">
            <Skeleton height={20} width={20} />
            <Skeleton height={32} width="50%" />
            <Skeleton height={14} width="70%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard orientado a ação: pendências acionáveis no topo, números, atalhos
 * e os próximos eventos / últimas mensagens. `.ms-dash-alert` e
 * `.ms-dash-card` são lidos pela suíte e2e.
 */
export function DashboardPage() {
  const { data: me } = useAdminMe();
  const stats = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.dashboard });
  const agenda = useQuery({ queryKey: ['admin-agenda'], queryFn: adminApi.agenda.list });
  const inbox = useQuery({
    queryKey: ['admin-contact', 'dashboard'],
    queryFn: () => adminApi.contact.list({ page: 1, perPage: 5 }),
  });

  const firstName = me?.name.split(' ')[0] ?? '';
  const weekday = formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM");
  const today = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  return (
    <div className="ms-dash">
      <AdminPageHeader
        title="Dashboard"
        description={
          <>
            Olá, <strong>{firstName}</strong> —{' '}
            <span className="ms-dash__date">{today}</span>
          </>
        }
      />

      <QueryState query={stats} skeleton={<DashboardSkeleton />}>
        {(data) => {
          const pending = [
            {
              key: 'inbox',
              count: data.contact.new,
              one: 'mensagem nova na caixa de entrada',
              many: 'mensagens novas na caixa de entrada',
              icon: Inbox,
              to: '/admin/mensagens',
            },
            {
              key: 'forum',
              count: data.forum.pending,
              one: 'item aguardando moderação no fórum',
              many: 'itens aguardando moderação no fórum',
              icon: MessagesSquare,
              to: '/admin/forum',
            },
            {
              key: 'reports',
              count: data.forum.reports,
              one: 'denúncia aberta no fórum',
              many: 'denúncias abertas no fórum',
              icon: Flag,
              to: '/admin/forum',
            },
          ].filter((p) => p.count > 0);

          const kpis = [
            {
              label: 'Posts publicados',
              value: `${data.posts.published}/${data.posts.total}`,
              icon: Newspaper,
              to: '/admin/blog',
            },
            {
              label: 'Membros',
              value: data.encyclopedia.members,
              icon: Users,
              to: '/admin/equipe',
            },
            {
              label: 'Robôs',
              value: data.encyclopedia.robots,
              icon: Bot,
              to: '/admin/equipe',
            },
            {
              label: 'Eventos na agenda',
              value: data.agenda,
              icon: CalendarDays,
              to: '/admin/agenda',
            },
            {
              label: 'Fotos na galeria',
              value: data.gallery,
              icon: Images,
              to: '/admin/galeria',
            },
            { label: 'Prêmios', value: data.awards, icon: Award, to: '/admin/premios' },
            {
              label: 'Tópicos no fórum',
              value: data.forum.approvedTopics,
              icon: MessagesSquare,
              to: '/admin/forum',
            },
            {
              label: 'Temporadas',
              value: data.seasons,
              icon: Layers,
              to: '/admin/temporadas',
            },
          ];

          return (
            <>
              <section className="ms-dash__block" aria-labelledby="ms-dash-pending">
                <h2 id="ms-dash-pending" className="ms-dash__title">
                  Pendências
                </h2>
                {pending.length === 0 ? (
                  <p className="ms-dash-ok">
                    <CheckCircle2 aria-hidden /> Tudo em dia: nenhuma mensagem nova nem
                    item aguardando moderação.
                  </p>
                ) : (
                  <ul className="ms-dash-alerts" role="list">
                    {pending.map((p) => (
                      <li key={p.key}>
                        <Link to={p.to} className="ms-dash-alert">
                          <p.icon aria-hidden />
                          <span>
                            <strong>{p.count}</strong> {p.count === 1 ? p.one : p.many}
                          </span>
                          <span className="ms-dash-alert__go">
                            Ver <ArrowRight aria-hidden />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="ms-dash__block" aria-labelledby="ms-dash-numbers">
                <h2 id="ms-dash-numbers" className="ms-dash__title">
                  Números
                </h2>
                <ul className="ms-dash-kpis" role="list">
                  {kpis.map((c) => (
                    <li key={c.label}>
                      <Link to={c.to} className="ms-dash-card">
                        <c.icon className="ms-dash-card__icon" aria-hidden />
                        <span className="ms-dash-card__value">{c.value}</span>
                        <span className="ms-dash-card__label">{c.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          );
        }}
      </QueryState>

      <section className="ms-dash__block" aria-labelledby="ms-dash-shortcuts">
        <h2 id="ms-dash-shortcuts" className="ms-dash__title">
          Atalhos
        </h2>
        <ul className="ms-dash-shortcuts" role="list">
          {SHORTCUTS.map((s) => (
            <li key={s.to}>
              <LinkButton to={s.to} variant="outline">
                <s.icon aria-hidden /> {s.label}
              </LinkButton>
            </li>
          ))}
        </ul>
      </section>

      <div className="ms-dash__cols">
        <section className="ms-dash-panel" aria-labelledby="ms-dash-events">
          <div className="ms-dash-panel__head">
            <h2 id="ms-dash-events" className="ms-dash__title">
              Próximos eventos
            </h2>
            <Link to="/admin/agenda" className="ms-dash-panel__more">
              Agenda
            </Link>
          </div>
          <QueryState
            query={agenda}
            compact
            skeleton={<ListSkeleton rows={3} lead={0} />}
          >
            {(events) => {
              const now = Date.now();
              const next = events
                .filter((e) => new Date(e.startsAt).getTime() >= now)
                .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
                .slice(0, 4);
              if (next.length === 0)
                return (
                  <p className="ms-dash-panel__empty">Nenhum evento futuro cadastrado.</p>
                );
              return (
                <ul className="ms-dash-list" role="list">
                  {next.map((e) => (
                    <li key={e.id} className="ms-dash-list__item">
                      <span className="ms-dash-list__main">
                        <strong>{e.title}</strong>
                        <DateText iso={e.startsAt} format="datetime" />
                      </span>
                      {!e.published && <Tag tone="warning">Rascunho</Tag>}
                    </li>
                  ))}
                </ul>
              );
            }}
          </QueryState>
        </section>

        <section className="ms-dash-panel" aria-labelledby="ms-dash-inbox">
          <div className="ms-dash-panel__head">
            <h2 id="ms-dash-inbox" className="ms-dash__title">
              Últimas mensagens
            </h2>
            <Link to="/admin/mensagens" className="ms-dash-panel__more">
              Caixa de entrada
            </Link>
          </div>
          <QueryState query={inbox} compact skeleton={<ListSkeleton rows={3} lead={0} />}>
            {(page) =>
              page.items.length === 0 ? (
                <p className="ms-dash-panel__empty">Nenhuma mensagem recebida.</p>
              ) : (
                <ul className="ms-dash-list" role="list">
                  {page.items.map((m) => (
                    <li key={m.id} className="ms-dash-list__item">
                      <span className="ms-dash-list__main">
                        <strong>{m.name}</strong>
                        <span className="ms-dash-list__sub">
                          {CONTACT_KIND_LABELS[m.kind as ContactKind] ?? m.kind} ·{' '}
                          <DateText iso={m.createdAt} format="relative" meta={false} />
                        </span>
                      </span>
                      {m.status === 'new' && <Tag tone="success">Nova</Tag>}
                    </li>
                  ))}
                </ul>
              )
            }
          </QueryState>
        </section>
      </div>
    </div>
  );
}
