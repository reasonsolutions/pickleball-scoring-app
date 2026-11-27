import React from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

/** White, flat card. 18px radius (`radius="2xl"` → 20px for feature cards). */
export function Card({ title, subtitle, action, children, radius = 'xl', muted, padding = true, className, as: As = 'section', ...rest }) {
  return (
    <As
      className={cx(
        'flex flex-col gap-3 min-w-0 border border-line-150',
        muted ? 'bg-paper-50' : 'bg-white',
        radius === '2xl' ? 'rounded-ds-2xl' : 'rounded-ds-xl',
        padding && 'p-5',
        className
      )}
      {...rest}
    >
      {(title || action) && (
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            {title && <div className="text-base font-semibold text-ink-900">{title}</div>}
            {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </As>
  );
}

const BADGE = {
  neutral: ['bg-paper-100 text-ink-600', 'bg-ink-400'],
  brand: ['bg-brand-100 text-brand-800', 'bg-brand-500'],
  success: ['bg-ok-50 text-ok-700', 'bg-ok-500'],
  danger: ['bg-bad-50 text-bad-600', 'bg-bad-500'],
  warning: ['bg-warn-50 text-warn-700', 'bg-warn-500'],
  dark: ['bg-ink-900 text-white', 'bg-white'],
};

/** Status only: Active = success+dot, Live = danger+dot, Completed = neutral, Game Breaker = dark. */
export function Badge({ children, tone = 'neutral', dot, className }) {
  const t = BADGE[tone] || BADGE.neutral;
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-xs font-bold whitespace-nowrap leading-[1.4]', t[0], className)}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', t[1])} />}
      {children}
    </span>
  );
}

/** Filter / category chip. */
export function Chip({ children, selected, icon, onClick, className }) {
  const As = onClick ? 'button' : 'span';
  return (
    <As
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-ds',
        selected ? 'bg-ink-900 text-white' : cx('bg-paper-100 text-ink-700', onClick && 'hover:bg-paper-200'),
        className
      )}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={1.9} />}
      {children}
    </As>
  );
}

const AVATAR = {
  brand: 'bg-brand-100 text-brand-700',
  solid: 'bg-brand-500 text-white',
  neutral: 'bg-paper-200 text-ink-900',
};

export function initialsOf(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Brand = own team / current user, neutral = opponent. */
export function Avatar({ name = '', initials, size = 32, tone = 'brand', src, className }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    return <img src={src} alt={name} title={name} style={style} className={cx('rounded-full object-cover shrink-0', className)} />;
  }
  return (
    <span title={name} style={style} className={cx('rounded-full shrink-0 inline-flex items-center justify-center font-bold', AVATAR[tone] || AVATAR.brand, className)}>
      {initials || initialsOf(name)}
    </span>
  );
}

/** 30px orange icon tile. */
export function IconTile({ icon, size = 30, className }) {
  return (
    <span style={{ width: size, height: size }} className={cx('rounded-ds-sm bg-brand-100 text-brand-600 inline-flex items-center justify-center shrink-0', className)}>
      <Icon name={icon} size={16} strokeWidth={1.8} />
    </span>
  );
}

/** Dot-column sparkline. Columns from `highlightFrom` onward are full orange. */
export function DotChart({ values = [], max, rows = 8, dot = 5, gap = 3, highlightFrom }) {
  const m = max || Math.max(1, ...values);
  const hf = highlightFrom == null ? Math.floor(values.length * 0.75) : highlightFrom;
  return (
    <div className="flex items-end" style={{ gap, height: rows * (dot + gap) }} aria-hidden="true">
      {values.map((v, i) => {
        const n = Math.max(1, Math.round((v / m) * rows));
        return (
          <div key={i} className="flex flex-col-reverse" style={{ gap }}>
            {Array.from({ length: n }).map((_, j) => (
              <span key={j} className="rounded-full" style={{ width: dot, height: dot, background: i >= hf ? 'var(--dot-full)' : 'var(--dot-mid)' }} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Dot roles for DotMatrix: done / exception / next / scheduled. */
export const DOT = {
  done: 'var(--dot-full)',
  exception: 'var(--ink-900)',
  next: 'var(--dot-mid)',
  empty: 'var(--dot-empty)',
};

/** One dot per fixture, grouped (e.g. by matchday), with an optional "Today" marker after group index `marker.after`. */
export function DotMatrix({ groups = [], columns = 4, dot = 9, gap = 6, marker }) {
  return (
    <div className="overflow-x-auto" style={{ paddingTop: marker ? 28 : 0 }}>
      <div className="flex gap-[18px] items-start min-w-max">
        {groups.map((g, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col gap-2.5">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, ${dot}px)`, gap }}>
                {g.dots.map((c, j) => (
                  <span key={j} className="rounded-full" style={{ width: dot, height: dot, background: DOT[c] || c }} />
                ))}
              </div>
              <div className={cx('text-xs text-ink-500', g.emphasis ? 'font-bold' : 'font-medium')}>{g.label}</div>
            </div>
            {marker && marker.after === i && (
              <div className="relative w-px self-stretch min-h-[60px] bg-ink-900">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-[9px] py-[3px] rounded-full bg-ink-900 text-white text-[11px] font-semibold">
                  {marker.label}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** Matchday progress bar made of segments. */
export function SegmentProgress({ total = 6, done = 0, next = 0, height = 8 }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{ height, borderRadius: height / 2, background: i < done ? 'var(--accent)' : i < done + next ? 'var(--dot-mid)' : 'var(--dot-empty)' }}
        />
      ))}
    </div>
  );
}

/** KPI card: icon tile, label, large value, ▲/▼ delta and an optional DotChart. */
export function StatCard({ label, icon = 'calendar', value, delta, trend = 'up', sub, series, onClick, className }) {
  const up = trend === 'up';
  const As = onClick ? 'button' : 'div';
  return (
    <As
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'text-left bg-white border border-line-150 rounded-ds-xl px-5 py-[18px] flex flex-col gap-3.5 min-w-0',
        onClick && 'cursor-pointer hover:border-line-200 transition-colors duration-[120ms] ease-ds',
        className
      )}
    >
      <div className="flex items-center gap-2.5 w-full">
        <IconTile icon={icon} />
        <span className="flex-1 text-[15px] font-semibold text-ink-900">{label}</span>
        {onClick && <Icon name="arrowUpRight" size={16} className="text-ink-400" />}
      </div>
      <div className="flex items-end justify-between gap-3 w-full">
        <div className="min-w-0">
          <div className="text-[36px] font-bold tracking-[-0.02em] leading-none text-ink-900 tabular">{value}</div>
          {(delta || sub) && (
            <div className="text-[13px] text-ink-500 mt-2 flex gap-1.5 flex-wrap">
              {delta && <span className={cx('font-bold', up ? 'text-ok-500' : 'text-bad-500')}>{up ? '▲' : '▼'} {delta}</span>}
              {sub}
            </div>
          )}
        </div>
        {series && series.length > 0 && <DotChart values={series} />}
      </div>
    </As>
  );
}

/** Centered empty state inside a card. */
export function EmptyState({ icon = 'info', title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center text-center gap-2 py-10 px-4', className)}>
      <IconTile icon={icon} size={40} />
      <div className="text-base font-semibold text-ink-900 mt-1">{title}</div>
      {description && <div className="text-sm text-ink-500 max-w-sm">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Inline spinner-free loading row. */
export function Loading({ label = 'Loading', className }) {
  return (
    <div className={cx('flex items-center justify-center gap-2 py-16 text-sm text-ink-500', className)} role="status">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
      {label}
    </div>
  );
}
