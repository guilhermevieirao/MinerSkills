import { Link } from 'react-router-dom';
import { ArrowRight, Newspaper } from 'lucide-react';
import type { PostListItemDTO } from '@minerskills/shared';
import { DateText } from '../ui/DateText';
import { MediaImage } from '../ui/MediaImage';
import './PostCard.scss';

/**
 * Card de post (Blog e "Últimas notícias" da Home): capa 16/10, data como
 * metadado, título em Inter e resumo em duas linhas. O card inteiro é o link.
 * `ms-blog__card`/`ms-blog__title` são aliases lidos pela suíte e2e.
 */
export function PostCard({
  post,
  headingLevel: Heading = 'h3',
  priority,
}: {
  post: PostListItemDTO;
  headingLevel?: 'h2' | 'h3';
  /** Capa acima da dobra (primeiros cards da Home). */
  priority?: boolean;
}) {
  return (
    <Link to={`/blog/${post.slug}`} className="ms-postcard ms-blog__card">
      <div className="ms-postcard__cover">
        {post.cover ? (
          <MediaImage
            media={post.cover}
            alt={post.cover.alt ?? ''}
            thumb
            priority={priority}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
          />
        ) : (
          <div className="ms-postcard__fallback">
            <Newspaper aria-hidden />
          </div>
        )}
      </div>
      <div className="ms-postcard__body">
        {post.publishedAt && <DateText iso={post.publishedAt} format="short" />}
        <Heading className="ms-postcard__title ms-blog__title">{post.title}</Heading>
        {post.excerpt && <p className="ms-postcard__excerpt">{post.excerpt}</p>}
        <span className="ms-postcard__more" aria-hidden>
          Ler mais <ArrowRight />
        </span>
      </div>
    </Link>
  );
}
