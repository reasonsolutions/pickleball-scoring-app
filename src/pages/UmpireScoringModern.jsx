import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

// ─────────────────────────────────────────────────────────────
// Themes - Stadium theme as default
// ─────────────────────────────────────────────────────────────
const THEME = {
  name: 'Stadium',
  bg: '#0B0D12',
  surface: '#12151C',
  surfaceAlt: '#1A1F2B',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.52)',
  textDim: 'rgba(255,255,255,0.32)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.18)',
  accent: '#E8FF4A',
  accentInk: '#0B0D12',
  teamA: '#FF5A47',
  teamAGlow: 'rgba(255,90,71,0.35)',
  teamB: '#39E079',
  teamBGlow: 'rgba(57,224,121,0.35)',
  danger: '#FF5A47',
  dark: true,
};

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────
const Icon = {
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
  close: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  serve: (c, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.6"/>
      <path d="M4 10c5 3 11 3 16 0M4 14c5-3 11-3 16 0" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  arrow: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14m-5-5l5 5-5 5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Player Avatar
// ─────────────────────────────────────────────────────────────
function PlayerAvatar({ name, color, glow, size = 56, serveNumber, isServing, photo }) {
  const [imageError, setImageError] = React.useState(false);
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bgTone = '#1A1F2B';
  
  const showImage = photo && !imageError;
  
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      position: 'relative', flexShrink: 0,
      background: bgTone,
      backgroundImage: showImage ? 'none' : `repeating-linear-gradient(${(hash % 180) - 45}deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 8px)`,
      border: `2px solid ${color}`,
      boxShadow: `0 0 0 3px ${glow}, 0 4px 14px ${glow}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {showImage ? (
        <img
          src={photo}
          alt={name}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: size * 0.36, fontWeight: 700,
          color: THEME.text, letterSpacing: -0.5,
        }}>{initials}</span>
      )}
      
      {/* Serve indicator - pulsing circles */}
      {isServing && serveNumber && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          display: 'flex',
          gap: 4,
        }}>
          {/* First serve circle */}
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            background: THEME.accent,
            border: `2px solid ${THEME.bg}`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow: `0 0 0 0 ${THEME.accent}`,
          }}>
            <style>{`
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                  box-shadow: 0 0 0 0 ${THEME.accent}88;
                }
                50% {
                  opacity: 1;
                  box-shadow: 0 0 0 8px ${THEME.accent}00;
                }
              }
            `}</style>
          </div>
          
          {/* Second serve circle - only show if serveNumber is 2 */}
          {serveNumber === 2 && (
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              background: THEME.accent,
              border: `2px solid ${THEME.bg}`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.3s',
              boxShadow: `0 0 0 0 ${THEME.accent}`,
            }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top Bar
// ─────────────────────────────────────────────────────────────
function TopBar({ game, clock, matchInfo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 44, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 4, background: THEME.accent,
          boxShadow: `0 0 8px ${THEME.accent}`,
        }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          fontWeight: 600, letterSpacing: 1.2, color: THEME.text,
          textTransform: 'uppercase',
        }}>LIVE · GAME {game}</span>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
        fontWeight: 500, color: THEME.textMuted, letterSpacing: 0.5,
      }}>{clock}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        fontWeight: 600, color: THEME.textDim, letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {matchInfo?.venueCourtId || 'COURT'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Score Numeral
// ─────────────────────────────────────────────────────────────
function ScoreNumeral({ value, color, flash }) {
  return (
    <div style={{
      position: 'relative',
      fontFamily: "'JetBrains Mono', monospace",
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
// Team Card
// ─────────────────────────────────────────────────────────────
function TeamCard({
  isA, players, score, serving, serveNumber,
  onScore, onUndo, matchType, flash, isSubstituted, playerPhotos
}) {
  const teamColor = isA ? THEME.teamA : THEME.teamB;
  const teamGlow = isA ? THEME.teamAGlow : THEME.teamBGlow;
  const isTop = isA;

  const cardBg = serving 
    ? `linear-gradient(${isTop ? '180deg' : '0deg'}, ${teamGlow} 0%, transparent 60%)`
    : 'transparent';

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
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          fontWeight: 700, letterSpacing: 1.4, color: teamColor,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>TEAM {isA ? 'A' : 'B'}</span>
      </div>
      {serving ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 999,
          background: THEME.accent, color: THEME.accentInk,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          boxShadow: `0 0 20px ${THEME.accent}55`,
        }}>
          {Icon.serve(THEME.accentInk, 12)}
          <span>SERVE</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* First serve circle */}
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: THEME.accentInk,
              border: `1.5px solid ${THEME.accentInk}`,
              animation: 'servePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}>
              <style>{`
                @keyframes servePulse {
                  0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                  }
                  50% {
                    opacity: 0.7;
                    transform: scale(1.15);
                  }
                }
              `}</style>
            </div>
            
            {/* Second serve circle - only show if serveNumber is 2 */}
            {serveNumber === 2 && (
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: THEME.accentInk,
                border: `1.5px solid ${THEME.accentInk}`,
                animation: 'servePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.3s',
              }} />
            )}
          </div>
        </div>
      ) : (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          fontWeight: 600, letterSpacing: 1.2, color: THEME.textDim,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>Receiving</span>
      )}
    </div>
  );

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
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            fontWeight: 600, letterSpacing: 1, color: THEME.textDim,
            flexShrink: 0, width: 22,
          }}>P{isA ? i + 1 : (matchType === 'doubles' ? i + 3 : 2)}</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 22,
            fontWeight: 600, color: THEME.text,
            letterSpacing: -0.4, lineHeight: 1.15,
          }}>{p}</span>
          {isSubstituted && isSubstituted(p) && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
              fontWeight: 700, letterSpacing: 1, color: THEME.accent,
              textTransform: 'uppercase', marginLeft: 4,
            }}>SUB</span>
          )}
        </div>
      ))}
    </div>
  );

  const actionControls = (
    <div style={{
      display: 'flex', gap: 8, zIndex: 3, position: 'relative',
    }}>
      <button
        onClick={onUndo}
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>{Icon.minus(THEME.textMuted, 20)}</button>
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
  );

  return (
    <div style={{
      flex: 1, position: 'relative',
      display: 'flex', flexDirection: 'column',
      padding: '14px 20px',
      borderTop: isA ? 'none' : `1px solid ${THEME.border}`,
      background: cardBg,
      overflow: 'hidden',
      justifyContent: 'space-between',
    }}>
      {isTop && headerStrip}

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
            <PlayerAvatar key={i} name={p} color={teamColor} glow={teamGlow}
              size={players.length > 1 ? 52 : 80} photo={playerPhotos?.[p]} />
          ))}
        </div>
        <ScoreNumeral value={score} color={THEME.text} flash={flash} />
      </div>

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
// Center Divider
// ─────────────────────────────────────────────────────────────
function CenterDivider({ servingTeam, onToggleServe, gameScores }) {
  return (
    <div style={{
      position: 'relative', flexShrink: 0,
      borderTop: `1px solid ${THEME.border}`,
      borderBottom: `1px solid ${THEME.border}`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: THEME.surface,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: 1.2, color: THEME.textDim,
          textTransform: 'uppercase',
        }}>GAMES</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {gameScores.map((g, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 1,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              fontWeight: 700, color: THEME.text, letterSpacing: 0.5,
              padding: '2px 5px', borderRadius: 4,
              background: g.current ? THEME.surfaceAlt : 'transparent',
              border: `1px solid ${g.current ? THEME.borderStrong : THEME.border}`,
              minWidth: 20, textAlign: 'center',
            }}>
              <span>{g.a}</span>
              <span style={{ color: THEME.textDim }}>{g.b}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onToggleServe}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: THEME.accent, color: THEME.accentInk,
          border: 'none', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase',
          boxShadow: `0 0 0 4px ${THEME.surface}, 0 0 24px ${THEME.accent}55`,
        }}
      >
        {Icon.swap(THEME.accentInk, 14)}
        CHANGE SERVE
      </button>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        fontWeight: 700, letterSpacing: 1.2,
        color: THEME.textDim,
        textTransform: 'uppercase',
        textAlign: 'right', minWidth: 60,
      }}>
        TEAM {servingTeam}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Action Bar
// ─────────────────────────────────────────────────────────────
function ActionBar({ timeouts, onTimeout, onDRS, onSub, canTimeout, canDRS, canSub }) {
  const actions = [
    { key: 'timeout', icon: Icon.clock, label: 'Timeout', sub: `${timeouts.a}·${timeouts.b}`, onClick: onTimeout, enabled: canTimeout },
    { key: 'drs', icon: Icon.video, label: 'DRS', sub: 'Review', onClick: onDRS, enabled: canDRS },
    { key: 'sub', icon: Icon.swap, label: 'Sub', sub: 'Swap', onClick: onSub, enabled: canSub },
  ];
  
  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px 8px',
      borderTop: `1px solid ${THEME.border}`,
      background: THEME.surface,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
      }}>
        {actions.map(a => (
          <button key={a.key} onClick={a.onClick} disabled={!a.enabled} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 4px', borderRadius: 14,
            background: a.enabled ? THEME.surfaceAlt : THEME.surface,
            border: `1px solid ${THEME.border}`,
            cursor: a.enabled ? 'pointer' : 'not-allowed',
            opacity: a.enabled ? 1 : 0.5,
          }}>
            {a.icon(THEME.text, 18)}
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              fontWeight: 600, color: THEME.text, letterSpacing: -0.2,
            }}>{a.label}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              fontWeight: 600, color: THEME.textDim, letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}>{a.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// End Match Bar
// ─────────────────────────────────────────────────────────────
function EndMatchBar({ onEnd }) {
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
    if (drag > max * 0.75) { 
      setConfirmed(true); 
      setTimeout(() => { onEnd(); setConfirmed(false); setDrag(0); }, 400); 
    }
    else setDrag(0);
    startRef.current = null;
  };

  return (
    <div
      ref={barRef}
      style={{
        position: 'relative', height: 44, margin: '0 16px 14px',
        borderRadius: 999, background: THEME.surfaceAlt,
        border: `1px solid ${THEME.border}`,
        overflow: 'hidden', flexShrink: 0,
      }}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onEndDrag}
      onMouseLeave={onEndDrag}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onEndDrag}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: drag + 44, background: THEME.danger, opacity: 0.18,
        transition: startRef.current == null ? 'width 0.2s' : 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        fontWeight: 700, letterSpacing: 2, color: THEME.textMuted,
        textTransform: 'uppercase', pointerEvents: 'none',
      }}>
        {confirmed ? 'ENDING MATCH…' : '— SWIPE TO END MATCH →'}
      </div>
      <div
        onMouseDown={(e) => onStart(e.clientX)}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        style={{
          position: 'absolute', left: 2 + drag, top: 2,
          width: 40, height: 40, borderRadius: 999,
          background: THEME.danger,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', userSelect: 'none',
          transition: startRef.current == null ? 'left 0.2s' : 'none',
          boxShadow: `0 2px 8px ${THEME.danger}66`,
        }}
      >
        {Icon.arrow('#fff', 18)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function UmpireScoringModern() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allFixtureMatches, setAllFixtureMatches] = useState([]);
  
  // Match setup states
  const [setupStep, setSetupStep] = useState('games');
  const [gamesCount, setGamesCount] = useState(1);
  const [pointsPerGame, setPointsPerGame] = useState([11]);
  
  // Scoring states
  const [scores, setScores] = useState({});
  const [currentGame, setCurrentGame] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  
  // Serve states
  const [servingPlayer, setServingPlayer] = useState('player1');
  const [serveSequence, setServeSequence] = useState(0);
  const [teamServeCount, setTeamServeCount] = useState(0);

  // Substitution states
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionStep, setSubstitutionStep] = useState('team');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [substitutePlayer, setSubstitutePlayer] = useState('');

  // Timeout states
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutTeam, setTimeoutTeam] = useState(null);
  const [timeoutsUsed, setTimeoutsUsed] = useState({ team1: 0, team2: 0 });

  // DRS states
  const [showDRSModal, setShowDRSModal] = useState(false);
  const [drsStep, setDrsStep] = useState('team');
  const [drsTeam, setDrsTeam] = useState(null);
  const [drsReviewsLeft, setDrsReviewsLeft] = useState({ team1: 1, team2: 1 });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Flash states
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
        if (matchDoc.exists()) {
          const matchData = { id: matchDoc.id, ...matchDoc.data() };
          setMatch(matchData);
          
          const isMatchSetup = matchData.scores ||
                              matchData.status === 'live' ||
                              matchData.status === 'completed' ||
                              (matchData.gamesCount && matchData.pointsPerGame);
          
          if (isMatchSetup) {
            setSetupStep('scoring');
            setGamesCount(matchData.gamesCount || 1);
            setPointsPerGame(matchData.pointsPerGame || [11]);
            setServingPlayer(matchData.servingPlayer || 'player1');
            setServeSequence(matchData.serveSequence || 0);
            setTeamServeCount(matchData.teamServeCount || 0);
            
            const matchTimeoutsUsed = matchData.timeoutsUsed || { team1: 0, team2: 0 };
            setTimeoutsUsed(matchTimeoutsUsed);
            
            const matchDrsReviewsLeft = matchData.drsReviewsLeft || { team1: 1, team2: 1 };
            setDrsReviewsLeft(matchDrsReviewsLeft);
            
            if (matchData.scores) {
              setScores(matchData.scores);
            } else {
              initializeScores(matchData.gamesCount || 1, matchData.pointsPerGame || [11]);
            }
          } else {
            initializeScores(gamesCount, pointsPerGame);
          }

          const [teamsSnapshot, playersSnapshot, fixturesSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'teams'), where('tournamentId', '==', matchData.tournamentId))),
            getDocs(query(collection(db, 'players'), where('tournamentId', '==', matchData.tournamentId))),
            getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', matchData.tournamentId)))
          ]);

          const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const fixtureMatches = fixturesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(fixtureMatch =>
              fixtureMatch.tournamentId === matchData.tournamentId &&
              fixtureMatch.fixtureGroupId === matchData.fixtureGroupId &&
              fixtureMatch.id !== matchData.id
            );

          setTeams(teamsData);
          setPlayers(playersData);
          setAllFixtureMatches(fixtureMatches);
        } else {
          setError('Match not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load match details');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchData();
    }
  }, [matchId]);

  const initializeScores = (games, points) => {
    const initialScores = { player1: {}, player2: {} };
    for (let i = 0; i < games; i++) {
      initialScores.player1[`game${i + 1}`] = 0;
      initialScores.player2[`game${i + 1}`] = 0;
    }
    setScores(initialScores);
  };

  const handleGamesCountChange = (increment) => {
    const newCount = Math.max(1, Math.min(5, gamesCount + increment));
    setGamesCount(newCount);
    const newPoints = [...pointsPerGame];
    if (newCount > pointsPerGame.length) {
      for (let i = pointsPerGame.length; i < newCount; i++) {
        newPoints.push(11);
      }
    } else if (newCount < pointsPerGame.length) {
      newPoints.splice(newCount);
    }
    setPointsPerGame(newPoints);
  };

  const handlePointsChange = (gameIndex, points) => {
    const newPoints = [...pointsPerGame];
    newPoints[gameIndex] = Math.max(1, Math.min(21, points));
    setPointsPerGame(newPoints);
  };

  const handleSetupComplete = async () => {
    initializeScores(gamesCount, pointsPerGame);
    setSetupStep('scoring');
    
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'live',
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        teamServeCount,
        startedAt: serverTimestamp()
      });
      // Clutch API recording removed
    } catch (error) {
      console.error('Error setting match to live:', error);
    }
  };

  const updateScore = async (player, gameIndex, increment) => {
    const gameKey = `game${gameIndex + 1}`;
    const currentScore = scores[player][gameKey];
    const newScore = Math.max(0, currentScore + increment);
    
    const newScores = {
      ...scores,
      [player]: { ...scores[player], [gameKey]: newScore }
    };
    
    setScores(newScores);
    
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        scores: newScores,
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        teamServeCount,
        status: 'live',
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating scores:', error);
      setError('Failed to save scores');
    }
  };

  const getPlayerName = (playerKey) => {
    if (!match) return 'Player';
    if (playerKey === 'player1') {
      return match.player1Team1 || match.team1Name || 'Player 1';
    } else {
      return match.player1Team2 || match.team2Name || 'Player 2';
    }
  };

  const getPartnerName = (playerKey) => {
    if (!match) return null;
    if (playerKey === 'player1') {
      return match.player2Team1 || null;
    } else {
      return match.player2Team2 || null;
    }
  };

  const isDoublesMatch = () => {
    return match && (match.player2Team1 || match.player2Team2);
  };

  const handleServeChange = async () => {
    let newServingPlayer = servingPlayer;
    let newTeamServeCount = teamServeCount;
    let newServeSequence = serveSequence;

    if (isDoublesMatch()) {
      if (teamServeCount === 0) {
        newTeamServeCount = 1;
        setTeamServeCount(1);
      } else {
        newServingPlayer = servingPlayer === 'player1' ? 'player2' : 'player1';
        newTeamServeCount = 0;
        newServeSequence = 0;
        setServingPlayer(newServingPlayer);
        setTeamServeCount(0);
        setServeSequence(0);
      }
    } else {
      newServingPlayer = servingPlayer === 'player1' ? 'player2' : 'player1';
      newServeSequence = 0;
      setServingPlayer(newServingPlayer);
      setServeSequence(0);
    }

    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        servingPlayer: newServingPlayer,
        serveSequence: newServeSequence,
        teamServeCount: newTeamServeCount,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating serve state:', error);
      setError('Failed to update serve state');
    }
  };

  const calculateMatchWinner = () => {
    if (!scores || !scores.player1 || !scores.player2) return null;
    
    let player1GamesWon = 0;
    let player2GamesWon = 0;
    
    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      const player1Score = scores.player1[gameKey] || 0;
      const player2Score = scores.player2[gameKey] || 0;
      
      if (player1Score > player2Score) {
        player1GamesWon++;
      } else if (player2Score > player1Score) {
        player2GamesWon++;
      }
    }
    
    if (player1GamesWon > player2GamesWon) {
      return {
        winner: 'player1',
        winnerName: getPlayerName('player1'),
        winnerTeam: match.team1Name || 'Team 1',
        finalScore: `${player1GamesWon}-${player2GamesWon}`,
        gamesWon: { player1: player1GamesWon, player2: player2GamesWon }
      };
    } else if (player2GamesWon > player1GamesWon) {
      return {
        winner: 'player2',
        winnerName: getPlayerName('player2'),
        winnerTeam: match.team2Name || 'Team 2',
        finalScore: `${player2GamesWon}-${player1GamesWon}`,
        gamesWon: { player1: player1GamesWon, player2: player2GamesWon }
      };
    }
    
    return {
      winner: 'tie',
      winnerName: 'Tie',
      winnerTeam: 'Tie',
      finalScore: `${player1GamesWon}-${player2GamesWon}`,
      gamesWon: { player1: player1GamesWon, player2: player2GamesWon }
    };
  };

  const handleEndMatch = async () => {
    try {
      const matchResult = calculateMatchWinner();
      
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'completed',
        scores,
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        completedAt: serverTimestamp(),
        endedAt: serverTimestamp(),
        winner: matchResult?.winner || null,
        winnerName: matchResult?.winnerName || null,
        winnerTeam: matchResult?.winnerTeam || null,
        finalScore: matchResult?.finalScore || null,
        gamesWon: matchResult?.gamesWon || null
      });
      
      // Clutch API recording removed
      setMatchEnded(true);
    } catch (error) {
      console.error('Error ending match:', error);
      setError('Failed to end match');
    }
  };

  const handleTimeoutClick = () => {
    setShowTimeoutModal(true);
    setTimeoutTeam(null);
  };

  const handleTimeoutTeamSelection = async (team) => {
    setTimeoutTeam(team);
    
    try {
      const currentTimeoutsUsed = match.timeoutsUsed || { team1: 0, team2: 0 };
      await updateDoc(doc(db, 'fixtures', matchId), {
        timeoutsUsed: { ...currentTimeoutsUsed, [team]: 1 },
        timeoutInProgress: {
          team: team,
          startTime: serverTimestamp(),
          duration: 90000
        }
      });
      
      setTimeoutsUsed(prev => ({ ...prev, [team]: 1 }));
      setShowTimeoutModal(false);
      
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'fixtures', matchId), { timeoutInProgress: null });
        } catch (error) {
          console.error('Error ending timeout:', error);
        }
      }, 90000);
    } catch (error) {
      console.error('Error starting timeout:', error);
      alert('Error starting timeout: ' + error.message);
    }
  };

  const canTeamTakeTimeout = (team) => {
    return timeoutsUsed[team] === 0;
  };

  const handleSubstitutionClick = () => {
    setShowSubstitutionModal(true);
    setSubstitutionStep('team');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSubstitutePlayer('');
  };

  const canTeamMakeSubstitution = (team) => {
    if (!match) return false;
    const teamId = team === 'team1' ? match.team1 : match.team2;
    return !hasTeamMadeSubstitutionsInFixture(teamId);
  };

  const canTeamRequestDRS = (team) => {
    return drsReviewsLeft[team] > 0;
  };

  const handleDRSClick = () => {
    setDrsStep('team');
    setDrsTeam(null);
    setShowDRSModal(true);
  };

  const handleDRSTeamSelection = async (team) => {
    setDrsTeam(team);
    setDrsStep('outcome');
    await playVideoOnMainDisplay();
  };

  const playVideoOnMainDisplay = async () => {
    if (!match?.tournamentId || !match?.date) return;
    
    try {
      const team1Name = match.team1Name || 'Team 1';
      const team2Name = match.team2Name || 'Team 2';
      const team1Id = match.team1;
      const team2Id = match.team2;
      const drsTeamName = drsTeam === 'team1' ? team1Name : team2Name;
      
      await updateDoc(doc(db, 'fixtures', matchId), {
        drsVideoActive: true,
        drsVideoUrl: 'drs_pending',
        drsTeam: drsTeam,
        drsTeamName: drsTeamName,
        team1Name: team1Name,
        team2Name: team2Name,
        team1Id: team1Id,
        team2Id: team2Id,
        drsStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setIsVideoPlaying(true);
    } catch (error) {
      console.error('Error starting DRS pending screen:', error);
      setError('Failed to start DRS pending screen');
    }
  };

  const handleDRSOutcome = async (successful) => {
    if (!drsTeam) return;
    
    try {
      stopVideoOnMainDisplay();
      
      if (!successful) {
        setDrsReviewsLeft(prev => ({
          ...prev,
          [drsTeam]: Math.max(0, prev[drsTeam] - 1)
        }));
      }
      
      const updatedMatch = {
        ...match,
        drsReviewsLeft: successful ? drsReviewsLeft : {
          ...drsReviewsLeft,
          [drsTeam]: Math.max(0, drsReviewsLeft[drsTeam] - 1)
        },
        drsHistory: [
          ...(match.drsHistory || []),
          {
            team: drsTeam,
            successful,
            timestamp: new Date(),
            game: currentGame + 1
          }
        ]
      };
      
      await updateDoc(doc(db, 'fixtures', matchId), {
        drsReviewsLeft: updatedMatch.drsReviewsLeft,
        drsHistory: updatedMatch.drsHistory,
        updatedAt: serverTimestamp()
      });
      
      setMatch(updatedMatch);
    } catch (error) {
      console.error('Error updating DRS data:', error);
      setError('Failed to update DRS data');
    }
    
    closeDRSModal();
  };

  const stopVideoOnMainDisplay = async () => {
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        drsVideoActive: false,
        drsVideoUrl: null,
        drsEndedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setIsVideoPlaying(false);
    } catch (error) {
      console.error('Error stopping DRS pending screen:', error);
      setError('Failed to stop DRS pending screen');
    }
  };

  const closeDRSModal = () => {
    setShowDRSModal(false);
    setDrsStep('team');
    setDrsTeam(null);
    if (isVideoPlaying) {
      stopVideoOnMainDisplay();
    }
  };

  const handleTeamSelection = (team) => {
    setSelectedTeam(team);
    setSubstitutionStep('player');
  };

  const handlePlayerSelection = (player) => {
    setSelectedPlayer(player);
    setSubstitutionStep('substitute');
  };

  const handleSubstitution = async () => {
    if (!selectedTeam || !selectedPlayer || !substitutePlayer) {
      setError('Please complete all substitution fields');
      return;
    }

    try {
      const updates = {};
      
      if (selectedTeam === 'team1') {
        if (selectedPlayer === match.player1Team1) {
          updates.player1Team1 = substitutePlayer;
        } else if (selectedPlayer === match.player2Team1) {
          updates.player2Team1 = substitutePlayer;
        }
      } else if (selectedTeam === 'team2') {
        if (selectedPlayer === match.player1Team2) {
          updates.player1Team2 = substitutePlayer;
        } else if (selectedPlayer === match.player2Team2) {
          updates.player2Team2 = substitutePlayer;
        }
      }

      if (Object.keys(updates).length === 0) {
        console.error('No matching player found for substitution');
        setError('Player not found in the match');
        return;
      }

      const substitutionRecord = {
        timestamp: new Date().toISOString(),
        team: selectedTeam,
        playerOut: selectedPlayer,
        playerIn: substitutePlayer,
        game: currentGame + 1
      };

      const currentSubstitutions = match.substitutions || [];
      updates.substitutions = [...currentSubstitutions, substitutionRecord];

      await updateDoc(doc(db, 'fixtures', matchId), updates);
      
      const timeoutUpdates = {
        timeoutInProgress: {
          team: selectedTeam,
          startTime: serverTimestamp(),
          duration: 60000,
          type: 'substitution'
        }
      };
      
      await updateDoc(doc(db, 'fixtures', matchId), timeoutUpdates);
      
      setMatch(prev => ({ ...prev, ...updates }));
      setShowSubstitutionModal(false);
      setSubstitutionStep('team');
      setSelectedTeam(null);
      setSelectedPlayer(null);
      setSubstitutePlayer('');
    } catch (error) {
      console.error('Error making substitution:', error);
      setError(`Failed to make substitution: ${error.message}`);
    }
  };

  const closeSubstitutionModal = () => {
    setShowSubstitutionModal(false);
    setSubstitutionStep('team');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSubstitutePlayer('');
  };

  const getTeamPlayers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name, age: player.age, gender: player.gender } : null;
    }).filter(Boolean);
  };

  const getCurrentlyPlayingPlayers = (team) => {
    if (!match) return [];
    
    const players = [];
    if (team === 'team1') {
      if (match.player1Team1) players.push(match.player1Team1);
      if (match.player2Team1) players.push(match.player2Team1);
    } else if (team === 'team2') {
      if (match.player1Team2) players.push(match.player1Team2);
      if (match.player2Team2) players.push(match.player2Team2);
    }
    return players;
  };

  const getPlayerGender = (playerName) => {
    const player = players.find(p => p.name === playerName);
    return player?.gender || null;
  };

  const isPlayerInOtherMatches = (playerName) => {
    let matchCount = 0;
    
    allFixtureMatches.forEach(fixtureMatch => {
      const playersInMatch = [
        fixtureMatch.player1Team1,
        fixtureMatch.player2Team1,
        fixtureMatch.player1Team2,
        fixtureMatch.player2Team2
      ].filter(Boolean);
      
      if (playersInMatch.includes(playerName)) {
        matchCount++;
      }
    });
    
    return matchCount >= 2;
  };

  const isPlayerInSameMatchType = (playerName, matchType) => {
    return allFixtureMatches.some(fixtureMatch => {
      if (fixtureMatch.matchType !== matchType) return false;
      
      const playersInMatch = [
        fixtureMatch.player1Team1,
        fixtureMatch.player2Team1,
        fixtureMatch.player1Team2,
        fixtureMatch.player2Team2
      ].filter(Boolean);
      
      return playersInMatch.includes(playerName);
    });
  };

  const hasTeamMadeSubstitutionsInFixture = (teamId) => {
    return allFixtureMatches.some(fixtureMatch => {
      const isTeamInMatch = fixtureMatch.team1 === teamId || fixtureMatch.team2 === teamId;
      const hasSubstitutions = fixtureMatch.substitutions && fixtureMatch.substitutions.length > 0;
      
      if (isTeamInMatch && hasSubstitutions) {
        return fixtureMatch.substitutions.some(sub => {
          const subTeamId = sub.team === 'team1' ? fixtureMatch.team1 : fixtureMatch.team2;
          return subTeamId === teamId;
        });
      }
      
      return false;
    });
  };

  const getAvailablePlayersForSubstitution = (team) => {
    if (!match) return [];
    
    const teamId = team === 'team1' ? match.team1 : match.team2;
    const allTeamPlayers = getTeamPlayers(teamId);
    const currentlyPlaying = getCurrentlyPlayingPlayers(team);
    
    return allTeamPlayers.filter(player => {
      if (currentlyPlaying.includes(player.name)) return false;
      if (selectedPlayer && player.name === selectedPlayer) return false;
      if (isPlayerInOtherMatches(player.name)) return false;
      
      if (match.matchType === 'mensDoubles' && isPlayerInSameMatchType(player.name, 'mensDoubles')) {
        return false;
      }
      
      const playerGender = getPlayerGender(player.name);
      
      if (match.matchType === 'mensDoubles' || match.matchType === 'mensSingles') {
        return playerGender === 'Male';
      } else if (match.matchType === 'womensDoubles' || match.matchType === 'womensSingles') {
        return playerGender === 'Female';
      } else if (match.matchType === 'mixedDoubles') {
        if (!selectedPlayer) return true;
        const selectedPlayerGender = getPlayerGender(selectedPlayer);
        return playerGender === selectedPlayerGender;
      }
      
      return true;
    });
  };

  const isPlayerSubstitutedIn = (playerName) => {
    if (!match || !match.substitutions) return false;
    return match.substitutions.some(sub => sub.playerIn === playerName);
  };

  const plusTeam = (team) => {
    const next = { ...scores };
    next[team.toLowerCase()] = (scores[team.toLowerCase()][`game${currentGame + 1}`] || 0) + 1;
    if (team === 'A') { setFlashA(true); setTimeout(() => setFlashA(false), 200); }
    else { setFlashB(true); setTimeout(() => setFlashB(false), 200); }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
          color: THEME.textMuted, letterSpacing: 1,
        }}>Loading...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: THEME.surface, padding: 24, borderRadius: 16,
          border: `1px solid ${THEME.danger}`,
          fontFamily: "'Space Grotesk', sans-serif", color: THEME.danger,
        }}>
          {error || 'Match not found'}
        </div>
      </div>
    );
  }

  if (matchEnded) {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: THEME.surface, padding: 32, borderRadius: 16,
          border: `1px solid ${THEME.accent}`, textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 32,
            fontWeight: 700, color: THEME.text, marginBottom: 16,
          }}>Match Completed!</h2>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
            color: THEME.textMuted,
          }}>Scores have been saved successfully.</p>
        </div>
      </div>
    );
  }

  if (setupStep === 'games') {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg, padding: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: THEME.surface, padding: 32, borderRadius: 16,
          border: `1px solid ${THEME.border}`, maxWidth: 400, width: '100%',
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
            fontWeight: 700, color: THEME.text, marginBottom: 24, textAlign: 'center',
          }}>Match Setup</h2>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
            color: THEME.textMuted, marginBottom: 24, textAlign: 'center',
          }}>How many games will this match consist of?</p>
          
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24, marginBottom: 32,
          }}>
            <button 
              onClick={() => handleGamesCountChange(-1)}
              disabled={gamesCount <= 1}
              style={{
                width: 48, height: 48, borderRadius: 999,
                background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                color: THEME.text, fontSize: 24, cursor: 'pointer',
                opacity: gamesCount <= 1 ? 0.5 : 1,
              }}
            >-</button>
            
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 64,
              fontWeight: 700, color: THEME.accent,
            }}>{gamesCount}</div>
            
            <button 
              onClick={() => handleGamesCountChange(1)}
              disabled={gamesCount >= 5}
              style={{
                width: 48, height: 48, borderRadius: 999,
                background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                color: THEME.text, fontSize: 24, cursor: 'pointer',
                opacity: gamesCount >= 5 ? 0.5 : 1,
              }}
            >+</button>
          </div>
          
          <button 
            onClick={() => setSetupStep('points')}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 12,
              background: THEME.accent, color: THEME.accentInk,
              border: 'none', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
              fontWeight: 600,
            }}
          >Next: Set Points per Game</button>
        </div>
      </div>
    );
  }

  if (setupStep === 'points') {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg, padding: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: THEME.surface, padding: 32, borderRadius: 16,
          border: `1px solid ${THEME.border}`, maxWidth: 400, width: '100%',
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
            fontWeight: 700, color: THEME.text, marginBottom: 24, textAlign: 'center',
          }}>Points per Game</h2>
          
          <div style={{ marginBottom: 24 }}>
            {pointsPerGame.map((points, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, display: 'block', marginBottom: 8,
                }}>Game {index + 1}</label>
                <input
                  type="number"
                  min="1"
                  max="21"
                  value={points}
                  onChange={(e) => handlePointsChange(index, parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                    color: THEME.text, fontSize: 20, textAlign: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>
            ))}
          </div>

          {match?.venueCourtId && (
            <div style={{
              background: THEME.surfaceAlt, padding: 12, borderRadius: 8,
              marginBottom: 24, border: `1px solid ${THEME.border}`,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: THEME.textDim, marginBottom: 8, textTransform: 'uppercase',
              }}>Match Details</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                color: THEME.text,
              }}>
                Court: {match.venueCourtId}
                {match.facilityId && ` · Facility: ${match.facilityId}`}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setSetupStep('games')}
              style={{
                flex: 1, padding: '12px 24px', borderRadius: 12,
                background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                color: THEME.text, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                fontWeight: 600,
              }}
            >Back</button>
            <button
              onClick={handleSetupComplete}
              style={{
                flex: 1, padding: '12px 24px', borderRadius: 12,
                background: THEME.accent, color: THEME.accentInk,
                border: 'none', cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                fontWeight: 600,
              }}
            >Start Scoring</button>
          </div>
        </div>
      </div>
    );
  }

  const playersA = isDoublesMatch()
    ? [getPlayerName('player1'), getPartnerName('player1')].filter(Boolean)
    : [getPlayerName('player1')];
  const playersB = isDoublesMatch()
    ? [getPlayerName('player2'), getPartnerName('player2')].filter(Boolean)
    : [getPlayerName('player2')];

  // Get player photos
  const getPlayerPhotos = (playerNames) => {
    const photos = {};
    playerNames.forEach(name => {
      const player = players.find(p => p.name === name);
      if (player?.photo) {
        photos[name] = player.photo;
      }
    });
    return photos;
  };

  const playerPhotosA = getPlayerPhotos(playersA);
  const playerPhotosB = getPlayerPhotos(playersB);

  const gameScores = Array.from({ length: gamesCount }, (_, i) => ({
    a: scores.player1?.[`game${i + 1}`] || 0,
    b: scores.player2?.[`game${i + 1}`] || 0,
    current: i === currentGame,
  }));

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: THEME.bg, color: THEME.text,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Space Grotesk', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Court stripe texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(135deg, ${THEME.text} 0 1px, transparent 1px 40px)`,
      }} />

      <TopBar game={currentGame + 1} clock={clockStr} matchInfo={match} />

      <TeamCard
        isA={true}
        players={playersA}
        score={scores.player1?.[`game${currentGame + 1}`] || 0}
        serving={servingPlayer === 'player1'}
        serveNumber={teamServeCount + 1}
        onScore={() => updateScore('player1', currentGame, 1)}
        onUndo={() => updateScore('player1', currentGame, -1)}
        matchType={isDoublesMatch() ? 'doubles' : 'singles'}
        flash={flashA}
        isSubstituted={isPlayerSubstitutedIn}
        playerPhotos={playerPhotosA}
      />

      <CenterDivider
        servingTeam={servingPlayer === 'player1' ? 'A' : 'B'}
        onToggleServe={handleServeChange}
        gameScores={gameScores}
      />

      <TeamCard
        isA={false}
        players={playersB}
        score={scores.player2?.[`game${currentGame + 1}`] || 0}
        serving={servingPlayer === 'player2'}
        serveNumber={teamServeCount + 1}
        onScore={() => updateScore('player2', currentGame, 1)}
        onUndo={() => updateScore('player2', currentGame, -1)}
        matchType={isDoublesMatch() ? 'doubles' : 'singles'}
        flash={flashB}
        isSubstituted={isPlayerSubstitutedIn}
        playerPhotos={playerPhotosB}
      />

      <ActionBar
        timeouts={{ a: timeoutsUsed.team1, b: timeoutsUsed.team2 }}
        onTimeout={handleTimeoutClick}
        onDRS={handleDRSClick}
        onSub={handleSubstitutionClick}
        canTimeout={canTeamTakeTimeout('team1') || canTeamTakeTimeout('team2')}
        canDRS={canTeamRequestDRS('team1') || canTeamRequestDRS('team2')}
        canSub={canTeamMakeSubstitution('team1') || canTeamMakeSubstitution('team2')}
      />

      <EndMatchBar onEnd={handleEndMatch} />

      {/* Timeout Modal */}
      {showTimeoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: THEME.surface, borderRadius: 20,
            border: `1px solid ${THEME.borderStrong}`,
            padding: 32, maxWidth: 400, width: '90%',
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
              fontWeight: 700, color: THEME.text, marginBottom: 8,
            }}>Request Timeout</h3>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              color: THEME.textMuted, marginBottom: 24,
            }}>Select which team is requesting the timeout</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => handleTimeoutTeamSelection('team1')}
                disabled={!canTeamTakeTimeout('team1')}
                style={{
                  padding: '16px 20px', borderRadius: 12,
                  background: canTeamTakeTimeout('team1') ? THEME.teamA : THEME.surfaceAlt,
                  border: `2px solid ${canTeamTakeTimeout('team1') ? THEME.teamA : THEME.border}`,
                  color: canTeamTakeTimeout('team1') ? '#fff' : THEME.textMuted,
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                  fontWeight: 600, cursor: canTeamTakeTimeout('team1') ? 'pointer' : 'not-allowed',
                  opacity: canTeamTakeTimeout('team1') ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>Team A · {match?.team1Name || 'Team 1'}</span>
                {!canTeamTakeTimeout('team1') && (
                  <span style={{ fontSize: 11, letterSpacing: 1 }}>USED</span>
                )}
              </button>
              
              <button
                onClick={() => handleTimeoutTeamSelection('team2')}
                disabled={!canTeamTakeTimeout('team2')}
                style={{
                  padding: '16px 20px', borderRadius: 12,
                  background: canTeamTakeTimeout('team2') ? THEME.teamB : THEME.surfaceAlt,
                  border: `2px solid ${canTeamTakeTimeout('team2') ? THEME.teamB : THEME.border}`,
                  color: canTeamTakeTimeout('team2') ? '#fff' : THEME.textMuted,
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                  fontWeight: 600, cursor: canTeamTakeTimeout('team2') ? 'pointer' : 'not-allowed',
                  opacity: canTeamTakeTimeout('team2') ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>Team B · {match?.team2Name || 'Team 2'}</span>
                {!canTeamTakeTimeout('team2') && (
                  <span style={{ fontSize: 11, letterSpacing: 1 }}>USED</span>
                )}
              </button>
            </div>
            
            <button
              onClick={() => setShowTimeoutModal(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                color: THEME.text, fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* DRS Modal */}
      {showDRSModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: THEME.surface, borderRadius: 20,
            border: `1px solid ${THEME.borderStrong}`,
            padding: 32, maxWidth: 400, width: '90%',
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            {drsStep === 'team' && (
              <>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
                  fontWeight: 700, color: THEME.text, marginBottom: 8,
                }}>DRS Review</h3>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, marginBottom: 24,
                }}>Select which team is requesting the review</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <button
                    onClick={() => handleDRSTeamSelection('team1')}
                    disabled={!canTeamRequestDRS('team1')}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: canTeamRequestDRS('team1') ? THEME.teamA : THEME.surfaceAlt,
                      border: `2px solid ${canTeamRequestDRS('team1') ? THEME.teamA : THEME.border}`,
                      color: canTeamRequestDRS('team1') ? '#fff' : THEME.textMuted,
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                      fontWeight: 600, cursor: canTeamRequestDRS('team1') ? 'pointer' : 'not-allowed',
                      opacity: canTeamRequestDRS('team1') ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>Team A · {match?.team1Name || 'Team 1'}</span>
                    <span style={{ fontSize: 11, letterSpacing: 1 }}>
                      {drsReviewsLeft.team1} LEFT
                    </span>
                  </button>
                  
                  <button
                    onClick={() => handleDRSTeamSelection('team2')}
                    disabled={!canTeamRequestDRS('team2')}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: canTeamRequestDRS('team2') ? THEME.teamB : THEME.surfaceAlt,
                      border: `2px solid ${canTeamRequestDRS('team2') ? THEME.teamB : THEME.border}`,
                      color: canTeamRequestDRS('team2') ? '#fff' : THEME.textMuted,
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                      fontWeight: 600, cursor: canTeamRequestDRS('team2') ? 'pointer' : 'not-allowed',
                      opacity: canTeamRequestDRS('team2') ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>Team B · {match?.team2Name || 'Team 2'}</span>
                    <span style={{ fontSize: 11, letterSpacing: 1 }}>
                      {drsReviewsLeft.team2} LEFT
                    </span>
                  </button>
                </div>
                
                <button
                  onClick={closeDRSModal}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                    color: THEME.text, fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancel</button>
              </>
            )}
            
            {drsStep === 'outcome' && (
              <>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
                  fontWeight: 700, color: THEME.text, marginBottom: 8,
                }}>Review Outcome</h3>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, marginBottom: 24,
                }}>Was the review successful?</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => handleDRSOutcome(true)}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: THEME.accent, border: 'none',
                      color: THEME.accentInk, fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 16, fontWeight: 600, cursor: 'pointer',
                    }}
                  >✓ Successful (Review Retained)</button>
                  
                  <button
                    onClick={() => handleDRSOutcome(false)}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: THEME.danger, border: 'none',
                      color: '#fff', fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 16, fontWeight: 600, cursor: 'pointer',
                    }}
                  >✗ Unsuccessful (Review Lost)</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Substitution Modal */}
      {showSubstitutionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(8px)',
          overflowY: 'auto',
        }}>
          <div style={{
            background: THEME.surface, borderRadius: 20,
            border: `1px solid ${THEME.borderStrong}`,
            padding: 32, maxWidth: 400, width: '90%',
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
            margin: '20px 0',
          }}>
            {substitutionStep === 'team' && (
              <>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
                  fontWeight: 700, color: THEME.text, marginBottom: 8,
                }}>Player Substitution</h3>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, marginBottom: 24,
                }}>Select which team is making the substitution</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <button
                    onClick={() => handleTeamSelection('team1')}
                    disabled={!canTeamMakeSubstitution('team1')}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: canTeamMakeSubstitution('team1') ? THEME.teamA : THEME.surfaceAlt,
                      border: `2px solid ${canTeamMakeSubstitution('team1') ? THEME.teamA : THEME.border}`,
                      color: canTeamMakeSubstitution('team1') ? '#fff' : THEME.textMuted,
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                      fontWeight: 600, cursor: canTeamMakeSubstitution('team1') ? 'pointer' : 'not-allowed',
                      opacity: canTeamMakeSubstitution('team1') ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>Team A · {match?.team1Name || 'Team 1'}</span>
                    {!canTeamMakeSubstitution('team1') && (
                      <span style={{ fontSize: 11, letterSpacing: 1 }}>USED</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleTeamSelection('team2')}
                    disabled={!canTeamMakeSubstitution('team2')}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: canTeamMakeSubstitution('team2') ? THEME.teamB : THEME.surfaceAlt,
                      border: `2px solid ${canTeamMakeSubstitution('team2') ? THEME.teamB : THEME.border}`,
                      color: canTeamMakeSubstitution('team2') ? '#fff' : THEME.textMuted,
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                      fontWeight: 600, cursor: canTeamMakeSubstitution('team2') ? 'pointer' : 'not-allowed',
                      opacity: canTeamMakeSubstitution('team2') ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>Team B · {match?.team2Name || 'Team 2'}</span>
                    {!canTeamMakeSubstitution('team2') && (
                      <span style={{ fontSize: 11, letterSpacing: 1 }}>USED</span>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={closeSubstitutionModal}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                    color: THEME.text, fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancel</button>
              </>
            )}
            
            {substitutionStep === 'player' && (
              <>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
                  fontWeight: 700, color: THEME.text, marginBottom: 8,
                }}>Select Player Out</h3>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, marginBottom: 24,
                }}>Choose the player to be substituted</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {getCurrentlyPlayingPlayers(selectedTeam).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlayerSelection(player)}
                      style={{
                        padding: '16px 20px', borderRadius: 12,
                        background: THEME.surfaceAlt,
                        border: `2px solid ${THEME.border}`,
                        color: THEME.text,
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                        fontWeight: 600, cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >{player}</button>
                  ))}
                </div>
                
                <button
                  onClick={() => setSubstitutionStep('team')}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                    color: THEME.text, fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Back</button>
              </>
            )}
            
            {substitutionStep === 'substitute' && (
              <>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 24,
                  fontWeight: 700, color: THEME.text, marginBottom: 8,
                }}>Select Substitute</h3>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: THEME.textMuted, marginBottom: 8,
                }}>Replacing: <strong>{selectedPlayer}</strong></p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: THEME.textDim, marginBottom: 24,
                }}>Choose the substitute player</p>
                
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: 12, 
                  marginBottom: 24, maxHeight: 300, overflowY: 'auto',
                }}>
                  {getAvailablePlayersForSubstitution(selectedTeam).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSubstitutePlayer(player.name);
                        handleSubstitution();
                      }}
                      style={{
                        padding: '16px 20px', borderRadius: 12,
                        background: THEME.surfaceAlt,
                        border: `2px solid ${THEME.border}`,
                        color: THEME.text,
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
                        fontWeight: 600, cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {player.name}
                      <span style={{
                        fontSize: 11, color: THEME.textMuted,
                        marginLeft: 8, letterSpacing: 0.5,
                      }}>
                        {player.gender} · {player.age}y
                      </span>
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setSubstitutionStep('player')}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`,
                    color: THEME.text, fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Back</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
