import React from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

/** Segmented tabs: sunken track, white active pill. items: [{ id, label, count }] */
export function Tabs({ items = [], value, onChange, fullWidth, className }) {
  return (
    <div role="tablist" className={cx('flex gap-1 p-1 rounded-ds-md bg-paper-200 max-w-full overflow-x-auto', fullWidth ? 'w-full' : 'w-fit', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange && onChange(it.id)}
            className={cx(
              'inline-flex items-center justify-center gap-2 h-[38px] px-3.5 rounded-ds-sm text-sm font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-ds',
              fullWidth && 'flex-1',
              on ? 'bg-white shadow-ds-sm text-ink-900' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {it.label}
            {it.count != null && (
              <span className={cx('text-xs px-[7px] py-px rounded-full', on ? 'bg-brand-100 text-brand-700' : 'bg-line-300 text-ink-600')}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Sidebar row. Pass `as={Link}` + `to` for routing. Active = white pill, orange label. */
export function NavItem({ icon, label, active, count, as: As = 'button', className, ...rest }) {
  return (
    <As
      {...(As === 'button' ? { type: 'button' } : {})}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-3 w-full min-h-[40px] px-3 rounded-[10px] text-[15px] text-left transition-colors duration-[120ms] ease-ds',
        active ? 'bg-white shadow-ds-sm text-brand-600 font-bold' : 'text-ink-900 font-medium hover:bg-paper-200',
        className
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      <span className="flex-1 truncate">{label}</span>
      {count != null && (
        <span className="text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full bg-paper-200 text-ink-600 inline-flex items-center justify-center">{count}</span>
      )}
    </As>
  );
}

export function NavGroup({ title, children }) {
  return (
    <div className="flex flex-col gap-0.5 pt-3 border-t border-line-200">
      {title && <div className="text-xs font-semibold text-ink-400 px-3 pb-1.5 tracking-[0.04em] uppercase">{title}</div>}
      {children}
    </div>
  );
}
