import React, { useId } from 'react';

// Diwali skin for the Main/Side display jumbotron (presentation only).
// Toggled from the Display Controller via `diwaliTheme` on tournament_logos/{tournamentId}.

// Extra keyframes + font for the Diwali skin. Redefines jb-livepulse/jb-servepulse glow colours.
export const DiwaliStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Yatra+One&display=swap');
    @keyframes jb-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,138,28,.7)}50%{opacity:.6;box-shadow:0 0 0 10px rgba(255,138,28,0)}}
    @keyframes jb-servepulse{0%,100%{box-shadow:0 0 0 0 rgba(255,209,102,.75),0 0 18px rgba(255,209,102,.8)}50%{box-shadow:0 0 0 14px rgba(255,209,102,0),0 0 18px rgba(255,209,102,.8)}}
    @keyframes dw-emberrise{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.9}100%{transform:translateY(-1200px) translateX(60px);opacity:0}}
    @keyframes dw-bcspin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes dw-bcspark{0%,100%{opacity:1}30%{opacity:.35}55%{opacity:.9}75%{opacity:.5}}
    @keyframes dw-bchalo{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
    @keyframes dw-bcjitter{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,1px)}75%{transform:translate(1px,1px)}}
    @keyframes dw-fwburst{0%,19%{opacity:0;transform:scale(.1)}21%{opacity:1;transform:scale(.3)}55%{opacity:1;transform:scale(1)}82%{opacity:0;transform:scale(1.12) translateY(12px)}100%{opacity:0;transform:scale(1.12) translateY(12px)}}
    @keyframes dw-fwrocket{0%{opacity:0;transform:translateY(420px)}3%{opacity:1}19%{opacity:1;transform:translateY(0)}21%,100%{opacity:0;transform:translateY(0)}}
    @keyframes dw-flame{0%,100%{transform:scaleY(1) scaleX(1) rotate(-2deg)}30%{transform:scaleY(1.15) scaleX(.92) rotate(2deg)}60%{transform:scaleY(.92) scaleX(1.05) rotate(-1deg)}}
    @keyframes dw-bulb{0%,100%{opacity:1}50%{opacity:.35}}
  `}</style>
);

const FIREWORK_SPOTS = [[180, 180, 150, 0], [1720, 150, 170, -1.3], [520, 90, 110, -2.4], [1420, 80, 120, -0.6], [360, 330, 90, -3.1], [1580, 360, 100, -1.9], [960, 60, 80, -2.9]];

const Firework = ({ x, y, r, delay, col, col2, dur }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
    <div style={{ position: 'absolute', left: -2, top: -2, width: 4, height: 18, borderRadius: 2, background: `linear-gradient(${col}, transparent)`, boxShadow: `0 0 10px ${col}`, animation: `dw-fwrocket ${dur}s ease-out ${delay}s infinite` }} />
    <svg viewBox={`${-r - 6} ${-r - 6} ${2 * r + 12} ${2 * r + 12}`} width={2 * r + 12} height={2 * r + 12} style={{ position: 'absolute', left: -r - 6, top: -r - 6, overflow: 'visible', filter: `drop-shadow(0 0 8px ${col})`, animation: `dw-fwburst ${dur}s ease-out ${delay}s infinite`, opacity: 0 }}>
      {Array.from({ length: 18 }, (_, k) => {
        const a = (k / 18) * Math.PI * 2;
        const x1 = Math.cos(a) * r * 0.18, y1 = Math.sin(a) * r * 0.18, x2 = Math.cos(a) * r, y2 = Math.sin(a) * r;
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={k % 2 ? col : col2} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
            <circle cx={x2} cy={y2} r={3.2} fill="#fff" />
            <circle cx={x2 * 0.66} cy={y2 * 0.66 + 6} r={1.8} fill={k % 2 ? col2 : col} />
          </g>
        );
      })}
    </svg>
  </div>
);

// Fireworks and rising sparks. Sits above the colour-blob backdrop, under the vignette.
export const DiwaliBackdrop = ({ palette }) => {
  const [c1, c2, c3] = palette;
  const fwColors = [c3, c2, '#5ee6c8', c1, '#ffffff', '#b98cff'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {FIREWORK_SPOTS.map(([x, y, r, delay], j) => (
        <Firework key={j} x={x} y={y} r={r} delay={delay} col={fwColors[j % fwColors.length]} col2={fwColors[(j + 2) % fwColors.length]} dur={3.6 + (j % 3) * 0.5} />
      ))}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 24 }, (_, i) => {
          const color = i % 4 === 0 ? c2 : c3;
          const size = 3 + (i % 3) * 2;
          return (
            <div key={i} style={{ position: 'absolute', left: (i * 137) % 1920, bottom: -20, width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, animation: `dw-emberrise ${9 + (i % 5) * 2.3}s linear ${-(i * 1.7)}s infinite` }} />
          );
        })}
      </div>
    </div>
  );
};

const LightStrand = ({ x0, x1, sag, colors }) => {
  const pts = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14;
    return [x0 + (x1 - x0) * t, 4 + sag * 4 * t * (1 - t)];
  });
  return (
    <div>
      <svg width={1920} height={140} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d={`M${x0} 4 Q${(x0 + x1) / 2} ${4 + sag * 2} ${x1} 4`} stroke="rgba(255,220,160,.35)" strokeWidth={2} fill="none" />
      </svg>
      {pts.slice(1, -1).map(([x, y], i) => {
        const col = colors[i % 4];
        return (
          <div key={i} style={{ position: 'absolute', left: x - 6, top: y, width: 12, height: 16, borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%', background: col, boxShadow: `0 0 14px 3px ${col}`, animation: `dw-bulb ${1.4 + (i % 3) * 0.4}s ease-in-out ${-(i * 0.23)}s infinite` }} />
        );
      })}
    </div>
  );
};

const Diya = ({ x, j, s, accent }) => (
  <div style={{ position: 'absolute', left: x, bottom: 6, width: 56 * s, height: 64 * s }}>
    <div style={{ position: 'absolute', left: '50%', bottom: 18 * s, width: 70 * s, height: 70 * s, marginLeft: -35 * s, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,190,80,.55), transparent 65%)', animation: `dw-bulb ${2 + (j % 3) * 0.5}s ease-in-out ${-j * 0.4}s infinite` }} />
    <div style={{ position: 'absolute', left: '50%', bottom: 20 * s, width: 12 * s, height: 26 * s, marginLeft: -6 * s, borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%', background: 'radial-gradient(ellipse at 50% 75%, #fff8d0 0%, #ffd166 35%, #ff8a1c 70%, rgba(255,80,20,0) 100%)', transformOrigin: '50% 100%', animation: `dw-flame ${0.9 + (j % 4) * 0.15}s ease-in-out ${-j * 0.21}s infinite` }} />
    <svg viewBox="0 0 56 26" width={56 * s} height={26 * s} style={{ position: 'absolute', left: 0, bottom: 0 }}>
      <path d="M2 4 Q28 10 54 4 Q50 24 28 25 Q6 24 2 4 Z" fill="#b5481c" stroke="#6e2408" strokeWidth={1.2} />
      <path d="M2 4 Q28 10 54 4 Q28 0 2 4 Z" fill="#4a1606" />
      <path d="M10 13 Q28 18 46 13" stroke={accent} strokeWidth={1.6} fill="none" strokeDasharray="2 3" />
    </svg>
  </div>
);

// String lights along the top and a row of diyas along the bottom. Sits above the vignette, under the content.
export const DiwaliForeground = ({ palette }) => {
  const [c1, c2, c3] = palette;
  const bulbColors = [c3, c2, '#5ee6c8', c1];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <LightStrand x0={-20} x1={640} sag={34} colors={bulbColors} />
        <LightStrand x0={640} x1={1280} sag={30} colors={bulbColors} />
        <LightStrand x0={1280} x1={1940} sag={34} colors={bulbColors} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}>
        {Array.from({ length: 22 }, (_, j) => (
          <Diya key={j} x={24 + j * 87} j={j} s={j % 2 ? 0.8 : 0.95} accent={c3} />
        ))}
      </div>
    </div>
  );
};

// Spinning bhoochakra sized to the surrounding font, used in place of a 0 score.
export const Bhoochakra = ({ delay = 0, palette }) => {
  const id = `bc${useId().replace(/:/g, '')}`;
  const [c1, , c3] = palette;
  const d = `${-delay}s`;
  return (
    <svg viewBox="0 0 100 100" style={{ display: 'inline-block', width: '.92em', height: '.92em', verticalAlign: '-.1em', overflow: 'visible', animation: `dw-bcjitter .12s linear ${d} infinite` }}>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0%" stopColor="#fff3c4" stopOpacity={0.95} />
          <stop offset="45%" stopColor={c3} stopOpacity={0.55} />
          <stop offset="100%" stopColor={c1} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}s`} x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#ffd166" />
          <stop offset="100%" stopColor={c1} stopOpacity={0} />
        </linearGradient>
      </defs>
      <circle cx={50} cy={50} r={62} fill={`url(#${id}h)`} style={{ transformOrigin: '50px 50px', animation: `dw-bchalo .5s ease-in-out ${d} infinite` }} />
      <g style={{ transformOrigin: '50px 50px', animation: `dw-bcspin .38s linear ${d} infinite` }}>
        {Array.from({ length: 10 }, (_, k) => {
          const a = (k / 10) * Math.PI * 2, R = 37;
          const sx = 50 + Math.cos(a) * R, sy = 50 + Math.sin(a) * R;
          const tx = -Math.sin(a), ty = Math.cos(a), ox = Math.cos(a), oy = Math.sin(a), L = 14 + (k % 3) * 6;
          const ex = sx + (tx * 0.8 + ox * 0.6) * L, ey = sy + (ty * 0.8 + oy * 0.6) * L;
          return (
            <g key={k} style={{ animation: `dw-bcspark ${0.25 + (k % 4) * 0.07}s steps(2) ${-k * 0.05}s infinite` }}>
              <path d={`M${sx} ${sy} Q${sx + tx * L * 0.7} ${sy + ty * L * 0.7} ${ex} ${ey}`} stroke={`url(#${id}s)`} strokeWidth={3} strokeLinecap="round" fill="none" />
              <circle cx={ex + ox * 4} cy={ey + oy * 4} r={1.6} fill="#fff" />
              <circle cx={ex + (tx + ox) * 6} cy={ey + (ty + oy) * 6} r={1} fill={c3} />
            </g>
          );
        })}
        <circle cx={50} cy={50} r={30} fill="none" stroke="#e0218a" strokeWidth={15} />
        <circle cx={50} cy={50} r={30} fill="none" stroke="#1fb57a" strokeWidth={15} strokeDasharray="11.8 11.8" />
        <circle cx={50} cy={50} r={37.5} fill="none" stroke="#ffd166" strokeWidth={1.6} />
        <circle cx={50} cy={50} r={22.5} fill="none" stroke="#ffd166" strokeWidth={1.6} />
        <circle cx={50} cy={50} r={30} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1} strokeDasharray="2 5" />
        <circle cx={87} cy={50} r={4.5} fill="#fff" style={{ filter: 'drop-shadow(0 0 4px #fff)' }} />
      </g>
    </svg>
  );
};
