import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function CCPLNavbar({ activePage = 'overview' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const accentColor = '#ee3a24';
  const accentColorDark = '#c41e0a';

  const navLinks = [
    { key: 'overview', label: 'Overview', href: '/ccpl-home', active: activePage === 'overview' },
    { key: 'teams', label: 'Teams', href: '/ccpl-teams', active: activePage === 'teams' },
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  const handleLogout = () => {
    // Clear user data from storage
    localStorage.removeItem('ccpl-user');
    sessionStorage.removeItem('ccpl-user');
    setIsLoggedIn(false);
    setUserData(null);
    navigate('/ccpl-login');
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      handleLogout();
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

  return (
    <>
      <style>{`
        .cc-nav-link {
          position: relative;
          text-decoration: none;
        }

        .cc-nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 100%;
          height: 2px;
          background: ${accentColor};
          transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cc-nav-link:hover::after {
          right: 0;
        }
      `}</style>

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0b0b0c', borderBottom: '1px solid rgba(255,255,255,0.14)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '0 5vw' : '0 6vw', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Montserrat', sans-serif", height: isMobile ? '72px' : '96px', gap: isMobile ? '16px' : '56px' }}>
          <Link to="/ccpl-home" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}>
            <img src="/images/ccpl-logo-white.png" alt="Centre Court" style={{ height: isMobile ? '48px' : '64px', width: 'auto', display: 'block' }} />
          </Link>

          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '36px', flex: 1 }}>
                {navLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.href}
                    className="cc-nav-link"
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: link.active ? '#fff' : 'rgba(255,255,255,0.6)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <button
                onClick={handleAuthClick}
                style={{
                  padding: '11px 22px',
                  background: isLoggedIn ? 'transparent' : `linear-gradient(180deg, ${accentColor}, ${accentColorDark})`,
                  border: isLoggedIn ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  color: '#fff',
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (isLoggedIn) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  } else {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isLoggedIn) {
                    e.currentTarget.style.background = 'transparent';
                  } else {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </>
          )}

          {isMobile && (
            <>
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}
                aria-label="Menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && mobileMenuOpen && (
          <div style={{ background: '#0b0b0c', borderTop: '1px solid rgba(255,255,255,0.14)', padding: '20px 5vw' }}>
            {navLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 0',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: link.active ? '#fff' : 'rgba(255,255,255,0.6)',
                  textDecoration: 'none',
                  borderBottom: idx < navLinks.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none'
                }}
              >
                {link.label}
              </Link>
            ))}

            <button
              onClick={() => {
                handleAuthClick();
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '16px',
                padding: '11px 22px',
                background: isLoggedIn ? 'transparent' : `linear-gradient(180deg, ${accentColor}, ${accentColorDark})`,
                border: isLoggedIn ? '1px solid rgba(255,255,255,0.3)' : 'none',
                color: '#fff',
                fontSize: '12px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              {isLoggedIn ? 'Logout' : 'Login'}
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
