import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserAuth } from '../contexts/UserAuthContext';
import hplLogo from '../assets/hpllogo_white.png';

export default function NewHomeNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, logout: firebaseLogout } = useAuth();
  const { user, logout: userLogout, isLoggedIn, getUserType, getProfileUrl } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current page is an HPL Clubs related page
  const isHplClubsPage = () => {
    const hplClubsPaths = [
      '/hpl-clubs',
      '/hpl-club-rules',
      '/hpl-club-registration',
      '/hpl-player-registration'
    ];
    
    // Check exact paths and also club/player profile pages
    return hplClubsPaths.includes(location.pathname) ||
           location.pathname.startsWith('/club-profile/') ||
           location.pathname.startsWith('/player-profile/');
  };

  const handleLogout = async () => {
    try {
      // Logout from both contexts
      if (currentUser) {
        await firebaseLogout();
      }
      userLogout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleMyProfile = () => {
    const profileUrl = getProfileUrl();
    if (profileUrl) {
      navigate(profileUrl);
    }
  };

  const getProfileButtonText = () => {
    const userType = getUserType();
    return userType === 'player' ? 'My Player' : 'My Club';
  };
  
  return (
    <>
      {/* Top Navigation Header */}
      <div className="new-nav-header bg-gradient-to-r from-orange-500 to-red-800 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Left Side - Navigation Buttons */}
          <div className="flex space-x-0">
            <Link
              to="/new-home"
              className={`nav-button ${!isHplClubsPage() ? 'active bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-gray-800 hover:bg-gray-100'} px-3 sm:px-6 lg:px-8 py-2 sm:py-3 font-bold text-lg sm:text-xl lg:text-2xl transition-colors border-t-4 border-b-4 border-l-4 border-r-2 border-black`}
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              HPL
            </Link>
            <Link
              to="/hpl-clubs"
              className={`nav-button ${isHplClubsPage() ? 'active bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-gray-800 hover:bg-gray-100'} px-2 sm:px-4 lg:px-8 py-2 sm:py-3 font-bold text-lg sm:text-xl lg:text-2xl transition-colors border-t-4 border-b-4 border-l-2 border-r-4 border-black`}
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              <span className="hidden sm:inline" style={{fontFamily: 'Avantique, sans-serif'}}>HPL Clubs</span>
              <span className="sm:hidden" style={{fontFamily: 'Avantique, sans-serif'}}>Clubs</span>
            </Link>
          </div>

          {/* Right Side - Social Media Icons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <a
              href="https://www.instagram.com/hyderabadpickleballleague"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-header bg-orange-500 p-2 sm:p-3 rounded-full hover:bg-orange-600 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@centrecourtsports"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-header bg-orange-500 p-2 sm:p-3 rounded-full hover:bg-orange-600 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="new-home-navbar bg-gray-900 shadow-lg">
        <div className="max-w-full mx-auto px-8">
          <div className="flex items-center h-24">
          {/* Logo Section */}
          <div className="flex items-center mr-8">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src={hplLogo}
                alt="Hyderabad Pickleball League"
                className="h-20 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8 flex-1">
            <Link to="/news" className="new-nav-link">
              News
            </Link>
            <Link to="/results" className="new-nav-link schedule-results">
              Schedule & Results
            </Link>
            <Link to="/teams" className="new-nav-link">
              Teams
            </Link>
            <Link
              to="/hpl-clubs"
              className={`new-nav-link ${isHplClubsPage() ? 'hpl-clubs-active' : ''}`}
            >
              HPL Clubs
            </Link>
          </div>

          {/* Right Side - Authentication */}
          <div className="flex items-center space-x-4 ml-auto">
            {isLoggedIn() ? (
              <>
                <button onClick={handleMyProfile} className="new-login-btn">
                  {getProfileButtonText()}
                </button>
                <button onClick={handleLogout} className="new-logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/logins" className="new-login-btn">
                Log In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              className="text-white hover:text-orange-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 bg-opacity-95">
              <Link
                to="/news"
                className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                News
              </Link>
              <Link
                to="/results"
                className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Schedule & Results
              </Link>
              <Link
                to="/teams"
                className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Teams
              </Link>
              <Link
                to="/hpl-clubs"
                className={`block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree ${isHplClubsPage() ? 'hpl-clubs-active-mobile' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                HPL Clubs
              </Link>
              {isLoggedIn() ? (
                <>
                  <button
                    onClick={() => {
                      handleMyProfile();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree w-full text-left"
                  >
                    {getProfileButtonText()}
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree w-full text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/logins"
                  className="block px-3 py-2 text-white hover:text-orange-300 transition-colors font-figtree"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @font-face {
          font-family: 'Avantique';
          src: url('../assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
          font-weight: bold;
          font-style: normal;
        }
        
        .new-home-navbar {
          font-family: 'Avantique', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .new-nav-link {
          color: white;
          font-weight: bold;
          font-size: 18px;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.2s ease;
          font-family: 'Avantique', sans-serif;
        }
        
        @media (min-width: 640px) {
          .new-nav-link {
            font-size: 20px;
          }
        }
        
        @media (min-width: 1024px) {
          .new-nav-link {
            font-size: 24px;
          }
        }
        
        .new-nav-link:hover {
          color: #fb923c;
          background-color: rgba(251, 146, 60, 0.1);
        }
        
        .new-login-btn {
          display: flex;
          align-items: center;
          background-color: #ea580c;
          color: white;
          font-weight: bold;
          font-size: 18px;
          padding: 8px 16px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
          font-family: 'Avantique', sans-serif;
        }
        
        @media (min-width: 640px) {
          .new-login-btn {
            font-size: 20px;
          }
        }
        
        @media (min-width: 1024px) {
          .new-login-btn {
            font-size: 24px;
          }
        }
        
        .new-login-btn:hover {
          background-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
        }
        
        .new-logout-btn {
          display: flex;
          align-items: center;
          background-color: #6b7280;
          color: white;
          font-weight: bold;
          font-size: 18px;
          padding: 8px 16px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
          font-family: 'Avantique', sans-serif;
          border: none;
          cursor: pointer;
        }
        
        @media (min-width: 640px) {
          .new-logout-btn {
            font-size: 20px;
          }
        }
        
        @media (min-width: 1024px) {
          .new-logout-btn {
            font-size: 24px;
          }
        }
        
        .new-logout-btn:hover {
          background-color: #4b5563;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        }
        
        .hpl-clubs-active {
          color: #fb923c !important;
          background-color: rgba(251, 146, 60, 0.1) !important;
        }
        
        .hpl-clubs-active-mobile {
          color: #fb923c !important;
          background-color: rgba(251, 146, 60, 0.1) !important;
        }
      `}</style>
      </nav>
    </>
  );
}