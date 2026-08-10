// Scoreboard.jsx — Pickleball umpiring scoreboard
// Three scoring interaction variants × three aesthetic themes

const { useState, useEffect, useRef, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────
const THEMES = {
  stadium: {
    name: 'Stadium',
    bg: '#0B0D12',
    surface: '#12151C',
    surfaceAlt: '#1A1F2B',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.52)',
    textDim: 'rgba(255,255,255,0.32)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.18)',
    accent: '#E8FF4A',          // court-yellow electric
    accentInk: '#0B0D12',
    teamA: '#FF5A47',            // coral
    teamAGlow: 'rgba(255,90,71,0.35)',
    teamB: '#39E079',            // court-green
    teamBGlow: 'rgba(57,224,121,0.35)',
    danger: '#FF5A47',
    dark: true,
  },
  broadcast: {
    name: 'Broadcast',
    bg: '#F4F4EF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEEE8',
    text: '#0B0D12',
    textMuted: 'rgba(11,13,18,0.60)',
    textDim: 'rgba(11,13,18,0.35)',
    border: 'rgba(11,13,18,0.08)',
    borderStrong: 'rgba(11,13,18,0.18)',
    accent: '#1A56FF',
    accentInk: '#FFFFFF',
    teamA: '#E0483A',
    teamAGlow: 'rgba(224,72,58,0.18)',
    teamB: '#1B9E5B',
    teamBGlow: 'rgba(27,158,91,0.18)',
    danger: '#E0483A',
    dark: false,
  },
  editorial: {
    name: 'Editorial',
    bg: '#111111',
    surface: '#F5F1E8',
    surfaceAlt: '#1C1C1C',
    text: '#F5F1E8',
    textMuted: 'rgba(245,241,232,0.60)',
    textDim: 'rgba(245,241,232,0.35)',
    border: 'rgba(245,241,232,0.12)',
    borderStrong: 'rgba(245,241,232,0.25)',
    accent: '#F5F1E8',
    accentInk: '#111111',
    teamA: '#F5F1E8',
    teamAGlow: 'rgba(245,241,232,0.25)',
    teamB: '#E8FF4A',
    teamBGlow: 'rgba(232,255,74,0.30)',
    danger: '#FF5A47',
    dark: true,
  },
};

// ─────────────────────────────────────────────────────────────
// Icons — thin strokes
// ─────────────────────────────────────────────────────────────
const Icon = {
  ball: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <circle cx="8" cy="8" r="1.4" fill={c}/>
      <circle cx="14" cy="6.5" r="1.4" fill={c}/>
      <circle cx="18" cy="10" r="1.4" fill={c}/>
      <circle cx="8" cy="14" r="1.4" fill={c}/>
      <circle cx="14" cy="16" r="1.4" fill={c}/>
      <circle cx="18" cy="14" r="1.4" fill={c}/>
    </svg>
  ),
  plus: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  ),
  minus: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke={c} strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  ),
  undo: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 10h10a6 6 0 010 12H9" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 6l-4 4 4 4" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <path d="M12 7v5l3 2" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  video: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="13" height="12" rx="2" stroke={c} strokeWidth="1.8"/>
      <path d="M16 10l5-3v10l-5-3v-4z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  swap: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7 8h12l-3-3M17 16H5l3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrow: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14m-5-5l5 5-5 5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  serve: (c, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.6"/>
      <path d="M4 10c5 3 11 3 16 0M4 14c5-3 11-3 16 0" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  close: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  gear: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Player avatar — placeholder for real photos, shows initials on
// a subtly-striped swatch with team-colored ring
// ─────────────────────────────────────────────────────────────
function PlayerAvatar({ name, color, glow, theme, size = 56 }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  // deterministic hue offset from name for placeholder variety
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bgTone = theme.dark ? '#1A1F2B' : '#E6E6DE';
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      position: 'relative', flexShrink: 0,
      background: bgTone,
      backgroundImage: `repeating-linear-gradient(${(hash % 180) - 45}deg, ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 0 2px, transparent 2px 8px)`,
      border: `2px solid ${color}`,
      boxShadow: `0 0 0 3px ${glow}, 0 4px 14px ${glow}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <span style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: size * 0.36, fontWeight: 700,
        color: theme.text, letterSpacing: -0.5,
      }}>{initials}</span>
      {/* tiny photo-icon badge to signal "photo goes here" */}
      <div style={{
        position: 'absolute', right: -2, bottom: -2,
        width: 16, height: 16, borderRadius: 8,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${theme.bg}`,
      }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="14" rx="2" stroke="#fff" strokeWidth="2.5"/>
          <circle cx="12" cy="13" r="3" stroke="#fff" strokeWidth="2.5"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar — match meta
// ─────────────────────────────────────────────────────────────
function TopBar({ theme, game, clock, onOpenMenu }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 44, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 4, background: theme.accent,
          boxShadow: `0 0 8px ${theme.accent}`,
        }} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          fontWeight: 600, letterSpacing: 1.2, color: theme.text,
          textTransform: 'uppercase',
        }}>LIVE · GAME {game}</span>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
        fontWeight: 500, color: theme.textMuted, letterSpacing: 0.5,
      }}>{clock}</div>
      <button onClick={onOpenMenu} style={{
        background: 'transparent', border: 'none', padding: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.8" fill={theme.text}/>
          <circle cx="12" cy="12" r="1.8" fill={theme.text}/>
          <circle cx="19" cy="12" r="1.8" fill={theme.text}/>
        </svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Score numeral — the hero
// ─────────────────────────────────────────────────────────────
function ScoreNumeral({ value, color, serving, flash }) {
  return (
    <div style={{
      position: 'relative',
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 700,
      fontSize: 156,
      lineHeight: 0.88,
      color,
      letterSpacing: -6,
      fontVariantNumeric: 'tabular-nums',
      transition: 'transform 0.18s cubic-bezier(.2,.9,.3,1.3), color 0.2s',
      transform: flash ? 'scale(1.06)' : 'scale(1)',
    }}>
      {String(value).padStart(2, '0')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Team card — holds player info, score, and interaction zone
// ─────────────────────────────────────────────────────────────
function TeamCard({
  theme, team, isA, players, score, serving, serveNumber,
  sideoutFor, interactionMode, onScore, onUndo, onToggleServe,
  matchType, flash,
}) {
  const teamColor = isA ? theme.teamA : theme.teamB;
  const teamGlow = isA ? theme.teamAGlow : theme.teamBGlow;
  const isTop = isA;

  // Background: team side gets a subtle tint band when serving
  const cardBg = theme.dark
    ? (serving ? `linear-gradient(${isTop ? '180deg' : '0deg'}, ${teamGlow} 0%, transparent 60%)` : 'transparent')
    : (serving ? `linear-gradient(${isTop ? '180deg' : '0deg'}, ${teamGlow} 0%, transparent 60%)` : 'transparent');

  // Tap-to-score overlay (variant 1)
  const tapZone = interactionMode === 'tap' ? (
    <div
      onClick={onScore}
      onContextMenu={(e) => { e.preventDefault(); onUndo(); }}
      style={{
        position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 1,
      }}
    />
  ) : null;

  // Swipe handling (variant 3)
  const touchRef = useRef({ y0: 0, active: false });
  const swipeProps = interactionMode === 'swipe' ? {
    onTouchStart: (e) => { touchRef.current = { y0: e.touches[0].clientY, active: true }; },
    onMouseDown: (e) => { touchRef.current = { y0: e.clientY, active: true }; },
    onTouchEnd: (e) => {
      if (!touchRef.current.active) return;
      const dy = e.changedTouches[0].clientY - touchRef.current.y0;
      if (dy < -40) onScore();
      else if (dy > 40) onUndo();
      touchRef.current.active = false;
    },
    onMouseUp: (e) => {
      if (!touchRef.current.active) return;
      const dy = e.clientY - touchRef.current.y0;
      if (dy < -40) onScore();
      else if (dy > 40) onUndo();
      touchRef.current.active = false;
    },
    style: { cursor: 'ns-resize' },
  } : {};

  // Header strip contents (team badge + serve chip) — rendered above or below depending on isTop
  const headerStrip = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, zIndex: 2, position: 'relative', pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: 5, background: teamColor,
          boxShadow: `0 0 0 3px ${teamColor}22`, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          fontWeight: 700, letterSpacing: 1.4, color: teamColor,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>TEAM {isA ? 'A' : 'B'}</span>
      </div>
      {serving ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: theme.accent, color: theme.accentInk,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          boxShadow: `0 0 20px ${theme.accent}55`,
        }}>
          {Icon.ball(theme.accentInk, 12)}
          SERVE · {serveNumber}{serveNumber === 1 ? 'ST' : 'ND'}
        </div>
      ) : (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          fontWeight: 600, letterSpacing: 1.2, color: theme.textDim,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>Receiving</span>
      )}
    </div>
  );

  // Player name strip — full width, readable
  const playerStrip = (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      zIndex: 2, position: 'relative', pointerEvents: 'none',
    }}>
      {players.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            fontWeight: 600, letterSpacing: 1, color: theme.textDim,
            flexShrink: 0, width: 22,
          }}>P{isA ? i + 1 : (matchType === 'doubles' ? i + 3 : 2)}</span>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 22,
            fontWeight: 600, color: theme.text,
            letterSpacing: -0.4, lineHeight: 1.15,
          }}>{p}</span>
        </div>
      ))}
    </div>
  );

  // Action controls — inline to the right of/below the player strip
  const actionControls = interactionMode === 'buttons' ? (
    <div style={{
      display: 'flex', gap: 8, zIndex: 3, position: 'relative',
    }}>
      <button
        onClick={onUndo}
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>{Icon.minus(theme.textMuted, 20)}</button>
      <button
        onClick={onScore}
        style={{
          width: 64, height: 48, borderRadius: 14,
          background: teamColor, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: `0 4px 16px ${teamGlow}`,
        }}>{Icon.plus('#fff', 22)}</button>
    </div>
  ) : interactionMode === 'swipe' ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      fontWeight: 600, letterSpacing: 1, color: theme.textDim,
      textTransform: 'uppercase', pointerEvents: 'none',
      zIndex: 2, position: 'relative', whiteSpace: 'nowrap',
    }}>▲ SCORE · ▼ UNDO</div>
  ) : (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      fontWeight: 600, letterSpacing: 1, color: theme.textDim,
      textTransform: 'uppercase', pointerEvents: 'none',
      zIndex: 2, position: 'relative', whiteSpace: 'nowrap',
    }}>TAP TO SCORE</div>
  );

  return (
    <div style={{
      flex: 1, position: 'relative',
      display: 'flex', flexDirection: 'column',
      padding: '14px 20px',
      borderTop: isA ? 'none' : `1px solid ${theme.border}`,
      background: cardBg,
      overflow: 'hidden',
      justifyContent: 'space-between',
    }}
    {...swipeProps}
    >
      {tapZone}

      {isTop && headerStrip}

      {/* HERO — avatar(s) + full-width score numeral */}
      <div style={{
        position: 'relative', zIndex: 2, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 18,
        flex: 1,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          alignItems: 'center',
        }}>
          {players.map((p, i) => (
            <PlayerAvatar key={i} name={p} color={teamColor} glow={teamGlow} theme={theme}
              size={players.length > 1 ? 52 : 80} />
          ))}
        </div>
        <ScoreNumeral value={score} color={theme.text} serving={serving} flash={flash} />
      </div>

      {/* bottom strip: names + action controls, full width */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 12, zIndex: 2, position: 'relative',
      }}>
        {playerStrip}
        {actionControls}
      </div>

      {!isTop && <div style={{ height: 0 }} />}
      {!isTop && (
        <div style={{ marginTop: 10 }}>{headerStrip}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Center divider — server indicator + side-out + serve toggle
// ─────────────────────────────────────────────────────────────
function CenterDivider({ theme, servingTeam, onToggleServe, sideOut, gameScores }) {
  return (
    <div style={{
      position: 'relative', flexShrink: 0,
      borderTop: `1px solid ${theme.border}`,
      borderBottom: `1px solid ${theme.border}`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: theme.surface,
    }}>
      {/* left: games badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          fontWeight: 700, letterSpacing: 1.2, color: theme.textDim,
          textTransform: 'uppercase',
        }}>GAMES</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {gameScores.map((g, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 1,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              fontWeight: 700, color: theme.text, letterSpacing: 0.5,
              padding: '2px 5px', borderRadius: 4,
              background: g.current ? theme.surfaceAlt : 'transparent',
              border: `1px solid ${g.current ? theme.borderStrong : theme.border}`,
              minWidth: 20, textAlign: 'center',
            }}>
              <span>{g.a}</span>
              <span style={{ color: theme.textDim }}>{g.b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* center: SERVE toggle */}
      <button
        onClick={onToggleServe}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: theme.accent, color: theme.accentInk,
          border: 'none', cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase',
          boxShadow: `0 0 0 4px ${theme.surface}, 0 0 24px ${theme.accent}55`,
        }}
      >
        {Icon.swap(theme.accentInk, 14)}
        CHANGE SERVE
      </button>

      {/* right: sideout flag */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        fontWeight: 700, letterSpacing: 1.2,
        color: sideOut ? theme.accent : theme.textDim,
        textTransform: 'uppercase',
        textAlign: 'right', minWidth: 60,
      }}>
        {sideOut ? 'SIDE OUT' : `TEAM ${servingTeam}`}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom action bar — Timeout, DRS, Sub, Undo
// ─────────────────────────────────────────────────────────────
function ActionBar({ theme, timeouts, onTimeout, onDRS, onSub, onUndo, interactionMode, onCycleMode }) {
  const actions = [
    { key: 'timeout', icon: Icon.clock, label: 'Timeout', sub: `${timeouts.a}·${timeouts.b}`, onClick: onTimeout },
    { key: 'drs',     icon: Icon.video, label: 'DRS',     sub: 'Review',                      onClick: onDRS },
    { key: 'sub',     icon: Icon.swap,  label: 'Sub',     sub: 'Swap',                        onClick: onSub },
    { key: 'undo',    icon: Icon.undo,  label: 'Undo',    sub: 'Last',                        onClick: onUndo },
  ];
  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px 8px',
      borderTop: `1px solid ${theme.border}`,
      background: theme.surface,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
      }}>
        {actions.map(a => (
          <button key={a.key} onClick={a.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 4px', borderRadius: 14,
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
            cursor: 'pointer',
          }}>
            {a.icon(theme.text, 18)}
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 12,
              fontWeight: 600, color: theme.text, letterSpacing: -0.2,
            }}>{a.label}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              fontWeight: 600, color: theme.textDim, letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}>{a.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// End-match swipe bar
// ─────────────────────────────────────────────────────────────
function EndMatchBar({ theme, onEnd }) {
  const [drag, setDrag] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const barRef = useRef(null);
  const startRef = useRef(null);

  const onStart = (clientX) => { startRef.current = clientX; };
  const onMove = (clientX) => {
    if (startRef.current == null || !barRef.current) return;
    const max = barRef.current.offsetWidth - 52;
    setDrag(Math.max(0, Math.min(max, clientX - startRef.current)));
  };
  const onEndDrag = () => {
    if (startRef.current == null || !barRef.current) return;
    const max = barRef.current.offsetWidth - 52;
    if (drag > max * 0.75) { setConfirmed(true); setTimeout(() => { onEnd(); setConfirmed(false); setDrag(0); }, 400); }
    else setDrag(0);
    startRef.current = null;
  };

  return (
    <div
      ref={barRef}
      style={{
        position: 'relative', height: 44, margin: '0 16px 14px',
        borderRadius: 999, background: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        overflow: 'hidden', flexShrink: 0,
      }}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onEndDrag}
      onMouseLeave={onEndDrag}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onEndDrag}
    >
      {/* track fill */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: drag + 44, background: theme.danger, opacity: 0.18,
        transition: startRef.current == null ? 'width 0.2s' : 'none',
      }} />
      {/* label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        fontWeight: 700, letterSpacing: 2, color: theme.textMuted,
        textTransform: 'uppercase', pointerEvents: 'none',
      }}>
        {confirmed ? 'ENDING MATCH…' : '— SWIPE TO END MATCH →'}
      </div>
      {/* handle */}
      <div
        onMouseDown={(e) => onStart(e.clientX)}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        style={{
          position: 'absolute', left: 2 + drag, top: 2,
          width: 40, height: 40, borderRadius: 999,
          background: theme.danger,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', userSelect: 'none',
          transition: startRef.current == null ? 'left 0.2s' : 'none',
          boxShadow: `0 2px 8px ${theme.danger}66`,
        }}
      >
        {Icon.arrow('#fff', 18)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tweaks panel
// ─────────────────────────────────────────────────────────────
function TweaksPanel({ open, onClose, tweaks, setTweaks, themeKey, setThemeKey, interactionMode, setInteractionMode, matchType, setMatchType }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24,
      width: 300, padding: 18, borderRadius: 22,
      background: '#12151C', color: '#fff', zIndex: 1000,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
      fontFamily: 'Space Grotesk, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        }}>Tweaks</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
        }}>{Icon.close('rgba(255,255,255,0.7)', 18)}</button>
      </div>

      <TweakGroup label="Aesthetic">
        {['stadium', 'broadcast', 'editorial'].map(t => (
          <TweakChip key={t} active={themeKey === t} onClick={() => setThemeKey(t)}>
            {THEMES[t].name}
          </TweakChip>
        ))}
      </TweakGroup>

      <TweakGroup label="Score Interaction">
        {[
          ['tap', 'Tap card'],
          ['buttons', '+/− buttons'],
          ['swipe', 'Swipe up/down'],
        ].map(([v, label]) => (
          <TweakChip key={v} active={interactionMode === v} onClick={() => setInteractionMode(v)}>
            {label}
          </TweakChip>
        ))}
      </TweakGroup>

      <TweakGroup label="Match Format">
        {[['singles', 'Singles'], ['doubles', 'Doubles']].map(([v, label]) => (
          <TweakChip key={v} active={matchType === v} onClick={() => setMatchType(v)}>
            {label}
          </TweakChip>
        ))}
      </TweakGroup>
    </div>
  );
}

function TweakGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function TweakChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 999,
      background: active ? '#E8FF4A' : 'rgba(255,255,255,0.06)',
      color: active ? '#0B0D12' : 'rgba(255,255,255,0.85)',
      border: 'none', cursor: 'pointer',
      fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 600,
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────────
// Top-level scoreboard
// ─────────────────────────────────────────────────────────────
function Scoreboard({ tweaks, setTweaks }) {
  const themeKey = tweaks.theme;
  const theme = THEMES[themeKey];
  const interactionMode = tweaks.interactionMode;
  const matchType = tweaks.matchType;

  // Match state
  const [history, setHistory] = useState([{ a: 4, b: 10, serving: 'B', serveNum: 1, sideOut: false }]);
  const cur = history[history.length - 1];
  const [flashA, setFlashA] = useState(false);
  const [flashB, setFlashB] = useState(false);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClock(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const clockStr = useCallback(() => {
    const m = Math.floor((clock + 1823) / 60);
    const s = (clock + 1823) % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, [clock])();

  const playersA = matchType === 'doubles' ? ['Keerthi YS', 'Aadhira R'] : ['Keerthi YS'];
  const playersB = matchType === 'doubles' ? ['Sneha Ankitaa', 'Priya M'] : ['Sneha Ankitaa'];

  const push = (next) => setHistory(h => [...h, next]);
  const pop = () => setHistory(h => h.length > 1 ? h.slice(0, -1) : h);

  const scoreTeam = (team) => {
    const next = { ...cur, sideOut: false };
    if (cur.serving === team) {
      next[team.toLowerCase()] = cur[team.toLowerCase()] + 1;
      next.serveNum = cur.serveNum; // continues
    } else {
      // receiving team scored only if serving team had side-out flow;
      // in pickleball, only server scores — so this is a side-out
      if (cur.serveNum === 1) { next.serveNum = 2; next.sideOut = false; }
      else { next.serving = team; next.serveNum = 1; next.sideOut = true; }
      // don't add point
      push(next); return;
    }
    push(next);
    if (team === 'A') { setFlashA(true); setTimeout(() => setFlashA(false), 200); }
    else { setFlashB(true); setTimeout(() => setFlashB(false), 200); }
  };

  // Simplified scoring — the user asked for clear scoring; we allow direct +1 per team
  const plusTeam = (team) => {
    const next = { ...cur, sideOut: false };
    next[team.toLowerCase()] = cur[team.toLowerCase()] + 1;
    push(next);
    if (team === 'A') { setFlashA(true); setTimeout(() => setFlashA(false), 200); }
    else { setFlashB(true); setTimeout(() => setFlashB(false), 200); }
  };

  const toggleServe = () => {
    const next = { ...cur };
    next.serving = cur.serving === 'A' ? 'B' : 'A';
    next.serveNum = 1;
    next.sideOut = true;
    push(next);
    setTimeout(() => setHistory(h => {
      const c = { ...h[h.length - 1], sideOut: false };
      return [...h.slice(0, -1), c];
    }), 1500);
  };

  const gameScores = [
    { a: 11, b: 7, current: false },
    { a: cur.a, b: cur.b, current: true },
  ];

  const [showTweaks, setShowTweaks] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: theme.bg, color: theme.text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Space Grotesk, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* court stripe texture */}
      {theme.dark && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(135deg, ${theme.text} 0 1px, transparent 1px 40px)`,
        }} />
      )}

      {/* spacer for status bar */}
      <div style={{ height: 54, flexShrink: 0 }} />

      <TopBar theme={theme} game={2} clock={clockStr} onOpenMenu={() => setShowTweaks(v => !v)} />

      {/* TEAM A card */}
      <TeamCard
        theme={theme} isA={true}
        players={playersA}
        score={cur.a} serving={cur.serving === 'A'} serveNumber={cur.serveNum}
        sideoutFor={cur.sideOut ? cur.serving : null}
        interactionMode={interactionMode}
        onScore={() => plusTeam('A')}
        onUndo={pop}
        onToggleServe={toggleServe}
        matchType={matchType}
        flash={flashA}
      />

      <CenterDivider
        theme={theme}
        servingTeam={cur.serving}
        onToggleServe={toggleServe}
        sideOut={cur.sideOut}
        gameScores={gameScores}
      />

      {/* TEAM B card */}
      <TeamCard
        theme={theme} isA={false}
        players={playersB}
        score={cur.b} serving={cur.serving === 'B'} serveNumber={cur.serveNum}
        sideoutFor={cur.sideOut ? cur.serving : null}
        interactionMode={interactionMode}
        onScore={() => plusTeam('B')}
        onUndo={pop}
        onToggleServe={toggleServe}
        matchType={matchType}
        flash={flashB}
      />

      <ActionBar
        theme={theme}
        timeouts={{ a: 1, b: 2 }}
        onTimeout={() => showToast('Timeout started · 60s')}
        onDRS={() => showToast('DRS · Video review')}
        onSub={() => showToast('Substitution')}
        onUndo={pop}
      />

      <EndMatchBar theme={theme} onEnd={() => showToast('Match ended')} />

      {/* home indicator spacer */}
      <div style={{ height: 18, flexShrink: 0 }} />

      {/* toast */}
      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 110,
          transform: 'translateX(-50%)',
          padding: '10px 16px', borderRadius: 999,
          background: theme.surfaceAlt, color: theme.text,
          border: `1px solid ${theme.borderStrong}`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
          zIndex: 100,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}>{toast}</div>
      )}

      <TweaksPanel
        open={showTweaks} onClose={() => setShowTweaks(false)}
        tweaks={tweaks} setTweaks={setTweaks}
        themeKey={themeKey} setThemeKey={(v) => setTweaks({ ...tweaks, theme: v })}
        interactionMode={interactionMode} setInteractionMode={(v) => setTweaks({ ...tweaks, interactionMode: v })}
        matchType={matchType} setMatchType={(v) => setTweaks({ ...tweaks, matchType: v })}
      />
    </div>
  );
}

Object.assign(window, { Scoreboard, THEMES });
