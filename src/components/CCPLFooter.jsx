import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CCPLFooter() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 860
  );

  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 860;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const policies = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Code of Conduct', href: '#' },
  ];

  const footerStyles = {
    background: '#0a0f1e',
    fontFamily: "'Montserrat', sans-serif",
    padding: isMobile ? '30px 6vw 34px' : '38px 6vw 42px',
    boxSizing: 'border-box',
    borderTop: '1px solid rgba(255,255,255,0.09)',
  };

  const containerStyles = {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '22px',
  };

  const logoStyles = {
    height: isMobile ? '50px' : '70px',
    width: 'auto',
    display: 'block',
    opacity: 0.85,
  };

  const contentBlockStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    alignItems: isMobile ? 'flex-start' : 'flex-end',
  };

  const navStyles = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: isMobile ? '14px 18px' : '26px',
    justifyContent: isMobile ? 'flex-start' : 'flex-end',
  };

  const linkStyles = {
    fontSize: isMobile ? '10.5px' : '11.5px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  };

  const copyrightStyles = {
    margin: 0,
    fontSize: isMobile ? '10.5px' : '11.5px',
    lineHeight: 1.7,
    letterSpacing: '0.04em',
    color: 'rgba(255,255,255,0.42)',
    textAlign: isMobile ? 'left' : 'right',
  };

  return (
    <footer style={footerStyles}>
      <div style={containerStyles}>
        <img 
          src="/ccpl-logo-white.png" 
          alt="Centre Court" 
          style={logoStyles}
        />
        <div style={contentBlockStyles}>
          <nav style={navStyles}>
            {policies.map((policy, index) => (
              <Link
                key={index}
                to={policy.href}
                style={linkStyles}
                onMouseEnter={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.85)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                {policy.label}
              </Link>
            ))}
          </nav>
          <p style={copyrightStyles}>
            ©️ 2026 Centre Court Sports &amp; Entertainment. All Rights Reserved. — More Than Sport.
          </p>
        </div>
      </div>
    </footer>
  );
}
