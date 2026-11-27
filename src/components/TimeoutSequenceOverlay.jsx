import React, { useEffect, useRef, useState } from 'react';

// Timeout takeover for the venue displays, drawn on the 1920x1080 jumbotron canvas:
//   0-10s  which team called the timeout
//   10-50s sliding images from the Display Controller, in order, 10s each
//   50-60s countdown 10 -> 1, then the scorecard comes back
const TEAM_SECONDS = 10;
const ADS_SECONDS = 40;
const AD_SLIDE_SECONDS = 10;
const COUNTDOWN_SECONDS = 10;
export const TIMEOUT_SEQUENCE_MS = (TEAM_SECONDS + ADS_SECONDS + COUNTDOWN_SECONDS) * 1000;

// A regular timeout from the umpire app (substitutions keep their own ads flow)
export const getActiveTimeout = (match) => {
  const t = match?.timeoutInProgress;
  const isLive = match?.status === 'live' || match?.status === 'in_progress';
  if (!isLive || !t || typeof t !== 'object' || !t.team || t.type === 'substitution') return null;
  return t;
};

const toMillis = (ts) => {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
};

export default function TimeoutSequenceOverlay({ timeout, teamName, teamLogo, images = [], onComplete }) {
  const [elapsed, setElapsed] = useState(0);
  const baseRef = useRef(null);
  const completedRef = useRef(false);
  const startMs = toMillis(timeout?.startTime);
  const timeoutKey = timeout ? `${timeout.team}|${startMs}` : null;

  useEffect(() => {
    if (!timeoutKey) return undefined;
    // Run off the time this display first saw the timeout so main and side stay in step.
    // If the page was reloaded mid-timeout, pick up from the umpire's start time instead.
    const now = Date.now();
    const sinceStart = startMs ? now - startMs : null;
    baseRef.current = sinceStart !== null && sinceStart > 5000 && sinceStart < TIMEOUT_SEQUENCE_MS ? startMs : now;
    completedRef.current = false;
    setElapsed(now - baseRef.current);

    const interval = setInterval(() => setElapsed(Date.now() - baseRef.current), 250);
    return () => clearInterval(interval);
  }, [timeoutKey]);

  const finished = !timeout || elapsed >= TIMEOUT_SEQUENCE_MS;

  useEffect(() => {
    if (timeout && finished && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [timeout, finished, onComplete]);

  if (finished) return null;

  const seconds = elapsed / 1000;
  let content;

  if (seconds < TEAM_SECONDS) {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, animation: 'to-pop .6s ease-out' }}>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: 18, color: '#ffd23a', textTransform: 'uppercase' }}>Timeout</div>
        {teamLogo && (
          <img src={teamLogo} alt={teamName} style={{ width: 340, height: 340, objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.6))' }} />
        )}
        <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase', padding: '0 80px' }}>{teamName}</div>
        <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.75, letterSpacing: 6, textTransform: 'uppercase' }}>has called a timeout</div>
      </div>
    );
  } else if (seconds < TEAM_SECONDS + ADS_SECONDS && images.length > 0) {
    const slot = Math.floor((seconds - TEAM_SECONDS) / AD_SLIDE_SECONDS);
    const image = images[slot % images.length];
    content = (
      <img
        key={slot}
        src={image.url}
        alt={image.name || 'Sponsor'}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', animation: 'to-fade .6s ease-out' }}
      />
    );
  } else if (seconds < TEAM_SECONDS + ADS_SECONDS) {
    // No sliding images configured: keep the timeout card up through the ad break
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: 18, color: '#ffd23a', textTransform: 'uppercase' }}>Timeout</div>
        <div style={{ fontSize: 100, fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', padding: '0 80px' }}>{teamName}</div>
      </div>
    );
  } else {
    const count = Math.max(1, Math.ceil(TIMEOUT_SEQUENCE_MS / 1000 - seconds));
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: 14, color: '#ffd23a', textTransform: 'uppercase' }}>Play resumes in</div>
        <div key={count} style={{ fontSize: 480, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 60px rgba(255,45,120,.7)', animation: 'to-tick 1s ease-out' }}>
          {count}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#fff', background: 'radial-gradient(ellipse at 50% 40%, #2a0a6e 0%, #07021f 75%)' }}>
      <style>{`
        @keyframes to-pop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes to-fade{from{opacity:0}to{opacity:1}}
        @keyframes to-tick{0%{transform:scale(1.25)}100%{transform:scale(1)}}
      `}</style>
      {content}
    </div>
  );
}
