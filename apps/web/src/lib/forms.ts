import type { ZodError } from 'zod';

/** `issue.path[0] → mensagem`, o mesmo mapeamento que todo formulário do painel faz à mão. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in errs)) errs[key] = issue.message;
  }
  return errs;
}

/**
 * Depois de um envio inválido, leva o foco (e a rolagem) ao primeiro controle
 * marcado com `aria-invalid` — o `Field` marca o controle e anuncia o erro.
 */
export function focusFirstInvalid(form: HTMLFormElement | null | undefined): void {
  const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
