import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, LinkIcon, Calendar } from 'lucide-react';
import type { PostDetailDTO } from '@minerskills/shared';
import { usePost } from '../features/posts/usePosts';
import { EmptyState, LinkButton } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { ArticleSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { YouTubeEmbed } from '../components/ui/YouTubeEmbed';
import { Lightbox } from '../components/ui/Lightbox';
import { ApiError } from '../lib/api';
import { formatDate, mediaUrl } from '../lib/format';
import { absoluteUrl, SITE_NAME, useDocumentHead } from '../lib/useDocumentHead';
import './BlogPostPage.scss';

/** Slug que não existe (ou post despublicado): tela própria, sem "tentar novamente". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function BlogPostPage() {
  const { slug } = useParams();
  const query = usePost(slug);
  const post = query.data;

  // schema.org/BlogPosting — memoizado: o efeito do head compara por referência
  const jsonLd = useMemo(
    () =>
      post
        ? {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            datePublished: post.publishedAt ?? undefined,
            image: post.cover ? absoluteUrl(mediaUrl(post.cover.url)) : undefined,
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME },
          }
        : null,
    [post],
  );

  useDocumentHead({
    title: post?.title ?? 'Blog',
    description: post?.excerpt,
    canonicalPath: post ? `/blog/${post.slug}` : undefined,
    image: post?.cover ? mediaUrl(post.cover.url) : undefined,
    type: post ? 'article' : 'website',
    // slug inexistente/despublicado: sem noindex a tela vazia seria um soft-404 indexável
    noindex: query.isError,
    jsonLd,
  });

  if (isNotFound(query.error)) {
    return (
      <div className="ms-section ms-container">
        <EmptyState
          title="Post não encontrado"
          description="Este conteúdo pode ter sido removido."
          action={
            <LinkButton to="/blog" variant="outline">
              Voltar ao blog
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <QueryState query={query} skeleton={<ArticleSkeleton />}>
      {(data) => <PostArticle post={data} />}
    </QueryState>
  );
}

function PostArticle({ post }: { post: PostDetailDTO }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const images = post.media.filter((m) => m.kind === 'image');
  const videos = post.media.filter((m) => m.kind === 'video');

  return (
    <article className="ms-post">
      <header className="ms-post__header">
        {post.cover && (
          <div className="ms-post__hero">
            <MediaImage media={post.cover} alt={post.cover.alt ?? post.title} priority />
            <div className="ms-post__hero-overlay" />
          </div>
        )}
        <div className="ms-container ms-post__head-content">
          <Link to="/blog" className="ms-post__back">
            <ArrowLeft /> Blog
          </Link>
          <h1 className="ms-post__title">{post.title}</h1>
          {post.publishedAt && (
            <p className="ms-post__meta">
              <Calendar /> {formatDate(post.publishedAt)}
            </p>
          )}
        </div>
      </header>

      <div className="ms-container ms-post__container">
        <div
          className="ms-post__content"
          // conteúdo já sanitizado no servidor (sanitize-html allowlist estrita)
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {videos.length > 0 && (
          <section className="ms-post__videos">
            {videos.map((v) => (
              <video key={v.id} controls preload="metadata" className="ms-post__video">
                <source src={mediaUrl(v.url)} type={v.mimeType} />
              </video>
            ))}
          </section>
        )}

        {post.youtube.length > 0 && (
          <section className="ms-post__yt-grid">
            {post.youtube.map((y) => (
              <YouTubeEmbed key={y.id} id={y.youtubeId} title={y.title} />
            ))}
          </section>
        )}

        {images.length > 0 && (
          <section className="ms-post__gallery">
            {images.map((img, i) => (
              <button
                key={img.id}
                className="ms-post__thumb"
                onClick={() => setLightbox(i)}
                aria-label="Ampliar imagem"
              >
                <MediaImage media={img} alt={img.alt ?? ''} thumb />
              </button>
            ))}
          </section>
        )}

        {post.links.length > 0 && (
          <section className="ms-post__links">
            <h3 className="ms-post__links-title">Links relacionados</h3>
            {post.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-post__link"
              >
                <LinkIcon /> {l.label}
              </a>
            ))}
          </section>
        )}
      </div>

      <Lightbox
        items={images.map((m) => ({ url: m.url, alt: m.alt }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
      />
    </article>
  );
}
