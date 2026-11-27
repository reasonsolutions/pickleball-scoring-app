import React, { useEffect, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, cx } from '../admin-ui';

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

/** "Oct 16 – Dec 20, 2026" (year shown once when both dates share it). */
export function formatRange(start, end) {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || Number.isNaN(s.getTime())) return '';
  const md = { month: 'short', day: 'numeric' };
  if (!e || Number.isNaN(e.getTime())) return s.toLocaleDateString('en-US', { ...md, year: 'numeric' });
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString('en-US', sameYear ? md : { ...md, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...md, year: 'numeric' })}`;
}

/**
 * Sidebar tournament switcher. Super admins pick from all tournaments (navigates to the
 * tournament's page); team admins see their own tournament only.
 */
export default function TournamentSwitcher({ onNavigate }) {
  const { currentUser, isSuperAdmin, isTeamAdmin, getAllTournaments } = useAuth();
  const navigate = useNavigate();
  const match = useMatch('/admin/tournaments/:id/*');
  const routeId = match?.params?.id && match.params.id !== 'create' ? match.params.id : null;
  const [tournaments, setTournaments] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const superAdmin = isSuperAdmin();
  const teamAdmin = isTeamAdmin();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (superAdmin) {
          const all = await getAllTournaments();
          if (alive) setTournaments(all);
        } else if (teamAdmin && currentUser?.tournamentId) {
          const snap = await getDoc(doc(db, 'tournaments', currentUser.tournamentId));
          if (alive && snap.exists()) setTournaments([{ id: snap.id, ...snap.data() }]);
        }
      } catch (err) {
        console.error('Tournament switcher: failed to load tournaments', err);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [superAdmin, teamAdmin, currentUser?.tournamentId]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (tournaments.length === 0) return null;

  const current = tournaments.find((t) => t.id === routeId) || tournaments[0];
  const canSwitch = superAdmin && tournaments.length > 1;

  const go = (t) => {
    setOpen(false);
    onNavigate?.();
    navigate(`/admin/tournaments/${t.id}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (canSwitch ? setOpen((o) => !o) : go(current))}
        aria-haspopup={canSwitch ? 'listbox' : undefined}
        aria-expanded={canSwitch ? open : undefined}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-ds-md border border-line-200 bg-paper-200 text-left hover:bg-paper-300 transition-colors duration-[120ms] ease-ds"
      >
        <span className="w-7 h-7 rounded-lg bg-white inline-flex items-center justify-center shrink-0 text-ink-900">
          <Icon name="trophy" size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px] text-ink-900 truncate">{current.name || 'Untitled tournament'}</span>
          <span className="block text-xs text-ink-500 truncate">{formatRange(current.startDate, current.endDate) || 'Tournament'}</span>
        </span>
        {canSwitch && <Icon name="chevronUpDown" size={16} className="text-ink-500" />}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Switch tournament"
          className="absolute z-40 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-ds-md bg-white border border-line-200 shadow-ds-md p-1"
        >
          {tournaments.map((t) => {
            const on = t.id === current.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => go(t)}
                  className={cx('w-full flex items-center gap-2 px-2.5 py-2 rounded-ds-sm text-left hover:bg-paper-100', on && 'bg-paper-50')}
                >
                  <span className="flex-1 min-w-0">
                    <span className={cx('block text-sm truncate', on ? 'font-bold text-ink-900' : 'font-semibold text-ink-900')}>{t.name || 'Untitled tournament'}</span>
                    <span className="block text-xs text-ink-500 truncate">{formatRange(t.startDate, t.endDate)}</span>
                  </span>
                  {on && <Icon name="check" size={16} className="text-brand-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
