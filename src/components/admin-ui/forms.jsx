import React, { useId } from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

const FIELD_LABEL = 'text-[13px] font-semibold text-ink-900';
const FIELD_HINT = 'text-xs';

export function Input({ label, icon, kbd, hint, error, className, inputClassName, id, disabled, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={fid} className={FIELD_LABEL}>{label}</label>}
      <div
        className={cx(
          'flex items-center gap-2 h-[42px] px-3 rounded-ds-md border text-ink-400 transition-shadow duration-[120ms] ease-ds',
          'focus-within:shadow-ds-focus',
          error ? 'border-bad-500' : 'border-line-200 focus-within:border-brand-500',
          disabled ? 'bg-paper-50' : 'bg-white'
        )}
      >
        {icon && <Icon name={icon} size={16} strokeWidth={1.8} />}
        <input
          id={fid}
          disabled={disabled}
          aria-invalid={!!error}
          className={cx('flex-1 min-w-0 border-0 outline-none bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:shadow-none', inputClassName)}
          style={{ boxShadow: 'none' }}
          {...rest}
        />
        {kbd && <span className="text-xs px-1.5 py-0.5 rounded-ds-xs bg-paper-100 text-ink-500">{kbd}</span>}
      </div>
      {(error || hint) && <span className={cx(FIELD_HINT, error ? 'text-bad-600' : 'text-ink-500')}>{error || hint}</span>}
    </div>
  );
}

export function Textarea({ label, hint, error, className, id, rows = 4, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={fid} className={FIELD_LABEL}>{label}</label>}
      <textarea
        id={fid}
        rows={rows}
        aria-invalid={!!error}
        className={cx(
          'px-3 py-2.5 rounded-ds-md border bg-white text-sm text-ink-900 placeholder:text-ink-400 outline-none',
          'transition-shadow duration-[120ms] ease-ds focus:shadow-ds-focus',
          error ? 'border-bad-500' : 'border-line-200 focus:border-brand-500'
        )}
        {...rest}
      />
      {(error || hint) && <span className={cx(FIELD_HINT, error ? 'text-bad-600' : 'text-ink-500')}>{error || hint}</span>}
    </div>
  );
}

export function Select({ label, options = [], placeholder, hint, error, className, id, value, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={fid} className={FIELD_LABEL}>{label}</label>}
      <div className="relative flex">
        <select
          id={fid}
          value={value}
          className={cx(
            'appearance-none w-full h-[42px] pl-3 pr-9 rounded-ds-md border bg-white text-sm cursor-pointer outline-none',
            'transition-shadow duration-[120ms] ease-ds focus:shadow-ds-focus focus:border-brand-500',
            error ? 'border-bad-500' : 'border-line-200',
            value ? 'text-ink-900' : 'text-ink-400'
          )}
          {...rest}
        >
          {placeholder != null && <option value="">{placeholder}</option>}
          {options.map((o) =>
            typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
        <Icon name="chevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-500" />
      </div>
      {(error || hint) && <span className={cx(FIELD_HINT, error ? 'text-bad-600' : 'text-ink-500')}>{error || hint}</span>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled, className }) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 text-sm text-ink-900', disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={cx(
          'w-5 h-5 rounded-ds-xs inline-flex items-center justify-center text-white transition-colors duration-[120ms] ease-ds',
          checked ? 'bg-ink-900' : 'bg-white border-[1.5px] border-line-300'
        )}
      >
        {checked && <Icon name="check" size={13} strokeWidth={2.6} />}
      </button>
      {label}
    </label>
  );
}

/** Use only for settings that apply immediately. */
export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 text-sm text-ink-900', disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={cx('w-[38px] h-[22px] rounded-full p-0.5 inline-flex transition-colors duration-[180ms] ease-ds', checked ? 'bg-brand-500' : 'bg-line-300')}
      >
        <span className={cx('w-[18px] h-[18px] rounded-full bg-white shadow-ds-sm transition-transform duration-[180ms] ease-ds', checked && 'translate-x-4')} />
      </button>
      {label}
    </label>
  );
}
