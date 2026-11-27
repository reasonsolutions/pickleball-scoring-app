import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

const ISSUED = ['approved', 'confirmed'];
const REJECTED = ['declined', 'rejected'];

const num = (v) => Number(v) || 0;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};
const timeLabel = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayLabel = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Hit rate colour bands
const rateTone = (rate) => (rate >= 75 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-rose-500');
const rateBar = (rate) => (rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500');

export function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, accent = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

function Ring({ value, size = 184, stroke = 16 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(Math.min(100, value)));
    return () => cancelAnimationFrame(t);
  }, [value]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <defs>
        <linearGradient id="hitRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#hitRing)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)' }}
      />
    </svg>
  );
}

// Column chart with an optional cumulative line drawn over it
function Columns({ data, cumulative = false, color = 'bg-orange-400', empty }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) {
    return <div className="h-56 flex items-center justify-center text-sm text-gray-400">{empty}</div>;
  }
  let run = 0;
  const points = data.map((d, i) => {
    run += d.value;
    return `${((i + 0.5) / data.length) * 100},${100 - (run / total) * 100}`;
  }).join(' ');
  const every = Math.ceil(data.length / 8);

  return (
    <div>
      <div className="relative h-56">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-gray-100" />)}
        </div>
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((d, i) => (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div
                className={`w-full rounded-t-md ${color} opacity-80 group-hover:opacity-100 transition-all duration-700`}
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow">
                {d.label}: <span className="font-semibold">{d.value}</span>
              </div>
            </div>
          ))}
        </div>
        {cumulative && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#111827" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-400 truncate">{i % every === 0 ? d.label : ''}</div>
        ))}
      </div>
    </div>
  );
}

// showContacts: false hides phone numbers (the gate scanner page is public)
export default function PassAnalytics({ eventId, passes, allTeams, teamAllocations, showContacts = true }) {
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scansError, setScansError] = useState(false);

  // One doc per admitted pass number lives under each pass; only passes that have been scanned need reading
  useEffect(() => {
    let cancelled = false;
    const scanned = passes.filter(p => ISSUED.includes(p.status) && num(p.scannedCount) > 0);
    Promise.all(scanned.map(p => getDocs(collection(db, 'ticketing', eventId, 'passes', p.id, 'scans'))))
      .then(snaps => {
        if (cancelled) return;
        setScans(snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))));
        setScansError(false);
      })
      .catch(err => {
        console.error('Error fetching scans:', err);
        if (!cancelled) setScansError(true);
      })
      .finally(() => !cancelled && setScansLoading(false));
    return () => { cancelled = true; };
  }, [eventId, passes]);

  const stats = useMemo(() => {
    const sum = (list) => list.reduce((s, p) => s + num(p.numPasses), 0);
    const issuedReqs = passes.filter(p => ISSUED.includes(p.status));
    const rejectedReqs = passes.filter(p => REJECTED.includes(p.status));
    const pendingReqs = passes.filter(p => p.status === 'pending');

    const requested = sum(passes);
    const issued = sum(issuedReqs);
    const rejected = sum(rejectedReqs);
    const pending = sum(pendingReqs);
    const scanned = issuedReqs.reduce((s, p) => s + Math.min(num(p.scannedCount), num(p.numPasses)), 0);
    const totalAllocated = Object.values(teamAllocations).reduce((s, v) => s + num(v), 0);

    // Per team
    const names = Object.fromEntries(allTeams.map(t => [t.id, t.name]));
    const byTeam = {};
    passes.forEach(p => {
      const key = p.teamId || p.team || 'unknown';
      const t = byTeam[key] ||= { id: key, name: names[p.teamId] || p.team || 'No team', requested: 0, issued: 0, scanned: 0, rejected: 0 };
      t.requested += num(p.numPasses);
      if (ISSUED.includes(p.status)) {
        t.issued += num(p.numPasses);
        t.scanned += Math.min(num(p.scannedCount), num(p.numPasses));
      }
      if (REJECTED.includes(p.status)) t.rejected += num(p.numPasses);
    });
    allTeams.forEach(t => {
      byTeam[t.id] ||= { id: t.id, name: t.name, requested: 0, issued: 0, scanned: 0, rejected: 0 };
    });
    const teams = Object.values(byTeam).map(t => ({
      ...t,
      allocated: num(teamAllocations[t.id]),
      hitRate: pct(t.scanned, t.issued),
    }));

    // Biggest unused issued requests - who to chase
    const noShows = issuedReqs
      .map(p => ({ ...p, unused: num(p.numPasses) - Math.min(num(p.scannedCount), num(p.numPasses)) }))
      .filter(p => p.unused > 0)
      .sort((a, b) => b.unused - a.unused)
      .slice(0, 6);

    // Requests per day (in passes)
    const perDay = {};
    passes.forEach(p => {
      const d = toDate(p.createdAt);
      if (!d) return;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      perDay[key] = (perDay[key] || 0) + num(p.numPasses);
    });
    const demand = Object.keys(perDay).map(Number).sort((a, b) => a - b)
      .map(k => ({ label: dayLabel(new Date(k)), value: perDay[k] }));

    return {
      requests: passes.length, requested, issued, rejected, pending, scanned, totalAllocated,
      hitRate: pct(scanned, issued),
      approvalRate: pct(issued, issued + rejected),
      avgPerRequest: passes.length ? Math.round((requested / passes.length) * 10) / 10 : 0,
      teams, noShows, demand,
    };
  }, [passes, allTeams, teamAllocations]);

  const scanStats = useMemo(() => {
    const times = scans.map(s => ({ ...s, at: toDate(s.scannedAt) })).filter(s => s.at).sort((a, b) => a.at - b.at);
    const duplicates = scans.reduce((s, x) => s + num(x.duplicateAttempts), 0);

    let arrivals = [];
    let peak = null;
    if (times.length) {
      const first = times[0].at.getTime();
      const span = times[times.length - 1].at.getTime() - first;
      const step = (span <= 3 * 3600e3 ? 10 : span <= 8 * 3600e3 ? 30 : 60) * 60e3;
      const start = Math.floor(first / step) * step;
      const buckets = Math.floor((times[times.length - 1].at.getTime() - start) / step) + 1;
      arrivals = Array.from({ length: buckets }, (_, i) => ({ label: timeLabel(new Date(start + i * step)), value: 0 }));
      times.forEach(s => { arrivals[Math.floor((s.at.getTime() - start) / step)].value += 1; });
      peak = arrivals.reduce((a, b) => (b.value > a.value ? b : a));
    }

    const gates = {};
    scans.forEach(s => {
      const k = s.scannedByName || 'Unknown';
      gates[k] = (gates[k] || 0) + 1;
    });

    return {
      arrivals, peak, duplicates,
      firstIn: times[0]?.at, lastIn: times[times.length - 1]?.at,
      gates: Object.entries(gates).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [scans]);

  const funnel = [
    { label: 'Requested', value: stats.requested, color: 'bg-slate-400' },
    { label: 'Issued', value: stats.issued, color: 'bg-orange-400' },
    { label: 'Scanned in', value: stats.scanned, color: 'bg-emerald-500' },
  ];
  const teamsByIssued = [...stats.teams].filter(t => t.issued > 0).sort((a, b) => b.issued - a.issued);
  const allocTeams = [...stats.teams].filter(t => t.allocated > 0 || t.issued > 0).sort((a, b) => b.allocated - a.allocated);
  const maxGate = Math.max(1, ...scanStats.gates.map(g => g.count));
  const unused = stats.issued - stats.scanned;

  return (
    <div className="mt-6 space-y-6">
      {/* Hero: hit rate */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-orange-950 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="relative mx-auto h-[184px] w-[184px]">
            <Ring value={stats.hitRate} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums">{stats.hitRate}<span className="text-2xl text-white/60">%</span></span>
              <span className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">Hit rate</span>
            </div>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-300">Gate performance</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">
              {stats.scanned} of {stats.issued} issued passes scanned in
            </h2>
            <p className="mt-2 text-white/60 text-sm">Hit rate is the share of issued passes that were scanned at the gate.</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['Scanned in', stats.scanned, 'text-emerald-400'],
                ['Not used yet', unused, 'text-rose-300'],
                ['Peak arrivals', scanStats.peak ? `${scanStats.peak.value} @ ${scanStats.peak.label}` : '—', 'text-white'],
                ['Duplicate scans', scansLoading ? '…' : scanStats.duplicates, 'text-amber-300'],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/50">{label}</p>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Passes requested" value={stats.requested} hint={`${stats.requests} requests · ${stats.avgPerRequest} avg each`} />
        <Stat label="Approval rate" value={`${stats.approvalRate}%`} accent="text-orange-500" hint={`${stats.issued} issued · ${stats.rejected} rejected`} />
        <Stat label="Pending" value={stats.pending} accent="text-amber-500" hint="passes awaiting a decision" />
        <Stat
          label="Allocation used"
          value={`${pct(stats.issued, stats.totalAllocated)}%`}
          accent="text-blue-600"
          hint={stats.totalAllocated ? `${stats.issued} of ${stats.totalAllocated} allocated` : 'no allocations set'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Arrivals */}
        <Card
          className="lg:col-span-2"
          title="Arrivals at the gate"
          subtitle={scanStats.firstIn ? `First in ${timeLabel(scanStats.firstIn)} · last in ${timeLabel(scanStats.lastIn)} · line shows cumulative` : 'Scans over time'}
        >
          {scansError ? (
            <div className="h-56 flex items-center justify-center text-sm text-rose-500">Couldn't load scan records.</div>
          ) : scansLoading ? (
            <div className="h-56 animate-pulse rounded-xl bg-gray-50" />
          ) : (
            <Columns data={scanStats.arrivals} cumulative color="bg-gradient-to-t from-orange-500 to-amber-300" empty="No scans yet" />
          )}
        </Card>

        {/* Funnel */}
        <Card title="Pass funnel" subtitle="From request to the gate">
          <div className="space-y-5">
            {funnel.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-gray-700">{f.label}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-gray-900">{f.value}</span>
                    {i > 0 && <span className="ml-2 text-xs text-gray-400">{pct(f.value, funnel[i - 1].value)}%</span>}
                  </span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${f.color} transition-all duration-1000`} style={{ width: `${pct(f.value, stats.requested)}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-rose-50 px-3 py-2">
                <p className="text-xs text-rose-600">Rejected</p>
                <p className="font-semibold text-rose-700 tabular-nums">{stats.rejected}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-600">Pending</p>
                <p className="font-semibold text-amber-700 tabular-nums">{stats.pending}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Hit rate by team */}
      <Card title="Hit rate by team" subtitle="Scanned vs issued passes for each team">
        {teamsByIssued.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No passes issued yet</p>
        ) : (
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            {teamsByIssued.map(t => (
              <div key={t.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-gray-800 truncate pr-3">{t.name}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    <span className="text-gray-500">{t.scanned}/{t.issued}</span>
                    <span className={`ml-2 font-semibold ${rateTone(t.hitRate)}`}>{t.hitRate}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${rateBar(t.hitRate)} transition-all duration-1000`} style={{ width: `${t.hitRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Allocation usage */}
        <Card title="Allocation usage" subtitle="Issued against each team's allocation">
          {allocTeams.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No allocations set</p>
          ) : (
            <div className="space-y-4">
              {allocTeams.map(t => {
                const over = t.allocated > 0 && t.issued > t.allocated;
                const width = t.allocated ? Math.min(100, pct(t.issued, t.allocated)) : 100;
                return (
                  <div key={t.id}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-gray-800 truncate pr-3">{t.name}</span>
                      <span className={`whitespace-nowrap tabular-nums ${over ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
                        {t.issued} / {t.allocated || '—'}{over && ' · over'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-blue-500'} transition-all duration-1000`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Demand */}
        <Card title="Request demand" subtitle="Passes requested per day">
          <Columns data={stats.demand} color="bg-gradient-to-t from-slate-700 to-slate-400" empty="No requests yet" />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unused passes */}
        <Card title="Most unused passes" subtitle="Issued requests with passes not yet scanned">
          {stats.noShows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Every issued pass has been scanned</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.noShows.map(p => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500 truncate">{p.team || 'No team'}{showContacts && p.phoneNumber ? ` · ${p.phoneNumber}` : ''}</p>
                  </div>
                  <div className="text-right whitespace-nowrap pl-4">
                    <p className="font-semibold text-rose-600 tabular-nums">{p.unused} unused</p>
                    <p className="text-xs text-gray-400 tabular-nums">{num(p.scannedCount)}/{num(p.numPasses)} scanned</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Gate staff */}
        <Card title="Scans by gate staff" subtitle="Who admitted how many">
          {scansLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-gray-50" />
          ) : scanStats.gates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No scans yet</p>
          ) : (
            <div className="space-y-4">
              {scanStats.gates.map(g => (
                <div key={g.name} className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800 truncate pr-3">{g.name}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{g.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400 transition-all duration-1000" style={{ width: `${(g.count / maxGate) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
