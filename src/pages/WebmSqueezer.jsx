import React, { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import s from '../styles/WebmSqueezer.module.css';
import {
  PRESETS, bytes, checkSupport, convertToWebm, isMp4, seconds,
} from '../utils/webmConverter';

const SETTINGS_KEY = 'webm-squeezer:settings';
const DEFAULTS = { preset: 'small', height: 0, fps: 0, audio: 'low' };

const PRESET_OPTIONS = [
  { id: 'balanced', label: 'Balanced', hint: 'Looks identical, big saving' },
  { id: 'small', label: 'Small', hint: 'Very small, still clean' },
  { id: 'extreme', label: 'Extreme', hint: 'Smallest possible' },
];

const cx = (...names) => names.filter(Boolean).map((n) => s[n] || n).join(' ');

/** Settings remembered between visits (best effort; falls back to defaults). */
function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings]);
  return [settings, setSettings];
}

function SettingsPanel({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <section className={s.settings}>
      <div className={cx('field', 'wide')}>
        <span className={s.label}>Compression</span>
        <div className={s.segmented} role="radiogroup" aria-label="Compression">
          {PRESET_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={value.preset === p.id}
              className={value.preset === p.id ? s.on : ''}
              onClick={() => set('preset', p.id)}
            >
              <b>{p.label}</b>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <label className={s.field}>
        <span className={s.label}>Max height</span>
        <select value={value.height} onChange={(e) => set('height', Number(e.target.value))}>
          <option value={0}>Keep original</option>
          <option value={1080}>1080p</option>
          <option value={720}>720p</option>
          <option value={480}>480p</option>
        </select>
      </label>

      <label className={s.field}>
        <span className={s.label}>Frame rate</span>
        <select value={value.fps} onChange={(e) => set('fps', Number(e.target.value))}>
          <option value={0}>Keep original</option>
          <option value={30}>Cap at 30 fps</option>
          <option value={24}>Cap at 24 fps</option>
        </select>
      </label>

      <label className={s.field}>
        <span className={s.label}>Audio</span>
        <select value={value.audio} onChange={(e) => set('audio', e.target.value)}>
          <option value="normal">Normal · 48k stereo</option>
          <option value="low">Low · 24k mono</option>
          <option value="none">Remove audio</option>
        </select>
      </label>
    </section>
  );
}

function DropZone({ onFiles }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const take = (list) => {
    if (!list) return;
    const all = Array.from(list);
    const mp4s = all.filter(isMp4);
    setSkipped(all.length - mp4s.length);
    if (mp4s.length) onFiles(mp4s);
  };

  return (
    <div
      className={cx('drop', over && 'over')}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <strong>Drop MP4 files here</strong>
      <span>or click to choose. Add as many as you like.</span>
      {skipped > 0 && <em>{skipped} non-MP4 file{skipped > 1 ? 's' : ''} skipped</em>}
      <input
        ref={input}
        type="file"
        accept="video/mp4,.mp4"
        multiple
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function JobCard({ job, onRemove }) {
  const saved = job.out_size ? Math.round((1 - job.out_size / job.in_size) * 100) : 0;
  const elapsed = job.elapsed ? ` · ${seconds(job.elapsed)}` : '';

  let meta;
  switch (job.status) {
    case 'queued':
      meta = `Waiting in line · ${bytes(job.in_size)}`;
      break;
    case 'converting':
      meta = `Converting · ${job.progress}% · ${job.info}${elapsed}`;
      break;
    case 'done':
      meta = (
        <>
          {bytes(job.in_size)} → <b>{bytes(job.out_size)}</b> · {job.info}{elapsed}
        </>
      );
      break;
    default:
      meta = job.error || 'Conversion failed';
  }

  const busy = job.status === 'converting' || job.status === 'queued';
  return (
    <li className={cx('card', job.status)}>
      <div className={s.row}>
        <span className={s.name}>{job.name}</span>
        <div className={s.actions}>
          {job.status === 'done' && (
            <>
              <span className={s.pill}>{saved >= 0 ? `−${saved}%` : `+${-saved}%`}</span>
              <a className={cx('btn', 'small')} href={job.url} download={job.outName}>
                Download
              </a>
            </>
          )}
          <button className={s.icon} onClick={onRemove} aria-label={busy ? 'Cancel' : 'Remove'} title={busy ? 'Cancel' : 'Remove'}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className={s.meta}>{meta}</div>
      <div className={s.bar}>
        <i style={{ width: `${job.status === 'error' ? 100 : job.progress}%` }} />
      </div>
    </li>
  );
}

export default function WebmSqueezer() {
  const [settings, setSettings] = useSettings();
  const [support, setSupport] = useState(null); // { vp9, opus } once checked
  const [jobs, setJobs] = useState([]);
  const running = useRef(null); // { id, cancel }
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const patch = useCallback((id, p) => {
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...p } : j)));
  }, []);

  useEffect(() => {
    document.title = 'WebM Squeezer';
    checkSupport().then(setSupport);
    return () => {
      running.current?.cancel();
      jobsRef.current.forEach((j) => j.url && URL.revokeObjectURL(j.url));
    };
  }, []);

  const engine = !support ? 'loading' : support.vp9 ? 'ready' : 'failed';

  // Convert queued files one at a time.
  useEffect(() => {
    if (engine !== 'ready' || running.current) return;
    const next = jobs.find((j) => j.status === 'queued');
    if (!next) return;

    const started = Date.now();
    const elapsed = () => Math.round((Date.now() - started) / 100) / 10;
    patch(next.id, { status: 'converting', info: PRESETS[next.preset].label });

    const opts = { ...next, audio: support.opus ? next.audio : 'none' };
    // Progress events can trail the finished conversion, so only apply them while converting.
    const { promise, cancel } = convertToWebm(next.file, opts, (progress) =>
      setJobs((list) => list.map((j) => (
        j.id === next.id && j.status === 'converting' ? { ...j, progress, elapsed: elapsed() } : j))));
    running.current = { id: next.id, cancel };

    promise
      .then((blob) => {
        patch(next.id, {
          status: 'done',
          progress: 100,
          out_size: blob.size,
          url: URL.createObjectURL(blob),
          blob,
          elapsed: elapsed(),
          file: null,
        });
      })
      .catch((e) => {
        if (running.current?.id !== next.id) return; // cancelled
        patch(next.id, { status: 'error', error: e?.message || String(e), elapsed: elapsed(), file: null });
      })
      .finally(() => {
        if (running.current?.id === next.id) running.current = null;
        setJobs((list) => [...list]); // nudge the queue
      });
  }, [engine, jobs, patch, support]);

  const enqueue = (files) => {
    setJobs((list) => [
      ...list,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        outName: f.name.replace(/\.[^.]+$/, '') + '.webm',
        status: 'queued',
        progress: 0,
        in_size: f.size,
        out_size: null,
        info: null,
        error: null,
        elapsed: 0,
        ...settings,
      })),
    ]);
  };

  const remove = (id) => {
    const job = jobs.find((j) => j.id === id);
    if (job?.url) URL.revokeObjectURL(job.url);
    if (running.current?.id === id) {
      running.current.cancel();
      running.current = null;
    }
    setJobs((list) => list.filter((j) => j.id !== id));
  };

  const clear = () => {
    jobs.forEach((j) => j.status !== 'queued' && j.status !== 'converting' && j.url && URL.revokeObjectURL(j.url));
    setJobs((list) => list.filter((j) => j.status === 'queued' || j.status === 'converting'));
  };

  const done = jobs.filter((j) => j.status === 'done');
  const inTotal = done.reduce((a, j) => a + j.in_size, 0);
  const outTotal = done.reduce((a, j) => a + (j.out_size ?? 0), 0);
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'converting').length;
  const finished = jobs.length - active;

  const downloadAll = async () => {
    const zip = new JSZip();
    const used = new Set();
    done.forEach((j) => {
      const base = j.outName.replace(/\.webm$/, '');
      let n = j.outName;
      for (let k = 1; used.has(n); k++) n = `${base}_${k}.webm`;
      used.add(n);
      zip.file(n, j.blob);
    });
    saveAs(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'webm_files.zip');
  };

  const statusLabel = { loading: 'Checking browser…', ready: 'Converter ready', failed: 'Not supported here' }[engine];

  return (
    <div className={s.page}>
      <main className={s.wrap}>
        <header className={s.head}>
          <div>
            <h1>WebM Squeezer</h1>
            <p>Turn MP4s into tiny WebMs at the same resolution. Everything stays on your computer.</p>
          </div>
          <span className={cx('status', engine === 'loading' && 'loading', engine === 'failed' && 'down')}>
            <i /> {statusLabel}
          </span>
        </header>

        {engine === 'failed' && (
          <div className={cx('notice', 'bad')}>
            This browser can't encode VP9 video. Use a recent desktop Chrome, Edge or Firefox.
          </div>
        )}
        {engine === 'ready' && !support.opus && (
          <div className={cx('notice', 'bad')}>
            This browser can't encode Opus audio, so converted files will have no sound. Chrome, Edge or Firefox can keep it.
          </div>
        )}

        <SettingsPanel value={settings} onChange={setSettings} />

        <DropZone onFiles={enqueue} />

        {jobs.length > 0 && (
          <section className={s.queue}>
            <div className={s.queueHead}>
              <div className={s.summary}>
                {outTotal > 0 ? (
                  <>
                    <b>{bytes(inTotal - outTotal)}</b> saved · {bytes(inTotal)} → {bytes(outTotal)}
                  </>
                ) : (
                  <>{active} in progress</>
                )}
              </div>
              <div className={s.actions}>
                {finished > 0 && (
                  <button className={cx('btn', 'ghost')} onClick={clear}>
                    Clear finished
                  </button>
                )}
                <button className={s.btn} disabled={!done.length} onClick={downloadAll}>
                  Download all ({done.length})
                </button>
              </div>
            </div>

            <ul className={s.list}>
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} onRemove={() => remove(j.id)} />
              ))}
            </ul>
          </section>
        )}

        <footer className={s.foot}>
          Settings apply to files you add next. Files are converted one at a time in your browser using its built-in encoder — keep this tab open.
        </footer>
      </main>
    </div>
  );
}
