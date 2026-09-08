import { useMutation } from '@tanstack/react-query';
import type { ContactMessageInput } from '@minerskills/shared';
import { api } from '../../lib/api';
import { useSetting, useSettings } from '../social/useSocial';

/** `POST /api/contact` — responde `202 { ok: true }`; `409` quando as inscrições estão fechadas. */
export function useSendMessage() {
  return useMutation({
    mutationFn: (data: ContactMessageInput) => api.post<{ ok: true }>('/contact', data),
  });
}

/**
 * Estado das inscrições (configuração `applications_open`) e o aviso exibido
 * enquanto estão fechadas (`applications_info`). `open` fica `undefined` só
 * enquanto as configurações carregam — chave ausente ou vazia, e também falha
 * de `GET /api/settings`, contam como fechada: o formulário nunca aparece por
 * engano e o visitante ainda vê o aviso com o link para a agenda.
 */
export function useApplicationsOpen(): {
  open: boolean | undefined;
  info: string | undefined;
} {
  const { data, isError } = useSettings();
  const raw = useSetting('applications_open');
  const info = useSetting('applications_info');
  const open = isError ? false : data === undefined ? undefined : raw === 'true';
  return { open, info };
}
