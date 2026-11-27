import React, { useMemo, useRef, useState } from 'react';
import { buildCurveLUT } from '../../utils/chromaKey';

const CHANNELS = [
  { id: 'rgb', label: 'RGB', color: '#e5e7eb' },
  { id: 'r', label: 'R', color: '#f87171' },
  { id: 'g', label: 'G', color: '#4ade80' },
  { id: 'b', label: 'B', color: '#60a5fa' },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function CurvesEditor({ curves, histogram, onChange }) {
  const [channel, setChannel] = useState('rgb');
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const points = curves[channel];
  const meta = CHANNELS.find((c) => c.id === channel);

  const path = useMemo(() => {
    const lut = buildCurveLUT(points);
    let d = '';
    for (let x = 0; x < 256; x++) d += `${x === 0 ? 'M' : 'L'}${x},${255 - lut[x]}`;
    return d;
  }, [points]);

  const histPath = useMemo(() => {
    if (!histogram) return null;
    const h = histogram[channel] || histogram.rgb;
    let max = 0;
    for (let i = 1; i < 255; i++) max = Math.max(max, h[i]);
    if (!max) return null;
    let d = 'M0,256';
    for (let i = 0; i < 256; i++) d += ` L${i},${256 - Math.min(1, h[i] / max) * 230}`;
    return `${d} L255,256 Z`;
  }, [histogram, channel]);

  const toCurve = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 255;
    const y = 255 - ((e.clientY - rect.top) / rect.height) * 255;
    return [x, y];
  };

  const commit = (pts) => onChange(channel, pts);

  const startDrag = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current.setPointerCapture(e.pointerId);
    dragRef.current = { index, pts: points.map((p) => [...p]) };
  };

  const onBackgroundDown = (e) => {
    const [x, y] = toCurve(e);
    const xi = Math.round(clamp(x, 1, 254));
    if (points.some((p) => Math.abs(p[0] - xi) < 4)) return;
    const pts = [...points.map((p) => [...p]), [xi, Math.round(clamp(y, 0, 255))]].sort((a, b) => a[0] - b[0]);
    commit(pts);
    svgRef.current.setPointerCapture(e.pointerId);
    dragRef.current = { index: pts.findIndex((p) => p[0] === xi), pts };
  };

  const onMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const [x, y] = toCurve(e);
    const pts = drag.pts.map((p) => [...p]);
    const i = drag.index;
    const last = pts.length - 1;
    const isEnd = i === 0 || i === last;
    // Dragging an interior point well outside the box removes it (like Photoshop).
    if (!isEnd && (y < -24 || y > 279)) {
      pts.splice(i, 1);
      commit(pts);
      return;
    }
    const lo = i === 0 ? 0 : pts[i - 1][0] + 1;
    const hi = i === last ? 255 : pts[i + 1][0] - 1;
    pts[i] = [Math.round(clamp(x, lo, hi)), Math.round(clamp(y, 0, 255))];
    commit(pts);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const removePoint = (index) => {
    if (index === 0 || index === points.length - 1) return;
    commit(points.filter((_, k) => k !== index));
  };

  const isModified = (pts) =>
    !(pts.length === 2 && pts[0][0] === 0 && pts[0][1] === 0 && pts[1][0] === 255 && pts[1][1] === 255);

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`relative px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide transition-colors ${
              channel === c.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span style={{ color: channel === c.id ? c.color : undefined }}>{c.label}</span>
            {isModified(curves[c.id]) && (
              <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: c.color }} />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => commit([[0, 0], [255, 255]])}
          className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-200"
        >
          Reset {meta.label}
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox="-4 -4 264 264"
        className="w-full aspect-square bg-black/40 rounded-md border border-white/10 touch-none select-none cursor-crosshair"
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {[64, 128, 192].map((v) => (
          <g key={v} stroke="rgba(255,255,255,0.07)" strokeWidth="1">
            <line x1={v} y1="0" x2={v} y2="255" />
            <line x1="0" y1={v} x2="255" y2={v} />
          </g>
        ))}
        <rect x="0" y="0" width="255" height="255" fill="none" stroke="rgba(255,255,255,0.12)" />
        {histPath && <path d={histPath} fill={meta.color} opacity="0.12" />}
        <line x1="0" y1="255" x2="255" y2="0" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke={meta.color} strokeWidth="2" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={255 - p[1]}
            r="5.5"
            fill="#0b0d10"
            stroke={meta.color}
            strokeWidth="2"
            className="cursor-grab"
            onPointerDown={(e) => startDrag(e, i)}
            onDoubleClick={() => removePoint(i)}
          />
        ))}
      </svg>
      <p className="mt-1.5 text-[10.5px] text-zinc-500 leading-snug">
        Click to add a point · drag to shape · double-click or drag off to remove
      </p>
    </div>
  );
}
