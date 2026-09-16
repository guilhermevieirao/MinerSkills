import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { DUR, EASE } from '../../lib/motion';
import './Toast.scss';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  push: (message: string, kind?: ToastKind) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
/** Só as últimas ficam na tela; as antigas saem. */
const MAX_VISIBLE = 3;

/** Tempo na tela proporcional ao texto: ~4 s para uma frase curta, até 9 s para um erro longo. */
function durationFor(message: string): number {
  return Math.min(9000, 3500 + message.length * 40);
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = ICONS[toast.kind];
  // Pausa em hover/foco: a contagem só corre enquanto ninguém está lendo.
  const [paused, setPaused] = useState(false);
  const remaining = useRef(durationFor(toast.message));
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onClose, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        500,
        remaining.current - (Date.now() - startedAt.current),
      );
    };
  }, [paused, onClose]);

  return (
    <motion.div
      className={`ms-toast ms-toast--${toast.kind}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: DUR.base, ease: EASE }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="ms-toast__icon" aria-hidden />
      <span className="ms-toast__msg">{toast.message}</span>
      <button
        type="button"
        className="ms-toast__close"
        onClick={onClose}
        aria-label="Fechar aviso"
      >
        <X aria-hidden />
      </button>
    </motion.div>
  );
}

/**
 * Pilha de avisos no canto inferior. Duas regiões vivas: sucesso/info em
 * `status` (polite) e erros em `alert` (assertive) — um erro nunca é engolido
 * pelo sucesso anunciado logo antes. As regiões existem sempre (vazias), porque
 * leitores de tela só anunciam mudanças em regiões que já estavam na página.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, kind, message }].slice(-MAX_VISIBLE));
  }, []);

  const value = useMemo<ToastCtx>(
    () => ({
      push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  const errors = toasts.filter((t) => t.kind === 'error');
  const others = toasts.filter((t) => t.kind !== 'error');

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="ms-toasts">
        <div className="ms-toasts__region" role="status" aria-live="polite">
          <AnimatePresence>
            {others.map((t) => (
              <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
            ))}
          </AnimatePresence>
        </div>
        <div className="ms-toasts__region" role="alert" aria-live="assertive">
          <AnimatePresence>
            {errors.map((t) => (
              <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Ctx.Provider>
  );
}
