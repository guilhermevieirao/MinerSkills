import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LinkIcon } from 'lucide-react';
import type { PostDetailDTO } from '@minerskills/shared';
import { useLatestPosts, usePost } from '../features/posts/usePosts';
import { PageHero } from '../components/layout/PageHero';
import { LinkButton, SectionHeading } from '../components/ui';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { DateText } from '../components/ui/DateText';
import { FullScreenMessage } from '../components/ui/FullScreenMessage';
import { QueryState } from '../components/ui/QueryState';
import { ArticleSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { YouTubeEmbed } from '../components/ui/YouTubeEmbed';
import { Lightbox } from '../components/ui/Lightbox';
import { PostCard } from '../components/cards/PostCard';
import { ApiError } from '../lib/api';
import { mediaUrl } from '../lib/format';
import { absoluteUrl, SITE_NAME, useDocumentHead } from '../lib/useDocumentHead';
import './BlogPostPage.scss';

/** Slug que não existe (ou post despublicado): tela própria, sem "tentar novamente". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Minutos de leitura a ~200 palavras/min, a partir do HTML sanitizado. */
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
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
      <FullScreenMessage
        title="Post não encontrado"
        text="Este conteúdo pode ter sido removido ou despublicado."
        actions={
          <LinkButton to="/blog" variant="outline">
            <ArrowLeft aria-hidden /> Voltar ao blog
          </LinkButton>
        }
      />
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
  const minutes = readingMinutes(post.contentHtml);

  // "Leia também": os posts mais recentes, sem este
  const latest = useLatestPosts(4);
  const related = (latest.data?.items ?? []).filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <article className="ms-post">
      <PageHero
        size="lg"
        media={post.cover}
        breadcrumb={
          <Breadcrumb items={[{ label: 'Blog', to: '/blog' }, { label: post.title }]} />
        }
        title={<span className="ms-post__title">{post.title}</span>}
        subtitle={
          <span className="ms-post__meta">
            {post.publishedAt && (
              <DateText iso={post.publishedAt} format="long" meta={false} />
            )}
            <span aria-hidden> · </span>
            <span>{minutes} min de leitura</span>
          </span>
        }
      />

      <div className="ms-container ms-post__wrap">
        <div className="ms-post__body">
          <div
            className="ms-post__content ms-prose"
            // conteúdo já sanitizado no servidor (sanitize-html allowlist estrita)
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {videos.length > 0 && (
            <section className="ms-post__videos" aria-label="Vídeos">
              {videos.map((v) => (
                <video key={v.id} controls preload="metadata" className="ms-post__video">
                  <source src={mediaUrl(v.url)} type={v.mimeType} />
                </video>
              ))}
            </section>
          )}

          {post.youtube.length > 0 && (
            <section className="ms-post__videos" aria-label="Vídeos do YouTube">
              {post.youtube.map((y) => (
                <YouTubeEmbed key={y.id} id={y.youtubeId} title={y.title} />
              ))}
            </section>
          )}

          {images.length > 0 && (
            <section className="ms-post__gallery" aria-label="Fotos do post">
              <ul className="ms-post__thumbs" role="list">
                {images.map((img, i) => (
                  <li key={img.id}>
                    <button
                      type="button"
                      className="ms-post__thumb"
                      onClick={() => setLightbox(i)}
                      aria-label={`Ampliar imagem ${i + 1} de ${images.length}`}
                    >
                      <MediaImage media={img} alt={img.alt ?? ''} thumb />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {post.links.length > 0 && (
            <section className="ms-post__links" aria-labelledby="ms-post-links">
              <h2 id="ms-post-links" className="ms-post__links-title">
                Links relacionados
              </h2>
              <ul role="list">
                {post.links.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ms-post__link"
                    >
                      <LinkIcon aria-hidden /> {l.label}
                      <span className="ms-visually-hidden"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section
          className="ms-section ms-container ms-post__related"
          aria-labelledby="ms-post-related"
        >
          <SectionHeading
            id="ms-post-related"
            title="Leia também"
            actions={
              <LinkButton to="/blog" variant="outline" size="sm">
                Ver todas <ArrowRight aria-hidden />
              </LinkButton>
            }
          />
          <ul className="ms-postgrid" role="list">
            {related.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Lightbox
        items={images.map((m) => ({ url: m.url, alt: m.alt }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
      />
    </article>
  );
}
