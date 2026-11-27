import React from 'react';
import { Link } from 'react-router-dom';
import terminusLogo from '../assets/terminus_ccpl.png';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';

// `above` is the colour of the section sitting on top of the footer; it shows through the angled top edge.
export default function CCPLFooter({ above = INK }) {
  const columns = [
    {
      title: 'League',
      links: [
        { label: 'Overview', href: '/ccpl-home' },
        { label: 'Teams', href: '/ccpl-teams' },
        { label: 'Fixtures', href: '/ccpl-fixtures' },
        { label: 'News', href: '/news' },
        { label: 'Videos', href: '/videos' },
      ],
    },
    {
      title: 'Centre Court',
      links: [
        { label: 'Careers', href: '/careers' },
        { label: 'Support', href: '/support' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Register', href: '/ccpl-signup' },
        { label: 'Log In', href: '/ccpl-login' },
      ],
    },
  ];

  const policies = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Code of Conduct', href: '#' },
  ];

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    // -1px overlap hides the sub-pixel seam against the section above
    <div style={{ position: 'relative', marginTop: '-1px', background: above, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        .cc-footer-link { transition: color 0.2s ease; }
        .cc-footer-link:hover { color: #fff !important; }
      `}</style>

      <footer style={{ position: 'relative', background: ORANGE, color: INK, padding: 'calc(5vw + 56px) 6vw 0', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '40px 32px', alignItems: 'start' }}>
            <Link to="/ccpl-home" style={{ display: 'block', width: 'fit-content' }}>
              <img src={terminusLogo} alt="Centre Court" style={{ width: '140px', height: 'auto', display: 'block', filter: 'brightness(0)' }} />
            </Link>
            {columns.map((col) => (
              <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', borderBottom: `2px solid ${INK}`, paddingBottom: '8px', marginBottom: '4px' }}>
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="cc-footer-link"
                    style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '16px', lineHeight: 1.3, color: INK, textDecoration: 'none', width: 'fit-content' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div aria-hidden="true" style={{ marginTop: 'clamp(48px,7vw,90px)', fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(72px,17vw,280px)', lineHeight: 0.78, letterSpacing: '-.01em', whiteSpace: 'nowrap', marginLeft: '-.03em', marginBottom: '-.05em' }}>
            Centre Court
          </div>
        </div>

        <div style={{ background: INK, color: '#fff', margin: '0 -6vw' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '18px 6vw', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px 28px', boxSizing: 'border-box' }}>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, letterSpacing: '.04em', color: 'rgba(255,255,255,0.72)' }}>
              &copy; 2026 Centre Court Sports &amp; Entertainment. All Rights Reserved. &mdash; More Than Sport.
            </p>
            <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 24px' }}>
              {policies.map((policy) => (
                <Link
                  key={policy.label}
                  to={policy.href}
                  className="cc-footer-link"
                  style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}
                >
                  {policy.label}
                </Link>
              ))}
              <a
                href="#"
                onClick={scrollToTop}
                className="cc-footer-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: ORANGE, textDecoration: 'none' }}
              >
                Back to top
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M12 20V5M5 12l7-7 7 7" /></svg>
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
