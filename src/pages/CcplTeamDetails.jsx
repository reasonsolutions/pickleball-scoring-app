import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';

export default function CcplTeamDetails() {
  const { teamSlug } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accentColor = '#ee3a24';
  const accentColorDark = '#7d0f0f';

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 860);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active tournament ID from app-settings
        const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
        const appSettingsDoc = await getDoc(appSettingsRef);

        if (!appSettingsDoc.exists() || !appSettingsDoc.data().activeTournamentId) {
          setError('No active tournament found');
          setLoading(false);
          return;
        }

        const activeTournamentId = appSettingsDoc.data().activeTournamentId;

        // Fetch all teams for the active tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', activeTournamentId)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          slug: doc.id,
          ...doc.data()
        }));

        setAllTeams(teamsData);

        // Find the current team
        const currentTeam = teamsData.find(t => t.id === teamSlug);
        
        if (!currentTeam) {
          setError('Team not found');
          setLoading(false);
          return;
        }

        setTeam(currentTeam);

        // Fetch players for this team
        if (currentTeam.playerIds && currentTeam.playerIds.length > 0) {
          const playersQuery = query(
            collection(db, 'players'),
            where('tournamentId', '==', activeTournamentId)
          );
          
          const playersSnapshot = await getDocs(playersQuery);
          const allPlayers = playersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filter players that belong to this team
          const teamPlayers = allPlayers.filter(player =>
            currentTeam.playerIds.includes(player.id)
          );

          setPlayers(teamPlayers);
        }

        // Fetch fixtures for this team
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', activeTournamentId)
        );
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const allFixtures = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter fixtures where this team is involved (either home or away)
        const teamFixtures = allFixtures
          .filter(fixture =>
            fixture.homeTeamId === teamSlug || fixture.awayTeamId === teamSlug
          )
          .sort((a, b) => {
            // Sort by date if available
            if (a.date && b.date) {
              return new Date(a.date) - new Date(b.date);
            }
            return 0;
          })
          .slice(0, 3); // Get next 3 fixtures

        // Map fixtures with opponent team names
        const fixturesWithTeams = teamFixtures.map(fixture => {
          const isHome = fixture.homeTeamId === teamSlug;
          const opponentId = isHome ? fixture.awayTeamId : fixture.homeTeamId;
          const opponent = teamsData.find(t => t.id === opponentId);
          
          return {
            id: fixture.id,
            opponent: opponent?.name || 'TBD',
            isHome,
            matchday: fixture.matchday || 'TBD',
            date: fixture.date || null,
            venue: fixture.venue || null
          };
        });

        setFixtures(fixturesWithTeams);

      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (teamSlug) {
      fetchTeamData();
    }
  }, [teamSlug]);

  // Helper function to optimize Cloudinary URLs
  const optimizeCloudinaryUrl = (url) => {
    if (!url) return null;
    if (url.includes('cloudinary.com')) {
      // Insert q_auto transformation for automatic quality optimization
      return url.replace('/upload/', '/upload/q_auto/');
    }
    return url;
  };

  // Prepare display data
  const squad = players.map((player, i) => {
    // Handle both string URLs and object with url property
    const photoUrl = typeof player.photo === 'string' ? player.photo : (player.photo?.url || player.photoUrl || null);
    
    return {
      num: String(i + 1).padStart(2, '0'),
      name: player.name || 'Unknown Player',
      role: player.role || player.category || 'Player',
      photo: optimizeCloudinaryUrl(photoUrl),
      gender: player.gender || ''
    };
  });

  const stats = team ? [
    { value: '—', label: 'League position' },
  ] : [];

  const facts = team ? [
    { label: 'Owner group', value: team.adminEmail || 'To be announced' },
    { label: 'Home venue', value: team.venue || 'To be announced' },
    { label: 'Head coach', value: 'To be announced' },
    { label: 'Captain', value: players[0]?.name || 'To be announced' },
  ] : [];

  const sectionPadding = isMobile ? '28px 6vw 56px' : '48px 6vw 88px';
  const backMargin = isMobile ? '28px' : '40px';
  const heroCols = isMobile ? '1fr' : 'auto 1fr';
  const heroGap = isMobile ? '28px' : '48px';
  const heroPadBottom = isMobile ? '36px' : '52px';
  const logoBox = isMobile ? '140px' : '220px';
  const statGap = isMobile ? '24px' : '44px';
  const squadCols = isMobile ? '1fr 1fr' : 'repeat(4, 1fr)';
  const squadGap = isMobile ? '10px' : '14px';
  const bodyCols = isMobile ? '1fr' : '2fr 1fr';
  const bodyGap = isMobile ? '36px' : '56px';
  const bodyPadTop = isMobile ? '36px' : '56px';

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
        
        .cc-in {
          opacity: 0;
          animation: cc-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .cc-player {
          transition: background 0.25s ease;
        }
        
        .cc-player:hover {
          background: #131314 !important;
        }
        
        .cc-back {
          transition: gap 0.25s ease;
        }
        
        .cc-back:hover {
          gap: 14px !important;
        }
      `}</style>

      <CCPLNavbar activePage="teams" />

      {loading ? (
        <section style={{
          position: 'relative',
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: "'Montserrat', sans-serif",
          padding: sectionPadding,
          boxSizing: 'border-box',
          overflow: 'hidden',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.6)'
          }}>
            Loading team details...
          </div>
        </section>
      ) : error || !team ? (
        <section style={{
          position: 'relative',
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: "'Montserrat', sans-serif",
          padding: sectionPadding,
          boxSizing: 'border-box',
          overflow: 'hidden',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <div style={{
            fontSize: '16px',
            color: accentColor,
            textAlign: 'center'
          }}>
            {error || 'Team not found'}
          </div>
          <Link to="/ccpl-teams" style={{
            fontSize: '12px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'underline'
          }}>
            ← Back to all teams
          </Link>
        </section>
      ) : (
        <section style={{
          position: 'relative',
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: "'Montserrat', sans-serif",
          padding: sectionPadding,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Back link */}
          <Link to="/ccpl-teams" className="cc-back cc-in" style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none',
            marginBottom: backMargin,
            animationDelay: '0.05s'
          }}>
            <span style={{ fontSize: '14px' }}>←</span> All franchises
          </Link>

          {/* Hero section */}
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: heroCols,
            gap: heroGap,
            alignItems: 'center',
            paddingBottom: heroPadBottom,
            borderBottom: '1px solid rgba(255,255,255,0.14)'
          }}>
            {/* Logo */}
            <div className="cc-in" style={{
              position: 'relative',
              width: logoBox,
              height: logoBox,
              border: '1px solid rgba(255,255,255,0.18)',
              background: '#0e0e0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px',
              boxSizing: 'border-box',
              animationDelay: '0.15s'
            }}>
              {/* Corner decorations */}
              <div style={{
                position: 'absolute',
                top: '-1px',
                left: '-1px',
                width: '14px',
                height: '14px',
                borderTop: '2px solid #fff',
                borderLeft: '2px solid #fff'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '14px',
                height: '14px',
                borderBottom: '2px solid #fff',
                borderRight: '2px solid #fff'
              }}></div>
              
              {/* Logo */}
              <div style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: team.logo?.url ? 'none' : '1px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {team.logo?.url ? (
                  <img
                    src={optimizeCloudinaryUrl(team.logo.url)}
                    alt={`${team.name} logo`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>Logo</span>
                )}
              </div>
            </div>

            {/* Team info */}
            <div className="cc-in" style={{ animationDelay: '0.25s' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: accentColor,
                  animation: 'cc-pulse 2s ease-in-out infinite'
                }}></div>
                <span style={{
                  fontSize: '11px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)'
                }}>{team.venue || 'Franchise'} — CCPL Hyderabad</span>
              </div>
              
              <h1 style={{
                fontFamily: "'Zuume Cut', sans-serif",
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 'clamp(48px, 7vw, 110px)',
                lineHeight: '0.88',
                margin: '0 0 20px',
                textTransform: 'uppercase'
              }}>{team.name}</h1>

              {/* Stats */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: statGap
              }}>
                {stats.map((stat, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{
                      fontFamily: "'Zuume Cut', sans-serif",
                      fontWeight: 700,
                      fontSize: '30px',
                      lineHeight: 1,
                      color: '#fff'
                    }}>{stat.value}</span>
                    <span style={{
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.4)'
                    }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body section */}
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: bodyCols,
            gap: bodyGap,
            paddingTop: bodyPadTop
          }}>
            {/* Squad section */}
            <div className="cc-in" style={{ animationDelay: '0.4s' }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontFamily: "'Zuume Cut', sans-serif",
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '34px',
                  lineHeight: 1,
                  margin: 0,
                  textTransform: 'uppercase'
                }}>Squad</h2>
                <span style={{
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)'
                }}>Season 2 roster</span>
              </div>

              {/* Player grid */}
              {squad.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.14)'
                }}>
                  No players assigned to this team yet
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: squadCols,
                  gap: squadGap
                }}>
                  {squad.map((player, i) => (
                    <div key={i} className="cc-player" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(255,255,255,0.14)'
                    }}>
                      {/* Player photo */}
                      <div style={{
                        position: 'relative',
                        aspectRatio: '3/4',
                        background: '#131314',
                        overflow: 'hidden'
                      }}>
                        {player.photo ? (
                          <img 
                            src={player.photo} 
                            alt={player.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.2)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em'
                            }}>Photo</span>
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          top: '10px',
                          left: '12px',
                          fontFamily: "'Zuume Cut', sans-serif",
                          fontStyle: 'italic',
                          fontWeight: 900,
                          fontSize: '15px',
                          color: accentColor
                        }}>{player.num}</span>
                      </div>

                      {/* Player info */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '14px 14px 16px'
                      }}>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          color: '#fff',
                          lineHeight: 1.25
                        }}>{player.name}</span>
                        <span style={{
                          fontSize: '10px',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.45)'
                        }}>{player.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="cc-in" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              animationDelay: '0.5s'
            }}>
              {/* Franchise info - only show if there's actual data */}
              {facts.some(fact => fact.value !== 'To be announced') && (
                <div style={{
                  border: '1px solid rgba(255,255,255,0.16)',
                  padding: '24px'
                }}>
                  <span style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)'
                  }}>Franchise</span>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginTop: '18px'
                  }}>
                    {facts.filter(fact => fact.value !== 'To be announced').map((fact, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        paddingTop: '12px'
                      }}>
                        <span style={{
                          fontSize: '11px',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.45)'
                        }}>{fact.label}</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#fff',
                          textAlign: 'right'
                        }}>{fact.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next matchday */}
              <div style={{
                border: '1px solid rgba(255,255,255,0.16)',
                padding: '24px'
              }}>
                <span style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)'
                }}>Next matchday</span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '18px'
                }}>
                  {fixtures.length > 0 ? (
                    fixtures.map((fx, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        paddingTop: '12px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#fff'
                        }}>
                          {fx.isHome ? 'vs' : '@'} {fx.opponent}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.45)'
                        }}>
                          {fx.matchday !== 'TBD' ? `MD ${fx.matchday}` : 'TBD'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      paddingTop: '12px',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '13px',
                      fontStyle: 'italic'
                    }}>
                      Schedule will be coming out soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      <CCPLFooter />
    </>
  );
}
