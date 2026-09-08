import { useNavigation } from 'react-router-dom';
import { cx } from '../../lib/format';
import './NavigationProgress.scss';

/**
 * Barra fina no topo enquanto o router baixa o chunk da próxima página
 * (`navigation.state === 'loading'`). A página atual continua na tela; a
 * barra é o único sinal de que algo está acontecendo. Decorativa: o
 * RouteAnnouncer é quem avisa a troca de página aos leitores de tela.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const active = navigation.state === 'loading';
  return (
    <div className={cx('ms-navprogress', active && 'ms-navprogress--active')} aria-hidden>
      <div className="ms-navprogress__bar" />
    </div>
  );
}
