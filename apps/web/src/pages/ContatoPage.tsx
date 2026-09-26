import { Mail } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { Card } from '../components/ui';
import { SocialPill } from '../components/ui/SocialPill';
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
      <PageHero
        kicker="Fale com a gente"
        title="Contato"
        subtitle={DESCRIPTION}
        size="sm"
      />

      <section className="ms-section ms-container ms-contact-page">
        <div className="ms-contact-page__grid">
          <Card
            as="section"
            className="ms-contact-page__aside"
            aria-labelledby="ms-contact-channels"
          >
            <h2 id="ms-contact-channels" className="ms-contact-page__heading">
              Canais
            </h2>
            <p className="ms-contact-page__text">
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
              <ul
                className="ms-contact-page__socials"
                role="list"
                aria-label="Redes sociais"
              >
                {social.map((link) => (
                  <li key={link.id}>
                    <SocialPill
                      platform={link.platform}
                      label={link.label}
                      href={link.url}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <ContactForm kind="contato" title="Envie uma mensagem" />
        </div>
      </section>
    </>
  );
}
