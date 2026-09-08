import { Mail } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { SocialIcon } from '../components/layout/SocialIcon';
import { Reveal } from '../components/motion/Reveal';
import { ContactForm } from '../components/forms/ContactForm';
import { useSetting, useSocialLinks } from '../features/social/useSocial';
import { useDocumentHead } from '../lib/useDocumentHead';
import './ContatoPage.scss';

const DESCRIPTION =
  'Dúvidas, parcerias, imprensa ou um convite para visitar a oficina: escreva para a equipe.';

export function ContatoPage() {
  const email = useSetting('contact_email');
  const { data: social } = useSocialLinks();

  useDocumentHead({
    title: 'Contato',
    description: DESCRIPTION,
    canonicalPath: '/contato',
  });

  return (
    <>
      <PageHero kicker="Fale com a gente" title="Contato" subtitle={DESCRIPTION} />

      <section className="ms-section ms-container ms-contact-page">
        <div className="ms-contact-page__grid">
          <Reveal>
            <aside className="ms-contact-page__card">
              <h2>Canais</h2>
              <p>
                Respondemos pelo e-mail informado no formulário. Se preferir, fale direto
                com a equipe:
              </p>
              {email && (
                <a href={`mailto:${email}`} className="ms-contact-page__mail">
                  <Mail aria-hidden />
                  <span>{email}</span>
                </a>
              )}
              {social && social.length > 0 && (
                <div className="ms-contact-page__socials">
                  {social.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ms-contact-page__social"
                      aria-label={link.label}
                    >
                      <SocialIcon platform={link.platform} />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </aside>
          </Reveal>

          <Reveal delay={0.08}>
            <ContactForm kind="contato" title="Envie uma mensagem" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
