import React, { useId } from 'react';

// Halloween skin for the Main/Side display jumbotron (presentation only).
// Toggled from the Display Controller via `halloweenTheme` on tournament_logos/{tournamentId}.

// Extra keyframes + font for the Halloween skin. Redefines jb-livepulse/jb-servepulse glow colours.
export const HalloweenStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
    @keyframes jb-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,122,26,.7)}50%{opacity:.6;box-shadow:0 0 0 10px rgba(255,122,26,0)}}
    @keyframes jb-servepulse{0%,100%{box-shadow:0 0 0 0 rgba(157,255,58,.75),0 0 18px rgba(157,255,58,.8)}50%{box-shadow:0 0 0 14px rgba(157,255,58,0),0 0 18px rgba(157,255,58,.8)}}
    @keyframes hw-pkwobble{0%,100%{transform:rotate(-5deg) translateY(0)}50%{transform:rotate(5deg) translateY(-4%)}}
    @keyframes hw-pkflicker{0%,100%{opacity:1}8%{opacity:.75}12%{opacity:1}40%{opacity:.88}44%{opacity:.6}48%{opacity:.95}70%{opacity:.82}}
    @keyframes hw-pkblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
    @keyframes hw-emberrise{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.9}100%{transform:translateY(-1200px) translateX(60px);opacity:0}}
    @keyframes hw-batfly{0%{transform:translateX(-200px)}100%{transform:translateX(2200px)}}
    @keyframes hw-batbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-40px)}}
    @keyframes hw-wingL{0%,100%{transform:rotate(-35deg) scaleY(1)}50%{transform:rotate(40deg) scaleY(.55)}}
    @keyframes hw-wingR{0%,100%{transform:rotate(35deg) scaleY(1)}50%{transform:rotate(-40deg) scaleY(.55)}}
    @keyframes hw-batbody{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
    @keyframes hw-fogdrift{0%{transform:translateX(-10%)}50%{transform:translateX(10%)}100%{transform:translateX(-10%)}}
    @keyframes hw-moonglow{0%,100%{box-shadow:0 0 80px 20px rgba(255,214,140,.35),0 0 220px 60px rgba(255,122,26,.18)}50%{box-shadow:0 0 110px 30px rgba(255,214,140,.5),0 0 280px 80px rgba(255,122,26,.25)}}
  `}</style>
);

const BATS = [[130, 110, 16, 0, 0], [300, 80, 21, -7, 1], [210, 95, 18, -12, 0], [400, 70, 24, -3, 1], [170, 60, 14, -19, 0], [260, 120, 20, -15, 1]];
const TOMBSTONES = [[380, 236, 36, 50], [470, 232, 28, 40], [1340, 228, 34, 48], [1450, 236, 26, 38], [1580, 232, 32, 44]];
const CROSSES = [[560, 238], [1230, 234]];
const CRATERS = [[60, 70, 40], [150, 120, 28], [100, 170, 20], [170, 60, 16]];

const BatWing = ({ side, speed }) => (
  <path
    d={side === 'L' ? 'M44 30 Q30 10 4 14 Q10 20 8 26 Q16 24 18 32 Q26 28 30 36 Q36 30 44 34 Z' : 'M56 30 Q70 10 96 14 Q90 20 92 26 Q84 24 82 32 Q74 28 70 36 Q64 30 56 34 Z'}
    fill="#12081c"
    stroke="rgba(255,150,60,.55)"
    strokeWidth={1.2}
    style={{ transformBox: 'fill-box', transformOrigin: side === 'L' ? '100% 60%' : '0% 60%', animation: `hw-wing${side} ${speed}s ease-in-out infinite` }}
  />
);

// Moon, bats, graveyard silhouette, fog and rising embers. Sits above the colour-blob backdrop.
export const HalloweenBackdrop = ({ palette }) => {
  const [c1, c2] = palette;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Moon */}
      <div style={{ position: 'absolute', left: 1480, top: 40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle at 38% 35%, #fff8dc 0%, #ffe2a0 45%, #f0b45a 100%)', animation: 'hw-moonglow 6s ease-in-out infinite', opacity: 0.9 }}>
        {CRATERS.map(([x, y, s], j) => (
          <div key={j} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: 'rgba(190,120,50,.25)' }} />
        ))}
      </div>

      {/* Bats */}
      {BATS.map(([top, w, dur, delay, rev], j) => {
        const speed = 0.22 + (j % 3) * 0.05;
        return (
          <div key={j} style={{ position: 'absolute', left: 0, top, animation: `hw-batfly ${dur}s linear ${delay}s infinite${rev ? ' reverse' : ''}` }}>
            <div style={{ animation: `hw-batbob ${1.6 + j * 0.35}s ease-in-out infinite` }}>
              <svg viewBox="0 0 100 50" width={w} height={w * 0.5} style={{ display: 'block', overflow: 'visible', transform: rev ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 0 8px rgba(255,122,26,.45))' }}>
                <BatWing side="L" speed={speed} />
                <BatWing side="R" speed={speed} />
                <g style={{ animation: `hw-batbody ${speed}s ease-in-out infinite` }}>
                  <ellipse cx={50} cy={32} rx={7} ry={10} fill="#12081c" stroke="rgba(255,150,60,.55)" strokeWidth={1.2} />
                  <path d="M44 24 L45 16 L48 22 L52 22 L55 16 L56 24 Z" fill="#12081c" />
                  <circle cx={47.5} cy={27} r={1.4} fill="#ffb02e" />
                  <circle cx={52.5} cy={27} r={1.4} fill="#ffb02e" />
                </g>
              </svg>
            </div>
          </div>
        );
      })}

      {/* Graveyard ground */}
      <svg viewBox="0 0 1920 320" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, width: 1920, height: 320 }}>
        <path d="M0 200 Q240 140 480 190 T960 170 T1440 190 T1920 160 L1920 320 L0 320 Z" fill="#1a0a24" />
        <path d="M0 250 Q300 200 640 240 T1280 230 T1920 245 L1920 320 L0 320 Z" fill="#07030c" />
        <path d="M150 250 L150 120 M150 170 L110 130 M110 130 L96 136 M150 150 L190 105 M190 105 L205 96 M190 105 L196 88 M150 200 L118 182" stroke="#07030c" strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d="M1780 240 L1780 100 M1780 150 L1820 110 M1820 110 L1838 104 M1780 130 L1742 92 M1742 92 L1736 76 M1780 190 L1814 170" stroke="#07030c" strokeWidth={9} strokeLinecap="round" fill="none" />
        {TOMBSTONES.map(([x, y, w, hh], j) => (
          <path key={`t${j}`} d={`M${x} ${y} L${x} ${y - hh + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y - hh + w / 2} L${x + w} ${y} Z`} fill="#07030c" />
        ))}
        {CROSSES.map(([x, y], j) => (
          <path key={`c${j}`} d={`M${x} ${y} L${x} ${y - 52} M${x - 14} ${y - 38} L${x + 14} ${y - 38}`} stroke="#07030c" strokeWidth={8} strokeLinecap="square" />
        ))}
      </svg>

      {/* Fog */}
      {[0, 1].map((j) => (
        <div key={`fog${j}`} style={{ position: 'absolute', left: '-15%', width: '130%', bottom: j ? 40 : -20, height: 220, background: 'radial-gradient(ellipse at 50% 60%, rgba(200,180,230,.16), transparent 70%)', filter: 'blur(30px)', animation: `hw-fogdrift ${26 + j * 10}s ease-in-out ${-j * 8}s infinite` }} />
      ))}

      {/* Embers */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 22 }, (_, i) => {
          const color = i % 4 === 0 ? c2 : c1;
          const size = 4 + (i % 3) * 2;
          return (
            <div key={i} style={{ position: 'absolute', left: (i * 137) % 1920, bottom: -20, width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, animation: `hw-emberrise ${9 + (i % 5) * 2.3}s linear ${-(i * 1.7)}s infinite` }} />
          );
        })}
      </div>
    </div>
  );
};

// Jack-o'-lantern sized to the surrounding font, used in place of a 0 score.
export const Pumpkin = ({ delay = 0 }) => {
  const gradId = `pk${useId().replace(/:/g, '')}`;
  const d = `${-delay}s`;
  return (
    <svg viewBox="0 0 100 100" style={{ display: 'inline-block', width: '.92em', height: '.92em', verticalAlign: '-.1em', overflow: 'visible', animation: `hw-pkwobble 2.4s ease-in-out ${d} infinite`, transformOrigin: '50% 90%', filter: 'drop-shadow(0 0 .12em rgba(255,122,26,.7))' }}>
      <defs>
        <radialGradient id={gradId} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="65%" stopColor="#ff7a1a" />
          <stop offset="100%" stopColor="#b8420a" />
        </radialGradient>
      </defs>
      <path d="M47 22 C46 14 48 8 54 4 L58 7 C54 10 53 15 54 22 Z" fill="#5f8a1f" />
      {[[24, 26], [76, 26], [38, 23], [62, 23], [50, 20]].map(([cx, rx], j) => (
        <ellipse key={j} cx={cx} cy={60} rx={rx} ry={38} fill={`url(#${gradId})`} stroke="#a83a08" strokeWidth={1.5} />
      ))}
      <g fill="#ffe066" style={{ animation: `hw-pkflicker 1.9s steps(1) ${d} infinite`, filter: 'drop-shadow(0 0 4px #ffd23a)' }}>
        <g style={{ animation: `hw-pkblink 4s ease-in-out ${d} infinite`, transformOrigin: '50% 44px' }}>
          <path d="M27 50 L41 50 L34 36 Z" />
          <path d="M59 50 L73 50 L66 36 Z" />
        </g>
        <path d="M46 61 L54 61 L50 54 Z" />
        <path d="M22 66 L30 70 L35 65 L42 72 L50 66 L58 72 L65 65 L70 70 L78 66 Q72 86 50 88 Q28 86 22 66 Z" />
      </g>
    </svg>
  );
};
