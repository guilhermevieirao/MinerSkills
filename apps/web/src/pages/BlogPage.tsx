import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePosts } from '../features/posts/usePosts';
import { Button, EmptyState, SearchField } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { PostCard } from '../components/cards/PostCard';
import { Reveal } from '../components/motion/Reveal';
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

  return (
    <>
      <PageHero
        kicker="Notícias & novidades"
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTerm('');
                      setQ('');
                      setPage(1);
                    }}
                  >
                    Limpar busca
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(data) => (
            <>
              <Reveal>
                <ul className="ms-postgrid" role="list">
                  {data.items.map((post, i) => (
                    <li key={post.id}>
                      <PostCard post={post} priority={i < 3} />
                    </li>
                  ))}
                </ul>
              </Reveal>

              {data.totalPages > 1 && (
                <nav className="ms-blog__pagination" aria-label="Paginação">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="ms-blog__page-info">
                    {page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </QueryState>
      </section>
    </>
  );
}
