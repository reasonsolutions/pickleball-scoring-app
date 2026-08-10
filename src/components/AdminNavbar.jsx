import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import hplLogo from '../assets/hpl_logo.png';

export default function AdminNavbar() {
  const { currentUser, logout, isSuperAdmin, isTeamAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Define menu items based on user role
  const getSuperAdminMenuItems = () => [
    { name: 'Dashboard', path: '/admin' },
    { name: 'My Tournaments', path: '/admin/tournaments' },
    { name: 'Clubs', path: '/admin/clubs' },
    { name: 'Super Admins', path: '/admin/super-admins' },
    { name: 'Draft', path: '/admin/draft' },
    { name: 'Content', path: '/admin/content' },
    { name: 'Settings', path: '/admin/settings' }
  ];

  const getTeamAdminMenuItems = () => [
    { name: 'Fixtures', path: currentUser?.tournamentId ? `/admin/tournaments/${currentUser.tournamentId}/fixtures` : '/admin' },
    { name: 'Players', path: currentUser?.tournamentId ? `/admin/tournaments/${currentUser.tournamentId}/players` : '/admin/players' },
    { name: 'Draft', path: '/admin/draft' },
    { name: 'Settings', path: '/admin/settings' }
  ];

  const getMenuItems = () => {
    if (isSuperAdmin()) {
      return getSuperAdminMenuItems();
    } else if (isTeamAdmin()) {
      return getTeamAdminMenuItems();
    }
    return [];
  };

  const menuItems = getMenuItems();

  return (
    <nav className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Hamburger Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex-1 flex justify-center">
          <img src={hplLogo} alt="HPL Logo" style={{ height: '2.5rem', width: 'auto' }} />
        </div>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
          {currentUser?.displayName?.charAt(0) || 'U'}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </button>
            ))}
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
