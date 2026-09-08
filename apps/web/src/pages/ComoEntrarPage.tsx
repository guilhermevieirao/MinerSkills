import { ArrowRight, ClipboardList, Users, MessageCircle, Rocket, CheckCircle2 } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePageBlocks } from '../features/content/useContent';
import { LinkButton } from '../components/ui';
import { Reveal } from '../components/motion/Reveal';
import { MarqueeStrip } from '../components/motion/MarqueeStrip';
import { useSocialLinks } from '../features/social/useSocial';
import { useApplicationsOpen } from '../features/contact/useContact';
import { SocialIcon } from '../components/layout/SocialIcon';
import { ContactForm } from '../components/forms/ContactForm';
import './ComoEntrarPage.scss';

const STEP_ICONS = [ClipboardList, Users, MessageCircle, Rocket];

const CLOSED_FALLBACK = 'As inscrições estão encerradas no momento.';

export function ComoEntrarPage() {
  const { byKey, data } = usePageBlocks('como-entrar');
  const { data: social } = useSocialLinks();
  const { open, info } = useApplicationsOpen();

  const hero = byKey('hero');
  const steps = (data ?? [])
    .filter((b) => b.key.startsWith('step_'))
    .sort((a, b) => a.order - b.order);
  const requisitos = byKey('requisitos');
  const cta = byKey('cta');

  return (
    <>
      <PageHero
        kicker={hero?.subtitle ?? 'Processo Seletivo'}
        title={hero?.title ?? 'Como Entrar na MinerSkills'}
        subtitle={hero?.body ?? undefined}
      >
        <LinkButton to="/agenda" className="ms-join__hero-cta">
          Ver datas na agenda <ArrowRight />
        </LinkButton>
      </PageHero>

      <MarqueeStrip text="INSCRIÇÕES · PROCESSO SELETIVO · #10019 ·" />

      <section className="ms-section ms-container">
        <div className="ms-join__steps">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length]!;
            return (
              <Reveal key={step.key} delay={i * 0.06}>
                <div className="ms-join-step">
                  <div className="ms-join-step__num">
                    <Icon />
                    <span>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="ms-join-step__content">
                    <span className="ms-join-step__label">{step.subtitle}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {requisitos && (
          <Reveal>
            <div className="ms-join__requisitos">
              <div className="ms-join__requisitos-head">
                <CheckCircle2 />
                <div>
                  <span className="ms-join__requisitos-kicker">{requisitos.subtitle}</span>
                  <h2>{requisitos.title}</h2>
                </div>
              </div>
              <p>{requisitos.body}</p>
            </div>
          </Reveal>
        )}

        {/* Inscrição: formulário quando aberta, aviso quando fechada, nada enquanto carrega */}
        <div className="ms-join__apply" id="inscricao">
          {open === true && (
            <Reveal>
              <ContactForm kind="inscricao" title="Inscreva-se" />
            </Reveal>
          )}
          {open === false && (
            <Reveal>
              <div className="ms-join__closed">
                <h2>Inscreva-se</h2>
                <p>{info ?? CLOSED_FALLBACK}</p>
                <LinkButton to="/agenda" variant="outline">
                  Ver datas na agenda <ArrowRight />
                </LinkButton>
              </div>
            </Reveal>
          )}
        </div>

        {cta && (
          <Reveal>
            <div className="ms-join__cta">
              <h2>{cta.title}</h2>
              <p>{cta.body}</p>
              <div className="ms-join__socials">
                {(social ?? []).map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ms-join__social"
                    aria-label={link.label}
                  >
                    <SocialIcon platform={link.platform} />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </section>
    </>
  );
}
