import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import hplLogo from '../assets/hpl_logo.png';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  return (
    <div className="navbar bg-base-100 shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path>
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><a href="/admin">Dashboard</a></li>
            <li><a href="/admin/tournaments">My Tournaments</a></li>
          </ul>
        </div>
        <a className="btn btn-ghost text-xl font-bold text-primary" href="/admin" style={{ color: 'var(--primary-green)' }}>
          <img src={hplLogo} alt="HPL Logo" style={{ height: '6rem', width: 'auto' }} />
        </a>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a href="/admin" className="btn btn-ghost hover:bg-primary hover:bg-opacity-10">Dashboard</a></li>
          <li><a href="/admin/tournaments" className="btn btn-ghost hover:bg-primary hover:bg-opacity-10">My Tournaments</a></li>
        </ul>
      </div>

      <div className="navbar-end">
        {currentUser && (
          <>
            <div className="mr-4">
              <ThemeToggle />
            </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                {currentUser.photoURL ? (
                  <img alt="Profile" src={currentUser.photoURL} />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: 'var(--primary-green)', color: 'var(--text-primary)' }}
                  >
                    {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li className="menu-title">
                <span style={{ color: 'var(--text-primary)' }}>{currentUser.displayName || 'User'}</span>
              </li>
              <li><a style={{ color: 'var(--text-secondary)' }}>{currentUser.email}</a></li>
              <li><hr /></li>
              <li><a onClick={handleLogout} className="hover:bg-primary hover:bg-opacity-10">Logout</a></li>
            </ul>
          </div>
          </>
        )}
      </div>
    </div>
  );
}