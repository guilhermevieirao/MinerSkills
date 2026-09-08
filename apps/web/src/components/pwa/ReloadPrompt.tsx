import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { useToast } from '../ui/Toast';
import './pwa.scss';

/**
 * Registra o service worker (`registerType: 'prompt'`) e avisa quando há uma
 * versão nova: a barra fica no rodapé da tela até o usuário decidir — nada
 * recarrega sozinho no meio de um formulário. Na primeira instalação, um toast
 * confirma que o shell está pronto para uso offline.
 *
 * A região viva existe sempre (vazia enquanto não há atualização): leitores de
 * tela só anunciam mudanças em regiões que já estavam na página — um nó
 * inserido já com texto é ignorado. Vazia, ela não ocupa espaço (`:empty`).
 *
 * Em desenvolvimento (`devOptions.enabled: false`) o registro é um no-op: os
 * dois sinais nunca chegam e a região fica vazia.
 */
export function ReloadPrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  // O toast vale uma vez por sessão; o sinal é consumido em seguida.
  const announcedOffline = useRef(false);
  useEffect(() => {
    if (!offlineReady || announcedOffline.current) return;
    announcedOffline.current = true;
    toast.push('Pronto para uso offline', 'success');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  return (
    <div className="ms-pwa-reload" role="status" aria-live="polite">
      {needRefresh && (
        <>
          <RefreshCw className="ms-pwa-reload__icon" aria-hidden />
          <span className="ms-pwa-reload__msg">Nova versão disponível.</span>
          <div className="ms-pwa-reload__actions">
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Atualizar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Depois
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
