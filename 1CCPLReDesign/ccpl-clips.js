// CCPL Battle Briefing — clip registry. Add a clip = write a draw(ctx, t, {w,h}) and add ONE line to CLIPS.
import * as K from './ccpl-kit.js';
const { C, E, seg, lerp, pulse, icons } = K;

export const SECTIONS = [
  { n: 1, title: 'Open and Seatbelts' },
  { n: 2, title: 'The Battle' },
  { n: 3, title: 'Scoring' },
  { n: 4, title: 'Emergency Procedures' },
  { n: 5, title: 'Take-off', note: 'Final line “LET. THE. BATTLE. BEGIN.” has no corner graphic. Leave that frame clear.' },
];

// ---------- 00 · boarding pass tag ----------
function boardingPass(ctx, t, { w, h }) {
  const split = 292;
  K.plate(ctx, w, h, { notchX: split, r: 34 });
  K.text(ctx, 'BOARDING PASS', 28, 44, { font: 'mono', size: 16, weight: 700, color: C.amber, ls: 2 });
  K.text(ctx, 'FLIGHT', 28, 82, { font: 'mono', size: 14, weight: 500, color: C.dim, ls: 2 });
  const fw = K.measure(ctx, 'CCPL-S2', { size: 60, ls: 1 });
  K.wipe(ctx, 28, 82, fw, 58, E.outCubic(seg(t, 0.22, 0.62)), () => K.text(ctx, 'CCPL-S2', 28, 134, { size: 60, ls: 1 }));
  K.text(ctx, 'GATE', 28, 168, { font: 'mono', size: 14, weight: 500, color: C.dim, ls: 2 });
  const gw = K.measure(ctx, 'CENTRE COURT', { size: 38, ls: 1 });
  K.wipe(ctx, 28, 168, gw, 42, E.outCubic(seg(t, 0.5, 0.95)), () => K.text(ctx, 'CENTRE COURT', 28, 204, { size: 38, ls: 1, color: C.amber }));
  // stub
  const sx = split + 16, sw = w - split - 32;
  K.mark(ctx, sx + sw / 2 - 23, 26, 38);
  K.text(ctx, 'S2', sx + sw / 2, 96, { size: 30, align: 'center', color: C.white, ls: 2 });
  icons.barcode(ctx, sx + 4, 116, sw - 8, 86, 7, E.outCubic(seg(t, 0.7, 1.1)));
  const sp = seg(t, 1.12, 1.42);
  if (sp > 0 && sp < 1) { const y = lerp(112, 206, E.inOutCubic(sp)); ctx.fillStyle = C.amber; K.rr(ctx, sx - 6, y - 3, sw + 12, 6, 3); ctx.fill(); }
  const ok = seg(t, 1.42, 1.5);
  if (ok > 0) { ctx.save(); ctx.globalAlpha *= ok; icons.ring(ctx, sx + sw / 2, 160, seg(t, 1.42, 1.9), 20, 60, C.amber, 5); ctx.restore(); }
}

// ---------- 01 · fasten seatbelt sign ----------
function seatbeltSign(ctx, t, { w, h }) {
  const on = 0.78, flick = t >= on - 0.13 && t < on - 0.08, lit = t >= on || flick;
  K.chrome(ctx, w, h, { code: '01', right: 'CAPT 3', label: 'FASTEN SEATBELT', labelColor: t >= on ? C.white : C.unlit });
  const px = 40, py = 102, pw = 320, ph = 170;
  // ding: panel outline expands outward
  for (const [a, d] of [[on, 0.45], [on + 0.12, 0.5]]) {
    const p = seg(t, a, a + d);
    if (p > 0 && p < 1) { const g = E.outCubic(p) * 22; ctx.save(); ctx.globalAlpha *= 1 - p; K.ink(ctx, C.amber, 5 * (1 - p) + 1); K.rr(ctx, px - g, py - g, pw + g * 2, ph + g * 2, 30 + g); ctx.stroke(); ctx.restore(); }
  }
  ctx.fillStyle = C.panel; K.rr(ctx, px, py, pw, ph, 30); ctx.fill();
  K.ink(ctx, C.bezel, 6); K.rr(ctx, px, py, pw, ph, 30); ctx.stroke();
  K.ink(ctx, C.bezel, 4); K.line(ctx, [[200, py + 26], [200, py + ph - 26]]);
  const col = lit ? (flick ? C.amberHi : C.amber) : C.unlit;
  const glow = t >= on ? 16 + 26 * pulse(t, on, 0.5) + 14 * pulse(t, on + 0.75, 0.6) : 0;
  ctx.save();
  if (glow) { ctx.shadowColor = C.amber; ctx.shadowBlur = glow; }
  ctx.save(); ctx.translate(120, py + ph / 2); ctx.scale(0.62, 0.62); icons.belt(ctx, col); ctx.restore();
  ctx.save(); ctx.translate(280, py + ph / 2); icons.ball(ctx, 46, col, C.panel); ctx.restore();
  ctx.restore();
  // flash
  const fp = seg(t, on, on + 0.32);
  if (fp > 0 && fp < 1) { ctx.save(); ctx.globalAlpha *= 0.85 * (1 - E.outCubic(fp)); ctx.fillStyle = '#FFF4EC'; K.rr(ctx, px, py, pw, ph, 30); ctx.fill(); ctx.restore(); }
  if (t >= on) K.text(ctx, 'DING', px + pw - 18, py + ph - 16, { font: 'mono', size: 14, weight: 700, color: C.amberHi, align: 'right', ls: 3 });
}

// ---------- 02 · paddle clicks into seat buckle ----------
function seatPaddle(ctx, t, { w, h }) {
  K.chrome(ctx, w, h, { code: '02', right: 'CAPT 3', label: 'SECURE YOUR SEAT', labelP: E.outCubic(seg(t, 1.0, 1.3)) });
  ctx.save(); K.clipPlate(ctx, w, h); ctx.beginPath(); ctx.rect(0, 80, w, h - 160); ctx.clip();
  icons.seat(ctx, C.white);
  const th = 40 * Math.PI / 180, dx = Math.sin(th), dy = -Math.cos(th), B = [204, 232];
  const at = d => [B[0] + dx * d, B[1] + dy * d];
  const click = 0.98;
  const travel = E.outBack(seg(t, 0.3, 0.78), 1.2), push = E.inCubic(seg(t, 0.84, click));
  const recoil = -5 * pulse(t, click, 0.12);
  let d = lerp(62, 18, push) + recoil;
  const tip = at(d), off = 1 - travel;
  const tx = tip[0] + 150 * off, ty = tip[1] - 170 * off, rot = th - 0.9 * off;
  // strap from backrest to paddle throat
  const throat = [tx + Math.sin(rot) * 60, ty - Math.cos(rot) * 60];
  K.ink(ctx, C.amber, 12);
  ctx.beginPath(); ctx.moveTo(124, 172); ctx.quadraticCurveTo(170, 238, throat[0], throat[1]); ctx.stroke();
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot); icons.paddle(ctx); ctx.restore();
  // buckle receiver (drawn over handle so the inserted end disappears)
  const bump = 1 + 0.12 * pulse(t, click, 0.16);
  ctx.save(); ctx.translate(B[0], B[1]); ctx.rotate(th); ctx.scale(bump, bump);
  ctx.fillStyle = t >= click ? C.amber : C.white; K.rr(ctx, -19, -46, 38, 50, 10); ctx.fill();
  ctx.fillStyle = C.panel; K.rr(ctx, -8, -40, 16, 14, 4); ctx.fill();
  ctx.restore();
  const mouth = at(48);
  icons.spark(ctx, mouth[0], mouth[1], seg(t, click, click + 0.38), C.amberHi, 8, 14, 56, 0.2);
  ctx.restore();
  const cp = seg(t, click, click + 0.2);
  if (cp > 0) { ctx.save(); ctx.globalAlpha *= E.outCubic(cp); K.text(ctx, 'CLICK', 252, 292 - 8 * E.outBack(cp), { font: 'mono', size: 18, weight: 700, color: C.amberHi, ls: 3 }); ctx.restore(); }
}

// ---------- 03 · CCPL STYLE stamp ----------
const SW = 300, SH = 200;
function stampArt(ctx) {
  ctx.strokeStyle = C.amber; ctx.fillStyle = C.amber;
  ctx.lineWidth = 10; K.rr(ctx, 5, 5, SW - 10, SH - 10, 26); ctx.stroke();
  ctx.lineWidth = 3; K.rr(ctx, 18, 18, SW - 36, SH - 36, 16); ctx.stroke();
  K.text(ctx, 'CCPL', SW / 2, 118, { size: 116, ls: 4, color: C.amber, align: 'center' });
  K.text(ctx, 'STYLE', SW / 2, 168, { size: 46, ls: 16, color: C.amber, align: 'center' });
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  K.line(ctx, [[40, 152], [74, 152]]); K.line(ctx, [[SW - 74, 152], [SW - 40, 152]]);
  // worn ink
  const r = K.rng(31); ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.4 + r() * 0.6; ctx.beginPath(); ctx.arc(r() * SW, r() * SH, 0.6 + r() * r() * 3.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function ccplStamp(ctx, t, { w, h }) {
  const hit = 0.44, sk = K.shake(t, hit, 0.36, 11);
  ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2);
  K.chrome(ctx, w, h, { code: '03', right: 'CAPT 4', label: "LET'S PLAY", labelP: E.outCubic(seg(t, hit + 0.12, hit + 0.42)) });
  const fall = seg(t, 0.24, hit), cx = 200, cy = 190;
  // impact flash + dust
  icons.ring(ctx, cx, cy, seg(t, hit, hit + 0.42), 120, 210, C.amber, 8);
  const dp = seg(t, hit, hit + 0.5);
  if (dp > 0 && dp < 1) {
    const r = K.rng(9); ctx.save(); ctx.globalAlpha *= 1 - dp; ctx.fillStyle = C.amberHi;
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d0 = 120 + r() * 30, d = d0 + E.outCubic(dp) * (40 + r() * 50); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d * 0.62, 3 + r() * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (fall > 0) {
    const s = lerp(2.5, 1, E.inCubic(fall)) * (1 - 0.07 * pulse(t, hit, 0.14));
    const rot = lerp(-20, -8, E.outCubic(fall)) * Math.PI / 180;
    ctx.save(); ctx.globalAlpha *= seg(t, 0.24, 0.32);
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
    ctx.drawImage(K.cached('stamp', SW, SH, stampArt), -SW / 2, -SH / 2, SW, SH);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- section 2 · The Battle ----------
const SEX = { m: C.amber, f: C.lav };
const GAMES = [
  { code: 'MD 1', label: "MEN'S DOUBLES", figs: 'mm' },
  { code: 'WD', label: "WOMEN'S DOUBLES", figs: 'ff' },
  { code: 'MS', label: "MEN'S SINGLES", figs: 'm' },
  { code: 'WS', label: "WOMEN'S SINGLES", figs: 'f' },
  { code: 'MD 2', label: "MEN'S DOUBLES", figs: 'mm' },
  { code: 'XD', label: 'MIXED DOUBLES', figs: 'mf', gold: true },
];

// TOP-LEFT: game-type pictogram card
function gameCard(ctx, t, { w, h, clip }, i) {
  const g = GAMES[i], gold = !!g.gold;
  K.chrome(ctx, w, h, { code: clip.id, label: g.label, labelP: E.outCubic(seg(t, 0.32, 0.62)), labelColor: gold ? C.gold : C.white });
  const cp = E.outBack(seg(t, 0.38, 0.6), 2.2);
  if (cp > 0) {
    const cw = K.measure(ctx, g.code, { size: 30, ls: 1 }) + 26;
    ctx.save(); ctx.translate(w - 28 - cw / 2, 40); ctx.scale(cp, cp);
    ctx.fillStyle = gold ? C.gold : C.white; K.rr(ctx, -cw / 2, -18, cw, 36, 10); ctx.fill();
    K.text(ctx, g.code, 0, 11, { size: 30, ls: 1, color: C.panel, align: 'center' });
    ctx.restore();
  }
  if (gold) {
    const hp = E.outCubic(seg(t, 0.05, 0.4));
    ctx.save(); ctx.globalAlpha *= 0.16 * hp; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(200, 200, 110 * lerp(0.6, 1, hp), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha *= hp; K.ink(ctx, C.gold, 4); ctx.beginPath(); ctx.arc(200, 200, 110 * lerp(0.6, 1, hp), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    icons.ring(ctx, 200, 200, seg(t, 0.62, 1.1), 110, 150, C.gold, 5);
  }
  const figs = g.figs.split(''), n = figs.length, sc = n === 2 ? 0.88 : 0.96;
  figs.forEach((s, j) => {
    const p = seg(t, 0.08 + j * 0.08, 0.42 + j * 0.08); if (p <= 0) return;
    const k = E.outBack(p, 2), x = n === 2 ? 200 + (j ? 58 : -58) : 200, side = n === 2 && !j ? -1 : 1;
    ctx.save(); ctx.translate(x, 306); ctx.scale(sc * k, sc * k);
    icons.person(ctx, s, SEX[s], { side, swing: -0.4 * pulse(t, 0.62 + j * 0.06, 0.32) });
    ctx.restore();
  });
}

// TOP-RIGHT: persistent 6-slot tracker. state: { filled, fill, intro, finale }
const TH = 244, SX = 24, SY = 96, SLW = 52, SLG = 8, SLH = 124, FT = 0.36;
const BSW = 330, BSH = 84;
function battleStampArt(ctx) {
  ctx.fillStyle = C.panel; K.rr(ctx, 4, 4, BSW - 8, BSH - 8, 18); ctx.fill();
  ctx.strokeStyle = C.amber; ctx.lineWidth = 8; K.rr(ctx, 4, 4, BSW - 8, BSH - 8, 18); ctx.stroke();
  K.text(ctx, 'BATTLE = 6 GAMES', BSW / 2, 61, { size: 52, ls: 2, color: C.amber, align: 'center', maxW: BSW - 40 });
  const r = K.rng(57); ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 180; i++) { ctx.globalAlpha = 0.4 + r() * 0.6; ctx.beginPath(); ctx.arc(r() * BSW, r() * BSH, 0.6 + r() * r() * 2.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function slotIcon(ctx, g) {
  const figs = g.figs.split('');
  if (figs.length === 1) { ctx.save(); ctx.scale(1.1, 1.1); icons.mini(ctx, figs[0], SEX[figs[0]]); ctx.restore(); return; }
  figs.forEach((s, j) => { ctx.save(); ctx.translate(j ? 8 : -8, 0); ctx.scale(0.9, 0.9); icons.mini(ctx, s, SEX[s]); ctx.restore(); });
}
function tracker(ctx, t, { w, h, dur }, o) {
  const sk = o.intro ? K.shake(t, 0.95, 0.3, 8) : { x: 0, y: 0, r: 0 };
  ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2);
  K.plate(ctx, w, h, { notchY: 76 });
  K.mark(ctx, 28, 26, 28);
  K.text(ctx, 'BATTLE: 6 GAMES', 74, 52, { size: 36, ls: 1 });
  const cnt = o.fill != null && t >= FT + 0.1 ? o.fill + 1 : o.filled;
  K.text(ctx, `${cnt}/6`, w - 28, 50, { font: 'mono', size: 20, weight: 700, color: C.amber, align: 'right', ls: 1 });
  const cur = o.intro ? 0 : o.fill, ps = o.intro ? 2.1 : FT + 0.4, pe = o.finale ? 0.95 : dur - 0.3;
  const pw = seg(t, ps, ps + 0.15) * (1 - seg(t, pe - 0.2, pe)), amp = pw * (0.5 - 0.5 * Math.cos(2 * Math.PI * Math.max(0, t - ps) * 1.6));
  for (let i = 0; i < 6; i++) {
    const g = GAMES[i], x = SX + i * (SLW + SLG), y = SY, acc = g.gold ? C.gold : C.amber;
    const appear = o.intro ? E.outBack(seg(t, 0.28 + i * 0.06, 0.56 + i * 0.06), 2) : 1;
    if (appear <= 0) continue;
    const filling = i === o.fill, on = i < o.filled || (filling && t >= FT);
    const wave = o.finale ? pulse(t, 0.95 + i * 0.05, 0.3) : 0;
    const bump = 1 + (filling ? 0.18 * pulse(t, FT, 0.25) : 0) + 0.1 * wave;
    ctx.save(); ctx.translate(x + SLW / 2, y + SLH / 2); ctx.scale(appear * bump, appear * bump); ctx.translate(-x - SLW / 2, -y - SLH / 2);
    if (i === cur && amp > 0.01) { const g2 = 4 + 5 * amp; ctx.save(); ctx.globalAlpha *= amp; K.ink(ctx, acc, 3); K.rr(ctx, x - g2, y - g2, SLW + g2 * 2, SLH + g2 * 2, K.S.radius + g2); ctx.stroke(); ctx.restore(); }
    if (on) {
      ctx.fillStyle = C.panel; K.rr(ctx, x, y, SLW, SLH, K.S.radius); ctx.fill();
      K.ink(ctx, acc, 4); K.rr(ctx, x + 2, y + 2, SLW - 4, SLH - 4, K.S.radius - 2); ctx.stroke();
      K.text(ctx, String(i + 1), x + SLW / 2, y + 24, { font: 'mono', size: 15, weight: 700, color: C.white, align: 'center' });
      const ip = filling ? E.outBack(seg(t, FT + 0.05, FT + 0.3), 2.2) : 1;
      if (ip > 0) { ctx.save(); ctx.translate(x + SLW / 2, y + 64); ctx.scale(ip, ip); slotIcon(ctx, g); ctx.restore(); }
      K.text(ctx, g.code.replace(' ', ''), x + SLW / 2, y + 84, { font: 'mono', size: 13, weight: 700, color: C.white, align: 'center' });
      icons.tick(ctx, x + SLW / 2, y + 104, 11, filling ? seg(t, FT + 0.12, FT + 0.42) : 1, acc);
      const fl = Math.max(filling ? 1 - seg(t, FT, FT + 0.3) : 0, wave);
      if (fl > 0) { ctx.save(); ctx.globalAlpha *= 0.85 * fl; ctx.fillStyle = '#FFF4EC'; K.rr(ctx, x, y, SLW, SLH, K.S.radius); ctx.fill(); ctx.restore(); }
    } else {
      ctx.save(); K.ink(ctx, 'rgba(255,255,255,0.3)', 3); ctx.setLineDash([8, 7]); K.rr(ctx, x + 1.5, y + 1.5, SLW - 3, SLH - 3, K.S.radius - 1.5); ctx.stroke();
      ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x + SLW / 2, y + 104, 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      K.text(ctx, String(i + 1), x + SLW / 2, y + 24, { font: 'mono', size: 15, weight: 700, color: C.dim, align: 'center' });
    }
    ctx.restore();
    if (filling) icons.spark(ctx, x + SLW / 2, y + SLH / 2, seg(t, FT, FT + 0.4), acc, 8, 34, 50);
  }
  if (o.intro) {
    const fall = seg(t, 0.75, 0.95), lift = seg(t, 1.9, 2.2);
    if (fall > 0 && lift < 1) {
      const s = lerp(2.4, 1, E.inCubic(fall)) * (1 - 0.06 * pulse(t, 0.95, 0.14)) * (1 + 0.15 * E.inCubic(lift));
      ctx.save(); ctx.globalAlpha *= seg(t, 0.75, 0.82) * (1 - lift);
      ctx.translate(w / 2, 158); ctx.rotate(-6 * Math.PI / 180); ctx.scale(s, s);
      ctx.drawImage(K.cached('battle-stamp', BSW, BSH, battleStampArt), -BSW / 2, -BSH / 2, BSW, BSH);
      ctx.restore();
    }
    icons.ring(ctx, w / 2, 158, seg(t, 0.95, 1.35), 150, 220, C.amber, 6);
  }
  if (o.finale) {
    const bp = seg(t, 1.3, 1.55);
    icons.ring(ctx, w / 2, 158, seg(t, 1.3, 1.75), 60, 150, C.amber, 8);
    icons.spark(ctx, w / 2, 158, seg(t, 1.3, 1.7), C.amberHi, 12, 70, 116, 0.13);
    if (bp > 0) {
      const k = E.outBack(bp, 2.2);
      ctx.save(); ctx.translate(w / 2, 158); ctx.rotate(-0.12); ctx.scale(k, k);
      icons.burst(ctx, 80, 63, 14, C.amber);
      K.text(ctx, 'DING!', 0, 20, { size: 58, ls: 1, color: C.panel, align: 'center' });
      ctx.restore();
    }
  }
  ctx.restore();
}
const trk = (o, L = {}) => ({ corner: 'TR', w: 400, h: TH, draw: (c, t, a) => tracker(c, t, a, o), enter: false, exit: false, ...L });
const battle = i => [{ corner: 'TL', draw: (c, t, a) => gameCard(c, t, a, i) }, trk({ filled: i, fill: i, finale: i === 5 }, { exit: i === 5 })];

// ---------- section 3 · Scoring ----------
const capt = clip => clip.captain.toUpperCase().replace('CAPTAIN', 'CAPT');
function stampArtOf(label, sw, sh, seed) {
  return ctx => {
    ctx.fillStyle = C.panel; K.rr(ctx, 4, 4, sw - 8, sh - 8, 18); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 8; K.rr(ctx, 4, 4, sw - 8, sh - 8, 18); ctx.stroke();
    ctx.lineWidth = 3; K.rr(ctx, 15, 15, sw - 30, sh - 30, 10); ctx.stroke();
    K.text(ctx, label, sw / 2, sh / 2 + 21, { size: 60, ls: 3, color: C.amber, align: 'center', maxW: sw - 50 });
    const r = K.rng(seed); ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 200; i++) { ctx.globalAlpha = 0.4 + r() * 0.6; ctx.beginPath(); ctx.arc(r() * sw, r() * sh, 0.6 + r() * r() * 2.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}
function bodyClip(ctx, w, h) { ctx.save(); K.clipPlate(ctx, w, h); ctx.beginPath(); ctx.rect(0, 80, w, h - 160); ctx.clip(); }

// 11 · game to 15
function gameTo15(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'GAME TO 15', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  bodyClip(ctx, w, h);
  const r = 62, floor = 292, fall = seg(t, 0.08, 0.42), u = seg(t, 0.42, 0.72);
  const hop = t < 0.42 ? lerp(220, 0, E.inCubic(fall)) : 44 * 4 * u * (1 - u);
  const sq = 0.14 * pulse(t, 0.42, 0.1) + 0.08 * pulse(t, 0.72, 0.08);
  ctx.save(); ctx.globalAlpha *= 0.35 * clamp01(1 - hop / 220); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(200, floor + 4, r * (1 - hop / 400), 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(200, floor - hop); ctx.scale(1 + sq, 1 - sq); ctx.translate(0, -r); ctx.rotate(2.6 * Math.min(t, 0.9)); icons.ball(ctx, r, C.amber, C.panel); ctx.restore();
  ctx.restore();
}
const clamp01 = v => Math.min(1, Math.max(0, v));

// 12 · four game wins tick on
const WIN_T = [0.45, 0.75, 1.05, 1.35];
function fourGames(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'WIN 4 GAMES', labelP: E.outCubic(seg(t, 0.3, 0.6)) });
  for (let i = 0; i < 4; i++) {
    const x = 80 + i * 80, on = t >= WIN_T[i], k = E.outBack(seg(t, 0.06 + i * 0.05, 0.3 + i * 0.05), 2) * (1 + 0.18 * pulse(t, WIN_T[i], 0.22));
    if (k <= 0) continue;
    ctx.save(); ctx.translate(x, 176); ctx.scale(k, k); icons.ball(ctx, 32, on ? C.amber : C.unlit, C.panel); ctx.restore();
    K.text(ctx, `G${i + 1}`, x, 136 - 4 * k + 4, { font: 'mono', size: 14, weight: 700, color: on ? C.white : C.dim, align: 'center' });
    if (on) icons.tick(ctx, x, 252, 15, seg(t, WIN_T[i], WIN_T[i] + 0.3), C.amber);
    else { ctx.save(); K.ink(ctx, 'rgba(255,255,255,0.3)', 3); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x, 252, 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    icons.spark(ctx, x, 176, seg(t, WIN_T[i], WIN_T[i] + 0.38), C.amberHi, 8, 36, 56);
  }
}

// 13 · trophy + BATTLE WON
const WSW = 300, WSH = 96;
function trophy(ctx) {
  ctx.fillStyle = C.amber;
  ctx.beginPath(); ctx.moveTo(-62, -82); ctx.lineTo(62, -82); ctx.quadraticCurveTo(60, 12, 0, 22); ctx.quadraticCurveTo(-60, 12, -62, -82); ctx.closePath(); ctx.fill();
  K.ink(ctx, C.amber, S_STROKE);
  ctx.beginPath(); ctx.arc(-62, -46, 26, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(62, -46, 26, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.fillStyle = C.amber; K.rr(ctx, -11, 16, 22, 34, 6); ctx.fill(); K.rr(ctx, -46, 46, 92, 20, 8); ctx.fill();
  ctx.fillStyle = C.white; K.rr(ctx, -58, 66, 116, 18, 7); ctx.fill();
  ctx.save(); ctx.translate(0, -36); ctx.scale(0.9, 0.9); icons.ball(ctx, 26, C.panel, C.amber); ctx.restore();
}
const S_STROKE = K.S.stroke;
const CONF = [C.amber, C.white, C.lav, C.amberHi];
function trophyWon(ctx, t, { w, h, clip }) {
  const hit = 0.75, sk = K.shake(t, hit, 0.3, 9);
  ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2);
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip) });
  const tp = E.outBack(seg(t, 0.08, 0.4), 2);
  ctx.save(); K.clipPlate(ctx, w, h); ctx.beginPath(); ctx.rect(0, 80, w, h - 84); ctx.clip();
  icons.ring(ctx, 200, 170, seg(t, 0.45, 0.9), 70, 170, C.amber, 6);
  if (tp > 0) { ctx.save(); ctx.translate(200, 180); ctx.scale(tp, tp); trophy(ctx); ctx.restore(); }
  const u = t - 0.45;
  if (u > 0) for (let i = 0; i < 40; i++) {
    const r = K.rng(200 + i), a = -Math.PI / 2 + (r() - 0.5) * 2.4, sp = 380 + r() * 420, spin = (r() - 0.5) * 18;
    const x = 200 + Math.cos(a) * sp * u, y = 150 + Math.sin(a) * sp * u + 0.5 * 1100 * u * u;
    if (y > h + 20) continue;
    ctx.save(); ctx.globalAlpha *= 1 - seg(u, 1.3, 1.9); ctx.translate(x, y); ctx.rotate(r() * 6 + spin * u); ctx.scale(1, Math.cos(u * (6 + r() * 8)));
    ctx.fillStyle = CONF[i % 4]; K.rr(ctx, -6, -3.5, 12, 7, 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  const fall = seg(t, 0.55, hit);
  if (fall > 0) {
    const s = lerp(2.4, 1, E.inCubic(fall)) * (1 - 0.06 * pulse(t, hit, 0.14));
    ctx.save(); ctx.globalAlpha *= seg(t, 0.55, 0.62); ctx.translate(200, 318); ctx.rotate(-7 * Math.PI / 180); ctx.scale(s, s);
    ctx.drawImage(K.cached('won-stamp', WSW, WSH, stampArtOf('BATTLE WON', WSW, WSH, 77)), -WSW / 2, -WSH / 2, WSW, WSH);
    ctx.restore();
  }
  ctx.restore();
}

// 15 · GameBreaker badge
const BOLT = [[30, 0], [0, 56], [22, 56], [14, 100], [48, 40], [26, 40], [40, 0]];
function gameBreaker(ctx, t, { w, h, clip }) {
  const beat = t >= 0.3 && t < 1.6 ? Math.floor((t - 0.3) / 0.16) % 2 === 0 : t >= 1.6;
  const flashing = t >= 0.3 && t < 1.6 && beat;
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip) });
  if (flashing) { K.ink(ctx, C.amber, 4); K.rr(ctx, 2, 2, w - 4, h - 4, K.S.plateR - 2); ctx.stroke(); }
  const lx = w - 44;
  if (beat) { ctx.save(); ctx.globalAlpha *= flashing ? 0.35 : 0.18; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(lx, 40, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = beat ? C.amber : C.unlit; ctx.beginPath(); ctx.arc(lx, 40, 12, 0, Math.PI * 2); ctx.fill();
  bodyClip(ctx, w, h + 60);
  const bp = E.outBack(seg(t, 0.12, 0.38), 2.4);
  if (bp > 0) {
    ctx.save(); ctx.translate(52, 148); ctx.scale(bp, bp); ctx.translate(-24, -50);
    K.ink(ctx, flashing ? C.amberHi : C.amber, 6); ctx.beginPath(); BOLT.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const sp = E.outCubic(seg(t, 0.15, 0.45)), off = lerp(-300, 0, sp);
  if (sp < 1) { K.ink(ctx, C.amber, 5); [126, 146, 166].forEach((y, i) => { const len = 170 * (1 - sp) * (1 - i * 0.2); K.line(ctx, [[90 + off - 10 - len, y], [90 + off - 10, y]]); }); }
  ctx.save(); ctx.translate(90 + off, 172); ctx.transform(1, 0, -0.2, 1, 0, 0);
  K.text(ctx, 'GAMEBREAKER', 0, 0, { size: 64, ls: 1, maxW: 276 });
  ctx.restore();
  const hp = E.outCubic(seg(t, 0.4, 0.7));
  if (hp > 0) {
    ctx.save(); K.rr(ctx, 28, 198, (w - 56) * hp, 20, 6); ctx.clip();
    ctx.fillStyle = C.amber; ctx.fillRect(28, 198, w - 56, 20);
    ctx.fillStyle = C.panel; const o = (t * 60) % 28;
    for (let x = 28 - 28 + o; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 218); ctx.lineTo(x + 14, 198); ctx.lineTo(x + 26, 198); ctx.lineTo(x + 12, 218); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}

// 16 · rally scoring loop
const R0 = 0.35, RP = 0.5;
function rally(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'EVERY RALLY = A POINT', labelP: E.outCubic(seg(t, 0.3, 0.6)) });
  const cx = 140, cy = 196, R = 84, n = t < R0 ? 0 : Math.floor((t - R0) / RP), tc = R0 + n * RP;
  const bk = E.outBack(seg(t, 0.05, 0.3), 2) * (1 + 0.1 * (n ? pulse(t, tc, 0.18) : 0));
  if (bk > 0) { ctx.save(); ctx.translate(cx, cy); ctx.scale(bk, bk); icons.ball(ctx, 44, C.white, C.panel); ctx.restore(); }
  const grow = E.outCubic(seg(t, 0.12, R0)), head = -Math.PI / 2 + Math.PI * 2 * Math.max(0, t - R0) / RP, tail = Math.PI * 1.55 * grow;
  if (grow > 0) {
    K.ink(ctx, C.amber, S_STROKE); ctx.beginPath(); ctx.arc(cx, cy, R, head - tail, head); ctx.stroke();
    const hx = cx + Math.cos(head) * R, hy = cy + Math.sin(head) * R, dx = -Math.sin(head), dy = Math.cos(head), nx = Math.cos(head), ny = Math.sin(head);
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(hx + dx * 22, hy + dy * 22); ctx.lineTo(hx + nx * 18 - dx * 4, hy + ny * 18 - dy * 4); ctx.lineTo(hx - nx * 18 - dx * 4, hy - ny * 18 - dy * 4); ctx.closePath(); ctx.fill();
    K.ink(ctx, C.amber, 6); ctx.stroke();
  }
  const ev = [[0, 0]]; for (let i = 1; i <= n; i++) ev.push([R0 + i * RP, i]);
  ctx.save(); ctx.globalAlpha *= seg(t, 0.2, 0.35);
  rollNum(ctx, ev, t, 312, 222, 0.18, [250, 110, 120, 130], { size: 112, align: 'center', color: C.white });
  K.text(ctx, 'POINTS', 312, 262, { font: 'mono', size: 15, weight: 700, color: C.amber, align: 'center', ls: 3 });
  ctx.restore();
  if (n) icons.spark(ctx, 312, 186, seg(t, tc, tc + 0.35), C.amberHi, 8, 54, 74);
}

// 17 · first to 25 flag
function flag25(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'FIRST TO 25', labelP: E.outCubic(seg(t, 0.3, 0.6)) });
  const pk = E.outBack(seg(t, 0.06, 0.32), 2);
  if (pk <= 0) return;
  ctx.save(); ctx.translate(200, 300); ctx.scale(pk, pk); ctx.translate(-200, -300);
  K.ink(ctx, C.white, S_STROKE); K.line(ctx, [[112, 296], [112, 104]]);
  ctx.fillStyle = C.white; K.rr(ctx, 84, 290, 56, 14, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(112, 100, 10, 0, Math.PI * 2); ctx.fill();
  const fw = 176 * E.outCubic(seg(t, 0.18, 0.5)), fh = 112, x0 = 120, y0 = 112, wave = x => Math.sin(x * 0.045 - t * 9) * 8 * (x / 176);
  if (fw > 2) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let x = 0; x <= fw; x += 8) ctx.lineTo(x0 + x, y0 + wave(x));
    for (let x = fw; x >= 0; x -= 8) ctx.lineTo(x0 + x, y0 + fh + wave(x));
    ctx.closePath(); ctx.fillStyle = C.amber; ctx.fill(); ctx.clip();
    K.text(ctx, '25', x0 + 88, y0 + 84 + wave(88), { size: 84, ls: 1, color: C.panel, align: 'center' });
    ctx.restore();
  }
  ctx.restore();
}

// 19 · golden point badge (gold allowed here)
const TWINKLE = [[96, 118, 0.5], [312, 132, 0.85], [292, 272, 1.2], [106, 262, 1.55], [328, 206, 1.9]];
function star4(ctx, r) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); }
function goldenPoint(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'GOLDEN POINT', labelP: E.outCubic(seg(t, 0.35, 0.65)), labelColor: C.gold });
  icons.ring(ctx, 200, 196, seg(t, 0.28, 0.8), 76, 160, C.gold, 6);
  icons.spark(ctx, 200, 196, seg(t, 0.28, 0.7), C.gold, 12, 82, 112, 0.13);
  const k = E.outBack(seg(t, 0.08, 0.38), 2.2);
  if (k > 0) {
    ctx.save(); ctx.translate(200, 196); ctx.scale(k, k); icons.ball(ctx, 74, C.gold, C.panel);
    ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.clip(); ctx.rotate(0.5);
    for (const [a, b] of [[0.55, 0.95], [1.7, 2.1]]) { const p = seg(t, a, b); if (p > 0 && p < 1) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(lerp(-130, 110, E.inOutCubic(p)), -100, 26, 200); } }
    ctx.restore();
  }
  for (const [x, y, a] of TWINKLE) { const p = seg(t, a, a + 0.5); if (p <= 0 || p >= 1) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(p); ctx.fillStyle = p < 0.5 ? C.white : C.gold; star4(ctx, 16 * Math.sin(Math.PI * p)); ctx.restore(); }
}

// TOP-RIGHT: persistent BATTLE SCOREBOARD. o: { mode:'games'|'gb', A, B (event lists [[time,value]...]), lit, litAt, unlitAt, tense, q, heart, gold, rd }
const BH = 244, RY = [96, 168], RH = 60;
const at = (ev, t) => { let i = 0; while (i + 1 < ev.length && ev[i + 1][0] <= t) i++; return { v: ev[i][1], pv: i ? ev[i - 1][1] : ev[0][1], tc: i ? ev[i][0] : -9 }; };
const ramp = (t0, t1, from, to, seed) => { const r = K.rng(seed), n = to - from, ev = [[0, from]]; for (let k = 1; k <= n; k++) ev.push([t0 + (t1 - t0) * (k - 0.5 + (r() - 0.5) * 0.6) / n, from + k]); return ev; };
function rollNum(ctx, ev, t, x, y, rd, box, o) {
  const s = at(ev, t), p = E.outCubic(seg(t, s.tc, s.tc + rd)), d = o.size * 0.8;
  ctx.save(); ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip();
  if (p < 1) { ctx.save(); ctx.globalAlpha *= 1 - p; K.text(ctx, String(s.pv), x, y - d * p, o); ctx.restore(); }
  ctx.save(); ctx.globalAlpha *= p; K.text(ctx, String(s.v), x, y + d * (1 - p), o); ctx.restore();
  ctx.restore();
}
function heartAmp(t, s, dur) {
  if (s == null || t < s) return 0;
  const ph = (t - s) % 0.85;
  return Math.max(pulse(ph, 0, 0.14), 0.6 * pulse(ph, 0.24, 0.14)) * (1 - seg(t, dur - 0.45, dur - 0.3));
}
const QPAT = '110100111011101111011111101111';
function board(ctx, t, { w, h, dur }, o) {
  const hb = heartAmp(t, o.heart, dur), g = o.gold != null ? E.outCubic(seg(t, o.gold, o.gold + 0.4)) : 0, rd = o.rd ?? 0.2;
  let lit = o.litAt != null ? seg(t, o.litAt, o.litAt + 0.12) : o.lit ? 1 : 0;
  if (o.unlitAt != null) lit *= 1 - seg(t, o.unlitAt, o.unlitAt + 0.2);
  const tw = o.tense != null ? seg(t, o.tense, o.tense + 0.15) * (1 - seg(t, dur - 0.5, dur - 0.3)) : 0;
  ctx.save(); const sc = 1 + 0.025 * hb; ctx.translate(w / 2, h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  if (g > 0) { const gl = 0.5 + 0.5 * Math.sin((t - o.gold) * Math.PI * 3); ctx.save(); ctx.globalAlpha *= g * (0.25 + 0.35 * gl); K.ink(ctx, C.gold, 6); K.rr(ctx, -7, -7, w + 14, h + 14, K.S.plateR + 7); ctx.stroke(); ctx.restore(); }
  K.plate(ctx, w, h, { notchY: 76 });
  if (g > 0) { ctx.save(); ctx.globalAlpha *= g; K.ink(ctx, C.gold, 4); K.rr(ctx, 2, 2, w - 4, h - 4, K.S.plateR - 2); ctx.stroke(); ctx.restore(); }
  K.mark(ctx, 28, 26, 28);
  K.text(ctx, 'BATTLE SCOREBOARD', 74, 52, { size: 36, ls: 1, maxW: w - 102 });
  for (let k = 0; k < 2; k++) {
    const ev = k ? o.B : o.A, s = at(ev, t), y = RY[k], x = 24, rw = w - 48;
    const col = k ? C.white : C.amber, litK = k ? 0 : lit, dark = litK > 0.5;
    const bump = o.mode === 'games' ? 1 + 0.06 * pulse(t, s.tc, 0.2) : 1;
    ctx.save(); ctx.globalAlpha *= 1 - (k ? lit * 0.6 : 0);
    ctx.translate(w / 2, y + RH / 2); ctx.scale(bump, bump); ctx.translate(-w / 2, -y - RH / 2);
    const amp = tw * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t - (o.tense || 0)) * 1.7 + k * Math.PI));
    if (amp > 0.01) { const gx = 3 + 4 * amp; ctx.save(); ctx.globalAlpha *= amp; K.ink(ctx, C.amber, 3); K.rr(ctx, x - gx, y - gx, rw + gx * 2, RH + gx * 2, K.S.radius + gx); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = C.panel; K.rr(ctx, x, y, rw, RH, K.S.radius); ctx.fill();
    K.ink(ctx, 'rgba(255,255,255,0.14)', 3); K.rr(ctx, x + 1.5, y + 1.5, rw - 3, RH - 3, K.S.radius - 1.5); ctx.stroke();
    if (litK > 0) { ctx.save(); ctx.globalAlpha *= litK; ctx.fillStyle = C.amber; K.rr(ctx, x, y, rw, RH, K.S.radius); ctx.fill(); ctx.restore(); }
    const fg = dark ? C.panel : col;
    K.text(ctx, k ? 'AWAY' : 'HOME', x + 20, y + 41, { size: 30, ls: 1, color: dark ? C.panel : C.white });
    const numO = c => ({ size: 50, align: 'right', color: c }), box = [x, y, rw, RH];
    if (o.mode === 'games') {
      for (let i = 0; i < 4; i++) {
        const px = x + 120 + i * 30, py = y + 30;
        if (i < s.v) { const pp = i === s.v - 1 && s.v > s.pv ? E.outBack(seg(t, s.tc, s.tc + 0.25), 2.4) : 1; ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(px, py, 9 * pp, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.save(); K.ink(ctx, dark ? 'rgba(10,10,12,0.4)' : 'rgba(255,255,255,0.3)', 2.5); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      }
      if (!k && lit > 0) {
        const pp = o.litAt != null ? E.outBack(seg(t, o.litAt + 0.05, o.litAt + 0.3), 2.4) : 1;
        ctx.save(); ctx.globalAlpha *= lit; ctx.translate(x + rw - 86, y + 32); ctx.scale(pp, pp);
        ctx.fillStyle = C.panel; K.rr(ctx, -10, -4, 20, 16, 4); ctx.fill();
        K.ink(ctx, C.panel, 3.5); ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6, -8); ctx.arc(0, -8, 6, Math.PI, 0); ctx.lineTo(6, -4); ctx.stroke();
        ctx.restore();
      }
    } else {
      const bx = x + 100, bw = 150, by = y + 22, bh = 16, frac = lerp(s.pv, s.v, E.outCubic(seg(t, s.tc, s.tc + rd))) / 25;
      if (hb > 0.01) { ctx.save(); ctx.globalAlpha *= hb; K.ink(ctx, C.amber, 3); K.rr(ctx, bx - 5, by - 5, bw + 10, bh + 10, 13); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; K.rr(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.fillStyle = col; K.rr(ctx, bx, by, Math.max(bh, bw * frac), bh, 8); ctx.fill();
      if (g > 0) { ctx.save(); ctx.globalAlpha *= g; ctx.fillStyle = C.gold; K.rr(ctx, bx, by, Math.max(bh, bw * frac), bh, 8); ctx.fill(); ctx.restore(); }
    }
    rollNum(ctx, ev, t, x + rw - 20, y + 48, rd, box, numO(fg));
    if (g > 0) { ctx.save(); ctx.globalAlpha *= g; rollNum(ctx, ev, t, x + rw - 20, y + 48, rd, box, numO(C.gold)); ctx.restore(); }
    ctx.restore();
  }
  if (o.litAt != null) {
    const fp = seg(t, o.litAt, o.litAt + 0.3);
    if (fp > 0 && fp < 1) { ctx.save(); ctx.globalAlpha *= 0.85 * (1 - fp); ctx.fillStyle = '#FFF4EC'; K.rr(ctx, 24, RY[0], w - 48, RH, K.S.radius); ctx.fill(); ctx.restore(); }
    icons.spark(ctx, w - 50, RY[0] + 30, seg(t, o.litAt, o.litAt + 0.4), C.amberHi, 8, 30, 52);
  }
  if (o.q != null && t >= o.q) {
    const f = Math.floor((t - o.q) * 30), on = f < QPAT.length ? QPAT[f] === '1' : f % 24 < 21, fade = 1 - seg(t, dur - 0.5, dur - 0.3);
    if (on && fade > 0) { ctx.save(); ctx.globalAlpha *= fade; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(292, 162, 21, 0, Math.PI * 2); ctx.fill(); K.text(ctx, '?', 292, 174, { size: 36, color: C.panel, align: 'center' }); ctx.restore(); }
  }
  if (g > 0) {
    const p = seg(t, o.gold + 0.35, o.gold + 0.95);
    if (p > 0 && p < 1) { ctx.save(); K.clipPlate(ctx, w, h); ctx.translate(lerp(-120, w + 120, E.inOutCubic(p)), 0); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.fillStyle = 'rgba(242,193,78,0.28)'; ctx.fillRect(-20, 0, 40, h); ctx.restore(); }
  }
  ctx.restore();
}
const sb = (o, L = {}) => ({ corner: 'TR', w: 400, h: BH, draw: (c, t, a) => board(c, t, a, o), enter: false, exit: false, ...L });
const tl = draw => ({ corner: 'TL', draw });

// ---------- section 4 · Emergency Procedures ----------
const TAU = Math.PI * 2;
function hazard(ctx, s, color = C.amber, mark = C.panel) {
  const p = [[0, -s * 0.5], [s * 0.56, s * 0.44], [-s * 0.56, s * 0.44]];
  K.ink(ctx, color, s * 0.16); ctx.beginPath(); p.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = mark; K.rr(ctx, -s * 0.06, -s * 0.2, s * 0.12, s * 0.38, s * 0.06); ctx.fill();
  ctx.beginPath(); ctx.arc(0, s * 0.3, s * 0.07, 0, TAU); ctx.fill();
}
// one face for 21/22/23. mood 'calm' | 'shout'; mouth 0..1 opens the shout
function face(ctx, r, mood, mouth = 0, color = C.white) {
  K.ink(ctx, color, K.S.stroke); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  K.ink(ctx, color, 9);
  if (mood === 'calm') {
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.36, -r * 0.06, r * 0.16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.46, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  } else {
    for (const sx of [-1, 1]) {
      K.line(ctx, [[sx * r * 0.56, -r * 0.4], [sx * r * 0.16, -r * (0.22 + 0.08 * mouth)]]);
      ctx.beginPath(); ctx.arc(sx * r * 0.34, -r * 0.06, r * 0.1, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(r * 0.08, r * 0.4, r * (0.2 + 0.12 * mouth), r * (0.1 + 0.2 * mouth), 0, 0, TAU);
    ctx.fillStyle = C.panel; ctx.fill(); K.ink(ctx, color, 9); ctx.stroke();
  }
}
function megaphone(ctx, L, color = C.white, accent = C.amber) {
  ctx.fillStyle = accent; K.rr(ctx, -8, -15, 22, 30, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -17); ctx.lineTo(L, -L * 0.42); ctx.lineTo(L, L * 0.42); ctx.lineTo(12, 17); ctx.closePath();
  K.ink(ctx, color, 10); ctx.fill(); ctx.stroke();
  K.ink(ctx, accent, 9); K.line(ctx, [[L, -L * 0.42 + 4], [L, L * 0.42 - 4]]);
  K.ink(ctx, color, K.S.stroke); K.line(ctx, [[26, 16], [22, 44]]);
}
function waves(ctx, x, t, amp, rate, spread, color = C.amber) {
  if (amp <= 0.01) return;
  for (let i = 0; i < 3; i++) {
    const ph = (t * rate + i / 3) % 1; ctx.save(); ctx.globalAlpha *= amp * (1 - ph) * Math.min(1, ph * 6);
    K.ink(ctx, color, 9); ctx.beginPath(); ctx.arc(x, 0, 16 + spread * ph, -0.7, 0.7); ctx.stroke(); ctx.restore();
  }
}

// 20 · bad line call
function lineCall(ctx, t, { w, h, clip }) {
  const flash = t >= 1.0 && Math.floor((t - 1.0) / 0.2) % 2 === 0;
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'IN or OUT?', labelP: E.outCubic(seg(t, 0.6, 0.9)), labelColor: flash ? C.amber : C.white });
  bodyClip(ctx, w, h);
  const cp = E.outCubic(seg(t, 0.0, 0.3));
  ctx.save(); ctx.globalAlpha *= cp;
  ctx.fillStyle = C.panel; K.rr(ctx, 28, 196, w - 56, 140, 18); ctx.fill();
  K.ink(ctx, C.white, 12); K.line(ctx, [[28, 252], [w - 28, 252]]); K.line(ctx, [[104, 252], [104, 340]]);
  ctx.restore();
  const fall = seg(t, 0.15, 0.5), u = seg(t, 0.5, 0.74);
  const y = t < 0.5 ? lerp(70, 252, E.inCubic(fall)) : 252 - 30 * 4 * u * (1 - u), s = t < 0.5 ? lerp(1.5, 1, fall) : 1;
  const sq = 0.16 * pulse(t, 0.5, 0.1) + 0.06 * pulse(t, 0.74, 0.08);
  if (fall > 0) {
    ctx.save(); ctx.globalAlpha *= 0.4 * seg(t, 0.3, 0.5); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(216, 256, 40, 10, 0, 0, TAU); ctx.fill(); ctx.restore();
    icons.ring(ctx, 216, 252, seg(t, 0.5, 0.9), 34, 80, C.amber, 6);
    ctx.save(); ctx.translate(216, y); ctx.scale(s * (1 + sq), s * (1 - sq)); ctx.rotate(2.4 * Math.min(t, 0.8)); icons.ball(ctx, 34, C.amber, C.panel); ctx.restore();
  }
  const hp = E.outBack(seg(t, 0.72, 0.95), 2.4), blink = t < 1.0 || Math.floor((t - 1.0) / 0.2) % 2 === 1;
  if (hp > 0) { ctx.save(); ctx.translate(318, 138); ctx.scale(hp, hp); hazard(ctx, 78, blink ? C.amber : C.amberHi); ctx.restore(); }
  ctx.restore();
}

// 21 · keep calm sign (seatbelt-sign style, green when lit, slow breathing)
function keepCalm(ctx, t, { w, h, clip }) {
  const on = 0.45;
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'KEEP CALM', labelColor: t >= on ? C.white : C.unlit });
  const px = 40, py = 102, pw = 320, ph = 170, br = t >= on ? 0.5 - 0.5 * Math.cos(TAU * (t - on) / 1.6) : 0;
  const ip = seg(t, on, on + 0.6);
  if (ip > 0 && ip < 1) { const g = E.outCubic(ip) * 22; ctx.save(); ctx.globalAlpha *= 1 - ip; K.ink(ctx, C.ok, 5 * (1 - ip) + 1); K.rr(ctx, px - g, py - g, pw + g * 2, ph + g * 2, 30 + g); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = C.panel; K.rr(ctx, px, py, pw, ph, 30); ctx.fill();
  K.ink(ctx, C.bezel, 6); K.rr(ctx, px, py, pw, ph, 30); ctx.stroke();
  K.ink(ctx, C.bezel, 4); K.line(ctx, [[200, py + 26], [200, py + ph - 26]]);
  const lit = t >= on, sc = 1 + 0.045 * br;
  ctx.save();
  if (lit) { ctx.shadowColor = C.ok; ctx.shadowBlur = 10 + 22 * br; }
  ctx.save(); ctx.translate(100, py + ph / 2 - 6); ctx.scale(sc, sc);
  ctx.save(); ctx.translate(30, 62); ctx.rotate(0.35); ctx.scale(0.5, 0.5); icons.paddle(ctx, lit ? C.white : C.unlit, lit ? C.ok : C.unlit); ctx.restore();
  face(ctx, 42, 'calm', 0, lit ? C.white : C.unlit);
  ctx.restore();
  ctx.save(); ctx.translate(280, py + ph / 2); ctx.scale(sc, sc);
  if (lit) icons.tick(ctx, 0, 0, 44, seg(t, on + 0.05, on + 0.45), C.ok);
  else { ctx.fillStyle = C.unlit; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.restore();
  const fp = seg(t, on, on + 0.32);
  if (fp > 0 && fp < 1) { ctx.save(); ctx.globalAlpha *= 0.7 * (1 - E.outCubic(fp)); ctx.fillStyle = '#F2FFF8'; K.rr(ctx, px, py, pw, ph, 30); ctx.fill(); ctx.restore(); }
  if (lit) K.text(ctx, 'BREATHE', px + pw - 18, py + ph - 16, { font: 'mono', size: 14, weight: 700, color: C.ok, align: 'right', ls: 3 });
}

// 22 → 23 · shouting face (persistent; 23 flips the tag)
function tag(ctx, x, y, label, bg, fg, withHazard) {
  const tw = K.measure(ctx, label, { size: 28, ls: 1.5 }) + (withHazard ? 66 : 32);
  ctx.fillStyle = bg; K.rr(ctx, x - tw, y, tw, 40, 12); ctx.fill();
  if (withHazard) { ctx.save(); ctx.translate(x - tw + 26, y + 21); hazard(ctx, 26, fg, bg); ctx.restore(); }
  K.text(ctx, label, x - 16, y + 30, { size: 28, ls: 1.5, color: fg, align: 'right' });
}
function shoutFace(ctx, t, { w, h, clip, dur }, phase) {
  const sk = phase ? K.shake(t, 0.42, 0.4, 10) : { x: 0, y: 0, r: 0 };
  ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2);
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'EXCESSIVE SHOUTING', labelP: phase ? 1 : E.outCubic(seg(t, 0.3, 0.6)) });
  bodyClip(ctx, w, h);
  const big = phase ? E.outBack(seg(t, 0.32, 0.52), 2.2) : 0;
  const mouth = phase ? lerp(0.6, 1, big) : 0.6 * E.outCubic(seg(t, 0.3, 0.6));
  const L = phase ? lerp(84, 136, big) : 84 * E.outBack(seg(t, 0.2, 0.45), 2);
  const amp = phase ? seg(t, 0.4, 0.6) : seg(t, 0.55, 0.75) * (1 - seg(t, dur - 0.55, dur - 0.3));
  const fs = phase ? 1 + 0.06 * pulse(t, 0.36, 0.2) : 1;
  ctx.save(); ctx.translate(112, 210); ctx.scale(fs, fs); face(ctx, 52, 'shout', mouth); ctx.restore();
  if (L > 4) {
    ctx.save(); ctx.translate(158, 228); ctx.rotate(-0.2);
    waves(ctx, L * 0.82, t, amp, phase ? 2.6 : 1.6, phase ? 70 : 54, phase ? C.alert : C.amber);
    megaphone(ctx, L, C.white, phase ? C.alert : C.amber);
    ctx.restore();
  }
  ctx.restore();
  const fp = phase ? seg(t, 0.4, 0.62) : 0, sy = Math.abs(Math.cos(Math.PI * fp));
  const tp = phase ? 1 : E.outBack(seg(t, 0.5, 0.72), 2.4);
  if (tp > 0) {
    ctx.save(); ctx.translate(w - 28, 112); ctx.scale(tp, tp * Math.max(0.02, sy)); ctx.translate(-(w - 28), -112);
    if (fp < 0.5) tag(ctx, w - 28, 92, 'WARNING', C.amber, C.panel, true);
    else tag(ctx, w - 28, 92, 'SHOUT LOUDER', C.alert, C.white, false);
    ctx.restore();
  }
  ctx.restore();
}

// 22 → 23 · decibel meter (persistent TR)
const MSEG = 12, MX = 28, MW = 344, MG = 6, MSW = (MW - MG * (MSEG - 1)) / MSEG, MBASE = 196;
const segCol = i => (i < 5 ? C.ok : i < 9 ? C.amber : C.alert);
const jit = t => Math.sin(t * 31) * 0.35 + Math.sin(t * 17.3 + 1) * 0.25;
function level(t, dur, phase) {
  if (!phase) return 7.6 * E.outCubic(seg(t, 0.35, 1.6)) + jit(t) * seg(t, 0.6, 0.9) * (1 - seg(t, dur - 0.6, dur - 0.3));
  if (t < 0.38) return 7.6 - 0.8 * pulse(t, 0.08, 0.3);
  return Math.min(12.6, lerp(7.6, 12, E.outBack(seg(t, 0.38, 0.5), 3))) - Math.abs(jit(t)) * 0.5 * seg(t, 0.7, 0.9);
}
function meter(ctx, t, { w, h, dur }, phase) {
  const sk = phase ? K.shake(t, 0.46, 0.42, 12) : { x: 0, y: 0, r: 0 };
  ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2);
  const lv = level(t, dur, phase), slam = phase ? seg(t, 0.46, 0.5) : 0;
  if (phase) icons.ring(ctx, w / 2, h / 2, seg(t, 0.46, 0.9), 150, 240, C.alert, 8);
  K.plate(ctx, w, h, { notchY: 76 });
  if (slam > 0) { ctx.save(); ctx.globalAlpha *= slam; K.ink(ctx, C.alert, 4); K.rr(ctx, 2, 2, w - 4, h - 4, K.S.plateR - 2); ctx.stroke(); ctx.restore(); }
  K.mark(ctx, 28, 26, 28);
  K.text(ctx, 'dB METER', 74, 52, { size: 36, ls: 1 });
  const db = Math.round(40 + Math.max(0, lv) * 6.5), zc = lv >= 9 ? C.alert : lv >= 5 ? C.amber : C.ok;
  K.text(ctx, `${db} dB`, w - 28, 50, { font: 'mono', size: 20, weight: 700, color: zc, align: 'right', ls: 1 });
  const blinkRed = phase && t >= 0.5 && t < 1.1 && Math.floor((t - 0.5) / 0.1) % 2 === 0;
  for (let i = 0; i < MSEG; i++) {
    const x = MX + i * (MSW + MG), sh = 34 + i * 6, y = MBASE - sh;
    const ap = phase ? 1 : E.outBack(seg(t, 0.06 + i * 0.025, 0.3 + i * 0.025), 2);
    if (ap <= 0) continue;
    const on = i + 0.5 < lv;
    ctx.save(); ctx.translate(x + MSW / 2, MBASE); ctx.scale(1, ap); ctx.translate(-x - MSW / 2, -MBASE);
    ctx.fillStyle = on ? (blinkRed && i >= 9 ? '#FFE3E4' : segCol(i)) : C.unlit; K.rr(ctx, x, y, MSW, sh, 6); ctx.fill();
    ctx.restore();
  }
  const lf = phase ? 1 - seg(t, 0.5, 0.65) : seg(t, 0.2, 0.45);
  if (lf > 0) {
    ctx.save(); ctx.globalAlpha *= lf;
    K.text(ctx, 'CALM', MX, 226, { font: 'mono', size: 14, weight: 700, color: C.ok, ls: 2 });
    K.text(ctx, 'LOUD', MX + 5 * (MSW + MG), 226, { font: 'mono', size: 14, weight: 700, color: C.amber, ls: 2 });
    K.text(ctx, 'MAX', MX + MW, 226, { font: 'mono', size: 14, weight: 700, color: C.alert, align: 'right', ls: 2 });
    ctx.restore();
  }
  if (phase) {
    const vp = E.outBack(seg(t, 0.58, 0.8), 2.4);
    if (vp > 0) {
      const label = '+ VOLUME', tw = K.measure(ctx, label, { size: 26, ls: 1.5 }) + 64;
      ctx.save(); ctx.translate(w / 2, 220); ctx.scale(vp, vp);
      ctx.fillStyle = C.alert; K.rr(ctx, -tw / 2, -17, tw, 34, 11); ctx.fill();
      ctx.fillStyle = C.white; ctx.save(); ctx.translate(-tw / 2 + 22, 0);
      K.rr(ctx, -9, -5, 7, 10, 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(5, -11); ctx.lineTo(5, 11); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill();
      K.ink(ctx, C.white, 3); ctx.beginPath(); ctx.arc(6, 0, 8, -0.8, 0.8); ctx.stroke(); ctx.restore();
      K.text(ctx, label, tw / 2 - 16, 9, { size: 26, ls: 1.5, color: C.white, align: 'right' });
      ctx.restore();
    }
    icons.spark(ctx, MX + MW - MSW / 2, MBASE - 102, seg(t, 0.46, 0.85), C.alert, 8, 26, 56);
  }
  ctx.restore();
}
const shoutL = (phase, L = {}) => ({ corner: 'TL', draw: (c, t, a) => shoutFace(c, t, a, phase), ...L });
const dbm = (phase, L = {}) => ({ corner: 'TR', w: 400, h: 244, draw: (c, t, a) => meter(c, t, a, phase), enter: false, exit: false, ...L });

// ---------- section 5 · Take-off ----------
const NOSHAKE = { x: 0, y: 0, r: 0 };
function shaken(ctx, w, h, sk) { ctx.save(); ctx.translate(w / 2 + sk.x, h / 2 + sk.y); ctx.rotate(sk.r); ctx.translate(-w / 2, -h / 2); }

// TOP-RIGHT persistent checklist. o: { done, tick, at, intro, go }
const CL = [['TEAMS', 'READY'], ['PLAYERS', 'SET'], ['REFEREES', 'IN POSITION']], CRY = [118, 166, 214];
function checklist(ctx, t, { w, h, dur }, o) {
  shaken(ctx, w, h, o.go != null ? K.shake(t, o.go, 0.32, 9) : NOSHAKE);
  K.plate(ctx, w, h, { notchY: 76 });
  const goP = o.go != null ? seg(t, o.go, o.go + 0.12) : 0;
  if (goP > 0) { ctx.save(); ctx.globalAlpha *= goP; K.ink(ctx, C.ok, 4); K.rr(ctx, 2, 2, w - 4, h - 4, K.S.plateR - 2); ctx.stroke(); ctx.restore(); }
  K.mark(ctx, 28, 26, 28);
  K.text(ctx, 'PRE-FLIGHT CHECKLIST', 74, 52, { size: 36, ls: 1, maxW: w - 102 });
  const nxt = o.go == null ? o.tick + 1 : -1, ps = o.at + 0.4, pw = seg(t, ps, ps + 0.15) * (1 - seg(t, dur - 0.5, dur - 0.3));
  const amp = pw * (0.5 - 0.5 * Math.cos(2 * Math.PI * Math.max(0, t - ps) * 1.6));
  for (let i = 0; i < 3; i++) {
    const cy = CRY[i], ry = cy - 21, rw = w - 48;
    const ap = o.intro ? E.outBack(seg(t, 0.22 + i * 0.08, 0.46 + i * 0.08), 2) : 1;
    if (ap <= 0) continue;
    const ticking = i === o.tick, on = i < o.done || (ticking && t >= o.at), wave = o.go != null ? pulse(t, o.go + i * 0.06, 0.3) : 0;
    const bump = 1 + (ticking ? 0.05 * pulse(t, o.at, 0.22) : 0) + 0.04 * wave;
    ctx.save(); ctx.globalAlpha *= clamp01(ap * 1.5); ctx.translate(w / 2 + (1 - ap) * 40, cy); ctx.scale(bump, bump); ctx.translate(-w / 2, -cy);
    if (i === nxt && amp > 0.01) { const g = 3 + 4 * amp; ctx.save(); ctx.globalAlpha *= amp; K.ink(ctx, C.amber, 3); K.rr(ctx, 24 - g, ry - g, rw + g * 2, 42 + g * 2, K.S.radius + g); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = C.panel; K.rr(ctx, 24, ry, rw, 42, K.S.radius); ctx.fill();
    K.ink(ctx, 'rgba(255,255,255,0.14)', 3); K.rr(ctx, 25.5, ry + 1.5, rw - 3, 39, K.S.radius - 1.5); ctx.stroke();
    if (on) icons.tick(ctx, 50, cy, 14, ticking ? seg(t, o.at, o.at + 0.32) : 1, C.ok);
    else { ctx.save(); K.ink(ctx, 'rgba(255,255,255,0.3)', 3); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(50, cy, 12, 0, TAU); ctx.stroke(); ctx.restore(); }
    K.text(ctx, CL[i][0], 78, cy + 11, { size: 30, ls: 1, color: on ? C.white : C.dim });
    K.text(ctx, on ? CL[i][1] : 'STANDBY', w - 40, cy + 6, { font: 'mono', size: 15, weight: 700, color: on ? C.ok : C.dim, align: 'right', ls: 1.5 });
    const fl = Math.max(ticking ? 1 - seg(t, o.at, o.at + 0.3) : 0, wave) * (on ? 1 : 0);
    if (fl > 0) { ctx.save(); ctx.globalAlpha *= 0.8 * fl; ctx.fillStyle = '#F2FFF8'; K.rr(ctx, 24, ry, rw, 42, K.S.radius); ctx.fill(); ctx.restore(); }
    ctx.restore();
    if (ticking) icons.spark(ctx, 50, cy, seg(t, o.at, o.at + 0.4), C.ok, 8, 20, 40);
  }
  if (o.go != null) {
    icons.ring(ctx, w / 2, 166, seg(t, o.go, o.go + 0.45), 120, 210, C.ok, 8);
    const fall = seg(t, o.go - 0.18, o.go);
    if (fall > 0) {
      const s = lerp(2.3, 1, E.inCubic(fall)) * (1 - 0.06 * pulse(t, o.go, 0.14)), bw = 332, bh = 70;
      ctx.save(); ctx.globalAlpha *= seg(t, o.go - 0.18, o.go - 0.1); ctx.translate(w / 2, 166); ctx.rotate(-4 * Math.PI / 180); ctx.scale(s, s);
      ctx.fillStyle = C.ok; K.rr(ctx, -bw / 2, -bh / 2, bw, bh, 18); ctx.fill();
      K.ink(ctx, C.panel, 3); K.rr(ctx, -bw / 2 + 9, -bh / 2 + 9, bw - 18, bh - 18, 11); ctx.stroke();
      K.text(ctx, 'ALL SYSTEMS GO', 0, 18, { size: 50, ls: 2, color: C.panel, align: 'center', maxW: bw - 40 });
      ctx.restore();
    }
  }
  ctx.restore();
}
const chk = (o, L = {}) => ({ corner: 'TR', w: 400, h: 244, draw: (c, t, a) => checklist(c, t, a, o), enter: false, exit: false, ...L });

// 24 · shields face off
function shieldPath(ctx) { ctx.beginPath(); ctx.moveTo(-50, -60); ctx.lineTo(50, -60); ctx.lineTo(50, -10); ctx.quadraticCurveTo(48, 40, 0, 66); ctx.quadraticCurveTo(-48, 40, -50, -10); ctx.closePath(); }
function shield(ctx, fill, mark) {
  K.ink(ctx, fill, K.S.stroke); shieldPath(ctx); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.scale(0.74, 0.74); K.ink(ctx, mark, 6); shieldPath(ctx); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(0, -4); icons.ball(ctx, 22, mark, fill); ctx.restore();
}
function teamsReady(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'TEAMS READY', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  const sp = E.outBack(seg(t, 0.06, 0.4), 1.6), clash = 10 * pulse(t, 0.4, 0.14);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(200 + s * (88 - clash) + s * 120 * (1 - sp), 194); ctx.rotate(-s * 0.12);
    shield(ctx, s < 0 ? C.amber : C.white, C.panel); ctx.restore();
  }
  icons.spark(ctx, 200, 194, seg(t, 0.4, 0.78), C.amberHi, 8, 30, 64);
  const vp = E.outBack(seg(t, 0.44, 0.66), 2.6);
  if (vp > 0) { ctx.save(); ctx.translate(200, 194); ctx.scale(vp, vp); ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); K.ink(ctx, C.amber, 5); ctx.stroke(); K.text(ctx, 'VS', 0, 12, { size: 34, color: C.white, align: 'center', ls: 1 }); ctx.restore(); }
}

// 25 · paddle + ball
function playersSet(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'PLAYERS SET', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  bodyClip(ctx, w, h);
  const rp = seg(t, 0.06, 0.4), rot = lerp(-1.3, -0.4, E.outBack(rp, 1.8)) + 0.3 * pulse(t, 0.6, 0.2);
  if (rp > 0) { ctx.save(); ctx.translate(140, 312); ctx.rotate(rot); ctx.scale(1.25, 1.25); icons.paddle(ctx); ctx.restore(); }
  const bp = E.outBack(seg(t, 0.24, 0.46), 2.4), u = seg(t, 0.7, 1.05), hop = 52 * 4 * u * (1 - u), sq = 0.14 * pulse(t, 1.05, 0.1);
  if (bp > 0) {
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(296, 290, 36 * (1 - hop / 200), 8, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(296, 286 - hop); ctx.scale(bp * (1 + sq), bp * (1 - sq)); ctx.translate(0, -40); ctx.rotate(3 * u); icons.ball(ctx, 40, C.amber, C.panel); ctx.restore();
    icons.ring(ctx, 296, 246, seg(t, 0.62, 0.95), 44, 86, C.amber, 6);
  }
  ctx.restore();
}

// 26 · whistle + referee stand
function refStand(ctx, color) {
  K.ink(ctx, color, K.S.stroke);
  K.line(ctx, [[-50, 0], [-24, -138]]); K.line(ctx, [[50, 0], [24, -138]]);
  K.ink(ctx, color, 10); K.line(ctx, [[-41, -46], [41, -46]]); K.line(ctx, [[-33, -92], [33, -92]]);
  ctx.fillStyle = color; K.rr(ctx, -46, -158, 92, 22, 8); ctx.fill();
  K.ink(ctx, color, K.S.stroke); K.line(ctx, [[-38, -158], [-44, -206]]); K.line(ctx, [[-44, -206], [10, -206]]);
}
function whistle(ctx) {
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
  K.rr(ctx, 4, -40, 74, 32, 10); ctx.fill();
  ctx.fillStyle = C.panel; K.rr(ctx, 14, -40, 18, 10, 3); ctx.fill();
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(-2, 4, 14, 0, TAU); ctx.fill();
  K.ink(ctx, C.amber, 7); ctx.beginPath(); ctx.arc(-46, -26, 13, 0, TAU); ctx.stroke();
}
function refsReady(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'REFS IN POSITION', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  bodyClip(ctx, w, h);
  const sp = E.outBack(seg(t, 0.06, 0.36), 1.8);
  if (sp > 0) { ctx.save(); ctx.translate(112, 312); ctx.scale(1, sp); refStand(ctx, C.white); ctx.restore(); }
  const wp = E.outBack(seg(t, 0.2, 0.46), 2.2), blow = seg(t, 0.75, 0.85) * (1 - seg(t, 1.5, 1.7));
  if (wp > 0) {
    ctx.save(); ctx.translate(268, 228); ctx.scale(wp, wp); ctx.rotate(-0.18 + Math.sin(t * 70) * 0.05 * blow - 0.1 * blow); whistle(ctx);
    ctx.save(); ctx.translate(60, -52); ctx.rotate(-1.15); waves(ctx, 0, t, blow, 2.4, 50); ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

// 27 · return to seat
const qpt = (a, b, c, p) => [(1 - p) * (1 - p) * a[0] + 2 * (1 - p) * p * b[0] + p * p * c[0], (1 - p) * (1 - p) * a[1] + 2 * (1 - p) * p * b[1] + p * p * c[1]];
function returnSeat(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'RETURN TO SEAT', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  const arr = 0.82, home = t >= arr;
  ctx.save(); K.clipPlate(ctx, w, h); ctx.beginPath(); ctx.rect(0, 80, w, h - 160); ctx.clip();
  icons.seat(ctx, home ? C.amber : C.white);
  const p = E.inOutCubic(seg(t, 0.25, arr)), A = [342, 104], B = [350, 222], Z = [214, 214];
  if (p > 0) {
    const pts = []; for (let i = 0; i <= 24; i++) pts.push(qpt(A, B, Z, p * i / 24));
    ctx.save(); ctx.globalAlpha *= home ? 1 - seg(t, arr, arr + 0.3) * 0.6 : 1;
    K.ink(ctx, C.amber, K.S.stroke); ctx.setLineDash([2, 26]); K.line(ctx, pts); ctx.setLineDash([]);
    const tip = pts[24], pr = pts[22], ang = Math.atan2(tip[1] - pr[1], tip[0] - pr[0]);
    ctx.translate(tip[0], tip[1]); ctx.rotate(ang); ctx.fillStyle = C.amber; K.ink(ctx, C.amber, 8);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-14, -16); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  icons.ring(ctx, 198, 236, seg(t, arr, arr + 0.45), 30, 110, C.amber, 6);
  icons.spark(ctx, 198, 236, seg(t, arr, arr + 0.38), C.amberHi, 8, 40, 70);
  ctx.restore();
}

// 28 · tray table + lock
function padlock(ctx, closed) {
  K.ink(ctx, C.white, 10); const lift = 16 * (1 - closed);
  ctx.beginPath(); ctx.moveTo(-15, -2 - lift); ctx.lineTo(-15, -18 - lift); ctx.arc(0, -18 - lift, 15, Math.PI, 0); ctx.lineTo(15, -2 - lift * 0.3); ctx.stroke();
  ctx.fillStyle = C.amber; K.rr(ctx, -28, -6, 56, 44, 12); ctx.fill();
  ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(0, 10, 6, 0, TAU); ctx.fill(); K.rr(ctx, -3, 12, 6, 14, 3); ctx.fill();
}
function secureTray(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'SECURE FOOD & DRINKS', labelP: E.outCubic(seg(t, 0.35, 0.65)) });
  bodyClip(ctx, w, h);
  const lk = 1.0, locked = t >= lk;
  ctx.fillStyle = locked ? C.amber : C.white; K.rr(ctx, 58, 262, 284, 24, 10); ctx.fill();
  K.ink(ctx, C.white, K.S.stroke); K.line(ctx, [[96, 286], [96, 318]]); K.line(ctx, [[304, 286], [304, 318]]);
  const drop = (a) => { const f = seg(t, a, a + 0.22), u = seg(t, a + 0.22, a + 0.4); return { y: f < 1 ? lerp(-140, 0, E.inCubic(f)) : -18 * 4 * u * (1 - u), a: seg(t, a, a + 0.06), sq: 0.12 * pulse(t, a + 0.22, 0.1) }; };
  const c1 = drop(0.18), c2 = drop(0.32);
  if (c1.a > 0) {
    ctx.save(); ctx.globalAlpha *= c1.a; ctx.translate(132, 262 + c1.y); ctx.scale(1 + c1.sq, 1 - c1.sq);
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.moveTo(-26, -86); ctx.lineTo(26, -86); ctx.lineTo(19, 0); ctx.lineTo(-19, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.amber; K.rr(ctx, -31, -98, 62, 16, 6); ctx.fill(); ctx.fillStyle = C.panel; ctx.fillRect(-24, -56, 48, 14);
    K.ink(ctx, C.white, 8); K.line(ctx, [[6, -98], [16, -124], [30, -124]]);
    ctx.restore();
  }
  if (c2.a > 0) {
    ctx.save(); ctx.globalAlpha *= c2.a; ctx.translate(262, 262 + c2.y); ctx.scale(1 + c2.sq, 1 - c2.sq);
    ctx.fillStyle = C.amber; K.rr(ctx, -46, -24, 92, 24, 10); ctx.fill();
    ctx.fillStyle = C.white; K.rr(ctx, -52, -42, 104, 16, 8); ctx.fill();
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(-46, -46); ctx.quadraticCurveTo(-46, -92, 0, -92); ctx.quadraticCurveTo(46, -92, 46, -46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const lp = E.outBack(seg(t, 0.62, 0.84), 2.4);
  if (lp > 0) { ctx.save(); ctx.translate(200, 144); ctx.scale(lp * (1 + 0.12 * pulse(t, lk, 0.16)), lp * (1 + 0.12 * pulse(t, lk, 0.16))); padlock(ctx, E.inCubic(seg(t, 0.86, lk))); ctx.restore(); }
  icons.spark(ctx, 200, 140, seg(t, lk, lk + 0.38), C.amberHi, 8, 40, 66);
  ctx.restore();
  const cp = seg(t, lk, lk + 0.2);
  if (cp > 0) { ctx.save(); ctx.globalAlpha *= E.outCubic(cp); K.text(ctx, 'CLICK', 246, 128 - 8 * E.outBack(cp), { font: 'mono', size: 18, weight: 700, color: C.amberHi, ls: 3 }); ctx.restore(); }
}

// 29 · phone stays on
function plane(ctx, color) {
  K.ink(ctx, color, 10); K.line(ctx, [[0, -30], [0, 28]]);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-32, 8); ctx.lineTo(-32, 15); ctx.lineTo(0, 7); ctx.lineTo(32, 15); ctx.lineTo(32, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-13, 31); ctx.lineTo(13, 31); ctx.closePath(); ctx.fill();
}
function phoneOn(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip), label: 'KEEP ON', labelP: E.outCubic(seg(t, 0.35, 0.65)), labelColor: t >= 1.1 ? C.ok : C.white });
  const pp = E.outBack(seg(t, 0.06, 0.34), 2);
  if (pp > 0) {
    ctx.save(); ctx.translate(126, 204); ctx.scale(pp, pp); ctx.translate(-126, -204);
    ctx.fillStyle = C.panel; K.rr(ctx, 64, 98, 124, 212, 26); ctx.fill(); K.ink(ctx, C.white, 12); ctx.stroke();
    ctx.fillStyle = C.white; K.rr(ctx, 106, 112, 40, 10, 5); ctx.fill();
    const rt = Math.max(0, t - 0.3), rp = (rt % 0.8) / 0.8;
    if (t > 0.3) icons.ring(ctx, 126, 190, rp, 26, 48, C.alert, 5);
    ctx.fillStyle = C.alert; ctx.beginPath(); ctx.arc(126, 190, 26 * (1 - 0.08 * Math.sin(rt * 8)), 0, TAU); ctx.fill();
    K.text(ctx, 'REC', 126, 250, { font: 'mono', size: 18, weight: 700, color: C.white, align: 'center', ls: 3 });
    K.text(ctx, `00:0${Math.floor(t)}`, 126, 276, { font: 'mono', size: 15, weight: 500, color: C.dim, align: 'center', ls: 1 });
    ctx.restore();
  }
  const ap = E.outBack(seg(t, 0.22, 0.46), 2);
  if (ap > 0) {
    ctx.save(); ctx.translate(288, 160); ctx.scale(ap, ap);
    K.ink(ctx, C.white, 10); ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.stroke();
    ctx.save(); ctx.rotate(Math.PI / 4); plane(ctx, C.white); ctx.restore();
    const sl = E.outCubic(seg(t, 0.62, 0.84));
    if (sl > 0) { const a = [-36, -36], b = [lerp(-36, 36, sl), lerp(-36, 36, sl)]; K.ink(ctx, C.panel, 24); K.line(ctx, [a, b]); K.ink(ctx, C.alert, 12); K.line(ctx, [a, b]); }
    ctx.restore();
  }
  const tp = E.outBack(seg(t, 0.4, 0.62), 2), on = E.outBack(seg(t, 1.0, 1.22), 2);
  if (tp > 0) {
    ctx.save(); ctx.translate(288, 272); ctx.scale(tp, tp);
    ctx.fillStyle = on > 0.5 ? C.ok : C.unlit; K.rr(ctx, -42, -20, 84, 40, 20); ctx.fill();
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(lerp(-22, 22, on), 0, 15, 0, TAU); ctx.fill();
    ctx.restore();
    icons.spark(ctx, 288, 272, seg(t, 1.05, 1.4), C.ok, 8, 46, 70);
  }
}

// 30 · league lockup — Terminus × CCPL artwork (assets/terminus-ccpl-lockup.png, 2000²)
const LOCK = new Image();
await new Promise(res => { LOCK.onload = res; LOCK.onerror = res; LOCK.src = new URL('./assets/terminus-ccpl-lockup.png', import.meta.url).href; });
const LX0 = 370, LX1 = 1630, LY0 = 400, LY1 = 1500;
const LBANDS = [[400, 560, 0.30, 0.50], [620, 1065, 0.40, 0.66], [1075, 1325, 0.56, 0.80], [1330, 1500, 0.68, 0.90]];
function lockup(ctx, t, { w, h, clip }) {
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip) });
  const cx = 24, cy = 88, cw = w - 48, ch = 236;
  const cp = E.outBack(seg(t, 0.06, 0.32), 1.8);
  if (cp > 0) {
    ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(cp, cp); ctx.translate(-cw / 2, -ch / 2);
    ctx.fillStyle = C.white; K.rr(ctx, 0, 0, cw, ch, 22); ctx.fill();
    if (LOCK.complete && LOCK.naturalWidth) {
      const sc = Math.min((cw - 28) / (LX1 - LX0), (ch - 24) / (LY1 - LY0));
      const ox = (cw - (LX1 - LX0) * sc) / 2, oy = (ch - (LY1 - LY0) * sc) / 2;
      for (const [y0, y1, a, b] of LBANDS) {
        const p = E.outCubic(seg(t, a, b)); if (p <= 0) continue;
        const dy = oy + (y0 - LY0) * sc, bh = (y1 - y0) * sc;
        ctx.save(); ctx.beginPath(); ctx.rect(0, dy - 2, cw * p, bh + 4); ctx.clip();
        ctx.translate(0, (1 - p) * 10);
        ctx.drawImage(LOCK, LX0, y0, LX1 - LX0, y1 - y0, ox, dy, (LX1 - LX0) * sc, bh);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  const sp = E.outBack(seg(t, 0.84, 1.04), 2.4);
  if (sp > 0) {
    const sw = K.measure(ctx, 'SEASON 2', { size: 30, ls: 3 }) + 40;
    ctx.save(); ctx.translate(w / 2, cy + ch + 30); ctx.scale(sp, sp); ctx.fillStyle = C.amber; K.rr(ctx, -sw / 2, -20, sw, 40, 12); ctx.fill();
    K.text(ctx, 'SEASON 2', 0, 11, { size: 30, ls: 3, color: C.panel, align: 'center' }); ctx.restore();
  }
  for (const [a, b, al] of [[1.1, 1.5, 0.22], [2.1, 2.5, 0.14]]) {
    const p = seg(t, a, b); if (p <= 0 || p >= 1) continue;
    ctx.save(); K.clipPlate(ctx, w, h); ctx.translate(lerp(-120, w + 160, E.inOutCubic(p)), 0); ctx.transform(1, 0, -0.35, 1, 0, 0);
    ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fillRect(-30, 0, 60, h); ctx.fillRect(44, 0, 14, h); ctx.restore();
  }
}

// 31 · wings + WELCOME ABOARD stamp
const ASW = 340, ASH = 92;
function welcome(ctx, t, { w, h, clip }) {
  const hit = 0.78;
  shaken(ctx, w, h, K.shake(t, hit, 0.36, 11));
  K.chrome(ctx, w, h, { code: clip.id, right: capt(clip) });
  const cy = 178;
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) {
    const p = E.outBack(seg(t, 0.14 + j * 0.06, 0.4 + j * 0.06), 1.8); if (p <= 0) continue;
    const len = (124 - j * 30) * p;
    ctx.save(); ctx.translate(200 + s * 40, cy - 22 + j * 22); ctx.rotate(s * -0.14 + s * j * 0.05); ctx.fillStyle = C.white;
    K.rr(ctx, s > 0 ? 0 : -len, -8, len, 16, 8); ctx.fill(); ctx.restore();
  }
  const bp = E.outBack(seg(t, 0.06, 0.3), 2.2);
  if (bp > 0) { ctx.save(); ctx.translate(200, cy); ctx.scale(bp, bp); ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill(); K.ink(ctx, C.panel, 5); ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke(); icons.ball(ctx, 26, C.panel, C.amber); ctx.restore(); }
  icons.ring(ctx, 200, 290, seg(t, hit, hit + 0.42), 110, 200, C.amber, 8);
  const fall = seg(t, hit - 0.2, hit);
  if (fall > 0) {
    const s = lerp(2.4, 1, E.inCubic(fall)) * (1 - 0.06 * pulse(t, hit, 0.14));
    ctx.save(); ctx.globalAlpha *= seg(t, hit - 0.2, hit - 0.13); ctx.translate(200, 300); ctx.rotate(-6 * Math.PI / 180); ctx.scale(s, s);
    ctx.drawImage(K.cached('welcome-stamp', ASW, ASH, stampArtOf('WELCOME ABOARD', ASW, ASH, 91)), -ASW / 2, -ASH / 2, ASW, ASH);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- registry: ONE line per clip ----------
// id · section · slug · corner (TL|TR) · dur (s) · script timecode · captain · spoken line · draw  [· w,h for non-400 modules · optional]
export const CLIPS = [
  { id: '00', section: 1, slug: 'boarding-pass', corner: 'TL', dur: 2.6, tc: '00:00–00:02', captain: 'Opening', line: 'FLIGHT CCPL-S2 / GATE: CENTRE COURT', draw: boardingPass, w: 400, h: 230, optional: true },
  { id: '01', section: 1, slug: 'seatbelt-sign', corner: 'TL', dur: 2.8, tc: '00:02–00:04', captain: 'Captain 3', line: 'Fasten your seatbelts...', draw: seatbeltSign },
  { id: '02', section: 1, slug: 'secure-seat', corner: 'TL', dur: 2.8, tc: '00:04–00:06', captain: 'Captain 3', line: '...secure your seats...', draw: seatPaddle },
  { id: '03', section: 1, slug: 'ccpl-style', corner: 'TL', dur: 2.6, tc: '00:06–00:09', captain: 'Captain 4', line: "...and let's play some pickleball, CCPL style.", draw: ccplStamp },
  // section 2: `layers` = several corner modules; the tracker carries state clip-to-clip (enter/exit only on first/last)
  { id: '04', section: 2, slug: 'battle-6-games', corner: 'TR', dur: 3.0, tc: '00:09–00:12', captain: 'Captain 5', line: 'Each Battle consists of six games.', layers: [trk({ filled: 0, intro: true }, { enter: true })] },
  { id: '05', section: 2, slug: 'md1', corner: 'TL-TR', dur: 2.2, tc: '00:12–00:14', captain: 'Captain 6', line: "Men's Doubles.", layers: battle(0) },
  { id: '06', section: 2, slug: 'wd', corner: 'TL-TR', dur: 2.2, tc: '00:14–00:16', captain: 'Captain 7', line: "Women's Doubles.", layers: battle(1) },
  { id: '07', section: 2, slug: 'ms', corner: 'TL-TR', dur: 2.2, tc: '00:16–00:18', captain: 'Captain 8', line: "Men's Singles.", layers: battle(2) },
  { id: '08', section: 2, slug: 'ws', corner: 'TL-TR', dur: 2.2, tc: '00:18–00:20', captain: 'Captain 1', line: "Women's Singles.", layers: battle(3) },
  { id: '09', section: 2, slug: 'md2', corner: 'TL-TR', dur: 2.2, tc: '00:20–00:22', captain: 'Captain 2', line: "Men's Doubles.", layers: battle(4) },
  { id: '10', section: 2, slug: 'xd', corner: 'TL-TR', dur: 3.0, tc: '00:22–00:25', captain: 'Captain 3', line: 'And finally... Mixed Doubles.', layers: battle(5) },
  // section 3: scoreboard state chains 12→13→14 and 17→18→19 (each clip starts on the previous clip's last state)
  { id: '11', section: 3, slug: 'game-to-15', corner: 'TL', dur: 2.4, tc: '00:25–00:27', captain: 'Captain 4', line: 'Each game is played to 15 points.', draw: gameTo15 },
  { id: '12', section: 3, slug: 'win-4-games', corner: 'TL-TR', dur: 2.6, tc: '00:27–00:29', captain: 'Captain 5', line: 'If your team wins four games...', layers: [tl(fourGames), sb({ mode: 'games', A: [[0, 0], [0.45, 1], [0.75, 2], [1.05, 3], [1.35, 4]], B: [[0, 0], [0.6, 1], [0.9, 2]] }, { enter: true })] },
  { id: '13', section: 3, slug: 'battle-won', corner: 'TL-TR', dur: 2.6, tc: '00:29–00:31', captain: 'Captain 6', line: '...you win the Battle.', layers: [tl(trophyWon), sb({ mode: 'games', A: [[0, 4]], B: [[0, 2]], litAt: 0.4 })] },
  { id: '14', section: 3, slug: 'three-all', corner: 'TR', dur: 2.6, tc: '00:31–00:33', captain: 'Captain 7', line: "If it's three games all...", layers: [sb({ mode: 'games', A: [[0, 4], [0.32, 3]], B: [[0, 2], [0.32, 3]], lit: true, unlitAt: 0.2, tense: 0.6, q: 0.75 }, { exit: true })] },
  { id: '15', section: 3, slug: 'gamebreaker', corner: 'TL', dur: 2.6, tc: '00:33–00:35', captain: 'Captain 8', line: "...it's GameBreaker time.", draw: gameBreaker, w: 400, h: 250 },
  { id: '16', section: 3, slug: 'rally-scoring', corner: 'TL', dur: 2.8, tc: '00:35–00:38', captain: 'Captain 1', line: 'GameBreaker is rally scoring.', draw: rally },
  { id: '17', section: 3, slug: 'first-to-25', corner: 'TL-TR', dur: 2.8, tc: '00:38–00:41', captain: 'Captain 2', line: 'First team to reach 25 points wins the GameBreaker.', layers: [tl(flag25), sb({ mode: 'gb', A: ramp(0.4, 2.3, 0, 23, 5), B: ramp(0.45, 2.35, 0, 22, 6), rd: 0.07 }, { enter: true })] },
  { id: '18', section: 3, slug: '24-all', corner: 'TR', dur: 2.4, tc: '00:41–00:43', captain: 'Captain 3', line: 'At 24-all?', layers: [sb({ mode: 'gb', A: [[0, 23], [0.28, 24]], B: [[0, 22], [0.4, 23], [0.55, 24]], rd: 0.12, heart: 0.75 })] },
  { id: '19', section: 3, slug: 'golden-point', corner: 'TL-TR', dur: 3.0, tc: '00:43–00:46', captain: 'Captain 4', line: "It's Golden Point.", layers: [tl(goldenPoint), sb({ mode: 'gb', A: [[0, 24]], B: [[0, 24]], gold: 0.25 }, { exit: true })] },
  // section 4: 22 → 23 share face + meter; 22 enters and holds, 23 starts on that state and exits
  { id: '20', section: 4, slug: 'line-call', corner: 'TL', dur: 2.6, tc: '00:46–00:48', captain: 'Captain 5', line: 'In the event of a bad line call...', draw: lineCall },
  { id: '21', section: 4, slug: 'keep-calm', corner: 'TL', dur: 3.0, tc: '00:48–00:50', captain: 'Captain 6', line: '...please remain calm.', draw: keepCalm },
  { id: '22', section: 4, slug: 'shouting', corner: 'TL-TR', dur: 2.6, tc: '00:50–00:52', captain: 'Captain 7', line: 'In the event of excessive shouting...', layers: [shoutL(0, { exit: false }), dbm(0, { enter: true })] },
  { id: '23', section: 4, slug: 'shout-louder', corner: 'TL-TR', dur: 2.6, tc: '00:52–00:54', captain: 'Captain 8', line: '...please shout louder!', layers: [shoutL(1, { enter: false }), dbm(1, { exit: true })] },
  // section 5: checklist chains 24→25→26. Final "LET. THE. BATTLE. BEGIN." intentionally has no clip.
  { id: '24', section: 5, slug: 'teams-ready', corner: 'TL-TR', dur: 2.6, tc: 'TBC', captain: 'Captain 1', line: 'The teams are ready.', layers: [tl(teamsReady), chk({ done: 0, tick: 0, at: 0.8, intro: true }, { enter: true })] },
  { id: '25', section: 5, slug: 'players-set', corner: 'TL-TR', dur: 2.4, tc: 'TBC', captain: 'Captain 2', line: 'The players are set.', layers: [tl(playersSet), chk({ done: 1, tick: 1, at: 0.45 })] },
  { id: '26', section: 5, slug: 'refs-ready', corner: 'TL-TR', dur: 3.0, tc: 'TBC', captain: 'Captain 3', line: 'The referees are in position.', layers: [tl(refsReady), chk({ done: 2, tick: 2, at: 0.45, go: 1.1 }, { exit: true })] },
  { id: '27', section: 5, slug: 'return-to-seat', corner: 'TL', dur: 2.6, tc: 'TBC', captain: 'Captain 4', line: 'So please return to your seats...', draw: returnSeat },
  { id: '28', section: 5, slug: 'secure-tray', corner: 'TL', dur: 2.8, tc: 'TBC', captain: 'Captain 5', line: 'Secure your food and drinks...', draw: secureTray },
  { id: '29', section: 5, slug: 'phones-on', corner: 'TL', dur: 2.8, tc: 'TBC', captain: 'Captain 6', line: 'Do not switch off your phones...', draw: phoneOn },
  { id: '30', section: 5, slug: 'league-lockup', corner: 'TL', dur: 3.0, tc: 'TBC', captain: 'Captain 7', line: 'This... is the Centre Court Pickleball League, Season Two!', draw: lockup },
  { id: '31', section: 5, slug: 'welcome-aboard', corner: 'TL', dur: 3.0, tc: 'TBC', captain: 'Captain 8', line: 'Welcome aboard.', draw: welcome },
];
