import { useMemo, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Images } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { useGallery } from '../features/gallery/useGallery';
import { EmptyState } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Lightbox } from '../components/ui/Lightbox';
import { useDocumentHead } from '../lib/useDocumentHead';
import { EASE } from '../lib/motion';
import './GaleriaPage.scss';

const DESCRIPTION = 'Momentos da equipe: bancada, competições, bastidores e conquistas.';

/**
 * Galeria em linhas justificadas: cada foto mantém a própria proporção e as
 * linhas se ajustam para fechar a largura (como um álbum), na ORDEM definida no
 * painel — leitura da esquerda para a direita, igual à do lightbox. As fotos
 * entram escalonadas ao aparecer na tela. A legenda aparece ao pousar/focar no
 * desktop e fica sempre visível no celular; cada foto abre o lightbox.
 */
export function GaleriaPage() {
  const gallery = useGallery();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState<number | null>(null);

  useDocumentHead({
    title: 'Galeria',
    description: DESCRIPTION,
    canonicalPath: '/galeria',
  });

  const items = useMemo(
    () =>
      (gallery.data ?? []).map((p) => ({
        url: p.media.url,
        alt: p.media.alt,
        caption: p.caption,
      })),
    [gallery.data],
  );

  return (
    <>
      <PageHero title="Galeria" subtitle={DESCRIPTION} />

      <section className="ms-section ms-container">
        <QueryState
          query={gallery}
          skeleton={<CardGridSkeleton count={8} aspect="1" min={220} body={false} />}
          isEmpty={(photos) => photos.length === 0}
          empty={
            <EmptyState
              icon={<Images />}
              title="Galeria vazia"
              description="Em breve, novas fotos."
            />
          }
        >
          {(photos) => (
            <ul className="ms-gallery" role="list">
              {photos.map((photo, i) => (
                <motion.li
                  key={photo.id}
                  className="ms-gallery__cell"
                  // largura proporcional à foto: a linha divide o espaço pela proporção de cada uma
                  style={{ '--ar': ratio(photo.media) } as CSSProperties}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, transform: 'translateY(24px) scale(0.97)' }
                  }
                  whileInView={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, ease: EASE, delay: (i % 4) * 0.06 }}
                >
                  <button
                    type="button"
                    className="ms-gallery__item"
                    onClick={() => setIndex(i)}
                    aria-label={
                      photo.caption ?? `Ampliar foto ${i + 1} de ${photos.length}`
                    }
                  >
                    <MediaImage
                      media={photo.media}
                      alt={photo.media.alt ?? photo.caption ?? ''}
                      thumb
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                    />
                    {photo.caption && (
                      <span className="ms-gallery__caption">{photo.caption}</span>
                    )}
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </QueryState>
      </section>

      <Lightbox
        items={items}
        index={index}
        onClose={() => setIndex(null)}
        onNavigate={setIndex}
      />
    </>
  );
}

/** Proporção largura/altura da foto; sem dimensões gravadas, trata como 4:3. */
function ratio(media: { width?: number | null; height?: number | null }): number {
  return media.width && media.height ? +(media.width / media.height).toFixed(3) : 4 / 3;
}
