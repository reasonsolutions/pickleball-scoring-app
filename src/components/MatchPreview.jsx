import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import paddleLogo from '../assets/paddle.png';
import leagueLogo from '../assets/terminus-ccpl-stacked.png';

// Shown on the main display between matches: the fixture's two teams and its match lineup

const [C1, C2, C3, C4] = ['#E47E48', '#6200E6', '#B18CFF', '#333333'];

const label = (l) => (l === 'Dream Breaker' ? 'Game Breaker' : l || 'Match');
const isBreaker = (m) => m.matchTypeLabel === 'Game Breaker' || m.matchTypeLabel === 'Dream Breaker';
const playersOf = (m, side) => [m[`player1${side}`], m[`player2${side}`]].filter(Boolean).join(' / ') || 'TBD';
const scoreOf = (m, p) => m.scores?.[p]?.game1 || m.scores?.[p]?.total || 0;

const formatDay = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

// Action photo of a player (fixtures store player names), preferring this tournament's player
async function loadActionPhoto(name, tournamentId) {
  const snap = await getDocs(query(collection(db, 'players'), where('name', '==', name)));
  const players = snap.docs.map(d => d.data()).filter(p => p.actionPhoto?.url);
  const player = players.find(p => p.tournamentId === tournamentId) || players[0];
  return player ? player.actionPhoto.url : null;
}

// Action photos for every player on a side, skipping players without one
const loadSidePhotos = (names, tournamentId) =>
  Promise.all(names.map(n => loadActionPhoto(n, tournamentId).catch(() => null))).then(urls => urls.filter(Boolean));

const rnd = (s) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

export default function MatchPreview({ tournamentId, dateString, team1Name, team2Name, team1Logo, team2Logo, matches, nextMatch, records, scale }) {
  const [photos, setPhotos] = useState({});

  const sideA = [nextMatch?.player1Team1, nextMatch?.player2Team1].filter(Boolean);
  const sideB = [nextMatch?.player1Team2, nextMatch?.player2Team2].filter(Boolean);
  const sideAKey = sideA.join('|');
  const sideBKey = sideB.join('|');
  useEffect(() => {
    let cancelled = false;
    setPhotos({});
    Promise.all([sideA, sideB].map(names => loadSidePhotos(names, tournamentId)))
      .then(([a, b]) => { if (!cancelled) setPhotos({ a, b }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideAKey, sideBKey, tournamentId]);

  // The Game Breaker only appears in the lineup once it is actually going to be played
  const lineup = matches.filter(m => !isBreaker(m) || m.id === nextMatch?.id || m.status === 'completed');
  const started = matches.some(m => m.status === 'completed');
  const pill = started
    ? `Up next: ${label(nextMatch?.matchTypeLabel)}`
    : `${lineup.length} ${lineup.length === 1 ? 'match' : 'matches'} · Up first: ${label(nextMatch?.matchTypeLabel)}`;

  const venue = nextMatch?.venueName || '';
  const compact = lineup.length > 5;

  // Players stand side by side at their team's edge of the screen, the outer one slightly behind
  const sidePhotos = (side) => {
    const urls = photos[side] || [];
    if (urls.length === 0) return null;
    const home = side === 'a';
    const glow = home ? 'rgba(228,126,72,.55)' : 'rgba(177,140,255,.5)';
    const pair = urls.length > 1;
    return (
      <div style={{ position: 'absolute', zIndex: 0, [home ? 'left' : 'right']: pair ? -170 : 16, bottom: -24, display: 'flex', flexDirection: home ? 'row' : 'row-reverse', alignItems: 'flex-end', pointerEvents: 'none' }}>
        {urls.map((url, i) => (
          <img
            key={url + i}
            src={url}
            alt=""
            style={{ position: 'relative', zIndex: i, height: pair ? (i === 0 ? 740 : 790) : 820, ...(pair ? { width: i === 0 ? 666 : 711 } : { maxWidth: 640 }), objectFit: 'contain', objectPosition: pair ? 'bottom center' : home ? 'bottom left' : 'bottom right', [home ? 'marginLeft' : 'marginRight']: i > 0 ? -390 : 0, filter: `drop-shadow(${home ? 28 : -28}px 0 60px rgba(0,0,0,.7)) drop-shadow(${home ? -18 : 18}px 0 70px ${glow}) contrast(1.12) saturate(.9) brightness(1.02)` }}
          />
        ))}
      </div>
    );
  };

  const blob = (key, bg, w, h, x, y, anim, blur) => (
    <div key={key} style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: '50%', background: bg, filter: `blur(${blur}px)`, animation: anim, willChange: 'transform', mixBlendMode: 'screen' }} />
  );

  const teamCard = (side) => {
    const home = side === 'a';
    const accent = home ? C1 : C3;
    const logo = (
      <div style={{ flex: 'none', width: 100, height: 100, borderRadius: 20, padding: 4, boxSizing: 'border-box', background: home ? `linear-gradient(135deg,${C1},${C2})` : `linear-gradient(135deg,${C3},${C1})`, boxShadow: `0 0 50px ${home ? 'rgba(228,126,72,.45)' : 'rgba(177,140,255,.45)'}` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', background: '#262626' }}>
          <img src={(home ? team1Logo : team2Logo) || paddleLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
    );
    const meta = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: home ? 'flex-start' : 'flex-end', gap: 10, minWidth: 0 }}>
        {records?.[home ? team1Name : team2Name] && (
          <div style={{ flex: 'none', whiteSpace: 'nowrap', font: "800 17px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.16em', textTransform: 'uppercase', color: home ? '#F2B48F' : '#D4BEFF' }}>{records[home ? team1Name : team2Name]}</div>
        )}
        <div style={{ font: "900 42px/1 'Unbounded',sans-serif", textTransform: 'uppercase', letterSpacing: '-.035em', textWrap: 'balance', filter: `drop-shadow(0 0 26px ${home ? 'rgba(228,126,72,.45)' : 'rgba(177,140,255,.4)'})` }}>{home ? team1Name : team2Name}</div>
      </div>
    );
    return (
      <div style={{ position: 'absolute', [home ? 'left' : 'right']: -24, top: -12, width: 540, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 20, textAlign: home ? 'left' : 'right', padding: home ? '14px 24px 14px 14px' : '14px 14px 14px 24px', borderRadius: 28, background: 'rgba(22,22,22,.8)', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(10px)', boxShadow: `0 24px 70px rgba(0,0,0,.6),0 0 60px ${accent}2e` }}>
        {home ? <>{logo}{meta}</> : <>{meta}{logo}</>}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Schibsted Grotesk', sans-serif" }}>
      <style>{`
        @keyframes mp-drift1{0%{transform:translate(-8%,-6%) rotate(-12deg) scale(1)}50%{transform:translate(6%,4%) rotate(-6deg) scale(1.15)}100%{transform:translate(-8%,-6%) rotate(-12deg) scale(1)}}
        @keyframes mp-drift2{0%{transform:translate(10%,8%) rotate(14deg) scale(1.1)}50%{transform:translate(-6%,-4%) rotate(20deg) scale(0.95)}100%{transform:translate(10%,8%) rotate(14deg) scale(1.1)}}
        @keyframes mp-drift3{0%{transform:translate(0,0) scale(1);opacity:.9}50%{transform:translate(-4%,6%) scale(1.25);opacity:.6}100%{transform:translate(0,0) scale(1);opacity:.9}}
        @keyframes mp-bolt{0%,7%,13%,100%{opacity:0}8%{opacity:.95}9%{opacity:.15}10%{opacity:.8}11%{opacity:.2}12%{opacity:.7}}
        @keyframes mp-rays{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        @keyframes mp-corePulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes mp-arcSpin{0%{transform:rotate(0)}100%{transform:rotate(-360deg)}}
        @keyframes mp-flickerText{0%,100%{filter:drop-shadow(0 0 26px rgba(228,126,72,.75))}47%{filter:drop-shadow(0 0 26px rgba(228,126,72,.75))}48%{filter:drop-shadow(0 0 70px rgba(255,255,255,.95))}50%{filter:drop-shadow(0 0 10px rgba(228,126,72,.4))}52%{filter:drop-shadow(0 0 60px rgba(255,255,255,.8))}}
        @keyframes mp-spark{0%{transform:translateY(0) scale(1);opacity:0}12%{opacity:1}100%{transform:translateY(-620px) scale(.3);opacity:0}}
        @keyframes mp-strobe{0%,100%{opacity:.18}50%{opacity:.55}}
        @keyframes mp-nextpulse{0%,100%{box-shadow:0 0 0 0 rgba(228,126,72,.6)}50%{box-shadow:0 0 0 10px rgba(228,126,72,0)}}
      `}</style>

      <div style={{ position: 'relative', flex: 'none', width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'center center', overflow: 'hidden', background: '#1a1a1a', color: '#fff' }}>
        {/* Animated backdrop */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `radial-gradient(ellipse at 50% 100%, ${C4} 0%, #1a1a1a 70%)` }}>
          {blob('b1', `radial-gradient(ellipse at center, ${C1} 0%, transparent 65%)`, 1400, 700, -200, -150, 'mp-drift1 14s ease-in-out infinite', 70)}
          {blob('b2', `radial-gradient(ellipse at center, ${C2} 0%, transparent 65%)`, 1500, 800, 700, 350, 'mp-drift2 18s ease-in-out infinite', 80)}
          {blob('b3', `radial-gradient(ellipse at center, ${C3} 0%, transparent 60%)`, 700, 350, 1200, -100, 'mp-drift3 11s ease-in-out infinite', 60)}
          {blob('b4', `radial-gradient(ellipse at center, ${C1} 0%, transparent 60%)`, 900, 400, 300, 750, 'mp-drift3 16s ease-in-out infinite reverse', 70)}
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '46%', width: 1500, height: 1500, margin: '-750px 0 0 -750px', background: 'repeating-conic-gradient(from 0deg,rgba(255,255,255,.09) 0deg 3deg,transparent 3deg 12deg)', maskImage: 'radial-gradient(circle,rgba(0,0,0,.9) 0%,transparent 62%)', WebkitMaskImage: 'radial-gradient(circle,rgba(0,0,0,.9) 0%,transparent 62%)', animation: 'mp-rays 70s linear infinite', pointerEvents: 'none' }} />

        <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', mixBlendMode: 'screen' }}>
          <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" opacity=".9">
            <polyline points="960,-20 905,180 1000,240 880,470 985,520 900,760" style={{ filter: 'drop-shadow(0 0 18px #6200E6)', animation: 'mp-bolt 6.5s linear infinite' }} />
            <polyline points="330,0 385,150 300,215 400,330" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 16px #E47E48)', animation: 'mp-bolt 5.1s linear infinite 1.7s' }} />
            <polyline points="1620,0 1560,170 1655,235 1575,360" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 16px #B18CFF)', animation: 'mp-bolt 7.3s linear infinite 3.1s' }} />
            <polyline points="120,1080 175,900 90,830 190,700" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 14px #6200E6)', animation: 'mp-bolt 8.2s linear infinite 2.4s' }} />
            <polyline points="1810,1080 1745,905 1830,835 1750,720" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 14px #E47E48)', animation: 'mp-bolt 6.9s linear infinite 4.6s' }} />
          </g>
        </svg>

        {/* Rising sparks */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'screen' }}>
          {Array.from({ length: 26 }, (_, i) => {
            const size = 3 + rnd(i + 1) * 5;
            const col = [C1, C3, '#fff'][i % 3];
            return (
              <span key={i} style={{ position: 'absolute', left: `${rnd(i + 11) * 100}%`, bottom: `${-5 + rnd(i + 31) * 25}%`, width: size, height: size, borderRadius: '50%', background: col, boxShadow: `0 0 ${10 + size * 3}px ${col}`, opacity: 0, animation: `mp-spark ${7 + rnd(i + 51) * 8}s linear infinite`, animationDelay: `${rnd(i + 71) * 9}s` }} />
            );
          })}
        </div>

        {sidePhotos('a')}
        {sidePhotos('b')}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, background: 'linear-gradient(180deg,rgba(26,26,26,0),rgba(26,26,26,.82) 55%,rgba(26,26,26,.97))', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.55) 30%,rgba(255,255,255,.15) 70%,transparent)', boxShadow: '0 0 40px rgba(98,0,230,.9)', animation: 'mp-strobe 3.4s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px)', mixBlendMode: 'overlay', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'grid', gridTemplateRows: '1fr auto', height: '100%', width: '100%', padding: '44px 72px', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,760px)', justifyContent: 'center', alignContent: 'center', gap: 26, padding: '150px 0 24px' }}>
            {teamCard('a')}
            {/* League logo, centred between the team cards (which are 128px tall from top -12) */}
            <img src={leagueLogo} alt="Terminus Centre Court Pickleball League HYD" style={{ position: 'absolute', left: '50%', top: 52, height: 144, transform: 'translate(-50%,-50%)', filter: 'drop-shadow(0 0 30px rgba(0,0,0,.6)) drop-shadow(0 0 40px rgba(228,126,72,.25))', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, height: 150 }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 520, height: 520, margin: '-260px 0 0 -260px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.32) 0%,rgba(98,0,230,.32) 35%,transparent 70%)', filter: 'blur(10px)', animation: 'mp-corePulse 2.8s ease-in-out infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 400, height: 400, margin: '-200px 0 0 -200px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,.26)', animation: 'mp-arcSpin 26s linear infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', flex: 'none', height: 4, width: 150, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.75))', boxShadow: '0 0 24px rgba(228,126,72,.9)' }} />
              <div style={{ position: 'relative', flex: 'none', font: "900 144px/1 'Unbounded',sans-serif", letterSpacing: '-.07em', padding: '.06em .12em .06em .05em', margin: '-.16em 0', background: 'linear-gradient(180deg,#fff 25%,#F2B48F 70%,#B18CFF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'mp-flickerText 4.6s ease-in-out infinite' }}>VS</div>
              <div style={{ position: 'relative', flex: 'none', height: 4, width: 150, background: 'linear-gradient(90deg,rgba(255,255,255,.75),transparent)', boxShadow: '0 0 24px rgba(177,140,255,.9)' }} />
            </div>

            {teamCard('b')}

            <div style={{ justifySelf: 'center', padding: '13px 30px', borderRadius: 14, background: 'linear-gradient(180deg,rgba(20,20,20,.92),rgba(38,38,38,.92))', border: '1px solid rgba(255,255,255,.16)', font: "700 20px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.22em', textTransform: 'uppercase', color: '#D4BEFF', whiteSpace: 'nowrap', boxShadow: 'inset 0 0 50px rgba(98,0,230,.4)' }}>{pill}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {lineup.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${lineup.length},minmax(0,1fr))`, gap: compact ? 14 : 20 }}>
                {lineup.map((m) => {
                  const done = m.status === 'completed';
                  const next = m.id === nextMatch?.id;
                  const a = scoreOf(m, 'player1');
                  const b = scoreOf(m, 'player2');
                  const nameFont = `800 ${compact ? 21 : 26}px/1.25 'Schibsted Grotesk',sans-serif`;
                  return (
                    <div key={m.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: compact ? '14px 16px' : '16px 20px', borderRadius: 18, minWidth: 0, opacity: done ? 0.6 : 1, background: next ? 'linear-gradient(180deg,rgba(228,126,72,.22),rgba(98,0,230,.12))' : 'linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.025))', border: `1px solid ${next ? 'rgba(242,180,143,.7)' : 'rgba(255,255,255,.16)'}`, boxShadow: next ? '0 20px 60px rgba(0,0,0,.5),0 0 50px rgba(228,126,72,.35),inset 0 1px 0 rgba(255,255,255,.3)' : '0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2)', backdropFilter: 'blur(8px)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ font: `700 ${compact ? 20 : 24}px/1.05 'Unbounded',sans-serif`, letterSpacing: '.02em', textTransform: 'uppercase', minWidth: 0, background: 'linear-gradient(90deg,#F2B48F,#D4BEFF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{label(m.matchTypeLabel)}</div>
                        {(next || done) && (
                          <div style={{ flex: 'none', font: "800 14px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.2em', textTransform: 'uppercase', padding: '7px 10px', borderRadius: 999, background: next ? C1 : 'rgba(255,255,255,.12)', color: next ? '#1a1a1a' : 'rgba(255,255,255,.85)', animation: next ? 'mp-nextpulse 1.8s ease-in-out infinite' : 'none' }}>{next ? 'Up next' : `${a}–${b}`}</div>
                        )}
                      </div>
                      <div style={{ font: nameFont, color: '#fff', textWrap: 'balance' }}>{playersOf(m, 'Team1')}</div>
                      <div style={{ font: "800 20px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>vs</div>
                      <div style={{ font: nameFont, color: '#fff', textWrap: 'balance' }}>{playersOf(m, 'Team2')}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', gap: 28, font: "800 22px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.78)' }}>
              <span style={{ whiteSpace: 'nowrap' }}>{formatDay(dateString)}</span>
              {venue && <span style={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', background: C1 }} />}
              {venue && <span style={{ whiteSpace: 'nowrap' }}>{venue}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
