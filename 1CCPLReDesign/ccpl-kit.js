// CCPL Battle Briefing — shared motion kit (tokens, easing, plate, icons, type, renderer, exporters)
export const W = 1080, H = 1920, FPS = 30;
export const IN = 0.3, OUT = 0.25;

export const C = {
  plate: 'rgba(16,16,18,0.9)', edge: 'rgba(255,255,255,0.24)', perf: 'rgba(255,255,255,0.2)',
  white: '#FFFFFF', dim: 'rgba(255,255,255,0.58)', unlit: '#34343A', panel: '#0A0A0C', bezel: '#2E2E33',
  amber: '#E47E48', amberHi: '#F2B48F', purple: '#6200E6', lav: '#B18CFF',
  gold: '#F2C14E', // reserved: Golden Point only
  ok: '#3FC48A', alert: '#E5484D', // emergency-card status colours (ok is kept off #00FF00 so it survives the green key)
  green: '#00FF00',
};
export const S = { stroke: 14, mass: 26, plateR: 40, radius: 14, module: 400, margin: 60, top: 160 };
export const F = { cond: '"Barlow Condensed", "Arial Narrow", sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };

// ---------- easing / time ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const E = {
  linear: p => p,
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inCubic: p => p * p * p,
  inOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
};
export const pulse = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin(Math.PI * (t - a) / d));
export function shake(t, a, d, amp, freq = 22) {
  if (t < a || t > a + d) return { x: 0, y: 0, r: 0 };
  const u = t - a, k = Math.pow(1 - u / d, 2), w = u * freq * Math.PI * 2;
  return { x: Math.sin(w) * amp * k, y: Math.cos(w * 1.37) * amp * 0.7 * k, r: Math.sin(w * 0.8) * 0.014 * k };
}
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- geometry ----------
export function moduleRect(corner, w = S.module, h = S.module) {
  return { x: corner === 'TR' ? W - S.margin - w : S.margin, y: S.top, w, h };
}
export function envelope(t, dur, enter = true, exit = true) {
  const p = enter ? seg(t, 0, IN) : 1, q = exit ? seg(t, dur - OUT, dur) : 0;
  return {
    scale: lerp(0.7, 1, E.outBack(p, 2.4)) * (1 - 0.05 * q),
    alpha: clamp(p * 2.5) * (1 - E.outCubic(q)),
    slide: -46 * E.inCubic(q), lift: -10 * E.inCubic(q),
  };
}
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- assets ----------
const logo = new Image();
const logoReady = new Promise(res => { logo.onload = res; logo.onerror = res; });
logo.src = new URL('./assets/cc-mark.png', import.meta.url).href;
export async function ready() {
  await Promise.all([
    document.fonts.load(`800 50px ${F.cond}`), document.fonts.load(`700 50px ${F.cond}`),
    document.fonts.load(`500 18px ${F.mono}`), document.fonts.load(`700 18px ${F.mono}`), logoReady,
  ]);
}
export function mark(ctx, x, y, h) { if (logo.naturalWidth) ctx.drawImage(logo, x, y, h * logo.naturalWidth / logo.naturalHeight, h); }
export const markW = h => (logo.naturalWidth ? h * logo.naturalWidth / logo.naturalHeight : h);
const cache = new Map();
export function cached(key, w, h, draw) {
  if (!cache.has(key)) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); draw(x); cache.set(key, c); }
  return cache.get(key);
}

// ---------- type ----------
export function text(ctx, str, x, y, o = {}) {
  const { font = 'cond', size = 40, weight = font === 'mono' ? 600 : 800, color = C.white, align = 'left', ls = 0, maxW = 0 } = o;
  ctx.save();
  let s = size;
  const set = () => { ctx.font = `${weight} ${s}px ${F[font]}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${ls * s / size}px`; };
  set();
  if (maxW) while (ctx.measureText(str).width > maxW && s > 8) { s -= 1; set(); }
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
  const wdt = ctx.measureText(str).width;
  ctx.restore();
  return wdt;
}
export function measure(ctx, str, o = {}) {
  const { font = 'cond', size = 40, weight = font === 'mono' ? 600 : 800, ls = 0 } = o;
  ctx.save(); ctx.font = `${weight} ${size}px ${F[font]}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${ls}px`;
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
// left-to-right wipe reveal of any drawing, with an amber cursor at the edge while in motion
export function wipe(ctx, x, y, w, h, p, draw, cursor = true) {
  if (p <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y, (w + 8) * p, h); ctx.clip(); draw(); ctx.restore();
  if (cursor && p < 1) { ctx.fillStyle = C.amber; rr(ctx, x + w * p, y + 4, 6, h - 8, 3); ctx.fill(); }
}

// ---------- plate + chrome ----------
let MATTE = false; // true while rendering onto green: drops soft shadows that would muddy the key
export function plate(ctx, w, h, o = {}) {
  const { r = S.plateR, notchX = null, notchY = null } = o;
  ctx.save();
  if (!MATTE) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 10; }
  rr(ctx, 0, 0, w, h, r); ctx.fillStyle = C.plate; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = C.edge; rr(ctx, 1.5, 1.5, w - 3, h - 3, r - 1.5); ctx.stroke(); ctx.restore();
  const notches = [];
  if (notchY != null) notches.push([0, notchY], [w, notchY]);
  if (notchX != null) notches.push([notchX, 0], [notchX, h]);
  for (const [nx, ny] of notches) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(nx, ny, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = C.edge; ctx.beginPath(); ctx.arc(nx, ny, 14.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (notchY != null) perforation(ctx, 26, notchY, w - 26, notchY);
  if (notchX != null) perforation(ctx, notchX, 26, notchX, h - 26);
}
export function perforation(ctx, x1, y1, x2, y2) {
  ctx.save(); ctx.strokeStyle = C.perf; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([0.1, 11]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
export function clipPlate(ctx, w, h, r = S.plateR) { rr(ctx, 3, 3, w - 6, h - 6, r - 3); ctx.clip(); }
// Standard 400×400 safety-card chrome: header (mark · flight code · captain), perforation, footer label
export function chrome(ctx, w, h, o = {}) {
  const { code = '', right = '', label = '', labelP = 1, labelColor = C.white } = o;
  plate(ctx, w, h, { notchY: 76 });
  mark(ctx, 28, 26, 28);
  text(ctx, `CCPL-S2 · ${code}`, 74, 48, { font: 'mono', size: 18, weight: 700, color: C.amber, ls: 1 });
  text(ctx, right, w - 28, 48, { font: 'mono', size: 18, weight: 500, color: C.dim, align: 'right', ls: 1 });
  if (label) {
    const lw = Math.min(w - 56, measure(ctx, label, { size: 54, ls: 1.5 }));
    wipe(ctx, 28, h - 82, lw, 64, labelP, () => text(ctx, label, 28, h - 32, { size: 54, ls: 1.5, color: labelColor, maxW: w - 56 }));
  }
}

// ---------- icon set (thick rounded strokes; one weight everywhere) ----------
export function ink(ctx, color = C.white, width = S.stroke) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
export function line(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
export const icons = {
  // belt + buckle, centred on 0,0, ~200 wide
  belt(ctx, color) {
    ink(ctx, color, 30); line(ctx, [[-96, 0], [-46, 0]]); line(ctx, [[46, 0], [96, 0]]);
    ink(ctx, color, S.stroke); rr(ctx, -44, -34, 88, 68, S.radius + 4); ctx.stroke();
    rr(ctx, -16, -11, 32, 22, 6); ctx.fill();
  },
  // pickleball: disc with hole pattern, radius r
  ball(ctx, r, color, hole = C.panel) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hole; const hr = r * 0.13;
    const pts = [[0, 0]]; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; pts.push([Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55]); }
    for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill(); }
  },
  // paddle: handle tip at 0,0, axis toward -y (handle 0..-58, face -58..-152)
  paddle(ctx, face = C.white, grip = C.amber) {
    ctx.fillStyle = grip; rr(ctx, -12, -64, 24, 64, 9); ctx.fill();
    ink(ctx, C.panel, 4); for (const y of [-16, -30, -44]) line(ctx, [[-10, y + 5], [10, y - 5]]);
    rr(ctx, -44, -156, 88, 102, 38); ctx.fillStyle = face; ctx.fill();
    ink(ctx, grip, 7); ctx.stroke();
  },
  // airline seat, side view; returns key points
  seat(ctx, color = C.white) {
    ink(ctx, color, S.mass);
    line(ctx, [[112, 108], [134, 250]]);       // backrest
    line(ctx, [[134, 250], [262, 250]]);       // cushion
    ink(ctx, color, S.stroke);
    line(ctx, [[198, 262], [198, 298]]);       // pedestal
    line(ctx, [[156, 298], [240, 298]]);       // foot
    line(ctx, [[128, 196], [176, 196]]);       // armrest
  },
  // player pictogram, feet at 0,0, ~230 tall incl. raised paddle. sex 'm'|'f'; side 1 = paddle on +x, -1 mirrored
  person(ctx, sex, color, o = {}) {
    const { side = 1, swing = 0 } = o, f = sex === 'f';
    ctx.save(); ctx.scale(side, 1);
    ink(ctx, color, S.stroke);
    const hip = f ? -72 : -84;
    line(ctx, [[-12, hip], [-17, -7]]); line(ctx, [[12, hip], [17, -7]]);
    line(ctx, [[-22, -140], [-36, -102], [-30, -86]]);
    if (f) { ink(ctx, color, 10); ctx.beginPath(); ctx.moveTo(-19, -150); ctx.lineTo(19, -150); ctx.lineTo(22, -108); ctx.lineTo(36, -74); ctx.lineTo(-36, -74); ctx.lineTo(-22, -108); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = color; rr(ctx, -26, -154, 52, 74, 18); ctx.fill(); }
    ink(ctx, color, S.stroke);
    line(ctx, [[22, -142], [46, -118], [58, -136]]);
    ctx.save(); ctx.translate(58, -136); ctx.rotate(0.3 + swing); ctx.scale(0.6, 0.6); icons.paddle(ctx, C.white, color); ctx.restore();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -180, 20, 0, Math.PI * 2); ctx.fill();
    if (f) { ink(ctx, color, 12); line(ctx, [[-14, -192], [-30, -176]]); }
    ctx.restore();
  },
  // same figure reduced to head + torso for tracker slots; base at 0,0, ~29 tall
  mini(ctx, sex, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -23, 5.5, 0, Math.PI * 2); ctx.fill();
    if (sex === 'f') { ink(ctx, color, 3); ctx.beginPath(); ctx.moveTo(-4.5, -15); ctx.lineTo(4.5, -15); ctx.lineTo(9, -1.5); ctx.lineTo(-9, -1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { rr(ctx, -7.5, -15, 15, 15, 5); ctx.fill(); }
  },
  tick(ctx, x, y, r, p, color = C.amber) {
    if (p <= 0) return;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * E.outBack(clamp(p * 2), 2), 0, Math.PI * 2); ctx.fill();
    const q = clamp(p * 2 - 0.6) / 1.4 * 1.4, a = [x - r * 0.45, y + r * 0.02], b = [x - r * 0.1, y + r * 0.38], c = [x + r * 0.5, y - r * 0.35];
    if (q <= 0) return;
    ink(ctx, C.panel, r * 0.32);
    const k = clamp(q / 0.4), pts = [a, [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]];
    if (q > 0.4) { const k2 = clamp((q - 0.4) / 0.6); pts.push([lerp(b[0], c[0], k2), lerp(b[1], c[1], k2)]); }
    line(ctx, pts);
  },
  burst(ctx, r1, r2, n, color) {
    ink(ctx, color, 8); ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  },
  spark(ctx, x, y, p, color = C.amber, n = 8, r0 = 14, r1 = 54, rot = 0) {
    if (p <= 0 || p >= 1) return;
    const a = 1 - p, e = E.outCubic(p);
    ctx.save(); ink(ctx, color, 7 * a + 2);
    for (let i = 0; i < n; i++) {
      const ang = rot + i * Math.PI * 2 / n, ri = lerp(r0, r1, e), ro = ri + 22 * a;
      line(ctx, [[x + Math.cos(ang) * ri, y + Math.sin(ang) * ri], [x + Math.cos(ang) * ro, y + Math.sin(ang) * ro]]);
    }
    ctx.restore();
  },
  ring(ctx, x, y, p, r0, r1, color = C.amber, width = 6) {
    if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - p; ink(ctx, color, width * (1 - p) + 1);
    ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, E.outCubic(p)), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  },
  barcode(ctx, x, y, w, h, seed, p = 1, color = C.white) {
    const r = rng(seed); let cx = x; ctx.fillStyle = color;
    while (cx < x + w) { const bw = 2 + Math.floor(r() * 3) * 2, gap = 3 + Math.floor(r() * 3) * 2; if (cx + bw > x + w) break; const bh = h * clamp(p * 1.4 - (cx - x) / w * 0.4); if (bh > 0) ctx.fillRect(cx, y + h - bh, bw, bh); cx += bw + gap; }
  },
};

// ---------- renderer: one deterministic frame ----------
export function renderFrame(ctx, clip, t, o = {}) {
  const { bg = null, scale = 1 } = o;
  MATTE = !!bg;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
  // a clip is one module (corner/w/h/draw) or several `layers`; a layer with enter/exit:false skips that half of the envelope (persistent graphics)
  const list = clip.layers || [{ corner: clip.corner, w: clip.w, h: clip.h, draw: clip.draw }];
  for (const L of list) {
    const w = L.w || S.module, h = L.h || S.module, m = moduleRect(L.corner, w, h), env = envelope(t, clip.dur, L.enter !== false, L.exit !== false);
    if (env.alpha <= 0.002) continue;
    // draw onto a layer so destination-out (notches, wear) never punches through the matte
    const layer = getLayer(ctx.canvas.width, ctx.canvas.height), lc = layer.getContext('2d');
    lc.setTransform(scale, 0, 0, scale, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, W, H);
    const dir = L.corner === 'TR' ? 1 : -1, px = L.corner === 'TR' ? w : 0;
    lc.save();
    lc.translate(m.x + px - env.slide * dir, m.y + env.lift);
    lc.scale(env.scale, env.scale); lc.translate(-px, 0);
    L.draw(lc, t, { w, h, clip, dur: clip.dur });
    lc.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = env.alpha; ctx.drawImage(layer, 0, 0); ctx.restore();
  }
  MATTE = false;
}
const layers = new Map();
function getLayer(w, h) { const k = w + 'x' + h; if (!layers.has(k)) { const c = document.createElement('canvas'); c.width = w; c.height = h; layers.set(k, c); } return layers.get(k); }

// ---------- export ----------
export const frameCount = clip => Math.round(clip.dur * FPS);
export const stillTime = clip => clip.still ?? (clip.dur - OUT - 1 / FPS);
export const baseName = clip => `${clip.id}_${clip.slug}_${clip.corner}`;
const pad = (n, l = 4) => String(n).padStart(l, '0');
function frameCanvas() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
const toBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
const tick = () => new Promise(r => setTimeout(r, 0));
export function save(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function addSequence(folder, clip, onP = () => {}) {
  const c = frameCanvas(), ctx = c.getContext('2d'), n = frameCount(clip), name = baseName(clip);
  for (let i = 0; i < n; i++) {
    renderFrame(ctx, clip, i / FPS);
    folder.file(`${name}_${pad(i)}.png`, await toBlob(c));
    onP((i + 1) / n);
    if (i % 4 === 0) await tick();
  }
}
export async function exportPNGZip(clip, onP) {
  const zip = new window.JSZip(), name = baseName(clip);
  await addSequence(zip.folder(name), clip, p => onP(p * 0.85));
  const blob = await zip.generate_async({ type: 'blob' }, m => onP(0.85 + m.percent / 100 * 0.15));
  save(blob, `${name}.zip`);
}
export async function stillBlob(clip) { const c = frameCanvas(); renderFrame(c.getContext('2d'), clip, stillTime(clip)); return toBlob(c); }
export async function exportStill(clip) { save(await stillBlob(clip), `${baseName(clip)}_still.png`); }
export async function exportAll(clips, sections, onP) {
  const zip = new window.JSZip(), root = zip.folder('CCPL-S2_battle-briefing_kit'), N = clips.length;
  for (let k = 0; k < N; k++) {
    const clip = clips[k], sec = sections.find(s => s.n === clip.section), name = baseName(clip);
    const folder = root.folder(`S${clip.section}_${slugify(sec ? sec.title : 'misc')}`);
    await addSequence(folder.folder(name), clip, p => onP((k + p * 0.6) / N * 0.94, k, 'PNG frames'));
    const v = await makeVideo(clip, p => onP((k + 0.6 + p * 0.4) / N * 0.94, k, 'green video'));
    folder.file(`${name}_green.${v.ext}`, v.blob);
    folder.file(`${name}_still.png`, await stillBlob(clip));
  }
  root.file('manifest.csv', manifest(clips, sections));
  const blob = await zip.generate_async({ type: 'blob' }, m => onP(0.94 + m.percent / 100 * 0.06, N - 1, 'zipping'));
  save(blob, 'CCPL-S2_battle-briefing_kit.zip');
}
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CORNER = { TL: 'TOP-LEFT', TR: 'TOP-RIGHT', 'TL-TR': 'LEFT + RIGHT' };
export function manifest(clips, sections) {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['clip_id', 'section', 'captain', 'spoken_line', 'corner', 'duration_s', 'frames', 'fps', 'width', 'height', 'timecode', 'basename']];
  for (const c of clips) { const s = sections.find(x => x.n === c.section); rows.push([c.id, `${c.section} ${s ? s.title : ''}`, c.captain, c.line, CORNER[c.corner] || c.corner, c.dur.toFixed(2), frameCount(c), FPS, W, H, c.tc, baseName(c)]); }
  return rows.map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
}

const MP4_MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.mjs';
async function encodeMP4(clip, onP) {
  if (!('VideoEncoder' in window)) return null;
  let cfg = null;
  for (const codec of ['avc1.640033', 'avc1.640032', 'avc1.640028', 'avc1.4d0033', 'avc1.42003e']) {
    const c = { codec, width: W, height: H, bitrate: 16e6, framerate: FPS, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch (e) {}
  }
  if (!cfg) return null;
  const { Muxer, ArrayBufferTarget } = await import(MP4_MUXER);
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null;
  const enc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { err = e; } });
  enc.configure(cfg);
  const c = frameCanvas(), ctx = c.getContext('2d'), n = frameCount(clip), us = 1e6 / FPS;
  for (let i = 0; i < n; i++) {
    if (err) throw err;
    renderFrame(ctx, clip, i / FPS, { bg: C.green });
    const f = new VideoFrame(c, { timestamp: Math.round(i * us), duration: Math.round(us) });
    enc.encode(f, { keyFrame: i % FPS === 0 }); f.close();
    while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
    onP((i + 1) / n * 0.95);
  }
  await enc.flush(); enc.close(); muxer.finalize();
  if (err) throw err;
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
}
// Fallback: MediaRecorder, paced in real time (frame content is still stepped deterministically)
async function recordFallback(clip, onP) {
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error('No video encoder available in this browser');
  const c = frameCanvas(), ctx = c.getContext('2d'), stream = c.captureStream(0), track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 }), parts = [];
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise(r => (rec.onstop = r));
  renderFrame(ctx, clip, 0, { bg: C.green }); rec.start();
  const n = frameCount(clip), t0 = performance.now();
  for (let i = 0; i < n; i++) {
    renderFrame(ctx, clip, i / FPS, { bg: C.green }); track.requestFrame && track.requestFrame();
    onP((i + 1) / n); const wait = t0 + (i + 1) * 1000 / FPS - performance.now();
    await new Promise(r => setTimeout(r, Math.max(0, wait)));
  }
  rec.stop(); await done;
  return { blob: new Blob(parts, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
}
export async function makeVideo(clip, onP) {
  let out = null;
  try { out = await encodeMP4(clip, onP); } catch (e) { console.warn('WebCodecs MP4 failed, falling back', e); }
  if (!out) out = await recordFallback(clip, onP);
  return out;
}
export async function exportAllGreen(clips, onP) {
  const zip = new window.JSZip(), root = zip.folder('CCPL-S2_green-screen'), N = clips.length;
  for (let k = 0; k < N; k++) {
    const clip = clips[k];
    const v = await makeVideo(clip, p => onP((k + p) / N * 0.96, k, 'green video'));
    root.file(`${baseName(clip)}_green.${v.ext}`, v.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, m => onP(0.96 + m.percent / 100 * 0.04, N - 1, 'zipping'));
  save(blob, 'CCPL-S2_green-screen.zip');
}
export async function exportVideo(clip, onP) {
  const out = await makeVideo(clip, onP);
  save(out.blob, `${baseName(clip)}_green.${out.ext}`);
  return out.ext;
}
