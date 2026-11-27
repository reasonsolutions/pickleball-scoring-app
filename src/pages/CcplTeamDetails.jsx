import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLTopBar from '../components/CCPLTopBar';
import { parseDate } from '../utils/dateTimeUtils';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const ZUUME = "'Zuume Cut', sans-serif";
// Same exclusions the rankings page uses to tell playoffs from league ties
const PLAYOFF_TYPES = ['playoff', 'qualifier', 'qualifier 1', 'qualifier 2', 'eliminator', 'final'];

const formatShortDate = (date) =>
  date && date.getTime() > 0
    ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'TBD';

export default function CcplTeamDetails() {
  const { teamSlug } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setPlayers([]);
        setFixtures([]);

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

        // Each fixture doc is one match; matches sharing a fixtureGroupId make up one tie.
        // Ties store the sides as team1/team2 (older docs may use homeTeamId/awayTeamId).
        const groups = {};
        allFixtures.forEach(match => {
          const side1 = match.team1 ?? match.homeTeamId;
          const side2 = match.team2 ?? match.awayTeamId;
          if (side1 !== teamSlug && side2 !== teamSlug) return;
          const groupId = match.fixtureGroupId || match.id;
          if (groups[groupId]) return;
          const isHome = side1 === teamSlug;
          const opponentId = isHome ? side2 : side1;
          const opponentName = isHome ? match.team2Name : match.team1Name;
          groups[groupId] = {
            id: groupId,
            opponent: teamsData.find(t => t.id === opponentId)?.name || opponentName || 'TBD',
            isHome,
            date: parseDate(match.date),
            fixtureType: (match.fixtureType || 'league').toLowerCase().trim(),
            venue: match.venue || null
          };
        });

        const fixturesWithTeams = Object.values(groups).sort((a, b) => a.date - b.date);
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
      window.scrollTo(0, 0);
    }
  }, [teamSlug]);

  // Helper function to optimize Cloudinary URLs
  const optimizeCloudinaryUrl = (url) => {
    if (!url) return null;
    if (url.includes('cloudinary.com')) {
      // Insert q_auto transformation for automatic quality optimization
      // Auto quality/format, capped at 600px wide (cards and logo render well under that)
      return url.replace('/upload/', '/upload/q_auto,f_auto,w_600/');
    }
    return url;
  };

  // Prepare display data - reorder to show captain first
  const squad = (() => {
    // Find the captain
    const captainId = team?.captain;
    const captainIndex = captainId ? players.findIndex(p => p.id === captainId) : -1;

    // Reorder players array to put captain first
    let orderedPlayers = [...players];
    if (captainIndex > 0) {
      const captain = orderedPlayers.splice(captainIndex, 1)[0];
      orderedPlayers.unshift(captain);
    }

    return orderedPlayers.map((player, i) => {
      // Prefer the action photo; fall back to the profile photo (string URL or { url })
      const actionPhotoUrl = typeof player.actionPhoto === 'string' ? player.actionPhoto : (player.actionPhoto?.url || null);
      const profilePhotoUrl = typeof player.photo === 'string' ? player.photo : (player.photo?.url || player.photoUrl || null);
      const photoUrl = actionPhotoUrl || profilePhotoUrl;
      const name = player.name || 'Unknown Player';

      return {
        id: player.id,
        num: String(i + 1).padStart(2, '0'),
        name,
        initials: name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
        role: player.id === captainId ? 'Captain' : (player.role || player.category || 'Player'),
        photo: optimizeCloudinaryUrl(photoUrl),
        gender: player.gender || ''
      };
    });
  })();

  // Upcoming = ties from today onwards (undated ties go last)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = fixtures.filter(fx => fx.date.getTime() === 0 || fx.date >= startOfToday).slice(0, 3);
  const nextFixture = upcoming.find(fx => fx.date.getTime() > 0);

  const stats = team ? [
    { value: String(players.length || team.playerIds?.length || 0), label: 'Contracted players' },
    { value: String(fixtures.filter(fx => !PLAYOFF_TYPES.includes(fx.fixtureType)).length || '—'), label: 'League fixtures' },
    { value: nextFixture ? nextFixture.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—', label: 'Next match' },
    { value: '—', label: 'League position' },
  ] : [];

  const facts = team ? [
    { label: 'Owner group', value: team.adminEmail || 'To be announced' },
    { label: 'Home venue', value: team.venue || 'To be announced' },
    { label: 'Head coach', value: 'To be announced' },
    { label: 'Captain', value: (() => {
      if (team.captain) {
        const captain = players.find(p => p.id === team.captain);
        return captain?.name || 'To be announced';
      }
      return 'To be announced';
    })() },
  ] : [];
  const visibleFacts = facts.filter(fact => fact.value !== 'To be announced');

  const teamIndex = team ? allTeams.findIndex(t => t.id === team.id) : -1;
  const teamNum = String(teamIndex + 1).padStart(2, '0');
  const prevTeam = allTeams.length > 1 ? allTeams[(teamIndex - 1 + allTeams.length) % allTeams.length] : null;
  const nextTeam = allTeams.length > 1 ? allTeams[(teamIndex + 1) % allTeams.length] : null;

  const nameWords = (team?.name || '').trim().split(/\s+/);
  const teamLast = nameWords.length > 1 ? nameWords.pop() : '';
  const teamFirst = nameWords.join(' ');
  const logoUrl = optimizeCloudinaryUrl(team?.logo?.url);

  const heroCols = isMobile ? '1fr' : 'auto minmax(0,1fr)';
  const logoBox = isMobile ? '140px' : '220px';
  const statCols = isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))';
  const bodyCols = isMobile ? '1fr' : 'minmax(0,2fr) minmax(300px,1fr)';
  const squadCols = isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fill,minmax(180px,1fr))';
  const squadGap = isMobile ? '10px' : '16px';

  const backLink = (
    <Link to="/ccpl-teams" className="cc-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M20 12H5M11 6l-6 6 6 6" /></svg>
      All franchises
    </Link>
  );

  return (
    <>
      <style>{`
        .cc-team-page ::selection { background: ${ORANGE}; color: ${INK}; }
        /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
        .cc-team-page span { font-family: inherit; }

        @keyframes cc-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes cc-fade-up { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: none; } }
        .cc-in { opacity: 0; animation: cc-fade-up .8s cubic-bezier(.2,.7,.2,1) forwards; }

        .cc-back { transition: color .2s ease; }
        .cc-back:hover { color: ${ORANGE} !important; }

        .cc-player { transition: background .3s ease, color .3s ease; }
        .cc-player:hover { background: ${INK} !important; color: #fff !important; }
        .cc-player .cc-player-edge { transition: transform .35s cubic-bezier(.2,.7,.2,1); transform-origin: bottom; transform: scaleY(0); }
        .cc-player:hover .cc-player-edge { transform: scaleY(1); }
        .cc-player .cc-player-role { transition: color .3s ease; }
        .cc-player:hover .cc-player-role { color: ${ORANGE} !important; }
        .cc-player img { transition: transform .5s cubic-bezier(.2,.7,.2,1); }
        .cc-player:hover img { transform: scale(1.04); }

        .cc-fixtures-link { transition: color .2s ease; }
        .cc-fixtures-link:hover { color: #fff !important; }

        .cc-pager { transition: background .25s ease, color .25s ease; }
        .cc-pager:hover { background: ${INK} !important; color: #fff !important; }
      `}</style>

      <div className="cc-team-page" style={{ background: INK, fontFamily: "'Montserrat', sans-serif" }}>
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="teams" />

        {loading ? (
          <section style={{ background: INK, color: 'rgba(255,255,255,.6)', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600 }}>
            Loading team...
          </section>
        ) : error || !team ? (
          <section style={{ background: INK, color: '#fff', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '64px 6vw', textAlign: 'center' }}>
            <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(44px,6vw,80px)', lineHeight: .9, textTransform: 'uppercase' }}>
              {error || 'Team not found'}
            </div>
            {backLink}
          </section>
        ) : (
          <>
            {/* ===== Team header ===== */}
            <section style={{ position: 'relative', background: INK, color: '#fff', padding: 'clamp(40px,5vw,72px) 6vw calc(5vw + clamp(56px,7vw,96px))', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-1vw', bottom: '2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,32vw,520px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)' }}>
                {teamNum}
              </div>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: ORANGE, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>

              <div style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto' }}>
                <div className="cc-in" style={{ marginBottom: 'clamp(28px,4vw,48px)' }}>{backLink}</div>

                <div className="cc-in" style={{ display: 'grid', gridTemplateColumns: heroCols, gap: 'clamp(28px,4vw,56px)', alignItems: 'end', animationDelay: '.08s' }}>
                  <div style={{ position: 'relative', width: logoBox, height: logoBox, background: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: ORANGE }}></span>
                    {logoUrl ? (
                      <img src={logoUrl} alt={`${team.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '64px', color: INK }}>{teamNum}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                      <span style={{ display: 'inline-flex', flex: 'none', transform: 'skewX(-14deg)', background: ORANGE, padding: '8px 16px' }}>
                        <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap' }}>
                          {team.venue || `Franchise ${teamNum}`}
                        </span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ORANGE, animation: 'cc-pulse 2s ease-in-out infinite' }}></span>
                        CCPL Hyderabad / Season 2
                      </span>
                    </div>
                    <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,160px)', lineHeight: .84, letterSpacing: '-.01em' }}>
                      {teamFirst} {teamLast && <span style={{ color: ORANGE }}>{teamLast}</span>}
                    </h1>
                  </div>
                </div>

                <div className="cc-in" style={{ display: 'grid', gridTemplateColumns: statCols, marginTop: 'clamp(36px,5vw,64px)', borderTop: '2px solid rgba(255,255,255,.18)', animationDelay: '.16s' }}>
                  {stats.map(stat => (
                    <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '22px 20px 0 0' }}>
                      <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(40px,4.5vw,64px)', lineHeight: .9, color: '#fff', textTransform: 'uppercase' }}>{stat.value}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== Squad + sidebar ===== */}
            <section style={{ position: 'relative', background: PAPER, color: INK, marginTop: '-5vw', padding: 'calc(5vw + clamp(40px,5vw,64px)) 6vw clamp(64px,8vw,110px)', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)' }}>
              <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: bodyCols, gap: 'clamp(36px,4vw,56px)', alignItems: 'start' }}>

                <div>
                  <div className="cc-in" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(44px,5vw,72px)', lineHeight: .85 }}>
                      The <span style={{ color: ORANGE }}>Squad.</span>
                    </h2>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>
                      Season 2 roster / {squad.length} {squad.length === 1 ? 'player' : 'players'}
                    </span>
                  </div>

                  {squad.length === 0 ? (
                    <div style={{ border: `2px dashed rgba(11,11,12,.25)`, padding: '48px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: MUTED }}>
                      Squad will be announced after the auction.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: squadCols, gap: squadGap }}>
                      {squad.map((player, i) => (
                        <div key={player.id} className="cc-player cc-in" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${INK}`, background: '#fff', color: INK, animationDelay: `${(i % 4) * 0.08}s` }}>
                          <div style={{ position: 'relative', aspectRatio: '4/5', background: '#e4e1d8', borderBottom: `2px solid ${INK}`, overflow: 'hidden' }}>
                            {player.photo ? (
                              <img src={player.photo} alt={player.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '72px', color: 'rgba(11,11,12,.18)' }}>
                                {player.initials}
                              </div>
                            )}
                            <span style={{ position: 'absolute', top: 0, left: 0, display: 'inline-flex', background: INK, padding: '6px 10px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '20px', lineHeight: 1, color: ORANGE }}>
                              {player.num}
                            </span>
                          </div>
                          <span className="cc-player-edge" style={{ position: 'absolute', left: 0, bottom: 0, height: '84px', width: '8px', background: ORANGE }}></span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px 16px' }}>
                            <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '26px', lineHeight: .95, textTransform: 'uppercase' }}>{player.name}</span>
                            <span className="cc-player-role" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>{player.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {visibleFacts.length > 0 && (
                    <div className="cc-in" style={{ position: 'relative', background: '#fff', border: `2px solid ${INK}`, padding: '26px 24px 22px' }}>
                      <span style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '6px', background: ORANGE }}></span>
                      <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '30px', lineHeight: 1, textTransform: 'uppercase' }}>Franchise</span>
                      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
                        {visibleFacts.map(fact => (
                          <div key={fact.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #d8d4ca', padding: '12px 0' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>{fact.label}</span>
                            <span style={{ fontSize: '14px', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="cc-in" style={{ position: 'relative', background: INK, color: '#fff', border: `2px solid ${INK}`, padding: '26px 24px 22px', overflow: 'hidden', animationDelay: '.08s' }}>
                    <span style={{ position: 'absolute', right: '-6px', top: '-14px', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '120px', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(226,123,70,.4)' }}>VS</span>
                    <span style={{ position: 'relative', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '30px', lineHeight: 1, textTransform: 'uppercase' }}>Upcoming</span>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
                      {upcoming.length > 0 ? upcoming.map((fx, i) => (
                        <div key={fx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,.16)', padding: '12px 0' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{fx.isHome ? 'vs' : '@'} {fx.opponent}</span>
                          <span style={{ display: 'inline-flex', flex: 'none', transform: 'skewX(-14deg)', background: i === 0 ? ORANGE : 'rgba(255,255,255,.12)', padding: '4px 10px' }}>
                            <span style={{ transform: 'skewX(14deg)', fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: i === 0 ? INK : '#fff', whiteSpace: 'nowrap' }}>
                              {formatShortDate(fx.date)}
                            </span>
                          </span>
                        </div>
                      )) : (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,.16)', padding: '12px 0', fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,.55)' }}>
                          Schedule will be coming out soon
                        </div>
                      )}
                    </div>
                    <Link to="/ccpl-fixtures" className="cc-fixtures-link" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '10px', marginTop: '10px', fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE, textDecoration: 'none' }}>
                      Full fixtures
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                    </Link>
                  </div>
                </div>
              </div>

              {prevTeam && nextTeam && (
                <div className="cc-in" style={{ maxWidth: '1400px', margin: 'clamp(48px,6vw,80px) auto 0', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', border: `2px solid ${INK}` }}>
                  <Link to={`/ccpl-teams/${prevTeam.id}`} className="cc-pager" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '20px 22px', background: '#fff', color: INK, borderRight: `2px solid ${INK}`, textDecoration: 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE }}>&larr; Previous</span>
                    <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(24px,3vw,38px)', lineHeight: .95, textTransform: 'uppercase' }}>{prevTeam.name}</span>
                  </Link>
                  <Link to={`/ccpl-teams/${nextTeam.id}`} className="cc-pager" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', padding: '20px 22px', background: '#fff', color: INK, textAlign: 'right', textDecoration: 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE }}>Next &rarr;</span>
                    <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(24px,3vw,38px)', lineHeight: .95, textTransform: 'uppercase' }}>{nextTeam.name}</span>
                  </Link>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <CCPLFooter above={loading || error || !team ? INK : PAPER} />
    </>
  );
}
