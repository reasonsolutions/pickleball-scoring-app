import React, { useEffect, useRef, useState } from 'react';

import titleImage from '../assets/electric-streak/title.png';
import patternImage from '../assets/electric-streak/pattern.png';

// Length of one run of the Electric Streak animation
const DURATION_MS = 7000;

// Consecutive points by one team needed to trigger the animation
const STREAK_LENGTH = 3;

const getLiveScores = (match) => [
  match.scores?.player1?.game1 || match.scores?.player1?.total || match.team1Score || match.score1 || 0,
  match.scores?.player2?.game1 || match.scores?.player2?.total || match.team2Score || match.score2 || 0
];

// True for one animation run each time a team in the live match scores STREAK_LENGTH points in a row.
// The streak is tracked from score changes seen by this display, so a page load mid-match starts fresh.
export function useElectricStreakTrigger(match) {
  const [active, setActive] = useState(false);
  const trackRef = useRef({ matchId: null, scores: null, team: null, count: 0 });

  const isLive = match?.status === 'live' || match?.status === 'in_progress';
  const [score1, score2] = match ? getLiveScores(match) : [0, 0];

  useEffect(() => {
    const track = trackRef.current;
    if (!isLive) return;

    // New match (or first snapshot): just record the baseline
    if (track.matchId !== match.id || !track.scores) {
      trackRef.current = { matchId: match.id, scores: [score1, score2], team: null, count: 0 };
      return;
    }

    const [prev1, prev2] = track.scores;
    if (score1 === prev1 && score2 === prev2) return;
    track.scores = [score1, score2];

    const d1 = score1 - prev1;
    const d2 = score2 - prev2;
    // Only a single point for exactly one team extends a streak; undo/corrections reset it
    const scorer = d1 === 1 && d2 === 0 ? 1 : d2 === 1 && d1 === 0 ? 2 : null;
    if (!scorer) {
      track.team = null;
      track.count = 0;
      return;
    }

    track.count = track.team === scorer ? track.count + 1 : 1;
    track.team = scorer;
    if (track.count === STREAK_LENGTH) setActive(true);
  }, [isLive, match?.id, score1, score2]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(false), DURATION_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return active;
}

export default function ElectricStreakOverlay() {
  const L = DURATION_MS / 1000;
  const mask = {
    WebkitMaskImage: `url(${titleImage})`, maskImage: `url(${titleImage})`,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'
  };
  const box = { position: 'absolute', left: '14.7%', top: '22.2%', width: '70.63%', aspectRatio: '1356 / 579', pointerEvents: 'none' };
  const logoClip = 'inset(0 0 41% 0)';
  const textClip = 'inset(59% 0 0 0)';
  const textLayer = { position: 'absolute', inset: 0, clipPath: textClip, ...mask };

  const pattern = (left, anim) => (
    <div style={{ position: 'absolute', top: '24.4%', left, width: '35.94%', aspectRatio: '690 / 554', opacity: 0.1, animation: `${anim} ${L * 2}s ease-in-out infinite` }}>
      <img src={patternImage} alt="" style={{ width: '100%', display: 'block', filter: 'brightness(0)' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#1e1a33' }}>
      <style>{`
        @keyframes esPop{0%{transform:scale(.6);opacity:0;filter:blur(8px)}8%{transform:scale(1.04);opacity:1;filter:blur(0)}12%,90%{transform:scale(1);opacity:1;filter:blur(0)}100%{transform:scale(.9);opacity:0;filter:blur(6px)}}
        @keyframes esSlam{0%,6%{transform:translateX(-120%) skewX(-25deg);opacity:0;filter:blur(10px)}14%{transform:translateX(3%) skewX(8deg);opacity:1;filter:blur(0)}18%{transform:translateX(-1%) skewX(-2deg)}21%,90%{transform:none;opacity:1;filter:blur(0)}100%{transform:translateX(60%) skewX(-22deg);opacity:0;filter:blur(10px)}}
        @keyframes esFlicker{0%,20%{opacity:0}21%{opacity:1}23%{opacity:.1}25%{opacity:.9}28%,55%{opacity:0}56%{opacity:.8}57%{opacity:0}58%{opacity:.6}61%,100%{opacity:0}}
        @keyframes esSweep{0%,22%{background-position:150% 0}48%,100%{background-position:-50% 0}}
        @keyframes esShine{0%,30%{background-position:150% 0}60%,100%{background-position:-50% 0}}
        @keyframes esDriftL{0%,100%{transform:translateX(0)}50%{transform:translateX(1.2%)}}
        @keyframes esDriftR{0%,100%{transform:translateX(0)}50%{transform:translateX(-1.2%)}}
      `}</style>
      <div style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9', overflow: 'hidden', background: '#5C50A2' }}>
        {pattern('-18%', 'esDriftL')}
        {pattern('82.3%', 'esDriftR')}

        <div style={{ ...box, transformOrigin: '50% 30%', animation: `esPop ${L}s cubic-bezier(.2,.8,.2,1) 1 both` }}>
          <img src={titleImage} alt="KLR Transformers" style={{ position: 'absolute', inset: 0, width: '100%', clipPath: logoClip }} />
          <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(4% 25% 47% 25%)', ...mask, background: 'linear-gradient(105deg, transparent 42%, rgba(255,226,196,.4) 46%, rgba(255,240,220,.95) 50%, rgba(255,226,196,.4) 54%, transparent 58%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat', animation: `esShine ${L}s ease-in-out 1 both` }} />
        </div>

        <div style={{ ...box, animation: `esSlam ${L}s cubic-bezier(.2,.8,.2,1) 1 both` }}>
          <div style={{ ...textLayer, background: '#B7E3FF', filter: 'blur(1.2vw)', animation: `esFlicker ${L}s linear 1 both` }} />
          <img src={titleImage} alt="Electric Streak" style={{ position: 'absolute', inset: 0, width: '100%', clipPath: textClip }} />
          <div style={{ ...textLayer, background: 'linear-gradient(110deg, transparent 44%, #8FD3FF 48%, #FFFFFF 50%, #8FD3FF 52%, transparent 56%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat', animation: `esSweep ${L}s ease-in-out 1 both` }} />
        </div>
      </div>
    </div>
  );
}
