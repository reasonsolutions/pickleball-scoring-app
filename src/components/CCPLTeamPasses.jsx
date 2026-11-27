import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../utils/firebase';
import { passDelivery, isDelivering, canRetry } from '../utils/passDelivery';

// Team admin pass management, mirroring the CCPL mobile app's ApprovePassesScreen.
// Approving and sending go through the generateIndividualPassPDFs Cloud Function, which writes the
// approved request and queues its passes; deliverQueuedPasses then sends one PDF + WhatsApp message
// per pass in the background, with progress shown live here. It never *updates* a request to
// 'approved', so the mobile app's generatePassPDF trigger (one merged PDF) doesn't also fire.
// Declining is a plain status update, which generatePassPDF ignores.

const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const RULE = '#d8d4ca';
const ORANGE = '#e27b46';
const GREEN = '#2f9e5b';
const RED = '#c0392b';
const PASS_COLS = '52px 1.3fr 1.1fr 90px 2fr 210px';
const MAX_SEND = 6;
const functions = getFunctions(app, 'asia-south1');

const zuume = { fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'italic' };
const eyebrow = { fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED };
const skew = (bg, extra = {}) => ({ display: 'inline-flex', transform: 'skewX(-14deg)', background: bg, border: 0, ...extra });
const unskew = { display: 'inline-block', transform: 'skewX(14deg)' };
const pillLabel = { ...unskew, fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase' };
const ghostBtn = { background: 'transparent', border: `2px solid ${INK}`, color: INK, padding: '7px 12px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase' };
const inputStyle = { background: PAPER, border: `2px solid ${INK}`, color: INK, fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '15px', padding: '12px 14px', outline: 'none', borderRadius: 0, width: '100%' };

const plural = (n) => `${n} pass${n === 1 ? '' : 'es'}`;
const toMillis = (t) => t?.toMillis?.() || 0;
const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 ? '91' + cleaned : cleaned;
};
const sortRequests = (list) => [...list].sort((a, b) => {
  if (a.status === 'pending' && b.status !== 'pending') return -1;
  if (a.status !== 'pending' && b.status === 'pending') return 1;
  return toMillis(b.createdAt) - toMillis(a.createdAt);
});
const longDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function CCPLTeamPasses({ userId, fallbackTeamName, onPendingCountChange }) {
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [teamId, setTeamId] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [allowance, setAllowance] = useState(0);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  // Approve/send progress screen: { phase: 'working' | 'done' | 'error', title, detail, lines, jobs }
  // While 'working' with jobs, it follows those requests' delivery live until they finish
  const [progress, setProgress] = useState(null);
  const [subTab, setSubTab] = useState('approve');
  const [sendForm, setSendForm] = useState({ name: '', phone: '', count: '1' });

  // Step 1: user -> team + tournament -> match days (closest to today selected)
  useEffect(() => {
    const load = async () => {
      try {
        if (!userId) {
          setSetupError('Could not identify your account. Please log in again.');
          return;
        }
        const userSnap = await getDoc(doc(db, 'ccpl-users', userId));
        if (!userSnap.exists()) {
          setSetupError('Your account record was not found.');
          return;
        }
        const userData = userSnap.data();
        if (!userData.teamId) {
          setSetupError('No team is linked to your account.');
          return;
        }
        if (!userData.tournamentId) {
          setSetupError('No season is linked to your account. Please contact the League Office.');
          return;
        }
        setTeamId(userData.teamId);
        setTeamName(userData.team || fallbackTeamName || '');

        const eventsSnap = await getDocs(query(collection(db, 'ticketing'), where('tournamentId', '==', userData.tournamentId)));
        const list = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!list.length) {
          setSetupError('No match days have been set up for passes yet.');
          return;
        }
        list.sort((a, b) => new Date(a.date) - new Date(b.date));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closest = list.reduce((best, e) => {
          const day = new Date(e.date);
          day.setHours(0, 0, 0, 0);
          const diff = Math.abs(day - today);
          return !best || diff < best.diff ? { id: e.id, diff } : best;
        }, null);
        setEvents(list);
        setEventId(closest.id);
      } catch (err) {
        console.error('Error loading pass setup:', err);
        setSetupError('Failed to load passes. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, fallbackTeamName]);

  // Step 2: allocation + requests for the selected match day
  const loadEvent = useCallback(async (evId, tId) => {
    setEventLoading(true);
    setSelected([]);
    try {
      const allocSnap = await getDocs(query(collection(db, 'ticketing', evId, 'allocation'), where('teamId', '==', tId)));
      const alloc = allocSnap.empty ? {} : allocSnap.docs[0].data();
      setAllowance(alloc.allocated || alloc.passAllowance || 0);

    } catch (err) {
      console.error('Error loading match day passes:', err);
      alert('Failed to load pass requests for this match day. Please try again.');
    } finally {
      setEventLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventId && teamId) loadEvent(eventId, teamId);
  }, [eventId, teamId, loadEvent]);

  // Requests stay live, so passes being sent in the background show their progress
  useEffect(() => {
    if (!eventId || !teamId) return undefined;
    return onSnapshot(query(collection(db, 'ticketing', eventId, 'passes'), where('teamId', '==', teamId)), (snap) => {
      setRequests(sortRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, (err) => {
      console.error('Error loading match day passes:', err);
      alert('Failed to load pass requests for this match day. Please try again.');
    });
  }, [eventId, teamId]);

  const pending = requests.filter(r => r.status === 'pending');
  const passesUsed = requests.reduce((sum, r) => sum + (r.status === 'approved' ? (r.numPasses || 0) : 0), 0);
  const passesLeft = allowance - passesUsed;
  const pendingPasses = pending.reduce((sum, r) => sum + (r.numPasses || 0), 0);
  const selectedPasses = requests.filter(r => selected.includes(r.id)).reduce((sum, r) => sum + (r.numPasses || 0), 0);
  const allSelected = pending.length > 0 && pending.every(r => selected.includes(r.id));
  const currentEvent = events.find(e => e.id === eventId);

  useEffect(() => {
    onPendingCountChange?.(pending.length);
  }, [pending.length, onPendingCountChange]);

  const toggleRequest = (req) => {
    if (selected.includes(req.id)) {
      setSelected(sel => sel.filter(id => id !== req.id));
      return;
    }
    if (selectedPasses + req.numPasses > passesLeft) {
      alert(`You can't add ${req.name}'s request (${plural(req.numPasses)}).\n\nYou have ${plural(passesLeft)} left and ${plural(selectedPasses)} already selected, so approving this too would go over your allowance.`);
      return;
    }
    setSelected(sel => [...sel, req.id]);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
      return;
    }
    if (pendingPasses > passesLeft) {
      alert(`You can't select all pending requests.\n\nThey add up to ${plural(pendingPasses)} but you only have ${plural(passesLeft)} left. Select requests one by one instead.`);
      return;
    }
    setSelected(pending.map(r => r.id));
  };

  // Approve/send/resend go through the generateIndividualPassPDFs Cloud Function, which queues
  // the passes and returns the requests it queued
  const callPassFunction = async (payload) => {
    const res = await httpsCallable(functions, 'generateIndividualPassPDFs')({ userId, eventId, ...payload });
    return res.data?.results || [];
  };

  // Follow the queued requests' delivery live, and finish the progress screen once they're all done
  // (matched on jobId, so a request's previous delivery isn't mistaken for this one)
  const tracked = progress?.phase === 'working' && progress.jobs
    ? requests
      .filter(r => progress.jobs.some(j => j.id === r.id && j.jobId === r.delivery?.jobId))
      .map(r => ({ req: r, info: passDelivery(r) }))
    : null;
  const trackedDone = !!tracked && tracked.length === progress.jobs.length && !tracked.some(t => isDelivering(t.info));
  useEffect(() => {
    if (!trackedDone) return;
    const failed = tracked.filter(t => t.info.state !== 'sent');
    const passes = tracked.reduce((sum, t) => sum + t.info.total, 0);
    setProgress(failed.length ? {
      phase: 'error',
      title: 'Some passes were not sent',
      detail: 'These requests are approved, but not every pass could be sent on WhatsApp. Use Retry on them to send the missing passes.',
      lines: failed.map(t => `${t.req.name}: ${t.info.sent} of ${t.info.total} sent${t.info.error ? ` (${t.info.error})` : ''}`),
    } : {
      phase: 'done',
      title: 'Passes sent',
      detail: tracked.length === 1
        ? `${plural(tracked[0].info.total)} sent to ${tracked[0].req.name} on WhatsApp.`
        : `All ${plural(passes)} were sent on WhatsApp across ${tracked.length} requests.`,
    });
  }, [trackedDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Queues the passes behind the progress screen, which then follows them until they're sent
  const runWithProgress = async (working, payload) => {
    setBusy(true);
    setProgress({ phase: 'working', ...working });
    try {
      const results = await callPassFunction(payload);
      setProgress(p => ({ ...p, jobs: results }));
      return true;
    } catch (err) {
      console.error('Error approving/sending passes:', err);
      setProgress({ phase: 'error', title: 'Something went wrong', detail: err?.message || 'Please try again.' });
      return false;
    } finally {
      setBusy(false);
      loadEvent(eventId, teamId);
    }
  };

  // Retry sends only the passes a failed send didn't get to
  const retryRequest = async (req) => {
    const info = passDelivery(req);
    const missing = info.total - info.sent;
    const ok = window.confirm(`Send the ${plural(missing)} ${req.name} didn't get to ${req.phoneNumber} on WhatsApp?`);
    if (!ok) return;
    await runWithProgress({
      title: 'Sending passes',
      detail: `Sending ${plural(missing)} to ${req.name} on WhatsApp, one PDF per pass.`,
    }, { action: 'resend', passIds: [req.id], onlyUnsent: true });
  };

  const approveRequests = async (ids) => {
    const reqs = requests.filter(r => ids.includes(r.id));
    const passes = reqs.reduce((sum, r) => sum + (r.numPasses || 0), 0);
    await runWithProgress({
      title: 'Approving & sending passes',
      detail: reqs.length === 1
        ? `Sending ${plural(passes)} to ${reqs[0].name} on WhatsApp, one PDF per pass.`
        : `Sending ${plural(passes)} across ${reqs.length} requests on WhatsApp, one PDF per pass.`,
    }, { action: 'approve', passIds: ids });
    setSelected([]);
  };

  const handleSingle = async (req, newStatus) => {
    if (newStatus === 'approved' && req.numPasses > passesLeft) {
      alert(`Not enough passes. ${req.name} asked for ${plural(req.numPasses)} but you only have ${plural(passesLeft)} left.`);
      return;
    }
    const ok = window.confirm(newStatus === 'approved'
      ? `Approve ${plural(req.numPasses)} for ${req.name}?\n\nEach pass will be sent to ${req.phoneNumber} on WhatsApp as a separate PDF.`
      : `Decline ${req.name}'s request for ${plural(req.numPasses)}?`);
    if (!ok) return;

    if (newStatus === 'approved') {
      await approveRequests([req.id]);
      return;
    }

    setBusy(true);
    try {
      const changes = { status: 'declined', updatedAt: Timestamp.now(), actionBy: userId };
      await updateDoc(doc(db, 'ticketing', eventId, 'passes', req.id), changes);
      setRequests(prev => sortRequests(prev.map(r => (r.id === req.id ? { ...r, ...changes } : r))));
      setSelected(sel => sel.filter(id => id !== req.id));
      alert('Pass request declined.');
    } catch (err) {
      console.error('Error declining pass request:', err);
      alert('Failed to decline the pass request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!selected.length) return;
    if (selectedPasses > passesLeft) {
      alert(`Selected requests add up to ${plural(selectedPasses)} but you only have ${plural(passesLeft)} left.`);
      return;
    }
    const ok = window.confirm(`Approve ${selected.length} request${selected.length === 1 ? '' : 's'} (${plural(selectedPasses)})?\n\nEach person will get every pass as a separate PDF on WhatsApp.`);
    if (!ok) return;
    await approveRequests([...selected]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const name = sendForm.name.trim();
    const phone = sendForm.phone.trim();
    const count = parseInt(sendForm.count, 10);
    if (!name) return alert('Please enter a name.');
    if (!phone) return alert('Please enter a phone number.');
    if (isNaN(count) || count < 1 || count > MAX_SEND) return alert(`Number of passes must be between 1 and ${MAX_SEND}.`);
    if (count > passesLeft) {
      return alert(`Not enough passes. You only have ${plural(passesLeft)} left to send. You are trying to send ${count}.`);
    }
    const ok = window.confirm(`Send ${plural(count)} to ${name} (${phone}) on WhatsApp?`);
    if (!ok) return;

    const sent = await runWithProgress({
      title: 'Sending passes',
      detail: `Sending ${plural(count)} to ${name} on WhatsApp, one PDF per pass.`,
    }, { action: 'send', name, phoneNumber: formatPhone(phone), numPasses: count, teamName });
    if (sent) setSendForm({ name: '', phone: '', count: '1' });
  };

  const panel = (text) => (
    <div style={{ border: `2px solid ${INK}`, background: '#fff', padding: '40px 24px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: MUTED }}>{text}</div>
  );

  if (loading) return panel('Loading passes...');
  if (setupError) return panel(setupError);

  const statusTag = (status) => {
    const approved = status === 'approved';
    return (
      <span style={skew(approved ? INK : RED, { padding: '5px 12px' })}>
        <span style={{ ...pillLabel, fontSize: '11px', color: approved ? ORANGE : '#fff' }}>{approved ? 'Approved' : 'Declined'}</span>
      </span>
    );
  };

  // WhatsApp delivery of an approved request, updated live, with Retry if some passes weren't sent
  const deliveryLine = (r) => {
    const info = passDelivery(r);
    if (info.state === 'unknown') return null;
    const text = {
      queued: 'Waiting to send',
      sending: `Sending ${info.sent}/${info.total}`,
      sent: `Sent on WhatsApp ${info.sent}/${info.total}`,
      failed: `Failed · ${info.sent}/${info.total} sent`,
      stuck: `Stopped · ${info.sent}/${info.total} sent`,
    }[info.state];
    const bad = info.state === 'failed' || info.state === 'stuck';
    return (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexBasis: '100%', fontSize: '12px', fontWeight: 700, color: bad ? RED : info.state === 'sent' ? GREEN : MUTED }} title={info.error || undefined}>
        {text}
        {canRetry(info) && (
          <button type="button" className="ta-ghost-btn" onClick={() => retryRequest(r)} disabled={busy} style={{ ...ghostBtn, padding: '4px 10px', borderColor: RED, color: RED, cursor: busy ? 'not-allowed' : 'pointer' }}>Retry</button>
        )}
      </span>
    );
  };

  return (
    <div>
      <style>{`@keyframes ta-spin { to { transform: rotate(360deg); } } .ta-progress span, .ta-progress li { font-family: inherit; }`}</style>
      {/* Portal to <body>: the page section has a clip-path that would clip a fixed overlay */}
      {progress && createPortal(
        <div className="ta-progress" role="dialog" aria-modal="true" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,11,12,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#fff', border: `2px solid ${INK}`, color: INK, fontFamily: "'Montserrat', sans-serif" }}>
            <div style={{ height: '8px', background: progress.phase === 'error' ? RED : ORANGE }}></div>
            <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
              {progress.phase === 'working' ? (
                <span style={{ width: '52px', height: '52px', borderRadius: '50%', border: `5px solid ${RULE}`, borderTopColor: ORANGE, animation: 'ta-spin .9s linear infinite' }}></span>
              ) : (
                <span style={{ width: '52px', height: '52px', borderRadius: '50%', background: progress.phase === 'done' ? GREEN : RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800 }}>
                  {progress.phase === 'done' ? '✓' : '!'}
                </span>
              )}
              <span style={{ ...zuume, fontSize: '34px', lineHeight: 0.95, textTransform: 'uppercase' }}>{progress.title}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.6, color: MUTED }}>{progress.detail}</span>
              {tracked && tracked.length > 0 && (
                <span style={{ fontSize: '15px', fontWeight: 800, color: INK }}>
                  {tracked.reduce((sum, t) => sum + t.info.sent, 0)} of {tracked.reduce((sum, t) => sum + t.info.total, 0)} passes sent
                </span>
              )}
              {progress.lines && (
                <ul style={{ margin: 0, padding: '12px 16px 12px 30px', background: PAPER, border: `1px solid ${RULE}`, textAlign: 'left', fontSize: '13px', fontWeight: 600, lineHeight: 1.6, width: '100%' }}>
                  {progress.lines.map(line => <li key={line}>{line}</li>)}
                </ul>
              )}
              {progress.phase === 'working' ? (
                <>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a857a' }}>
                    {progress.jobs ? 'Sending carries on even if you close this.' : 'Saving…'}
                  </span>
                  {progress.jobs && (
                    <button type="button" className="ta-ghost-btn" onClick={() => setProgress(null)} style={ghostBtn}>Close</button>
                  )}
                </>
              ) : (
                <button type="button" className="ta-dark-btn" onClick={() => setProgress(null)} style={skew(INK, { color: '#fff', padding: '10px 26px', cursor: 'pointer', marginTop: '4px' })}>
                  <span style={{ ...unskew, ...zuume, fontSize: '20px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Done</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Approve / Send switch */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', border: `2px solid ${INK}`, background: '#fff' }}>
          {[['approve', 'Approve Passes'], ['send', 'Send Passes']].map(([id, label], i) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              style={{ border: 0, borderLeft: i ? `2px solid ${INK}` : 0, background: subTab === id ? INK : '#fff', color: subTab === id ? ORANGE : INK, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Match day tabs */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '24px' }}>
        {events.map(ev => {
          const d = new Date(ev.date);
          const active = ev.id === eventId;
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => !busy && setEventId(ev.id)}
              style={{ flex: 'none', minWidth: '76px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '10px 12px', border: `2px solid ${INK}`, background: active ? INK : '#fff', color: active ? ORANGE : INK, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif" }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span style={{ ...zuume, fontSize: '30px', lineHeight: 1 }}>{d.toLocaleDateString('en-US', { day: 'numeric' })}</span>
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', border: `2px solid ${INK}`, marginBottom: '24px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: INK, color: '#fff', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: ORANGE }}></span>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE }}>
            {subTab === 'approve' ? 'Passes left to approve' : 'Passes left to send'}
          </span>
          <span style={{ ...zuume, fontSize: 'clamp(110px,13vw,190px)', lineHeight: 0.8, color: passesLeft > 0 ? '#fff' : RED }}>{eventLoading ? '–' : passesLeft}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>{passesUsed} of {allowance} used</span>
        </div>
        <div style={{ background: '#fff', padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '6px', borderLeft: `2px solid ${INK}` }}>
          <span style={{ ...zuume, fontSize: '72px', lineHeight: 0.85, color: ORANGE }}>{pendingPasses}</span>
          <span style={eyebrow}>Passes awaiting approval / {pending.length} request{pending.length === 1 ? '' : 's'}</span>
        </div>
        <div style={{ background: '#fff', padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px', borderLeft: `2px solid ${INK}` }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: ORANGE }}>
            {subTab === 'approve' ? 'Approving for' : 'Sending passes for'}
          </span>
          <span style={{ ...zuume, fontSize: '34px', lineHeight: 0.95, textTransform: 'uppercase' }}>{currentEvent?.name || '—'}</span>
          {currentEvent?.date && <span style={{ fontSize: '13px', fontWeight: 600, color: MUTED }}>{longDate(currentEvent.date)}</span>}
        </div>
      </div>

      {subTab === 'approve' ? (
        <div style={{ border: `2px solid ${INK}`, background: '#fff' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 20px', padding: '12px 16px 12px 20px', background: INK, color: '#fff' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: pending.length ? 'pointer' : 'default', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!pending.length || busy} style={{ width: '18px', height: '18px', accentColor: ORANGE, cursor: 'pointer', margin: 0 }} />
              {selected.length
                ? `${selected.length} selected · ${plural(selectedPasses)} · ${passesLeft - selectedPasses} left after approval`
                : pending.length
                  ? `${pending.length} request${pending.length === 1 ? '' : 's'} waiting on you`
                  : 'All requests handled'}
            </label>
            <button
              type="button"
              className={selected.length && !busy ? 'ta-pill-btn' : undefined}
              onClick={handleBulkApprove}
              disabled={!selected.length || busy}
              style={skew(selected.length && !busy ? ORANGE : MUTED, { color: INK, padding: '10px 22px', cursor: selected.length && !busy ? 'pointer' : 'not-allowed' })}
            >
              <span style={{ ...unskew, ...zuume, fontSize: '20px', letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{busy ? 'Working...' : 'Approve selected'}</span>
            </button>
          </div>
          {eventLoading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: MUTED }}>Loading pass requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: MUTED }}>No pass requests yet for this match day.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '920px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: PASS_COLS, gap: '16px', alignItems: 'center', padding: '12px 20px', borderBottom: `2px solid ${INK}`, ...eyebrow }}>
                  <span></span><span>Name</span><span>Phone</span><span># Passes</span><span>Message</span><span style={{ textAlign: 'right' }}>Status</span>
                </div>
                {requests.map(r => {
                  const isPending = r.status === 'pending';
                  const checked = selected.includes(r.id);
                  const canApprove = (r.numPasses || 0) <= passesLeft;
                  return (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: PASS_COLS, gap: '16px', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${RULE}`, background: checked ? '#fbeee6' : '#fff', opacity: isPending || canRetry(passDelivery(r)) ? 1 : 0.6 }}>
                      <span style={{ display: 'flex' }}>
                        {isPending && (
                          <input type="checkbox" checked={checked} onChange={() => toggleRequest(r)} disabled={busy} style={{ width: '18px', height: '18px', accentColor: ORANGE, cursor: 'pointer', margin: 0 }} />
                        )}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>{r.name}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{r.phoneNumber}</span>
                      <span style={{ ...zuume, fontSize: '28px', lineHeight: 1 }}>{r.numPasses}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.5, color: MUTED }}>{r.note ? `“${r.note}”` : '—'}</span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        {isPending ? (
                          <>
                            <button type="button" className="ta-ghost-btn" onClick={() => handleSingle(r, 'declined')} disabled={busy} style={{ ...ghostBtn, borderColor: RED, color: RED, cursor: busy ? 'not-allowed' : 'pointer' }}>Decline</button>
                            <button
                              type="button"
                              className={canApprove && !busy ? 'ta-ghost-btn' : undefined}
                              onClick={() => handleSingle(r, 'approved')}
                              disabled={!canApprove || busy}
                              title={canApprove ? undefined : 'Not enough passes left'}
                              style={{ ...ghostBtn, ...(canApprove ? {} : { borderColor: RULE, color: '#8a857a' }), cursor: canApprove && !busy ? 'pointer' : 'not-allowed' }}
                            >
                              {canApprove ? 'Approve' : 'Not enough'}
                            </button>
                          </>
                        ) : (
                          <>
                            {statusTag(r.status)}
                            {r.status === 'approved' && deliveryLine(r)}
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSend} style={{ border: `2px solid ${INK}`, background: '#fff', maxWidth: '640px' }}>
          <div style={{ padding: '16px 24px', background: INK, color: '#fff', ...zuume, fontSize: '26px', lineHeight: 1, letterSpacing: '.04em', textTransform: 'uppercase' }}>Send Passes Directly</div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.6, color: MUTED }}>Enter recipient details to send passes on WhatsApp. These count against your allowance.</p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={eyebrow}>Name</span>
              <input className="ta-textarea" value={sendForm.name} onChange={e => setSendForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter full name" disabled={busy} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={eyebrow}>Phone Number</span>
              <input className="ta-textarea" type="tel" value={sendForm.phone} onChange={e => setSendForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" disabled={busy} style={inputStyle} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: MUTED }}>Enter a 10-digit number (e.g. 9876543210)</span>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={eyebrow}>Number of Passes (max {MAX_SEND})</span>
              <input className="ta-textarea" inputMode="numeric" maxLength={1} value={sendForm.count} onChange={e => setSendForm(f => ({ ...f, count: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="1" disabled={busy} style={{ ...inputStyle, maxWidth: '120px' }} />
            </label>
            <button type="submit" disabled={busy} className={busy ? undefined : 'ta-dark-btn'} style={skew(INK, { alignSelf: 'flex-start', color: '#fff', padding: '12px 26px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 })}>
              <span style={{ ...unskew, ...zuume, fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>{busy ? 'Sending...' : 'Send Passes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
