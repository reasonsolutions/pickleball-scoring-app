import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import terminusLogo from '../assets/terminus_ccpl.png';

// onLoginClick: optional — when a page passes it, Login opens that page's pop-up instead of
// navigating to /ccpl-login, and Logout keeps the user on the page.
export default function CCPLNavbar({ activePage = 'overview', onLoginClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Hamburger below 1100px: the seven desktop links don't fit alongside the logo and Login under that.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1100);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1280);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const accentColor = '#e27b46';
  const ink = '#0b0b0c';

  const navLinks = [
    { key: 'overview', label: 'Overview', href: '/ccpl-home', active: activePage === 'overview' },
    { key: 'teams', label: 'Teams', href: '/ccpl-teams', active: activePage === 'teams' },
    { key: 'fixtures', label: 'Fixtures', href: '/ccpl-fixtures', active: activePage === 'fixtures' },
    { key: 'rankings', label: 'Rankings', href: '/rankings', active: activePage === 'rankings' },
    { key: 'fantasy', label: 'Fantasy', href: '/ccplfantasy', active: activePage === 'fantasy' },
    { key: 'passes', label: 'Passes', href: '/ccpl-passes', active: activePage === 'passes' },
    { key: 'careers', label: 'Careers', href: '/careers', active: activePage === 'careers' },
  ];

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1100;
      setIsMobile(mobile);
      setIsCompact(window.innerWidth < 1280);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock page scroll while the full-screen mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = () => {
      const loggedInUser = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
      if (loggedInUser) {
        try {
          const parsedUser = JSON.parse(loggedInUser);
          setUserData(parsedUser);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          setIsLoggedIn(false);
          setUserData(null);
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    };

    checkLoginStatus();

    // Listen for storage changes (in case user logs in/out in another tab)
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('ccpl-auth-change', checkLoginStatus);
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('ccpl-auth-change', checkLoginStatus);
    };
  }, []);

  const handleLogout = () => {
    // Clear user data from storage
    localStorage.removeItem('ccpl-user');
    sessionStorage.removeItem('ccpl-user');
    setIsLoggedIn(false);
    setUserData(null);
    window.dispatchEvent(new Event('ccpl-auth-change'));
    if (!onLoginClick) navigate('/ccpl-login');
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      handleLogout();
    } else if (onLoginClick) {
      setMobileMenuOpen(false);
      onLoginClick();
    } else {
      navigate('/ccpl-login');
    }
  };

  const getProfileRoute = () => {
    if (!userData) return '/ccpl-signup';

    // Check user type and route accordingly
    if (userData.type === 'player') {
      return `/ccpl-profile/${userData.userId || userData.id}`;
    } else if (userData.type === 'team admin') {
      return `/ccpl-teamprofile/${userData.teamId}`;
    }

    // Default to signup if type is unknown
    return '/ccpl-signup';
  };

  const authLabel = isLoggedIn ? 'Logout' : 'Login';

  return (
    <>
      <style>{`
        .cc-nav-link {
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .cc-nav-link:hover {
          color: #fff !important;
          border-color: ${accentColor} !important;
        }

        .cc-auth-btn {
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }

        .cc-auth-btn:hover {
          background: #fff !important;
          color: ${ink} !important;
          box-shadow: none !important;
        }
      `}</style>

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: ink, borderBottom: `3px solid ${accentColor}`, boxSizing: 'border-box', fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', padding: '0 6vw', maxWidth: '1600px', margin: '0 auto', height: isMobile ? '64px' : '88px', gap: '24px', boxSizing: 'border-box' }}>
          <Link to="/ccpl-home" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}>
            <img src={terminusLogo} alt="Centre Court" style={{ height: isMobile ? '52px' : '74px', width: 'auto', display: 'block', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.5))' }} />
          </Link>

          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px', flex: 1, justifyContent: 'center' }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    to={link.href}
                    className="cc-nav-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: isCompact ? '0 11px' : '0 18px',
                      marginBottom: '-3px',
                      fontFamily: "'Zuume Cut', sans-serif",
                      fontWeight: 700,
                      fontStyle: 'italic',
                      fontSize: '24px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      color: link.active ? '#fff' : 'rgba(255,255,255,0.72)',
                      borderBottom: `4px solid ${link.active ? accentColor : 'transparent'}`
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={handleAuthClick}
                  className="cc-auth-btn"
                  style={{
                    display: 'inline-flex',
                    transform: 'skewX(-14deg)',
                    padding: '12px 26px',
                    border: 'none',
                    background: isLoggedIn ? 'transparent' : accentColor,
                    color: isLoggedIn ? '#fff' : ink,
                    boxShadow: isLoggedIn ? `inset 0 0 0 2px ${accentColor}` : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', transform: 'skewX(14deg)', fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {authLabel}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </div>
            </>
          )}

          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  handleAuthClick();
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  transform: 'skewX(-14deg)',
                  padding: '10px 16px',
                  border: 'none',
                  background: isLoggedIn ? 'transparent' : accentColor,
                  color: isLoggedIn ? '#fff' : ink,
                  boxShadow: isLoggedIn ? `inset 0 0 0 2px ${accentColor}` : 'none',
                  cursor: 'pointer'
                }}
              >
                <span style={{ transform: 'skewX(14deg)', fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {authLabel}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
                style={{ width: '48px', height: '44px', border: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', padding: 0, clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}
              >
                <span style={{ display: 'block', width: '22px', height: '3px', background: ink, transition: 'transform .3s ease', transform: mobileMenuOpen ? 'translateY(8px) rotate(45deg)' : 'none' }}></span>
                <span style={{ display: 'block', width: '22px', height: '3px', background: ink, transition: 'opacity .3s ease', opacity: mobileMenuOpen ? 0 : 1 }}></span>
                <span style={{ display: 'block', width: '22px', height: '3px', background: ink, transition: 'transform .3s ease', transform: mobileMenuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none' }}></span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              height: 'calc(100vh - 64px)',
              background: ink,
              display: 'flex',
              flexDirection: 'column',
              padding: '28px 6vw 40px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              transition: 'clip-path .55s cubic-bezier(.7,0,.2,1)',
              clipPath: mobileMenuOpen ? 'polygon(0 0,100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,100% 0,0 0)',
              pointerEvents: mobileMenuOpen ? 'auto' : 'none'
            }}
            aria-hidden={!mobileMenuOpen}
          >
            {navLinks.map((link, idx) => (
              <Link
                key={link.key}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={mobileMenuOpen ? 0 : -1}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: '1px solid #232324',
                  fontFamily: "'Zuume Cut', sans-serif",
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '52px',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: link.active ? '#fff' : 'rgba(255,255,255,0.72)'
                }}
              >
                <span style={{ fontSize: '18px', color: accentColor }}>{String(idx + 1).padStart(2, '0')}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
