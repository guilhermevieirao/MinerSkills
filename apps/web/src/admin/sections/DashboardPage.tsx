import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Newspaper,
  Images,
  HelpCircle,
  Users,
  Bot,
  Award,
  CalendarDays,
  MessagesSquare,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../adminApi';
import { Loader } from '../../components/ui';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
  });

  if (isLoading || !data) return <Loader />;

  const cards = [
    { label: 'Posts publicados', value: `${data.posts.published}/${data.posts.total}`, icon: Newspaper, to: '/admin/blog' },
    { label: 'Fotos na galeria', value: data.gallery, icon: Images, to: '/admin/galeria' },
    { label: 'Perguntas do quiz', value: data.quiz.questions, icon: HelpCircle, to: '/admin/quiz' },
    { label: 'Membros', value: data.encyclopedia.members, icon: Users, to: '/admin/equipe' },
    { label: 'Robôs', value: data.encyclopedia.robots, icon: Bot, to: '/admin/equipe' },
    { label: 'Prêmios', value: data.awards, icon: Award, to: '/admin/premios' },
    { label: 'Eventos na agenda', value: data.agenda, icon: CalendarDays, to: '/admin/agenda' },
    { label: 'Tópicos aprovados', value: data.forum.approvedTopics, icon: MessagesSquare, to: '/admin/forum' },
  ];

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral da plataforma MinerSkills.</p>
        </div>
      </div>

      {data.forum.pending > 0 && (
        <Link to="/admin/forum" className="ms-dash-alert">
          <AlertCircle />
          <span>
            <strong>{data.forum.pending}</strong>{' '}
            {data.forum.pending === 1 ? 'item aguardando' : 'itens aguardando'} moderação no fórum
          </span>
        </Link>
      )}

      <div className="ms-dash-grid">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="ms-dash-card">
            <c.icon className="ms-dash-card__icon" />
            <span className="ms-dash-card__value">{c.value}</span>
            <span className="ms-dash-card__label">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
