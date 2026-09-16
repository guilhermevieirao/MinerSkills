import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import './YouTubeEmbed.scss';

/**
 * Embed "lite" do YouTube: mostra a thumbnail e só carrega o iframe ao clicar
 * (privacidade via youtube-nocookie + performance). Quem acionou pelo teclado
 * continua com o foco no vídeo depois da troca.
 */
export function YouTubeEmbed({ id, title }: { id: string; title?: string | null }) {
  const [play, setPlay] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (play) frameRef.current?.focus();
  }, [play]);

  return (
    <div className="ms-yt">
      {play ? (
        <iframe
          ref={frameRef}
          className="ms-yt__frame"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title ?? 'Vídeo do YouTube'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="ms-yt__poster"
          onClick={() => setPlay(true)}
          aria-label={`Reproduzir vídeo: ${title ?? id}`}
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}
        >
          <span className="ms-yt__play" aria-hidden>
            <Play />
          </span>
          {title && <span className="ms-yt__title">{title}</span>}
        </button>
      )}
    </div>
  );
}
