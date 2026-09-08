import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui';
import { cx } from '../../lib/format';
import './pwa.scss';

/** Evento não tipado pelo DOM lib (só Chromium o dispara). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * O navegador dispara `beforeinstallprompt` assim que os critérios de PWA são
 * atendidos — às vezes antes de o rodapé montar. O evento é guardado no módulo
 * (avaliado na carga do bundle) e o componente o lê quando aparece.
 */
let pending: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // sem o mini-infobar do Chrome; o botão do rodapé decide o momento
    pending = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    pending = null;
    notify();
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari expõe a informação por esta propriedade não padronizada
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Botão discreto "Instalar app". Só aparece quando o navegador ofereceu a
 * instalação; some depois de instalado ou quando o site já roda como app.
 */
export function InstallPrompt({ className }: { className?: string }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(() =>
    isStandalone() ? null : pending,
  );

  useEffect(() => {
    if (isStandalone()) return;
    const sync = () => setEvent(pending);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (!event) return null;

  const install = async () => {
    // O evento só serve para um prompt; seja qual for a resposta, o botão some.
    pending = null;
    setEvent(null);
    await event.prompt();
    await event.userChoice.catch(() => undefined);
  };

  return (
    <div className={cx('ms-pwa-install', className)}>
      <Button size="sm" variant="outline" onClick={() => void install()}>
        <Download aria-hidden /> Instalar app
      </Button>
    </div>
  );
}
