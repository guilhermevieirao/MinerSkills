import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Newspaper } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePosts } from '../features/posts/usePosts';
import { Button, EmptyState, Input } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Reveal } from '../components/motion/Reveal';
import { formatDate } from '../lib/format';
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
      <PageHero kicker="Notícias & Novidades" title="Blog da Mina" subtitle={DESCRIPTION}>
        <form className="ms-blog__search" onSubmit={submit}>
          <Search className="ms-blog__search-icon" />
          <Input
            placeholder="Buscar posts…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Buscar posts"
          />
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </form>
      </PageHero>

      <section className="ms-section ms-container">
        <QueryState
          query={posts}
          skeleton={<CardGridSkeleton count={6} aspect="16 / 10" />}
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              icon={<Newspaper />}
              title="Nenhum post encontrado"
              description={q ? `Nada para "${q}".` : 'Em breve, novidades por aqui.'}
            />
          }
        >
          {(data) => (
            <>
              <div className="ms-blog__grid">
                {data.items.map((post, i) => (
                  <Reveal as="article" key={post.id} delay={i * 0.04}>
                    <Link to={`/blog/${post.slug}`} className="ms-blog__card">
                      <div className="ms-blog__cover">
                        {post.cover ? (
                          <MediaImage
                            media={post.cover}
                            alt={post.cover.alt ?? post.title}
                            thumb
                          />
                        ) : (
                          <div className="ms-blog__cover-fallback">
                            <Newspaper />
                          </div>
                        )}
                      </div>
                      <div className="ms-blog__body">
                        {post.publishedAt && (
                          <time className="ms-blog__date">
                            {formatDate(post.publishedAt)}
                          </time>
                        )}
                        <h3 className="ms-blog__title">{post.title}</h3>
                        <p className="ms-blog__excerpt">{post.excerpt}</p>
                        <span className="ms-blog__more">
                          Ler mais <ArrowRight />
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="ms-blog__pagination">
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
                </div>
              )}
            </>
          )}
        </QueryState>
      </section>
    </>
  );
}
