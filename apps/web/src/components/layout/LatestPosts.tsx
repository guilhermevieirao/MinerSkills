import { ArrowRight } from 'lucide-react';
import { useLatestPosts } from '../../features/posts/usePosts';
import { LinkButton, SectionHeading } from '../ui';
import { QueryState } from '../ui/QueryState';
import { CardGridSkeleton } from '../ui/skeletons';
import { PostCard } from '../cards/PostCard';
import { Reveal } from '../motion/Reveal';

const COUNT = 3;

/** "Últimas notícias" da Home: três posts mais recentes e o link para o Blog. */
export function LatestPosts() {
  const posts = useLatestPosts(COUNT);
  // sem posts publicados a seção não existe (nada de vazio na Home)
  if (posts.data && posts.data.items.length === 0) return null;

  return (
    <section className="ms-section ms-container" aria-labelledby="ms-home-posts">
      <SectionHeading
        id="ms-home-posts"
        kicker="Blog"
        title="Últimas notícias"
        actions={
          <LinkButton to="/blog" variant="outline" size="sm">
            Ver todas <ArrowRight aria-hidden />
          </LinkButton>
        }
      />
      <QueryState
        query={posts}
        compact
        skeleton={<CardGridSkeleton count={COUNT} min={280} />}
      >
        {(data) => (
          <Reveal>
            <ul className="ms-postgrid" role="list">
              {data.items.slice(0, COUNT).map((post, i) => (
                <li key={post.id}>
                  <PostCard post={post} priority={i === 0} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </QueryState>
    </section>
  );
}
