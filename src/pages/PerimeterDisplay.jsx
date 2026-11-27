import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { resolveDisplayLogos, useMatchLogoOverride } from '../utils/matchLogos';
import { getActiveTimeout } from '../components/TimeoutSequenceOverlay';
import { pickIntroScene } from '../components/LineupIntro';
import * as E from '../utils/perimeterBoardEngine';

// LED perimeter boards around a court, rendered for Millumin.
// court="main" follows the Main Display (centre court), court="side" follows the Side Display.
// Each of the four boards is 2176×256 (E.BOARD_W × E.H).
// Query params: ?layout=stacked|strip  ?speed=<logo seconds>
//
// Scenes come from the live match:
//   DRS review pending  -> Decision pending
//   timeout called      -> Timeout (60s countdown from the umpire's start time)
//   lineup intro        -> Team intro (from the Display Controller)
//   match point         -> Match point (while the serving team is on match point)
//   otherwise           -> Sponsor loop of the fixture's sliding images (Logos tab)

const SIDE_BOARD_FT = 60;
const TIMEOUT_PAD_FT = 4;
const MATCH_POINT_SCORE = 14;
const GAME_BREAKER_MATCH_POINT_SCORE = 24;
const MATCH_POINT_SECONDS = 7;
const SWITCH_SIDES_SCORE = 8;

const isLive = (m) => m?.status === 'live' || m?.status === 'in_progress';
const isMainCourt = (m) => {
  const c = m.court?.toLowerCase() || '';
  return c.includes('center') || c.includes('centre');
};
const matchDateString = (m) => {
  const d = m.date?.toDate ? m.date.toDate() : new Date(m.date || '1970-01-01');
  return d.toISOString().split('T')[0];
};
const orderOf = (m) => m.matchOrder || m.sequence || m.matchNumber || 0;
const toMillis = (ts) => {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  return null;
};

// Same priority as the Main/Side displays: Game Breaker at 3-3, then live, upcoming, last completed
function pickLiveMatch(fixtureMatches) {
  const sorted = [...fixtureMatches].sort((a, b) => orderOf(a) - orderOf(b));
  const completed = sorted.filter(m => m.status === 'completed');
  const t1 = completed.filter(m => m.winner === 'team1').length;
  const t2 = completed.filter(m => m.winner === 'team2').length;
  if (t1 === 3 && t2 === 3) {
    const gb = sorted.find(m =>
      m.matchTypeLabel === 'Game Breaker' || m.matchTypeLabel === 'Dream Breaker' || orderOf(m) === 7);
    if (gb) return gb;
  }
  return sorted.find(isLive)
    || sorted.find(m => !m.status || m.status === 'scheduled')
    || completed[completed.length - 1]
    || null;
}

const liveScores = (match) => [
  match.scores?.player1?.game1 || match.scores?.player1?.total || match.team1Score || match.score1 || 0,
  match.scores?.player2?.game1 || match.scores?.player2?.total || match.team2Score || match.score2 || 0,
];

// Side serving at match point as { name, key }, or null. The key changes every rally at match point
// (score or server), so the animation plays once per match-point rally, like the Main/Side displays.
function matchPointTeam(match) {
  if (!isLive(match)) return null;
  const s1 = match.scores?.player1?.game1 || match.scores?.player1?.total || match.team1Score || match.score1 || 0;
  const s2 = match.scores?.player2?.game1 || match.scores?.player2?.total || match.team2Score || match.score2 || 0;
  const serving = match.servingPlayer;
  if (serving !== 'player1' && serving !== 'player2') return null;
  const [own, other] = serving === 'player1' ? [s1, s2] : [s2, s1];
  const gb = match.matchType === 'dreamBreaker' || match.matchTypeLabel === 'Game Breaker' || match.matchTypeLabel === 'Dream Breaker';
  const target = gb ? GAME_BREAKER_MATCH_POINT_SCORE : MATCH_POINT_SCORE;
  if (own < target || own <= other) return null;
  return { name: serving === 'player1' ? match.team1Name : match.team2Name, key: `${match.id}:${s1}-${s2}:${serving}` };
}

export default function PerimeterDisplay({ court = 'main' }) {
  const { tournamentId, dateString } = useParams();
  const [searchParams] = useSearchParams();
  const isMain = court === 'main';

  const [tournamentName, setTournamentName] = useState('');
  const [courtMatches, setCourtMatches] = useState([]);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [introScene, setIntroScene] = useState(null);
  const [logosDocData, setLogosDocData] = useState({});

  // Tournament name (sponsor-loop fallback when no sliding images are set)
  useEffect(() => {
    if (!tournamentId) return undefined;
    return onSnapshot(doc(db, 'tournaments', tournamentId), snap => {
      const d = snap.data() || {};
      setTournamentName(d.name || d.tournamentName || '');
    }, () => {});
  }, [tournamentId]);

  // Which fixture the Display Controller has on this court, plus lineup intros
  useEffect(() => {
    if (!tournamentId || !dateString) return undefined;
    return onSnapshot(doc(db, 'display_settings', `${tournamentId}_${dateString}`), snap => {
      if (!snap.exists()) return;
      const s = snap.data();
      const fixture = isMain
        ? (s.currentFixture || s.currentMainFixture)
        : (s.currentSideFixture || s.currentFixture);
      if (fixture) setCurrentFixture(fixture);
      setIntroScene(pickIntroScene(isMain ? s.mainScene : s.sideScene));
    }, err => console.error('Perimeter display settings error:', err));
  }, [tournamentId, dateString, isMain]);

  // This court's matches for the day
  useEffect(() => {
    if (!tournamentId || !dateString) return undefined;
    const q = query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourtMatches(all.filter(m => matchDateString(m) === dateString && isMainCourt(m) === isMain));
    }, err => console.error('Perimeter fixtures error:', err));
  }, [tournamentId, dateString, isMain]);

  // Default to the first fixture of the day until the controller picks one
  const fixture = useMemo(() => {
    if (currentFixture) return currentFixture;
    const first = courtMatches[0];
    return first ? { team1Name: first.team1Name, team2Name: first.team2Name, fixtureGroupId: first.fixtureGroupId } : null;
  }, [currentFixture, courtMatches]);

  const liveMatch = useMemo(() => {
    if (!fixture) return null;
    return pickLiveMatch(courtMatches.filter(m => m.fixtureGroupId === fixture.fixtureGroupId));
  }, [fixture, courtMatches]);

  // Sliding images from the Logos tab for the active fixture
  useEffect(() => {
    if (!tournamentId) return undefined;
    return onSnapshot(doc(db, 'tournament_logos', tournamentId),
      snap => setLogosDocData(snap.exists() ? snap.data() : {}),
      () => setLogosDocData({}));
  }, [tournamentId]);
  const matchLogoOverride = useMatchLogoOverride(tournamentId, dateString, fixture);
  const logoUrls = useMemo(
    () => resolveDisplayLogos(logosDocData, dateString, fixture, matchLogoOverride).slidingImages.map(i => i.url).filter(Boolean),
    [logosDocData, dateString, fixture, matchLogoOverride]
  );
  const logoKey = logoUrls.join('|');

  // Scene the boards should be on right now
  const timeout = getActiveTimeout(liveMatch);
  const mp = matchPointTeam(liveMatch);

  // Switch sides: plays once per match, the moment the first team reaches 8. The trailing team
  // reaching 8 later doesn't replay it, and a match already past 8 when the page loads doesn't either.
  const [switchEvent, setSwitchEvent] = useState(null); // { matchId, at }
  const leaderRef = useRef({ matchId: null, max: 0 });
  const switchedRef = useRef(new Set()); // matches that already reached 8 (score corrections don't replay it)
  const [ls1, ls2] = liveMatch ? liveScores(liveMatch) : [0, 0];
  const leadScore = Math.max(ls1, ls2);
  useEffect(() => {
    if (!liveMatch?.id) return;
    const prev = leaderRef.current;
    const sameMatch = prev.matchId === liveMatch.id;
    leaderRef.current = { matchId: liveMatch.id, max: leadScore };
    if (leadScore < SWITCH_SIDES_SCORE || switchedRef.current.has(liveMatch.id)) return;
    switchedRef.current.add(liveMatch.id);
    if (sameMatch && isLive(liveMatch) && prev.max < SWITCH_SIDES_SCORE) {
      setSwitchEvent({ matchId: liveMatch.id, at: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMatch?.id, leadScore]);
  const switchActive = switchEvent && switchEvent.matchId === liveMatch?.id
    && Date.now() - switchEvent.at < E.SCENES.switch.dur * 1000;
  const drsPending = isLive(liveMatch) && !!liveMatch?.drsVideoActive;
  const target = useMemo(() => {
    if (drsPending) {
      return { id: 'pending', team: { name: liveMatch.drsTeamName || '' }, key: `pending|${liveMatch.id}` };
    }
    if (timeout) {
      const name = timeout.team === 'team1' ? liveMatch.team1Name : timeout.team === 'team2' ? liveMatch.team2Name : timeout.team;
      const start = toMillis(timeout.startTime);
      const dur = Math.round((timeout.duration || 60000) / 1000);
      return { id: 'timeout', team: { name }, start, dur, key: `timeout|${liveMatch.id}|${timeout.team}|${start || ''}` };
    }
    // Lineup intro runs for as long as the Display Controller's intro does (endsAt), or until it is stopped
    if (introScene && (!introScene.endsAt || introScene.endsAt > Date.now())) {
      const dur = introScene.endsAt ? Math.max(1, (introScene.endsAt - introScene.startedAt) / 1000) : undefined;
      return { id: 'intro', team: { name: introScene.teamName }, start: introScene.startedAt, dur, key: `intro|${introScene.startedAt}|${introScene.endsAt || ''}` };
    }
    if (switchActive) return { id: 'switch', team: null, start: switchEvent.at, key: `switch|${switchEvent.matchId}|${switchEvent.at}` };
    if (mp) return { id: 'matchpoint', team: { name: mp.name }, dur: MATCH_POINT_SECONDS, key: `matchpoint|${mp.key}` };
    return { id: 'sponsors', team: null, key: 'sponsors' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drsPending, timeout?.team, toMillis(timeout?.startTime), introScene?.startedAt, introScene?.endsAt, mp?.key, switchActive, switchEvent?.at, liveMatch?.id]);

  // Rendering state lives in refs; the rAF loop reads them every frame
  const canvasRef = useRef(null);
  const sceneRef = useRef({ cur: { id: 'sponsors', team: null, start: Date.now() }, prev: null });
  const lastKeyRef = useRef('sponsors');
  const optRef = useRef({});

  useEffect(() => {
    if (target.key === lastKeyRef.current) return;
    lastKeyRef.current = target.key;
    const now = Date.now();
    // Use the shared start time when it is recent so every screen stays in sync
    const start = target.start && now - target.start < 5 * 60 * 1000 ? Math.min(target.start, now) : now;
    const sc = sceneRef.current;
    // A timed scene that already finished (e.g. stale intro) goes straight back to the sponsor loop
    const dur = target.dur || E.SCENES[target.id]?.dur;
    if (dur && now > start + dur * 1000) return;
    // Already back on the sponsor loop (a timed scene ran out): don't restart it
    if (target.id === 'sponsors' && sc.cur.id === 'sponsors') return;
    sceneRef.current = { prev: sc.cur, cur: { id: target.id, team: target.team, start: now - start > 1000 ? start : now, dur: target.dur } };
  }, [target]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    E.loadAssets(logoUrls).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoKey]);

  const layout = searchParams.get('layout') === 'strip' ? 'strip' : 'stacked';
  const logoSeconds = Number(searchParams.get('speed')) || 10;

  optRef.current = {
    logos: logoUrls,
    presenter: logoUrls[0] || null,
    fallbackText: tournamentName || 'Centre Court Pickleball League',
    logoSeconds,
    timeoutPads: Array(4).fill(TIMEOUT_PAD_FT * E.BOARD_W / SIDE_BOARD_FT),
  };

  useEffect(() => {
    if (!ready) return undefined;
    const master = document.createElement('canvas');
    const g = E.geometry();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const c = canvasRef.current;
      if (!c) return;
      const now = Date.now();
      sceneRef.current = E.advance(sceneRef.current, now);
      if (master.width !== g.P || master.height !== E.H) { master.width = g.P; master.height = E.H; }
      E.render(master.getContext('2d'), g, sceneRef.current, now, optRef.current);
      const strip = layout === 'strip';
      const W = strip ? g.P : Math.max(...g.w), Hh = strip ? E.H : E.H * 4;
      if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
      const ctx = c.getContext('2d');
      if (strip) { ctx.drawImage(master, 0, 0); return; }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 4; i++) ctx.drawImage(master, g.x[i], 0, g.w[i], E.H, 0, i * E.H, g.w[i], E.H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, layout]);

  useEffect(() => {
    document.title = `${isMain ? 'Main' : 'Side'} Court Perimeter`;
  }, [isMain]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', cursor: 'none' }}>
      <canvas ref={canvasRef} style={{ width: '100vw', height: 'auto', display: 'block' }} />
    </div>
  );
}
