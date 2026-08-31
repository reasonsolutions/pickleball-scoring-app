import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';

export default function CcplTeams() {
  const [isMobile, setIsMobile] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accentColor = '#ee3a24';

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 860);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active tournament ID from app-settings
        const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
        const appSettingsDoc = await getDoc(appSettingsRef);

        if (!appSettingsDoc.exists() || !appSettingsDoc.data().activeTournamentId) {
          setError('No active tournament found in app settings');
          setLoading(false);
          return;
        }

        const activeTournamentId = appSettingsDoc.data().activeTournamentId;

        // Fetch teams for the active tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', activeTournamentId)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map((doc, index) => {
          const data = doc.data();
          // Optimize Cloudinary URLs
          let logoUrl = data.logo?.url || null;
          if (logoUrl && logoUrl.includes('cloudinary.com')) {
            logoUrl = logoUrl.replace('/upload/', '/upload/q_auto/');
          }
          
          return {
            id: doc.id,
            slug: doc.id,
            name: data.name || 'Unnamed Team',
            tag: data.venue || 'Franchise',
            num: String(index + 1).padStart(2, '0'),
            logo: logoUrl,
            playerCount: data.playerIds?.length || 0,
            venue: data.venue || '',
            description: data.description || ''
          };
        });

        setTeams(teamsData);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const sectionPadding = isMobile ? '32px 6vw 56px' : '56px 6vw 88px';
  const topMetaMargin = isMobile ? '36px' : '52px';
  const headerGridCols = isMobile ? '1fr' : '1fr 340px';
  const headerMargin = isMobile ? '36px' : '64px';
  const introMaxWidth = isMobile ? '100%' : '340px';
  const gridCols = isMobile ? '1fr 1fr' : 'repeat(4, 1fr)';
  const gridGap = isMobile ? '14px' : '22px';
  const cardPadding = isMobile ? '32px 16px 26px' : '44px 24px 32px';
  const logoSize = isMobile ? '78px' : '110px';
  const footerMargin = isMobile ? '44px' : '64px';

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-black.ttf') format('truetype');
          font-weight: 900;
          font-style: normal;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-black-italic.ttf') format('truetype');
          font-weight: 900;
          font-style: italic;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        
        body {
          margin: 0;
          background: #0b0b0c;
        }
        
        a {
          color: ${accentColor};
        }
        
        a:hover {
          color: #ffffff;
        }
        
        ::selection {
          background: ${accentColor};
          color: #0b0b0c;
        }
        
        @keyframes cc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        
        @keyframes cc-fade-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes cc-line-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        
        .cc-in {
          opacity: 0;
          animation: cc-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .cc-team {
          transition: border-color 0.3s ease, background 0.3s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .cc-team:hover {
          border-color: rgba(255, 255, 255, 0.5) !important;
          background: #121213 !important;
          transform: translateY(-5px);
        }
        
        .cc-team:hover .cc-team-name {
          color: ${accentColor} !important;
        }
        
        .cc-team:hover .cc-arrow {
          transform: translateX(5px);
          opacity: 1 !important;
        }
        
        .cc-arrow {
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
      `}</style>

      <CCPLNavbar activePage="teams" />

      <section style={{
        position: 'relative',
        background: '#0b0b0c',
        color: '#fff',
        fontFamily: "'Montserrat', sans-serif",
        padding: sectionPadding,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Decorative lines */}
        <div style={{
          position: 'absolute',
          top: '32px',
          left: '6vw',
          right: '6vw',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 75%)',
          transformOrigin: 'left',
          animation: 'cc-line-grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '26px',
          left: '6vw',
          width: '1px',
          height: '13px',
          background: '#fff'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '26px',
          right: '6vw',
          width: '1px',
          height: '13px',
          background: '#fff'
        }}></div>

        {/* Top meta */}
        <div className="cc-in" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: topMetaMargin,
          animationDelay: '0.05s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: accentColor,
              animation: 'cc-pulse 2s ease-in-out infinite'
            }}></div>
            <span style={{
              fontSize: '12px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)'
            }}>CCPL Hyderabad / Season 2</span>
          </div>
          <span style={{
            fontSize: '12px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)'
          }}>{teams.length} {teams.length === 1 ? 'Franchise' : 'Franchises'}</span>
        </div>

        {/* Header */}
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: headerGridCols,
          alignItems: 'end',
          gap: '20px',
          marginBottom: headerMargin
        }}>
          <h1 style={{
            fontFamily: "'Zuume Cut', sans-serif",
            fontWeight: 500,
            fontSize: 'clamp(52px, 8vw, 132px)',
            lineHeight: '0.86',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            The<br />Franchises.
          </h1>
          <p className="cc-in" style={{
            margin: 0,
            maxWidth: introMaxWidth,
            fontSize: '16px',
            lineHeight: '1.65',
            color: 'rgba(255,255,255,0.6)',
            animationDelay: '0.3s'
          }}>
            {loading ? 'Loading franchises...' : error ? error : `${teams.length} franchises. One round robin, seven matchdays, every squad on court each week. Pick a badge to see its roster.`}
          </p>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '16px'
          }}>
            Loading teams...
          </div>
        ) : error ? (
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            color: accentColor,
            fontSize: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        ) : teams.length === 0 ? (
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '16px'
          }}>
            No teams found for the active tournament
          </div>
        ) : (
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap: gridGap
          }}>
            {teams.map((team, i) => (
              <Link
                key={team.slug}
                to={`/ccpl-teams/${team.slug}`}
                className="cc-team cc-in"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '20px',
                  padding: cardPadding,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: '#0e0e0f',
                  textDecoration: 'none',
                  color: '#fff',
                  animationDelay: `${0.4 + i * 0.06}s`
                }}
              >
                {/* Corner decoration */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  width: '12px',
                  height: '12px',
                  borderTop: '2px solid rgba(255,255,255,0.35)',
                  borderLeft: '2px solid rgba(255,255,255,0.35)'
                }}></div>
                
                {/* Team number */}
                <span style={{
                  position: 'absolute',
                  top: '14px',
                  right: '16px',
                  fontFamily: "'Zuume Cut', sans-serif",
                  fontWeight: 500,
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.3)'
                }}>{team.num}</span>

                {/* Logo */}
                <div style={{
                  width: logoSize,
                  height: logoSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: team.logo ? 'none' : '1px dashed rgba(255,255,255,0.2)',
                  overflow: 'hidden'
                }}>
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={`${team.name} logo`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <span style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>Logo</span>
                  )}
                </div>

                {/* Team info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'center'
                }}>
                  <span className="cc-team-name" style={{
                    fontFamily: "'Zuume Cut', sans-serif",
                    fontWeight: 500,
                    fontSize: '26px',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    color: '#fff',
                    transition: 'color 0.3s ease'
                  }}>{team.name}</span>
                  <span style={{
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)'
                  }}>{team.venue || team.tag}</span>
                </div>

                {/* View team arrow */}
                <span className="cc-arrow" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: accentColor,
                  opacity: 0.55
                }}>
                  View team <span style={{ fontSize: '14px' }}>→</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="cc-in" style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: footerMargin,
          animationDelay: '0.9s'
        }}>
          <span style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)'
          }}>Every player represents more than themselves.</span>
          <Link to="/ccpl-signup" style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'underline'
          }}>Enter the auction pool</Link>
        </div>
      </section>
      <CCPLFooter />
    </>
  );
}
