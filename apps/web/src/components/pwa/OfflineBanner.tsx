import { WifiOff } from 'lucide-react';
import { useOnline } from '../ui/ErrorState';
import './pwa.scss';

/**
 * Pílula fixa na base da tela enquanto `navigator.onLine` for falso — não
 * cobre a navbar nem barras sticky. A região viva existe sempre (vazia quando
 * há rede): leitores de tela só anunciam mudanças em regiões já presentes.
 */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div className="ms-pwa-offline" role="status" aria-live="polite">
      {!online && (
        <>
          <WifiOff className="ms-pwa-offline__icon" aria-hidden />
          <span>Você está offline — o conteúdo pode estar desatualizado.</span>
        </>
      )}
    </div>
  );
}
