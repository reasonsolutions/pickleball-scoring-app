import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import eventLogo from '../assets/terminus-ccpl-hyd.png';

// Seconds each player is featured. The remote uses this to know when an intro has finished.
export const INTRO_SECONDS_PER_PLAYER = 5;
const FADE_MS = 600;

// Total on-screen time for a lineup of `playerCount` players (fade in/out included)
export const introDurationMs = (playerCount) =>
  Math.max(playerCount, 1) * INTRO_SECONDS_PER_PLAYER * 1000 + FADE_MS * 2;

// Ignore intros triggered long ago, e.g. when a display is reloaded hours later
const MAX_SCENE_AGE_MS = 5 * 60 * 1000;

// Returns the scene if it is a lineup intro that should play now, otherwise null
export const pickIntroScene = (scene) =>
  scene && scene.type?.startsWith('intro_') && scene.teamName && Date.now() - (scene.startedAt || 0) < MAX_SCENE_AGE_MS
    ? scene
    : null;

const photoOf = (player) =>
  typeof player.photo === 'string' ? player.photo : (player.photo?.url || player.photoUrl || null);

const actionPhotoOf = (player) =>
  typeof player.actionPhoto === 'string' ? player.actionPhoto : (player.actionPhoto?.url || null);

const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();


// Load a team (by id, else by name within the tournament) and its roster, captain first
async function loadLineup({ teamId, teamName, tournamentId }) {
  let team = null;
  if (teamId) {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (snap.exists()) team = { id: snap.id, ...snap.data() };
  }
  if (!team) {
    const snap = await getDocs(query(collection(db, 'teams'), where('name', '==', teamName)));
    const teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    team = teams.find(t => t.tournamentId === tournamentId) || teams[0] || null;
  }
  if (!team) return { team: { name: teamName }, players: [] };

  const playerDocs = await Promise.all((team.playerIds || []).map(id => getDoc(doc(db, 'players', id))));
  const players = playerDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
  const captainIndex = players.findIndex(p => p.id === team.captain);
  if (captainIndex > 0) players.unshift(players.splice(captainIndex, 1)[0]);

  return {
    team,
    players: players.map((p, i) => {
      const name = p.name || 'Unknown Player';
      return {
        id: p.id,
        number: String(i + 1).padStart(2, '0'),
        name,
        initials: initialsOf(name),
        captain: p.id === team.captain,
        photo: photoOf(p),
        actionPhoto: actionPhotoOf(p),
        video: p.actionVideo?.url || null,
        poster: p.actionVideo?.thumbnailUrl || null,
      };
    }),
  };
}

// Scale a fixed 1920x1080 stage to fit the screen
function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

// The colour wipe fully covers the panel at 45% of its .8s run; the next player is revealed from then
const WIPE_COVER_MS = 360;

/**
 * Player action video. Starts from the first frame only once the player is revealed,
 * plays once, and holds on the last frame if the clip is shorter than the player's slot.
 */
function PlayerVideo({ src, poster, delayMs }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    const t = setTimeout(() => {
      video.play().catch(err => console.warn('Player video could not autoplay:', err));
    }, delayMs);
    return () => clearTimeout(t);
  }, [src, delayMs]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster || undefined}
      muted
      playsInline
      preload="auto"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

const panel = {
  borderRadius: 24,
  background: 'rgba(22,22,22,.85)',
  border: '1px solid rgba(255,255,255,.16)',
  boxShadow: '0 24px 70px rgba(0,0,0,.5)',
};

/**
 * Full-screen "Starting Lineup" intro for one team. Steps through every player once,
 * then fades out and calls onDone. Rendered in a portal above everything on the display.
 */
export default function LineupIntro({ scene, tournamentId, onDone }) {
  const scale = useStageScale();
  const [lineup, setLineup] = useState(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    setLineup(null);
    setIndex(0);
    setLeaving(false);
    loadLineup({ teamId: scene.teamId, teamName: scene.teamName, tournamentId })
      .then(result => { if (!cancelled) setLineup(result); })
      .catch(err => {
        console.error('Error loading lineup:', err);
        if (!cancelled) setLineup({ team: { name: scene.teamName }, players: [] });
      });
    return () => { cancelled = true; };
  }, [scene.startedAt, scene.teamId, scene.teamName, tournamentId]);

  // Advance through players, then fade out
  useEffect(() => {
    if (!lineup) return;
    const total = Math.max(lineup.players.length, 1);
    const t = setTimeout(() => {
      if (index + 1 < total) setIndex(index + 1);
      else setLeaving(true);
    }, INTRO_SECONDS_PER_PLAYER * 1000);
    return () => clearTimeout(t);
  }, [lineup, index]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => onDoneRef.current?.(), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!lineup) return null;

  const { team, players } = lineup;
  const count = players.length;
  const current = players[index];
  const dur = INTRO_SECONDS_PER_PLAYER;

  const stage = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000, overflow: 'hidden',
        background: '#0b0a10', display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: `li-fade ${FADE_MS}ms ease ${leaving ? 'reverse forwards' : 'both'}`,
        fontFamily: "'Schibsted Grotesk', sans-serif",
      }}
    >
      <style>{`
        @keyframes li-fade{from{opacity:0}to{opacity:1}}
        @keyframes li-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes li-wipe{0%{transform:translateX(-101%)}45%{transform:translateX(0)}55%{transform:translateX(0)}100%{transform:translateX(101%)}}
        @keyframes li-nameIn{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes li-drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4%,-3%) scale(1.12)}}
        @keyframes li-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Ambient glows */}
      <div style={{ position: 'absolute', width: '60vw', height: '60vw', left: '-15vw', top: '-25vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(228,126,72,.28), transparent 65%)', animation: 'li-drift 14s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '55vw', height: '55vw', right: '-15vw', bottom: '-25vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(98,0,230,.32), transparent 65%)', animation: 'li-drift 18s ease-in-out infinite reverse' }} />

      <div style={{ position: 'relative', flex: 'none', width: 1920, height: 1080, transform: `scale(${scale})`, color: '#fff' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 28, height: '100%', padding: '48px 56px', boxSizing: 'border-box' }}>

          {/* Header */}
          <div style={{ ...panel, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 28, padding: '18px 32px 18px 20px', animation: 'li-rise .7s cubic-bezier(.2,.8,.2,1) both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, minWidth: 0 }}>
              {(team.logo?.url || team.logoUrl) && (
                <img src={team.logo?.url || team.logoUrl} alt="" style={{ flex: 'none', height: 72, width: 72, objectFit: 'contain' }} />
              )}
              <div style={{ minWidth: 0, font: "900 56px/1 'Unbounded',sans-serif", letterSpacing: '-.035em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {team.name || scene.teamName}
              </div>
            </div>
            <img src={eventLogo} alt="Terminus CCPL HYD" style={{ height: 84, width: 'auto', objectFit: 'contain' }} />
            <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 18, font: "800 22px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.78)', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#F2B48F' }}>
                {count ? `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}` : 'TBA'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '640px minmax(0,1fr)', gap: 28, minHeight: 0 }}>

            {/* Roster */}
            <div style={{ ...panel, position: 'relative', display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden', animation: 'li-rise .7s .12s cubic-bezier(.2,.8,.2,1) both' }}>
              {count > 0 && (
                <div
                  style={{
                    position: 'absolute', left: 20, right: 20, borderRadius: 16, overflow: 'hidden',
                    top: `calc(20px + (100% - 40px) * ${index / count})`,
                    height: `calc((100% - 40px) / ${count})`,
                    background: 'linear-gradient(90deg,#E47E48,#C2652F)',
                    boxShadow: '0 0 50px rgba(228,126,72,.55)',
                    transition: 'top .55s cubic-bezier(.7,0,.2,1)',
                  }}
                >
                  <div key={`pg${index}`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(26,26,26,.55)', transformOrigin: 'left', animation: `li-fill ${dur}s linear forwards` }} />
                </div>
              )}
              {count === 0 && (
                <div style={{ margin: 'auto', font: "800 26px/1.4 'Schibsted Grotesk',sans-serif", letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
                  Lineup to be announced
                </div>
              )}
              {players.map((p, k) => {
                const on = k === index;
                return (
                  <div key={p.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flex: '1 1 0', minHeight: 0, padding: '0 26px', boxSizing: 'border-box' }}>
                    <div style={{ flex: 'none', width: 76, font: `900 ${count > 12 ? 30 : 40}px/1 'Unbounded',sans-serif`, letterSpacing: '-.04em', textAlign: 'right', color: on ? '#1a1a1a' : '#F2B48F', transition: 'color .3s' }}>{p.number}</div>
                    <div style={{ flex: 1, minWidth: 0, font: `800 ${count > 12 ? 28 : 38}px/1 'Schibsted Grotesk',sans-serif`, textTransform: 'uppercase', letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: on ? '#1a1a1a' : '#fff', transition: 'color .3s' }}>{p.name}</div>
                    {p.captain && (
                      <div style={{ flex: 'none', font: "700 18px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.18em', textTransform: 'uppercase', color: on ? '#1a1a1a' : '#B18CFF', transition: 'color .3s' }}>C</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Featured player */}
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#262626', border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 24px 70px rgba(0,0,0,.5),0 0 80px rgba(98,0,230,.25)', animation: 'li-rise .7s .24s cubic-bezier(.2,.8,.2,1) both' }}>
              {current?.video ? (
                <PlayerVideo
                  key={`v${index}`}
                  src={current.video}
                  poster={current.poster || current.actionPhoto || current.photo}
                  delayMs={index > 0 ? WIPE_COVER_MS : 0}
                />
              ) : current?.actionPhoto ? (
                <img
                  key={`ap${index}`}
                  src={current.actionPhoto}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                />
              ) : current?.photo ? (
                <img
                  key={`ph${index}`}
                  src={current.photo}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', animation: `li-drift ${dur * 2}s ease-in-out infinite` }}
                />
              ) : (
                <div key={`ph${index}`} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'repeating-linear-gradient(135deg,#2b2b2b 0 22px,#262626 22px 44px)' }}>
                  <div style={{ marginTop: -160, font: "900 320px/1 'Unbounded',sans-serif", letterSpacing: '-.06em', color: 'rgba(255,255,255,.08)' }}>
                    {current?.initials || (team.name || scene.teamName).slice(0, 2).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Warm up the next player's clip so it can start the instant they are revealed */}
              {players[index + 1]?.video && (
                <video key={`pre${index + 1}`} src={players[index + 1].video} preload="auto" muted playsInline style={{ display: 'none' }} />
              )}

              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, background: 'linear-gradient(180deg,rgba(26,26,26,0),rgba(26,26,26,.92))', pointerEvents: 'none' }} />

              {current && (
                <div key={`np${index}`} style={{ position: 'absolute', left: 56, right: 56, bottom: 48, display: 'flex', alignItems: 'flex-end', gap: 32, animation: 'li-nameIn .6s .35s cubic-bezier(.2,.8,.2,1) both' }}>
                  <div style={{ font: "900 200px/1 'Unbounded',sans-serif", letterSpacing: '-.07em', padding: '0 .08em 0 0', marginBottom: -28, background: 'linear-gradient(180deg,#fff 25%,#F2B48F 70%,#B18CFF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    {current.number}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 6, minWidth: 0 }}>
                    {current.captain && (
                      <div style={{ font: "800 22px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.24em', textTransform: 'uppercase', color: '#F2B48F' }}>
                        Captain
                      </div>
                    )}
                    <div style={{ font: "900 72px/1 'Unbounded',sans-serif", letterSpacing: '-.035em', textTransform: 'uppercase', textWrap: 'balance' }}>
                      {current.name}
                    </div>
                  </div>
                </div>
              )}

              {/* Colour wipe between players (skipped for the first) */}
              {index > 0 && (
                <div key={`w${index}`} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#6200E6,#E47E48)', transform: 'translateX(101%)', animation: 'li-wipe .8s cubic-bezier(.7,0,.3,1)', pointerEvents: 'none' }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(stage, document.body);
}
