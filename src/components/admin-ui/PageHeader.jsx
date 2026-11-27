import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { cx } from './cx';

/**
 * Page title (36/700), secondary subtitle, right-aligned actions (secondary first, one primary last).
 * Optional `back={{ to, label }}` renders a small back link above the title.
 */
export function PageHeader({ title, subtitle, actions, back, className }) {
  return (
    <header className={cx('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="min-w-0 flex flex-col gap-1">
        {back && (
          <Link to={back.to} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-900 w-fit mb-1">
            <Icon name="arrowLeft" size={14} />
            {back.label}
          </Link>
        )}
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] leading-[1.1] text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard page body: page padding clamp(16px, 2.6vw, 32px), max width 1360, 16–24px vertical rhythm. */
export function Page({ children, className }) {
  return (
    <div className="w-full" style={{ padding: 'var(--page-pad)' }}>
      <div className={cx('w-full max-w-[1360px] mx-auto flex flex-col gap-4 sm:gap-6', className)}>{children}</div>
    </div>
  );
}
