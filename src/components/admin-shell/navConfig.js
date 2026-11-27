// Sidebar navigation, grouped per the redesign (League / Commerce / Admin).
// Role menus mirror the previous Sidebar.jsx so nobody gains or loses access.

export function getNavGroups({ superAdmin, teamAdmin, tournamentId }) {
  if (superAdmin) {
    return [
      {
        title: 'League',
        items: [
          { icon: 'home', label: 'Dashboard', to: '/admin', exact: true },
          { icon: 'trophy', label: 'My Tournaments', to: '/admin/tournaments' },
          { icon: 'users', label: 'Players', to: '/admin/players' },
          { icon: 'building', label: 'Clubs', to: '/admin/clubs' },
          { icon: 'edit', label: 'Draft', to: '/admin/draft' },
          { icon: 'star', label: 'Fantasy', to: '/admin/fantasy' },
        ],
      },
      {
        title: 'Commerce',
        items: [
          { icon: 'bag', label: 'Shop', to: '/admin/shop' },
          { icon: 'ticket', label: 'Ticketing', to: '/admin/ticketing' },
          { icon: 'store', label: 'Vendors', to: '/admin/vendors' },
        ],
      },
      {
        title: 'Admin',
        items: [
          { icon: 'video', label: 'Content', to: '/admin/content' },
          { icon: 'briefcase', label: 'Careers', to: '/admin/careers' },
          { icon: 'shield', label: 'Super Admins', to: '/admin/super-admins' },
          { icon: 'phone', label: 'App Users', to: '/admin/app-users' },
          { icon: 'sliders', label: 'App Settings', to: '/admin/app-settings' },
          { icon: 'settings', label: 'Settings', to: '/admin/settings' },
        ],
      },
    ];
  }

  if (teamAdmin) {
    return [
      {
        title: 'League',
        items: [
          { icon: 'calendar', label: 'Fixtures', to: tournamentId ? `/admin/tournaments/${tournamentId}/fixtures` : '/admin' },
          { icon: 'users', label: 'Players', to: tournamentId ? `/admin/tournaments/${tournamentId}/players` : '/admin/players' },
          { icon: 'edit', label: 'Draft', to: '/admin/draft' },
          { icon: 'star', label: 'Fantasy', to: '/admin/fantasy' },
        ],
      },
      {
        title: 'Admin',
        items: [
          { icon: 'sliders', label: 'App Settings', to: '/admin/app-settings' },
          { icon: 'settings', label: 'Settings', to: '/admin/settings' },
        ],
      },
    ];
  }

  return [];
}

/** The nav item whose path is the longest prefix of `pathname` (exact items match only themselves). */
export function findActive(groups, pathname) {
  let best = null;
  for (const g of groups) {
    for (const it of g.items) {
      const match = it.exact ? pathname === it.to || pathname === `${it.to}/` : pathname === it.to || pathname.startsWith(`${it.to}/`);
      if (match && (!best || it.to.length > best.to.length)) best = it;
    }
  }
  return best;
}
