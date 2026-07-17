import { useState } from 'react';
import { Play } from 'lucide-react';
import './YouTubeEmbed.scss';

/** Embed "lite" do YouTube: mostra thumbnail e só carrega o iframe ao clicar
 *  (privacidade via youtube-nocookie + performance). */
export function YouTubeEmbed({ id, title }: { id: string; title?: string | null }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="ms-yt">
      {play ? (
        <iframe
          className="ms-yt__frame"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title ?? 'Vídeo do YouTube'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      ) : (
        <button
          className="ms-yt__poster"
          onClick={() => setPlay(true)}
          aria-label={`Reproduzir vídeo: ${title ?? id}`}
          style={{
            backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`,
          }}
        >
          <span className="ms-yt__play">
            <Play />
          </span>
          {title && <span className="ms-yt__title">{title}</span>}
        </button>
      )}
    </div>
  );
}
