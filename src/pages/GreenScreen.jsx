import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import CurvesEditor from '../components/greenscreen/CurvesEditor';
import { alphaBounds, defaultSettings, detectKeyColor, processPixels } from '../utils/chromaKey';

// Every cutout is exported into this exact frame; users pan/zoom each photo to fit it.
const FRAME_W = 2091;
const FRAME_H = 2323;
const PREVIEW_EDGE = 1400;
const THUMB_EDGE = 220;
const PRESETS_KEY = 'greenscreen.presets.v1';
const ACCENT = '#d4ff3a';

// ---------- canvas helpers ----------

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
};

// Halve repeatedly before the final draw so big downscales stay sharp instead of aliased.
function resizeCanvas(source, sx, sy, sw, sh, tw, th) {
  let cur = source;
  let cx = sx;
  let cy = sy;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= tw && ch / 2 >= th) {
    const c = makeCanvas(Math.round(cw / 2), Math.round(ch / 2));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, c.width, c.height);
    cur = c;
    cx = 0;
    cy = 0;
    cw = c.width;
    ch = c.height;
  }
  const out = makeCanvas(tw, th);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, tw, th);
  return out;
}

const getData = (canvas) => canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);

const imageDataToCanvas = (imgData) => {
  const c = makeCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  return c;
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  );

async function decodeFile(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    // Fallback for formats createImageBitmap rejects but <img> can show (e.g. HEIC in Safari).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const dims = (src) => [src.naturalWidth || src.width, src.naturalHeight || src.height];

function createWorkerClient() {
  const worker = new Worker(new URL('../workers/greenscreen.worker.js', import.meta.url), { type: 'module' });
  let seq = 0;
  const pending = new Map();
  worker.onmessage = (e) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    pending.delete(e.data.id);
    if (e.data.error) job.reject(new Error(e.data.error));
    else job.resolve(new ImageData(new Uint8ClampedArray(e.data.buffer), e.data.width, e.data.height));
  };
  return {
    // transfer=true hands the source buffer to the worker (caller must not reuse it).
    run(src, settings, scale, transfer = false) {
      const id = ++seq;
      const buf = transfer ? src.data.buffer : src.data.slice().buffer;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, width: src.width, height: src.height, buffer: buf, settings, scale }, [buf]);
      });
    },
    terminate: () => worker.terminate(),
  };
}

const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const fromHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const formatBytes = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(2)} MB` : `${Math.round(b / 1024)} KB`);
const baseName = (n) => n.replace(/\.[^.]+$/, '');

const readPresets = () => {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
  } catch {
    return [];
  }
};

const CHECKER = {
  backgroundColor: '#1d2127',
  backgroundImage:
    'linear-gradient(45deg,#2a2f37 25%,transparent 25%),linear-gradient(-45deg,#2a2f37 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2f37 75%),linear-gradient(-45deg,transparent 75%,#2a2f37 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

// ---------- framing ----------
// A frame is { s, ox, oy }: scale from full-res source px to frame px, and the source's top-left in frame px.

function fitFrame(mode, w, h, bounds) {
  if (mode === 'subject' && bounds) {
    const s = Math.min((FRAME_W * 0.9) / bounds.w, (FRAME_H * 0.92) / bounds.h);
    const ox = FRAME_W / 2 - (bounds.x + bounds.w / 2) * s;
    // A player cropped at the photo's bottom edge (waist-up shot) stays anchored to the frame bottom.
    const oy = bounds.touchesBottom
      ? FRAME_H - (bounds.y + bounds.h) * s
      : FRAME_H / 2 - (bounds.y + bounds.h / 2) * s;
    return { s, ox, oy };
  }
  const s = mode === 'cover' ? Math.max(FRAME_W / w, FRAME_H / h) : Math.min(FRAME_W / w, FRAME_H / h);
  return { s, ox: (FRAME_W - w * s) / 2, oy: (FRAME_H - h * s) / 2 };
}

// Subject bounds in full-res px, keyed from the small thumbnail (fast enough to run synchronously).
function subjectBounds(d, settings) {
  const { width: tw, height: th } = d.thumb;
  const px = processPixels(d.thumb.data, tw, th, settings, d.thumbScale);
  const b = alphaBounds(px, tw, th, 40);
  if (!b) return null;
  const inv = 1 / d.thumbScale;
  return { x: b.x * inv, y: b.y * inv, w: b.w * inv, h: b.h * inv, touchesBottom: b.y + b.h >= th - 2 };
}

const zoomFrame = (f, k, fx, fy) => ({ s: f.s * k, ox: fx - (fx - f.ox) * k, oy: fy - (fy - f.oy) * k });

// ---------- small UI pieces ----------

function Slider({ label, value, min, max, step = 1, def = 0, unit = '', track, onChange }) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onDoubleClick={() => onChange(def)}
          title="Double-click to reset"
          className={`text-[11.5px] ${value !== def ? 'text-zinc-100' : 'text-zinc-400'} hover:text-white`}
        >
          {label}
        </button>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            className="w-11 bg-transparent text-right text-[11.5px] tabular-nums text-zinc-300 focus:text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="text-[10.5px] text-zinc-500">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(def)}
        className="gs-range w-full"
        style={track ? { background: track } : undefined}
      />
    </div>
  );
}

function Section({ title, onReset, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-white/[0.06]">
      <div className="flex items-center px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300 hover:text-white"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {title}
        </button>
        {onReset && (
          <button type="button" onClick={onReset} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-200">
            Reset
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

const ToolButton = ({ active, children, className = '', ...rest }) => (
  <button
    type="button"
    className={`h-8 px-2.5 rounded-md text-[12px] font-medium transition-colors ${
      active ? 'bg-white/[0.14] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
    } ${className}`}
    {...rest}
  >
    {children}
  </button>
);

// ---------- page ----------

export default function GreenScreen() {
  const [images, setImages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(null); // { done, total }
  const [exporting, setExporting] = useState(null); // { done, total }
  const [notice, setNotice] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [view, setView] = useState('checker'); // checker | black | white | custom | matte | original
  const [customBg, setCustomBg] = useState('#1e3a8a');
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [comparing, setComparing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [result, setResult] = useState(null); // { id, data }

  const [exportOpts, setExportOpts] = useState({
    quality: 90,
    outScale: 1,
    background: 'transparent',
  });
  const [presets, setPresets] = useState(readPresets);
  const [clipboard, setClipboard] = useState(null);

  const dataRef = useRef(new Map()); // id -> { bitmap, thumb, previewScale, thumbScale }
  const previewCache = useRef(null); // { id, data }
  const previewWorker = useRef(null);
  const bgWorker = useRef(null);
  const busyRef = useRef(false);
  const nextRef = useRef(null);
  const thumbState = useRef(new Map()); // id -> { settings, frame } last rendered
  const thumbProcessed = useRef(new Map()); // id -> { settings, data } keyed thumbnail pixels
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const fileInputRef = useRef(null);
  const idSeq = useRef(0);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const webpSupported = useMemo(() => {
    try {
      const c = makeCanvas(1, 1);
      return c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    previewWorker.current = createWorkerClient();
    bgWorker.current = createWorkerClient();
    const data = dataRef.current;
    return () => {
      previewWorker.current.terminate();
      bgWorker.current.terminate();
      data.forEach((d) => d.bitmap?.close?.());
      imagesRef.current.forEach((im) => im.thumbUrl && URL.revokeObjectURL(im.thumbUrl));
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const active = images.find((im) => im.id === activeId) || null;
  const targets = useMemo(() => {
    const s = new Set(selected);
    if (activeId) s.add(activeId);
    return s;
  }, [selected, activeId]);

  const getPreviewData = useCallback((id) => {
    if (previewCache.current?.id === id) return previewCache.current.data;
    const d = dataRef.current.get(id);
    if (!d) return null;
    const c = makeCanvas(d.bitmap.width, d.bitmap.height);
    c.getContext('2d').drawImage(d.bitmap, 0, 0);
    const data = getData(c);
    previewCache.current = { id, data };
    return data;
  }, []);

  // ---------- loading ----------

  const addFiles = useCallback(
    async (fileList) => {
      const files = [...fileList].filter(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|avif|bmp|heic|tiff?)$/i.test(f.name),
      );
      if (!files.length) return;
      const template = imagesRef.current.find((im) => im.id === activeId)?.settings;
      setLoading({ done: 0, total: files.length });
      let firstId = null;
      const failed = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const src = await decodeFile(file);
          const [w, h] = dims(src);
          const ps = Math.min(1, PREVIEW_EDGE / Math.max(w, h));
          const pc = resizeCanvas(src, 0, 0, w, h, Math.round(w * ps), Math.round(h * ps));
          src.close?.();
          const ts = Math.min(1, THUMB_EDGE / Math.max(w, h));
          const tc = resizeCanvas(pc, 0, 0, pc.width, pc.height, Math.round(w * ts), Math.round(h * ts));
          const previewData = getData(pc);
          const bitmap = await createImageBitmap(pc);
          const id = `gs${++idSeq.current}`;
          dataRef.current.set(id, { bitmap, thumb: getData(tc), previewScale: ps, thumbScale: ts });
          // New uploads inherit the current grade (same shoot, same lighting) but get their own key colour.
          const settings = template ? structuredClone(template) : defaultSettings();
          settings.key.color = detectKeyColor(previewData.data, pc.width, pc.height);
          const frame = fitFrame('subject', w, h, subjectBounds(dataRef.current.get(id), settings));
          const rec = {
            id,
            name: file.name,
            file,
            width: w,
            height: h,
            settings,
            frame,
            origThumb: tc.toDataURL('image/jpeg', 0.8),
            thumbUrl: null,
            exportInfo: null,
          };
          firstId = firstId || id;
          setImages((prev) => [...prev, rec]);
        } catch {
          failed.push(file.name);
        }
        setLoading({ done: i + 1, total: files.length });
      }
      setLoading(null);
      if (failed.length) setNotice(`Couldn't read ${failed.length} file(s): ${failed.slice(0, 3).join(', ')}`);
      if (firstId && !activeId) {
        setActiveId(firstId);
        setSelected(new Set([firstId]));
      }
    },
    [activeId],
  );

  // ---------- live preview (latest request wins) ----------

  const pump = useCallback(async () => {
    if (busyRef.current || !nextRef.current) return;
    const job = nextRef.current;
    nextRef.current = null;
    busyRef.current = true;
    const src = getPreviewData(job.id);
    const d = dataRef.current.get(job.id);
    if (src && d) {
      try {
        const out = await previewWorker.current.run(src, job.settings, d.previewScale);
        setResult({ id: job.id, data: out });
      } catch (e) {
        setNotice(`Preview failed: ${e.message}`);
      }
    }
    busyRef.current = false;
    pump();
  }, [getPreviewData]);

  useEffect(() => {
    if (!active) return;
    nextRef.current = { id: active.id, settings: active.settings };
    pump();
  }, [active?.id, active?.settings, pump]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw whichever view is requested.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const showOriginal = comparing || picking || view === 'original';
    let img = null;
    if (showOriginal) img = getPreviewData(active.id);
    else if (result?.id === active.id) {
      img = result.data;
      if (view === 'matte') {
        const m = new ImageData(img.width, img.height);
        for (let j = 0; j < m.data.length; j += 4) {
          const a = img.data[j + 3];
          m.data[j] = a;
          m.data[j + 1] = a;
          m.data[j + 2] = a;
          m.data[j + 3] = 255;
        }
        img = m;
      }
    }
    if (!img) return;
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }
    canvas.getContext('2d').putImageData(img, 0, 0);
  }, [result, view, comparing, picking, active, getPreviewData]);

  const histogram = useMemo(() => {
    if (!result || result.id !== activeId) return null;
    const d = result.data.data;
    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const l = new Uint32Array(256);
    for (let j = 0; j < d.length; j += 8) {
      if (d[j + 3] < 128) continue;
      r[d[j]]++;
      g[d[j + 1]]++;
      b[d[j + 2]]++;
      l[Math.round(0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2])]++;
    }
    return { rgb: l, r, g, b };
  }, [result, activeId]);

  // ---------- processed thumbnails (debounced, background worker) ----------

  useEffect(() => {
    const stale = images.filter((im) => {
      const t = thumbState.current.get(im.id);
      return !t || t.settings !== im.settings || t.frame !== im.frame;
    });
    if (!stale.length) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      for (const im of stale) {
        if (cancelled) return;
        const d = dataRef.current.get(im.id);
        if (!d) continue;
        try {
          // Only re-key when the grade changed; a reframe just recomposes.
          let cached = thumbProcessed.current.get(im.id);
          if (!cached || cached.settings !== im.settings) {
            cached = { settings: im.settings, data: await bgWorker.current.run(d.thumb, im.settings, d.thumbScale) };
            thumbProcessed.current.set(im.id, cached);
          }
          const TW = 200;
          const k = TW / FRAME_W;
          const c = makeCanvas(TW, Math.round(FRAME_H * k));
          const ctx = c.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          const f = im.frame;
          ctx.drawImage(imageDataToCanvas(cached.data), f.ox * k, f.oy * k, im.width * f.s * k, im.height * f.s * k);
          const blob = await canvasToBlob(c, 'image/png');
          const url = URL.createObjectURL(blob);
          thumbState.current.set(im.id, { settings: im.settings, frame: im.frame });
          setImages((prev) =>
            prev.map((p) => {
              if (p.id !== im.id) return p;
              if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
              return { ...p, thumbUrl: url };
            }),
          );
        } catch {
          /* thumbnail is cosmetic */
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [images]);

  // ---------- framing ----------

  const setActiveFrame = useCallback(
    (fn) => setImages((prev) => prev.map((im) => (im.id === activeId ? { ...im, frame: fn(im.frame, im) } : im))),
    [activeId],
  );

  // Fit buttons apply to every selected image.
  const fitTargets = (mode) => {
    setImages((prev) =>
      prev.map((im) => {
        if (!targets.has(im.id)) return im;
        const d = dataRef.current.get(im.id);
        const bounds = mode === 'subject' && d ? subjectBounds(d, im.settings) : null;
        return { ...im, frame: fitFrame(mode, im.width, im.height, bounds) };
      }),
    );
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [images.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Frame box geometry on screen: d = screen px per frame px.
  const pad = stage.w < 500 ? 16 : 48;
  const disp = Math.max(0.01, Math.min((stage.w - pad * 2) / FRAME_W, (stage.h - pad * 2) / FRAME_H));
  const frameLeft = (stage.w - FRAME_W * disp) / 2;
  const frameTop = (stage.h - FRAME_H * disp) / 2;
  const toFrame = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return [(e.clientX - r.left - frameLeft) / disp, (e.clientY - r.top - frameTop) / disp];
  };

  // Wheel / trackpad pinch zoom around the cursor (native listener so we can preventDefault).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const [fx, fy] = toFrame(e);
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setActiveFrame((f) => zoomFrame(f, k, fx, fy));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const onStageDown = (e) => {
    if (!active) return;
    if (picking) {
      pickAt(e);
      return;
    }
    stageRef.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    gesture.current = null;
  };

  const onStageMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = pointers.current;
    if (pts.size === 1) {
      const dx = (e.clientX - prev[0]) / disp;
      const dy = (e.clientY - prev[1]) / disp;
      setActiveFrame((f) => ({ ...f, ox: f.ox + dx, oy: f.oy + dy }));
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const before = Math.hypot(a[0] - b[0], a[1] - b[1]);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const [a2, b2] = [...pts.values()];
      const after = Math.hypot(a2[0] - b2[0], a2[1] - b2[1]);
      const [fx, fy] = toFrame({ clientX: (a2[0] + b2[0]) / 2, clientY: (a2[1] + b2[1]) / 2 });
      if (before > 0) setActiveFrame((f) => zoomFrame(f, after / before, fx, fy));
      return;
    }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
  };

  const onStageUp = (e) => {
    pointers.current.delete(e.pointerId);
  };

  // ---------- editing (applies to every selected image) ----------

  const setField = useCallback(
    (section, field, value) => {
      setImages((prev) =>
        prev.map((im) =>
          targets.has(im.id)
            ? { ...im, settings: { ...im.settings, [section]: { ...im.settings[section], [field]: value } } }
            : im,
        ),
      );
    },
    [targets],
  );

  // fields omitted = whole section. The key colour is never reset (it's per photo).
  const resetSection = (section, fields) => {
    const def = defaultSettings()[section];
    const keys = fields || Object.keys(def).filter((k) => !(section === 'key' && k === 'color'));
    setImages((prev) =>
      prev.map((im) => {
        if (!targets.has(im.id)) return im;
        const next = { ...im.settings[section] };
        keys.forEach((k) => {
          next[k] = structuredClone(def[k]);
        });
        return { ...im, settings: { ...im.settings, [section]: next } };
      }),
    );
  };

  // Copies everything except the key colour, which is specific to each photo's backdrop.
  const applySettingsToTargets = (src) => {
    setImages((prev) =>
      prev.map((im) => {
        if (!targets.has(im.id)) return im;
        const next = structuredClone(src);
        next.key.color = im.settings.key.color;
        return { ...im, settings: next };
      }),
    );
  };

  const autoKey = () => {
    setImages((prev) =>
      prev.map((im) => {
        if (!targets.has(im.id)) return im;
        const d = dataRef.current.get(im.id);
        if (!d) return im;
        const color = detectKeyColor(d.thumb.data, d.thumb.width, d.thumb.height);
        return { ...im, settings: { ...im.settings, key: { ...im.settings.key, color } } };
      }),
    );
  };

  const pickAt = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const src = getPreviewData(active.id);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= src.width || py >= src.height) continue;
        const j = (py * src.width + px) * 4;
        r += src.data[j];
        g += src.data[j + 1];
        b += src.data[j + 2];
        n++;
      }
    }
    if (n) setField('key', 'color', [r / n, g / n, b / n].map(Math.round));
    setPicking(false);
  };

  // ---------- selection ----------

  const onThumbClick = (e, id) => {
    if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const s = new Set(prev);
        if (activeId) s.add(activeId);
        if (s.has(id) && s.size > 1) {
          s.delete(id);
          if (id === activeId) setActiveId([...s][0]);
        } else {
          s.add(id);
          setActiveId(id);
        }
        return s;
      });
      return;
    }
    if (e.shiftKey && activeId) {
      const ids = images.map((im) => im.id);
      const a = ids.indexOf(activeId);
      const b = ids.indexOf(id);
      setSelected(new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1)));
      return;
    }
    setActiveId(id);
    setSelected(new Set([id]));
  };

  const toggleCheck = (e, id) => {
    e.stopPropagation();
    onThumbClick({ metaKey: true }, id);
  };

  const removeImages = (ids) => {
    const drop = new Set(ids);
    ids.forEach((id) => {
      dataRef.current.get(id)?.bitmap?.close?.();
      dataRef.current.delete(id);
      thumbState.current.delete(id);
      thumbProcessed.current.delete(id);
      if (previewCache.current?.id === id) previewCache.current = null;
    });
    const remaining = images.filter((im) => !drop.has(im.id));
    images.forEach((im) => drop.has(im.id) && im.thumbUrl && URL.revokeObjectURL(im.thumbUrl));
    setImages(remaining);
    if (drop.has(activeId)) {
      const next = remaining[0]?.id || null;
      setActiveId(next);
      setSelected(next ? new Set([next]) : new Set());
    } else {
      setSelected((prev) => new Set([...prev].filter((id) => !drop.has(id))));
    }
  };

  // ---------- keyboard ----------

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '\\') {
        setComparing(e.type === 'keydown');
        return;
      }
      if (e.type !== 'keydown') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && images.length) {
        e.preventDefault();
        setSelected(new Set(images.map((im) => im.id)));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = images.findIndex((im) => im.id === activeId);
        const next = images[i + (e.key === 'ArrowRight' ? 1 : -1)];
        if (next) {
          setActiveId(next.id);
          setSelected(new Set([next.id]));
        }
      } else if (e.key === 'Escape') {
        setPicking(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [images, activeId]);

  // ---------- export ----------

  const renderExport = async (im) => {
    const src = await decodeFile(im.file);
    const [w, h] = dims(src);
    const full = makeCanvas(w, h);
    full.getContext('2d').drawImage(src, 0, 0);
    src.close?.();
    const input = getData(full);
    full.width = 1; // free the decode surface early
    const out = await bgWorker.current.run(input, im.settings, 1, true);

    const k = exportOpts.outScale;
    const tw = Math.round(FRAME_W * k);
    const th = Math.round(FRAME_H * k);
    const f = im.frame;
    const iw = w * f.s * k;
    const ih = h * f.s * k;
    let source = imageDataToCanvas(out);
    if (iw < w) source = resizeCanvas(source, 0, 0, w, h, Math.max(1, Math.round(iw)), Math.max(1, Math.round(ih)));
    const canvas = makeCanvas(tw, th);
    const ctx = canvas.getContext('2d');
    if (exportOpts.background !== 'transparent') {
      ctx.fillStyle = exportOpts.background;
      ctx.fillRect(0, 0, tw, th);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, f.ox * k, f.oy * k, iw, ih);
    const type = webpSupported ? 'image/webp' : 'image/png';
    const blob = await canvasToBlob(canvas, type, exportOpts.quality / 100);
    return { blob, name: `${baseName(im.name)}.${webpSupported ? 'webp' : 'png'}`, w: tw, h: th };
  };

  const runExport = async (list) => {
    if (!list.length || exporting) return;
    setExporting({ done: 0, total: list.length });
    try {
      if (list.length === 1) {
        const r = await renderExport(list[0]);
        saveAs(r.blob, r.name);
        setImages((prev) =>
          prev.map((p) => (p.id === list[0].id ? { ...p, exportInfo: { bytes: r.blob.size, w: r.w, h: r.h } } : p)),
        );
      } else {
        const zip = new JSZip();
        const used = new Map();
        let total = 0;
        for (let i = 0; i < list.length; i++) {
          const r = await renderExport(list[i]);
          let name = r.name;
          const count = used.get(name) || 0;
          used.set(name, count + 1);
          if (count) name = name.replace(/(\.\w+)$/, `-${count + 1}$1`);
          zip.file(name, r.blob);
          total += r.blob.size;
          const id = list[i].id;
          setImages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, exportInfo: { bytes: r.blob.size, w: r.w, h: r.h } } : p)),
          );
          setExporting({ done: i + 1, total: list.length });
        }
        // WebP is already compressed — STORE keeps zipping instant.
        const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        saveAs(blob, `greenscreen-cutouts-${list.length}.zip`);
        setNotice(`Exported ${list.length} images · ${formatBytes(total)} total`);
      }
    } catch (e) {
      setNotice(`Export failed: ${e.message}`);
    } finally {
      setExporting(null);
    }
  };

  // ---------- presets ----------

  const savePreset = () => {
    if (!active) return;
    const name = window.prompt('Preset name');
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, settings: active.settings }];
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      setNotice('Could not save preset in this browser');
    }
  };

  const deletePreset = (name) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // ---------- render ----------

  const s = active?.settings;
  const bulk = targets.size > 1;
  const selectedList = images.filter((im) => targets.has(im.id));
  const canvasBg =
    view === 'black'
      ? { background: '#000' }
      : view === 'white'
        ? { background: '#fff' }
        : view === 'custom'
          ? { background: customBg }
          : view === 'checker'
            ? CHECKER
            : { background: '#000' };
  const frame = active?.frame;
  const plainView = view === 'matte' || view === 'original' || comparing || picking;

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="min-h-screen lg:h-screen flex flex-col bg-[#0b0d10] text-zinc-200 font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => !e.relatedTarget && setDragOver(false)}
      onDrop={onDrop}
    >
      <style>{`
        .gs-range{-webkit-appearance:none;appearance:none;height:4px;border-radius:999px;background:rgba(255,255,255,.12);outline:none;cursor:pointer}
        .gs-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#f4f4f5;border:2px solid #0b0d10;box-shadow:0 0 0 1px rgba(255,255,255,.25)}
        .gs-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#f4f4f5;border:2px solid #0b0d10}
        .gs-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px ${ACCENT}}
        .gs-scroll::-webkit-scrollbar{width:8px;height:8px}.gs-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:8px}
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#0e1014]">
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 rounded-md grid place-items-center" style={{ background: ACCENT }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0b0d10" strokeWidth="2.2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-white leading-none">Green Screen Studio</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">Player cutouts · batch key, grade &amp; WebP export</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-[12.5px] font-semibold text-white"
        >
          + Upload images
        </button>
        {loading && (
          <span className="text-[12px] text-zinc-400">
            Loading {loading.done}/{loading.total}…
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {exporting && (
            <span className="text-[12px] text-zinc-300 tabular-nums">
              Exporting {exporting.done}/{exporting.total}…
            </span>
          )}
          <button
            type="button"
            disabled={!active || !!exporting}
            onClick={() => runExport([active])}
            className="h-8 px-3 rounded-md border border-white/15 text-[12.5px] font-semibold hover:bg-white/[0.06] disabled:opacity-40"
          >
            Export current
          </button>
          <button
            type="button"
            disabled={selectedList.length < 2 || !!exporting}
            onClick={() => runExport(selectedList)}
            className="h-8 px-3 rounded-md border border-white/15 text-[12.5px] font-semibold hover:bg-white/[0.06] disabled:opacity-40"
          >
            Export selected ({selectedList.length})
          </button>
          <button
            type="button"
            disabled={!images.length || !!exporting}
            onClick={() => runExport(images)}
            className="h-8 px-3.5 rounded-md text-[12.5px] font-bold text-[#0b0d10] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            Export all{images.length ? ` (${images.length})` : ''} · ZIP
          </button>
        </div>
      </header>

      {!webpSupported && (
        <div className="px-4 py-2 text-[12px] bg-amber-500/15 text-amber-200 border-b border-amber-500/20">
          This browser can&apos;t encode WebP, so exports will fall back to PNG. Use Chrome, Edge or Firefox for WebP.
        </div>
      )}

      {images.length === 0 ? (
        <div className="flex-1 grid place-items-center p-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
              dragOver ? 'border-[#d4ff3a] bg-[#d4ff3a]/5' : 'border-white/15 hover:border-white/30'
            }`}
          >
            <div className="mx-auto mb-5 w-14 h-14 rounded-xl grid place-items-center bg-[#00b140]/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </div>
            <p className="text-[17px] font-semibold text-white">Drop green screen player photos here</p>
            <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">
              Upload as many as you like. The backdrop is removed automatically — then fine-tune the key, colour and
              curves per photo or across a whole batch, and export transparent WebP cutouts.
            </p>
            <p className="mt-5 text-[12px] text-zinc-500">Everything runs in your browser · nothing is uploaded</p>
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_320px]">
          {/* Library */}
          <aside className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-white/[0.06] flex flex-col min-h-0 bg-[#0e1014]">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] text-[11.5px]">
              <span className="text-zinc-400 mr-auto">
                {targets.size} of {images.length} selected
              </span>
              <button
                type="button"
                className="px-1.5 py-0.5 text-zinc-400 hover:text-white"
                onClick={() => setSelected(new Set(images.map((im) => im.id)))}
              >
                All
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 text-zinc-400 hover:text-white"
                onClick={() => setSelected(new Set(activeId ? [activeId] : []))}
              >
                None
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 text-zinc-400 hover:text-red-300"
                title="Remove selected from the batch"
                onClick={() => removeImages([...targets])}
              >
                Remove
              </button>
            </div>
            <div className="gs-scroll flex-1 overflow-auto p-2 grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 gap-2 content-start max-h-[40vh] lg:max-h-none">
              {images.map((im) => {
                const isActive = im.id === activeId;
                const isSel = targets.has(im.id);
                return (
                  <div
                    key={im.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onThumbClick(e, im.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onThumbClick(e, im.id)}
                    className={`group relative aspect-[2091/2323] rounded-md overflow-hidden cursor-pointer ring-2 transition-shadow ${
                      isActive ? 'ring-[#d4ff3a]' : isSel ? 'ring-[#d4ff3a]/45' : 'ring-transparent hover:ring-white/20'
                    }`}
                    style={CHECKER}
                    title={im.name}
                  >
                    <img
                      src={im.thumbUrl || im.origThumb}
                      alt={im.name}
                      className="absolute inset-0 w-full h-full object-contain"
                      draggable={false}
                    />
                    <button
                      type="button"
                      onClick={(e) => toggleCheck(e, im.id)}
                      className={`absolute top-1 left-1 w-4 h-4 rounded-[4px] border grid place-items-center ${
                        isSel ? 'bg-[#d4ff3a] border-[#d4ff3a]' : 'bg-black/50 border-white/40 opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={isSel ? 'Deselect' : 'Select'}
                    >
                      {isSel && (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="#0b0d10" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent">
                      <p className="text-[10px] text-zinc-200 truncate">{im.name}</p>
                      {im.exportInfo && (
                        <p className="text-[9.5px] text-[#d4ff3a] tabular-nums">{formatBytes(im.exportInfo.bytes)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[2091/2323] rounded-md border border-dashed border-white/15 hover:border-white/35 text-zinc-500 hover:text-zinc-200 text-[11px]"
              >
                + Add
              </button>
            </div>
            <p className="hidden lg:block px-3 py-2 border-t border-white/[0.06] text-[10.5px] text-zinc-500 leading-snug">
              ⌘/Ctrl-click or Shift-click to multi-select · ⌘A all · ←/→ browse
            </p>
          </aside>

          {/* Viewer */}
          <main className="order-1 lg:order-2 flex flex-col min-h-0 min-w-0">
            <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-white/[0.06]">
              {[
                ['checker', 'Transparent'],
                ['black', 'Black'],
                ['white', 'White'],
                ['custom', 'Colour'],
                ['matte', 'Matte'],
                ['original', 'Original'],
              ].map(([id, label]) => (
                <ToolButton key={id} active={view === id} onClick={() => setView(id)}>
                  {label}
                </ToolButton>
              ))}
              {view === 'custom' && (
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="w-7 h-7 bg-transparent cursor-pointer"
                  aria-label="Preview background colour"
                />
              )}
              <div className="w-px h-5 bg-white/10 mx-1" />
              <ToolButton onClick={() => fitTargets('subject')} title="Fit the player inside the frame (all selected)">
                Fit player
              </ToolButton>
              <ToolButton onClick={() => fitTargets('contain')} title="Show the whole photo (all selected)">
                Fit photo
              </ToolButton>
              <ToolButton onClick={() => fitTargets('cover')} title="Fill the frame edge to edge (all selected)">
                Fill frame
              </ToolButton>
              {frame && (
                <label className="flex items-center gap-2 ml-1 text-[11.5px] text-zinc-400">
                  Zoom
                  <input
                    type="range"
                    min={-4}
                    max={2}
                    step={0.01}
                    value={Math.log2(frame.s)}
                    onChange={(e) => {
                      const k = 2 ** Number(e.target.value) / frame.s;
                      setActiveFrame((f) => zoomFrame(f, k, FRAME_W / 2, FRAME_H / 2));
                    }}
                    className="gs-range w-24"
                  />
                  <span className="w-10 tabular-nums text-zinc-300">{Math.round(frame.s * 100)}%</span>
                </label>
              )}
              <div className="ml-auto flex items-center gap-1">
                <ToolButton
                  active={comparing}
                  onPointerDown={() => setComparing(true)}
                  onPointerUp={() => setComparing(false)}
                  onPointerLeave={() => setComparing(false)}
                  title="Hold to see the original (or hold \)"
                >
                  Hold to compare
                </ToolButton>
              </div>
            </div>
            <div
              ref={stageRef}
              className="relative flex-1 min-h-[55vh] lg:min-h-0 overflow-hidden select-none touch-none"
              style={{ background: '#08090b', cursor: picking ? 'crosshair' : 'grab' }}
              onPointerDown={onStageDown}
              onPointerMove={onStageMove}
              onPointerUp={onStageUp}
              onPointerCancel={onStageUp}
            >
              {active && frame && stage.w > 0 && (
                <div
                  className="absolute"
                  style={{
                    left: frameLeft,
                    top: frameTop,
                    width: FRAME_W * disp,
                    height: FRAME_H * disp,
                    ...(plainView ? { background: '#000' } : canvasBg),
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute block max-w-none pointer-events-none"
                    style={{
                      left: frame.ox * disp,
                      top: frame.oy * disp,
                      width: active.width * frame.s * disp,
                      height: active.height * frame.s * disp,
                    }}
                  />
                  {/* dim everything outside the export frame */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: '0 0 0 9999px rgba(8,9,11,0.78)', outline: `1px solid ${ACCENT}` }}
                  />
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div className="absolute inset-y-0 left-1/3 border-l border-dashed border-white/40" />
                    <div className="absolute inset-y-0 left-2/3 border-l border-dashed border-white/40" />
                    <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/40" />
                    <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-white/40" />
                  </div>
                  <div className="absolute -top-6 left-0 text-[10.5px] text-zinc-400 tabular-nums pointer-events-none">
                    {FRAME_W} × {FRAME_H}
                  </div>
                </div>
              )}
              {!picking && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-[11px] text-zinc-300 pointer-events-none whitespace-nowrap">
                  Drag to move · scroll or pinch to zoom
                </div>
              )}
              {picking && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/80 text-[12px] text-white border border-white/10">
                  Click the green backdrop to sample it · Esc to cancel
                </div>
              )}
              {(comparing || view === 'original') && !picking && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-[11px] text-zinc-200">Original</div>
              )}
            </div>
            {active && (
              <div className="flex items-center gap-3 px-3 py-1.5 border-t border-white/[0.06] text-[11px] text-zinc-500 tabular-nums">
                <span className="text-zinc-300 truncate">{active.name}</span>
                <span>
                  {active.width}×{active.height}
                </span>
                <span>{formatBytes(active.file.size)} original</span>
                {frame && frame.s * exportOpts.outScale > 1.05 && (
                  <span className="text-amber-300">
                    Upscaled {(frame.s * exportOpts.outScale).toFixed(2)}× — photo is low-res for this crop
                  </span>
                )}
                {active.exportInfo && (
                  <span className="text-[#d4ff3a]">
                    → {active.exportInfo.w}×{active.exportInfo.h} · {formatBytes(active.exportInfo.bytes)} WebP
                  </span>
                )}
              </div>
            )}
          </main>

          {/* Controls */}
          <aside className="order-3 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#0e1014] min-h-0 flex flex-col">
            {bulk && (
              <div className="px-4 py-2.5 text-[12px] border-b border-[#d4ff3a]/20 bg-[#d4ff3a]/[0.07] text-[#e6ff9a]">
                Editing <b>{targets.size} images</b> — every change applies to all selected.
              </div>
            )}
            {s && (
              <div className="gs-scroll flex-1 overflow-auto">
                <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setClipboard(structuredClone(s))}
                    className="h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11.5px]"
                  >
                    Copy settings
                  </button>
                  <button
                    type="button"
                    disabled={!clipboard}
                    onClick={() => applySettingsToTargets(clipboard)}
                    className="h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11.5px] disabled:opacity-40"
                    title="Pastes everything except each image's key colour"
                  >
                    Paste{bulk ? ` to ${targets.size}` : ''}
                  </button>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__save') savePreset();
                      else if (v.startsWith('__del:')) deletePreset(v.slice(6));
                      else {
                        const p = presets.find((x) => x.name === v);
                        if (p) applySettingsToTargets(p.settings);
                      }
                    }}
                    className="h-7 px-2 rounded bg-white/[0.06] !text-[11.5px] text-zinc-200 border-0 focus:outline-none"
                  >
                    <option value="" disabled>
                      Presets…
                    </option>
                    {presets.map((p) => (
                      <option key={p.name} value={p.name}>
                        Apply “{p.name}”
                      </option>
                    ))}
                    <option value="__save">Save current as preset…</option>
                    {presets.map((p) => (
                      <option key={`d-${p.name}`} value={`__del:${p.name}`}>
                        Delete “{p.name}”
                      </option>
                    ))}
                  </select>
                </div>

                <Section title="Background key" onReset={() => resetSection('key', ['tolerance', 'softness', 'spill'])}>
                  <div className="flex items-center gap-2 mb-3">
                    <label
                      className="relative w-9 h-9 rounded-md border border-white/20 cursor-pointer overflow-hidden shrink-0"
                      style={{ background: toHex(s.key.color) }}
                      title="Key colour"
                    >
                      <input
                        type="color"
                        value={toHex(s.key.color)}
                        onChange={(e) => setField('key', 'color', fromHex(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                    <div className="mr-auto">
                      <p className="text-[11px] text-zinc-500 leading-none">Key colour</p>
                      <p className="text-[12.5px] font-mono text-zinc-200 mt-1">{toHex(s.key.color).toUpperCase()}</p>
                    </div>
                    <ToolButton active={picking} onClick={() => setPicking((p) => !p)} title="Sample from the photo">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline -mt-0.5 mr-1">
                        <path d="M14.5 4.5l5 5M4 20l1-4L15.5 5.5a2.1 2.1 0 013 3L8 19z" />
                      </svg>
                      Pick
                    </ToolButton>
                    <ToolButton onClick={autoKey} title="Detect from the image border">
                      Auto
                    </ToolButton>
                  </div>
                  <Slider label="Tolerance" value={s.key.tolerance} min={0} max={100} def={45} onChange={(v) => setField('key', 'tolerance', v)} />
                  <Slider label="Softness" value={s.key.softness} min={1} max={80} def={25} onChange={(v) => setField('key', 'softness', v)} />
                  <Slider label="Spill removal" value={s.key.spill} min={0} max={100} def={60} onChange={(v) => setField('key', 'spill', v)} />
                </Section>

                <Section title="Edge refine" onReset={() => resetSection('key', ['shrink', 'feather', 'clipBlack', 'clipWhite'])}>
                  <Slider label="Shrink / grow" value={s.key.shrink} min={-6} max={10} def={0} unit="px" onChange={(v) => setField('key', 'shrink', v)} />
                  <Slider label="Feather" value={s.key.feather} min={0} max={12} step={0.5} def={1} unit="px" onChange={(v) => setField('key', 'feather', v)} />
                  <Slider label="Clip black" value={s.key.clipBlack} min={0} max={60} def={8} onChange={(v) => setField('key', 'clipBlack', v)} />
                  <Slider label="Clip white" value={s.key.clipWhite} min={40} max={100} def={92} onChange={(v) => setField('key', 'clipWhite', v)} />
                  <p className="mt-1 text-[10.5px] text-zinc-500 leading-snug">
                    Use the <b className="text-zinc-400">Matte</b> view: backdrop should be pure black, the player pure white.
                  </p>
                </Section>

                <Section title="Light & colour" onReset={() => resetSection('adjust')}>
                  <Slider label="Exposure" value={s.adjust.exposure} min={-100} max={100} onChange={(v) => setField('adjust', 'exposure', v)} />
                  <Slider label="Brightness" value={s.adjust.brightness} min={-100} max={100} onChange={(v) => setField('adjust', 'brightness', v)} />
                  <Slider label="Contrast" value={s.adjust.contrast} min={-100} max={100} onChange={(v) => setField('adjust', 'contrast', v)} />
                  <Slider
                    label="Hue"
                    value={s.adjust.hue}
                    min={-180}
                    max={180}
                    unit="°"
                    track="linear-gradient(90deg,#00ffff,#0000ff,#ff00ff,#ff0000,#ffff00,#00ff00,#00ffff)"
                    onChange={(v) => setField('adjust', 'hue', v)}
                  />
                  <Slider
                    label="Saturation"
                    value={s.adjust.saturation}
                    min={-100}
                    max={100}
                    track="linear-gradient(90deg,#777,#c33)"
                    onChange={(v) => setField('adjust', 'saturation', v)}
                  />
                  <Slider
                    label="Temperature"
                    value={s.adjust.temperature}
                    min={-100}
                    max={100}
                    track="linear-gradient(90deg,#4a7bd8,#ddd,#e0a03a)"
                    onChange={(v) => setField('adjust', 'temperature', v)}
                  />
                </Section>

                <Section title="Curves" onReset={() => resetSection('curves')}>
                  <CurvesEditor curves={s.curves} histogram={histogram} onChange={(ch, pts) => setField('curves', ch, pts)} />
                </Section>

                <Section title="Export">
                  <Slider
                    label="WebP quality"
                    value={exportOpts.quality}
                    min={50}
                    max={100}
                    def={90}
                    onChange={(v) => setExportOpts((o) => ({ ...o, quality: v }))}
                  />
                  <p className="-mt-0.5 mb-2 text-[10.5px] text-zinc-500">
                    88–92 is visually lossless for most photos at a fraction of PNG size.
                  </p>
                  <label className="block text-[11.5px] text-zinc-400 mb-1">Output size</label>
                  <select
                    value={exportOpts.outScale}
                    onChange={(e) => setExportOpts((o) => ({ ...o, outScale: Number(e.target.value) }))}
                    className="w-full h-8 px-2 mb-1 rounded bg-white/[0.06] !text-[12px] text-zinc-200 border-0 focus:outline-none"
                  >
                    {[1, 0.75, 0.5, 0.375].map((k) => (
                      <option key={k} value={k}>
                        {Math.round(FRAME_W * k)} × {Math.round(FRAME_H * k)}
                        {k === 1 ? ' (full)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mb-2 text-[10.5px] text-zinc-500">Every image exports at exactly this frame size.</p>
                  <label className="block text-[11.5px] text-zinc-400 mt-2 mb-1">Background</label>
                  <div className="flex items-center gap-2">
                    <ToolButton
                      active={exportOpts.background === 'transparent'}
                      onClick={() => setExportOpts((o) => ({ ...o, background: 'transparent' }))}
                    >
                      Transparent
                    </ToolButton>
                    <ToolButton
                      active={exportOpts.background !== 'transparent'}
                      onClick={() =>
                        setExportOpts((o) => ({ ...o, background: o.background === 'transparent' ? '#ffffff' : o.background }))
                      }
                    >
                      Solid
                    </ToolButton>
                    {exportOpts.background !== 'transparent' && (
                      <input
                        type="color"
                        value={exportOpts.background}
                        onChange={(e) => setExportOpts((o) => ({ ...o, background: e.target.value }))}
                        className="w-8 h-8 bg-transparent cursor-pointer"
                        aria-label="Export background colour"
                      />
                    )}
                  </div>
                </Section>
              </div>
            )}
          </aside>
        </div>
      )}

      {dragOver && images.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 pointer-events-none">
          <p className="px-6 py-4 rounded-xl border-2 border-dashed border-[#d4ff3a] text-white text-[15px] font-semibold">
            Drop to add to the batch
          </p>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-[12.5px] text-zinc-100 shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
}
