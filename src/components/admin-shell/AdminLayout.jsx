import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, IconButton, NavGroup, NavItem, ToastProvider, cx } from '../admin-ui';
import TournamentSwitcher from './TournamentSwitcher';
import { findActive, getNavGroups } from './navConfig';
import logoMark from '../../assets/admin/logo-mark.png';

function Lockup() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 px-1.5">
      <img src={logoMark} alt="" className="w-10 h-8 object-contain shrink-0" />
      <span className="flex flex-col leading-[1.1] min-w-0">
        <span className="font-extrabold text-lg tracking-[-0.01em] text-ink-900">Centre Court</span>
        <span className="text-[11px] font-semibold text-ink-500 tracking-[0.04em] uppercase">Pickleball League · HYD</span>
      </span>
    </Link>
  );
}

function SidebarContent({ groups, active, onNavigate, onClose }) {
  const { currentUser, isSuperAdmin, isTeamAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const name = currentUser?.displayName || currentUser?.email || 'Admin';
  const role = isSuperAdmin() ? 'Super Admin' : isTeamAdmin() ? 'Team Admin' : 'Admin';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 h-full px-4 py-[22px]">
      <div className="flex items-center justify-between gap-2">
        <Lockup />
        {onClose && <IconButton icon="close" label="Close menu" variant="ghost" size="sm" onClick={onClose} />}
      </div>

      <TournamentSwitcher onNavigate={onNavigate} />

      <nav aria-label="Admin" className="flex flex-col gap-3.5 flex-1">
        {groups.map((g) => (
          <NavGroup key={g.title} title={g.title}>
            {g.items.map((it) => (
              <NavItem key={it.to + it.label} as={Link} to={it.to} icon={it.icon} label={it.label} active={active === it} onClick={onNavigate} />
            ))}
          </NavGroup>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 p-3 rounded-ds-lg bg-white border border-line-200">
        <Avatar name={name} size={34} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-ink-900 truncate">{name}</div>
          <div className="text-xs text-ink-500">{role}</div>
        </div>
        <IconButton icon="logout" label="Log out" variant="ghost" size="sm" onClick={handleLogout} className="text-ink-500" />
      </div>
    </div>
  );
}

/**
 * Courtside admin shell: fixed 264px sidebar ≥1024px; sticky top bar + drawer below.
 * Everything inside is scoped by `.admin-app` (tokens + Urbanist).
 */
export default function AdminLayout({ children }) {
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);

  const groups = useMemo(
    () => getNavGroups({ superAdmin: isSuperAdmin(), teamAdmin: isTeamAdmin(), tournamentId: currentUser?.tournamentId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  );
  const active = findActive(groups, pathname);

  // Close the drawer on navigation and lock body scroll while it is open.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [drawer]);

  return (
    <ToastProvider>
      <div className="admin-app flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0 overflow-y-auto border-r border-line-200">
          <SidebarContent groups={groups} active={active} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-paper-100 border-b border-line-200">
            <IconButton icon="menu" label="Open menu" variant="ghost" size="lg" onClick={() => setDrawer(true)} className="-ml-2" />
            <img src={logoMark} alt="Centre Court" className="w-8 h-[26px] object-contain" />
            <span className="font-bold text-base text-ink-900 truncate">{active?.label || 'Admin'}</span>
          </header>

          <main className="flex-1 min-w-0">{children}</main>
        </div>

        {/* Mobile drawer */}
        <div className={cx('lg:hidden fixed inset-0 z-50', drawer ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!drawer}>
          <div
            className={cx('absolute inset-0 transition-opacity duration-[180ms] ease-ds', drawer ? 'opacity-100' : 'opacity-0')}
            style={{ background: 'var(--scrim)' }}
            onClick={() => setDrawer(false)}
          />
          <aside
            className={cx(
              'absolute inset-y-0 left-0 w-[min(300px,86vw)] bg-paper-100 overflow-y-auto shadow-ds-lg transition-transform duration-[180ms] ease-ds',
              drawer ? 'translate-x-0' : '-translate-x-full'
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            {drawer && <SidebarContent groups={groups} active={active} onNavigate={() => setDrawer(false)} onClose={() => setDrawer(false)} />}
          </aside>
        </div>
      </div>
    </ToastProvider>
  );
}
