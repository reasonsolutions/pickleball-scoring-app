// Pure helpers that turn Firestore fixtures/players/passes into dashboard views.
// Rules follow src/utils/seasonRecords.js: a tie (fixtureGroupId) is decided once all its
// regular matches are completed and match wins aren't level. Game/Dream Breakers are extra matches.

export const toDate = (v) => {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Local calendar day key, e.g. "2026-11-07" (fixtures on one matchday carry different times). */
export const dayKey = (d) => {
  const x = toDate(d);
  if (!x) return null;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "Sat, Nov 7" */
export const fmtDay = (d) => toDate(d)?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '';
/** "Nov 7" */
export const fmtShort = (d) => toDate(d)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '';

export const fmtNumber = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
export const fmtMoney = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

export const isBreaker = (m) => m.matchTypeLabel === 'Game Breaker' || m.matchTypeLabel === 'Dream Breaker';

/** 'team1' | 'team2' | null. Stored winners use team1/team2 or player1/player2 (player1 = team 1 side). */
export const matchWinner = (m) => {
  if (m.winner === 'team1' || m.winner === 'player1') return 'team1';
  if (m.winner === 'team2' || m.winner === 'player2') return 'team2';
  const a = m.scores?.player1?.game1 || m.scores?.player1?.total || 0;
  const b = m.scores?.player2?.game1 || m.scores?.player2?.total || 0;
  return a > b ? 'team1' : b > a ? 'team2' : null;
};

const byMatchNumber = (a, b) => (a.matchNumber || 0) - (b.matchNumber || 0);

/** Summarise one tie (all matches sharing a fixtureGroupId). */
export function summariseTie(matches) {
  const sorted = [...matches].sort(byMatchNumber);
  const first = sorted[0];
  const regular = sorted.filter((m) => !isBreaker(m));
  const wins = { team1: 0, team2: 0 };
  sorted.forEach((m) => {
    const w = m.status === 'completed' && matchWinner(m);
    if (w) wins[w] += 1;
  });
  const regularDone = regular.length > 0 && regular.every((m) => m.status === 'completed');
  const decided = regularDone && wins.team1 !== wins.team2;
  const breakerPlayed = sorted.some((m) => isBreaker(m) && m.status === 'completed');
  const times = sorted.map((m) => m.time || m.playingTime).filter(Boolean).sort();
  return {
    id: first.fixtureGroupId,
    team1: first.team1Name || 'TBD',
    team2: first.team2Name || 'TBD',
    court: first.court || first.venueName || '',
    time: times[0] || '',
    date: toDate(first.date),
    matchCount: sorted.length,
    completedCount: sorted.filter((m) => m.status === 'completed').length,
    live: sorted.some((m) => m.status === 'live'),
    wins,
    decided,
    winner: decided ? (wins.team1 > wins.team2 ? 'team1' : 'team2') : null,
    breakerPlayed,
    matches: sorted,
  };
}

/**
 * Group fixtures into matchdays (by local date) → ties. Returns matchdays sorted by date:
 * [{ key, date, matches, ties[], completed, total, label: 'Matchday n' }]
 */
export function buildMatchdays(fixtures) {
  const days = new Map();
  // Game/Dream Breakers are only played when a tie needs one; unplayed ones aren't part of the season.
  fixtures.filter((f) => !isBreaker(f) || f.status === 'completed' || f.status === 'live').forEach((f) => {
    const key = dayKey(f.date);
    if (!key) return;
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(f);
  });
  return [...days.keys()]
    .sort()
    .map((key, i) => {
      const matches = days.get(key);
      const groups = new Map();
      matches.forEach((m) => {
        const g = m.fixtureGroupId || `${m.team1Name}-${m.team2Name}`;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(m);
      });
      const ties = [...groups.values()].map(summariseTie).sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.team1.localeCompare(b.team1));
      return {
        key,
        date: fromKey(key),
        index: i + 1,
        label: `Matchday ${i + 1}`,
        matches,
        ties,
        total: matches.length,
        completed: matches.filter((m) => m.status === 'completed').length,
      };
    });
}

/** Today's position in the season: last matchday on/before today, and the next one still to play. */
export function seasonPosition(matchdays, now = new Date()) {
  const todayKey = dayKey(now);
  const past = matchdays.filter((d) => d.key < todayKey);
  const upcoming = matchdays.filter((d) => d.key >= todayKey && d.completed < d.total);
  const lastPlayed = [...matchdays].reverse().find((d) => d.completed > 0) || null;
  const lastWithResults = [...matchdays].reverse().find((d) => d.ties.some((t) => t.decided)) || null;
  return {
    next: upcoming[0] || null,
    lastPlayed,
    lastWithResults,
    markerAfter: past.length > 0 ? past.length - 1 : null,
    playedDays: matchdays.filter((d) => d.completed === d.total && d.total > 0).length,
  };
}

/** Widest tie in the season (regular matches + any breaker played). */
export const dotsPerTie = (matchdays) => Math.max(1, ...matchdays.flatMap((d) => d.ties.map((t) => t.matches.length)));

/**
 * DotMatrix groups: one dot per match, one row per tie. Rows are padded to `perTie`
 * with transparent dots so ties without a breaker still line up.
 */
export function seasonDots(matchdays, nextKey, perTie = dotsPerTie(matchdays)) {
  return matchdays.map((d) => ({
    label: fmtShort(d.date),
    emphasis: d.key === nextKey,
    dots: d.ties.flatMap((t) => {
      const row = t.matches.map((m) => {
        if (m.status === 'completed') return isBreaker(m) ? 'exception' : 'done';
        if (d.key === nextKey || m.status === 'live') return 'next';
        return 'empty';
      });
      while (row.length < perTie) row.push('transparent');
      return row;
    }),
  }));
}

/** Weekly counts of items by `createdAt` for the last `weeks` weeks (oldest first). */
export function weeklySeries(items, weeks = 12, now = new Date()) {
  const ms = 7 * 24 * 3600 * 1000;
  const out = Array(weeks).fill(0);
  items.forEach((it) => {
    const d = toDate(it.createdAt);
    if (!d) return;
    const ago = Math.floor((now - d) / ms);
    if (ago >= 0 && ago < weeks) out[weeks - 1 - ago] += 1;
  });
  return out;
}

export const ISSUED_PASS = (p) => p.status === 'approved' || p.status === 'confirmed';
export const passCount = (passes) => passes.filter(ISSUED_PASS).reduce((s, p) => s + (Number(p.numPasses) || 0), 0);

/** Tournament status from its dates. */
export function tournamentStatus(t, now = new Date()) {
  const s = toDate(t.startDate);
  const e = toDate(t.endDate);
  if (s && now < s) return 'upcoming';
  if (e && now > e) return 'completed';
  return 'active';
}

const CATEGORY_LABELS = {
  womensSingles: "Women's singles",
  womensDoubles: "Women's doubles",
  mensSingles: "Men's singles",
  mensDoubles: "Men's doubles",
  mixedDoubles: 'Mixed doubles',
};

export const categoryList = (categories) =>
  Object.entries(categories || {})
    .filter(([, on]) => on)
    .map(([k]) => CATEGORY_LABELS[k] || k);
