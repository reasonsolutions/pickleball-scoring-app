// Chroma key + colour grading engine for the /greenscreen tool.
// Pure functions only, so it runs identically on the main thread and in a Web Worker.

export const IDENTITY_CURVE = [[0, 0], [255, 255]];

export const defaultSettings = () => ({
  key: {
    color: [0, 177, 64], // replaced by auto-detection on load
    tolerance: 45, // how "green" a pixel must be (relative to the key) to go fully transparent
    softness: 25, // width of the transparency ramp
    spill: 60, // green spill suppression on the subject
    shrink: 0, // px (at full res) to erode (+) or grow (-) the matte
    feather: 1, // px (at full res) blur on the matte edge
    clipBlack: 8, // matte values below this become fully transparent
    clipWhite: 92, // matte values above this become fully opaque
  },
  adjust: {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    hue: 0,
    saturation: 0,
    temperature: 0,
  },
  curves: {
    rgb: IDENTITY_CURVE.map((p) => [...p]),
    r: IDENTITY_CURVE.map((p) => [...p]),
    g: IDENTITY_CURVE.map((p) => [...p]),
    b: IDENTITY_CURVE.map((p) => [...p]),
  },
});

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Monotone cubic (Fritsch–Carlson) interpolation through the curve points -> 256-entry LUT.
export function buildCurveLUT(points) {
  const lut = new Uint8ClampedArray(256);
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  if (n === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  if (n === 1) {
    lut.fill(pts[0][1]);
    return lut;
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const delta = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    delta.push(dx === 0 ? 0 : (ys[i + 1] - ys[i]) / dx);
  }
  const m = new Array(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
    }
  }
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    if (x <= xs[0]) {
      lut[x] = ys[0];
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[x] = ys[n - 1];
      continue;
    }
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = xs[seg + 1] - xs[seg];
    const t = (x - xs[seg]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      (2 * t3 - 3 * t2 + 1) * ys[seg] +
      (t3 - 2 * t2 + t) * h * m[seg] +
      (-2 * t3 + 3 * t2) * ys[seg + 1] +
      (t3 - t2) * h * m[seg + 1];
    lut[x] = Math.round(clamp(y, 0, 255));
  }
  return lut;
}

const isIdentityCurve = (pts) =>
  pts.length === 2 && pts[0][0] === 0 && pts[0][1] === 0 && pts[1][0] === 255 && pts[1][1] === 255;

// Exposure / brightness / contrast -> one tonal LUT (float, unclamped until after the colour matrix).
function buildToneLUT({ exposure, brightness, contrast }) {
  const lut = new Float32Array(256);
  const gain = Math.pow(2, exposure / 50); // ±100 -> ±2 stops
  const c = contrast * 2.55;
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  const add = brightness * 1.0;
  for (let i = 0; i < 256; i++) {
    let v = i * gain + add;
    v = cf * (v - 128) + 128;
    lut[i] = v;
  }
  return lut;
}

const mul3 = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];

// Hue rotation + saturation + temperature as one luminance-preserving 3x3 matrix.
function buildColorMatrix({ hue, saturation, temperature }) {
  const rad = (hue * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hueM = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
  const s = 1 + saturation / 100;
  const satM = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const t = temperature / 100;
  const tempM = [1 + t * 0.18, 0, 0, 0, 1 + t * 0.02, 0, 0, 0, 1 - t * 0.18];
  return mul3(tempM, mul3(satM, hueM));
}

// Separable min/max filter on the matte. radius > 0 erodes (shrinks), < 0 dilates (grows).
function morph(alpha, w, h, radius) {
  const r = Math.round(Math.abs(radius));
  if (r < 1) return alpha;
  const erode = radius > 0;
  const tmp = new Float32Array(alpha.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let k = x0; k <= x1; k++) {
        const a = alpha[row + k];
        if (erode ? a < v : a > v) v = a;
      }
      tmp[row + x] = v;
    }
  }
  const out = new Float32Array(alpha.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = erode ? 1 : 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let k = y0; k <= y1; k++) {
        const a = tmp[k * w + x];
        if (erode ? a < v : a > v) v = a;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

// Two passes of a separable running-sum box blur ≈ gaussian.
function blur(alpha, w, h, radius) {
  const r = Math.round(radius);
  if (r < 1) return alpha;
  let src = alpha;
  const tmp = new Float32Array(alpha.length);
  const dst = new Float32Array(alpha.length);
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[row + clamp(k, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum * norm;
        sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[clamp(k, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum * norm;
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    src = dst.slice();
  }
  return src;
}

/**
 * Process RGBA pixels: key out the backdrop, despill, grade, refine the matte.
 * @param {Uint8ClampedArray} data source RGBA (not modified)
 * @param {number} scale ratio of this image to the full-resolution original (for px-based settings)
 * @returns {Uint8ClampedArray} new RGBA buffer
 */
export function processPixels(data, w, h, settings, scale = 1) {
  const { key, adjust, curves } = settings;
  const n = w * h;
  const out = new Uint8ClampedArray(n * 4);
  const alpha = new Float32Array(n);

  // Key channel = the dominant channel of the key colour (green for green screens, blue for blue screens).
  const kc = key.color;
  const ci = kc[1] >= kc[0] && kc[1] >= kc[2] ? 1 : kc[2] >= kc[0] ? 2 : 0;
  const o1 = ci === 0 ? 1 : 0;
  const o2 = ci === 2 ? 1 : 2;
  const kp = Math.max(1, kc[ci]);
  const ks = Math.max(0.05, (kp - Math.max(kc[o1], kc[o2])) / kp);

  const t1 = 1 - key.tolerance / 100;
  const t0 = Math.min(t1 - 0.001, t1 - Math.max(0.01, key.softness / 100));
  const spill = key.spill / 100;

  const tone = buildToneLUT(adjust);
  const toneIdentity = adjust.exposure === 0 && adjust.brightness === 0 && adjust.contrast === 0;
  const M = buildColorMatrix(adjust);
  const matIdentity = adjust.hue === 0 && adjust.saturation === 0 && adjust.temperature === 0;

  const master = buildCurveLUT(curves.rgb);
  const lr = buildCurveLUT(curves.r);
  const lg = buildCurveLUT(curves.g);
  const lb = buildCurveLUT(curves.b);
  const curvesIdentity =
    isIdentityCurve(curves.rgb) && isIdentityCurve(curves.r) && isIdentityCurve(curves.g) && isIdentityCurve(curves.b);
  const fr = new Uint8ClampedArray(256);
  const fg = new Uint8ClampedArray(256);
  const fb = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    fr[i] = lr[master[i]];
    fg[i] = lg[master[i]];
    fb[i] = lb[master[i]];
  }

  const px = [0, 0, 0];
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    px[0] = data[j];
    px[1] = data[j + 1];
    px[2] = data[j + 2];

    // --- matte ---
    const p = px[ci];
    const q = px[o1] > px[o2] ? px[o1] : px[o2];
    let a = 1;
    if (p > q) {
      let ratio = (p - q) / p / ks;
      ratio *= clamp((p - 8) / 32, 0, 1); // very dark pixels are noise, not screen
      if (ratio >= t1) a = 0;
      else if (ratio > t0) {
        const t = (ratio - t0) / (t1 - t0);
        a = 1 - t * t * (3 - 2 * t);
      }
      // --- spill suppression ---
      if (spill > 0) px[ci] = p - spill * (p - q);
    }
    alpha[i] = a;

    // --- grade ---
    let r = px[0];
    let g = px[1];
    let b = px[2];
    if (!toneIdentity) {
      r = tone[r | 0];
      g = tone[g | 0];
      b = tone[b | 0];
    }
    if (!matIdentity) {
      const nr = M[0] * r + M[1] * g + M[2] * b;
      const ng = M[3] * r + M[4] * g + M[5] * b;
      const nb = M[6] * r + M[7] * g + M[8] * b;
      r = nr;
      g = ng;
      b = nb;
    }
    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);
    if (!curvesIdentity) {
      r = fr[r];
      g = fg[g];
      b = fb[b];
    }
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
  }

  // --- matte refinement (px settings are defined at full resolution) ---
  let matte = alpha;
  if (key.shrink) matte = morph(matte, w, h, key.shrink * scale);
  if (key.feather > 0) matte = blur(matte, w, h, key.feather * scale);
  const cb = key.clipBlack / 100;
  const cw = Math.max(cb + 0.01, key.clipWhite / 100);
  const inv = 1 / (cw - cb);
  for (let i = 0, j = 3; i < n; i++, j += 4) {
    const a = clamp((matte[i] - cb) * inv, 0, 1);
    out[j] = Math.round(a * 255);
    if (a === 0) {
      out[j - 3] = 0;
      out[j - 2] = 0;
      out[j - 1] = 0;
    }
  }
  return out;
}

// Guess the backdrop colour from the image border (the subject is usually centred).
export function detectKeyColor(data, w, h) {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.05));
  const step = Math.max(1, Math.round(Math.max(w, h) / 400));
  const buckets = [[], [], []];
  const rs = [[], [], []];
  for (let y = 0; y < h; y += step) {
    const edgeRow = y < band || y >= h - band;
    for (let x = 0; x < w; x += step) {
      if (!edgeRow && x >= band && x < w - band) x = w - band;
      const j = (y * w + x) * 4;
      const c = [data[j], data[j + 1], data[j + 2]];
      const max = Math.max(c[0], c[1], c[2]);
      const ch = c.indexOf(max);
      const second = Math.max(...c.filter((_, k) => k !== ch));
      if (max - second > 25) {
        buckets[ch].push(1);
        rs[ch].push(c);
      }
    }
  }
  const best = buckets[1].length >= buckets[2].length ? (buckets[1].length >= buckets[0].length ? 1 : 0) : 2;
  const samples = rs[best];
  if (samples.length < 10) return [0, 177, 64];
  const median = (k) => {
    const v = samples.map((s) => s[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  return [median(0), median(1), median(2)];
}

// Bounding box of pixels with alpha above threshold.
export function alphaBounds(data, w, h, threshold = 6) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    let row = y * w * 4 + 3;
    for (let x = 0; x < w; x++, row += 4) {
      if (data[row] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
