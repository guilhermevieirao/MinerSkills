import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { HexPattern } from '../motion/HexPattern';
import './PageHero.scss';

export function PageHero({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="ms-pagehero">
      <HexPattern />
      <div className="ms-container ms-pagehero__inner">
        {kicker && (
          <motion.span
            className="ms-pagehero__kicker"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {kicker}
          </motion.span>
        )}
        <motion.h1
          className="ms-pagehero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            className="ms-pagehero__subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            {subtitle}
          </motion.p>
        )}
        {children}
      </div>
    </header>
  );
}
