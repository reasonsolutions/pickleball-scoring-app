import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Outside display ("Center Screen" design, 1920x1080 scaled to fit):
//   top bar    -> the match currently on /main-display (centre court)
//   bottom bar -> the match currently on /side-display (side court)
//   middle     -> fully transparent (sits over the venue feed)

const isCenterCourt = (match) => {
  const courtName = match.court?.toLowerCase() || '';
  return courtName.includes('center') || courtName.includes('centre');
};

const matchDateString = (match) => {
  const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
  return matchDate.toISOString().split('T')[0];
};

const getScore = (match, side) => {
  const key = side === 'a' ? 'player1' : 'player2';
  return match.scores?.[key]?.game1 ||
    match.scores?.[key]?.total ||
    (side === 'a' ? match.team1Score || match.score1 : match.team2Score || match.score2) ||
    0;
};

// Same live-match priority as MainDisplay / SideDisplay
const pickFixtureState = (selectedFixture, matches) => {
  const fixtureMatches = matches
    .filter(match => match.fixtureGroupId === selectedFixture.fixtureGroupId)
    .sort((a, b) => (a.matchOrder || a.sequence || a.matchNumber || 0) - (b.matchOrder || b.sequence || b.matchNumber || 0));

  const completed = fixtureMatches.filter(match => match.status === 'completed');
  const inProgress = fixtureMatches.filter(match => match.status === 'live' || match.status === 'in_progress');
  const upcoming = fixtureMatches.filter(match => !match.status || match.status === 'scheduled');

  const team1Wins = completed.filter(match => getScore(match, 'a') > getScore(match, 'b')).length;
  const team2Wins = completed.filter(match => getScore(match, 'b') > getScore(match, 'a')).length;

  let liveMatch = null;
  // Game Breaker scenario (3-3 on recorded winners)
  const team1Winners = completed.filter(m => m.winner === 'team1').length;
  const team2Winners = completed.filter(m => m.winner === 'team2').length;
  if (team1Winners === 3 && team2Winners === 3) {
    liveMatch = fixtureMatches.find(match =>
      match.matchTypeLabel === 'Game Breaker' ||
      match.matchTypeLabel === 'Dream Breaker' ||
      (match.matchOrder === 7 || match.sequence === 7 || match.matchNumber === 7)
    ) || null;
  }
  if (!liveMatch) {
    liveMatch = inProgress[0] || upcoming[0] || completed[completed.length - 1] || null;
  }

  return { liveMatch, team1Wins, team2Wins };
};

const defaultFixtureFrom = (matches) => (matches.length > 0 ? {
  team1Name: matches[0].team1Name,
  team2Name: matches[0].team2Name,
  fixtureGroupId: matches[0].fixtureGroupId
} : null);

const ServeDot = ({ on }) => (
  <span style={{
    flex: 'none', width: 20, height: 20, borderRadius: '50%',
    background: on ? '#ffc72e' : 'rgba(255,255,255,.09)',
    boxShadow: on ? '0 0 18px rgba(255,199,46,.9)' : 'inset 0 0 0 1px rgba(255,255,255,.14)',
    animation: on ? 'od-servepulse 1.8s ease-in-out infinite' : 'none'
  }} />
);

const WonCell = ({ value, side }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    [side === 'a' ? 'borderRight' : 'borderLeft']: '1px solid rgba(255,255,255,.12)', background: 'rgba(0,0,0,.25)'
  }}>
    <div style={{ font: "800 15px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>Won</div>
    <div style={{ font: "900 52px/1 'Unbounded',sans-serif", letterSpacing: '-.05em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

const TeamCell = ({ side, name, players, logo, serving }) => {
  const isA = side === 'a';
  const textBlock = (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isA ? 'flex-end' : 'flex-start', gap: 10, minWidth: 0, textAlign: isA ? 'right' : 'left' }}>
      <div style={{ maxWidth: '100%', font: "900 32px/1.2 'Unbounded',sans-serif", letterSpacing: '-.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      <div style={{ maxWidth: '100%', font: "800 20px/1.2 'Schibsted Grotesk',sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', color: '#ffb96b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{players}</div>
    </div>
  );
  const mask = `linear-gradient(${isA ? 90 : 270}deg,#000 25%,transparent 95%)`;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
      justifyContent: isA ? 'flex-end' : 'flex-start', gap: 22, padding: '0 24px', minWidth: 0,
      background: serving ? 'rgba(255,154,46,.1)' : 'transparent'
    }}>
      {logo && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: '-10%', bottom: '-10%', [isA ? 'left' : 'right']: -30, width: 300,
          background: `url("${logo}") ${isA ? 'left' : 'right'} center/contain no-repeat`,
          opacity: 0.3, mixBlendMode: 'screen', pointerEvents: 'none', WebkitMaskImage: mask, maskImage: mask
        }} />
      )}
      {isA ? <>{textBlock}<ServeDot on={serving} /></> : <><ServeDot on={serving} />{textBlock}</>}
    </div>
  );
};

const ScoreCell = ({ value, side }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: side === 'a' ? 'linear-gradient(180deg,#ff8a1f,#ef6a12)' : 'linear-gradient(180deg,#e9691a,#c9500d)',
    borderLeft: side === 'b' ? '1px solid rgba(0,0,0,.35)' : undefined,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,${side === 'a' ? '.3' : '.22'})`
  }}>
    <span style={{ font: "900 96px/1 'Unbounded',sans-serif", letterSpacing: '-.06em', fontVariantNumeric: 'tabular-nums', textShadow: '0 3px 14px rgba(0,0,0,.45)' }}>{value}</span>
  </div>
);

const InfoStrip = ({ court, label, position }) => (
  <div style={{
    height: 48, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 32px',
    background: 'linear-gradient(90deg,rgba(4,1,14,.95),rgba(12,4,34,.9))',
    [position === 'top' ? 'borderTop' : 'borderBottom']: '1px solid rgba(255,154,46,.65)'
  }}>
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff2d78', animation: 'od-livepulse 1.6s ease-in-out infinite' }} />
    <span style={{ font: "900 20px/1 'Unbounded',sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', color: '#ff9a2e', whiteSpace: 'nowrap' }}>{court}</span>
    {label && <>
      <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,.22)' }} />
      <span style={{ font: "800 19px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap' }}>{label}</span>
    </>}
  </div>
);

// One match bar. `position` = 'top' (info strip below) or 'bottom' (info strip above)
const MatchBar = ({ data, position, fallbackCourt, getLogo }) => {
  const isTop = position === 'top';
  const match = data?.liveMatch;

  const teamA = match?.team1Name || data?.fixture?.team1Name || '—';
  const teamB = match?.team2Name || data?.fixture?.team2Name || '—';
  const playersA = match ? [match.player1Team1, match.player2Team1].filter(Boolean).join(' / ') : '';
  const playersB = match ? [match.player1Team2, match.player2Team2].filter(Boolean).join(' / ') : '';
  const serveA = match?.servingPlayer === 'player1';
  const serveB = match?.servingPlayer === 'player2';
  const label = match?.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : (match?.matchTypeLabel || '');
  const court = match?.court || fallbackCourt;

  const strip = <InfoStrip court={court} label={match ? label : 'Waiting for match'} position={isTop ? 'top' : 'bottom'} />;

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, [isTop ? 'top' : 'bottom']: 0, height: 216,
      display: 'flex', flexDirection: 'column',
      background: `linear-gradient(${isTop ? '180deg' : '0deg'},#0b0420,#160835)`, zIndex: 2
    }}>
      <div style={{ position: 'absolute', left: 0, right: 0, [isTop ? 'top' : 'bottom']: 0, height: 5, background: 'linear-gradient(90deg,#ff9a2e,#ff2d78 55%,#7b2cff)' }} />
      {!isTop && strip}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '140px minmax(0,1fr) 170px 170px minmax(0,1fr) 140px', minHeight: 0 }}>
        <WonCell value={data?.team1Wins ?? 0} side="a" />
        <TeamCell side="a" name={teamA} players={playersA} logo={getLogo(teamA)} serving={serveA} />
        <ScoreCell value={match ? getScore(match, 'a') : 0} side="a" />
        <ScoreCell value={match ? getScore(match, 'b') : 0} side="b" />
        <TeamCell side="b" name={teamB} players={playersB} logo={getLogo(teamB)} serving={serveB} />
        <WonCell value={data?.team2Wins ?? 0} side="b" />
      </div>
      {isTop && strip}
    </div>
  );
};

export default function OutsideDisplay() {
  const { tournamentId, dateString } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainData, setMainData] = useState(null);
  const [sideData, setSideData] = useState(null);
  const [teamLogos, setTeamLogos] = useState({});

  const mainFixtureRef = useRef(null);
  const sideFixtureRef = useRef(null);
  const centerMatchesRef = useRef([]);
  const sideMatchesRef = useRef([]);
  const requestedLogosRef = useRef(new Set());

  // Scale the fixed 1920x1080 canvas to fit the screen
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const fit = () => setFitScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const recompute = useCallback(() => {
    const centerMatches = centerMatchesRef.current;
    const sideMatches = sideMatchesRef.current;

    if (!mainFixtureRef.current) mainFixtureRef.current = defaultFixtureFrom(centerMatches);
    if (!sideFixtureRef.current) sideFixtureRef.current = defaultFixtureFrom(sideMatches);

    const main = mainFixtureRef.current
      ? { fixture: mainFixtureRef.current, ...pickFixtureState(mainFixtureRef.current, centerMatches) }
      : null;
    const side = sideFixtureRef.current
      ? { fixture: sideFixtureRef.current, ...pickFixtureState(sideFixtureRef.current, sideMatches) }
      : null;

    setMainData(main);
    setSideData(side);
  }, []);

  useEffect(() => {
    if (!tournamentId || !dateString) return;

    getDoc(doc(db, 'tournaments', tournamentId))
      .then(snap => { if (!snap.exists()) setError('Tournament not found'); })
      .catch(err => { console.error('Error fetching tournament:', err); setError('Failed to load tournament data'); })
      .finally(() => setLoading(false));

    const unsubSettings = onSnapshot(
      doc(db, 'display_settings', `${tournamentId}_${dateString}`),
      (snap) => {
        if (!snap.exists()) return;
        const settings = snap.data();
        // Same selection as MainDisplay / SideDisplay
        const main = settings.currentFixture || settings.currentMainFixture;
        const side = settings.currentSideFixture || settings.currentFixture;
        if (main) mainFixtureRef.current = main;
        if (side) sideFixtureRef.current = side;
        recompute();
      },
      (err) => console.error('Error listening to display settings:', err)
    );

    const unsubMatches = onSnapshot(
      query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)),
      (snapshot) => {
        const dateMatches = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(match => matchDateString(match) === dateString);
        centerMatchesRef.current = dateMatches.filter(isCenterCourt);
        sideMatchesRef.current = dateMatches.filter(match => !isCenterCourt(match));
        recompute();
      },
      (err) => console.error('Error listening to matches:', err)
    );

    return () => {
      unsubSettings();
      unsubMatches();
    };
  }, [tournamentId, dateString, recompute]);

  // Fetch team logos (used as watermarks behind team names)
  useEffect(() => {
    const names = [
      mainData?.liveMatch?.team1Name, mainData?.liveMatch?.team2Name,
      sideData?.liveMatch?.team1Name, sideData?.liveMatch?.team2Name
    ].filter(Boolean);

    names.forEach(async (teamName) => {
      if (requestedLogosRef.current.has(teamName)) return;
      requestedLogosRef.current.add(teamName);
      try {
        const snapshot = await getDocs(query(collection(db, 'teams'), where('name', '==', teamName)));
        if (snapshot.empty) return;
        // Team names repeat across tournaments - prefer this tournament's team, then any team with a logo
        const teamDocs = snapshot.docs.map(d => d.data());
        const hasLogo = (t) => t.logo?.url || t.logoUrl;
        const teamData =
          teamDocs.find(t => t.tournamentId === tournamentId && hasLogo(t)) ||
          teamDocs.find(hasLogo);
        const logoUrl = teamData && (teamData.logo?.url || teamData.logoUrl);
        if (logoUrl) setTeamLogos(prev => ({ ...prev, [teamName]: logoUrl }));
      } catch (err) {
        console.error('Error fetching team logo:', err);
      }
    });
  }, [mainData?.liveMatch?.team1Name, mainData?.liveMatch?.team2Name, sideData?.liveMatch?.team1Name, sideData?.liveMatch?.team2Name, tournamentId]);

  const getLogo = useCallback((teamName) => teamLogos[teamName] || null, [teamLogos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="alert alert-error max-w-md"><span>{error}</span></div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Schibsted Grotesk', sans-serif" }}>
      <style>{`
        html, body, #root { background: transparent !important; }
        @keyframes od-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,45,120,.7)}50%{opacity:.55;box-shadow:0 0 0 12px rgba(255,45,120,0)}}
        @keyframes od-servepulse{0%,100%{transform:scale(1);box-shadow:0 0 18px rgba(255,199,46,.9)}50%{transform:scale(1.35);box-shadow:0 0 34px rgba(255,199,46,1)}}
      `}</style>

      <div style={{ position: 'relative', flex: 'none', width: 1920, height: 1080, transform: `scale(${fitScale})`, transformOrigin: 'center center', overflow: 'hidden', color: '#fff' }}>
        {/* Middle stays fully transparent */}
        <MatchBar data={mainData} position="top" fallbackCourt="Centre Court" getLogo={getLogo} />
        <MatchBar data={sideData} position="bottom" fallbackCourt="Side Court" getLogo={getLogo} />
      </div>
    </div>
  );
}
