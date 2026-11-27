import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../utils/firebase';
import { getAllMatchDays, getActiveTournamentId } from '../services/ticketingService';
import TicketingTabs from '../components/TicketingTabs';
import { Card, Stat } from '../components/PassAnalytics';

// Season-wide pass analysis across every match day of the active tournament.
// Per-match-day detail lives in MatchDayOrders → Analytics (PassAnalytics); this page compares them.

const ISSUED = ['approved', 'confirmed'];
const REJECTED = ['declined', 'rejected'];
const DAY = 864e5;

const num = (v) => Number(v) || 0;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const sumPasses = (list) => list.reduce((s, p) => s + num(p.numPasses), 0);
const scannedOf = (p) => Math.min(num(p.scannedCount), num(p.numPasses));
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Match dates are saved as 'YYYY-MM-DD' — read them as local dates, not UTC midnight
const matchDate = (v) => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = toDate(v);
  return d ? startOfDay(d) : null;
};
// One fan = one phone number (last 10 digits); fall back to name when there's no phone
const fanKey = (p) => {
  const digits = String(p.phoneNumber || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return (p.name || '').trim().toLowerCase() || null;
};
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDuration = (h) => (h == null ? '—' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h / 24)} days`);
const shortDate = (d) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const clock = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const rateTone = (rate) => (rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600');

// ---------- small visual pieces ----------

function Insight({ label, value, detail, tone = 'text-gray-900' }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">{label}</p>
      <p className={`mt-2 text-xl font-bold leading-snug ${tone}`}>{value}</p>
      {detail && <p className="mt-1 text-sm text-gray-500">{detail}</p>}
    </div>
  );
}

function HBars({ rows, empty = 'No data yet', color = 'bg-orange-400' }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (!rows.length || rows.every(r => !r.value)) {
    return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  }
  return (
    <div className="space-y-3.5">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-gray-700 truncate pr-3">{r.label}</span>
            <span className="whitespace-nowrap tabular-nums">
              <span className="font-semibold text-gray-900">{r.display ?? r.value}</span>
              {r.sub && <span className="ml-2 text-xs text-gray-400">{r.sub}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${r.color || color} transition-all duration-700`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Issued vs scanned per match day, with the hit rate drawn as a line on a 0–100% scale
function TrendChart({ mds }) {
  const max = Math.max(1, ...mds.map(m => Math.max(m.issued, m.capacity || 0)));
  const played = mds.map((m, i) => ({ m, i })).filter(x => x.m.played && x.m.issued > 0);
  const points = played.map(({ m, i }) => `${((i + 0.5) / mds.length) * 100},${100 - m.hitRate}`).join(' ');
  if (!mds.length) return <p className="py-8 text-center text-sm text-gray-400">No match days yet</p>;
  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />Issued</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />Scanned in</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-gray-900" />Hit rate</span>
      </div>
      <div className="relative h-64">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="border-t border-dashed border-gray-100" />)}
        </div>
        <div className="absolute inset-0 flex items-end gap-2">
          {mds.map(m => (
            <div key={m.id} className="group relative flex-1 h-full flex items-end justify-center gap-0.5">
              <div className="w-1/2 max-w-[28px] rounded-t bg-slate-200" style={{ height: `${(m.issued / max) * 100}%`, minHeight: m.issued ? 3 : 0 }} />
              <div className="w-1/2 max-w-[28px] rounded-t bg-orange-500" style={{ height: `${(m.scanned / max) * 100}%`, minHeight: m.scanned ? 3 : 0 }} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow">
                <p className="font-semibold">{m.name}</p>
                <p>{m.issued} issued · {m.scanned} in{m.played ? ` · ${m.hitRate}%` : ' · upcoming'}</p>
              </div>
            </div>
          ))}
        </div>
        {played.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#111827" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {mds.map(m => (
          <div key={m.id} className="flex-1 text-center text-[10px] text-gray-400 truncate" title={m.name}>{shortDate(m.date)}</div>
        ))}
      </div>
    </div>
  );
}

// New vs returning fans per match day
function NewReturning({ mds }) {
  const max = Math.max(1, ...mds.map(m => m.newFans + m.returningFans));
  if (!mds.some(m => m.newFans + m.returningFans)) return <p className="py-8 text-center text-sm text-gray-400">No requests yet</p>;
  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-300" />New</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />Returning</span>
      </div>
      <div className="flex items-end gap-2 h-48">
        {mds.map(m => {
          const total = m.newFans + m.returningFans;
          return (
            <div key={m.id} className="group relative flex-1 h-full flex flex-col justify-end items-center">
              <div className="w-full max-w-[36px] flex flex-col rounded-t overflow-hidden" style={{ height: `${(total / max) * 100}%` }}>
                <div className="bg-sky-300" style={{ flex: m.newFans }} />
                <div className="bg-indigo-600" style={{ flex: m.returningFans }} />
              </div>
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow">
                <p className="font-semibold">{m.name}</p>
                <p>{m.newFans} new · {m.returningFans} returning</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {mds.map(m => <div key={m.id} className="flex-1 text-center text-[10px] text-gray-400 truncate">{shortDate(m.date)}</div>)}
      </div>
    </div>
  );
}

// Scans per hour of the day, one row per match day
function ArrivalHeatmap({ rows, hours }) {
  const max = Math.max(1, ...rows.flatMap(r => Object.values(r.byHour)));
  if (!rows.length) return <p className="py-8 text-center text-sm text-gray-400">No scans yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th />
            {hours.map(h => <th key={h} className="text-[10px] font-medium text-gray-400 text-center">{hourLabel(h)}</th>)}
            <th className="text-[10px] font-medium text-gray-400 text-right pl-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="pr-3 text-xs text-gray-600 whitespace-nowrap max-w-[160px] truncate" title={r.name}>{shortDate(r.date)} · {r.name}</td>
              {hours.map(h => {
                const v = r.byHour[h] || 0;
                return (
                  <td key={h} title={`${r.name} · ${hourLabel(h)}: ${v} scans`}
                    className="h-8 min-w-[32px] rounded text-center text-[10px] font-medium tabular-nums"
                    style={{ background: v ? `rgba(249,115,22,${0.12 + 0.88 * (v / max)})` : '#f9fafb', color: v / max > 0.55 ? '#fff' : '#6b7280' }}>
                    {v || ''}
                  </td>
                );
              })}
              <td className="pl-2 text-right text-xs font-semibold text-gray-900 tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersonList({ people, empty, render }) {
  if (!people.length) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  return <ul className="divide-y divide-gray-100">{people.map(render)}</ul>;
}

// ---------- page ----------

export default function TicketingAnalysis() {
  const navigate = useNavigate();
  const [matchDays, setMatchDays] = useState([]);
  const [scansByMd, setScansByMd] = useState({});
  const [loading, setLoading] = useState(true);
  const [scansLoading, setScansLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tournamentId = await getActiveTournamentId();
        if (!tournamentId) {
          setError('No active tournament selected. Please select a tournament in App Settings.');
          return;
        }
        const list = await getAllMatchDays();
        const enriched = await Promise.all(list.map(async (md) => {
          const [passSnap, allocSnap] = await Promise.all([
            getDocs(collection(db, 'ticketing', md.id, 'passes')),
            getDocs(collection(db, 'ticketing', md.id, 'allocation')).catch(() => ({ docs: [] })),
          ]);
          return {
            ...md,
            passes: passSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            allocations: Object.fromEntries(allocSnap.docs.map(d => [d.id, d.data()])),
          };
        }));
        if (cancelled) return;
        setMatchDays(enriched);
        setLoading(false);

        // Scan records: one doc per admitted pass number, only under passes that were scanned
        const scanEntries = await Promise.all(enriched.map(async (md) => {
          const scanned = md.passes.filter(p => ISSUED.includes(p.status) && num(p.scannedCount) > 0);
          const snaps = await Promise.all(scanned.map(p => getDocs(collection(db, 'ticketing', md.id, 'passes', p.id, 'scans'))));
          return [md.id, snaps.flatMap(s => s.docs.map(d => d.data()))];
        }));
        if (!cancelled) setScansByMd(Object.fromEntries(scanEntries));
      } catch (err) {
        console.error('Error loading ticketing analysis:', err);
        if (!cancelled) setError('Failed to load analysis. Please try again.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setScansLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());

    // Teams are keyed by name: the same team can appear under different ids (e.g. CCPL superadmin passes)
    const idToName = {};
    matchDays.forEach(md => {
      md.passes.forEach(p => { if (p.teamId && p.team) idToName[p.teamId] = p.team; });
      Object.entries(md.allocations).forEach(([id, a]) => { if (a.teamName) idToName[id] = a.teamName; });
      if (md.hostTeamId && md.hostTeam) idToName[md.hostTeamId] = md.hostTeam;
    });
    const teamKey = (id, name) => String(name || idToName[id] || id || 'none').trim().toLowerCase();

    const mds = matchDays.map(md => {
      const date = matchDate(md.date);
      const issuedReqs = md.passes.filter(p => ISSUED.includes(p.status));
      const issued = sumPasses(issuedReqs);
      const scanned = issuedReqs.reduce((s, p) => s + scannedOf(p), 0);
      const capacity = (md.ticketTypes || []).reduce((s, t) => s + num(t.quantity), 0);
      const played = scanned > 0 || (date && date < today);
      const hostKey = md.hostTeamId || md.hostTeam ? teamKey(md.hostTeamId, md.hostTeam) : null;
      return {
        id: md.id,
        name: md.name || 'Untitled',
        date,
        deadline: matchDate(md.deadline),
        hostTeam: md.hostTeam || '—',
        hostKey,
        passes: md.passes,
        allocations: md.allocations,
        issuedReqs,
        capacity,
        played,
        requests: md.passes.length,
        requested: sumPasses(md.passes),
        issued,
        rejected: sumPasses(md.passes.filter(p => REJECTED.includes(p.status))),
        pending: sumPasses(md.passes.filter(p => p.status === 'pending')),
        scanned,
        hitRate: pct(scanned, issued),
        fill: pct(issued, capacity),
        newFans: 0,
        returningFans: 0,
      };
    }).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

    const played = mds.filter(m => m.played);
    const issuedPlayed = played.reduce((s, m) => s + m.issued, 0);
    const scannedTotal = mds.reduce((s, m) => s + m.scanned, 0);
    const totals = {
      matchDays: mds.length,
      played: played.length,
      requests: mds.reduce((s, m) => s + m.requests, 0),
      requested: mds.reduce((s, m) => s + m.requested, 0),
      issued: mds.reduce((s, m) => s + m.issued, 0),
      rejected: mds.reduce((s, m) => s + m.rejected, 0),
      pending: mds.reduce((s, m) => s + m.pending, 0),
      capacity: mds.reduce((s, m) => s + m.capacity, 0),
      scanned: scannedTotal,
      hitRate: pct(scannedTotal, issuedPlayed),
      avgCrowd: played.length ? Math.round(scannedTotal / played.length) : 0,
    };
    totals.fill = pct(totals.issued, totals.capacity);
    totals.approvalRate = pct(totals.issued, totals.issued + totals.rejected);

    // ---- Fans ----
    const fans = new Map();
    const seen = new Set();
    mds.forEach(m => {
      const here = new Set();
      m.passes.forEach(p => {
        const k = fanKey(p);
        if (!k) return;
        here.add(k);
        const f = fans.get(k) || { key: k, name: p.name, phone: p.phoneNumber, team: p.team, requested: new Set(), issued: new Set(), issuedPlayed: new Set(), attended: new Set(), passes: 0, scanned: 0 };
        f.name = p.name || f.name;
        f.team = p.team || f.team;
        f.requested.add(m.id);
        if (ISSUED.includes(p.status)) {
          f.issued.add(m.id);
          f.passes += num(p.numPasses);
          if (m.played) f.issuedPlayed.add(m.id);
          if (scannedOf(p) > 0) {
            f.attended.add(m.id);
            f.scanned += scannedOf(p);
          }
        }
        fans.set(k, f);
      });
      here.forEach(k => (seen.has(k) ? m.returningFans++ : m.newFans++));
      here.forEach(k => seen.add(k));
      m.uniqueFans = here.size;
    });
    const fanList = [...fans.values()];
    const attendees = fanList.filter(f => f.attended.size > 0);
    const loyalty = [1, 2, 3, 4].map(n => ({
      label: n === 4 ? '4+ match days' : `${n} match day${n > 1 ? 's' : ''}`,
      value: attendees.filter(f => (n === 4 ? f.attended.size >= 4 : f.attended.size === n)).length,
    }));
    const superfans = [...attendees].sort((a, b) => b.attended.size - a.attended.size || b.scanned - a.scanned).slice(0, 8);
    const ghosts = fanList.filter(f => f.issuedPlayed.size >= 2 && f.attended.size === 0)
      .sort((a, b) => b.issuedPlayed.size - a.issuedPlayed.size || b.passes - a.passes).slice(0, 8);
    const fanStats = {
      unique: fanList.length,
      attendees: attendees.length,
      repeatRate: pct(attendees.filter(f => f.attended.size >= 2).length, attendees.length),
      neverShowed: fanList.filter(f => f.issuedPlayed.size > 0 && f.attended.size === 0).length,
    };

    // ---- Teams ----
    const teams = {};
    const team = (id, name) => {
      const k = teamKey(id, name);
      return (teams[k] ||= { key: k, name: name || 'No team', requests: 0, requested: 0, issued: 0, issuedPlayed: 0, scanned: 0, allocated: 0, hosted: [] });
    };
    let hostIssued = 0, hostScanned = 0, awayIssued = 0, awayScanned = 0;
    mds.forEach(m => {
      m.passes.forEach(p => {
        const t = team(p.teamId, p.team);
        if (p.team) t.name = p.team;
        t.requests += 1;
        t.requested += num(p.numPasses);
        if (!ISSUED.includes(p.status)) return;
        t.issued += num(p.numPasses);
        if (!m.played) return;
        t.issuedPlayed += num(p.numPasses);
        t.scanned += scannedOf(p);
        if (m.hostKey && teamKey(p.teamId, p.team) === m.hostKey) {
          hostIssued += num(p.numPasses); hostScanned += scannedOf(p);
        } else {
          awayIssued += num(p.numPasses); awayScanned += scannedOf(p);
        }
      });
      Object.entries(m.allocations).forEach(([id, a]) => {
        const t = team(id, a.teamName);
        if (a.teamName && t.name === 'No team') t.name = a.teamName;
        t.allocated += num(a.allocated);
      });
      if (m.hostKey) {
        const t = team(m.hostTeamId, m.hostTeam);
        if (t.name === 'No team') t.name = m.hostTeam;
        t.hosted.push(m);
      }
    });
    const teamRows = Object.values(teams)
      .filter(t => t.requests || t.allocated || t.hosted.length)
      .map(t => {
        const hostedPlayed = t.hosted.filter(m => m.played);
        return {
          ...t,
          hitRate: pct(t.scanned, t.issuedPlayed),
          allocUse: pct(t.issued, t.allocated),
          hostedCount: t.hosted.length,
          hostCrowd: hostedPlayed.length ? Math.round(hostedPlayed.reduce((s, m) => s + m.scanned, 0) / hostedPlayed.length) : null,
        };
      })
      .sort((a, b) => b.issued - a.issued);
    const hostEffect = { hostRate: pct(hostScanned, hostIssued), awayRate: pct(awayScanned, awayIssued), hostIssued, awayIssued };

    // ---- Booking behaviour ----
    const leadBuckets = [
      { label: 'On match day', test: d => d <= 0 },
      { label: 'Day before', test: d => d === 1 },
      { label: '2–3 days before', test: d => d >= 2 && d <= 3 },
      { label: '4–7 days before', test: d => d >= 4 && d <= 7 },
      { label: '8+ days before', test: d => d >= 8 },
    ].map(b => ({ ...b, value: 0 }));
    let afterDeadline = 0;
    const turnaround = [];
    const sources = {};
    const party = [
      { label: 'Solo (1)', test: n => n === 1 },
      { label: 'Pair (2)', test: n => n === 2 },
      { label: 'Small group (3–4)', test: n => n >= 3 && n <= 4 },
      { label: 'Large group (5+)', test: n => n >= 5 },
    ].map(b => ({ ...b, requests: 0, issued: 0, scanned: 0 }));

    mds.forEach(m => {
      m.passes.forEach(p => {
        const created = toDate(p.createdAt);
        if (created && m.date) {
          const days = Math.round((m.date - startOfDay(created)) / DAY);
          leadBuckets.find(b => b.test(days)).value += 1;
        }
        if (created && m.deadline && created.getTime() >= m.deadline.getTime() + DAY) afterDeadline += 1;
        const decided = toDate(p.updatedAt);
        if (created && decided && p.status !== 'pending' && p.actionBy) {
          const h = (decided - created) / 36e5;
          if (h > 0) turnaround.push(h);
        }
        const src = p.source === 'web' ? 'Website' : 'App / admin';
        sources[src] = (sources[src] || 0) + 1;
        const n = num(p.numPasses);
        const bucket = party.find(b => b.test(n));
        if (bucket) {
          bucket.requests += 1;
          if (m.played && ISSUED.includes(p.status)) {
            bucket.issued += n;
            bucket.scanned += scannedOf(p);
          }
        }
      });
    });
    const partyRows = party.map(b => ({ ...b, hitRate: pct(b.scanned, b.issued) }));
    const lastMinute = leadBuckets[0].value + leadBuckets[1].value;
    const booking = {
      leadBuckets,
      lastMinuteShare: pct(lastMinute, totals.requests),
      afterDeadline,
      medianTurnaround: median(turnaround),
      within1h: pct(turnaround.filter(h => h <= 1).length, turnaround.length),
      decided: turnaround.length,
      sources: Object.entries(sources).map(([label, value]) => ({ label, value, sub: `${pct(value, totals.requests)}%` })),
      avgParty: totals.requests ? Math.round((totals.requested / totals.requests) * 10) / 10 : 0,
    };

    // ---- Weekday ----
    const weekday = {};
    played.forEach(m => {
      if (!m.date) return;
      const w = m.date.getDay();
      (weekday[w] ||= { count: 0, scanned: 0 });
      weekday[w].count += 1;
      weekday[w].scanned += m.scanned;
    });
    const weekdayRows = Object.entries(weekday).sort((a, b) => a[0] - b[0]).map(([w, v]) => ({
      label: WEEKDAYS[w], value: Math.round(v.scanned / v.count), sub: `${v.count} match day${v.count > 1 ? 's' : ''}`,
    }));

    // ---- Highlights ----
    const ranked = played.filter(m => m.issued >= 5);
    const best = [...ranked].sort((a, b) => b.hitRate - a.hitRate)[0];
    const worst = [...ranked].sort((a, b) => a.hitRate - b.hitRate)[0];
    const biggest = [...played].sort((a, b) => b.scanned - a.scanned)[0];
    const soldOut = mds.filter(m => m.capacity && m.issued >= m.capacity).length;

    return { mds, totals, fanStats, loyalty, superfans, ghosts, teamRows, hostEffect, booking, partyRows, weekdayRows, best, worst, biggest, soldOut };
  }, [matchDays]);

  const gate = useMemo(() => {
    const rows = [];
    const all = [];
    const staff = {};
    const halfIn = {};
    let duplicates = 0;
    stats.mds.forEach(m => {
      const scans = (scansByMd[m.id] || []).map(s => ({ ...s, at: toDate(s.scannedAt) })).filter(s => s.at).sort((a, b) => a.at - b.at);
      scans.forEach(s => {
        all.push(s);
        const k = s.scannedByName || 'Unknown';
        staff[k] = (staff[k] || 0) + 1;
      });
      (scansByMd[m.id] || []).forEach(s => { duplicates += num(s.duplicateAttempts); });
      if (scans.length) halfIn[m.id] = scans[Math.floor((scans.length - 1) / 2)].at;
      if (!scans.length) return;
      const byHour = {};
      scans.forEach(s => { const h = s.at.getHours(); byHour[h] = (byHour[h] || 0) + 1; });
      rows.push({ id: m.id, name: m.name, date: m.date, byHour, total: scans.length });
    });
    const hoursUsed = all.map(s => s.at.getHours());
    const hours = hoursUsed.length
      ? Array.from({ length: Math.max(...hoursUsed) - Math.min(...hoursUsed) + 1 }, (_, i) => Math.min(...hoursUsed) + i)
      : [];
    const hourTotals = {};
    hoursUsed.forEach(h => { hourTotals[h] = (hourTotals[h] || 0) + 1; });
    const peakHour = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0];
    const medianArrival = median(all.map(s => s.at.getHours() * 60 + s.at.getMinutes()));
    return {
      rows, hours, duplicates, halfIn,
      peakHour: peakHour ? { hour: Number(peakHour[0]), count: peakHour[1] } : null,
      medianArrival,
      staff: Object.entries(staff).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      total: all.length,
    };
  }, [stats.mds, scansByMd]);

  const exportExcel = () => {
    const rows = stats.mds.map(m => ({
      'Match Day': m.name,
      Date: m.date ? m.date.toLocaleDateString('en-IN') : '',
      Host: m.hostTeam,
      Status: m.played ? 'Played' : 'Upcoming',
      Capacity: m.capacity,
      Requests: m.requests,
      'Passes Requested': m.requested,
      'Passes Issued': m.issued,
      'Fill %': m.fill,
      'Passes Rejected': m.rejected,
      'Passes Pending': m.pending,
      'Scanned In': m.scanned,
      'Hit Rate %': m.played ? m.hitRate : '',
      'Unique Fans': m.uniqueFans,
      'New Fans': m.newFans,
      'Returning Fans': m.returningFans,
      'Half In By': gate.halfIn[m.id] ? gate.halfIn[m.id].toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '',
    }));
    const teamRows = stats.teamRows.map(t => ({
      Team: t.name, Requests: t.requests, 'Passes Requested': t.requested, 'Passes Issued': t.issued,
      Allocated: t.allocated, 'Allocation Used %': t.allocated ? t.allocUse : '', 'Scanned In': t.scanned,
      'Hit Rate %': t.issuedPlayed ? t.hitRate : '', 'Match Days Hosted': t.hostedCount, 'Avg Crowd When Hosting': t.hostCrowd ?? '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Match Days');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamRows), 'Teams');
    XLSX.writeFile(wb, `ticketing-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const { mds, totals, fanStats, booking, hostEffect } = stats;

  return (
    <div className="p-6">
      <TicketingTabs />

      <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Season Analysis</h1>
          <p className="text-gray-600">Every match day of the active tournament, compared side by side</p>
        </div>
        {!loading && mds.length > 0 && (
          <button onClick={exportExcel} className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Excel
          </button>
        )}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      ) : !error && mds.length === 0 ? (
        <div className="py-16 text-center text-gray-500">No match days yet — create one to start seeing analysis.</div>
      ) : !error && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-orange-950 text-white shadow-xl">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-orange-300">Season so far</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">
                {totals.scanned.toLocaleString('en-IN')} fans through the gate across {totals.played} of {totals.matchDays} match days
              </h2>
              <p className="mt-2 text-white/60 text-sm">
                {totals.hitRate}% of passes issued for played match days were scanned in · {fanStats.unique.toLocaleString('en-IN')} unique people requested passes
              </p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  ['Hit rate', `${totals.hitRate}%`, 'text-emerald-400'],
                  ['Avg crowd', totals.avgCrowd, 'text-white'],
                  ['Passes issued', totals.issued.toLocaleString('en-IN'), 'text-orange-300'],
                  ['Capacity filled', totals.capacity ? `${totals.fill}%` : '—', 'text-white'],
                  ['Unique fans', fanStats.unique.toLocaleString('en-IN'), 'text-sky-300'],
                  ['Came back again', `${fanStats.repeatRate}%`, 'text-indigo-300'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-white/50">{label}</p>
                    <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Insight
              label="Biggest crowd"
              value={stats.biggest ? `${stats.biggest.scanned} in · ${stats.biggest.name}` : '—'}
              detail={stats.biggest ? `${shortDate(stats.biggest.date)} · host ${stats.biggest.hostTeam}` : 'No match day played yet'}
            />
            <Insight
              label="Best & worst turnout"
              value={stats.best ? `${stats.best.hitRate}% vs ${stats.worst.hitRate}%` : '—'}
              detail={stats.best ? `${stats.best.name} showed up most, ${stats.worst.name} least` : 'Needs played match days with 5+ passes'}
            />
            <Insight
              label="Home crowd effect"
              value={hostEffect.hostIssued && hostEffect.awayIssued ? `${hostEffect.hostRate}% vs ${hostEffect.awayRate}%` : '—'}
              tone={hostEffect.hostRate >= hostEffect.awayRate ? 'text-emerald-600' : 'text-rose-600'}
              detail="Hit rate of the host team's passes vs everyone else's"
            />
            <Insight
              label="Group size effect"
              value={(() => {
                const solo = stats.partyRows[0], big = stats.partyRows[3];
                return solo.issued && big.issued ? `${solo.hitRate}% solo · ${big.hitRate}% groups` : '—';
              })()}
              detail="Do large group requests actually turn up?"
            />
            <Insight
              label="Last-minute demand"
              value={`${booking.lastMinuteShare}% of requests`}
              detail="Made on match day or the day before"
            />
            <Insight
              label="Approval speed"
              value={fmtDuration(booking.medianTurnaround)}
              detail={booking.decided ? `Median time to approve/decline · ${booking.within1h}% within an hour` : 'No decisions recorded yet'}
            />
            <Insight
              label="Peak arrival"
              value={scansLoading ? '…' : gate.peakHour ? `${clock(gate.peakHour.hour * 60)} – ${clock(gate.peakHour.hour * 60 + 60)}` : '—'}
              detail={scansLoading ? 'Loading scans' : gate.medianArrival != null ? `Median fan arrives at ${clock(gate.medianArrival)}` : 'No scans yet'}
            />
            <Insight
              label="Ghost fans"
              value={`${fanStats.neverShowed} people`}
              tone="text-rose-600"
              detail="Got passes for a played match day but never scanned in"
            />
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Pass requests" value={totals.requests.toLocaleString('en-IN')} hint={`${booking.avgParty} passes per request on average`} />
            <Stat label="Approval rate" value={`${totals.approvalRate}%`} accent="text-orange-500" hint={`${totals.rejected} passes rejected`} />
            <Stat label="Pending now" value={totals.pending} accent="text-amber-500" hint="passes awaiting a decision" />
            <Stat label="Full house" value={`${stats.soldOut}/${totals.matchDays}`} accent="text-blue-600" hint="match days that issued their full capacity" />
          </div>

          {/* Trend */}
          <Card title="Match day by match day" subtitle="Passes issued vs fans scanned in, with hit rate (line, 0–100%)">
            <TrendChart mds={mds} />
          </Card>

          {/* Comparison table */}
          <Card title="Match day comparison" subtitle="Click a match day to open its passes">
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500">
                    {['Match day', 'Host', 'Capacity', 'Issued', 'Fill', 'Scanned', 'Hit rate', 'Fans', 'New', 'Half in by'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium whitespace-nowrap ${i > 1 ? 'text-right' : ''} ${i === 0 ? 'pl-5 sm:pl-6' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mds.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 pl-5 sm:pl-6 whitespace-nowrap">
                        <button onClick={() => navigate(`/admin/ticketing/orders/${m.id}`)} className="font-medium text-blue-600 hover:underline text-left">{m.name}</button>
                        <p className="text-xs text-gray-400">{shortDate(m.date)}{m.date ? ` · ${WEEKDAYS[m.date.getDay()]}` : ''}{!m.played && <span className="ml-1.5 rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">Upcoming</span>}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{m.hostTeam}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{m.capacity || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">{m.issued}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{m.capacity ? `${m.fill}%` : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">{m.played ? m.scanned : '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${m.played ? rateTone(m.hitRate) : 'text-gray-300'}`}>{m.played && m.issued ? `${m.hitRate}%` : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{m.uniqueFans}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{m.newFans}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500 whitespace-nowrap">{scansLoading ? '…' : gate.halfIn[m.id] ? gate.halfIn[m.id].toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400">Hit rate = scanned ÷ issued. “Half in by” is when half of that day's crowd had been scanned. Fans are counted by phone number.</p>
          </Card>

          {/* Loyalty */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Fan loyalty" subtitle={`How many match days each of the ${fanStats.attendees} attending fans came to`}>
              <HBars rows={stats.loyalty.map(r => ({ ...r, sub: `${pct(r.value, fanStats.attendees)}%` }))} color="bg-indigo-500" empty="No one scanned in yet" />
            </Card>
            <Card title="New vs returning fans" subtitle="People requesting passes for the first time vs ones seen at an earlier match day">
              <NewReturning mds={mds} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Superfans" subtitle="Most match days attended">
              <PersonList
                people={stats.superfans}
                empty="No one scanned in yet"
                render={f => (
                  <li key={f.key} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{f.name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 truncate">{f.team || 'No team'}{f.phone ? ` · ${f.phone}` : ''}</p>
                    </div>
                    <div className="text-right whitespace-nowrap pl-4">
                      <p className="font-semibold text-indigo-600 tabular-nums">{f.attended.size} of {stats.totals.played}</p>
                      <p className="text-xs text-gray-400 tabular-nums">{f.scanned} passes scanned</p>
                    </div>
                  </li>
                )}
              />
            </Card>
            <Card title="Repeat no-shows" subtitle="Issued passes for 2+ played match days, never scanned in">
              <PersonList
                people={stats.ghosts}
                empty="Nobody has missed more than one match day"
                render={f => (
                  <li key={f.key} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{f.name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 truncate">{f.team || 'No team'}{f.phone ? ` · ${f.phone}` : ''}</p>
                    </div>
                    <div className="text-right whitespace-nowrap pl-4">
                      <p className="font-semibold text-rose-600 tabular-nums">0 of {f.issuedPlayed.size}</p>
                      <p className="text-xs text-gray-400 tabular-nums">{f.passes} passes issued</p>
                    </div>
                  </li>
                )}
              />
            </Card>
          </div>

          {/* Teams */}
          <Card title="Teams across the season" subtitle="Requests, allocation use and turnout per team">
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500">
                    {['Team', 'Requests', 'Issued', 'Allocated', 'Alloc. used', 'Scanned', 'Hit rate', 'Hosted', 'Crowd when hosting'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium whitespace-nowrap ${i > 0 ? 'text-right' : 'pl-5 sm:pl-6'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.teamRows.map(t => {
                    const over = t.allocated > 0 && t.issued > t.allocated;
                    return (
                      <tr key={t.key} className="hover:bg-gray-50">
                        <td className="px-4 py-3 pl-5 sm:pl-6 font-medium text-gray-900 whitespace-nowrap">{t.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-500">{t.requests}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">{t.issued}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-500">{t.allocated || '—'}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${over ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>{t.allocated ? `${t.allocUse}%` : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{t.scanned}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${t.issuedPlayed ? rateTone(t.hitRate) : 'text-gray-300'}`}>{t.issuedPlayed ? `${t.hitRate}%` : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-500">{t.hostedCount || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{t.hostCrowd ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Booking behaviour */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="When people request" subtitle={`Days before the match · ${booking.afterDeadline} after the deadline`}>
              <HBars rows={booking.leadBuckets.map(b => ({ label: b.label, value: b.value, sub: `${pct(b.value, totals.requests)}%` }))} color="bg-slate-500" />
            </Card>
            <Card title="Group size vs turnout" subtitle="Hit rate by passes per request (played match days)">
              <HBars
                rows={stats.partyRows.map(b => ({ label: b.label, value: b.hitRate, display: b.issued ? `${b.hitRate}%` : '—', sub: `${b.requests} req.`, color: b.hitRate >= 75 ? 'bg-emerald-500' : b.hitRate >= 50 ? 'bg-amber-500' : 'bg-rose-500' }))}
                empty="No played match days yet"
              />
            </Card>
            <Card title="Where requests come from" subtitle="Website vs app / admin-created">
              <HBars rows={booking.sources} color="bg-orange-400" />
            </Card>
          </div>

          {/* Gate */}
          <Card title="Arrival heatmap" subtitle={scansLoading ? 'Loading scan records…' : `${gate.total.toLocaleString('en-IN')} scans by hour of day · ${gate.duplicates} duplicate scan attempts blocked`}>
            {scansLoading ? <div className="h-40 animate-pulse rounded-xl bg-gray-50" /> : <ArrivalHeatmap rows={gate.rows} hours={gate.hours} />}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Crowd by weekday" subtitle="Average fans scanned in per played match day">
              <HBars rows={stats.weekdayRows} color="bg-sky-500" empty="No match days played yet" />
            </Card>
            <Card title="Gate staff, season total" subtitle="Who admitted how many">
              {scansLoading ? <div className="h-40 animate-pulse rounded-xl bg-gray-50" /> : <HBars rows={gate.staff} empty="No scans yet" />}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
