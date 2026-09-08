import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHero } from '../components/layout/PageHero';
import { useGallery } from '../features/gallery/useGallery';
import { EmptyState } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Lightbox } from '../components/ui/Lightbox';
import { useDocumentHead } from '../lib/useDocumentHead';
import './GaleriaPage.scss';

const DESCRIPTION = 'Momentos da equipe: bancada, competições, bastidores e conquistas.';

export function GaleriaPage() {
  const gallery = useGallery();
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
      <PageHero kicker="Registros" title="Galeria" subtitle={DESCRIPTION} />

      <section className="ms-section ms-container">
        <QueryState
          query={gallery}
          skeleton={<CardGridSkeleton count={8} aspect="1" />}
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
            <div className="ms-gallery">
              {photos.map((photo, i) => (
                <motion.button
                  key={photo.id}
                  className="ms-gallery__item"
                  onClick={() => setIndex(i)}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.4, delay: (i % 6) * 0.03 }}
                  aria-label={photo.caption ?? 'Ampliar foto'}
                >
                  <MediaImage
                    media={photo.media}
                    alt={photo.media.alt ?? photo.caption ?? ''}
                    thumb
                  />
                  {photo.caption && (
                    <span className="ms-gallery__caption">{photo.caption}</span>
                  )}
                </motion.button>
              ))}
            </div>
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
