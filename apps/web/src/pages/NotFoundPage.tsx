import { Home } from 'lucide-react';
import { LinkButton } from '../components/ui';
import { FullScreenMessage } from '../components/ui/FullScreenMessage';
import { useDocumentHead } from '../lib/useDocumentHead';

/** Destinos prováveis de quem caiu numa URL errada. */
const SHORTCUTS = [
  { to: '/equipe', label: 'Equipe' },
  { to: '/blog', label: 'Blog' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/contato', label: 'Contato' },
];

export function NotFoundPage() {
  // noindex: a URL não existe; buscadores não devem guardar a tela de erro
  useDocumentHead({ title: 'Página não encontrada', noindex: true });
  return (
    <FullScreenMessage
      code="404"
      codeClassName="ms-404__code"
      title="Página não encontrada"
      text="Parece que essa galeria da mina está vazia. Vamos te levar de volta à superfície."
      actions={
        <LinkButton to="/" size="lg">
          <Home aria-hidden /> Voltar ao início
        </LinkButton>
      }
      links={SHORTCUTS}
    />
  );
}
