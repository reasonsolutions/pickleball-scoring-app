import React from 'react';
import { Link } from 'react-router-dom';
import hplLogo from '../assets/hpllogo.png';

export default function LeagueNavbar() {
  return (
    <nav className="league-navbar">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src={hplLogo} 
                alt="Hyderabad Pickleball League" 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/news" className="nav-link">
              News
            </Link>
            <Link to="/results" className="nav-link">
              Results
            </Link>
            <Link to="/rankings" className="nav-link">
              Rankings
            </Link>
          </div>

          {/* Right Side - Login */}
          <div className="flex items-center space-x-4">
            {/* User Icon with Log In */}
            <Link to="/login" className="flex items-center space-x-2 text-white hover:text-orange-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Log In</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white hover:text-orange-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}