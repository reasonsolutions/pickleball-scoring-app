import React, { useId } from 'react';

// Children's Day skin for the Main/Side display jumbotron (presentation only).
// Toggled from the Display Controller via `childrensDayTheme` on tournament_logos/{tournamentId}.

const MINT = '#5ee6c8';
const GRAPE = '#b98cff';
const confettiColors = ([c1, c2, c3]) => [c1, c3, c2, MINT, GRAPE];

// Extra keyframes + font for the Children's Day skin. Redefines jb-livepulse/jb-servepulse glow colours.
export const ChildrensDayStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&display=swap');
    @keyframes jb-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,77,77,.7)}50%{opacity:.6;box-shadow:0 0 0 10px rgba(255,77,77,0)}}
    @keyframes jb-servepulse{0%,100%{box-shadow:0 0 0 0 rgba(255,209,102,.75),0 0 18px rgba(255,209,102,.8)}50%{box-shadow:0 0 0 14px rgba(255,209,102,0),0 0 18px rgba(255,209,102,.8)}}
    @keyframes cd-balloonrise{0%{transform:translateY(0) translateX(0) rotate(-3deg)}25%{transform:translateY(-350px) translateX(24px) rotate(3deg)}50%{transform:translateY(-700px) translateX(-10px) rotate(-2deg)}75%{transform:translateY(-1050px) translateX(20px) rotate(3deg)}100%{transform:translateY(-1400px) translateX(0) rotate(-3deg)}}
    @keyframes cd-planefly{0%{transform:translate(-300px,0) rotate(4deg)}25%{transform:translate(400px,-40px) rotate(-6deg)}50%{transform:translate(1100px,20px) rotate(5deg)}75%{transform:translate(1700px,-30px) rotate(-4deg)}100%{transform:translate(2300px,10px) rotate(4deg)}}
    @keyframes cd-planeflyR{0%{transform:translate(300px,0) scaleX(-1) rotate(4deg)}25%{transform:translate(-400px,-40px) scaleX(-1) rotate(-6deg)}50%{transform:translate(-1100px,20px) scaleX(-1) rotate(5deg)}75%{transform:translate(-1700px,-30px) scaleX(-1) rotate(-4deg)}100%{transform:translate(-2300px,10px) scaleX(-1) rotate(4deg)}}
    @keyframes cd-flagsway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
    @keyframes cd-confall{0%{transform:translateY(-40px) rotate(0deg);opacity:0}8%{opacity:.95}100%{transform:translateY(1160px) rotate(720deg);opacity:.9}}
    @keyframes cd-pinspin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes cd-halo{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
  `}</style>
);

const Balloon = ({ i, col }) => {
  const sc = [1, 0.8, 1.15, 0.9][i % 4];
  const w = 70 * sc, h = 86 * sc, dur = 16 + (i % 5) * 3;
  return (
    <div style={{ position: 'absolute', left: (i * 263 + 60) % 1860, bottom: -200, width: w, height: h + 90 * sc, animation: `cd-balloonrise ${dur}s linear ${-(i * 2.9)}s infinite`, opacity: 0.9 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: '50% 50% 48% 48% / 55% 55% 45% 45%', background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85) 0 8%, ${col} 30%, ${col} 70%, rgba(0,0,0,.25) 100%)`, boxShadow: `0 0 30px ${col}66` }} />
      <div style={{ position: 'absolute', left: w / 2 - 6, top: h - 3, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `9px solid ${col}` }} />
      <svg width={20} height={90 * sc} style={{ position: 'absolute', left: w / 2 - 10, top: h + 5, overflow: 'visible' }}>
        <path d={`M10 0 Q2 ${22 * sc} 10 ${45 * sc} Q18 ${68 * sc} 10 ${90 * sc}`} stroke="rgba(255,255,255,.5)" strokeWidth={1.5} fill="none" />
      </svg>
    </div>
  );
};

const PaperPlane = ({ y, s, col, j, rev }) => (
  <div style={{ position: 'absolute', left: rev ? 1920 : -40, top: y, width: 0, height: 0, animation: `${rev ? 'cd-planeflyR' : 'cd-planefly'} ${22 + j * 4}s linear ${-j * 7}s infinite` }}>
    <svg viewBox="-260 -40 360 80" width={360 * s} height={80 * s} style={{ position: 'absolute', left: -260 * s, top: -40 * s, overflow: 'visible', filter: `drop-shadow(0 0 14px ${col}88)` }}>
      <path d="M-250 18 Q-170 -10 -90 14 Q-40 28 -6 8" stroke="rgba(255,255,255,.45)" strokeWidth={3} strokeDasharray="8 10" strokeLinecap="round" fill="none" />
      <path d="M0 0 L90 -22 L30 22 Z" fill="#ffffff" />
      <path d="M30 22 L90 -22 L40 6 Z" fill={col} />
      <path d="M0 0 L90 -22 L28 6 Z" fill="rgba(0,0,0,.12)" />
    </svg>
  </div>
);

// Falling confetti, rising balloons and paper planes. Sits above the colour-blob backdrop, under the vignette.
export const ChildrensDayBackdrop = ({ palette }) => {
  const [c1, c2] = palette;
  const cols = confettiColors(palette);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 36 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: (i * 149) % 1920, top: -30, width: i % 3 ? 8 : 10, height: i % 3 ? 14 : 10, borderRadius: i % 3 ? 2 : '50%', background: cols[i % cols.length], opacity: 0.8, animation: `cd-confall ${10 + (i % 6) * 2.1}s linear ${-(i * 1.3)}s infinite` }} />
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 14 }, (_, i) => <Balloon key={i} i={i} col={cols[i % cols.length]} />)}
      </div>
      <PaperPlane y={230} s={0.9} col={c1} j={0} rev={false} />
      <PaperPlane y={140} s={0.7} col={c2} j={1} rev />
      <PaperPlane y={330} s={0.6} col={MINT} j={2} rev={false} />
    </div>
  );
};

const BuntingStrand = ({ x0, x1, sag, cols }) => {
  const n = 12;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [x0 + (x1 - x0) * t, 4 + sag * 4 * t * (1 - t)];
  });
  return (
    <div>
      <svg width={1920} height={140} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d={`M${x0} 4 Q${(x0 + x1) / 2} ${4 + sag * 2} ${x1} 4`} stroke="rgba(255,255,255,.45)" strokeWidth={2} fill="none" />
      </svg>
      {pts.slice(1, -1).map(([x, y], i) => {
        const col = cols[i % cols.length];
        return (
          <div key={i} style={{ position: 'absolute', left: x - 18, top: y, width: 0, height: 0, borderLeft: '18px solid transparent', borderRight: '18px solid transparent', borderTop: `40px solid ${col}`, filter: `drop-shadow(0 4px 10px ${col}66)`, transformOrigin: '50% 0', animation: `cd-flagsway ${2.4 + (i % 3) * 0.5}s ease-in-out ${-(i * 0.3)}s infinite` }} />
        );
      })}
    </div>
  );
};

const Crayon = ({ x, j, col }) => {
  const h = 70 + ((j * 37) % 40), w = 30;
  return (
    <svg viewBox={`0 0 ${w} ${h + 28}`} width={w} height={h + 28} style={{ position: 'absolute', left: x, bottom: -36, transform: `rotate(${((j * 53) % 15) - 7}deg)`, transformOrigin: '50% 100%', filter: `drop-shadow(0 0 10px ${col}55)` }}>
      <path d={`M4 28 L${w / 2} 2 L${w - 4} 28 Z`} fill="#f6e2bf" />
      <path d={`M${w / 2 - 4} 9 L${w / 2} 2 L${w / 2 + 4} 9 Z`} fill={col} />
      <rect x={2} y={28} width={w - 4} height={h} rx={3} fill={col} />
      <rect x={2} y={40} width={w - 4} height={4} fill="rgba(0,0,0,.25)" />
      <rect x={2} y={50} width={w - 4} height={4} fill="rgba(0,0,0,.25)" />
      <rect x={6} y={30} width={4} height={h - 4} rx={2} fill="rgba(255,255,255,.35)" />
    </svg>
  );
};

// Bunting along the top and a row of crayons along the bottom. Sits above the vignette, under the content.
export const ChildrensDayForeground = ({ palette }) => {
  const cols = confettiColors(palette);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <BuntingStrand x0={-20} x1={640} sag={30} cols={cols} />
        <BuntingStrand x0={640} x1={1280} sag={26} cols={cols} />
        <BuntingStrand x0={1280} x1={1940} sag={30} cols={cols} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}>
        {Array.from({ length: 44 }, (_, j) => <Crayon key={j} x={8 + j * 43.6} j={j} col={cols[j % cols.length]} />)}
      </div>
    </div>
  );
};

const spiralPath = (off) => {
  let p = '';
  for (let t = 0; t <= 4 * Math.PI; t += 0.2) {
    const r = 3 + t * 3.1, a = t + off;
    p += `${p ? ' L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`;
  }
  return p;
};
const SPIRALS = [0, 1, 2].map((k) => spiralPath(k * 2.094));

// Spinning pinwheel lollipop sized to the surrounding font, used in place of a 0 score.
export const Pinwheel = ({ delay = 0, palette }) => {
  const id = `pw${useId().replace(/:/g, '')}`;
  const [c1, c2, c3] = palette;
  const d = `${-delay}s`;
  return (
    <svg viewBox="0 0 100 100" style={{ display: 'inline-block', width: '.92em', height: '.92em', verticalAlign: '-.1em', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="55%" stopColor={c3} stopOpacity={0.25} />
          <stop offset="100%" stopColor={c2} stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <circle cx={50} cy={50} r={42} />
        </clipPath>
      </defs>
      <circle cx={50} cy={50} r={62} fill={`url(#${id}h)`} style={{ transformOrigin: '50px 50px', animation: `cd-halo 1.4s ease-in-out ${d} infinite` }} />
      <g clipPath={`url(#${id}c)`}>
        <g style={{ transformOrigin: '50px 50px', animation: `cd-pinspin 3s linear ${d} infinite` }}>
          <circle cx={50} cy={50} r={42} fill="#fff" />
          {[c1, c2, c3].map((col, k) => (
            <path key={k} d={SPIRALS[k]} stroke={col} strokeWidth={9} strokeLinecap="round" fill="none" />
          ))}
          <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={3} />
        </g>
      </g>
      <ellipse cx={36} cy={32} rx={12} ry={7} fill="rgba(255,255,255,.55)" transform="rotate(-35 36 32)" />
    </svg>
  );
};
