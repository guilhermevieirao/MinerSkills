import { ArrowRight } from 'lucide-react';
import { useLatestPosts } from '../../features/posts/usePosts';
import { LinkButton, SectionHeading } from '../ui';
import { Carousel } from '../ui/Carousel';
import { QueryState } from '../ui/QueryState';
import { CardGridSkeleton } from '../ui/skeletons';
import { PostCard } from '../cards/PostCard';
import { Reveal } from '../motion/Reveal';

const COUNT = 6;

/** "Últimas notícias" da Home: carrossel com os posts mais recentes e o link para o Blog. */
export function LatestPosts() {
  const posts = useLatestPosts(COUNT);
  // sem posts publicados a seção não existe (nada de vazio na Home)
  if (posts.data && posts.data.items.length === 0) return null;

  return (
    <section className="ms-section" aria-labelledby="ms-home-posts">
      <div className="ms-container">
        <SectionHeading
          id="ms-home-posts"
          title="Últimas notícias"
          actions={
            <LinkButton to="/blog" variant="link">
              Ver todas <ArrowRight aria-hidden />
            </LinkButton>
          }
        />
      </div>
      <QueryState
        query={posts}
        compact
        skeleton={
          <div className="ms-container">
            <CardGridSkeleton count={3} min={280} />
          </div>
        }
      >
        {(data) => (
          <Reveal y={40}>
            <Carousel label="Últimas notícias">
              {data.items.slice(0, COUNT).map((post, i) => (
                <PostCard key={post.id} post={post} priority={i === 0} />
              ))}
            </Carousel>
          </Reveal>
        )}
      </QueryState>
    </section>
  );
}
