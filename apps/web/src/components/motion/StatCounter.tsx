import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

interface StatCounterProps {
  value: string; // ex.: "12+", "#10019", "Rising"
}

/** Anima números de 0 até o valor (mantém prefixos/sufixos não numéricos). */
export function StatCounter({ value }: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const target = match ? Number(match[2]) : null;

  useEffect(() => {
    if (!inView || target === null || reduce) {
      setDisplay(value);
      return;
    }
    const prefix = match?.[1] ?? '';
    const suffix = match?.[3] ?? '';
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${prefix}${Math.round(eased * target)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, value, reduce, match]);

  return (
    <span ref={ref} className="ms-stat-counter">
      {display}
    </span>
  );
}
