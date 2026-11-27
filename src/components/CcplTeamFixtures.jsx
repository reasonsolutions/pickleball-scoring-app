import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Team admin fixtures tab: list fixtures, then pick players for each match.
// Mirrors CCPL-RN PickMyTeamScreen + PickMyPlayersScreen (same Firestore fields).

const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const RULE = '#d8d4ca';
const RED = '#c0261f';

const zuume = { fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'italic' };
const mont = { fontFamily: "'Montserrat', sans-serif" };
const eyebrow = { ...mont, fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED };
const skew = (bg, extra = {}) => ({ display: 'inline-flex', transform: 'skewX(-14deg)', background: bg, border: 0, ...extra });
const unskew = { display: 'inline-block', transform: 'skewX(14deg)' };
const pillLabel = { ...unskew, ...mont, fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase' };

// Game Breaker positions (0-based) that must be filled by a woman
const GB_FEMALE_SLOTS = [2, 4];

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds !== undefined) return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Fixture start as a Date, combining the date with an "HH:MM" or "h:mm AM" time
const getStart = (fixture) => {
  const d = toDate(fixture.date);
  if (!d) return null;
  const start = new Date(d);
  const m = String(fixture.time || '').match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m) {
    let h = Number(m[1]);
    const ampm = m[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    start.setHours(h, Number(m[2]), 0, 0);
  }
  return start;
};

// Selection closes 30 minutes before the fixture starts
const getDeadline = (fixture) => {
  const start = getStart(fixture);
  return start ? new Date(start.getTime() - 30 * 60 * 1000) : null;
};

const formatDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
};

const formatCountdown = (ms) => {
  if (ms <= 0) return 'Deadline passed';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hrs}h ${mins}m ${secs}s`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
};

const normalizeGender = (gender) => {
  const g = String(gender || '').toLowerCase();
  return g === 'female' || g === 'w' || g === 'woman' || g === 'f' ? 'w' : 'm';
};

const getMatchOrder = (match) => {
  const label = (match.matchTypeLabel || '').trim();
  if (match.matchType === 'dreamBreaker' || label === 'Game Breaker' || label === 'Dream Breaker') return 6;
  if (label === "Men's Doubles (2)") return 4;
  if (label === "Men's Doubles") return 0;
  if (label === "Women's Doubles") return 1;
  if (label === "Men's Singles") return 2;
  if (label === "Women's Singles") return 3;
  if (label === 'Mixed Doubles') return 5;
  return 999;
};

const PLAYOFF_TYPES = ['qualifier', 'qualifier 1', 'qualifier 2', 'eliminator', 'final'];
// fixtureType holds the match format (e.g. "dreamBreaker") for league days, so only surface playoff names
const fixtureLabel = (type) => (PLAYOFF_TYPES.includes(String(type || '').toLowerCase()) ? type : 'League');

const isGameBreaker = (match) => match?.matchType === 'dreamBreaker';
const isSinglesMatch = (match) => (match?.matchTypeLabel || '').toLowerCase().includes('singles');
const normalizeCategory = (label) => (label || '').replace(/\s*\(2\)\s*$/, '').trim();

// Ticks once a second so countdowns and deadline locks stay live
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const TeamLogo = ({ team, size = 64, accentColor }) => (
  <div style={{ width: size, height: size, flexShrink: 0, border: `2px solid ${INK}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {team?.logo?.url ? (
      <img src={team.logo.url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
    ) : (
      <span style={{ ...zuume, fontSize: size * 0.5, color: accentColor }}>{team?.name?.charAt(0)?.toUpperCase() || '?'}</span>
    )}
  </div>
);

const Countdown = ({ fixture, now, dark }) => {
  const deadline = getDeadline(fixture);
  if (!deadline) return null;
  const left = deadline.getTime() - now;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 10px' }}>
      <span style={{ ...eyebrow, color: dark ? '#a8a398' : MUTED }}>Team selection deadline</span>
      <span style={{ ...mont, fontWeight: 800, fontSize: '14px', color: left <= 0 ? RED : dark ? '#fff' : INK }}>{formatCountdown(left)}</span>
    </div>
  );
};

export default function CcplTeamFixtures({ teamId, teamData, accentColor, isMobile }) {
  const now = useNow();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState({});
  const [listTab, setListTab] = useState('upcoming');
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

  // Picker modal state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [gbPlayers, setGbPlayers] = useState(Array(8).fill(''));
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!teamId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [asTeam1, asTeam2] = await Promise.all([
          getDocs(query(collection(db, 'fixtures'), where('team1', '==', teamId))),
          getDocs(query(collection(db, 'fixtures'), where('team2', '==', teamId))),
        ]);
        const byId = {};
        [...asTeam1.docs, ...asTeam2.docs].forEach((d) => { byId[d.id] = { id: d.id, ...d.data() }; });

        const groups = {};
        Object.values(byId).forEach((m) => {
          const groupId = m.fixtureGroupId || m.id;
          if (!groups[groupId]) {
            groups[groupId] = {
              fixtureGroupId: groupId,
              date: m.date,
              time: m.playingTime || m.time || '',
              team1: m.team1,
              team2: m.team2,
              team1Name: m.team1Name,
              team2Name: m.team2Name,
              venue: m.venue,
              fixtureType: m.fixtureType || 'League',
              status: m.status || 'scheduled',
              matches: [],
            };
          }
          groups[groupId].matches.push(m);
          // A group is completed only when every match in it is
          if (m.status !== 'completed') groups[groupId].status = m.status || 'scheduled';
        });
        const list = Object.values(groups).sort((a, b) => (getStart(a)?.getTime() || 0) - (getStart(b)?.getTime() || 0));
        setFixtures(list);


        const teamIds = [...new Set(list.flatMap((f) => [f.team1, f.team2]).filter(Boolean))];
        const teamDocs = await Promise.all(teamIds.map((id) => getDoc(doc(db, 'teams', id))));
        const map = {};
        teamDocs.forEach((d) => { if (d.exists()) map[d.id] = { id: d.id, ...d.data() }; });
        setTeams(map);

        // venue is stored as a venues/{id} reference; fall back to the raw value if it isn't one
        const venueIds = [...new Set(list.map((f) => f.venue).filter(Boolean))];
        const venueDocs = await Promise.all(venueIds.map((id) => getDoc(doc(db, 'venues', id)).catch(() => null)));
        const venueNames = {};
        venueDocs.forEach((d) => { if (d?.exists()) venueNames[d.id] = d.data().name; });
        setFixtures(list.map((f) => ({ ...f, venueName: venueNames[f.venue] || (/^[A-Za-z0-9]{20}$/.test(f.venue || '') ? '' : f.venue || '') })));
      } catch (err) {
        console.error('Error loading team fixtures:', err);
        setError('Failed to load fixtures.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  const ensurePlayers = async () => {
    if (playersLoaded) return players;
    const ids = teamData?.playerIds || [];
    const docs = await Promise.all(ids.map((id) => getDoc(doc(db, 'players', id))));
    const list = docs.filter((d) => d.exists()).map((d) => {
      const data = d.data();
      return {
        id: d.id,
        fullName: data.fullName || data.name || 'Unknown',
        gender: normalizeGender(data.gender),
        photo: typeof data.photo === 'string' ? data.photo : data.photo?.url,
        singlesRating: data.singlesRating,
        doublesRating: data.doublesRating,
      };
    });
    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    setPlayers(list);
    setPlayersLoaded(true);
    return list;
  };

  const isFixtureCompleted = (f) => {
    if (f.status === 'completed') return true;
    const start = toDate(f.date);
    if (!start) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start < today;
  };

  const upcoming = fixtures.filter((f) => !isFixtureCompleted(f));
  const completed = fixtures.filter(isFixtureCompleted).reverse();
  const fixture = fixtures.find((f) => f.fixtureGroupId === selectedGroupId) || null;
  const isLocked = (f) => {
    if (isFixtureCompleted(f)) return true;
    const deadline = getDeadline(f);
    return deadline ? now >= deadline.getTime() : false;
  };

  const sortedMatches = useMemo(
    () => (fixture ? [...fixture.matches].sort((a, b) => getMatchOrder(a) - getMatchOrder(b)) : []),
    [fixture]
  );

  // Which side of a match this team is on
  const side = (match) => (match.team1 === teamId ? 'Team1' : 'Team2');
  const ourPlayers = (match) => {
    const s = side(match);
    if (isGameBreaker(match)) return (match[`gameBreakerPlayers${s}`] || []).filter(Boolean);
    return [match[`player1${s}`], match[`player2${s}`]].filter(Boolean);
  };

  // ── Availability rules (same as RN) ──
  const getMatchCount = (name, excludeMatchId) => fixture.matches.reduce((count, m) => {
    if (m.id === excludeMatchId) return count;
    let c = count;
    if ([m.player1Team1, m.player2Team1, m.player1Team2, m.player2Team2].includes(name)) c++;
    if (m.gameBreakerPlayersTeam1?.includes(name) || m.gameBreakerPlayersTeam2?.includes(name)) c++;
    return c;
  }, 0);

  const inSameCategory = (name, match) => {
    const category = normalizeCategory(match.matchTypeLabel);
    return fixture.matches.some((m) => m.id !== match.id
      && normalizeCategory(m.matchTypeLabel) === category
      && [m.player1Team1, m.player2Team1, m.player1Team2, m.player2Team2].includes(name));
  };

  const getAvailability = (player) => {
    const match = selectedMatch;
    const label = (match.matchTypeLabel || '').toLowerCase();
    const isWomens = label.includes("women's");
    const isMens = label.startsWith("men's") || label.includes(" men's");
    const isMixed = label.includes('mixed');
    const selected = p1 === player.fullName || p2 === player.fullName;
    if (selected) return { available: true };

    if (getMatchCount(player.fullName, match.id) >= 2) return { available: false, reason: 'Already in 2 matches' };
    if (isWomens && player.gender !== 'w') return { available: false, reason: 'Gender mismatch' };
    if (isMens && player.gender === 'w') return { available: false, reason: 'Gender mismatch' };
    if (isMixed && (p1 || p2)) {
      const partner = players.find((p) => p.fullName === (p1 || p2));
      if (partner && partner.gender === player.gender) return { available: false, reason: 'Must be opposite gender' };
    }
    if (inSameCategory(player.fullName, match)) return { available: false, reason: 'Already in same category' };
    const isFull = isSinglesMatch(match) ? !!p1 : !!(p1 && p2);
    if (isFull) return { available: false, reason: 'Slots full' };
    return { available: true };
  };

  const getGbAvailability = (player) => {
    if (gbPlayers.includes(player.fullName)) return { available: false, reason: 'Already selected', selected: true };
    const count = gbPlayers.filter(Boolean).length;
    if (count >= 8) return { available: false, reason: 'All positions filled' };
    if (GB_FEMALE_SLOTS.includes(count) && player.gender !== 'w') return { available: false, reason: `Position ${count + 1} requires female` };
    return { available: true };
  };

  const openPicker = async (match) => {
    if (isLocked(fixture)) return;
    setFormError('');
    setSearchQuery('');
    setGenderFilter('all');
    const s = side(match);
    if (isGameBreaker(match)) {
      const existing = (match[`gameBreakerPlayers${s}`] || []).slice(0, 8);
      setGbPlayers([...existing, ...Array(8 - existing.length).fill('')]);
    } else {
      setP1(match[`player1${s}`] || '');
      setP2(match[`player2${s}`] || '');
    }
    setSelectedMatch(match);
    try {
      await ensurePlayers();
    } catch (err) {
      console.error('Error loading players:', err);
      setFormError('Failed to load players.');
    }
  };

  const closePicker = () => {
    if (saving) return;
    setSelectedMatch(null);
  };

  const togglePlayer = (player) => {
    const name = player.fullName;
    if (p1 === name) { setP1(p2); setP2(''); return; }
    if (p2 === name) { setP2(''); return; }
    if (!getAvailability(player).available) return;
    if (!p1) setP1(name);
    else if (!isSinglesMatch(selectedMatch) && !p2) setP2(name);
  };

  const addGbPlayer = (player) => {
    if (!getGbAvailability(player).available) return;
    const next = [...gbPlayers];
    const idx = next.findIndex((p) => !p);
    if (idx !== -1) { next[idx] = player.fullName; setGbPlayers(next); }
  };

  const removeGbPlayer = (index) => {
    const next = gbPlayers.filter((_, i) => i !== index);
    setGbPlayers([...next, '']);
  };

  const idFor = (name) => players.find((p) => p.fullName === name)?.id || '';

  const savePlayers = async () => {
    const match = selectedMatch;
    if (!match || isLocked(fixture)) return;
    const s = side(match);
    let updates;
    if (isGameBreaker(match)) {
      if (gbPlayers.filter(Boolean).length < 8) { setFormError('Please select all 8 players for Game Breaker.'); return; }
      updates = { [`gameBreakerPlayers${s}`]: gbPlayers, [`gameBreakerPlayers${s}Ids`]: gbPlayers.map(idFor) };
    } else {
      if (!p1) { setFormError('Please select Player 1.'); return; }
      if (!isSinglesMatch(match) && !p2) { setFormError('Please select both players for this doubles match.'); return; }
      updates = { [`player1${s}`]: p1, [`player2${s}`]: p2, [`player1${s}Id`]: idFor(p1), [`player2${s}Id`]: p2 ? idFor(p2) : '' };
    }
    try {
      setSaving(true);
      setFormError('');
      await updateDoc(doc(db, 'fixtures', match.id), { ...updates, updatedAt: new Date() });
      setFixtures((prev) => prev.map((f) => (f.fixtureGroupId !== fixture.fixtureGroupId ? f : {
        ...f,
        matches: f.matches.map((m) => (m.id === match.id ? { ...m, ...updates } : m)),
      })));
      setSelectedMatch(null);
      setToast('Players saved');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      console.error('Error saving players:', err);
      setFormError('Failed to save players. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    return (!q || p.fullName.toLowerCase().includes(q)) && (genderFilter === 'all' || p.gender === genderFilter);
  });

  const sectionTitle = { ...zuume, margin: 0, textTransform: 'uppercase', fontSize: 'clamp(44px,5vw,72px)', lineHeight: 0.85 };
  const emptyPanel = (text) => (
    <div style={{ border: `2px solid ${INK}`, background: '#fff', padding: '40px 24px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: MUTED }}>{text}</div>
  );
  const segmented = (options, value, onChange, dark) => (
    <div style={{ display: 'flex', border: `2px solid ${dark ? '#fff' : INK}`, background: dark ? INK : '#fff' }}>
      {options.map(([id, label], i) => {
        const active = value === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            style={{ border: 0, borderLeft: i ? `2px solid ${dark ? '#fff' : INK}` : 0, background: active ? (dark ? '#fff' : INK) : 'transparent', color: active ? (dark ? INK : accentColor) : (dark ? '#fff' : INK), padding: '10px 16px', cursor: 'pointer', ...mont, fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  const teamOf = (id, fallbackName) => teams[id] || { id, name: fallbackName || 'TBD' };

  // ───────────── Fixture detail ─────────────
  const renderDetail = () => {
    const teamA = teamOf(fixture.team1, fixture.team1Name);
    const teamB = teamOf(fixture.team2, fixture.team2Name);
    const locked = isLocked(fixture);
    const completedFixture = isFixtureCompleted(fixture);

    return (
      <div>
        <button type="button" onClick={() => setSelectedGroupId(null)} style={{ ...skew(INK, { padding: '10px 18px', cursor: 'pointer', marginBottom: '24px' }) }}>
          <span style={{ ...pillLabel, color: '#fff' }}>← All fixtures</span>
        </button>

        <div style={{ border: `2px solid ${INK}`, background: INK, color: '#fff', padding: isMobile ? '24px 16px' : '32px', marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
            {[teamA, null, teamB].map((t, i) => (t ? (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
                <TeamLogo team={t} size={isMobile ? 64 : 96} accentColor={accentColor} />
                <span style={{ ...zuume, fontSize: isMobile ? '22px' : '32px', lineHeight: 0.95, textTransform: 'uppercase', color: t.id === teamId ? accentColor : '#fff' }}>{t.name}</span>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ ...eyebrow, color: '#a8a398' }}>{formatDate(fixture.date)}</span>
                <span style={{ ...zuume, fontSize: isMobile ? '40px' : '64px', lineHeight: 0.9, color: accentColor }}>VS</span>
                <span style={{ ...mont, fontWeight: 800, fontSize: '14px' }}>{fixture.time || 'TBD'}</span>
              </div>
            )))}
          </div>
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #2c2b28', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px' }}>
            {fixture.venueName ? <span style={{ ...eyebrow, color: '#a8a398' }}>Venue · <span style={{ color: '#fff' }}>{fixture.venueName}</span></span> : <span />}
            {completedFixture
              ? <span style={{ ...eyebrow, color: '#a8a398' }}>Fixture completed · view only</span>
              : <Countdown fixture={fixture} now={now} dark />}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <span style={{ ...zuume, fontSize: '32px', textTransform: 'uppercase', lineHeight: 1 }}>Matches ({sortedMatches.length})</span>
          {!locked && <span style={eyebrow}>Click a match to pick players</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
          {sortedMatches.map((match, idx) => {
            const picked = ourPlayers(match);
            const gb = isGameBreaker(match);
            const needed = gb ? 8 : isSinglesMatch(match) ? 1 : 2;
            const complete = picked.length >= needed;
            return (
              <button key={match.id} type="button" disabled={locked} onClick={() => openPicker(match)} className={locked ? undefined : 'ta-card'}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', border: `2px solid ${INK}`, background: '#fff', padding: 0, cursor: locked ? 'default' : 'pointer', opacity: locked && !picked.length ? 0.7 : 1, color: INK, ...mont }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `2px solid ${INK}` }}>
                  <span style={{ display: 'inline-flex', background: INK, padding: '4px 8px', ...zuume, fontSize: '18px', lineHeight: 1, color: accentColor }}>#{match.matchNumber || idx + 1}</span>
                  <span style={{ ...zuume, fontSize: '22px', lineHeight: 1, textTransform: 'uppercase', flex: 1 }}>{gb ? 'Game Breaker' : (match.matchTypeLabel || 'Match')}</span>
                  <span style={skew(locked ? RULE : complete ? INK : accentColor, { padding: '4px 10px' })}>
                    <span style={{ ...pillLabel, fontSize: '10px', color: locked ? MUTED : complete ? accentColor : INK, whiteSpace: 'nowrap' }}>
                      {completedFixture ? 'Completed' : locked ? 'Deadline passed' : complete ? 'Edit' : 'Select'}
                    </span>
                  </span>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '56px', alignItems: 'center' }}>
                  {picked.length ? picked.map((name, i) => (
                    <span key={i} style={{ border: `1px solid ${INK}`, background: PAPER, padding: '6px 10px', fontSize: '13px', fontWeight: 700 }}>
                      {gb ? `${i + 1}. ` : ''}{name}
                    </span>
                  )) : (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: MUTED }}>{locked ? 'No players selected' : `Select ${needed} player${needed > 1 ? 's' : ''}`}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ───────────── Picker modal ─────────────
  const renderPlayerTile = (player, { available, reason, selected, badge, onClick }) => (
    <button key={player.id} type="button" onClick={onClick} disabled={!available && !selected}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', padding: '10px 12px', border: `2px solid ${selected ? accentColor : '#2c2b28'}`, background: selected ? accentColor : '#17171a', color: selected ? INK : '#fff', cursor: available || selected ? 'pointer' : 'not-allowed', opacity: available || selected ? 1 : 0.4, ...mont }}>
      <div style={{ width: 40, height: 40, flexShrink: 0, background: '#2c2b28', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <span style={{ ...zuume, fontSize: '22px', color: accentColor }}>{player.fullName.charAt(0).toUpperCase()}</span>
        {player.photo && <img src={player.photo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 800, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.fullName}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: selected ? INK : '#a8a398' }}>
          {player.gender === 'w' ? 'Female' : 'Male'}{!available && !selected && reason ? ` · ${reason}` : ''}
        </span>
      </div>
      {badge && <span style={{ ...zuume, fontSize: '20px', lineHeight: 1 }}>{badge}</span>}
    </button>
  );

  const renderPicker = () => {
    const match = selectedMatch;
    const gb = isGameBreaker(match);
    const singles = isSinglesMatch(match);
    const gbCount = gbPlayers.filter(Boolean).length;

    return (
      <div onClick={closePicker} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '24px' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '760px', maxHeight: isMobile ? '92dvh' : '88dvh', display: 'flex', flexDirection: 'column', background: INK, color: '#fff', border: `2px solid ${INK}`, ...mont }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '18px 20px', borderBottom: '1px solid #2c2b28' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ ...eyebrow, color: accentColor }}>{gb ? 'Select 8 players in playing order' : singles ? 'Select 1 player' : 'Select 2 players'}</span>
              <span style={{ ...zuume, fontSize: '30px', lineHeight: 1, textTransform: 'uppercase' }}>{gb ? 'Game Breaker' : match.matchTypeLabel}</span>
            </div>
            <button type="button" onClick={closePicker} aria-label="Close" style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', width: 36, height: 36, cursor: 'pointer', fontSize: '18px', fontWeight: 800 }}>×</button>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #2c2b28' }}>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search players..."
              style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 12px', border: '2px solid #fff', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none', ...mont }} />
            {segmented([['all', 'All'], ['m', 'Men'], ['w', 'Women']], genderFilter, setGenderFilter, true)}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {!playersLoaded ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#a8a398', fontWeight: 600 }}>Loading players...</div>
            ) : gb ? (
              <>
                <div style={{ marginBottom: '18px' }}>
                  <span style={{ ...eyebrow, color: '#a8a398', display: 'block', marginBottom: '10px' }}>Playing order</span>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                    {gbPlayers.map((name, i) => {
                      const female = GB_FEMALE_SLOTS.includes(i);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: `1px dashed ${name ? accentColor : '#3a3936'}`, minHeight: '42px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: female ? '#d6336c' : accentColor, color: INK, ...zuume, fontSize: '16px' }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: name ? '#fff' : '#6d6a63' }}>{name || (female ? 'Female required' : 'Empty')}</span>
                          {name && <button type="button" onClick={() => removeGbPlayer(i)} style={{ background: 'transparent', border: 0, color: '#ff8a80', fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Remove</button>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: accentColor }}>
                    {gbCount >= 8 ? 'All 8 players selected' : `Next: Position ${gbCount + 1}${GB_FEMALE_SLOTS.includes(gbCount) ? ' (Female player required)' : ''}`}
                  </div>
                </div>
                <span style={{ ...eyebrow, color: '#a8a398', display: 'block', marginBottom: '10px' }}>Squad · click to add</span>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  {filteredPlayers.length === 0 && <span style={{ color: '#a8a398', fontSize: '13px' }}>No players found</span>}
                  {filteredPlayers.map((player) => {
                    const a = getGbAvailability(player);
                    const pos = gbPlayers.indexOf(player.fullName);
                    return renderPlayerTile(player, {
                      ...a,
                      selected: pos !== -1,
                      badge: pos !== -1 ? `#${pos + 1}` : null,
                      onClick: () => (pos !== -1 ? removeGbPlayer(pos) : addGbPlayer(player)),
                    });
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: singles ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                  {(singles ? [p1] : [p1, p2]).map((name, i) => (
                    <div key={i} style={{ padding: '10px 12px', border: `1px dashed ${name ? accentColor : '#3a3936'}` }}>
                      <span style={{ ...eyebrow, color: '#a8a398', display: 'block' }}>Player {i + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: name ? '#fff' : '#6d6a63' }}>{name || 'Not selected'}</span>
                    </div>
                  ))}
                </div>
                <span style={{ ...eyebrow, color: '#a8a398', display: 'block', marginBottom: '10px' }}>
                  Squad · {players.filter((p) => getAvailability(p).available).length} available
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  {filteredPlayers.length === 0 && <span style={{ color: '#a8a398', fontSize: '13px' }}>No players found</span>}
                  {filteredPlayers.map((player) => {
                    const selected = p1 === player.fullName || p2 === player.fullName;
                    return renderPlayerTile(player, {
                      ...getAvailability(player),
                      selected,
                      badge: selected ? (p1 === player.fullName ? 'P1' : 'P2') : null,
                      onClick: () => togglePlayer(player),
                    });
                  })}
                </div>
              </>
            )}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #2c2b28', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ff8a80' }}>{formError}</span>
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <button type="button" onClick={closePicker} disabled={saving} style={skew('transparent', { padding: '10px 18px', cursor: 'pointer', border: '2px solid #fff' })}>
                <span style={{ ...pillLabel, color: '#fff' }}>Cancel</span>
              </button>
              <button type="button" onClick={savePlayers} disabled={saving || !playersLoaded} style={skew(accentColor, { padding: '10px 22px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 })}>
                <span style={{ ...pillLabel, color: INK }}>{saving ? 'Saving...' : 'Save players'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ───────────── Fixture list ─────────────
  const renderFixtureCard = (f) => {
    const teamA = teamOf(f.team1, f.team1Name);
    const teamB = teamOf(f.team2, f.team2Name);
    const done = isFixtureCompleted(f);
    const filled = f.matches.filter((m) => ourPlayers(m).length >= (isGameBreaker(m) ? 8 : isSinglesMatch(m) ? 1 : 2)).length;
    return (
      <button key={f.fixtureGroupId} type="button" className="ta-card" onClick={() => setSelectedGroupId(f.fixtureGroupId)}
        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', border: `2px solid ${INK}`, background: '#fff', padding: 0, cursor: 'pointer', color: INK, ...mont }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', background: INK, color: '#fff' }}>
          <span style={{ ...zuume, fontSize: '22px', lineHeight: 1, textTransform: 'uppercase' }}>{formatDate(f.date)}{f.time ? ` · ${f.time}` : ''}</span>
          <span style={skew(done ? RULE : accentColor, { padding: '4px 10px' })}>
            <span style={{ ...pillLabel, fontSize: '10px', color: INK, whiteSpace: 'nowrap' }}>{fixtureLabel(f.fixtureType)}</span>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', padding: '20px 16px' }}>
          {[teamA, null, teamB].map((t, i) => (t ? (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <TeamLogo team={t} size={56} accentColor={accentColor} />
              <span style={{ ...zuume, fontSize: '20px', lineHeight: 0.95, textTransform: 'uppercase', color: t.id === teamId ? accentColor : INK }}>{t.name}</span>
            </div>
          ) : (
            <span key={i} style={{ ...zuume, fontSize: '32px', color: accentColor }}>VS</span>
          )))}
        </div>
        <div style={{ borderTop: `1px solid ${RULE}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={eyebrow}>{f.venueName || 'Venue TBD'}</span>
            <span style={{ ...eyebrow, color: filled === f.matches.length ? INK : accentColor }}>{filled}/{f.matches.length} matches picked</span>
          </div>
          {!done && <Countdown fixture={f} now={now} />}
        </div>
      </button>
    );
  };

  const renderList = () => {
    const list = listTab === 'upcoming' ? upcoming : completed;
    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px 24px', marginBottom: '24px' }}>
          <h2 style={sectionTitle}>Team <span style={{ color: accentColor }}>Fixtures.</span></h2>
          {segmented([['upcoming', `Upcoming (${upcoming.length})`], ['completed', `Completed (${completed.length})`]], listTab, setListTab)}
        </div>
        {list.length === 0
          ? emptyPanel(listTab === 'upcoming' ? 'No upcoming fixtures.' : 'No completed fixtures yet.')
          : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))', gap: '16px' }}>{list.map(renderFixtureCard)}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ ...sectionTitle, marginBottom: '24px' }}>Team <span style={{ color: accentColor }}>Fixtures.</span></h2>
        {emptyPanel('Loading fixtures...')}
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 style={{ ...sectionTitle, marginBottom: '24px' }}>Team <span style={{ color: accentColor }}>Fixtures.</span></h2>
        {emptyPanel(error)}
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div>
        <h2 style={{ ...sectionTitle, marginBottom: '24px' }}>Team <span style={{ color: accentColor }}>Fixtures.</span></h2>
        <div style={{ border: `2px solid ${INK}`, background: INK, color: '#fff', padding: '28px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ ...zuume, fontSize: '30px', lineHeight: 1, textTransform: 'uppercase' }}>Fixtures will be released soon</span>
          <span style={skew(accentColor, { padding: '5px 12px' })}>
            <span style={{ ...pillLabel, fontSize: '11px', color: INK, whiteSpace: 'nowrap' }}>Season 2</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {fixture ? renderDetail() : renderList()}
      {/* Portalled: the page section's clip-path would otherwise crop fixed overlays */}
      {selectedMatch && fixture && createPortal(renderPicker(), document.body)}
      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: INK, color: accentColor, border: `2px solid ${accentColor}`, padding: '12px 20px', ...mont, fontWeight: 800, fontSize: '13px', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {toast}
        </div>,
        document.body
      )}
    </>
  );
}
