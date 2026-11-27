import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  doc, collection, getDocs, query, where, orderBy, limit, onSnapshot, addDoc, runTransaction, serverTimestamp, increment
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getMatchDayById, getPassesByMatchDay } from '../services/ticketingService';
import PassAnalytics from '../components/PassAnalytics';

const READER_ID = 'pass-scanner-reader';
let readerSeq = 0;
const RESULT_MS = 3000;       // how long a result stays up before scanning resumes
const SAME_CODE_MS = 5000;    // ignore the same QR held in front of the camera after its result

const RESULT_STYLES = {
  valid: { bg: 'bg-green-600', title: 'VALID — LET IN' },
  already_scanned: { bg: 'bg-red-600', title: 'ALREADY SCANNED' },
  invalid: { bg: 'bg-red-600', title: 'INVALID PASS' },
  error: { bg: 'bg-gray-700', title: 'COULD NOT CHECK' }
};

// Short beep (or low buzz for a rejection) plus a vibration, so the guard doesn't need to look
function feedback(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ok ? 'sine' : 'square';
    osc.frequency.value = ok ? 1200 : 220;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.15 : 0.5));
    osc.onended = () => ctx.close();
  } catch { /* no audio available */ }
  navigator.vibrate?.(ok ? 100 : [200, 100, 200]);
}

const VALID_STATUSES = ['approved', 'confirmed'];
const REFRESH_MS = 30000;     // how often the admitted count picks up other gates' scans
const CCPL_TEAM = { id: 'CCPL_SUPERADMIN_TEAM', name: 'CCPL' };  // passes sent by super admins

/**
 * Pull passId / passNumber (and eventId if present) out of a scan.
 * Accepts the JSON QR from the WhatsApp PDFs and the admin Pass QR Codes modal, or manual entry.
 */
function parseScan({ qrText, passId, passNumber }) {
  let qrEventId = null;
  if (typeof qrText === 'string') {
    let qr;
    try {
      qr = JSON.parse(qrText);
    } catch {
      return null;
    }
    if (!qr || typeof qr !== 'object') return null;
    ({ passId, passNumber } = qr);
    qrEventId = typeof qr.eventId === 'string' ? qr.eventId : null;
  }
  passNumber = Number(passNumber);
  if (typeof passId !== 'string' || !/^[A-Za-z0-9]{1,64}$/.test(passId)) return null;
  if (!Number.isInteger(passNumber) || passNumber < 1) return null;
  return { passId, passNumber, qrEventId };
}

/**
 * Admit one pass number. Each admitted pass number gets its own doc at
 * ticketing/{eventId}/passes/{passId}/scans/{passNumber}, created inside a transaction, so the same
 * number can't get in twice even from two gates at once. firestore.rules enforces the same checks
 * (scanner account, approved pass, number in range, create-once).
 */
// scannedBy value for scans made without logging in (must match firestore.rules)
const PUBLIC_SCANNER = 'public';

async function admitPass(eventId, scan, user) {
  const parsed = parseScan(scan);
  if (!parsed) return { result: 'invalid', reason: 'Not a Centre Court pass QR.' };
  const { passId, passNumber, qrEventId } = parsed;
  if (qrEventId && qrEventId !== eventId) {
    return { result: 'invalid', reason: 'This pass is for a different match day.' };
  }

  const passRef = doc(db, 'ticketing', eventId, 'passes', passId);
  const scanRef = doc(passRef, 'scans', String(passNumber));

  return runTransaction(db, async (tx) => {
    const passSnap = await tx.get(passRef);
    if (!passSnap.exists()) return { result: 'invalid', reason: 'Pass not found for this match day.' };

    const pass = passSnap.data();
    const totalPasses = Number(pass.numPasses) || 0;
    const holder = { name: pass.name || '', team: pass.team || '', passNumber, totalPasses };

    if (!VALID_STATUSES.includes(pass.status)) {
      return { ...holder, result: 'invalid', reason: `Pass is ${pass.status || 'not approved'}.` };
    }
    if (passNumber > totalPasses) {
      return { ...holder, result: 'invalid', reason: `Pass ${passNumber} does not exist (only ${totalPasses} issued).` };
    }

    const scanSnap = await tx.get(scanRef);
    if (scanSnap.exists()) {
      const first = scanSnap.data();
      tx.update(scanRef, {
        duplicateAttempts: (Number(first.duplicateAttempts) || 0) + 1,
        lastDuplicateAt: serverTimestamp(),
        lastDuplicateBy: user?.uid || PUBLIC_SCANNER
      });
      return {
        ...holder,
        result: 'already_scanned',
        scannedAt: first.scannedAt?.toDate?.().toISOString() || null,
        scannedByName: first.scannedByName || ''
      };
    }

    tx.set(scanRef, {
      eventId,
      passId,
      passNumber,
      name: pass.name || '',
      team: pass.team || '',
      scannedAt: serverTimestamp(),
      scannedBy: user?.uid || PUBLIC_SCANNER,
      scannedByName: user?.name || user?.displayName || user?.email || 'Gate',
      duplicateAttempts: 0
    });
    tx.update(passRef, { scannedCount: increment(1), lastScannedAt: serverTimestamp() });
    return { ...holder, result: 'valid' };
  });
}

// Every scan attempt (valid, duplicate, invalid, error) is logged to ticketing/{eventId}/scanLog so
// all devices on this scanner share the same recent-scans list. firestore.rules checks the shape.
const LOG_LIMIT = 30;
const LOG_RESULTS = ['valid', 'already_scanned', 'invalid', 'error'];

function logScan(eventId, res, user) {
  const entry = {
    result: LOG_RESULTS.includes(res.result) ? res.result : 'error',
    name: res.name || '',
    team: res.team || '',
    reason: res.reason || '',
    passNumber: Number.isInteger(res.passNumber) ? res.passNumber : 0,
    totalPasses: Number(res.totalPasses) || 0,
    scannedBy: user?.uid || PUBLIC_SCANNER,
    scannedByName: user?.name || user?.displayName || user?.email || 'Gate',
    at: serverTimestamp()
  };
  // Not awaited: the gate result shouldn't wait on the log, and offline writes are queued
  addDoc(collection(db, 'ticketing', eventId, 'scanLog'), entry).catch((err) => console.error('Scan log failed:', err));
}

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

// Compare phone numbers on digits only; with a full number, match on the last 10 digits so
// +91 / 0 prefixes don't matter, otherwise treat the input as a partial number.
const phoneDigits = (v) => String(v || '').replace(/\D/g, '');
function phoneMatches(stored, input) {
  const a = phoneDigits(stored);
  const b = phoneDigits(input);
  if (!a || !b) return false;
  return b.length >= 10 ? a.slice(-10) === b.slice(-10) : a.includes(b);
}

const MIN_SEARCH_DIGITS = 4;
const SEARCH_DEBOUNCE_MS = 250;

// Search tab: every pass request for a phone number, with issued vs scanned counts and scan times
function PhoneSearch({ eventId, passes }) {
  const [input, setInput] = useState('');
  const [searched, setSearched] = useState('');
  const [scansByPass, setScansByPass] = useState({});
  const [loadingScans, setLoadingScans] = useState(false);

  const matches = searched
    ? passes.filter((p) => phoneMatches(p.phoneNumber, searched))
    : [];
  const valid = matches.filter((p) => VALID_STATUSES.includes(p.status));
  const totalGiven = valid.reduce((sum, p) => sum + (Number(p.numPasses) || 0), 0);
  const totalScanned = valid.reduce((sum, p) => sum + (Number(p.scannedCount) || 0), 0);
  const matchIds = valid.map((p) => p.id).join(',');

  // Scan times for each approved match
  useEffect(() => {
    if (!matchIds) { setScansByPass({}); return undefined; }
    let cancelled = false;
    setLoadingScans(true);
    Promise.all(matchIds.split(',').map((passId) =>
      getDocs(collection(db, 'ticketing', eventId, 'passes', passId, 'scans')).then((snap) => [
        passId,
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              passNumber: Number(data.passNumber) || Number(d.id),
              scannedAt: data.scannedAt?.toDate?.().toISOString() || null,
              scannedByName: data.scannedByName || ''
            };
          })
          .sort((a, b) => a.passNumber - b.passNumber)
      ])
    )).then((entries) => {
      if (!cancelled) setScansByPass(Object.fromEntries(entries));
    }).catch((err) => console.error('Error loading scans:', err))
      .finally(() => { if (!cancelled) setLoadingScans(false); });
    return () => { cancelled = true; };
  }, [eventId, matchIds]);

  // Results follow the input as you type; the short delay avoids refetching scans on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearched(phoneDigits(input).length >= MIN_SEARCH_DIGITS ? input : '');
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex-1">
      <input
        type="tel"
        inputMode="tel"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Phone number"
        className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder-white/40"
      />
      <p className="mt-2 text-xs text-white/40">Results appear after {MIN_SEARCH_DIGITS} digits.</p>

      {searched && matches.length === 0 && (
        <p className="mt-6 text-white/60 text-sm">No passes found for {searched}.</p>
      )}

      {matches.length > 0 && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 py-3">
              <p className="text-2xl font-bold tabular-nums">{totalGiven}</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Given</p>
            </div>
            <div className="rounded-lg bg-white/5 py-3">
              <p className="text-2xl font-bold tabular-nums text-green-400">{totalScanned}</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Scanned</p>
            </div>
            <div className="rounded-lg bg-white/5 py-3">
              <p className="text-2xl font-bold tabular-nums">{Math.max(totalGiven - totalScanned, 0)}</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Remaining</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {matches.map((p) => {
              const isValid = VALID_STATUSES.includes(p.status);
              const scans = scansByPass[p.id] || [];
              return (
                <li key={p.id} className="rounded-lg bg-white/5 px-3 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name || 'Unnamed'}</p>
                      <p className="text-white/50 text-xs truncate">{p.team || 'No team'} · {p.phoneNumber}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold capitalize ${isValid ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {p.status || 'pending'}
                    </span>
                  </div>
                  <p className="mt-2 tabular-nums">
                    {Number(p.scannedCount) || 0} of {Number(p.numPasses) || 0} scanned
                  </p>
                  {isValid && scans.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-white/60">
                      {scans.map((s) => (
                        <li key={s.passNumber}>
                          Pass {s.passNumber} · {formatTime(s.scannedAt)}{s.scannedByName ? ` · ${s.scannedByName}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isValid && scans.length === 0 && !loadingScans && (Number(p.scannedCount) || 0) === 0 && (
                    <p className="mt-1 text-xs text-white/40">Not scanned yet.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default function PassScanner() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('scan'); // 'scan', 'search' or 'analytics'
  const [matchDay, setMatchDay] = useState(null);
  const [passes, setPasses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [totalIssued, setTotalIssued] = useState(0);
  const [admitted, setAdmitted] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [log, setLog] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualNumber, setManualNumber] = useState('1');

  const lockRef = useRef(false);
  const lastCodeRef = useRef({ text: '', at: 0 });
  const resultTimerRef = useRef(null);
  const readerRef = useRef(null);
  const userRef = useRef(currentUser);  // read via ref so a profile refresh doesn't restart the camera
  userRef.current = currentUser;

  // Match day details, issued total, and admitted count (refreshed so other gates' scans show up)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [md, passes] = await Promise.all([getMatchDayById(id), getPassesByMatchDay(id)]);
      if (cancelled) return;
      const issued = passes.filter((p) => VALID_STATUSES.includes(p.status));
      setMatchDay(md);
      setPasses(passes);
      setTotalIssued(issued.reduce((sum, p) => sum + (Number(p.numPasses) || 0), 0));
      setAdmitted(issued.reduce((sum, p) => sum + (Number(p.scannedCount) || 0), 0));
    };
    load().catch((err) => console.error('Error loading match day:', err));
    const timer = setInterval(() => load().catch(() => {}), REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [id]);

  // Recent scans from every device, live
  useEffect(() => {
    const q = query(collection(db, 'ticketing', id, 'scanLog'), orderBy('at', 'desc'), limit(LOG_LIMIT));
    return onSnapshot(q, (snap) => {
      setLog(snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        return { id: d.id, ...data, at: data.at?.toDate?.().toISOString() || null };
      }));
    }, (err) => console.error('Error loading scan log:', err));
  }, [id]);

  // Teams and allocations, for the analytics tab
  useEffect(() => {
    if (!matchDay?.tournamentId) return;
    let cancelled = false;
    Promise.all([
      getDocs(query(collection(db, 'teams'), where('tournamentId', '==', matchDay.tournamentId))),
      getDocs(collection(db, 'ticketing', id, 'allocation'))
    ]).then(([teamsSnap, allocSnap]) => {
      if (cancelled) return;
      const list = teamsSnap.docs
        .map((d) => ({ id: d.id, name: d.data().name }))
        .filter((t) => t.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setTeams([...list, CCPL_TEAM]);
      setAllocations(Object.fromEntries(allocSnap.docs.map((d) => [d.id, d.data().allocated || 0])));
    }).catch((err) => console.error('Error loading teams:', err));
    return () => { cancelled = true; };
  }, [id, matchDay?.tournamentId]);

  const check = useCallback(async (payload) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    clearTimeout(resultTimerRef.current);

    let res;
    try {
      res = await admitPass(id, payload, userRef.current);
      if (res.result === 'valid') setAdmitted((n) => n + 1);
    } catch (err) {
      console.error('Scan failed:', err);
      res = err?.code === 'permission-denied'
        ? { result: 'error', reason: 'This account is not allowed to scan passes.' }
        : { result: 'error', reason: 'Check your connection and scan again.' };
    }

    feedback(res.result === 'valid');
    setResult(res);
    setBusy(false);
    logScan(id, res, userRef.current);

    resultTimerRef.current = setTimeout(() => {
      setResult(null);
      lockRef.current = false;
    }, RESULT_MS);
  }, [id]);

  const dismissResult = () => {
    clearTimeout(resultTimerRef.current);
    setResult(null);
    lockRef.current = false;
  };

  // Camera. Each run gets its own element, and cleanup waits for start() to settle before stopping,
  // so a run that's torn down mid-start (React StrictMode runs effects twice) can't leave a second
  // camera feed behind.
  useEffect(() => {
    if (tab !== 'scan') return undefined;
    const el = document.createElement('div');
    el.id = `${READER_ID}-${++readerSeq}`;
    el.className = 'w-full h-full';
    readerRef.current?.appendChild(el);
    const scanner = new Html5Qrcode(el.id);

    const starting = scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
      (text) => {
        const now = Date.now();
        if (text === lastCodeRef.current.text && now - lastCodeRef.current.at < SAME_CODE_MS) return;
        if (lockRef.current) return;
        lastCodeRef.current = { text, at: now };
        check({ qrText: text });
      },
      () => { /* no QR in this frame */ }
    ).then(() => true, (err) => {
      console.error('Camera error:', err);
      setCameraError('Camera unavailable. Allow camera access for this site, or use manual entry.');
      return false;
    });

    return () => {
      clearTimeout(resultTimerRef.current);
      starting
        .then((started) => (started ? scanner.stop() : null))
        .catch(() => {})
        .finally(() => el.remove());
    };
  }, [check, tab]);

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    check({ passId: manualId.trim(), passNumber: Number(manualNumber) });
  };

  const style = result ? RESULT_STYLES[result.result] || RESULT_STYLES.error : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="min-w-0 pr-2">
          <p className="text-xs uppercase tracking-wider text-white/50">Gate Scanner</p>
          <p className="font-semibold truncate">{matchDay?.name || 'Loading…'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-white/50">Admitted</p>
          <p className="font-bold tabular-nums">{admitted}<span className="text-white/50">/{totalIssued}</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[['scan', 'Scanner'], ['search', 'Search'], ['analytics', 'Analytics']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-orange-500 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' && <PhoneSearch eventId={id} passes={passes} />}

      {tab === 'analytics' && (
        <div className="flex-1 bg-gray-50 text-gray-900 px-4 pb-8">
          <div className="max-w-6xl mx-auto">
            <PassAnalytics eventId={id} passes={passes} allTeams={teams} teamAllocations={allocations} showContacts={!!currentUser} />
          </div>
        </div>
      )}

      {tab === 'scan' && (<>
      {/* Camera */}
      <div className="relative w-full max-w-md mx-auto">
        <div ref={readerRef} className="w-full bg-black aspect-square overflow-hidden" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/80 bg-black">
            {cameraError}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold">
            Checking…
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <button onClick={() => setShowManual((v) => !v)} className="text-sm text-white/70 underline">
          {showManual ? 'Hide manual entry' : 'QR won\'t scan? Enter pass manually'}
        </button>
        {showManual && (
          <form onSubmit={submitManual} className="mt-3 flex gap-2">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Pass ID"
              className="flex-1 min-w-0 rounded-lg bg-white/10 px-3 py-2 text-white placeholder-white/40"
            />
            <input
              type="number"
              min="1"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              className="w-16 rounded-lg bg-white/10 px-3 py-2 text-white"
              aria-label="Pass number"
            />
            <button type="submit" className="rounded-lg bg-white text-gray-900 px-4 py-2 font-semibold">Check</button>
          </form>
        )}
      </div>

      {/* Recent scans from all devices */}
      <div className="w-full max-w-md mx-auto px-4 pb-6 flex-1">
        <p className="text-xs uppercase tracking-wider text-white/50 mb-2">Recent scans · all devices</p>
        {log.length === 0 && <p className="text-white/40 text-sm">No scans yet.</p>}
        <ul className="space-y-2">
          {log.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{entry.name || entry.reason || 'Unknown'}</p>
                <p className="text-white/50 text-xs">
                  {entry.passNumber ? `Pass ${entry.passNumber}/${entry.totalPasses} · ` : ''}{formatTime(entry.at)}
                  {entry.scannedByName ? ` · ${entry.scannedByName}` : ''}
                </p>
              </div>
              <span className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${entry.result === 'valid' ? 'bg-green-600' : entry.result === 'error' ? 'bg-gray-600' : 'bg-red-600'}`}>
                {entry.result === 'valid' ? 'IN' : entry.result === 'already_scanned' ? 'DUPLICATE' : entry.result === 'error' ? 'ERROR' : 'INVALID'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      </>)}

      {/* Full-screen result */}
      {result && (
        <button onClick={dismissResult} className={`fixed inset-0 z-50 ${style.bg} flex flex-col items-center justify-center p-6 text-center`}>
          <p className="text-4xl font-black tracking-tight">{style.title}</p>
          {result.name && <p className="mt-6 text-3xl font-bold">{result.name}</p>}
          {result.team && <p className="mt-1 text-xl text-white/85">{result.team}</p>}
          {result.passNumber && result.totalPasses > 0 && (
            <p className="mt-4 text-2xl font-semibold">Pass {result.passNumber} of {result.totalPasses}</p>
          )}
          {result.result === 'already_scanned' && (
            <p className="mt-6 text-lg">
              First scanned {formatTime(result.scannedAt)}{result.scannedByName ? ` by ${result.scannedByName}` : ''}
            </p>
          )}
          {result.reason && <p className="mt-6 text-lg">{result.reason}</p>}
          <p className="mt-10 text-sm text-white/70">Tap to scan next</p>
        </button>
      )}
    </div>
  );
}
