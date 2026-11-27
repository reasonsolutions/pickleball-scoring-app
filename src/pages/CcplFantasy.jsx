import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLTopBar from '../components/CCPLTopBar';
import {
  FANTASY_BUDGET, FANTASY_SQUAD, MAX_MEN, MAX_PER_TEAM, LEADERBOARD_MIN_TEAMS,
  getStoredUser, getActiveTournamentId, getFixtures, gameweeksFromFixtures, gameweekDeadline,
  getTournamentTeams, getFantasyPlayers, gameweekPointsFor, playerGameweekPoints, CAPTAIN_MULTIPLIER, VICE_CAPTAIN_MULTIPLIER, addBlockReason, squadError,
  getMyTeam, createTeam, updateTeam, getAllTeams, getUserNames,
  loginCcplUser, AUTH_EVENT, startSignup, resendSignupOtp, completeSignup,
} from '../utils/fantasyService';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const LINE = 'rgba(11,11,12,.12)';
const ZUUME = "'Zuume Cut', sans-serif";

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

function useIsMobile(bp = 900) {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const on = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return m;
}

function Countdown({ deadline }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return <span>No fixtures scheduled</span>;
  const diff = deadline.getTime() - now;
  if (diff <= 0) return <span>Deadline passed</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return <span>{d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`}</span>;
}

function Avatar({ player, size = 48 }) {
  const [err, setErr] = useState(false);
  const style = { width: size, height: size, flex: 'none', borderRadius: '50%', objectFit: 'cover', background: '#ddd8cc' };
  if (player.photo && !err) return <img src={player.photo} alt="" style={style} onError={() => setErr(true)} loading="lazy" />;
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.34, color: MUTED }}>
      {initials(player.name)}
    </div>
  );
}

function Badge({ children, bg, color = '#fff' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: bg, color, fontSize: 11, fontWeight: 800, letterSpacing: '.02em' }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,11,12,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, borderTop: `6px solid ${ORANGE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' }}>
          <h3 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 36, lineHeight: 1, textTransform: 'uppercase' }}>{title}</h3>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'transparent', fontSize: 28, lineHeight: 1, cursor: 'pointer', color: MUTED }}>×</button>
          )}
        </div>
        <div style={{ padding: '0 24px 16px', overflowY: 'auto' }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${LINE}`, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', type = 'button', style }) {
  const base = {
    border: 0, cursor: disabled ? 'not-allowed' : 'pointer', padding: '12px 22px', fontFamily: "'Montserrat', sans-serif",
    fontWeight: 800, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', opacity: disabled ? 0.45 : 1,
    transition: 'background .2s ease, color .2s ease',
  };
  const v = variant === 'primary' ? { background: ORANGE, color: INK }
    : variant === 'dark' ? { background: INK, color: '#fff' }
      : { background: 'transparent', color: INK, boxShadow: `inset 0 0 0 2px ${INK}` };
  return <button type={type} onClick={onClick} disabled={disabled} className="cf-btn" style={{ ...base, ...v, ...style }}>{children}</button>;
}

// Captain / vice-captain picker used for both first save and later changes
function CaptainPicker({ players, captain, vice, setCaptain, setVice }) {
  const Row = ({ label, hint, value, onPick, other }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{hint}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {players.map((p) => {
          const active = value === p.id;
          const taken = other === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={taken}
              onClick={() => onPick(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: 8, textAlign: 'left', cursor: taken ? 'not-allowed' : 'pointer',
                border: 0, background: active ? INK : '#fff', color: active ? '#fff' : INK, opacity: taken ? 0.35 : 1,
                boxShadow: active ? `inset 0 0 0 2px ${ORANGE}` : `inset 0 0 0 1px ${LINE}`,
              }}
            >
              <Avatar player={p} size={28} />
              <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <>
      <Row label="Captain" hint="Captain earns 2x points" value={captain} onPick={setCaptain} other={vice} />
      <Row label="Vice-captain" hint="Vice-captain earns 1.5x points" value={vice} onPick={setVice} other={captain} />
    </>
  );
}

// Read-only view of a leaderboard team's squads and scoring for past gameweeks.
// Other managers' picks only show once that gameweek's deadline has passed.
function TeamHistoryModal({ row, team, gameweeks, fixtures, playersById, now, onClose }) {
  const visible = useMemo(() => gameweeks
    .filter((g) => {
      const saved = team?.gameweeks?.[g.gameweekNumber];
      if (!saved?.playerIds?.length) return false;
      if (row.isMe) return true;
      const dl = gameweekDeadline(fixtures, g.date);
      return !!dl && dl.getTime() <= now;
    })
    .sort((a, b) => b.gameweekNumber - a.gameweekNumber), [gameweeks, team, fixtures, now, row.isMe]);

  const [sel, setSel] = useState(visible[0]?.gameweekNumber ?? null);
  const g = visible.find((x) => x.gameweekNumber === sel);
  const saved = g ? team.gameweeks[g.gameweekNumber] : null;
  const date = saved?.gameweekDate || g?.date;

  const rows = (saved?.playerIds || [])
    .map((id) => {
      const p = playersById[id];
      if (!p) return null;
      const base = p.pointsByDate?.[date] || 0;
      const pts = playerGameweekPoints(id, playersById, date, saved.captainId, saved.viceCaptainId);
      return { p, base, pts, isC: saved.captainId === id, isV: saved.viceCaptainId === id };
    })
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts);
  const gwTotal = rows.reduce((s, r) => s + r.pts, 0);

  return (
    <Modal title={row.team} onClose={onClose}>
      <div style={{ fontSize: 13, color: MUTED, fontWeight: 600, marginTop: -4, marginBottom: 16 }}>
        {row.owner} · {row.pts} total pts
      </div>
      {visible.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No completed gameweeks to show yet. Squads are revealed once a gameweek locks.</p>
      ) : (
        <>
          <div className="cf-rail" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16 }}>
            {visible.map((x) => {
              const active = x.gameweekNumber === sel;
              return (
                <button
                  key={x.gameweekNumber}
                  type="button"
                  onClick={() => setSel(x.gameweekNumber)}
                  style={{ flex: 'none', border: 0, cursor: 'pointer', padding: '8px 12px', textAlign: 'left', background: active ? INK : '#fff', color: active ? '#fff' : INK, boxShadow: active ? 'none' : `inset 0 0 0 1px ${LINE}` }}
                >
                  <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 20, lineHeight: 1 }}>GW{x.gameweekNumber}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, whiteSpace: 'nowrap' }}>{fmtDate(x.date)}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>GW{sel} squad</span>
            <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 32, lineHeight: 1, color: ORANGE }}>{gwTotal} pts</span>
          </div>
          <div style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${LINE}` }}>
            {rows.map((r, i) => (
              <div key={r.p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: i ? `1px solid ${LINE}` : 0 }}>
                <Avatar player={r.p} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p.name}</span>
                    {r.isC && <Badge bg={ORANGE} color={INK}>C</Badge>}
                    {r.isV && <Badge bg={INK}>VC</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.p.teamId || '—'}{r.isC || r.isV ? ` · ${r.base} × ${r.isC ? CAPTAIN_MULTIPLIER : VICE_CAPTAIN_MULTIPLIER}` : ''}
                  </div>
                </div>
                <span style={{ fontWeight: 900, fontSize: 16, flex: 'none' }}>{r.pts}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' };
const KNOWN_ERR = /^(No account|Incorrect|This account|This number|Could not send|That code)/;

function PasswordInput({ value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input className="cf-input" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} style={{ paddingRight: 64 }} />
      <button type="button" onClick={() => setShow((v) => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: MUTED }}>
        {show ? 'HIDE' : 'SHOW'}
      </button>
    </div>
  );
}

// Log in / sign up pop-up backed by ccpl-users (same accounts as the CCPL app)
function AuthModal({ onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [step, setStep] = useState('form');      // 'form' | 'otp' (signup only)
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [remember, setRemember] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [pending, setPending] = useState(null); // { userId, otp, phone }
  const [resendIn, setResendIn] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const switchMode = (m) => { setMode(m); setStep('form'); setErr(''); };

  const fail = (ex) => {
    const known = KNOWN_ERR.test(ex?.message || '');
    if (!known) console.error('[CcplFantasy] auth', ex);
    setErr(known ? ex.message : 'Something went wrong. Please try again.');
    setBusy(false);
  };

  const submitLogin = async () => {
    if (!identifier.trim() || !password) { setErr('Enter your phone number (or email) and password.'); return; }
    setBusy(true); setErr('');
    try {
      onSuccess(await loginCcplUser(identifier, password, remember));
    } catch (ex) { fail(ex); }
  };

  const submitSignup = async () => {
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) { setErr('Enter your full name.'); return; }
    if (digits.length !== 10) { setErr('Enter a valid 10-digit phone number.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email address.'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (!agree) { setErr('Please accept the terms to continue.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await startSignup({ name: name.trim(), phone: digits, email: email.trim().toLowerCase(), password });
      setPending(res);
      setOtpInput('');
      setStep('otp');
      setResendIn(30);
      setBusy(false);
    } catch (ex) { fail(ex); }
  };

  const submitOtp = async () => {
    if (otpInput.length !== 4) { setErr('Enter the 4-digit code.'); return; }
    if (otpInput !== pending.otp) { setErr('That code doesn’t match. Check WhatsApp and try again.'); return; }
    setBusy(true); setErr('');
    try {
      onSuccess(await completeSignup({ userId: pending.userId, name: name.trim(), phone: pending.phone, email: email.trim().toLowerCase() }, remember), true);
    } catch (ex) { fail(ex); }
  };

  const resend = async () => {
    setBusy(true); setErr('');
    try {
      const otp = await resendSignupOtp(pending.userId, pending.phone);
      setPending({ ...pending, otp });
      setResendIn(30);
      setBusy(false);
    } catch (ex) { fail(ex); }
  };

  const submit = (e) => {
    e?.preventDefault();
    if (busy) return;
    if (mode === 'login') submitLogin();
    else if (step === 'form') submitSignup();
    else submitOtp();
  };

  const primaryLabel = mode === 'login'
    ? (busy ? 'Logging in…' : 'Log in')
    : step === 'form' ? (busy ? 'Sending code…' : 'Send code') : (busy ? 'Verifying…' : 'Verify');

  const title = mode === 'login' ? 'Log in' : step === 'otp' ? 'Verify phone' : 'Sign up';

  return (
    <Modal
      title={title}
      onClose={busy ? undefined : onClose}
      footer={(
        <>
          {step === 'otp'
            ? <Btn variant="ghost" onClick={() => { setStep('form'); setErr(''); }} disabled={busy}>Back</Btn>
            : <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>}
          <Btn onClick={submit} disabled={busy}>{primaryLabel}</Btn>
        </>
      )}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {step === 'form' && (
          <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', boxShadow: `inset 0 0 0 2px ${INK}` }}>
            {[['login', 'Log in'], ['signup', 'Sign up']].map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={mode === k}
                onClick={() => switchMode(k)}
                style={{ border: 0, cursor: 'pointer', padding: '10px 8px', background: mode === k ? INK : 'transparent', color: mode === k ? '#fff' : INK, fontWeight: 800, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {mode === 'login' && (
          <>
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>Use the same details as the CCPL app.</p>
            <label style={fieldLabel}>
              Phone number or email
              <input className="cf-input" autoFocus autoComplete="username" placeholder="98765 43210" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </label>
            <label style={fieldLabel}>
              Password
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          </>
        )}

        {mode === 'signup' && step === 'form' && (
          <>
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>One account for the website and the CCPL app. We&apos;ll send a code to your WhatsApp.</p>
            <label style={fieldLabel}>
              Full name
              <input className="cf-input" autoFocus autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label style={fieldLabel}>
              WhatsApp number
              <div style={{ display: 'flex' }}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: '#e6e2d8', fontWeight: 700, fontSize: 14, letterSpacing: 0 }}>+91</span>
                <input className="cf-input" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </div>
            </label>
            <label style={fieldLabel}>
              Email
              <input className="cf-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label style={fieldLabel}>
              Password
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <span style={{ fontWeight: 600, letterSpacing: 0, textTransform: 'none', color: MUTED }}>At least 6 characters</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ accentColor: ORANGE, width: 16, height: 16, marginTop: 2 }} />
              I agree to the CCPL terms and privacy policy
            </label>
          </>
        )}

        {mode === 'signup' && step === 'otp' && (
          <>
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>
              Enter the 4-digit code we sent on WhatsApp to <strong style={{ color: INK }}>+91 {pending?.phone}</strong>.
            </p>
            <input
              className="cf-input"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="4-digit code"
              maxLength={4}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ fontSize: 28, letterSpacing: '.6em', textAlign: 'center', fontWeight: 800 }}
            />
            <div style={{ fontSize: 13, color: MUTED }}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : (
                <button type="button" onClick={resend} disabled={busy} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', color: ORANGE, fontWeight: 800, fontSize: 13 }}>Resend code</button>
              )}
            </div>
          </>
        )}

        {step === 'form' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: ORANGE, width: 16, height: 16 }} />
            Keep me logged in
          </label>
        )}
        {err && <div role="alert" style={{ background: '#fbe3e0', color: '#b3261a', padding: '10px 12px', fontSize: 14, fontWeight: 700 }}>{err}</div>}
        <button type="submit" hidden aria-hidden="true" />
        {mode === 'login' && <div style={{ fontSize: 13, color: MUTED }}>Forgot your password? Reset it in the CCPL app.</div>}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Scoring rules (mirrors calculateFantasyPoints in src/pages/Fantasy.jsx)
// ---------------------------------------------------------------------------
const SCORING_SECTIONS = [
  {
    title: 'Every match',
    note: 'Doubles partners both earn the full points for their side.',
    rows: [
      ['Playing the match', '+2'],
      ['Each point your side wins', '+1 per point'],
      ['Winning the match', '+2'],
      ['Losing the match', '−1'],
    ],
  },
  {
    title: 'Winning margin',
    note: 'Winners only. Margin is the total point difference across all games.',
    rows: [
      ['Win by 4', '+1'],
      ['Win by 5–8', '+2'],
      ['Win by 9–12', '+3'],
      ['Win by 13 or more', '+5'],
    ],
  },
  {
    title: 'Points milestone',
    note: 'Based on the points your side scores. Only the highest milestone counts.',
    rows: [
      ['4–7 points', '+1'],
      ['8–10 points', '+2'],
      ['11–14 points', '+3'],
      ['15 or more points', '+5'],
    ],
  },
  {
    title: 'Captaincy',
    note: 'Pick a new captain and vice-captain every gameweek.',
    rows: [
      ['Captain', '2x points'],
      ['Vice-captain', '1.5x points'],
    ],
  },
];

function ScoringRules({ isMobile }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        {SCORING_SECTIONS.map((sec) => (
          <div key={sec.title} style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${LINE}` }}>
            <div style={{ background: INK, color: '#fff', padding: '12px 16px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 28, lineHeight: 1 }}>
              {sec.title}
            </div>
            {sec.rows.map(([label, pts], i) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? `1px solid ${LINE}` : 0 }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: INK }}>{label}</span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: 15, color: pts.startsWith('−') ? MUTED : ORANGE, whiteSpace: 'nowrap' }}>{pts}</span>
              </div>
            ))}
            <div style={{ padding: '10px 16px 14px', fontSize: 12, color: MUTED, borderTop: `1px solid ${LINE}` }}>{sec.note}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: INK, color: '#fff', padding: isMobile ? '20px 18px' : '24px 28px' }}>
        <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 30, lineHeight: 1, marginBottom: 12 }}>
          Example: <span style={{ color: ORANGE, fontFamily: ZUUME }}>win 15–7</span>
        </div>
        {[
          ['Played', 2], ['15 points won', 15], ['Win', 2], ['Margin of 8', 2], ['15+ milestone', 5],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: 14 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", color: 'rgba(255,255,255,.75)' }}>{l}</span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>+{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: 16, fontWeight: 900 }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif" }}>Total</span>
          <span style={{ fontFamily: "'Montserrat', sans-serif", color: ORANGE }}>26 pts <span style={{ fontFamily: "'Montserrat', sans-serif", color: 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: 13 }}>(52 as captain)</span></span>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
        A gameweek is one match day. Your squad scores the points its players earn in every match that day, and locks 10 minutes before the first match starts.
      </div>
    </div>
  );
}

export default function CcplFantasy() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(getStoredUser);
  const [showLogin, setShowLogin] = useState(null); // null | 'login' | 'signup'
  // Follow logins/logouts from the pop-up, the navbar, or another tab
  useEffect(() => {
    const sync = () => setUser((prev) => {
      const next = getStoredUser();
      return next?.id === prev?.id ? prev : next;
    });
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(AUTH_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tournamentId, setTournamentId] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [gameweeks, setGameweeks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [myTeam, setMyTeam] = useState(null);

  const [tab, setTab] = useState('squad');
  const [gw, setGw] = useState(1);
  const [squadIds, setSquadIds] = useState([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total');

  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [busy, setBusy] = useState(false);
  const [captainModal, setCaptainModal] = useState(null); // 'confirm' | 'change'
  const [captain, setCaptain] = useState(null);
  const [vice, setVice] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const [lbView, setLbView] = useState('all');
  const [lbSort, setLbSort] = useState({ col: 'total', dir: 'desc' });
  const [now, setNow] = useState(Date.now());

  const flash = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  // Re-evaluate deadline lock every 15s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // ── Load everything ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tid = await getActiveTournamentId();
        if (!tid) { setError('Fantasy is not open yet. Check back soon.'); return; }
        const [fx, tt] = await Promise.all([getFixtures(tid), getTournamentTeams(tid)]);
        const gws = gameweeksFromFixtures(fx);
        const [pl, teamsAll, mine] = await Promise.all([
          getFantasyPlayers(tid, tt),
          getAllTeams(tid),
          user?.id ? getMyTeam(user.id, tid, gws) : Promise.resolve(null),
        ]);
        const names = await getUserNames([...new Set(teamsAll.map((t) => t.userId).filter(Boolean))]);
        if (cancelled) return;

        const today = new Date().toISOString().split('T')[0];
        const current = gws.find((g) => g.date >= today) || gws[gws.length - 1];

        setTournamentId(tid);
        setFixtures(fx);
        setGameweeks(gws);
        setTeams(tt);
        setPlayers(pl);
        setAllTeams(teamsAll);
        setUserNames(names);
        setMyTeam(mine);
        if (current) setGw(current.gameweekNumber);
        setShowCreate(!!user?.id && !mine);
      } catch (e) {
        console.error('[CcplFantasy] load failed', e);
        if (!cancelled) setError('Could not load fantasy right now. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Keep the selected gameweek visible in the horizontal rail (horizontal scroll only)
  const railRef = useRef(null);
  useEffect(() => {
    const rail = railRef.current;
    const btn = rail?.querySelector(`[data-gw="${gw}"]`);
    if (rail && btn) rail.scrollLeft = btn.offsetLeft - rail.offsetLeft - (rail.clientWidth - btn.clientWidth) / 2;
  }, [gw, loading]);

  // Load saved squad for the selected gameweek
  const savedGw = myTeam?.gameweeks?.[gw];
  useEffect(() => {
    setSquadIds(savedGw?.playerIds || []);
  }, [savedGw]);

  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const gwInfo = gameweeks.find((g) => g.gameweekNumber === gw);
  const deadline = useMemo(() => (gwInfo ? gameweekDeadline(fixtures, gwInfo.date) : null), [fixtures, gwInfo]);
  const locked = !!deadline && deadline.getTime() <= now;

  const squad = squadIds.map((id) => playersById[id]).filter(Boolean);
  const spent = squad.reduce((s, p) => s + p.cost, 0);
  const remaining = FANTASY_BUDGET - spent;
  const men = squad.filter((p) => p.gender === 'm').length;
  const women = squad.length - men;

  const savedIds = savedGw?.playerIds || [];
  const hasUnsaved = squadIds.length !== savedIds.length || squadIds.some((id) => !savedIds.includes(id));

  const myTotal = useMemo(() => Object.values(myTeam?.gameweeks || {}).reduce((s, g) => s + (g.points || 0), 0), [myTeam]);

  const leaderboard = useMemo(() => allTeams
    .map((t) => ({
      id: t.id,
      team: t.teamName,
      owner: userNames[t.userId] || 'Manager',
      pts: Object.values(t.gameweeks || {}).reduce((s, g) => s + (g.points || 0), 0),
      gw: t.gameweeks?.[gw]?.points || 0,
      isMe: !!user?.id && t.userId === user.id,
    }))
    .sort((a, b) => b.pts - a.pts), [allTeams, userNames, gw, user]);
  // Leaderboard can rank by all-time total or by a single locked gameweek's points.
  const lockedGameweeks = useMemo(() => gameweeks
    .filter((g) => {
      const dl = gameweekDeadline(fixtures, g.date);
      return !!dl && dl.getTime() <= now;
    })
    .map((g) => g.gameweekNumber)
    .sort((a, b) => a - b), [gameweeks, fixtures, now]);
  // Sort by either numeric column; '#' always shows the team's rank in that column (ties share a rank).
  const lbRows = useMemo(() => {
    const rows = leaderboard.map((r) => {
      if (lbView === 'all') return { ...r, gwPts: r.gw };
      const t = allTeams.find((x) => x.id === r.id);
      return { ...r, gwPts: t?.gameweeks?.[lbView]?.points || 0 };
    });
    const val = (r) => (lbSort.col === 'total' ? r.pts : r.gwPts);
    const other = (r) => (lbSort.col === 'total' ? r.gwPts : r.pts);
    const desc = [...rows].sort((a, b) => val(b) - val(a) || other(b) - other(a));
    const rankOf = new Map();
    desc.forEach((r, i) => rankOf.set(r.id, i > 0 && val(desc[i - 1]) === val(r) ? rankOf.get(desc[i - 1].id) : i + 1));
    const ordered = lbSort.dir === 'desc' ? desc : [...desc].reverse();
    return ordered.map((r) => ({ ...r, rank: rankOf.get(r.id) }));
  }, [lbView, lbSort, leaderboard, allTeams]);
  const toggleLbSort = (col) => setLbSort((s) => (s.col === col ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' }));
  const pickLbView = (v) => { setLbView(v); setLbSort({ col: v === 'all' ? 'total' : 'gw', dir: 'desc' }); };
  const sortHead = (col, label) => {
    const active = lbSort.col === col;
    return (
      <button type="button" onClick={() => toggleLbSort(col)} aria-label={`Sort by ${label}, ${active && lbSort.dir === 'desc' ? 'ascending' : 'descending'}`} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: active ? INK : MUTED, textAlign: 'right', justifySelf: 'end', whiteSpace: 'nowrap' }}>
        {label}<span aria-hidden="true" style={{ marginLeft: 4, opacity: active ? 1 : 0.35 }}>{active && lbSort.dir === 'asc' ? '▲' : '▼'}</span>
      </button>
    );
  };
  const leaderboardOpen = allTeams.length >= LEADERBOARD_MIN_TEAMS;
  const myRank = leaderboardOpen ? leaderboard.findIndex((r) => r.isMe) + 1 : 0;

  // ── Actions ──
  const togglePlayer = (p) => {
    if (!user) { setShowLogin('login'); return; }
    if (!myTeam) { setShowCreate(true); return; }
    if (locked) { flash(`Gameweek ${gw} is locked`, 'error'); return; }
    if (squadIds.includes(p.id)) { setSquadIds(squadIds.filter((id) => id !== p.id)); return; }
    const reason = addBlockReason(p, squadIds, playersById);
    if (reason) { flash(reason, 'error'); return; }
    setSquadIds([...squadIds, p.id]);
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    const name = teamName.trim();
    if (!name) { flash('Enter a team name', 'error'); return; }
    setBusy(true);
    try {
      const team = await createTeam({ userId: user.id, teamName: name, tournamentId, gameweeks });
      setMyTeam(team);
      setAllTeams((prev) => [...prev, team]);
      setUserNames((prev) => ({ ...prev, [user.id]: user.name }));
      setShowCreate(false);
      setTeamName('');
      setTab('players');
      flash(`"${name}" created — pick your ${FANTASY_SQUAD} players`, 'success');
    } catch (err) {
      console.error(err);
      flash('Could not create team. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openConfirm = () => {
    const problem = squadError(squadIds, playersById);
    if (problem) { flash(problem, 'error'); return; }
    const keepC = squadIds.includes(savedGw?.captainId) ? savedGw.captainId : null;
    const keepV = squadIds.includes(savedGw?.viceCaptainId) ? savedGw.viceCaptainId : null;
    setCaptain(keepC);
    setVice(keepV);
    setCaptainModal('confirm');
  };

  const openChangeCaptain = () => {
    setCaptain(savedGw?.captainId || null);
    setVice(savedGw?.viceCaptainId || null);
    setCaptainModal('change');
  };

  const saveCaptains = async () => {
    if (!captain || !vice) { flash('Pick a captain and a vice-captain', 'error'); return; }
    if (captain === vice) { flash('Captain and vice-captain must be different', 'error'); return; }
    if (locked) { flash(`Gameweek ${gw} is locked`, 'error'); return; }
    setBusy(true);
    try {
      const gameweeksNext = { ...myTeam.gameweeks };
      const base = gameweeksNext[gw] || { gameweekNumber: gw, gameweekDate: gwInfo?.date, playerIds: [], points: 0, locked: false };
      if (captainModal === 'confirm') {
        const problem = squadError(squadIds, playersById);
        if (problem) { flash(problem, 'error'); setCaptainModal(null); return; }
        if (!squadIds.includes(captain) || !squadIds.includes(vice)) { flash('Captain and vice-captain must be in your squad', 'error'); return; }
        gameweeksNext[gw] = {
          ...base,
          playerIds: squadIds,
          points: gameweekPointsFor(squadIds, playersById, gwInfo?.date, captain, vice),
          locked: true,
          captainId: captain,
          viceCaptainId: vice,
        };
      } else {
        gameweeksNext[gw] = {
          ...base,
          points: gameweekPointsFor(base.playerIds || [], playersById, base.gameweekDate || gwInfo?.date, captain, vice),
          captainId: captain,
          viceCaptainId: vice,
        };
      }
      const totalPoints = Object.values(gameweeksNext).reduce((s, g) => s + (g.points || 0), 0);
      await updateTeam(myTeam.id, { gameweeks: gameweeksNext, totalPoints });
      const updated = { ...myTeam, gameweeks: gameweeksNext, totalPoints };
      setMyTeam(updated);
      setAllTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setCaptainModal(null);
      setTab('squad');
      flash(captainModal === 'confirm' ? `Gameweek ${gw} squad saved` : 'Captains updated', 'success');
    } catch (err) {
      console.error(err);
      flash('Save failed. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Players list ──
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => (!q || p.name.toLowerCase().includes(q) || p.teamId.toLowerCase().includes(q))
        && (teamFilter === 'all' || p.teamId === teamFilter)
        && (genderFilter === 'all' || p.gender === genderFilter))
      .sort((a, b) => (sortBy === 'cost' ? b.cost - a.cost : sortBy === 'name' ? a.name.localeCompare(b.name) : b.total - a.total));
  }, [players, search, teamFilter, genderFilter, sortBy]);

  const teamNames = useMemo(() => {
    const set = new Set(teams.map((t) => t.name));
    players.forEach((p) => p.teamId && set.add(p.teamId));
    return [...set].sort();
  }, [teams, players]);

  const pageStyles = `
    @keyframes cc-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
    @keyframes cf-toast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .cc-in { opacity: 0; animation: cc-fade-up .7s cubic-bezier(.2,.7,.2,1) forwards; }
    .cf-btn:not(:disabled):hover { filter: brightness(1.08); }
    .cf-tab { transition: background .2s ease, color .2s ease; }
    .cf-tab:not(.is-active):hover { background: rgba(226,123,70,.18) !important; }
    .cf-card { transition: box-shadow .2s ease, transform .2s ease; }
    .cf-card:hover { box-shadow: 0 6px 24px rgba(11,11,12,.12); }
    .cf-lb-row:hover { background: rgba(226,123,70,.1) !important; }
    .cf-rail { scrollbar-width: none; }
    .cf-rail::-webkit-scrollbar { display: none; }
    .cf-input { width: 100%; box-sizing: border-box; border: 0; box-shadow: inset 0 0 0 1px ${LINE}; background: #fff; padding: 12px 14px; font: 600 14px 'Montserrat', sans-serif; color: ${INK}; outline: none; }
    .cf-input:focus { box-shadow: inset 0 0 0 2px ${ORANGE}; }
    select.cf-input { min-width: 0; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  `;

  // ── Render helpers ──
  const Stat = ({ label, value, accent, wide }) => (
    <div style={{ minWidth: 0, gridColumn: wide && isMobile ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: isMobile ? 36 : 48, lineHeight: 0.9, color: accent ? ORANGE : '#fff', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );

  const SquadCard = ({ p }) => {
    const isC = savedGw?.captainId === p.id;
    const isV = savedGw?.viceCaptainId === p.id;
    const gwPts = gwInfo ? playerGameweekPoints(p.id, playersById, gwInfo.date, savedGw?.captainId, savedGw?.viceCaptainId) : 0;
    return (
      <div className="cf-card" style={{ background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', position: 'relative', boxShadow: isC ? `inset 0 0 0 2px ${ORANGE}` : `inset 0 0 0 1px ${LINE}` }}>
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          {isC && <Badge bg={ORANGE} color={INK}>C</Badge>}
          {isV && <Badge bg={INK}>VC</Badge>}
        </div>
        <Avatar player={p} size={isMobile ? 52 : 64} />
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, minHeight: 34, display: 'flex', alignItems: 'center' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.teamId || '—'}</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 700 }}>
          <span>{p.cost.toFixed(1)} CR</span>
          <span style={{ color: ORANGE }}>{gwPts} pts</span>
        </div>
      </div>
    );
  };

  const PlayerRow = ({ p }) => {
    const inSquad = squadIds.includes(p.id);
    const reason = inSquad ? null : addBlockReason(p, squadIds, playersById);
    const canEdit = !!user && !!myTeam && !locked;
    const disabled = canEdit && !inSquad && !!reason;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: inSquad ? '#fbeee6' : '#fff', boxShadow: `inset 0 0 0 1px ${inSquad ? ORANGE : LINE}`, opacity: disabled ? 0.55 : 1 }}>
        <Avatar player={p} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <Badge bg={p.gender === 'w' ? '#8a5cf6' : '#3b82f6'}>{p.gender === 'w' ? 'W' : 'M'}</Badge>
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.teamId || '—'} · {p.played} played · {p.avg} avg
          </div>
          {disabled && <div style={{ fontSize: 11, color: '#b3261a', fontWeight: 700, marginTop: 2 }}>{reason}</div>}
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{p.total}</div>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{p.cost.toFixed(1)} CR</div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => togglePlayer(p)}
            disabled={disabled}
            aria-label={inSquad ? `Remove ${p.name}` : `Add ${p.name}`}
            style={{ flex: 'none', width: 36, height: 36, border: 0, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 22, fontWeight: 800, lineHeight: 1, background: inSquad ? INK : ORANGE, color: inSquad ? '#fff' : INK }}
          >
            {inSquad ? '−' : '+'}
          </button>
        )}
      </div>
    );
  };

  // ── Page ──
  if (loading || error) {
    return (
      <div style={{ minHeight: '100vh', background: INK, fontFamily: "'Montserrat', sans-serif" }}>
        <style>{pageStyles}</style>
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="fantasy" onLoginClick={() => setShowLogin('login')} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: '40px 20px', fontSize: 16, color: 'rgba(255,255,255,.7)', textAlign: 'center' }}>
          {error || 'Loading fantasy…'}
        </div>
      </div>
    );
  }

  const tabs = [
    { k: 'squad', label: 'My Squad' },
    { k: 'leaderboard', label: 'Leaderboard' },
    { k: 'players', label: 'Players' },
    { k: 'scoring', label: 'Scoring' },
  ];

  return (
    <div style={{ background: INK, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{pageStyles}</style>
      <CCPLTopBar activeLeague="ccpl-s2" />
      <CCPLNavbar activePage="fantasy" onLoginClick={() => setShowLogin('login')} />

      {/* ===== Hero ===== */}
      <section style={{ position: 'relative', background: INK, color: '#fff', padding: `clamp(48px,6vw,88px) ${isMobile ? '16px' : '6vw'} clamp(40px,5vw,64px)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-1vw', bottom: '-2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(160px,28vw,460px)', lineHeight: 0.8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.12)' }}>XI</div>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: 10, background: ORANGE, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }} />

        <div className="cc-in" style={{ position: 'relative', maxWidth: 1400, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', transform: 'skewX(-14deg)', background: ORANGE, padding: '8px 16px', marginBottom: 20 }}>
            <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap' }}>CCPL Fantasy</span>
          </span>
          <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(56px,9vw,140px)', lineHeight: 0.84 }}>
            {myTeam ? myTeam.teamName : <>Pick your <span style={{ color: ORANGE }}>ten</span></>}
          </h1>
          <p style={{ margin: '16px 0 0', maxWidth: 620, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,.7)' }}>
            {FANTASY_SQUAD} players, {FANTASY_BUDGET} credits, max {MAX_PER_TEAM} per team and at least {FANTASY_SQUAD - MAX_MEN} women. Lock in before the first match of each gameweek.
          </p>

          {/* Gameweek rail */}
          {gameweeks.length > 0 && (
            <div ref={railRef} className="cf-rail" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 28 }}>
              {gameweeks.map((g) => {
                const active = g.gameweekNumber === gw;
                return (
                  <button
                    key={g.gameweekNumber}
                    type="button"
                    data-gw={g.gameweekNumber}
                    onClick={() => setGw(g.gameweekNumber)}
                    style={{ flex: 'none', border: 0, cursor: 'pointer', padding: '10px 16px', textAlign: 'left', background: active ? ORANGE : 'rgba(255,255,255,.08)', color: active ? INK : '#fff' }}
                  >
                    <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 24, lineHeight: 1 }}>GW{g.gameweekNumber}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, whiteSpace: 'nowrap' }}>{fmtDate(g.date)}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: isMobile ? '20px 16px' : 32, marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.14)' }}>
            <Stat label={locked ? `GW${gw} status` : `GW${gw} deadline`} value={locked ? 'Locked' : <Countdown deadline={deadline} />} accent wide />
            <Stat label="Total points" value={myTeam ? myTotal : '—'} />
            <Stat label={`GW${gw} points`} value={myTeam ? savedGw?.points || 0 : '—'} />
            <Stat label="Rank" value={myRank ? `#${myRank}` : '—'} />
          </div>
        </div>
      </section>

      {/* ===== Body ===== */}
      <section style={{ background: PAPER, color: INK, padding: `32px ${isMobile ? '16px' : '6vw'} ${hasUnsaved ? 120 : 72}px`, minHeight: 500 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {!user && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: INK, color: '#fff', padding: '18px 22px', marginBottom: 24 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Log in or sign up to build your squad</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>Same account as the CCPL app — your team syncs across both.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" style={{ color: '#fff', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.4)' }} onClick={() => setShowLogin('signup')}>Sign up</Btn>
                <Btn onClick={() => setShowLogin('login')}>Log in</Btn>
              </div>
            </div>
          )}
          {user && !myTeam && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: INK, color: '#fff', padding: '18px 22px', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>You don&apos;t have a fantasy team yet</div>
              <Btn onClick={() => setShowCreate(true)}>Create team</Btn>
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 24, boxShadow: `inset 0 -2px 0 ${INK}` }}>
            {tabs.map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={tab === t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={`cf-tab ${tab === t.k ? 'is-active' : ''}`}
                style={{ flex: isMobile ? 1 : 'none', border: 0, cursor: 'pointer', padding: isMobile ? '12px 2px' : '14px 26px', background: tab === t.k ? INK : 'transparent', color: tab === t.k ? '#fff' : INK, fontWeight: 800, fontSize: isMobile ? 10.5 : 13, letterSpacing: isMobile ? '.05em' : '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
              >
                {t.label}{t.k === 'squad' && myTeam ? ` ${squadIds.length}/${FANTASY_SQUAD}` : ''}
              </button>
            ))}
          </div>

          {/* ===== My Squad ===== */}
          {tab === 'squad' && (
            <div>
              {!myTeam ? (
                <p style={{ color: MUTED, fontSize: 15 }}>{user ? 'Create a team to start picking players.' : 'Log in to see your squad.'}</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, fontWeight: 700 }}>
                      <span>{remaining.toFixed(1)} CR left</span>
                      <span>{men} M · {women} W</span>
                      {hasUnsaved && <span style={{ color: '#b3261a' }}>Unsaved changes</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!locked && savedIds.length === FANTASY_SQUAD && !hasUnsaved && (
                        <Btn variant="ghost" onClick={openChangeCaptain}>Change captain</Btn>
                      )}
                      {!locked && <Btn variant="dark" onClick={() => setTab('players')}>Edit squad</Btn>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 140 : 180}px,1fr))`, gap: 12 }}>
                    {squad.map((p) => <SquadCard key={p.id} p={p} />)}
                    {Array.from({ length: Math.max(0, FANTASY_SQUAD - squad.length) }).map((_, i) => (
                      <button
                        key={`empty-${i}`}
                        type="button"
                        onClick={() => !locked && setTab('players')}
                        disabled={locked}
                        style={{ minHeight: 180, border: `2px dashed ${LINE}`, background: 'transparent', color: MUTED, fontWeight: 800, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', cursor: locked ? 'default' : 'pointer' }}
                      >
                        {locked ? 'Empty' : '+ Add player'}
                      </button>
                    ))}
                  </div>
                  {locked && savedIds.length === 0 && (
                    <p style={{ marginTop: 16, color: MUTED, fontSize: 14 }}>No squad was saved for gameweek {gw}.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Leaderboard ===== */}
          {tab === 'leaderboard' && !leaderboardOpen && (
            <div style={{ background: INK, color: '#fff', padding: isMobile ? '32px 20px' : '48px 32px', textAlign: 'center' }}>
              <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: isMobile ? 40 : 56, lineHeight: 0.95 }}>
                Leaderboard will be up <span style={{ color: ORANGE, fontFamily: ZUUME }}>after this gameweek</span>
              </div>
            </div>
          )}
          {tab === 'leaderboard' && leaderboardOpen && (
            <div role="tablist" aria-label="Leaderboard view" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
              {['all', ...lockedGameweeks].map((v) => {
                const active = lbView === v;
                return (
                  <button key={v} type="button" role="tab" aria-selected={active} onClick={() => pickLbView(v)} style={{ flexShrink: 0, border: 0, cursor: 'pointer', padding: '8px 14px', fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', background: active ? INK : '#fff', color: active ? '#fff' : INK, boxShadow: active ? 'none' : `inset 0 0 0 1px ${LINE}` }}>
                    {v === 'all' ? 'All time' : `GW${v}`}
                  </button>
                );
              })}
            </div>
          )}
          {tab === 'leaderboard' && leaderboardOpen && (
            <div style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${LINE}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 70px 80px', gap: 8, padding: '12px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED, borderBottom: `1px solid ${LINE}` }}>
                <span>#</span><span>Manager</span>{lbView === 'all' ? <>{sortHead('gw', `GW${gw}`)}{sortHead('total', 'Total')}</> : <>{sortHead('total', 'Total')}{sortHead('gw', `GW${lbView}`)}</>}
              </div>
              {lbRows.length === 0 && <div style={{ padding: 24, color: MUTED }}>No teams yet — be the first.</div>}
              {lbRows.map((r, i) => (
                <button key={r.id} type="button" className="cf-lb-row" onClick={() => setHistoryRow(r)} aria-label={`View ${r.team} gameweek history`} style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: INK, display: 'grid', gridTemplateColumns: '48px 1fr 70px 80px', gap: 8, alignItems: 'center', padding: '12px 16px', borderTop: i ? `1px solid ${LINE}` : 0, background: r.isMe ? '#fbeee6' : 'transparent', boxShadow: r.isMe ? `inset 4px 0 0 ${ORANGE}` : 'none' }}>
                  <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 26, lineHeight: 1, color: r.rank <= 3 ? ORANGE : MUTED }}>{r.rank}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team}{r.isMe ? ' (You)' : ''}</div>
                    <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.owner}</div>
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: MUTED }}>{lbView === 'all' ? r.gwPts : r.pts}</span>
                  <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 16 }}>{lbView === 'all' ? r.pts : r.gwPts}</span>
                </button>
              ))}
            </div>
          )}

          {/* ===== Scoring ===== */}
          {tab === 'scoring' && <ScoringRules isMobile={isMobile} />}

          {/* ===== Players ===== */}
          {tab === 'players' && (
            <div>
              {myTeam && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
                  <span>{squadIds.length}/{FANTASY_SQUAD} picked</span>
                  <span style={{ color: remaining < 0 ? '#b3261a' : INK }}>{remaining.toFixed(1)} CR left</span>
                  <span>{men}/{MAX_MEN} men · {women} women</span>
                  {locked && <span style={{ color: '#b3261a' }}>GW{gw} locked</span>}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,2fr) repeat(3,minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
                <input className="cf-input" style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }} placeholder="Search players or teams" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search players" />
                <select className="cf-input" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} aria-label="Filter by team">
                  <option value="all">All teams</option>
                  {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="cf-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} aria-label="Filter by gender">
                  <option value="all">Men & women</option>
                  <option value="m">Men</option>
                  <option value="w">Women</option>
                </select>
                <select className="cf-input" style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort players">
                  <option value="total">Sort: points</option>
                  <option value="cost">Sort: cost</option>
                  <option value="name">Sort: name</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                {filteredPlayers.map((p) => <PlayerRow key={p.id} p={p} />)}
              </div>
              {filteredPlayers.length === 0 && <p style={{ color: MUTED }}>No players match these filters.</p>}
            </div>
          )}
        </div>
      </section>

      {/* Sticky save bar */}
      {myTeam && hasUnsaved && !locked && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 900, background: INK, color: '#fff', padding: `14px ${isMobile ? '16px' : '6vw'}`, boxShadow: '0 -6px 24px rgba(0,0,0,.25)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: ORANGE }}>{squadIds.length}/{FANTASY_SQUAD}</span> players · {remaining.toFixed(1)} CR left
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" style={{ color: '#fff', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.4)' }} onClick={() => setSquadIds(savedIds)}>Reset</Btn>
              <Btn onClick={openConfirm} disabled={squadIds.length !== FANTASY_SQUAD}>Save squad</Btn>
            </div>
          </div>
        </div>
      )}

      <CCPLFooter above={PAPER} />

      {/* Login */}
      {showLogin && (
        <AuthModal
          initialMode={showLogin}
          onClose={() => setShowLogin(null)}
          onSuccess={(u, isNew) => {
            setShowLogin(null);
            flash(isNew ? `Welcome to CCPL, ${u.name || 'manager'}` : `Welcome back, ${u.name || 'manager'}`, 'success');
          }}
        />
      )}

      {/* Create team */}
      {showCreate && (
        <Modal
          title="Name your team"
          onClose={() => setShowCreate(false)}
          footer={(
            <>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Later</Btn>
              <Btn onClick={handleCreate} disabled={busy || !teamName.trim()}>{busy ? 'Creating…' : 'Create team'}</Btn>
            </>
          )}
        >
          <form onSubmit={handleCreate}>
            <p style={{ marginTop: 0, color: MUTED, fontSize: 14 }}>You&apos;ll use this team for every gameweek this season, on the website and the CCPL app.</p>
            <input className="cf-input" autoFocus maxLength={30} placeholder="e.g. Dink Dynasty" value={teamName} onChange={(e) => setTeamName(e.target.value)} aria-label="Team name" />
          </form>
        </Modal>
      )}

      {/* Captain picker */}
      {captainModal && (
        <Modal
          title={captainModal === 'confirm' ? 'Pick captains' : 'Change captains'}
          onClose={() => !busy && setCaptainModal(null)}
          footer={(
            <>
              <Btn variant="ghost" onClick={() => setCaptainModal(null)} disabled={busy}>Cancel</Btn>
              <Btn onClick={saveCaptains} disabled={busy || !captain || !vice}>{busy ? 'Saving…' : captainModal === 'confirm' ? `Save GW${gw}` : 'Update'}</Btn>
            </>
          )}
        >
          <CaptainPicker
            players={(captainModal === 'confirm' ? squadIds : savedIds).map((id) => playersById[id]).filter(Boolean)}
            captain={captain}
            vice={vice}
            setCaptain={setCaptain}
            setVice={setVice}
          />
        </Modal>
      )}

      {/* Leaderboard team history */}
      {historyRow && (
        <TeamHistoryModal
          row={historyRow}
          team={allTeams.find((t) => t.id === historyRow.id)}
          gameweeks={gameweeks}
          fixtures={fixtures}
          playersById={playersById}
          now={now}
          onClose={() => setHistoryRow(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div key={toast.id} role="status" style={{ position: 'fixed', left: '50%', bottom: hasUnsaved && myTeam && !locked ? 84 : 24, zIndex: 1100, transform: 'translateX(-50%)', animation: 'cf-toast .25s ease', maxWidth: 'calc(100vw - 32px)', padding: '12px 18px', fontSize: 14, fontWeight: 700, background: toast.kind === 'error' ? '#b3261a' : toast.kind === 'success' ? ORANGE : INK, color: toast.kind === 'success' ? INK : '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
