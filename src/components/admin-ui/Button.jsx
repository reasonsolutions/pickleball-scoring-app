import React from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

const VARIANT = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white font-bold border border-transparent',
  dark: 'bg-ink-900 hover:bg-ink-800 text-white font-bold border border-transparent',
  secondary: 'bg-white hover:bg-paper-100 text-ink-900 font-semibold border border-line-200',
  ghost: 'bg-transparent hover:bg-paper-200 text-ink-900 font-semibold border border-transparent',
  danger: 'bg-white hover:bg-bad-50 text-bad-600 font-semibold border border-bad-100',
};

const SIZE = {
  sm: { box: 'h-8 px-3 text-[13px]', icon: 14, square: 'w-8 h-8', iconOnly: 15 },
  md: { box: 'h-[42px] px-4 text-sm', icon: 16, square: 'w-[42px] h-[42px]', iconOnly: 18 },
  lg: { box: 'h-11 px-[18px] text-[15px]', icon: 16, square: 'w-11 h-11', iconOnly: 18 },
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-ds-md whitespace-nowrap select-none ' +
  'transition-colors duration-[120ms] ease-ds focus-visible:outline-none focus-visible:shadow-ds-focus ' +
  'disabled:opacity-45 disabled:pointer-events-none';

/**
 * Button. One `primary` per view. Pass `as={Link}` + `to` to render a router link.
 */
export function Button({
  children, variant = 'primary', size = 'md', icon, iconRight, fullWidth, as: As = 'button',
  type = 'button', className, ...rest
}) {
  const s = SIZE[size] || SIZE.md;
  const props = As === 'button' ? { type, ...rest } : rest;
  return (
    <As className={cx(BASE, VARIANT[variant] || VARIANT.primary, s.box, fullWidth && 'w-full', className)} {...props}>
      {icon && <Icon name={icon} size={s.icon} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon - 1} strokeWidth={2} />}
    </As>
  );
}

/** Square icon-only button. `label` is required (used for aria-label and title). */
export function IconButton({ icon, label, variant = 'secondary', size = 'md', className, as: As = 'button', type = 'button', ...rest }) {
  const s = SIZE[size] || SIZE.md;
  const props = As === 'button' ? { type, ...rest } : rest;
  return (
    <As aria-label={label} title={label} className={cx(BASE, VARIANT[variant] || VARIANT.secondary, s.square, 'shrink-0 px-0', className)} {...props}>
      <Icon name={icon} size={s.iconOnly} strokeWidth={1.8} />
    </As>
  );
}
