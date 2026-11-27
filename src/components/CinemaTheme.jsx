import React, { useId } from 'react';

// Cinema (All-Stars premiere) skin for the Main/Side display jumbotron (presentation only).
// Toggled from the Display Controller via `cinemaTheme` on tournament_logos/{tournamentId}.
// Palette order: [red, deep, accent, sky].

// Extra keyframes + font for the Cinema skin. Redefines jb-livepulse/jb-servepulse glow colours.
export const CinemaStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Limelight&display=swap');
    @keyframes jb-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(212,42,55,.7)}50%{opacity:.6;box-shadow:0 0 0 10px rgba(212,42,55,0)}}
    @keyframes jb-servepulse{0%,100%{box-shadow:0 0 0 0 rgba(90,98,224,.75),0 0 18px rgba(90,98,224,.8)}50%{box-shadow:0 0 0 14px rgba(90,98,224,0),0 0 18px rgba(90,98,224,.8)}}
    @keyframes cn-bulb{0%,100%{opacity:1;box-shadow:0 0 10px 2px rgba(255,214,120,.95)}50%{opacity:.25;box-shadow:0 0 2px 0 rgba(255,214,120,.3)}}
    @keyframes cn-sweepL{0%,100%{transform:rotate(18deg)}50%{transform:rotate(-14deg)}}
    @keyframes cn-sweepR{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(14deg)}}
    @keyframes cn-popfall{0%{transform:translateY(-40px) rotate(0deg);opacity:0}8%{opacity:.95}100%{transform:translateY(1160px) rotate(540deg);opacity:.9}}
    @keyframes cn-filmroll{0%{transform:translateX(0)}100%{transform:translateX(-120px)}}
    @keyframes cn-curtsway{0%,100%{transform:skewX(0deg)}50%{transform:skewX(1.2deg)}}
    @keyframes cn-reelspin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes cn-reelhalo{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
    @keyframes cn-flicker{0%,100%{opacity:.05}7%{opacity:.11}9%{opacity:.04}50%{opacity:.08}53%{opacity:.03}}
  `}</style>
);

const Spotlight = ({ left, anim, accent }) => (
  <div style={{ position: 'absolute', left, bottom: -40, width: 0, height: 0, transformOrigin: '0 0', animation: anim }}>
    <div style={{ position: 'absolute', left: -170, bottom: 0, width: 340, height: 1400, background: `linear-gradient(0deg, ${accent}66, ${accent}00 85%)`, clipPath: 'polygon(45% 100%, 55% 100%, 100% 0, 0 0)', filter: 'blur(14px)', opacity: 0.55, mixBlendMode: 'screen' }} />
  </div>
);

const Popcorn = ({ i }) => {
  const s = [1, 0.8, 1.2, 0.9][i % 4];
  const c = i % 5 === 0 ? '#f7d77a' : '#fff4dc';
  const puff = (x, y, r) => (
    <div style={{ position: 'absolute', left: x * s, top: y * s, width: r * s, height: r * s, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #fff 0 30%, ${c} 60%, #e2b65a 100%)` }} />
  );
  return (
    <div style={{ position: 'absolute', left: (i * 157 + 40) % 1900, top: -40, width: 26 * s, height: 24 * s, opacity: 0.85, filter: 'drop-shadow(0 0 8px rgba(255,220,140,.35))', animation: `cn-popfall ${11 + (i % 6) * 2.2}s linear ${-(i * 1.4)}s infinite` }}>
      {puff(0, 6, 14)}
      {puff(9, 0, 14)}
      {puff(12, 9, 13)}
      {puff(4, 12, 11)}
    </div>
  );
};

// Projector beam, sweeping spotlights, falling popcorn and a projector flicker.
// Sits above the colour-blob backdrop, under the vignette.
export const CinemaBackdrop = ({ palette }) => {
  const accent = palette[2];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', top: -60, width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: -900, top: 0, width: 1800, height: 1200, background: `conic-gradient(from 160deg at 50% 0%, transparent 0deg, ${accent}22 14deg, ${accent}11 26deg, transparent 40deg)`, filter: 'blur(12px)' }} />
      </div>
      <Spotlight left={260} anim="cn-sweepL 9s ease-in-out infinite" accent={accent} />
      <Spotlight left={1660} anim="cn-sweepR 9s ease-in-out -4.5s infinite" accent={accent} />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 30 }, (_, i) => <Popcorn key={i} i={i} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#fff', mixBlendMode: 'overlay', animation: 'cn-flicker 4.5s steps(1) infinite' }} />
    </div>
  );
};

const Curtain = ({ side, red, deep, accent }) => (
  <div style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 116, background: `repeating-linear-gradient(90deg, ${deep} 0 6px, ${red} 18px, ${deep} 34px)`, boxShadow: `inset ${side === 'left' ? -30 : 30}px 0 40px rgba(0,0,0,.7)`, transformOrigin: '50% 0', animation: `cn-curtsway ${side === 'left' ? 7 : 8.3}s ease-in-out infinite`, borderRadius: side === 'left' ? '0 0 60px 0' : '0 0 0 60px' }}>
    <div style={{ position: 'absolute', top: 520, [side === 'left' ? 'right' : 'left']: -6, width: 22, height: 54, borderRadius: 11, background: `linear-gradient(180deg, ${accent}, #8a6a1f)`, boxShadow: `0 0 16px ${accent}88` }} />
  </div>
);

const FilmHoles = ({ top }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top, height: 7, background: 'repeating-linear-gradient(90deg, rgba(255,240,210,.55) 0 12px, transparent 12px 30px)' }} />
);

// Velvet curtains + valance and a rolling film strip along the bottom.
// Sits above the vignette, under the scoreboard content.
export const CinemaForeground = ({ palette }) => {
  const [red, deep, accent] = palette;
  const velvet = `repeating-linear-gradient(90deg, ${deep} 0 6px, ${red} 18px, ${deep} 34px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <Curtain side="left" red={red} deep={deep} accent={accent} />
      <Curtain side="right" red={red} deep={deep} accent={accent} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 34, background: velvet, boxShadow: '0 10px 30px rgba(0,0,0,.6)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -18, height: 18, background: `radial-gradient(circle at 50% 0, ${red} 0 17px, transparent 18px) 0 0 / 40px 18px repeat-x` }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: accent, opacity: 0.8 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, background: '#111', borderTop: `2px solid ${accent}55`, overflow: 'hidden', boxShadow: '0 -10px 30px rgba(0,0,0,.6)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 2280, height: '100%', animation: 'cn-filmroll 2.4s linear infinite' }}>
          <FilmHoles top={4} />
          <FilmHoles top={41} />
          <div style={{ position: 'absolute', left: 6, top: 13, display: 'flex' }}>
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={{ flex: 'none', width: 108, height: 26, marginRight: 12, borderRadius: 3, background: `linear-gradient(135deg, ${red}55, ${accent}33)`, border: '1px solid rgba(255,255,255,.08)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const BulbRow = ({ pos }) => (
  <div style={{ position: 'absolute', left: 8, right: 8, [pos]: 3, display: 'flex', justifyContent: 'space-between' }}>
    {Array.from({ length: 16 }, (_, i) => (
      <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffe9a8', animation: `cn-bulb 1s ease-in-out ${-(i % 2) * 0.5}s infinite` }} />
    ))}
  </div>
);

// Theatre marquee sign (red box, indigo border, blinking bulbs) around the match-type pill.
export const CinemaMarquee = ({ children }) => (
  <div style={{ position: 'relative', marginBottom: 10, padding: 14, borderRadius: 12, background: 'linear-gradient(180deg,#d42a37,#8e1622)', border: '2px solid #5a62e0', boxShadow: '0 0 40px rgba(90,98,224,.4),inset 0 0 20px rgba(0,0,0,.5)' }}>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BulbRow pos="top" />
      <BulbRow pos="bottom" />
    </div>
    {children}
  </div>
);

// Spinning red film reel sized to the surrounding font, used in place of a 0 score.
export const FilmReel = ({ delay = 0, palette }) => {
  const id = `rl${useId().replace(/:/g, '')}`;
  const red = palette[0];
  const d = `${-delay}s`;
  return (
    <svg viewBox="0 0 100 100" style={{ display: 'inline-block', width: '.92em', height: '.92em', verticalAlign: '-.1em', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0%" stopColor={red} stopOpacity={0.6} />
          <stop offset="100%" stopColor={red} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}m`} x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor="#ffd9dc" />
          <stop offset="45%" stopColor={red} />
          <stop offset="100%" stopColor="#6e0f18" />
        </linearGradient>
      </defs>
      <circle cx={50} cy={50} r={64} fill={`url(#${id}h)`} style={{ transformOrigin: '50px 50px', animation: `cn-reelhalo 1.6s ease-in-out ${d} infinite` }} />
      <path d="M58 90 Q90 96 124 92" stroke="#e6e9f8" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.9} />
      <g style={{ transformOrigin: '50px 50px', animation: `cn-reelspin 2.6s linear ${d} infinite` }}>
        <circle cx={50} cy={50} r={44} fill={`url(#${id}m)`} />
        <circle cx={50} cy={50} r={44} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={2} />
        <circle cx={50} cy={50} r={38} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={1.5} />
        {Array.from({ length: 5 }, (_, k) => {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          return <circle key={k} cx={50 + Math.cos(a) * 24} cy={50 + Math.sin(a) * 24} r={10.5} fill="#0c1438" />;
        })}
        <circle cx={50} cy={50} r={7} fill="#0c1438" />
        <circle cx={50} cy={50} r={3} fill="#ffffff" />
      </g>
    </svg>
  );
};
