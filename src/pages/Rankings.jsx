import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';
import CCPLTopBar from '../components/CCPLTopBar';
import OptimizedImage from '../components/OptimizedImage';
import { parseDate } from '../utils/dateTimeUtils';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const ZUUME = "'Zuume Cut', sans-serif";
const QUALIFY = 4; // top four make the playoffs

export default function Rankings() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [, setFixturesLoading] = useState(false);
  const [openRow, setOpenRow] = useState(-1); // expanded row on narrow screens
  const [narrow, setNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 1040);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1040);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch tournaments from Firebase
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const snapshot = await getDocs(tournamentsRef);
        const allTournaments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Filter out "CCPL Clubs" tournament
        const tournamentsList = allTournaments.filter(
          tournament => tournament.name !== 'CCPL Clubs' && tournament.tournamentName !== 'CCPL Clubs'
        );
        setTournaments(tournamentsList);
        
        // Default to the active season (app settings), else the first tournament
        if (tournamentsList.length > 0) {
          let activeTournamentId = null;
          try {
            const settings = await getDoc(doc(db, 'app-settings', 'mobile-app'));
            activeTournamentId = settings.exists() ? settings.data().activeTournamentId : null;
          } catch (settingsError) {
            console.error('Error fetching active tournament:', settingsError);
          }
          const active = tournamentsList.find(t => t.id === activeTournamentId);
          setSelectedTournament((active || tournamentsList[0]).id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  // Fetch teams and fixtures when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchTeamsAndFixtures = async () => {
      setTeamsLoading(true);
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

        // Fetch matches to calculate team statistics and for schedule
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
              matches: [],
              status: 'scheduled',
              fixtureType: match.fixtureType, // Include fixtureType to identify playoff fixtures
              playoffStage: match.playoffStage,
              playoffNumber: match.playoffNumber,
              playoffName: match.playoffName
            };
          }
          fixtureGroups[groupId].matches.push(match);
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
            
            if (completedRegularMatches.length < 6) {
              return { isCompleted: false, shouldHideGamebreaker: false, filteredMatches: matches };
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
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
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

        setFixtures(sortedFixtures);

        // Calculate team statistics based on fixtures
        const teamStats = teamsData.map(team => {
          // Get all fixtures involving this team, excluding playoff fixtures
          const teamFixtures = Object.values(fixtureGroups).filter(fixture => {
            const isTeamInvolved = fixture.team1 === team.id || fixture.team2 === team.id;
            // Exclude playoff fixtures from rankings calculations (case-insensitive)
            const excludedFixtureTypes = ['playoff', 'qualifier', 'qualifier 1', 'qualifier 2', 'eliminator', 'final'];
            const fixtureTypeNormalized = fixture.fixtureType ? fixture.fixtureType.toLowerCase() : '';
            const isExcludedType = fixture.fixtureType && excludedFixtureTypes.includes(fixtureTypeNormalized);
            return isTeamInvolved && !isExcludedType;
          });

          let battleWins = 0; // Number of fixtures won
          let battleLosses = 0; // Number of fixtures lost
          let points = 0; // 3 points for each fixture win
          let gameWins = 0; // Total games won across all matches (excluding gamebreaker)
          let gameLosses = 0; // Total games lost across all matches (excluding gamebreaker)
          let pointsWon = 0; // Total points won across all matches (excluding gamebreaker)
          let pointsLost = 0; // Total points lost across all matches (excluding gamebreaker)

          teamFixtures.forEach(fixture => {
            // Process fixtures that are completed OR in-progress (for real-time updates)
            if (fixture.status === 'completed' || fixture.status === 'in-progress') {
              const isTeam1 = fixture.team1 === team.id;
              let team1MatchWins = 0;
              let team2MatchWins = 0;
              let team1TotalGames = 0;
              let team2TotalGames = 0;
              let team1TotalPoints = 0;
              let team2TotalPoints = 0;
              let completedMatches = 0;
              let totalMatches = fixture.matches.length;

              // Process each match in the fixture
              fixture.matches.forEach(match => {
                if (match.scores && match.status === 'completed') {
                  completedMatches++;
                  
                  // Skip gamebreaker matches entirely for game wins/losses and points won/lost
                  if (match.matchType !== 'dreamBreaker' && match.matchTypeLabel !== 'Dream Breaker' && match.matchTypeLabel !== 'Game Breaker') {
                    const team1Scores = match.scores.player1 || {};
                    const team2Scores = match.scores.player2 || {};
                    
                    let team1Games = 0;
                    let team2Games = 0;
                    let team1MatchPoints = 0;
                    let team2MatchPoints = 0;

                    // Count games and points for regular matches only
                    const totalGames = match.gamesCount || 3;
                    
                    for (let i = 1; i <= totalGames; i++) {
                      const gameKey = `game${i}`;
                      const team1Score = parseInt(team1Scores[gameKey]) || 0;
                      const team2Score = parseInt(team2Scores[gameKey]) || 0;
                      
                      team1MatchPoints += team1Score;
                      team2MatchPoints += team2Score;
                      
                      if (team1Score > team2Score) {
                        team1Games++;
                      } else if (team2Score > team1Score) {
                        team2Games++;
                      }
                    }

                    // Add to fixture totals (only for non-gamebreaker matches)
                    team1TotalGames += team1Games;
                    team2TotalGames += team2Games;
                    team1TotalPoints += team1MatchPoints;
                    team2TotalPoints += team2MatchPoints;
                  }

                  // Determine match winner for fixture calculation (includes all matches)
                  const team1Scores = match.scores.player1 || {};
                  const team2Scores = match.scores.player2 || {};
                  let team1Games = 0;
                  let team2Games = 0;
                  
                  const totalGames = match.gamesCount || 3;
                  for (let i = 1; i <= totalGames; i++) {
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
                    team1MatchWins++;
                  } else if (team2Games > team1Games) {
                    team2MatchWins++;
                  }
                }
              });

              // Determine fixture winner - can be determined early if one team has already won majority
              const remainingMatches = totalMatches - completedMatches;
              const matchesNeededToWin = Math.ceil(totalMatches / 2);
              
              let team1WonFixture = false;
              let team2WonFixture = false;
              let fixtureDecided = false;

              // Check if fixture is already decided (one team has won enough matches)
              if (team1MatchWins >= matchesNeededToWin) {
                team1WonFixture = true;
                fixtureDecided = true;
              } else if (team2MatchWins >= matchesNeededToWin) {
                team2WonFixture = true;
                fixtureDecided = true;
              } else if (fixture.status === 'completed') {
                // If fixture is completed but no clear winner by majority, use simple comparison
                team1WonFixture = team1MatchWins > team2MatchWins;
                team2WonFixture = team2MatchWins > team1MatchWins;
                fixtureDecided = true;
              }
              
              if (isTeam1) {
                // Add games and points for this team
                gameWins += team1TotalGames;
                gameLosses += team2TotalGames;
                pointsWon += team1TotalPoints;
                pointsLost += team2TotalPoints;
                
                // Award fixture points only if fixture winner is decided
                if (fixtureDecided) {
                  if (team1WonFixture) {
                    battleWins++;
                    points += 3; // 3 points for winning the fixture
                  } else if (team2WonFixture) {
                    battleLosses++;
                    // No points for losing a fixture
                  }
                }
              } else {
                // Add games and points for this team
                gameWins += team2TotalGames;
                gameLosses += team1TotalGames;
                pointsWon += team2TotalPoints;
                pointsLost += team1TotalPoints;
                
                // Award fixture points only if fixture winner is decided
                if (fixtureDecided) {
                  if (team2WonFixture) {
                    battleWins++;
                    points += 3; // 3 points for winning the fixture
                  } else if (team1WonFixture) {
                    battleLosses++;
                    // No points for losing a fixture
                  }
                }
              }
            }
          });

          const gamesDifference = gameWins - gameLosses;
          const pointsDifference = pointsWon - pointsLost;

          return {
            ...team,
            battleWins,
            battleLosses,
            points,
            gameWins,
            gameLosses,
            pointsWon,
            pointsLost,
            gamesDifference,
            pointsDifference
          };
        });

        // Sort teams by points (descending), then by battle wins, then by games difference, then by points difference
        teamStats.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.battleWins !== a.battleWins) return b.battleWins - a.battleWins;
          if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
          return b.pointsDifference - a.pointsDifference;
        });

        setTeams(teamStats);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setTeamsLoading(false);
        setFixturesLoading(false);
      }
    };

    fetchTeamsAndFixtures();
  }, [selectedTournament]);

  const fmt = n => (n > 0 ? `+${n}` : String(n));
  const selected = tournaments.find(t => t.id === selectedTournament);
  const tournamentLabel = selected ? (selected.name || selected.tournamentName || 'Tournament') : 'CCPL Hyderabad';

  // Until a battle is played the order is arbitrary, so no leader / playoff highlighting yet
  const seasonStarted = teams.some(t => t.battleWins + t.battleLosses > 0);

  // Presentation for each standings row (leader row is inverted to ink)
  const rows = teams.map((t, k) => {
    const lead = seasonStarted && k === 0;
    const inTop = seasonStarted && k < QUALIFY;
    const diffColor = n => (n > 0 ? (lead ? '#7fdba0' : '#1f7a45') : n < 0 ? (lead ? '#ff8a78' : '#b3261a') : (lead ? '#bdbdbd' : MUTED));
    return {
      ...t,
      rank: String(k + 1),
      played: t.battleWins + t.battleLosses,
      tag: !seasonStarted ? 'Yet to play' : lead ? 'League Leader' : inTop ? 'Playoff spot' : `${t.battleWins}W · ${t.battleLosses}L`,
      rowBg: lead ? INK : '#fff',
      ink: lead ? '#fff' : INK,
      subInk: lead ? '#bdbdbd' : MUTED,
      divider: lead ? '#232324' : '#e4e1d8',
      edge: inTop ? ORANGE : '#e4e1d8',
      rankColor: lead ? ORANGE : inTop || !seasonStarted ? INK : '#b8b3a6',
      ptsBg: lead ? ORANGE : '#f6e3de',
      gd: fmt(t.gamesDifference),
      pd: fmt(t.pointsDifference),
      gdColor: diffColor(t.gamesDifference),
      pdColor: diffColor(t.pointsDifference),
    };
  });

  const wideCols = '90px minmax(0,1fr) repeat(6,82px) 120px';
  const narrowCols = '40px minmax(0,1fr) 32px 32px 58px';
  const statText = { textAlign: 'center', fontFamily: ZUUME, fontWeight: 700, fontStyle: 'italic', fontSize: '26px' };

  const logo = (team, size) => team.logo?.url ? (
    <OptimizedImage src={team.logo.url} alt={team.name} type={size > 40 ? 'logo' : 'logoSmall'} style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  ) : (
    <span style={{ display: 'block', width: size, height: size, background: '#e4e1d8' }}></span>
  );

  return (
    <div className="cc-rank-page" style={{ background: INK, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        .cc-rank-page ::selection { background: ${ORANGE}; color: ${INK}; }
        /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
        .cc-rank-page span { font-family: inherit; }
        .cc-rank-page button, .cc-rank-page select { font-family: 'Montserrat', sans-serif; }

        @keyframes cc-fade-up { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: none; } }
        @keyframes cc-slide-in { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
        .cc-in { opacity: 0; animation: cc-fade-up .8s cubic-bezier(.2,.7,.2,1) forwards; }
        .cc-row-in { opacity: 0; animation: cc-slide-in .8s cubic-bezier(.2,.7,.2,1) forwards; }

        .cc-rank-row { transition: background .2s ease; }
        .cc-rank-row:hover { background: #fbf1ee !important; }
        .cc-rank-row.is-lead:hover { background: #1a1a1b !important; }
        .cc-seg-link { transition: background .2s ease; }
        .cc-seg-link:hover { background: ${ORANGE} !important; color: ${INK} !important; }
      `}</style>

      <CCPLTopBar activeLeague="ccpl-s2" />
      <CCPLNavbar activePage="rankings" />

      <section style={{ position: 'relative', background: PAPER, color: INK, padding: 'clamp(56px,7vw,96px) 6vw clamp(80px,10vw,140px)', minHeight: '80vh', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: ORANGE, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>

          <div className="cc-in" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px 40px', marginBottom: 'clamp(28px,4vw,44px)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#b3261a', marginBottom: '10px' }}>{tournamentLabel}</div>
              <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,150px)', lineHeight: .84, letterSpacing: '-.01em' }}>Team Rankings</h1>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '12px' }}>
              {tournaments.length > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', border: `2px solid ${INK}`, background: '#fff', padding: '0 12px 0 16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>Season</span>
                  <select
                    value={selectedTournament}
                    onChange={(e) => { setSelectedTournament(e.target.value); setOpenRow(-1); }}
                    style={{ border: 0, background: 'transparent', padding: '12px 4px', fontSize: '14px', fontWeight: 700, color: INK, cursor: 'pointer', outline: 'none' }}
                  >
                    {tournaments.map(tournament => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div style={{ display: 'flex', alignItems: 'stretch', border: `2px solid ${INK}` }}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', background: INK, color: '#fff', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Team Standings</span>
                <Link to="/ccpl-fixtures" className="cc-seg-link" style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', color: INK, textDecoration: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Fixtures</Link>
              </div>
            </div>
          </div>

          {loading || teamsLoading ? (
            <Notice text="Loading standings..." />
          ) : tournaments.length === 0 ? (
            <Notice text="No tournaments available" />
          ) : rows.length === 0 ? (
            <Notice text="No teams found for this tournament" />
          ) : !narrow ? (
            <>
              <div style={{ background: '#fff', border: `2px solid ${INK}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: wideCols, alignItems: 'center', background: INK, color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', height: '50px' }}>
                  <span style={{ paddingLeft: '28px', color: ORANGE }}>Pos</span>
                  <span style={{ paddingLeft: '12px' }}>Team</span>
                  {['P', 'W', 'L', 'Games', 'GD', 'PD'].map(h => <span key={h} style={{ textAlign: 'center' }}>{h}</span>)}
                  <span style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ORANGE, color: INK }}>Pts</span>
                </div>
                {rows.map((t, k) => (
                  <div key={t.id} className={`cc-rank-row cc-row-in${t.rowBg === INK ? ' is-lead' : ''}`} style={{ position: 'relative', display: 'grid', gridTemplateColumns: wideCols, alignItems: 'center', height: '84px', borderTop: '1px solid #e4e1d8', background: t.rowBg, color: t.ink, animationDelay: `${(k % 8) * 0.06}s` }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: t.edge }}></span>
                    <span style={{ paddingLeft: '28px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '46px', lineHeight: 1, color: t.rankColor }}>{t.rank}</span>
                    <Link to={`/ccpl-teams/${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, paddingLeft: '12px', color: 'inherit', textDecoration: 'none' }}>
                      <span style={{ flex: 'none' }}>{logo(t, 56)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '30px', lineHeight: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: '6px', color: t.subInk }}>{t.tag}</div>
                      </div>
                    </Link>
                    <span style={statText}>{t.played}</span>
                    <span style={statText}>{t.battleWins}</span>
                    <span style={statText}>{t.battleLosses}</span>
                    <span style={{ ...statText, fontSize: '24px', color: t.subInk }}>{t.gameWins}-{t.gameLosses}</span>
                    <span style={{ ...statText, fontWeight: 900, color: t.gdColor }}>{t.gd}</span>
                    <span style={{ ...statText, fontWeight: 900, color: t.pdColor }}>{t.pd}</span>
                    <span style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '46px', color: INK, background: t.ptsBg }}>{t.points}</span>
                  </div>
                ))}
              </div>
              <Legend />
            </>
          ) : (
            <>
              <div style={{ background: '#fff', border: `2px solid ${INK}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: narrowCols, alignItems: 'center', gap: '0 6px', background: INK, color: '#fff', height: '42px', paddingLeft: '14px', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  <span style={{ color: ORANGE }}>Pos</span>
                  <span>Team</span>
                  <span style={{ textAlign: 'center' }}>W</span>
                  <span style={{ textAlign: 'center' }}>L</span>
                  <span style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ORANGE, color: INK }}>Pts</span>
                </div>
                {rows.map((t, k) => {
                  const open = openRow === k;
                  return (
                    <div key={t.id} className="cc-row-in" style={{ position: 'relative', borderTop: `1px solid ${t.divider}`, background: t.rowBg, color: t.ink, animationDelay: `${(k % 8) * 0.06}s` }}>
                      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: t.edge }}></span>
                      <button type="button" onClick={() => setOpenRow(open ? -1 : k)} aria-expanded={open} style={{ width: '100%', display: 'grid', gridTemplateColumns: narrowCols, alignItems: 'center', gap: '0 6px', padding: '0 0 0 14px', minHeight: '66px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
                        <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '32px', color: t.rankColor }}>{t.rank}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ flex: 'none' }}>{logo(t, 34)}</span>
                          <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', lineHeight: 1.02, textTransform: 'uppercase' }}>{t.name}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flex: 'none', transition: 'transform .3s ease', transform: `rotate(${open ? 180 : 0}deg)` }}><path d="M6 9l6 6 6-6" /></svg>
                        </span>
                        <span style={{ ...statText, fontSize: '22px' }}>{t.battleWins}</span>
                        <span style={{ ...statText, fontSize: '22px' }}>{t.battleLosses}</span>
                        <span style={{ height: '100%', minHeight: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '34px', color: INK, background: t.ptsBg }}>{t.points}</span>
                      </button>
                      <div style={{ display: 'grid', transition: 'grid-template-rows .35s ease', gridTemplateRows: open ? '1fr' : '0fr' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', borderTop: `1px solid ${t.divider}`, marginLeft: '5px' }}>
                            {[
                              ['Games', `${t.gameWins}-${t.gameLosses}`],
                              ['Points', `${t.pointsWon}-${t.pointsLost}`],
                              ['GD', t.gd, t.gdColor],
                              ['PD', t.pd, t.pdColor],
                            ].map(([label, value, color]) => (
                              <div key={label} style={{ padding: '10px 8px 10px 12px', minWidth: 0 }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: t.subInk }}>{label}</div>
                                <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', whiteSpace: 'nowrap', color: color || 'inherit' }}>{value}</div>
                              </div>
                            ))}
                          </div>
                          <Link to={`/ccpl-teams/${t.id}`} style={{ display: 'block', padding: '0 12px 12px 17px', fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: ORANGE, textDecoration: 'none' }}>View team →</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Legend />
            </>
          )}
        </div>
      </section>

      <CCPLPartners divider={false} />
      <CCPLFooter />
    </div>
  );
}

function Notice({ text }) {
  return (
    <div style={{ background: '#fff', border: `2px solid ${INK}`, padding: '48px 24px', textAlign: 'center', fontSize: '16px', fontWeight: 600, color: MUTED }}>
      {text}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px 24px', marginTop: '16px' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED }}>
        P Played · W/L Battles won/lost · GD Games diff · PD Points diff · 3 pts per battle win · Top {QUALIFY} qualify
      </span>
    </div>
  );
}
