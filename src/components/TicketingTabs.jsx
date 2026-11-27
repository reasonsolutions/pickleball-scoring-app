import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin/ticketing', label: 'Match Days', end: true },
  { to: '/admin/ticketing/analysis', label: 'Analysis' },
];

// Top-level switch between the match day list and the season-wide analysis
export default function TicketingTabs() {
  return (
    <nav className="mb-6 inline-flex rounded-xl bg-gray-100 p-1" aria-label="Ticketing sections">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
