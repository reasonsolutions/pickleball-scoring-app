import React from 'react';
import { cx } from './cx';

const ALIGN = { right: 'justify-end text-right', center: 'justify-center text-center' };

/**
 * Grid table with a sunken rounded header and hairline rows.
 * Below 640px it renders a stacked list: the column marked `primary` (or the first)
 * becomes the row title; the rest are label/value pairs. Set `hideOnMobile` on a column to drop it there.
 *
 * columns: [{ key, label, width, align, render, primary, hideOnMobile }]
 */
export function Table({ columns = [], rows = [], rowKey = 'id', onRowClick, dense, empty }) {
  const tpl = columns.map((c) => c.width || 'minmax(0,1fr)').join(' ');
  const py = dense ? 'py-2.5' : 'py-3.5';
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key]);
  const keyOf = (r, i) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey] ?? i);
  const primary = columns.find((c) => c.primary) || columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  if (rows.length === 0 && empty) return empty;

  return (
    <>
      {/* ≥640px: grid table */}
      <div role="table" className="hidden sm:grid text-sm min-w-0" style={{ gridTemplateColumns: tpl }}>
        {columns.map((c, i) => (
          <div
            role="columnheader"
            key={c.key}
            className={cx(
              'px-2 py-2.5 bg-paper-50 text-ink-500 text-[13px] font-semibold',
              c.align === 'right' && 'text-right',
              c.align === 'center' && 'text-center',
              i === 0 && 'rounded-l-[10px]',
              i === columns.length - 1 && 'rounded-r-[10px]'
            )}
          >
            {c.label}
          </div>
        ))}
        {rows.map((r, ri) => (
          <div
            role="row"
            key={keyOf(r, ri)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cx('contents', onRowClick && 'cursor-pointer [&:hover>div]:bg-paper-50')}
          >
            {columns.map((c) => (
              <div
                role="cell"
                key={c.key}
                className={cx('px-2 border-b border-line-100 text-ink-900 flex items-center gap-2 min-w-0 transition-colors duration-[120ms]', py, ALIGN[c.align])}
              >
                {cell(c, r)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* <640px: stacked list */}
      <ul className="sm:hidden flex flex-col">
        {rows.map((r, ri) => (
          <li
            key={keyOf(r, ri)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cx('py-3 border-b border-line-100 last:border-b-0 flex flex-col gap-1.5', onRowClick && 'cursor-pointer active:bg-paper-50')}
          >
            <div className="text-[15px] font-semibold text-ink-900 min-w-0">{cell(primary, r)}</div>
            {rest.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-ink-500">{c.label}</span>
                <span className="text-ink-900 text-right min-w-0 flex items-center gap-2 justify-end">{cell(c, r)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
