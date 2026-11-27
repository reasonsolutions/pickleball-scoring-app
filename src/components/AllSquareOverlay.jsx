import React, { useEffect, useRef, useState } from 'react';

import bgImage from '../assets/all-square/bg.png';
import starImage from '../assets/all-square/star.png';
import leagueLogo from '../assets/title-sponsor/league-logo.png';
import titleImage from '../assets/all-square/title.png';

// Length of one run of the All Square animation
const DURATION_MS = 5000;

const getLiveScores = (match) => [
  match.scores?.player1?.game1 || match.scores?.player1?.total || match.team1Score || match.score1 || 0,
  match.scores?.player2?.game1 || match.scores?.player2?.total || match.team2Score || match.score2 || 0
];

// Ties only count once both teams are above this score (8-8 and up)
const MIN_TIED_SCORE = 7;

// True for one animation run each time the live match reaches a new tied score above MIN_TIED_SCORE
export function useAllSquareTrigger(match) {
  const [active, setActive] = useState(false);
  const lastTieRef = useRef(null);

  const isLive = match?.status === 'live' || match?.status === 'in_progress';
  const [score1, score2] = match ? getLiveScores(match) : [0, 0];
  const tieKey = isLive && score1 > MIN_TIED_SCORE && score1 === score2 ? `${match.id}:${score1}` : null;

  useEffect(() => {
    if (!tieKey || tieKey === lastTieRef.current) return;
    lastTieRef.current = tieKey;
    setActive(true);
  }, [tieKey]);

  useEffect(() => {
    if (!active) return;
    // Small buffer so the second title line (delayed 0.12s) finishes its exit
    const timer = setTimeout(() => setActive(false), DURATION_MS + 200);
    return () => clearTimeout(timer);
  }, [active]);

  return active;
}

export default function AllSquareOverlay() {
  const line = (clip, anim, delay) => (
    <img
      src={titleImage}
      alt=""
      style={{ position: 'absolute', inset: 0, width: '100%', clipPath: clip, animation: `${anim} ${DURATION_MS / 1000}s cubic-bezier(.2,.8,.2,1) ${delay}s 1 both` }}
    />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#1e1e1e' }}>
      <style>{`
        @keyframes allSquareKtL{0%{transform:translateX(-140%) skewX(-25deg);filter:blur(8px);opacity:0}6%{transform:translateX(4%) skewX(-8deg);filter:blur(0);opacity:1}9%,88%{transform:translateX(0) skewX(0);filter:blur(0);opacity:1}94%,100%{transform:translateX(140%) skewX(-25deg);filter:blur(8px);opacity:0}}
        @keyframes allSquareKtR{0%{transform:translateX(140%) skewX(-25deg);filter:blur(8px);opacity:0}6%{transform:translateX(-4%) skewX(-8deg);filter:blur(0);opacity:1}9%,88%{transform:translateX(0) skewX(0);filter:blur(0);opacity:1}94%,100%{transform:translateX(-140%) skewX(-25deg);filter:blur(8px);opacity:0}}
        @keyframes allSquareStarSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9', overflow: 'hidden', background: `#2E2F7A url(${bgImage}) center / cover no-repeat` }}>
        <div style={{ position: 'absolute', left: '-21.67%', top: '64.5%', width: '43.44%', pointerEvents: 'none' }}>
          <img src={starImage} alt="" style={{ width: '100%', display: 'block', transformOrigin: '50% 50%', animation: 'allSquareStarSpin 20s linear infinite' }} />
        </div>
        <img
          src={leagueLogo}
          alt="Terminus Centre Court Pickleball League HYD"
          style={{ position: 'absolute', left: '40.36%', top: '6.2%', width: '19.11%' }}
        />
        <div style={{ position: 'absolute', left: '34.9%', top: '49.9%', width: '30.26%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <img src={titleImage} alt="All Square.." style={{ width: '100%', display: 'block', visibility: 'hidden' }} />
            {line('inset(0 0 50% 0)', 'allSquareKtL', 0)}
            {line('inset(50% 0 0 0)', 'allSquareKtR', 0.12)}
          </div>
        </div>
      </div>
    </div>
  );
}
