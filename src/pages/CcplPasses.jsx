import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import app, { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';
import CCPLTopBar from '../components/CCPLTopBar';

const ZUUME = "'Zuume Cut', sans-serif";
const PAPER = '#f2f0ea';
const PHONE_PREFIX = '+91 ';
const EMPTY_FORM = { name: '', phone: PHONE_PREFIX, email: '', team: '', note: '' };

// Keeps the +91 prefix fixed and allows up to 10 digits after it (also handles pasted +91/91 numbers)
const formatPhone = (value) => {
  let digits = value.replace(/^\+91/, '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  return PHONE_PREFIX + digits.slice(0, 10);
};
const phoneDigits = (phone) => phone.replace(/^\+91/, '').replace(/\D/g, '');
const MAX_PASSES = 6;
const FUNCTIONS_URL = `https://us-central1-${app.options.projectId}.cloudfunctions.net`;
const RESEND_SECONDS = 30;

const postJson = async (path, body) => {
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
};
// Matches the mobile app: a manual "CCPL" option sits after the franchise teams
const CCPL_TEAM = { id: 'ccpl-manual', name: 'CCPL' };

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatMatchDate = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CcplPasses() {
  const [teams, setTeams] = useState([]);
  const [match, setMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [user] = useState(getStoredUser);
  const phoneLocked = !!user?.phone;
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, name: user?.name || '', phone: user?.phone || PHONE_PREFIX, email: user?.email || '' }));
  const [passCount, setPassCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // WhatsApp OTP step: set once an OTP has been sent for the current details
  const [otpRequestId, setOtpRequestId] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const accentColor = '#e27b46';
  const ink = '#0b0b0c';

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const appSettingsDoc = await getDoc(doc(db, 'app-settings', 'mobile-app'));
        const activeTournamentId = appSettingsDoc.exists() ? appSettingsDoc.data().activeTournamentId : null;
        if (!activeTournamentId) return;

        const teamsSnapshot = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', activeTournamentId)));
        setTeams([...teamsSnapshot.docs.map((d) => ({ id: d.id, name: d.data().name || 'Unnamed Team' })), CCPL_TEAM]);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };

    // Same as the mobile app: requests attach to the nearest match day that hasn't passed yet
    const fetchUpcomingMatch = async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const snapshot = await getDocs(collection(db, 'ticketing'));
        const upcoming = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((tk) => {
            const matchDate = new Date(tk.date);
            if (isNaN(matchDate.getTime())) return false;
            matchDate.setHours(0, 0, 0, 0);
            return matchDate.getTime() >= startOfToday.getTime();
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setMatch(upcoming[0] || null);
      } catch (err) {
        console.error('Error fetching match days:', err);
      } finally {
        setMatchLoading(false);
      }
    };

    fetchTeams();
    fetchUpcomingMatch();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const onField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'phone' ? formatPhone(value) : value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!match) return;
    if (!form.name.trim() || !phoneDigits(form.phone) || !form.team) {
      setError('Please fill in your name, phone number and team.');
      return;
    }
    if (!form.note.trim()) {
      setError('Please add a note to the team admin.');
      return;
    }
    if (!phoneLocked && phoneDigits(form.phone).length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setSubmitting(true);
      if (otpRequestId) {
        // Step 2: the pass is only created once the OTP checks out
        await postJson('verifyPassOtp', { requestId: otpRequestId, otp });
        setSubmitted(true);
      } else {
        await sendOtp();
      }
    } catch (err) {
      console.error('Error submitting pass request:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: send the details to the server, which holds them and WhatsApps an OTP
  const sendOtp = async () => {
    const team = teams.find((t) => t.id === form.team);
    const { requestId, otpSkipped } = await postJson('requestPassOtp', {
      matchId: match.id,
      name: form.name.trim(),
      phoneNumber: phoneLocked ? form.phone.trim() : `+91${phoneDigits(form.phone)}`,
      email: form.email.trim(),
      numPasses: passCount,
      team: team?.name || '',
      teamId: form.team,
      note: form.note.trim(),
      userId: user?.id || ''
    });
    // OTP switched off on the server: the pass has already been created
    if (otpSkipped) {
      setSubmitted(true);
      return;
    }
    setOtpRequestId(requestId);
    setOtp('');
    setResendIn(RESEND_SECONDS);
  };

  const resendOtp = async () => {
    try {
      setSubmitting(true);
      setError('');
      await sendOtp();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const editDetails = () => {
    setOtpRequestId('');
    setOtp('');
    setError('');
  };

  const reset = () => {
    setForm((f) => ({ ...EMPTY_FORM, name: user?.name || '', phone: user?.phone || PHONE_PREFIX, email: user?.email || f.email }));
    setPassCount(1);
    setSubmitted(false);
    setError('');
    setOtpRequestId('');
    setOtp('');
  };

  const firstName = form.name.trim().split(' ')[0];
  const teamName = teams.find((t) => t.id === form.team)?.name || form.team;

  const labelStyle = { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5f5b52' };
  const inputStyle = { background: PAPER, border: `2px solid ${ink}`, color: ink, fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '16px', padding: '14px 16px', outline: 'none', borderRadius: 0, letterSpacing: 'normal', textTransform: 'none' };
  const lockedStyle = { ...inputStyle, background: '#e6e3da', color: '#5f5b52', cursor: 'not-allowed' };
  const nameLocked = !!user?.name;
  const optionalTag = <span style={{ color: '#8a857a', fontWeight: 600, letterSpacing: '.1em' }}> (Optional)</span>;

  const statusCard = (title, text) => (
    <div style={{ position: 'relative', overflow: 'hidden', border: `2px solid ${ink}`, background: '#fff', padding: 'clamp(32px,5vw,56px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: accentColor }}></span>
      <p style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(36px,5vw,56px)', lineHeight: .9, textTransform: 'uppercase' }}>{title}</p>
      {text && <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: '#5f5b52', maxWidth: '50ch' }}>{text}</p>}
    </div>
  );

  return (
    <>
      <style>{`
        .cc-passes-page ::selection { background: ${accentColor}; color: ${ink}; }
        /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
        .cc-passes-page span { font-family: inherit; }
        .cc-passes-page input::placeholder, .cc-passes-page textarea::placeholder { color: #8a857a; }

        .cc-pass-field { transition: border-color .2s ease, background .2s ease; }
        .cc-pass-field:focus { border-color: ${accentColor} !important; background: #fff !important; }

        .cc-pass-submit { transition: background .2s ease, color .2s ease; }
        .cc-pass-submit:hover:not(:disabled) { background: ${accentColor} !important; color: ${ink} !important; }
        .cc-pass-step { transition: background .2s ease, color .2s ease; }
        .cc-pass-step:hover:not(:disabled) { background: ${accentColor} !important; color: ${ink} !important; }
        .cc-pass-step:disabled { opacity: .35; cursor: not-allowed !important; }
        .cc-pass-reset { transition: background .2s ease; }
        .cc-pass-reset:hover { background: ${accentColor} !important; }

        @keyframes cc-fade-up {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: none; }
        }
        .cc-in {
          opacity: 0;
          animation: cc-fade-up .8s cubic-bezier(.2,.7,.2,1) forwards;
        }
      `}</style>

      <div className="cc-passes-page" style={{ background: ink, fontFamily: "'Montserrat', sans-serif" }}>
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="passes" />

        {/* ===== Header ===== */}
        <section style={{ position: 'relative', background: ink, color: '#fff', padding: 'clamp(56px,7vw,96px) 6vw calc(5vw + clamp(56px,7vw,96px))', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-1vw', bottom: '2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,32vw,520px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)' }}>
            PASS
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: accentColor, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>

          <div className="cc-in" style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '28px 48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={{ display: 'inline-flex', flex: 'none', transform: 'skewX(-14deg)', background: accentColor, padding: '8px 16px' }}>
                  <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: ink, whiteSpace: 'nowrap' }}>CCPL Hyderabad / Season 2</span>
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>Match Passes</span>
              </div>
              <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,160px)', lineHeight: .84, letterSpacing: '-.01em' }}>
                Request a <span style={{ color: accentColor }}>Pass.</span>
              </h1>
            </div>
            <p style={{ position: 'relative', margin: 0, maxWidth: '420px', fontSize: '16px', fontWeight: 500, lineHeight: 1.6, color: '#e8e8e8', borderLeft: `4px solid ${accentColor}`, paddingLeft: '16px', background: 'rgba(11,11,12,.6)', textWrap: 'pretty' }}>
              Passes are issued by each franchise. Pick a team and send a note to its admin, who will get back to you directly.
            </p>
          </div>
        </section>

        {/* ===== Form ===== */}
        <section style={{ position: 'relative', background: PAPER, color: ink, marginTop: '-5vw', padding: 'calc(5vw + clamp(40px,5vw,64px)) 6vw calc(5vw + clamp(64px,8vw,110px))', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)' }}>
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            {matchLoading ? (
              statusCard('Loading…')
            ) : !match ? (
              statusCard('No upcoming match', 'Pass requests open once the next match day is announced. Check back soon.')
            ) : submitted ? (
              <div style={{ position: 'relative', overflow: 'hidden', border: `2px solid ${ink}`, background: ink, color: '#fff', padding: 'clamp(32px,5vw,56px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: accentColor }}></span>
                <span style={{ display: 'inline-flex', transform: 'skewX(-14deg)', background: accentColor, padding: '6px 14px' }}>
                  <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: ink }}>Request Sent</span>
                </span>
                <p style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(44px,6vw,72px)', lineHeight: .88, textTransform: 'uppercase' }}>
                  Thanks, <span style={{ color: accentColor }}>{firstName}.</span>
                </p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: '#e8e8e8', maxWidth: '46ch' }}>
                  Your request for {passCount} {passCount === 1 ? 'pass' : 'passes'} to {match?.name || 'the match'} has gone to the {teamName} admin. You'll be notified at {form.phone} once it's approved.
                </p>
                <button type="button" onClick={reset} className="cc-pass-reset" style={{ marginTop: '10px', display: 'inline-flex', transform: 'skewX(-14deg)', background: '#fff', color: ink, border: 0, padding: '12px 22px', cursor: 'pointer' }}>
                  <span style={{ transform: 'skewX(14deg)', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '19px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Send another request</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ border: `2px solid ${ink}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px clamp(20px,3vw,32px)', background: ink, color: '#fff' }}>
                  <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '26px', lineHeight: 1, letterSpacing: '.04em', textTransform: 'uppercase' }}>Pass Request</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: accentColor }}>* Required</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 24px', padding: '16px clamp(20px,3vw,32px)', borderBottom: `2px solid ${ink}`, background: PAPER }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5f5b52' }}>Match{match.date ? ` · ${formatMatchDate(match.date)}` : ''}</span>
                    <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '28px', lineHeight: 1, textTransform: 'uppercase' }}>{match.name || 'Match Day'}</span>
                  </div>
                  {match.hostTeam && (
                    <span style={{ display: 'inline-flex', transform: 'skewX(-14deg)', background: ink, padding: '6px 14px' }}>
                      <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#fff', whiteSpace: 'nowrap' }}>Host · {match.hostTeam}</span>
                    </span>
                  )}
                </div>

                {otpRequestId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: 'clamp(24px,4vw,40px) clamp(20px,3vw,32px)' }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: '#5f5b52', maxWidth: '50ch' }}>
                    We've sent a 6-digit OTP on WhatsApp to <strong style={{ color: ink }}>{form.phone}</strong>. Enter it below to submit your request.
                  </p>
                  <label style={labelStyle}>
                    WhatsApp OTP *
                    <input required name="otp" autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} className="cc-pass-field" style={{ ...inputStyle, maxWidth: '220px', fontSize: '24px', letterSpacing: '.4em' }} />
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: '13px', fontWeight: 700 }}>
                    <button type="button" onClick={resendOtp} disabled={submitting || resendIn > 0} style={{ background: 'none', border: 0, padding: 0, color: resendIn > 0 ? '#8a857a' : ink, textDecoration: 'underline', cursor: resendIn > 0 ? 'default' : 'pointer', fontWeight: 700 }}>
                      {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                    </button>
                    <button type="button" onClick={editDetails} disabled={submitting} style={{ background: 'none', border: 0, padding: 0, color: ink, textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>
                      Edit details
                    </button>
                  </div>
                  {error && <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#b3361b' }}>{error}</p>}
                </div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', padding: 'clamp(24px,4vw,40px) clamp(20px,3vw,32px)' }}>
                  <label style={labelStyle}>
                    Full Name *
                    <input required name="name" placeholder="Your name" value={form.name} onChange={onField} readOnly={nameLocked} className={nameLocked ? undefined : 'cc-pass-field'} style={nameLocked ? lockedStyle : inputStyle} />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '26px 20px' }}>
                    <label style={labelStyle}>
                      Phone Number *
                      <input required type="tel" name="phone" placeholder="+91 90000 00000" inputMode="numeric" value={form.phone} onChange={onField} readOnly={phoneLocked} className={phoneLocked ? undefined : 'cc-pass-field'} style={phoneLocked ? lockedStyle : inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      <span>Email{optionalTag}</span>
                      <input type="email" name="email" placeholder="you@email.com" value={form.email} onChange={onField} className="cc-pass-field" style={inputStyle} />
                    </label>
                  </div>

                  <label style={labelStyle}>
                    Team *
                    <select
                      required
                      name="team"
                      value={form.team}
                      onChange={onField}
                      className="cc-pass-field"
                      style={{
                        ...inputStyle,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        background: `${PAPER} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9'%3E%3Cpath d='M1 1l6 6 6-6' fill='none' stroke='%230b0b0c' stroke-width='3'/%3E%3C/svg%3E") no-repeat right 16px center`,
                        color: form.team ? ink : '#8a857a',
                        padding: '14px 44px 14px 16px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>Select a team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id} style={{ color: ink }}>{t.name}</option>
                      ))}
                    </select>
                  </label>

                  <div style={labelStyle}>
                    Number of Passes *
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'stretch', border: `2px solid ${ink}`, background: PAPER }}>
                        <button type="button" aria-label="Fewer passes" onClick={() => setPassCount((c) => Math.max(1, c - 1))} disabled={passCount <= 1} className="cc-pass-step" style={{ width: '52px', border: 0, borderRight: `2px solid ${ink}`, background: ink, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14" /></svg>
                        </button>
                        <span aria-live="polite" style={{ minWidth: '72px', padding: '8px 0', textAlign: 'center', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '34px', lineHeight: 1, color: ink, letterSpacing: 'normal' }}>{passCount}</span>
                        <button type="button" aria-label="More passes" onClick={() => setPassCount((c) => Math.min(MAX_PASSES, c + 1))} disabled={passCount >= MAX_PASSES} className="cc-pass-step" style={{ width: '52px', border: 0, borderLeft: `2px solid ${ink}`, background: ink, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#8a857a' }}>Max {MAX_PASSES} per request</span>
                    </div>
                  </div>

                  <label style={labelStyle}>
                    <span>Note to Team Admin *<span style={{ color: '#8a857a', fontWeight: 600, letterSpacing: '.1em' }}> (Reference/Reason for Request)</span></span>
                    <textarea
                      required
                      name="note"
                      rows={5}
                      placeholder="Anything the admin should know"
                      value={form.note}
                      onChange={onField}
                      className="cc-pass-field"
                      style={{ ...inputStyle, fontWeight: 500, fontSize: '15px', lineHeight: 1.5, resize: 'vertical' }}
                    />
                  </label>

                  {error && <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#b3361b' }}>{error}</p>}
                </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px 24px', padding: '18px clamp(20px,3vw,32px)', borderTop: `2px solid ${ink}`, background: PAPER }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5f5b52' }}>Passes are subject to team availability.</span>
                  <button type="submit" disabled={submitting} className="cc-pass-submit" style={{ display: 'inline-flex', transform: 'skewX(-14deg)', background: ink, color: '#fff', border: 0, padding: '14px 28px', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', transform: 'skewX(14deg)', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                      {submitting ? (otpRequestId ? 'Verifying…' : 'Submitting…') : (otpRequestId ? 'Verify & submit' : 'Submit request')}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
      <CCPLPartners divider={false} />
      <CCPLFooter />
    </>
  );
}
