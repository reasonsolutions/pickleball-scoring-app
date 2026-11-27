import React, { useEffect, useRef, useState } from 'react';

// Output dimensions for player action photos
export const ACTION_PHOTO_WIDTH = 1440;
export const ACTION_PHOTO_HEIGHT = 1600;

// Silhouette traced from the reference action photo (in 1440×1600 space)
const GUIDE_PATH =
  'M532 140L576 136L612 140L654 154L688 176L733 227L748 276L774 322L786 358L786 381L763 419L762 430L773 483L790 506L857 559L948 588L1020 596L1056 608L1094 634L1121 671L1140 732L1150 818L1171 893L1184 1048L1176 1080L1140 1124L1121 1137L1079 1151L1068 1164L1067 1181L1096 1408L1084 1521L1087 1537L1102 1562L1106 1577L1101 1589L1092 1596L1072 1600L368 1600L349 1595L339 1581L336 1568L342 1518L371 1371L376 1312L373 1299L364 1287L324 1284L304 1272L254 1196L256 1040L278 790L289 745L312 704L352 680L510 606L522 594L532 572L540 537L538 526L529 511L490 494L471 473L456 440L419 293L420 268L427 243L452 188L486 158L525 141Z';

const VIEW_W = 360;
const VIEW_H = (VIEW_W * ACTION_PHOTO_HEIGHT) / ACTION_PHOTO_WIDTH; // 400

export default function ActionPhotoCropModal({ src, onCancel, onConfirm }) {
  const [img, setImg] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(1); // relative to "cover" scale
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left in view px
  const [showGuide, setShowGuide] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      setImg(image);
      const cover = Math.max(VIEW_W / image.naturalWidth, VIEW_H / image.naturalHeight);
      setZoom(1);
      setOffset({
        x: (VIEW_W - image.naturalWidth * cover) / 2,
        y: (VIEW_H - image.naturalHeight * cover) / 2
      });
    };
    image.onerror = () => setLoadError('Could not load image for cropping.');
    image.src = src;
  }, [src]);

  const coverScale = img ? Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight) : 1;
  const scale = coverScale * zoom;

  // Zoom around the centre of the frame
  const applyZoom = (nextZoom) => {
    if (!img) return;
    const z = Math.min(4, Math.max(0.3, nextZoom));
    const next = coverScale * z;
    setOffset(prev => ({
      x: VIEW_W / 2 - ((VIEW_W / 2 - prev.x) / scale) * next,
      y: VIEW_H / 2 - ((VIEW_H / 2 - prev.y) / scale) * next
    }));
    setZoom(z);
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onWheel = (e) => applyZoom(zoom * (e.deltaY < 0 ? 1.05 : 1 / 1.05));

  const handleConfirm = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const ratio = ACTION_PHOTO_WIDTH / VIEW_W;
      const canvas = document.createElement('canvas');
      canvas.width = ACTION_PHOTO_WIDTH;
      canvas.height = ACTION_PHOTO_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        offset.x * ratio,
        offset.y * ratio,
        img.naturalWidth * scale * ratio,
        img.naturalHeight * scale * ratio
      );
      // PNG keeps transparency for cut-out photos
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create image'))), 'image/png')
      );
      await onConfirm(new File([blob], `action-photo-${Date.now()}.png`, { type: 'image/png' }));
    } catch (error) {
      console.error('Error cropping action photo:', error);
      alert(`Failed to crop image: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open" style={{ zIndex: 1000 }}>
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">Crop Action Photo</h3>
        <p className="text-xs text-base-content/60 mt-1">
          Output: {ACTION_PHOTO_WIDTH} × {ACTION_PHOTO_HEIGHT}px. Drag to move, scroll or use the slider to zoom.
          Line the player up with the dotted outline.
        </p>

        <div className="flex justify-center mt-4">
          <div
            className="relative overflow-hidden rounded-lg border border-base-300 select-none touch-none cursor-move"
            style={{
              width: VIEW_W,
              height: VIEW_H,
              backgroundColor: '#e5e7eb',
              backgroundImage:
                'linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0,0 8px,8px -8px,-8px 0'
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {img && (
              <img
                src={img.src}
                alt="Crop preview"
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  left: offset.x,
                  top: offset.y,
                  width: img.naturalWidth * scale,
                  height: img.naturalHeight * scale
                }}
              />
            )}
            {!img && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-error text-center">{loadError}</div>
            )}
            {showGuide && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={VIEW_W}
                height={VIEW_H}
                viewBox={`0 0 ${ACTION_PHOTO_WIDTH} ${ACTION_PHOTO_HEIGHT}`}
              >
                <path d={GUIDE_PATH} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="10" strokeDasharray="22 18" />
                <path d={GUIDE_PATH} fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="22 18" />
              </svg>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyZoom(zoom / 1.15)} disabled={!img}>−</button>
          <input
            type="range"
            className="range range-xs range-primary flex-1"
            min="0.3"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            disabled={!img}
          />
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyZoom(zoom * 1.15)} disabled={!img}>+</button>
        </div>
        <label className="label cursor-pointer justify-start gap-2 mt-1">
          <input type="checkbox" className="checkbox checkbox-xs" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
          <span className="label-text text-xs">Show outline guide</span>
        </label>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!img || saving}>
            {saving ? 'Cropping...' : 'Crop & Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
