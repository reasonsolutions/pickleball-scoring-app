import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import paddleLogo from '../assets/paddle.png';
import { introDurationMs } from '../components/LineupIntro';

const DISPLAY = 'Unbounded, sans-serif';
const BODY = "'Schibsted Grotesk', sans-serif";

const toDate = (value) => (value?.toDate ? value.toDate() : new Date(value || '1970-01-01'));
const toDateString = (value) => toDate(value).toISOString().split('T')[0];
const isCenterCourt = (match) => {
  const court = match.court?.toLowerCase() || '';
  return court.includes('center') || court.includes('centre');
};

// Group matches into fixtures (team vs team), ordered by first match time
const groupFixtures = (matches) => {
  const groups = {};
  matches.forEach(match => {
    const key = match.fixtureGroupId || `${match.team1Name}_vs_${match.team2Name}`;
    if (!groups[key]) {
      groups[key] = { fixtureGroupId: key, team1Name: match.team1Name, team2Name: match.team2Name, matches: [] };
    }
    groups[key].matches.push(match);
  });
  return Object.values(groups).sort((a, b) => (firstMatchTime(a) || '99:99').localeCompare(firstMatchTime(b) || '99:99'));
};

const fixtureStatus = (fixture) => {
  const statuses = fixture.matches.map(m => m.status);
  if (statuses.includes('in_progress')) return 'live';
  if (statuses.length && statuses.every(s => s === 'completed')) return 'done';
  return 'upcoming';
};

// Earliest kick-off time in a fixture, e.g. "16:00"
const firstMatchTime = (fixture) => fixture.matches.map(m => m.time).filter(Boolean).sort()[0] || null;

const SCENES = [
  { id: 'league_rules', icon: 'play', mainOnly: true },
  { id: 'intro_team1', side: 'team1', icon: 'spark' },
  { id: 'intro_team2', side: 'team2', icon: 'spark' },
];

function Icon({ name, className = 'h-5 w-5' }) {
  const common = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'play':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none" /></svg>;
    case 'spark':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" /></svg>;
    case 'tv':
      return <svg {...common}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
    case 'side':
      return <svg {...common}><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="13" y="4" width="8" height="16" rx="2" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 5 5L20 7" /></svg>;
    default:
      return null;
  }
}

function TeamLogo({ src, name, size = 'h-12 w-12' }) {
  return (
    <div className={`${size} shrink-0 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-1.5 flex items-center justify-center overflow-hidden`}>
      <img src={src || paddleLogo} alt={`${name} logo`} className="h-full w-full object-contain" />
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    live: 'bg-red-500/15 text-red-300 ring-red-500/30',
    done: 'bg-white/[0.06] text-white/50 ring-white/10',
    upcoming: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${styles[status]}`}>
      {status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
      {status === 'live' ? 'Live' : status === 'done' ? 'Done' : 'Upcoming'}
    </span>
  );
}

export default function DisplayRemote() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('main');
  const [settings, setSettings] = useState({});
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // teamName -> { id, logo, playerCount }
  const [teamInfo, setTeamInfo] = useState({});
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Load tournament + fixtures once
  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      try {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (!tournamentDoc.exists()) {
          setError('Tournament not found');
          return;
        }
        setTournament(tournamentDoc.data());

        const snapshot = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)));
        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllMatches(matches);

        const dates = [...new Set(matches.map(m => toDateString(m.date)))].sort();
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(dates.includes(today) ? today : (dates.find(d => d >= today) || dates[dates.length - 1] || ''));
      } catch (err) {
        console.error('Error loading remote data:', err);
        setError('Failed to load remote');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tournamentId]);

  // Live display settings for the selected date, so every open remote stays in sync
  useEffect(() => {
    if (!tournamentId || !selectedDate) return;
    setConnected(false);
    const unsubscribe = onSnapshot(
      doc(db, 'display_settings', `${tournamentId}_${selectedDate}`),
      (snap) => {
        setSettings(snap.exists() ? snap.data() : {});
        setConnected(true);
      },
      (err) => {
        console.error('Error listening to display settings:', err);
        setConnected(false);
      }
    );
    return () => unsubscribe();
  }, [tournamentId, selectedDate]);

  const availableDates = useMemo(
    () => [...new Set(allMatches.map(m => toDateString(m.date)))].sort(),
    [allMatches]
  );

  const { centerFixtures, sideFixtures } = useMemo(() => {
    const dateMatches = allMatches.filter(m => toDateString(m.date) === selectedDate);
    return {
      centerFixtures: groupFixtures(dateMatches.filter(isCenterCourt)),
      sideFixtures: groupFixtures(dateMatches.filter(m => !isCenterCourt(m))),
    };
  }, [allMatches, selectedDate]);

  const isMain = activeTab === 'main';
  const fixtures = isMain ? centerFixtures : sideFixtures;
  const currentFixture = isMain
    ? (settings.currentMainFixture || settings.currentFixture || null)
    : (settings.currentSideFixture || null);
  const sceneKey = isMain ? 'mainScene' : 'sideScene';
  const scene = settings[sceneKey] || null;
  // Intros end on their own; league rules stays on until toggled off
  const activeScene = scene && (scene.endsAt ? scene.endsAt > now : scene.type === 'league_rules') ? scene.type : null;
  const teamLogos = useMemo(
    () => Object.fromEntries(Object.entries(teamInfo).map(([name, info]) => [name, info?.logo || null])),
    [teamInfo]
  );

  // Tick while an intro is running so its progress bar and "playing" state stay current
  const runningUntil = Math.max(settings.mainScene?.endsAt || 0, settings.sideScene?.endsAt || 0);
  useEffect(() => {
    if (runningUntil <= Date.now()) return;
    const t = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time > runningUntil) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [runningUntil]);

  // Fetch team logos for visible fixtures
  useEffect(() => {
    const names = new Set();
    [...centerFixtures, ...sideFixtures].forEach(f => { names.add(f.team1Name); names.add(f.team2Name); });
    const missing = [...names].filter(n => n && !(n in teamInfo));
    if (!missing.length) return;

    missing.forEach(async (teamName) => {
      try {
        const snapshot = await getDocs(query(collection(db, 'teams'), where('name', '==', teamName)));
        const teams = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const hasLogo = (t) => t.logo?.url || t.logoUrl;
        const team =
          teams.find(t => t.tournamentId === tournamentId && hasLogo(t)) ||
          teams.find(t => t.tournamentId === tournamentId) ||
          teams.find(hasLogo) ||
          teams[0];
        setTeamInfo(prev => ({
          ...prev,
          [teamName]: team
            ? { id: team.id, logo: team.logo?.url || team.logoUrl || null, playerCount: team.playerIds?.length || 0 }
            : null,
        }));
      } catch (err) {
        console.error('Error fetching team logo:', err);
        setTeamInfo(prev => ({ ...prev, [teamName]: null }));
      }
    });
  }, [centerFixtures, sideFixtures, tournamentId, teamInfo]);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const writeSettings = async (key, data, message) => {
    setPending(key);
    try {
      await setDoc(
        doc(db, 'display_settings', `${tournamentId}_${selectedDate}`),
        { tournamentId, date: selectedDate, ...data, updatedAt: serverTimestamp() },
        { merge: true }
      );
      showToast(message);
    } catch (err) {
      console.error('Error updating display:', err);
      showToast(`Failed: ${err.message}`);
    } finally {
      setPending(null);
    }
  };

  const handleSelectFixture = (fixture) => {
    if (currentFixture?.fixtureGroupId === fixture.fixtureGroupId) return;
    const data = isMain
      ? { currentFixture: fixture, currentMainFixture: fixture }
      : { currentSideFixture: fixture };
    writeSettings(`fixture:${fixture.fixtureGroupId}`, data, `${isMain ? 'Main' : 'Side'} display → ${fixture.team1Name} vs ${fixture.team2Name}`);
  };

  const sceneTeamName = (sceneDef) =>
    sceneDef.side === 'team1' ? currentFixture?.team1Name : sceneDef.side === 'team2' ? currentFixture?.team2Name : null;

  const handleScene = (sceneDef) => {
    const screen = isMain ? 'Main' : 'Side';
    if (activeScene === sceneDef.id) {
      writeSettings(`scene:${sceneDef.id}`, { [sceneKey]: null }, `${screen} display → scoreboard`);
      return;
    }
    const teamName = sceneTeamName(sceneDef);
    const startedAt = Date.now();
    const info = teamName ? teamInfo[teamName] : null;
    writeSettings(
      `scene:${sceneDef.id}`,
      {
        [sceneKey]: {
          type: sceneDef.id,
          teamName: teamName || null,
          teamId: info?.id || null,
          fixtureGroupId: currentFixture?.fixtureGroupId || null,
          startedAt,
          endsAt: teamName ? startedAt + introDurationMs(info?.playerCount || 0) : null,
        },
      },
      `${screen} display → ${sceneDef.id === 'league_rules' ? 'League Rules Video' : `${teamName} lineup`}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-lime-300 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-6 text-white" style={{ fontFamily: BODY }}>
        <div className="rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 px-6 py-5 text-red-200">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-white antialiased" style={{ fontFamily: BODY }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-lime-300/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-indigo-500/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-lime-300">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-lime-300 animate-ping opacity-60' : 'bg-white/30'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-lime-300' : 'bg-white/30'}`} />
              </span>
              Remote{connected ? '' : ' · connecting'}
            </div>
            <h1 className="mt-2 truncate text-2xl font-black uppercase tracking-tight sm:text-3xl" style={{ fontFamily: DISPLAY }}>
              {tournament?.name}
            </h1>
          </div>
        </header>

        {/* Date strip */}
        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {availableDates.map(date => {
              const d = new Date(`${date}T00:00:00`);
              const selected = date === selectedDate;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2 transition-all duration-200 ${
                    selected
                      ? 'bg-white text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)]'
                      : 'bg-white/[0.04] text-white/60 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-base font-extrabold leading-tight">
                    {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-4 mt-5 bg-[#07080c]/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="relative grid grid-cols-2 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/[0.08]">
            <div
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-lime-300 shadow-[0_6px_24px_-6px_rgba(190,242,100,0.6)] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ transform: isMain ? 'translateX(0)' : 'translateX(100%)' }}
            />
            {[
              { id: 'main', label: 'Main Display', icon: 'tv' },
              { id: 'side', label: 'Side Display', icon: 'side' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold uppercase tracking-[0.08em] transition-colors duration-200 ${
                  activeTab === tab.id ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* On Air */}
        <section className="mt-3">
          <SectionLabel>On air</SectionLabel>
          {currentFixture ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-5 ring-1 ring-white/10">
              <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_0_24px_rgba(239,68,68,0.55)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                {isMain ? 'Main' : 'Side'}
              </div>
              <div className="flex items-center gap-4 pt-8">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamLogo src={teamLogos[currentFixture.team1Name]} name={currentFixture.team1Name} size="h-16 w-16 sm:h-20 sm:w-20" />
                  <div className="text-sm font-black uppercase leading-tight sm:text-base" style={{ fontFamily: DISPLAY }}>{currentFixture.team1Name}</div>
                </div>
                <div className="text-xs font-black text-white/30" style={{ fontFamily: DISPLAY }}>VS</div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamLogo src={teamLogos[currentFixture.team2Name]} name={currentFixture.team2Name} size="h-16 w-16 sm:h-20 sm:w-20" />
                  <div className="text-sm font-black uppercase leading-tight sm:text-base" style={{ fontFamily: DISPLAY }}>{currentFixture.team2Name}</div>
                </div>
              </div>
              {activeScene && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-lime-300/10 py-2 text-xs font-bold uppercase tracking-[0.14em] text-lime-200 ring-1 ring-lime-300/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
                  Playing: {sceneLabel(activeScene, scene)}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-white/50">
              Nothing on the {isMain ? 'main' : 'side'} display yet. Pick a match below.
            </div>
          )}
        </section>

        {/* Match selector */}
        <section className="mt-7">
          <SectionLabel count={fixtures.length}>{isMain ? 'Centre court matches' : 'Side court matches'}</SectionLabel>
          {fixtures.length === 0 ? (
            <div className="rounded-3xl bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50 ring-1 ring-white/[0.06]">
              No {isMain ? 'centre' : 'side'} court matches on this date.
            </div>
          ) : (
            <div className="space-y-2">
              {fixtures.map(fixture => {
                const selected = currentFixture?.fixtureGroupId === fixture.fixtureGroupId;
                const busy = pending === `fixture:${fixture.fixtureGroupId}`;
                const status = fixtureStatus(fixture);
                const time = firstMatchTime(fixture);
                return (
                  <button
                    key={fixture.fixtureGroupId}
                    onClick={() => handleSelectFixture(fixture)}
                    disabled={!!pending}
                    className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 active:scale-[0.99] disabled:cursor-wait ${
                      selected
                        ? 'bg-lime-300/[0.09] ring-2 ring-lime-300/70'
                        : 'bg-white/[0.03] ring-1 ring-white/[0.07] hover:bg-white/[0.06] hover:ring-white/15'
                    }`}
                  >
                    <div className="flex -space-x-3">
                      <TeamLogo src={teamLogos[fixture.team1Name]} name={fixture.team1Name} size="h-11 w-11" />
                      <TeamLogo src={teamLogos[fixture.team2Name]} name={fixture.team2Name} size="h-11 w-11" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-extrabold leading-tight">
                        {fixture.team1Name} <span className="font-semibold text-white/35">vs</span> {fixture.team2Name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                        {time && (
                          <>
                            <span className="tabular-nums">{time}</span>
                            <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                          </>
                        )}
                        <span className="whitespace-nowrap">{fixture.matches.length} match{fixture.matches.length !== 1 ? 'es' : ''}</span>
                        <StatusPill status={status} />
                      </div>
                    </div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      selected ? 'bg-lime-300 text-black' : 'bg-white/[0.06] text-white/30 group-hover:text-white/70'
                    }`}>
                      {busy ? (
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <Icon name={selected ? 'check' : 'tv'} className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Scenes */}
        <section className="mt-7">
            <SectionLabel>Scenes</SectionLabel>
            <div className={`grid grid-cols-1 gap-3 ${isMain ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {SCENES.filter(sceneDef => isMain || !sceneDef.mainOnly).map(sceneDef => {
                const active = activeScene === sceneDef.id;
                const busy = pending === `scene:${sceneDef.id}`;
                const teamName = sceneTeamName(sceneDef);
                const needsFixture = !!sceneDef.side;
                const progress = active && scene?.endsAt
                  ? Math.min(1, (now - scene.startedAt) / (scene.endsAt - scene.startedAt))
                  : null;
                // Firestore rules require a main fixture on the settings doc before anything else can be saved
                const disabled = !!pending || !currentFixture;
                return (
                  <button
                    key={sceneDef.id}
                    onClick={() => handleScene(sceneDef)}
                    disabled={disabled}
                    className={`relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-40 sm:min-h-[132px] sm:flex-col sm:items-start sm:justify-between ${
                      active
                        ? 'bg-lime-300 text-black shadow-[0_12px_40px_-10px_rgba(190,242,100,0.7)]'
                        : 'bg-white/[0.04] ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:ring-white/20'
                    }`}
                  >
                    {progress != null && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/15">
                        <div className="h-full bg-black/40" style={{ width: `${progress * 100}%`, transition: 'width 250ms linear' }} />
                      </div>
                    )}
                    {needsFixture && teamName ? (
                      <TeamLogo src={teamLogos[teamName]} name={teamName} size="h-11 w-11" />
                    ) : (
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-black/10' : 'bg-white/[0.06] text-lime-300'}`}>
                        {busy ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Icon name={sceneDef.icon} className="h-6 w-6" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 sm:flex-none">
                      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${active ? 'text-black/60' : 'text-white/40'}`}>
                        {active ? '● Playing now · tap to stop' : sceneDef.id === 'league_rules' ? 'Video' : `Lineup intro · ${sceneDef.side === 'team1' ? 'Team 1' : 'Team 2'}`}
                      </div>
                      <div className="mt-0.5 truncate text-base font-black uppercase leading-tight" style={{ fontFamily: DISPLAY }}>
                        {sceneDef.id === 'league_rules' ? 'League Rules' : teamName || (sceneDef.side === 'team1' ? 'Team 1' : 'Team 2')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
        </section>
      </div>

      {/* Toast */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="max-w-md truncate rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-2xl">
          {toast}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, count }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">
      {children}
      {count != null && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/60">{count}</span>}
    </div>
  );
}

function sceneLabel(type, scene) {
  if (type === 'league_rules') return 'League Rules Video';
  return `${scene?.teamName || ''} lineup`;
}
