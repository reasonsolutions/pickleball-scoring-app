import React, { useEffect, useRef, useState } from 'react';

import bgImage from '../assets/match-point/bg.png';
import patternImage from '../assets/match-point/pattern.png';
import terminusLogo from '../assets/match-point/terminus.png';
import titleImage from '../assets/match-point/title.png';

// Length of one run of the Pointe of the Match animation
const DURATION_MS = 5000;

// Score the serving team must be on (or past, when leading after a tie) for match point
const MATCH_POINT_SCORE = 14;
const GAME_BREAKER_MATCH_POINT_SCORE = 24;

const isGameBreaker = (match) =>
  match.matchType === 'dreamBreaker' || match.matchTypeLabel === 'Game Breaker' || match.matchTypeLabel === 'Dream Breaker';

const getLiveScores = (match) => [
  match.scores?.player1?.game1 || match.scores?.player1?.total || match.team1Score || match.score1 || 0,
  match.scores?.player2?.game1 || match.scores?.player2?.total || match.team2Score || match.score2 || 0
];

// True for one animation run each time the serving team in the live match reaches match point:
// on 14 (24 in a Game Breaker) or more, and ahead of the other team (so 14-14 is not, 15-14 is).
export function useMatchPointTrigger(match) {
  const [active, setActive] = useState(false);
  const lastKeyRef = useRef(null);

  const isLive = match?.status === 'live' || match?.status === 'in_progress';
  const [score1, score2] = match ? getLiveScores(match) : [0, 0];
  const serving = match?.servingPlayer;
  let key = null;
  if (isLive && (serving === 'player1' || serving === 'player2')) {
    const [own, other] = serving === 'player1' ? [score1, score2] : [score2, score1];
    const target = isGameBreaker(match) ? GAME_BREAKER_MATCH_POINT_SCORE : MATCH_POINT_SCORE;
    if (own >= target && own > other) key = `${match.id}:${score1}-${score2}:${serving}`;
  }

  useEffect(() => {
    // Clearing on a side-out lets it play again when the serve comes back at match point
    if (!key) {
      lastKeyRef.current = null;
      return;
    }
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    setActive(true);
  }, [key]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(false), DURATION_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return active;
}

export default function MatchPointOverlay() {
  const L = DURATION_MS / 1000;
  const mask = (u) => ({
    WebkitMaskImage: `url(${u})`, maskImage: `url(${u})`,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'
  });
  // title.png (1097x122) holds both words. Each word is cropped out of it on its own, and the sizes
  // are swapped: "THE POINTE" is drawn at the letter height "OF THE MATCH" has in the image (120px)
  // and "OF THE MATCH" at the letter height "THE POINTE" has (52px).
  const IMG_W = 1097, IMG_H = 122;
  const crop = (sx, sy, sw, sh) => {
    const size = `${(IMG_W / sw) * 100}% ${(IMG_H / sh) * 100}%`;
    const pos = `${sw === IMG_W ? 0 : (sx / (IMG_W - sw)) * 100}% ${sh === IMG_H ? 0 : (sy / (IMG_H - sh)) * 100}%`;
    return {
      aspectRatio: `${sw} / ${sh}`, pointerEvents: 'none',
      img: { backgroundImage: `url(${titleImage})`, backgroundSize: size, backgroundPosition: pos, backgroundRepeat: 'no-repeat' },
      mask: {
        WebkitMaskImage: `url(${titleImage})`, maskImage: `url(${titleImage})`,
        WebkitMaskSize: size, maskSize: size, WebkitMaskPosition: pos, maskPosition: pos,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'
      }
    };
  };
  const pointe = crop(0, 35, 419, 52);   // "THE POINTE" letters
  const match = crop(439, 0, 658, 122);  // "OF THE MATCH" letters
  const pointeW = 419 * (120 / 52), matchW = 658 * (52 / 120), gapW = 30, rowW = pointeW + gapW + matchW;
  const pointeBox = { position: 'absolute', inset: 0, aspectRatio: pointe.aspectRatio, pointerEvents: 'none' };
  const matchWord = { position: 'absolute', inset: 0, pointerEvents: 'none', ...match.mask };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#1e1e1e' }}>
      <style>{`
        @keyframes ptShine{0%,30%{background-position:150% 0}60%,100%{background-position:-50% 0}}
        @keyframes ptSlam{0%{transform:translateX(60%) skewX(-25deg);opacity:0;filter:blur(10px)}7%{transform:translateX(-3%) skewX(8deg);opacity:1;filter:blur(0)}11%{transform:translateX(1%) skewX(-2deg)}14%,58%{transform:none}60%{transform:translateX(-1.5%) skewX(-7deg)}62%{transform:translateX(1%) skewX(3deg)}64%,90%{transform:none;opacity:1;filter:blur(0)}100%{transform:translateX(-45%) skewX(22deg);opacity:0;filter:blur(10px)}}
        @keyframes ptEcho{0%{opacity:0;transform:translateX(75%) skewX(-25deg)}5%{opacity:1;transform:translateX(8%) skewX(-12deg)}13%{opacity:0;transform:translateX(0)}59%{opacity:0;transform:translateX(0)}60%{opacity:1;transform:translateX(2.5%)}64%{opacity:0;transform:translateX(5%)}100%{opacity:0}}
        @keyframes ptSweep{0%{background-position:150% 0}100%{background-position:-50% 0}}
      `}</style>
      <div style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9', overflow: 'hidden', background: `#1a1a1a url(${bgImage}) center / cover no-repeat` }}>
        <img src={patternImage} alt="" style={{ position: 'absolute', left: '-19.95%', top: '50%', width: '111.04%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-19.95%', top: '50%', width: '111.04%', aspectRatio: '2132 / 1712', pointerEvents: 'none', ...mask(patternImage), filter: 'drop-shadow(0 0 6px rgba(255,180,120,.9))', background: 'linear-gradient(115deg, transparent 40%, rgba(255,214,180,.5) 46%, #fff 50%, rgba(255,214,180,.5) 54%, transparent 60%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat', animation: 'ptSweep 4s linear infinite' }} />
        <img src={terminusLogo} alt="Terminus" style={{ position: 'absolute', left: '37.92%', top: '10.56%', width: '24.11%' }} />
        <div role="img" aria-label="The Pointe of the Match" style={{ position: 'absolute', left: '50%', top: '33.05%', transform: 'translate(-50%, -50%)', width: `${(rowW / IMG_W) * 57.14}%`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: `${(pointeW / rowW) * 100}%`, aspectRatio: pointe.aspectRatio }}>
            <div style={{ ...pointeBox, ...pointe.img }} />
            <div style={{ ...pointeBox, ...pointe.mask, background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,.35) 46%, rgba(255,255,255,.95) 50%, rgba(255,255,255,.35) 54%, transparent 58%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat', animation: 'ptShine 4s ease-in-out infinite' }} />
          </div>
          <div style={{ position: 'relative', width: `${(matchW / rowW) * 100}%`, aspectRatio: match.aspectRatio }}>
            <div style={{ ...matchWord, background: '#f47b20', animation: `ptEcho ${L}s cubic-bezier(.2,.8,.2,1) 1 both` }} />
            <div style={{ ...matchWord, background: '#fff', animation: `ptSlam ${L}s cubic-bezier(.2,.8,.2,1) 1 both` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
