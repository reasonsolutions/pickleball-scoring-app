import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';
import CCPLTopBar from '../components/CCPLTopBar';

const ZUUME = "'Zuume Cut', sans-serif";
const PAPER = '#f2f0ea';

export default function CcplTeams() {
  const [isMobile, setIsMobile] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accentColor = '#e27b46';
  const ink = '#0b0b0c';

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

  const headerGridCols = isMobile ? '1fr' : 'minmax(0,1fr) 360px';
  const introMaxWidth = isMobile ? '100%' : '360px';
  const gridCols = isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fill,minmax(240px,1fr))';
  const gridGap = isMobile ? '12px' : '20px';
  const cardPadding = isMobile ? '28px 14px 18px' : '48px 24px 28px';
  const logoSize = isMobile ? '76px' : '120px';
  const numSize = isMobile ? '84px' : '130px';
  const nameSize = isMobile ? '24px' : '34px';
  const namePadX = isMobile ? '14px' : '22px';

  const statusMessage = (text, color = '#5f5b52') => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '320px', color, fontSize: '16px', fontWeight: 600, textAlign: 'center' }}>
      {text}
    </div>
  );

  return (
    <>
      <style>{`
        .cc-teams-page ::selection { background: ${accentColor}; color: ${ink}; }
        /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
        .cc-teams-page span { font-family: inherit; }

        @keyframes cc-fade-up {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: none; }
        }
        .cc-in {
          opacity: 0;
          animation: cc-fade-up .8s cubic-bezier(.2,.7,.2,1) forwards;
        }

        /* Team card hover: card flips to ink, orange edge + bar */
        .cc-team { transition: background .3s ease, color .3s ease; }
        .cc-team:hover { background: ${ink} !important; color: #fff !important; }
        .cc-team .cc-team-num { transition: -webkit-text-stroke-color .3s ease, transform .5s cubic-bezier(.2,.7,.2,1); }
        .cc-team:hover .cc-team-num { -webkit-text-stroke-color: rgba(226,123,70,.55) !important; transform: translateX(-8px); }
        .cc-team .cc-team-edge { transition: transform .35s cubic-bezier(.2,.7,.2,1); transform-origin: top; transform: scaleY(0); }
        .cc-team:hover .cc-team-edge { transform: scaleY(1); }
        .cc-team .cc-team-logo { transition: transform .5s cubic-bezier(.2,.7,.2,1); }
        .cc-team:hover .cc-team-logo { transform: scale(1.06); }
        .cc-team .cc-team-sub { transition: color .3s ease; }
        .cc-team:hover .cc-team-sub { color: ${accentColor} !important; }
        .cc-team .cc-team-bar { transition: background .3s ease; }
        .cc-team:hover .cc-team-bar { background: ${accentColor} !important; }
        .cc-team .cc-arrow { transition: transform .3s ease; }
        .cc-team:hover .cc-arrow { transform: translateX(5px); }

        .cc-auction-btn { transition: background .2s ease, color .2s ease; }
        .cc-auction-btn:hover { background: ${accentColor} !important; color: ${ink} !important; }
      `}</style>

      <div className="cc-teams-page" style={{ background: ink, fontFamily: "'Montserrat', sans-serif" }}>
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="teams" />

        {/* ===== Header ===== */}
        <section style={{ position: 'relative', background: ink, color: '#fff', padding: 'clamp(56px,7vw,96px) 6vw calc(5vw + clamp(56px,7vw,96px))', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-1vw', bottom: '2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,32vw,520px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)' }}>
            {String(teams.length || 8).padStart(2, '0')}
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: accentColor, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>

          <div className="cc-in" style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: headerGridCols, alignItems: 'end', gap: '28px 48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={{ display: 'inline-flex', flex: 'none', transform: 'skewX(-14deg)', background: accentColor, padding: '8px 16px' }}>
                  <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: ink, whiteSpace: 'nowrap' }}>CCPL Hyderabad / Season 2</span>
                </span>
                {!loading && !error && (
                  <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                    {teams.length} {teams.length === 1 ? 'Franchise' : 'Franchises'}
                  </span>
                )}
              </div>
              <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,160px)', lineHeight: .84, letterSpacing: '-.01em' }}>
                The <span style={{ color: accentColor }}>Franchises.</span>
              </h1>
            </div>
            <p style={{ position: 'relative', margin: 0, maxWidth: introMaxWidth, fontSize: '16px', fontWeight: 500, lineHeight: 1.6, color: '#e8e8e8', borderLeft: `4px solid ${accentColor}`, paddingLeft: '16px', background: 'rgba(11,11,12,.6)' }}>
              {loading ? 'Loading franchises...' : error ? error : `${teams.length} franchises. One round robin, seven matchdays, every squad on court each week. Pick a badge to see its roster.`}
            </p>
          </div>
        </section>

        {/* ===== Franchise grid ===== */}
        <section style={{ position: 'relative', background: PAPER, color: ink, marginTop: '-5vw', padding: 'calc(5vw + clamp(40px,5vw,64px)) 6vw clamp(64px,8vw,110px)', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {loading ? statusMessage('Loading teams...')
              : error ? statusMessage(error, '#b3261a')
              : teams.length === 0 ? statusMessage('No teams found for the active tournament')
              : (
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: gridGap }}>
                  {teams.map((team, i) => (
                    <Link
                      key={team.slug}
                      to={`/ccpl-teams/${team.slug}`}
                      className="cc-team cc-in"
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${ink}`, textDecoration: 'none', background: '#fff', color: ink, animationDelay: `${(i % 4) * 0.08}s` }}
                    >
                      <span className="cc-team-num" style={{ position: 'absolute', right: '-4px', top: '-10px', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: numSize, lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(11,11,12,.12)' }}>
                        {team.num}
                      </span>
                      <span className="cc-team-edge" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: accentColor }}></span>

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: cardPadding }}>
                        <div className="cc-team-logo" style={{ width: logoSize, height: logoSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {team.logo ? (
                            <img src={team.logo} alt={`${team.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(11,11,12,.2)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(11,11,12,.4)' }}>Logo</span>
                          )}
                        </div>
                      </div>

                      <div style={{ position: 'relative', padding: `0 ${namePadX} 18px`, display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span className="cc-team-sub" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5f5b52' }}>
                          {team.venue || `Franchise ${team.num}`}
                        </span>
                        <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: nameSize, lineHeight: .95, textTransform: 'uppercase' }}>
                          {team.name}
                        </span>
                      </div>

                      <div className="cc-team-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '48px', padding: `0 ${namePadX}`, borderTop: `2px solid ${ink}`, background: '#f6e3de', color: ink }}>
                        <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '19px', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>View team</span>
                        <svg className="cc-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px 24px', marginTop: '28px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5f5b52' }}>Every player represents more than themselves.</span>
              <Link to="/ccpl-signup" className="cc-auction-btn" style={{ display: 'inline-flex', transform: 'skewX(-14deg)', background: ink, color: '#fff', padding: '13px 24px', textDecoration: 'none' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', transform: 'skewX(14deg)', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '20px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Enter the auction pool
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
      <CCPLPartners divider={false} />
      <CCPLFooter />
    </>
  );
}
