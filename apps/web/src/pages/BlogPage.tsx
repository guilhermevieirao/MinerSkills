import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Newspaper } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePosts } from '../features/posts/usePosts';
import { Button, EmptyState, Input, Loader } from '../components/ui';
import { Reveal } from '../components/motion/Reveal';
import { formatDate, mediaUrl } from '../lib/format';
import './BlogPage.scss';

export function BlogPage() {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const { data, isLoading } = usePosts(page, q);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(term.trim());
  };

  return (
    <>
      <PageHero
        kicker="Notícias & Novidades"
        title="Blog da Mina"
        subtitle="Bastidores, conquistas e novidades direto da equipe MinerSkills."
      >
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
        {isLoading ? (
          <Loader />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<Newspaper />}
            title="Nenhum post encontrado"
            description={q ? `Nada para "${q}".` : 'Em breve, novidades por aqui.'}
          />
        ) : (
          <>
            <div className="ms-blog__grid">
              {data.items.map((post, i) => (
                <Reveal as="article" key={post.id} delay={i * 0.04}>
                  <Link to={`/blog/${post.slug}`} className="ms-blog__card">
                    <div className="ms-blog__cover">
                      {post.cover ? (
                        <img
                          src={mediaUrl(post.cover.thumbUrl ?? post.cover.url)}
                          alt={post.cover.alt ?? post.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="ms-blog__cover-fallback">
                          <Newspaper />
                        </div>
                      )}
                    </div>
                    <div className="ms-blog__body">
                      {post.publishedAt && (
                        <time className="ms-blog__date">{formatDate(post.publishedAt)}</time>
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
      </section>
    </>
  );
}
