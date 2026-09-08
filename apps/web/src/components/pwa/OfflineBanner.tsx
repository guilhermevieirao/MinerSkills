import { WifiOff } from 'lucide-react';
import { useOnline } from '../ui/ErrorState';
import './pwa.scss';

/**
 * Faixa fixa logo abaixo da navbar enquanto `navigator.onLine` for falso.
 * A região viva existe sempre (vazia quando há rede): leitores de tela só
 * anunciam mudanças em regiões que já estavam na página.
 */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div className="ms-pwa-offline" role="status" aria-live="polite">
      {!online && (
        <>
          <WifiOff className="ms-pwa-offline__icon" aria-hidden />
          <span>Você está offline — algumas páginas podem estar desatualizadas.</span>
        </>
      )}
    </div>
  );
}
