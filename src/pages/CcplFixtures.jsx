import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';
import CCPLTopBar from '../components/CCPLTopBar';
import OptimizedImage from '../components/OptimizedImage';
import { shouldShowPlayerNames, getPlayerRevealTime, parseDate } from '../utils/dateTimeUtils';

// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return '';
  
  // Handle time in HH:MM format
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${ampm}`;
};

export default function CcplFixtures() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('league'); // Default to League tab
  const [selectedDayKey, setSelectedDayKey] = useState(null); // matchday picked in the rail
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
      setIsCompact(window.innerWidth < 1200);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Migration function to add playingTime field to existing matches
  const migratePlayingTime = async (fixtures) => {
    if (migrationComplete) return fixtures;
    
    console.log('🔄 Checking matches for playingTime migration...');
    const matchesToUpdate = [];
    
    // Extract all individual matches from fixtures
    fixtures.forEach(fixture => {
      fixture.matches.forEach(match => {
        if (!match.playingTime && match.time) {
          matchesToUpdate.push({
            id: match.id,
            playingTime: match.time
          });
        }
      });
    });
    
    if (matchesToUpdate.length > 0) {
      // Update matches in batches
      const updatePromises = matchesToUpdate.map(async (match) => {
        try {
          await updateDoc(doc(db, 'fixtures', match.id), {
            playingTime: match.playingTime
          });
        } catch (error) {
          console.error(`Failed to update match ${match.id}:`, error);
        }
      });
      
      await Promise.all(updatePromises);
    }
    
    setMigrationComplete(true);
    
    // Return updated fixtures with playingTime field added to matches
    return fixtures.map(fixture => ({
      ...fixture,
      playingTime: fixture.playingTime || fixture.time || '18:00',
      matches: fixture.matches.map(match => ({
        ...match,
        playingTime: match.playingTime || match.time || '18:00'
      }))
    }));
  };

  // Fetch active tournament from app-settings
  useEffect(() => {
    const fetchActiveTournament = async () => {
      try {
        // Fetch active tournament ID from app-settings
        const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
        const appSettingsDoc = await getDoc(appSettingsRef);

        if (!appSettingsDoc.exists() || !appSettingsDoc.data().activeTournamentId) {
          console.error('No active tournament found in app settings');
          setLoading(false);
          return;
        }

        const activeTournamentId = appSettingsDoc.data().activeTournamentId;
        setSelectedTournament(activeTournamentId);
      } catch (error) {
        console.error('Error fetching active tournament:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTournament();
  }, []);

  // Fetch fixtures when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchFixtures = async () => {
      setFixturesLoading(true);
      try {
        // Fetch teams for the selected tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', selectedTournament)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch matches to create fixtures
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', selectedTournament)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Create team lookup for fixture display
        const teamLookup = {};
        teamsData.forEach(team => {
          teamLookup[team.id] = team;
        });

        // Group matches by fixtureGroupId to create fixtures
        const fixtureGroups = {};
        matchesData.forEach(match => {
          const groupId = match.fixtureGroupId || match.id;
          if (!fixtureGroups[groupId]) {
            fixtureGroups[groupId] = {
              id: groupId,
              team1: match.team1,
              team2: match.team2,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              team1Details: teamLookup[match.team1],
              team2Details: teamLookup[match.team2],
              date: match.date,
              time: match.time,
              playingTime: match.playingTime, // Add playingTime field
              fixtureType: match.fixtureType || 'League', // Add fixtureType from match
              matches: [],
              status: 'scheduled'
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Update fixture playingTime to use the most recent playingTime from any match in the group
        Object.values(fixtureGroups).forEach(fixture => {
          // Find the most recent playingTime that's not the default 18:00
          const playingTimes = fixture.matches.map(m => m.playingTime).filter(pt => pt && pt !== '18:00');
          if (playingTimes.length > 0) {
            // Use the first non-default playingTime found
            fixture.playingTime = playingTimes[0];
          }
        });

        // Convert to array and determine fixture status
        const fixturesArray = Object.values(fixtureGroups).map(fixture => {
          // Helper function to determine if fixture is effectively completed
          const isFixtureEffectivelyCompleted = (matches) => {
            // Separate regular matches from gamebreaker
            const regularMatches = matches.filter(m =>
              m.matchType !== 'dreamBreaker' &&
              m.matchTypeLabel !== 'Dream Breaker' &&
              m.matchTypeLabel !== 'Game Breaker'
            );
            const gamebreakerMatches = matches.filter(m =>
              m.matchType === 'dreamBreaker' ||
              m.matchTypeLabel === 'Dream Breaker' ||
              m.matchTypeLabel === 'Game Breaker'
            );
            
            // Count completed regular matches
            const completedRegularMatches = regularMatches.filter(m => m.status === 'completed');
            
            // If less than 6 regular matches are completed, hide gamebreaker
            if (completedRegularMatches.length < 6) {
              return { isCompleted: false, shouldHideGamebreaker: true, filteredMatches: regularMatches };
            }
            
            // Count wins for each team in regular matches
            let team1Wins = 0;
            let team2Wins = 0;
            
            completedRegularMatches.forEach(match => {
              if (match.scores && match.status === 'completed') {
                const team1Scores = match.scores.player1 || {};
                const team2Scores = match.scores.player2 || {};
                let team1Games = 0;
                let team2Games = 0;
                
                for (let i = 1; i <= (match.gamesCount || 3); i++) {
                  const gameKey = `game${i}`;
                  const team1Score = parseInt(team1Scores[gameKey]) || 0;
                  const team2Score = parseInt(team2Scores[gameKey]) || 0;
                  
                  if (team1Score > team2Score) {
                    team1Games++;
                  } else if (team2Score > team1Score) {
                    team2Games++;
                  }
                }
                
                if (team1Games > team2Games) {
                  team1Wins++;
                } else if (team2Games > team1Games) {
                  team2Wins++;
                }
              }
            });
            
            // If one team has won 4+ out of 6 regular matches, fixture is effectively completed
            const isCompleted = team1Wins >= 4 || team2Wins >= 4;
            const shouldHideGamebreaker = isCompleted;
            
            // Filter out gamebreaker matches if fixture is effectively completed
            const filteredMatches = shouldHideGamebreaker ? regularMatches : matches;
            
            return { isCompleted, shouldHideGamebreaker, filteredMatches };
          };
          
          const { isCompleted, shouldHideGamebreaker, filteredMatches } = isFixtureEffectivelyCompleted(fixture.matches);
          
          // Update fixture matches to exclude gamebreaker if needed
          fixture.matches = filteredMatches;
          
          const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
          const totalMatches = fixture.matches.length;
          
          if (isCompleted || (completedMatches === totalMatches && totalMatches > 0)) {
            fixture.status = 'completed';
          } else if (completedMatches > 0) {
            fixture.status = 'in-progress';
          } else {
            fixture.status = 'scheduled';
          }
          
          return fixture;
        });

        // Sort fixtures by date, then by playing time
        const sortedFixtures = fixturesArray.sort((a, b) => {
          // Compare calendar days only: stored timestamps carry arbitrary times of day,
          // so the actual start time comes from playingTime below
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          dateA.setHours(0, 0, 0, 0);
          dateB.setHours(0, 0, 0, 0);

          // First sort by date
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
          }
          
          // If dates are the same, sort by playing time
          const timeA = a.playingTime || a.time || '18:00';
          const timeB = b.playingTime || b.time || '18:00';
          
          // Convert time strings to comparable format (e.g., "09:00" vs "21:00")
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          const totalMinutesA = hoursA * 60 + minutesA;
          const totalMinutesB = hoursB * 60 + minutesB;
          
          return totalMinutesA - totalMinutesB;
        });

        // Run migration to add playingTime field to fixtures that don't have it
        const migratedFixtures = await migratePlayingTime(sortedFixtures);
        setFixtures(migratedFixtures);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setFixtures([]);
      } finally {
        setFixturesLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedTournament]);


  // ---------- View model ----------

  const playoffTypes = ['qualifier', 'qualifier 1', 'qualifier 2', 'eliminator', 'final'];
  const isPlayoff = (fixture) => {
    const t = fixture.fixtureType ? fixture.fixtureType.toLowerCase() : '';
    return Boolean(fixture.fixtureType) && playoffTypes.includes(t);
  };

  // Matches/battle won by each side, counting completed matches only
  const battleScore = (fixture) => {
    let team1Wins = 0;
    let team2Wins = 0;
    (fixture.matches || []).forEach(match => {
      const result = matchResult(match);
      if (result.winner === 1) team1Wins++;
      else if (result.winner === 2) team2Wins++;
    });
    return { team1Wins, team2Wins };
  };

  const leagueFixtures = fixtures.filter(f => !isPlayoff(f));
  const playoffFixtures = fixtures.filter(isPlayoff);
  const tabFixtures = activeTab === 'league' ? leagueFixtures : playoffFixtures;

  // Group the tab's battles by calendar day -> one rail entry per matchday
  const days = (() => {
    const byKey = {};
    tabFixtures.forEach(fixture => {
      const d = parseDate(fixture.date);
      const key = d.getTime() > 0 ? d.toDateString() : 'unscheduled';
      if (!byKey[key]) byKey[key] = { key, date: d.getTime() > 0 ? d : null, fixtures: [] };
      byKey[key].fixtures.push(fixture);
    });
    return Object.values(byKey).sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    });
  })();

  // Default matchday: first one that isn't finished yet, else the last one
  const defaultDayKey = (() => {
    const live = days.find(d => d.fixtures.some(f => f.status !== 'completed'));
    return (live || days[days.length - 1])?.key || null;
  })();
  const activeDay = days.find(d => d.key === selectedDayKey) || days.find(d => d.key === defaultDayKey) || null;

  const totalLeague = leagueFixtures.length;
  const playedLeague = leagueFixtures.filter(f => f.status === 'completed').length;
  const pad = n => String(n).padStart(2, '0');

  const shortDate = (d) => d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : 'TBD';

  const dayLabel = (day, i) => {
    if (activeTab === 'playoffs') return day.fixtures[0]?.fixtureType || 'Playoffs';
    return day.date ? `Matchday ${pad(i + 1)}` : 'Unscheduled';
  };

  const dayInfo = (day) => {
    const n = day.fixtures.length;
    const done = day.fixtures.filter(f => f.status === 'completed').length;
    const live = day.fixtures.some(f => f.status === 'in-progress');
    const state = live ? 'Live' : done === n ? 'Final' : done > 0 ? `${done} final` : 'Upcoming';
    return `${n} ${n === 1 ? 'battle' : 'battles'} / ${state}`;
  };

  const teamName = (fixture, side) =>
    side === 1
      ? (fixture.team1Details?.name || fixture.team1Name || 'Team 1')
      : (fixture.team2Details?.name || fixture.team2Name || 'Team 2');

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedDayKey(null);
    setSelectedFixture(null);
  };

  const headerGridCols = isCompact ? '1fr' : 'minmax(0,1fr) minmax(320px,400px)';
  const cardPadX = isMobile ? '16px' : '30px';
  const progressPct = totalLeague ? `${((playedLeague / totalLeague) * 100).toFixed(1)}%` : '0%';

  const pageStyles = `
    .cc-fx-page ::selection { background: ${ORANGE}; color: ${INK}; }
    /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
    .cc-fx-page span { font-family: inherit; }
    .cc-fx-page button { font-family: 'Montserrat', sans-serif; }

    @keyframes ccBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes cc-fade-up { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: none; } }
    @keyframes cc-slide-in { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
    .cc-in { opacity: 0; animation: cc-fade-up .8s cubic-bezier(.2,.7,.2,1) forwards; }
    .cc-row-in { opacity: 0; animation: cc-slide-in .8s cubic-bezier(.2,.7,.2,1) forwards; }

    .cc-stage { transition: background .2s ease, color .2s ease; }
    .cc-stage:hover { background: ${ORANGE} !important; color: ${INK} !important; }
    .cc-md { transition: background .2s ease; }
    .cc-md:not(.is-active):hover { background: #f6e3de !important; }
    .cc-rail { scrollbar-width: none; }
    .cc-rail::-webkit-scrollbar { display: none; }
    .cc-battle-toggle:hover .cc-tap { color: #b3261a; }
  `;

  if (loading) {
    return (
      <div className="cc-fx-page" style={{ minHeight: '100vh', background: INK, fontFamily: "'Montserrat', sans-serif" }}>
        <style>{pageStyles}</style>
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="fixtures" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '40px 20px', fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
          Loading tournaments...
        </div>
      </div>
    );
  }

  return (
    <div className="cc-fx-page" style={{ background: INK, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{pageStyles}</style>

      <CCPLTopBar activeLeague="ccpl-s2" />
      <CCPLNavbar activePage="fixtures" />

      {/* ===== Header ===== */}
      <section style={{ position: 'relative', background: INK, color: '#fff', padding: 'clamp(56px,7vw,96px) 6vw calc(5vw + clamp(56px,7vw,96px))', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-1vw', bottom: '2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,32vw,520px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)' }}>VS</div>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: ORANGE, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>

        <div className="cc-in" style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: headerGridCols, alignItems: 'end', gap: '32px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{ display: 'inline-flex', flex: 'none', transform: 'skewX(-14deg)', background: ORANGE, padding: '8px 16px' }}>
                <span style={{ transform: 'skewX(14deg)', fontWeight: 800, fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap' }}>CCPL Hyderabad / Season 2</span>
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                Round Robin / {activeTab === 'league' ? days.filter(d => d.date).length : leagueDayCount(leagueFixtures)} Matchdays
              </span>
            </div>
            <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,160px)', lineHeight: .84, letterSpacing: '-.01em' }}>
              The <span style={{ color: ORANGE }}>Fixtures.</span>
            </h1>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(11,11,12,.7)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>Season progress</span>
              <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '64px', lineHeight: .8, whiteSpace: 'nowrap', color: ORANGE }}>
                {pad(playedLeague)}<span style={{ color: '#fff', fontSize: '34px' }}> / {pad(totalLeague)}</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: '10px', background: '#232324', clipPath: 'polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: progressPct, background: ORANGE, transformOrigin: 'left', animation: 'ccBar 1.2s .4s cubic-bezier(.2,.7,.2,1) both' }}></div>
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, lineHeight: 1.6, color: '#e8e8e8', borderLeft: `4px solid ${ORANGE}`, paddingLeft: '16px' }}>
              Battles played. Open any battle to see the six or seven matches behind the scoreline.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Fixtures ===== */}
      <section style={{ position: 'relative', background: PAPER, color: INK, marginTop: '-5vw', padding: 'calc(5vw + clamp(40px,5vw,64px)) 6vw clamp(64px,8vw,110px)', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* Stage switch */}
          <div className="cc-in" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', border: `2px solid ${INK}` }}>
              {[
                { key: 'league', label: 'Round Robin', meta: `${leagueDayCount(leagueFixtures)} matchdays` },
                { key: 'playoffs', label: 'Playoffs', meta: 'Top 4 qualify' },
              ].map(st => {
                const active = activeTab === st.key;
                return (
                  <button key={st.key} type="button" className="cc-stage" onClick={() => switchTab(st.key)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 22px', border: 0, cursor: 'pointer', background: active ? INK : 'transparent', color: active ? '#fff' : INK }}>
                    <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '24px', letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{st.label}</span>
                    {!isMobile && <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{st.meta}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {fixturesLoading ? (
            <StatusCard title="Loading results..." />
          ) : days.length === 0 ? (
            <StatusCard
              watermark="TBA"
              title={activeTab === 'playoffs' ? 'Playoff pairings to be confirmed' : 'Pairings to be announced'}
              text={activeTab === 'playoffs'
                ? 'The top four teams in the table qualify. Pairings are set once the round robin is complete.'
                : 'Battles for this season are published once the schedule is confirmed.'}
            />
          ) : (
            <>
              {/* Matchday rail */}
              <div className="cc-rail cc-in" style={{ overflowX: 'auto', margin: `0 ${isCompact ? '-6vw' : '0'} 28px`, padding: `0 ${isCompact ? '6vw' : '0'}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: isCompact ? `repeat(${days.length},${activeTab === 'playoffs' ? '240px' : '168px'})` : `repeat(${days.length},minmax(0,1fr))`, border: `2px solid ${INK}`, background: '#fff', width: isCompact ? 'max-content' : 'auto' }}>
                  {days.map((day, i) => {
                    const active = day.key === activeDay?.key;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={`cc-md${active ? ' is-active' : ''}`}
                        onClick={() => { setSelectedDayKey(day.key); setSelectedFixture(null); }}
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', padding: '16px 18px 14px', border: 0, borderLeft: i ? '1px solid #e4e1d8' : 0, cursor: 'pointer', textAlign: 'left', background: active ? INK : '#fff', color: active ? '#fff' : INK }}
                      >
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '5px', background: active ? ORANGE : 'transparent' }}></span>
                        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: active ? ORANGE : '#b3261a' }}>{dayLabel(day, i)}</span>
                        <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '32px', lineHeight: .95, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{shortDate(day.date)}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: active ? 'rgba(255,255,255,0.78)' : MUTED }}>{dayInfo(day)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Battles for the selected matchday */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {activeDay && activeDay.fixtures.map((fixture, i) => (
                  <BattleCard
                    key={`${activeDay.key}-${fixture.id}`}
                    fixture={fixture}
                    index={i}
                    dayDate={activeDay.date}
                    isMobile={isMobile}
                    isCompact={isCompact}
                    cardPadX={cardPadX}
                    showType={activeTab === 'playoffs'}
                    isOpen={selectedFixture?.id === fixture.id}
                    onToggle={() => setSelectedFixture(selectedFixture?.id === fixture.id ? null : fixture)}
                    teamName={teamName}
                    battleScore={battleScore}
                    shortDate={shortDate}
                  />
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '22px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED }}>Scores update within an hour of the final whistle.</span>
          </div>
        </div>
      </section>

      <CCPLPartners divider={false} />
      <CCPLFooter />
    </div>
  );
}

// ---------- Constants & helpers ----------

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const ZUUME = "'Zuume Cut', sans-serif";

// Display order of the matches inside a battle
const MATCH_ORDER = {
  'Men\'s Doubles': 1,
  'Women\'s Doubles': 2,
  'Men\'s Singles': 3,
  'Women\'s Singles': 4,
  'Men\'s Doubles (2)': 5,
  'Mixed Doubles': 6,
  'Game Breaker': 7,
  'Dream Breaker': 7 // Alternative name for Game Breaker
};

const MATCH_CODES = {
  'Men\'s Doubles': 'MD',
  'Men\'s Doubles (2)': 'MD2',
  'Women\'s Doubles': 'WD',
  'Men\'s Singles': 'MS',
  'Men\'s Singles (2)': 'MS2',
  'Women\'s Singles': 'WS',
  'Mixed Doubles': 'XD',
  'Game Breaker': 'GB',
  'Dream Breaker': 'GB'
};

const matchLabel = (match) => (match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel) || 'Match';

const leagueDayCount = (leagueFixtures) => {
  const keys = new Set();
  leagueFixtures.forEach(f => {
    const d = parseDate(f.date);
    if (d.getTime() > 0) keys.add(d.toDateString());
  });
  return keys.size;
};

// Per-game scores, games won, points and winner (1 / 2 / 0) of a completed match
function matchResult(match) {
  const empty = { done: false, games: [], games1: 0, games2: 0, points1: 0, points2: 0, winner: 0 };
  if (!match.scores || match.status !== 'completed') return empty;
  const team1Scores = match.scores.player1 || {};
  const team2Scores = match.scores.player2 || {};
  const games = [];
  let games1 = 0;
  let games2 = 0;
  let points1 = 0;
  let points2 = 0;
  for (let i = 1; i <= (match.gamesCount || 3); i++) {
    const a = parseInt(team1Scores[`game${i}`]) || 0;
    const b = parseInt(team2Scores[`game${i}`]) || 0;
    // Only count games that have been played (non-zero scores)
    if (a === 0 && b === 0) continue;
    games.push([a, b]);
    points1 += a;
    points2 += b;
    if (a > b) games1++;
    else if (b > a) games2++;
  }
  return { done: true, games, games1, games2, points1, points2, winner: games1 > games2 ? 1 : games2 > games1 ? 2 : 0 };
}

// Line-ups go public this long before the fixture starts
const PLAYER_REVEAL_MINUTES = 30;

// A side's line-up is in once every regular match has its players picked
function lineupSubmitted(fixture, side) {
  const t = side === 1 ? 'Team1' : 'Team2';
  return (fixture.matches || [])
    .filter((m) => m.matchType !== 'dreamBreaker')
    .every((m) => m[`player1${t}`] && (m.matchTypeLabel?.includes('Singles') || m[`player2${t}`]));
}

// Player line(s) for one side, honouring the pre-match reveal rule
function playerLine(match, fixture, side) {
  // Time the reveal off the same playing time the card shows
  const timed = { ...match, time: fixture.playingTime || fixture.time || match.time };
  if (!shouldShowPlayerNames(timed, fixture, PLAYER_REVEAL_MINUTES)) {
    const revealAt = getPlayerRevealTime(timed, fixture, PLAYER_REVEAL_MINUTES);
    const when = revealAt
      ? revealAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '')
      : null;
    return { text: when ? `Players will be revealed at ${when} Matchday` : 'Players will be revealed on Matchday', pending: true };
  }
  // Keep both line-ups hidden until each team has submitted theirs
  if (!lineupSubmitted(fixture, 1) || !lineupSubmitted(fixture, 2)) {
    return { text: 'Line-ups pending', pending: true };
  }
  const p1 = side === 1 ? match.player1Team1 : match.player1Team2;
  const p2 = side === 1 ? match.player2Team1 : match.player2Team2;
  if (match.matchTypeLabel?.includes('Singles')) {
    return p1 ? { text: p1 } : { text: 'Player not assigned', pending: true };
  }
  return p1 && p2 ? { text: `${p1} / ${p2}` } : { text: 'Players not assigned', pending: true };
}

function StatusCard({ title, text, watermark }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px', padding: '40px 36px', border: `2px solid ${INK}`, background: '#fff', overflow: 'hidden' }}>
      {watermark && (
        <span style={{ position: 'absolute', right: '-6px', top: '-14px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '160px', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(11,11,12,.1)', pointerEvents: 'none' }}>{watermark}</span>
      )}
      <span style={{ position: 'relative', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '44px', lineHeight: .95, textTransform: 'uppercase' }}>{title}</span>
      {text && <span style={{ position: 'relative', fontSize: '16px', lineHeight: 1.6, color: '#3d3a34', maxWidth: '56ch' }}>{text}</span>}
    </div>
  );
}

function TeamLogo({ fixture, side, size }) {
  const details = side === 1 ? fixture.team1Details : fixture.team2Details;
  const style = { width: size, height: size, flexShrink: 0, objectFit: 'contain', display: 'block' };
  return details?.logo?.url ? (
    <OptimizedImage src={details.logo.url} alt={details.name} type={parseInt(size) > 60 ? 'logo' : 'logoSmall'} style={style} />
  ) : (
    <span style={{ ...style, background: '#e4e1d8' }}></span>
  );
}

function ScoreBox({ value, state, mobile }) {
  // state: 'won' | 'lost' | 'neutral'
  const bg = state === 'won' ? ORANGE : PAPER;
  const color = state === 'lost' ? '#b8b3a6' : INK;
  return mobile ? (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '48px', lineHeight: 1, background: bg, color, clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>{value}</span>
  ) : (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '96px', padding: '6px 16px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(72px,7vw,112px)', lineHeight: .85, background: bg, color, clipPath: 'polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}>{value}</span>
  );
}

function BattleCard({ fixture, index, dayDate, isMobile, isCompact, cardPadX, showType, isOpen, onToggle, teamName, battleScore, shortDate }) {
  const pad = n => String(n).padStart(2, '0');
  const home = teamName(fixture, 1);
  const away = teamName(fixture, 2);
  const { team1Wins, team2Wins } = battleScore(fixture);
  const showScore = fixture.status === 'completed' || fixture.status === 'in-progress';
  const done = fixture.status === 'completed';
  const homeWon = done && team1Wins > team2Wins;
  const awayWon = done && team2Wins > team1Wins;
  const statusLabel = done ? 'Full time' : fixture.status === 'in-progress' ? 'In progress' : 'Scheduled';
  const statusBg = done ? ORANGE : fixture.status === 'in-progress' ? '#fbbf24' : '#fff';
  const time = formatTimeTo12Hour(fixture.playingTime || fixture.time);
  const meta = [`Battle ${pad(index + 1)}`, showType && fixture.fixtureType, shortDate(dayDate), time].filter(Boolean).join(' / ');

  const matches = [...(fixture.matches || [])].sort((a, b) => (MATCH_ORDER[a.matchTypeLabel] || 999) - (MATCH_ORDER[b.matchTypeLabel] || 999));
  const muted = '#8a857a';
  const homeColor = awayWon ? muted : INK;
  const awayColor = homeWon ? muted : INK;
  const scoreState = (won, lost) => (won ? 'won' : lost ? 'lost' : 'neutral');
  const winnerTag = (
    <span style={{ width: 'fit-content', fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', padding: '3px 8px', background: INK, color: '#fff' }}>Winner</span>
  );

  return (
    <div className="cc-row-in" style={{ border: `2px solid ${INK}`, background: '#fff', animationDelay: `${(index % 6) * 0.07}s` }}>
      <button type="button" className="cc-battle-toggle" onClick={onToggle} aria-expanded={isOpen} style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', background: INK, color: '#fff', minHeight: '42px' }}>
          <span style={{ display: 'flex', alignItems: 'center', padding: `0 ${cardPadX}`, fontSize: '12px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{meta}</span>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 18px 0 22px', fontSize: '12px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: statusBg, color: INK, clipPath: 'polygon(12px 0,100% 0,100% 100%,0 100%)' }}>{statusLabel}</span>
        </div>

        {!isMobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: '32px', padding: `32px ${cardPadX} 26px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
              <TeamLogo fixture={fixture} side={1} size="76px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(30px,3vw,48px)', lineHeight: .92, textTransform: 'uppercase', color: homeColor }}>{home}</span>
                {homeWon && winnerTag}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '6px' }}>
              <ScoreBox value={showScore ? team1Wins : '–'} state={scoreState(homeWon, awayWon)} />
              <ScoreBox value={showScore ? team2Wins : '–'} state={scoreState(awayWon, homeWon)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: '20px', minWidth: 0 }}>
              <TeamLogo fixture={fixture} side={2} size="76px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: 0, textAlign: 'right' }}>
                <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(30px,3vw,48px)', lineHeight: .92, textTransform: 'uppercase', color: awayColor }}>{away}</span>
                {awayWon && winnerTag}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: `18px ${cardPadX} 16px` }}>
            {[[1, home, team1Wins, homeWon, awayWon, homeColor], [2, away, team2Wins, awayWon, homeWon, awayColor]].map(([side, name, wins, won, lost, color]) => (
              <div key={side} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 64px', alignItems: 'center', gap: '12px' }}>
                <TeamLogo fixture={fixture} side={side} size="44px" />
                <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '26px', lineHeight: .95, textTransform: 'uppercase', color }}>{name}</span>
                <ScoreBox mobile value={showScore ? wins : '–'} state={scoreState(won, lost)} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: `0 ${cardPadX} 20px` }}>
          {matches.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {matches.map(match => {
                const r = matchResult(match);
                return (
                  <div key={match.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                    <div style={{ height: '10px', background: r.winner === 1 ? ORANGE : r.winner === 2 ? INK : '#e4e1d8', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}></div>
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: r.winner === 1 ? '#b3261a' : INK }}>
                      {MATCH_CODES[match.matchTypeLabel] || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: MUTED }}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
            <span className="cc-tap" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '20px', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: INK, transition: 'color .2s ease' }}>
              {isOpen ? 'Hide matches' : 'View matches'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="3.5" strokeLinecap="square" style={{ transition: 'transform .3s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </div>
        </div>
      </button>

      <div style={{ display: 'grid', transition: 'grid-template-rows .4s ease', gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '6px', padding: isMobile ? '12px' : '20px 24px 24px', borderTop: `2px solid ${INK}`, background: INK }}>
            {matches.map((match, j) => (
              <MatchRow key={match.id} match={match} fixture={fixture} num={j + 1} compact={isCompact} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match, fixture, num, compact }) {
  const pad = n => String(n).padStart(2, '0');
  const r = matchResult(match);
  const hw = r.winner === 1;
  const aw = r.winner === 2;
  const dimW = 'rgba(255,255,255,0.6)';
  const label = matchLabel(match);
  const code = MATCH_CODES[match.matchTypeLabel] || pad(num);
  const p1 = playerLine(match, fixture, 1);
  const p2 = playerLine(match, fixture, 2);

  // One game: show points ("Won by N"). Several games: show games won + each game's score.
  const single = r.games.length === 1;
  const big1 = !r.done ? '–' : single ? r.points1 : r.games1;
  const big2 = !r.done ? '–' : single ? r.points2 : r.games2;
  const margin = !r.done
    ? (match.status === 'in-progress' ? 'In progress' : 'Scheduled')
    : r.games.length === 0 ? 'No score'
    : r.winner === 0 ? 'Draw'
    : single ? `Won by ${Math.abs(r.points1 - r.points2)}`
    : r.games.map(([a, b]) => `${a}-${b}`).join(' · ');
  const totalPoints = r.points1 + r.points2;
  const homePct = totalPoints ? `${((r.points1 / totalPoints) * 100).toFixed(1)}%` : '50%';

  const playerStyle = (won, line) => ({
    fontSize: compact ? '14px' : '15px',
    lineHeight: 1.4,
    color: line.pending ? 'rgba(255,255,255,0.4)' : won || !r.done ? '#fff' : dimW,
    fontWeight: won ? 700 : 400,
    fontStyle: line.pending ? 'italic' : 'normal'
  });
  const scoreColor = (won, lost) => (lost ? 'rgba(255,255,255,0.45)' : '#fff');
  const edge = hw ? ORANGE : aw ? '#fff' : '#2e2e30';
  const bar = (
    <div style={{ display: 'flex', gap: '3px', height: compact ? '5px' : '6px' }}>
      <div style={{ width: homePct, background: r.done ? (hw ? ORANGE : '#2e2e30') : '#2e2e30' }}></div>
      <div style={{ flex: 1, background: r.done ? (hw ? '#2e2e30' : '#fff') : '#2e2e30' }}></div>
    </div>
  );

  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 16px 16px 20px', background: '#141415', color: '#fff' }}>
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: edge }}></span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '32px', lineHeight: 1, color: hw ? ORANGE : '#fff' }}>{code}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.72)' }}>{margin}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px', alignItems: 'center', gap: '12px' }}>
          <span style={playerStyle(hw, p1)}>{p1.text}</span>
          <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '36px', lineHeight: 1, textAlign: 'right', color: scoreColor(hw, aw) }}>{big1}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px', alignItems: 'center', gap: '12px' }}>
          <span style={playerStyle(aw, p2)}>{p2.text}</span>
          <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '36px', lineHeight: 1, textAlign: 'right', color: scoreColor(aw, hw) }}>{big2}</span>
        </div>
        {bar}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '230px minmax(0,1fr) minmax(200px,250px) minmax(0,1fr)', alignItems: 'center', gap: '28px', padding: '22px 26px 22px 30px', background: '#141415', color: '#fff' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: edge }}></span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '44px', lineHeight: 1, minWidth: '60px', color: hw ? ORANGE : '#fff' }}>{code}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.72)' }}>Match {pad(num)}</span>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        </span>
      </div>
      <span style={{ ...playerStyle(hw, p1), textAlign: 'right' }}>{p1.text}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '48px', lineHeight: 1 }}>
          <span style={{ color: scoreColor(hw, aw) }}>{big1}</span>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: 'normal', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.72)' }}>{margin}</span>
          <span style={{ color: scoreColor(aw, hw) }}>{big2}</span>
        </div>
        {bar}
      </div>
      <span style={playerStyle(aw, p2)}>{p2.text}</span>
    </div>
  );
}
