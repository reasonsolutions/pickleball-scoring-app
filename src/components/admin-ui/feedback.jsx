import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { IconButton } from './Button';
import { cx } from './cx';

/** Modal dialog over a scrim. Esc and scrim click call onClose. */
export function Dialog({ open, title, description, children, actions, onClose, width = 440 }) {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="admin-app !min-h-0 !bg-transparent fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'var(--scrim)' }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="relative w-full bg-white rounded-ds-2xl shadow-ds-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold tracking-[-0.01em] text-ink-900">{title}</div>
            {description && <div className="text-sm text-ink-500 mt-1 leading-[1.45]">{description}</div>}
          </div>
          {onClose && <IconButton icon="close" label="Close" variant="ghost" size="sm" onClick={onClose} />}
        </div>
        {children}
        {actions && <div className="flex justify-end gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}

const TOAST = { success: ['check', 'text-ok-500'], danger: ['alert', 'text-bad-500'], info: ['info', 'text-brand-200'], warning: ['alert', 'text-warn-500'] };

export function Toast({ tone = 'success', title, message, onClose }) {
  const t = TOAST[tone] || TOAST.info;
  return (
    <div role="status" className="flex items-start gap-3 px-3.5 py-3 rounded-ds-lg bg-ink-900 text-white shadow-ds-lg max-w-[380px] w-full">
      <span className={cx('mt-px', t[1])}><Icon name={t[0]} size={18} strokeWidth={2} /></span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        {message && <div className="text-[13px] text-white/70 mt-0.5">{message}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="text-white/60 hover:text-white">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

// Toasts travel as a window event so any component can raise one, even pages that render
// the admin shell (and its ToastProvider) as their own child.
const TOAST_EVENT = 'admin-ui:toast';

/** Raise a toast from anywhere: toast({ tone, title, message, duration }). */
export const toast = (t) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: t }));

/** Rendered once by the admin shell. Toasts auto-dismiss after 4s. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t) => {
      const id = ++seq.current;
      setItems((xs) => [...xs, { ...t, id }]);
      setTimeout(() => dismiss(id), t.duration || 4000);
    },
    [dismiss]
  );
  useEffect(() => {
    const on = (e) => push(e.detail || {});
    window.addEventListener(TOAST_EVENT, on);
    return () => window.removeEventListener(TOAST_EVENT, on);
  }, [push]);
  return (
    <>
      {children}
      <div className="fixed z-[110] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 flex flex-col gap-2 items-center sm:items-end w-[calc(100%-32px)] sm:w-auto pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-[380px]">
            <Toast {...t} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </>
  );
}

/** Hook form of `toast`, for symmetry with other hooks. */
export const useToast = () => toast;

export function Tooltip({ label, children, placement = 'top' }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={cx(
          'absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-[9px] py-1 rounded-full bg-ink-900 text-white text-[11px] font-semibold z-50 pointer-events-none',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-[120ms]',
          placement === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'
        )}
      >
        {label}
      </span>
    </span>
  );
}
