import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Rocket,
  Users,
} from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { usePageBlocks } from '../features/content/useContent';
import { EmptyState, LinkButton, SectionHeading } from '../components/ui';
import { IconTile } from '../components/ui/tiles';
import { SocialPill } from '../components/ui/SocialPill';
import { QueryState } from '../components/ui/QueryState';
import { ListSkeleton } from '../components/ui/skeletons';
import { Reveal } from '../components/motion/Reveal';
import { useSocialLinks } from '../features/social/useSocial';
import { useApplicationsOpen } from '../features/contact/useContact';
import { ContactForm } from '../components/forms/ContactForm';
import { useDocumentHead } from '../lib/useDocumentHead';
import './ComoEntrarPage.scss';

const STEP_ICONS = [ClipboardList, Users, MessageCircle, Rocket];

const CLOSED_FALLBACK = 'As inscrições estão encerradas no momento.';

export function ComoEntrarPage() {
  const blocks = usePageBlocks('como-entrar');
  const { byKey } = blocks;
  const { data: social } = useSocialLinks();
  const { open, info } = useApplicationsOpen();

  const hero = byKey('hero');
  const requisitos = byKey('requisitos');
  const cta = byKey('cta');

  useDocumentHead({
    title: 'Como Entrar',
    description:
      hero?.body || 'Processo seletivo da MinerSkills: etapas, requisitos e inscrição.',
    canonicalPath: '/como-entrar',
  });

  return (
    <>
      <PageHero
        title={hero?.title ?? 'Como Entrar na MinerSkills'}
        subtitle={hero?.body ?? undefined}
        actions={
          <>
            {open && <LinkButton href="#inscricao">Inscreva-se agora</LinkButton>}
            <LinkButton to="/agenda" variant="outline">
              Ver datas na agenda
            </LinkButton>
          </>
        }
      />

      <section className="ms-section ms-container ms-join">
        {/* ─── Etapas ─── */}
        <div className="ms-join__block">
          <SectionHeading title="Como funciona" dense />
          <QueryState query={blocks} skeleton={<ListSkeleton rows={4} lead={56} />}>
            {(data) => {
              const steps = data
                .filter((b) => b.key.startsWith('step_'))
                .sort((a, b) => a.order - b.order);
              if (steps.length === 0) {
                return (
                  <EmptyState
                    size="sm"
                    title="Etapas em definição"
                    description="As etapas do processo seletivo serão publicadas em breve."
                  />
                );
              }
              return (
                <Reveal>
                  <ol className="ms-join__steps" role="list">
                    {steps.map((step, i) => {
                      const Icon = STEP_ICONS[i % STEP_ICONS.length]!;
                      return (
                        <li key={step.key} className="ms-join-step">
                          <div className="ms-join-step__lead">
                            <IconTile icon={Icon} />
                            <span className="ms-join-step__num" aria-hidden>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="ms-join-step__content">
                            {step.subtitle && (
                              <span className="ms-join-step__label">{step.subtitle}</span>
                            )}
                            <h3 className="ms-join-step__title">{step.title}</h3>
                            {step.body && (
                              <p className="ms-join-step__body">{step.body}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </Reveal>
              );
            }}
          </QueryState>
        </div>

        {/* ─── Requisitos ─── */}
        {requisitos && (
          <Reveal>
            <div className="ms-join__requisitos">
              <div className="ms-join__requisitos-head">
                <IconTile icon={CheckCircle2} />
                <div>
                  <h2 className="ms-join__requisitos-title">{requisitos.title}</h2>
                  {requisitos.subtitle && (
                    <p className="ms-join__requisitos-sub">{requisitos.subtitle}</p>
                  )}
                </div>
              </div>
              {requisitos.body && (
                <div className="ms-prose ms-join__requisitos-body">
                  {requisitos.body.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ─── Inscrição: esqueleto enquanto as configurações carregam, formulário ou aviso ─── */}
        <div className="ms-join__apply" id="inscricao">
          {open === undefined && (
            <div className="ms-join__apply-inner">
              <ListSkeleton rows={3} lead={0} />
            </div>
          )}
          {open === true && (
            <div className="ms-join__apply-inner">
              <ContactForm kind="inscricao" title="Inscreva-se" />
            </div>
          )}
          {open === false && (
            <div className="ms-join__apply-inner">
              <div className="ms-join__closed">
                <h2 className="ms-join__closed-title">Inscreva-se</h2>
                <p>{info ?? CLOSED_FALLBACK}</p>
                <LinkButton to="/agenda" variant="outline">
                  Ver datas na agenda <ArrowRight aria-hidden />
                </LinkButton>
              </div>
            </div>
          )}
        </div>

        {/* ─── Redes ─── */}
        {cta && (
          <Reveal>
            <div className="ms-join__cta">
              <SectionHeading
                center
                dense
                title={cta.title ?? 'Fale com a equipe'}
                subtitle={cta.body ?? undefined}
              />
              {social && social.length > 0 && (
                <ul className="ms-join__socials" role="list" aria-label="Redes sociais">
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
            </div>
          </Reveal>
        )}
      </section>
    </>
  );
}
