import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE } from '../../lib/motion';
import './Countdown.scss';

interface CountdownProps {
  /** Data-alvo em ISO 8601 (ex.: `startsAt` de um evento da agenda). */
  target: string;
}

const SECOND = 1000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Divide um intervalo (ms) em dias, horas, minutos e segundos inteiros. */
function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / SECOND));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/**
 * Contador regressivo até `target`, atualizado a cada segundo (o intervalo é
 * limpo ao desmontar). Passada a data, mostra "Acontecendo agora".
 * `aria-live="off"` evita que leitores de tela anunciem cada tique; o rótulo
 * acessível resume o tempo restante numa frase.
 */
export function Countdown({ target }: CountdownProps) {
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), SECOND);
    return () => window.clearInterval(id);
  }, []);

  if (!Number.isFinite(targetMs)) return null;

  const remaining = targetMs - now;
  if (remaining <= 0) {
    return (
      <p className="ms-countdown ms-countdown--now" aria-live="off">
        <time dateTime={target}>Acontecendo agora</time>
      </p>
    );
  }

  const parts = splitRemaining(remaining);
  const units: Array<{ value: number; singular: string; plural: string }> = [
    { value: parts.days, singular: 'dia', plural: 'dias' },
    { value: parts.hours, singular: 'hora', plural: 'horas' },
    { value: parts.minutes, singular: 'minuto', plural: 'minutos' },
    { value: parts.seconds, singular: 'segundo', plural: 'segundos' },
  ];
  const summary = units
    .map((u) => `${u.value} ${u.value === 1 ? u.singular : u.plural}`)
    .join(', ');

  return (
    <time
      className="ms-countdown"
      dateTime={target}
      aria-live="off"
      aria-label={`Faltam ${summary}`}
    >
      {units.map((u) => (
        <span key={u.plural} className="ms-countdown__unit" aria-hidden>
          {/* cada troca rola: o número que sai sobe, o novo entra por baixo */}
          <span className="ms-countdown__value">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={u.value}
                className="ms-countdown__digit"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                {pad(u.value)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="ms-countdown__label">
            {u.value === 1 ? u.singular : u.plural}
          </span>
        </span>
      ))}
    </time>
  );
}
