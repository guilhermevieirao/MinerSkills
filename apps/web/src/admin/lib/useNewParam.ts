import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Atalhos do dashboard abrem a seção já com o formulário de criação
 * (`/admin/blog?novo=1`). Chama `open` uma vez e limpa o parâmetro da URL,
 * para que recarregar ou voltar não reabra o formulário.
 */
export function useNewParam(open: () => void): void {
  const [params, setParams] = useSearchParams();
  const wanted = params.get('novo') === '1';

  useEffect(() => {
    if (!wanted) return;
    open();
    const next = new URLSearchParams(params);
    next.delete('novo');
    setParams(next, { replace: true });
    // open é estável o bastante: só o parâmetro dispara
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);
}
