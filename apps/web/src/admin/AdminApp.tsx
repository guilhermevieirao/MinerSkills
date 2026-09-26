import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAdminMe } from './useAdminAuth';
import { LinkButton, Loader } from '../components/ui';
import { ErrorState } from '../components/ui/ErrorState';
import { StateBlock } from '../components/ui/StateBlock';
import { ApiError } from '../lib/api';
import { LoginPage } from './LoginPage';
import { AdminLayout } from './AdminLayout';
import { DashboardPage } from './sections/DashboardPage';
import { PostsSection } from './sections/PostsSection';
import { GallerySection } from './sections/GallerySection';
import { QuizSection } from './sections/QuizSection';
import { TeamSection } from './sections/TeamSection';
import { MemberTagsSection } from './sections/MemberTagsSection';
import { ForumSection } from './sections/ForumSection';
import { AwardsSection } from './sections/AwardsSection';
import { AgendaSection } from './sections/AgendaSection';
import { SocialSection } from './sections/SocialSection';
import { PagesSection } from './sections/PagesSection';
import { SettingsSection } from './sections/SettingsSection';
import { MediaSection } from './sections/MediaSection';
import { AdminsSection } from './sections/AdminsSection';
import { AccountSection } from './sections/AccountSection';
import { SponsorsSection } from './sections/SponsorsSection';
import { InboxSection } from './sections/InboxSection';
import { SeasonsSection } from './sections/SeasonsSection';
import './admin.scss';

/** URL do painel que não existe: diz isso, em vez de cair no dashboard em silêncio. */
function AdminNotFound() {
  return (
    <StateBlock
      title="Página não encontrada"
      text="Este endereço não corresponde a nenhuma seção do painel."
      titleAs="h1"
      actions={
        <LinkButton to="/admin" variant="outline">
          <LayoutDashboard aria-hidden /> Ir para o dashboard
        </LinkButton>
      }
    />
  );
}

export default function AdminApp() {
  const me = useAdminMe();

  if (me.isLoading) {
    return (
      <div className="ms-admin-loading">
        <Loader label="Verificando sessão…" />
      </div>
    );
  }

  // 401 = sem sessão → login. Qualquer outro erro (rede, 5xx) não é "deslogado".
  if (me.isError && !(me.error instanceof ApiError && me.error.status === 401)) {
    return (
      <div className="ms-admin-loading">
        <ErrorState
          error={me.error}
          title="Não foi possível abrir o painel"
          onRetry={() => void me.refetch()}
          retrying={me.isFetching}
        />
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <LoginPage />;
  }

  return (
    <AdminLayout admin={me.data}>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="paginas" element={<PagesSection />} />
        <Route path="blog" element={<PostsSection />} />
        <Route path="galeria" element={<GallerySection />} />
        <Route path="quiz" element={<QuizSection />} />
        <Route path="equipe" element={<TeamSection />} />
        <Route path="equipe/tags" element={<MemberTagsSection />} />
        {/* URL antiga da seção, mantida para links salvos */}
        <Route path="enciclopedia" element={<Navigate to="/admin/equipe" replace />} />
        <Route path="forum" element={<ForumSection />} />
        <Route path="premios" element={<AwardsSection />} />
        <Route path="agenda" element={<AgendaSection />} />
        <Route path="social" element={<SocialSection />} />
        <Route path="midia" element={<MediaSection />} />
        <Route path="configuracoes" element={<SettingsSection />} />
        <Route path="administradores" element={<AdminsSection />} />
        <Route path="conta" element={<AccountSection />} />
        <Route path="patrocinadores" element={<SponsorsSection />} />
        <Route path="mensagens" element={<InboxSection />} />
        <Route path="temporadas" element={<SeasonsSection />} />
        <Route path="*" element={<AdminNotFound />} />
      </Routes>
    </AdminLayout>
  );
}
