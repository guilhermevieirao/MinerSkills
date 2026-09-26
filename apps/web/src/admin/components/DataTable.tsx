import type { ReactNode } from 'react';
import { cx } from '../../lib/format';
import { mq } from '../../lib/breakpoints';
import { useMediaQuery } from '../../lib/useMediaQuery';

export interface Column<T> {
  key: string;
  /** Cabeçalho da coluna (e rótulo do campo no cartão do celular). */
  header: string;
  render: (row: T) => ReactNode;
  /** Largura fixa na tabela (ex.: '64px'). */
  width?: string;
  align?: 'start' | 'end' | 'center';
  /** Título do cartão no celular (uma por tabela). */
  primary?: boolean;
  /** Miniatura/ícone: à esquerda do título no cartão, sem rótulo. */
  lead?: boolean;
  /** Cabeçalho só para leitores de tela (miniatura, ícone). */
  hideHeader?: boolean;
  /** Some no cartão do celular (informação secundária). */
  hideOnMobile?: boolean;
}

/**
 * Listagem do painel: tabela a partir de 768px e cartões abaixo — só um dos
 * dois fica no DOM (a suíte e2e lê `.ms-adm__table` e exige um único alvo).
 * Toda linha (tr ou li) leva `data-row` com o rótulo do registro, o gancho dos
 * testes. Estados de carregamento/vazio/erro ficam com o QueryState da seção.
 */
export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  rowLabel,
  actions,
  rowClassName,
}: {
  /** Descrição da tabela para leitores de tela. */
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowLabel: (row: T) => string;
  /** Botões da linha (use RowActions). */
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  const isMobile = useMediaQuery(mq.below('md'));

  if (isMobile) {
    const lead = columns.find((c) => c.lead);
    const primary = columns.find((c) => c.primary);
    const fields = columns.filter((c) => !c.lead && !c.primary && !c.hideOnMobile);
    return (
      <ul
        className="ms-adm__table ms-table ms-table--cards"
        aria-label={caption}
        role="list"
      >
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            data-row={rowLabel(row)}
            className={cx('ms-table__card', rowClassName?.(row))}
          >
            <div className="ms-table__card-head">
              {lead && <div className="ms-table__card-lead">{lead.render(row)}</div>}
              <div className="ms-table__card-title">
                {primary ? primary.render(row) : rowLabel(row)}
              </div>
            </div>
            {fields.length > 0 && (
              <dl className="ms-table__fields">
                {fields.map((c) => (
                  <div key={c.key} className="ms-table__field">
                    <dt>{c.header}</dt>
                    <dd>{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="ms-table__card-actions">{actions(row)}</div>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ms-adm__table-wrap">
      <table className="ms-adm__table ms-table">
        <caption className="ms-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cx(c.align && `ms-table__cell--${c.align}`)}
              >
                {c.hideHeader ? (
                  <span className="ms-visually-hidden">{c.header}</span>
                ) : (
                  c.header
                )}
              </th>
            ))}
            {actions && (
              <th scope="col" className="ms-table__actions-col">
                <span className="ms-visually-hidden">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              data-row={rowLabel(row)}
              className={rowClassName?.(row)}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    c.align && `ms-table__cell--${c.align}`,
                    c.primary && 'ms-table__cell--primary',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
              {actions && <td className="ms-table__cell--end">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
