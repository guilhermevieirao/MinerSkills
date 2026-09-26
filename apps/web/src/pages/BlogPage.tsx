import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePosts } from '../features/posts/usePosts';
import { Button, EmptyState, SearchField } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { Pagination } from '../components/ui/Pagination';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { PostCard } from '../components/cards/PostCard';
import { RevealGroup, RevealItem } from '../components/motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';
import './BlogPage.scss';

const DESCRIPTION = 'Bastidores, conquistas e novidades direto da equipe MinerSkills.';

export function BlogPage() {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const posts = usePosts(page, q);

  useDocumentHead({ title: 'Blog', description: DESCRIPTION, canonicalPath: '/blog' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(term.trim());
  };

  const clear = () => {
    setTerm('');
    setQ('');
    setPage(1);
  };

  return (
    <>
      <PageHero
        title="Blog da Mina"
        subtitle={DESCRIPTION}
        toolbar={
          <form className="ms-blog__search" onSubmit={submit} role="search">
            <SearchField
              placeholder="Buscar posts…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Buscar posts"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        }
      />

      <section className="ms-section ms-container">
        <QueryState
          query={posts}
          skeleton={<CardGridSkeleton count={6} min={280} />}
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              icon={<Newspaper />}
              title="Nenhum post encontrado"
              description={q ? `Nada para "${q}".` : 'Em breve, novidades por aqui.'}
              action={
                q ? (
                  <Button variant="outline" onClick={clear}>
                    Limpar busca
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(data) => (
            <RevealGroup className="ms-postgrid" busy={posts.isFetching}>
              {data.items.map((post, i) => (
                <RevealItem key={post.id}>
                  <PostCard post={post} priority={i < 3} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </QueryState>

        {/* fora do QueryState: não some enquanto a próxima página carrega */}
        <Pagination
          page={page}
          totalPages={posts.data?.totalPages ?? 1}
          onChange={setPage}
          loading={posts.isFetching}
        />
      </section>
    </>
  );
}
