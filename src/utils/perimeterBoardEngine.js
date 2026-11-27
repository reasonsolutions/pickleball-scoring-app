// Perimeter board renderer (ported from the "Millumin Export" design).
// One continuous strip wraps the court clockwise: FAR (0) → RIGHT (1) → NEAR (2) → LEFT (3).
// Each board is W×256 px. Logos and team names come from the live match instead of being hard-coded.
import stupaLogoUrl from '../assets/perimeter/stupa.png';

export const H = 256;
export const SIDE_NAMES = ['FAR', 'RIGHT', 'NEAR', 'LEFT'];
const FONT = 'PerimeterZuume';

export const SCENES = {
  sponsors: { label: 'Sponsor loop', dur: 0 },
  gamepoint: { label: 'Game point', dur: 0 },
  matchpoint: { label: 'Match point', dur: 0 },
  intro: { label: 'Team intro', dur: 14 },
  timeout: { label: 'Timeout', dur: 60 },
  switch: { label: 'Switch sides', dur: 10 },
  hype: { label: 'Make some noise', dur: 12 },
  pending: { label: 'Decision pending', dur: 0 },
};

const ORANGE = '#e37d48', PURPLE = '#5e00e0';
const BRAND = { charcoal: '#333333', orange: '#e37d48', red: '#d40000', lavender: '#b38bff', violet: '#5e00e0', orchid: '#bb6bc6', mint: '#63ffda', blue: '#2d4bff' };
const SCENE_PAL = {
  gamepoint: { c1: '#a9532a', c2: BRAND.orange, c3: '#ffffff' },
  matchpoint: { c1: '#7a0000', c2: BRAND.red, c3: '#ffffff' },
  intro: { c1: '#2a0068', c2: BRAND.violet, c3: BRAND.lavender },
  timeout: { c3: BRAND.lavender },
  swapA: { c1: '#7d3c87', c2: BRAND.orchid }, swapB: { c1: '#2a0068', c2: BRAND.violet },
};
const DEFAULT_TEAM = { name: '', c1: '#2a0068', c2: BRAND.violet, c3: BRAND.lavender };
const teamOf = (team) => ({ ...DEFAULT_TEAM, ...(team || {}), name: String(team?.name || '').toUpperCase() });

/* ---------------- assets ---------------- */
const IMG = {}; // url -> HTMLImageElement
let fontsPromise = null;

function loadImage(url) {
  if (!url) return Promise.resolve();
  if (IMG[url]) return IMG[url].complete ? Promise.resolve() : new Promise(r => { IMG[url].addEventListener('load', r); IMG[url].addEventListener('error', r); });
  return new Promise(r => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = r; i.onerror = r; i.src = url; IMG[url] = i;
  });
}

export function loadFonts() {
  if (fontsPromise) return fontsPromise;
  const faces = [
    ['zuume-cut-regular.ttf', '400', 'normal'],
    ['zuume-cut-bold.ttf', '700', 'normal'],
    ['zuume-cut-bold-italic.ttf', '700', 'italic'],
    ['zuume-cut-black.ttf', '900', 'normal'],
    ['zuume-cut-black-italic.ttf', '900', 'italic'],
  ];
  fontsPromise = Promise.all(faces.map(([file, weight, style]) => {
    const f = new FontFace(FONT, `url(/fonts/perimeter/${file})`, { weight, style });
    return f.load().then(ff => document.fonts.add(ff)).catch(() => {});
  }));
  return fontsPromise;
}

// Preloads the given logo URLs (sliding images) plus the fixed assets
export function loadAssets(urls = []) {
  return Promise.all([loadFonts(), loadImage(stupaLogoUrl), ...urls.map(loadImage)]);
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eout = t => 1 - Math.pow(1 - t, 3);
const mod = (a, n) => ((a % n) + n) % n;

// Every board (FAR, RIGHT, NEAR, LEFT) is BOARD_W × H
export const BOARD_W = 2176;

export function geometry(boardPx = BOARD_W) {
  const w = [boardPx, boardPx, boardPx, boardPx];
  const x = [0, w[0], w[0] + w[1], w[0] + w[1] + w[2]];
  const P = x[3] + w[3];
  return { w, x, P, boards: w.map((ww, i) => ({ i, x: x[i], w: ww, cx: x[i] + ww / 2 })) };
}

function font(ctx, size, weight = 900, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}, 'Zuume Cut', Impact, sans-serif`;
}
// Draw text vertically centred on cy using real glyph bounds.
function text(ctx, s, x, cy, size, o = {}) {
  font(ctx, size, o.weight ?? 900, o.italic ?? true);
  ctx.letterSpacing = (o.ls ?? 0) + 'px';
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(s);
  const y = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  if (o.stroke) { ctx.lineWidth = o.lw ?? 4; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill ?? '#fff'; ctx.fillText(s, x, y); }
  ctx.letterSpacing = '0px';
  return m.width;
}
// Fit text into maxW by shrinking the font size
function fitText(ctx, s, x, cy, size, maxW, o = {}) {
  font(ctx, size, o.weight ?? 900, o.italic ?? true);
  ctx.letterSpacing = (o.ls ?? 0) + 'px';
  const w = ctx.measureText(s).width;
  ctx.letterSpacing = '0px';
  return text(ctx, s, x, cy, w > maxW ? size * maxW / w : size, o);
}
function logo(ctx, url, cx, cy, maxW, maxH, align = 'center') {
  const img = IMG[url];
  if (!img || !img.naturalWidth) return 0;
  const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  const x0 = align === 'center' ? cx - w / 2 : align === 'right' ? cx - w : cx;
  ctx.drawImage(img, x0, cy - h / 2, w, h);
  return w;
}
// Fill a span on the looped strip [a, a+len)
function span(ctx, a, len, style, y = 0, h = H) {
  ctx.fillStyle = style;
  const P = ctx._P; a = mod(a, P); len = clamp(len, 0, P);
  if (a + len <= P) ctx.fillRect(a, y, len, h);
  else { ctx.fillRect(a, y, P - a, h); ctx.fillRect(0, y, a + len - P, h); }
}
function wrapX(ctx, x, fn) { const P = ctx._P; fn(x); if (x < 1400) fn(x + P); if (x > P - 1400) fn(x - P); }
function band(ctx, u, width, color, alpha = 0.35) {
  wrapX(ctx, mod(u, ctx._P), x => {
    const g = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.transform(1, 0, -0.35, 1, 45, 0); ctx.fillRect(x - width / 2, 0, width, H); ctx.restore();
  });
}
function edge(ctx, u, color) {
  if (u <= 0 || u >= ctx._P) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(u - 420, 0, u, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fillRect(u - 420, 0, 420, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(u - 10, 0, 10, H);
  ctx.restore();
}
function chevrons(ctx, off, spacing, color, lw, dir = 1, y0 = 0, h = H) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'miter';
  const P = ctx._P, d = 70 * dir;
  ctx.beginPath();
  for (let x = mod(off, spacing) - spacing; x < P + spacing; x += spacing) {
    ctx.moveTo(x - d / 2, y0); ctx.lineTo(x + d / 2, y0 + h / 2); ctx.lineTo(x - d / 2, y0 + h);
  }
  ctx.stroke(); ctx.restore();
}
function vgrad(ctx, a, b) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function scrim(ctx, cx, half, color) {
  const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.22, color); g.addColorStop(0.78, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - half, 0, half * 2, H);
}

/* ---------------- scenes ---------------- */

// Sponsor loop: each sliding image fills every board three times, then cross-fades to the next.
function sponsors(ctx, g, t, opt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, g.P, H);
  const logos = (opt.logos || []).filter(u => IMG[u]?.naturalWidth);
  const per = opt.logoSeconds || 10, fade = 0.8, tc = mod(t, per), set = Math.floor(t / per);
  const alpha = logos.length > 1 ? clamp(Math.min(tc / fade, (per - tc) / fade)) : clamp(t / fade);
  ctx.save(); ctx.globalAlpha = alpha;
  if (!logos.length) {
    const label = String(opt.fallbackText || '').toUpperCase();
    if (label) for (const b of g.boards) fitText(ctx, label, b.cx, H / 2, 150, b.w - 200, { ls: 6, fill: '#fff' });
    ctx.restore();
    return;
  }
  const url = logos[set % logos.length];
  for (const b of g.boards) {
    const slot = b.w / 3;
    for (let i = 0; i < 3; i++) logo(ctx, url, b.x + slot * (i + 0.5), H / 2, Math.min(slot - 160, 620), 170);
  }
  ctx.restore();
}

function point(ctx, g, t, team, match) {
  const T = { ...teamOf(team), ...SCENE_PAL[match ? 'matchpoint' : 'gamepoint'] }, P = g.P;
  ctx.fillStyle = vgrad(ctx, T.c2, T.c1); ctx.fillRect(0, 0, P, H);
  chevrons(ctx, t * (match ? 1500 : 900), 140, 'rgba(255,255,255,0.13)', 30);
  band(ctx, t * P / (match ? 0.9 : 1.5), 1300, '#ffffff', 0.3);
  const pulse = 1 + 0.035 * Math.max(0, Math.sin(t * (match ? 11 : 7)));
  const beat = Math.floor(t * (match ? 5 : 3)), fr = t * (match ? 5 : 3) - beat;
  for (const b of g.boards) {
    scrim(ctx, b.cx, 760, T.c1);
    if (beat % 4 === b.i) { ctx.fillStyle = `rgba(255,255,255,${0.22 * (1 - fr)})`; ctx.fillRect(b.x, 0, b.w, H); }
    ctx.save(); ctx.translate(b.cx, H / 2); ctx.scale(pulse, pulse);
    text(ctx, match ? 'MATCH POINT' : 'GAME POINT', 0, 0, 214, { ls: 6, fill: '#fff', stroke: match ? BRAND.charcoal : null, lw: 10 });
    ctx.restore();
    if (b.w >= 1900 && T.name) {
      const room = b.w / 2 - 620;
      fitText(ctx, T.name, b.x + 110, H / 2, 92, room, { align: 'left', weight: 900, fill: '#fff', stroke: 'rgba(0,0,0,0.55)', lw: 8, ls: 3 });
      fitText(ctx, T.name, b.x + b.w - 110, H / 2, 92, room, { align: 'right', weight: 900, fill: '#fff', stroke: 'rgba(0,0,0,0.55)', lw: 8, ls: 3 });
    }
  }
  if (match) {
    for (const y of [0, H - 14]) {
      span(ctx, 0, P, '#ffffff', y, 14);
      ctx.save(); ctx.fillStyle = BRAND.charcoal;
      for (let x = mod(t * 900, 80) - 80; x < P; x += 80) ctx.fillRect(x, y, 30, 14);
      ctx.restore();
    }
  }
}

// The marquee runs for most of the intro; the "NOW ON COURT" card wipes in for the last ~7s.
function intro(ctx, g, t, team, opt, dur = SCENES.intro.dur) {
  const T = { ...teamOf(team), ...SCENE_PAL.intro }, P = g.P;
  const reveal = Math.max(Math.min(7.2, dur * 0.5), dur - 6.8);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, P, H);
  const head = eio(clamp(t / 1.8)) * P;
  const marquee = () => {
    ctx.fillStyle = vgrad(ctx, T.c2, T.c1); ctx.fillRect(0, 0, P, H);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 6; y < H; y += 12) ctx.fillRect(0, y, P, 4);
    font(ctx, 236, 900, true); ctx.letterSpacing = '8px';
    const nameW = ctx.measureText(T.name).width; ctx.letterSpacing = '0px';
    const count = Math.max(1, Math.round(P / Math.max(1250, nameW + 300))), seg = P / count, off = (t - 1.8) * 520;
    for (let j = 0; j < count; j++) wrapX(ctx, mod(j * seg + off, P), x => {
      const filled = j % 2 === 0;
      text(ctx, T.name, x, H / 2, 236, { ls: 8, fill: filled ? '#fff' : null, stroke: filled ? null : '#fff', lw: 5 });
      ctx.save(); ctx.translate(x + seg / 2, H / 2); ctx.rotate(Math.PI / 4); ctx.fillStyle = T.c3; ctx.fillRect(-18, -18, 36, 36); ctx.restore();
    });
  };
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, head, H); ctx.clip(); marquee(); ctx.restore();
  if (t < 1.9) edge(ctx, head, T.c3);
  if (t > reveal) {
    const f = eio(clamp((t - reveal) / 1.3)) * P;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, f, H); ctx.clip();
    for (const b of g.boards) {
      const gr = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      gr.addColorStop(0, '#000'); gr.addColorStop(0.5, T.c2); gr.addColorStop(1, '#000');
      ctx.fillStyle = gr; ctx.fillRect(b.x, 0, b.w, H);
      ctx.fillStyle = T.c3; ctx.fillRect(b.x, 0, b.w, 8); ctx.fillRect(b.x, H - 8, b.w, 8);
      const wide = b.w >= 1900;
      fitText(ctx, T.name, b.cx, H / 2, 228, wide ? b.w - 1500 : b.w - 160, { ls: 10, fill: '#fff' });
      if (wide) {
        text(ctx, 'NOW ON COURT', b.x + 110, H / 2, 70, { align: 'left', weight: 700, fill: '#fff', ls: 4 });
        if (opt.presenter && IMG[opt.presenter]?.naturalWidth) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(b.x + b.w - 640, 40, 560, H - 80);
          logo(ctx, opt.presenter, b.x + b.w - 360, H / 2, 460, 150);
        }
      }
    }
    band(ctx, (t - reveal) * 3000, 800, '#ffffff', 0.25);
    ctx.restore();
    if (t < reveal + 1.4) edge(ctx, f, T.c3);
  }
}

function timeout(ctx, g, t, team, dur, opt) {
  const pads = opt.timeoutPads || [0, 0, 0, 0];
  const T = { ...teamOf(team), ...SCENE_PAL.timeout }, P = g.P, rem = Math.max(0, dur - t);
  const presenter = opt.presenter && IMG[opt.presenter]?.naturalWidth ? opt.presenter : null;
  ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, P, H);
  ctx.save(); ctx.globalAlpha = 0.5; chevrons(ctx, t * 40, 360, 'rgba(94,0,224,0.35)', 90); ctx.restore();
  const s = Math.ceil(rem), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
  const urgent = rem < 10, blink = urgent && (t * 2) % 1 < 0.5;
  for (const b of g.boards) {
    const pad = pads[b.i] || 0, x0 = b.x + pad, w0 = b.w - pad * 2;
    scrim(ctx, b.cx, w0 / 2, 'rgba(28,28,28,0.9)');
    if (w0 >= 1800) {
      text(ctx, 'TIMEOUT', x0 + 100, 106, 150, { align: 'left', fill: ORANGE, ls: 4 });
      if (T.name) {
        ctx.fillStyle = T.c3; ctx.fillRect(x0 + 104, 178, 14, 52);
        fitText(ctx, T.name, x0 + 132, 204, 56, w0 / 2 - 420, { align: 'left', weight: 700, italic: false, fill: '#fff', ls: 4 });
      }
      if (presenter) {
        const lx = x0 + w0 - 80 - 420;
        if (w0 >= 2200) text(ctx, 'PRESENTED BY', lx - 40, H / 2 - 4, 46, { align: 'right', weight: 700, italic: false, fill: 'rgba(255,255,255,0.75)', ls: 4 });
        ctx.fillStyle = '#000'; ctx.fillRect(lx, 34, 420, H - 76);
        logo(ctx, presenter, lx + 210, H / 2 - 4, 380, 160);
      }
      text(ctx, `${mm}:${ss}`, b.cx, H / 2 - 4, 212, { align: 'center', fill: blink ? BRAND.red : '#fff', ls: 4 });
    } else {
      text(ctx, 'TIMEOUT', x0 + 70, H / 2 - 4, 150, { align: 'left', fill: ORANGE, ls: 4 });
      text(ctx, `${mm}:${ss}`, b.cx, H / 2 - 4, 180, { align: 'center', fill: blink ? BRAND.red : '#fff', ls: 4 });
      if (presenter) logo(ctx, presenter, x0 + w0 - 70, H / 2 - 4, 360, 150, 'right');
    }
  }
  span(ctx, 0, P, BRAND.charcoal, H - 14, 14);
  const len = P * rem / dur;
  const gr = ctx.createLinearGradient(0, 0, P, 0); gr.addColorStop(0, PURPLE); gr.addColorStop(1, ORANGE);
  span(ctx, 0, len, gr, H - 14, 14);
  ctx.fillStyle = '#fff'; ctx.fillRect(len - 24, H - 14, 24, 14);
}

function swap(ctx, g, t) {
  const P = g.P, A = SCENE_PAL.swapA, B = SCENE_PAL.swapB;
  const p = eio(clamp((t - 0.8) / 3.4)), th = p * P / 2;
  span(ctx, th, P / 2, vgrad(ctx, A.c2, A.c1));
  span(ctx, th + P / 2, P / 2, vgrad(ctx, B.c2, B.c1));
  const spd = 300 + 1600 * Math.sin(Math.PI * p);
  chevrons(ctx, t * spd, 150, 'rgba(255,255,255,0.12)', 26);
  for (const u of [th, th + P / 2]) edge(ctx, mod(u, P), '#ffffff');
  for (const b of g.boards) {
    scrim(ctx, b.cx, 700, 'rgba(0,0,0,0.45)');
    text(ctx, 'SWITCH SIDES', b.cx, H / 2, 200, { ls: 6 });
    const a = (t * 2) % 1;
    for (const side of [-1, 1]) {
      const ax = b.cx + side * 640;
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 16;
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = clamp(1 - Math.abs(((k / 3 + a) % 1) - 0.5) * 2);
        const x = ax + side * (k * 46 - 46);
        ctx.beginPath(); ctx.moveTo(x - 20, H / 2 - 50); ctx.lineTo(x + 20, H / 2); ctx.lineTo(x - 20, H / 2 + 50); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function hype(ctx, g, t) {
  const P = g.P;
  ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, P, H);
  const pal = [BRAND.orange, BRAND.red, BRAND.lavender, BRAND.mint];
  const env = clamp(t / 0.6) * (t > 7 ? 1.35 : 1);
  for (let x = 0; x < P; x += 44) {
    const v = Math.abs(Math.sin(x * 0.013 + t * 9) * Math.sin(x * 0.0037 - t * 4.3)) * 0.8 + 0.2;
    ctx.fillStyle = pal[Math.floor(mod(x / 640 + t * 3, pal.length))];
    ctx.fillRect(x, H - v * 58 * env, 34, v * 58 * env);
    ctx.fillRect(x, 0, 34, v * 34 * env);
  }
  const beat = Math.floor(t * 6), fr = t * 6 - beat;
  for (const b of g.boards) {
    if (beat % 4 === b.i) { ctx.fillStyle = `rgba(255,255,255,${0.2 * (1 - fr)})`; ctx.fillRect(b.x, 0, b.w, H); }
    const loud = t > 7, word = loud ? 'LOUDER!' : 'MAKE SOME NOISE', size = loud ? 236 : 196;
    font(ctx, size, 900, true); ctx.letterSpacing = '8px';
    const tw = ctx.measureText(word).width;
    let x = b.cx - tw / 2;
    const shake = loud ? (Math.sin(t * 60) * 6) : 0;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]; font(ctx, size, 900, true); ctx.letterSpacing = '8px';
      const cw = ctx.measureText(ch).width;
      const dy = Math.sin(t * 9 - (x - b.x) / 150) * (loud ? 10 : 16);
      const col = ['#ffffff', BRAND.orange, '#ffffff', BRAND.mint][mod(i + Math.floor(t * 4), 4)];
      text(ctx, ch, x + shake, H / 2 + dy, size, { align: 'left', fill: col, ls: 8, stroke: '#141414', lw: 10 });
      x += cw;
    }
  }
}

function pending(ctx, g, t, opt) {
  const pads = opt.timeoutPads || [0, 0, 0, 0];
  const P = g.P;
  const per = 3.5, ph = mod(t, per * 2) / per, mix = ph < 1 ? 0 : 1, fade = clamp((mod(t, per) - (per - 1.2)) / 1.2);
  const m = eio(Math.abs(mix - fade));
  const lerp = (a, b) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * m)).join(',')})`; };
  ctx.fillStyle = vgrad(ctx, lerp('#0fae5a', BRAND.red), lerp('#03401f', '#5a0000')); ctx.fillRect(0, 0, P, H);
  chevrons(ctx, t * 600, 160, 'rgba(255,255,255,0.12)', 28);
  band(ctx, mod(t * 0.45, 1) * P, 900, '#ffffff', 0.25);
  const dots = Math.floor(t * 2.5) % 4;
  for (const b of g.boards) {
    scrim(ctx, b.cx, 820, 'rgba(0,0,0,0.45)');
    font(ctx, 200, 900, true); ctx.letterSpacing = '8px';
    const w = ctx.measureText('DECISION PENDING').width; ctx.letterSpacing = '0px';
    text(ctx, 'DECISION PENDING', b.cx, H / 2, 200, { ls: 8, fill: '#fff' });
    const st = IMG[stupaLogoUrl], pad = pads[b.i] || 0;
    if (st && st.naturalWidth) {
      const lh = 150, lw = st.naturalWidth * lh / st.naturalHeight, room = b.cx - w / 2 - 150 - (b.x + pad);
      const s = Math.min(1, room / lw), dw = lw * s, dh = lh * s;
      if (s > 0.3) { ctx.drawImage(st, b.x + pad, H / 2 - dh / 2, dw, dh); ctx.drawImage(st, b.x + b.w - pad - dw, H / 2 - dh / 2, dw, dh); }
    }
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k < dots ? '#ffffff' : 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.cx + w / 2 + 30 + k * 40, H / 2 + 48, 22, 22);
    }
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * pulse;
  span(ctx, 0, P, '#ffffff', 0, 10); span(ctx, 0, P, '#ffffff', H - 10, 10);
  ctx.restore();
}

function drawScene(ctx, g, sc, t, opt) {
  switch (sc.id) {
    case 'gamepoint': return point(ctx, g, t, sc.team, false);
    case 'matchpoint': return point(ctx, g, t, sc.team, true);
    case 'intro': return intro(ctx, g, t, sc.team, opt, sc.dur || SCENES.intro.dur);
    case 'timeout': return timeout(ctx, g, t, sc.team, sc.dur || SCENES.timeout.dur, opt);
    case 'switch': return swap(ctx, g, t);
    case 'hype': return hype(ctx, g, t);
    case 'pending': return pending(ctx, g, t, opt);
    default: return sponsors(ctx, g, t, opt);
  }
}

// state: { cur:{id,team,start,dur?}, prev:{...}|null }  (start = epoch ms)
// Timed scenes fall back to the sponsor loop when they run out.
export function advance(state, now) {
  const d = state.cur.dur || SCENES[state.cur.id]?.dur;
  if (d && now > state.cur.start + d * 1000) {
    return { prev: state.cur, cur: { id: 'sponsors', team: state.cur.team, start: state.cur.start + d * 1000 } };
  }
  return state;
}

// Draws the full looped strip (P×256 logical px) into ctx.
export function render(ctx, g, state, now, opt = {}) {
  ctx._P = g.P;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { cur, prev } = state, tc = (now - cur.start) / 1000, TR = 0.95;
  if (prev && tc < TR) {
    drawScene(ctx, g, prev, (now - prev.start) / 1000, opt);
    const f = eout(clamp(tc / TR)) * g.P;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, f, H); ctx.clip();
    drawScene(ctx, g, cur, tc, opt); ctx.restore();
    edge(ctx, f, cur.team?.c3 || ORANGE);
  } else drawScene(ctx, g, cur, Math.max(0, tc), opt);
}
