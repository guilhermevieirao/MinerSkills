import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, LinkIcon, Calendar } from 'lucide-react';
import { usePost } from '../features/posts/usePosts';
import { Loader, EmptyState, LinkButton } from '../components/ui';
import { YouTubeEmbed } from '../components/ui/YouTubeEmbed';
import { Lightbox } from '../components/ui/Lightbox';
import { formatDate, mediaUrl } from '../lib/format';
import './BlogPostPage.scss';

export function BlogPostPage() {
  const { slug } = useParams();
  const { data: post, isLoading, isError } = usePost(slug);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (isLoading) return <div className="ms-section ms-container"><Loader /></div>;
  if (isError || !post)
    return (
      <div className="ms-section ms-container">
        <EmptyState
          title="Post não encontrado"
          description="Este conteúdo pode ter sido removido."
          action={<LinkButton to="/blog" variant="outline">Voltar ao blog</LinkButton>}
        />
      </div>
    );

  const images = post.media.filter((m) => m.kind === 'image');
  const videos = post.media.filter((m) => m.kind === 'video');

  return (
    <article className="ms-post">
      <header className="ms-post__header">
        {post.cover && (
          <div className="ms-post__hero">
            <img src={mediaUrl(post.cover.url)} alt={post.cover.alt ?? post.title} />
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
                <img
                  src={mediaUrl(img.thumbUrl ?? img.url)}
                  alt={img.alt ?? ''}
                  loading="lazy"
                />
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
