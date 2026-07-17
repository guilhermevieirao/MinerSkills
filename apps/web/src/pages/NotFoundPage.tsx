import { LinkButton } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';
import { HexPattern } from '../components/motion/HexPattern';
import { Home } from 'lucide-react';
import './NotFoundPage.scss';

export function NotFoundPage() {
  return (
    <section className="ms-404">
      <HexPattern />
      <div className="ms-404__inner">
        <LogoMark className="ms-404__logo" />
        <h1 className="ms-404__code">404</h1>
        <p className="ms-404__title">Página não encontrada</p>
        <p className="ms-404__text">
          Parece que essa galeria da mina está vazia. Vamos te levar de volta à superfície.
        </p>
        <LinkButton to="/" size="lg">
          <Home /> Voltar ao início
        </LinkButton>
      </div>
    </section>
  );
}
