import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function ClubsTable() {
  // Add font styles
  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueRegularFont}') format('woff');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueMediumFont}') format('woff');
      font-weight: 500;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueSemiboldFont}') format('woff');
      font-weight: 600;
      font-style: normal;
    }
  `;

  const [activeTab, setActiveTab] = useState('Conference A');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conferenceATeams, setConferenceATeams] = useState([]);
  const [conferenceBTeams, setConferenceBTeams] = useState([]);

  // Fetch teams from HPL Clubs tournament
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // First, find the HPL Clubs tournament
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentsSnapshot = await getDocs(tournamentsRef);
        
        let hplClubsTournamentId = null;
        let tournamentData = null;
        const allTournaments = [];
        tournamentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allTournaments.push({ id: doc.id, ...data });
          // Check for HPL Clubs tournament with various possible field names
          if (data.name === 'HPL Clubs' ||
              data.tournamentName === 'HPL Clubs' ||
              data.name?.toLowerCase().includes('hpl clubs') ||
              data.tournamentName?.toLowerCase().includes('hpl clubs')) {
            hplClubsTournamentId = doc.id;
            tournamentData = data;
          }
        });

        console.log('All tournaments:', allTournaments);
        console.log('HPL Clubs Tournament ID:', hplClubsTournamentId);
        console.log('Tournament Data:', tournamentData);

        if (!hplClubsTournamentId) {
          console.warn('HPL Clubs tournament not found. Available tournaments:', allTournaments.map(t => ({ id: t.id, name: t.name, tournamentName: t.tournamentName })));
          setTeams([]);
          setConferenceATeams([]);
          setConferenceBTeams([]);
          setLoading(false);
          return;
        }

        // Fetch clubs from hpl-clubs collection to get logos
        const clubsRef = collection(db, 'hpl-clubs');
        const clubsSnapshot = await getDocs(clubsRef);
        const clubsData = {};
        clubsSnapshot.docs.forEach(doc => {
          clubsData[doc.id] = doc.data();
        });

        // Fetch teams for HPL Clubs tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', hplClubsTournamentId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => {
          const teamData = doc.data();
          // Try to find matching club data by team name
          let clubLogo = null;
          for (const clubId in clubsData) {
            const club = clubsData[clubId];
            if (club.name === teamData.name || club.clubName === teamData.name) {
              // Handle teamLogo structure with url property
              if (club.teamLogo && club.teamLogo.url) {
                clubLogo = { url: club.teamLogo.url };
              } else if (club.logo && club.logo.url) {
                clubLogo = { url: club.logo.url };
              } else if (club.teamLogo && typeof club.teamLogo === 'string') {
                clubLogo = { url: club.teamLogo };
              } else if (club.logo && typeof club.logo === 'string') {
                clubLogo = { url: club.logo };
              }
              break;
            }
          }
          return {
            id: doc.id,
            ...teamData,
            logo: clubLogo || teamData.logo // Use club logo if found, otherwise use team logo
          };
        });

        // Fetch matches to calculate team statistics
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', hplClubsTournamentId)
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
              fixtureType: match.fixtureType,
              playoffStage: match.playoffStage,
              playoffNumber: match.playoffNumber,
              playoffName: match.playoffName
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Convert to array and determine fixture status
        const fixturesArray = Object.values(fixtureGroups).map(fixture => {
          const isFixtureEffectivelyCompleted = (matches) => {
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
            
            const completedRegularMatches = regularMatches.filter(m => m.status === 'completed');
            
            if (completedRegularMatches.length < 6) {
              return { isCompleted: false, shouldHideGamebreaker: false, filteredMatches: matches };
            }
            
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
            
            const isCompleted = team1Wins >= 4 || team2Wins >= 4;
            const shouldHideGamebreaker = isCompleted;
            const filteredMatches = shouldHideGamebreaker ? regularMatches : matches;
            
            return { isCompleted, shouldHideGamebreaker, filteredMatches };
          };
          
          const { isCompleted, shouldHideGamebreaker, filteredMatches } = isFixtureEffectivelyCompleted(fixture.matches);
          
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

        // Calculate team statistics based on fixtures
        const teamStats = teamsData.map(team => {
          const teamFixtures = Object.values(fixtureGroups).filter(fixture => {
            const isTeamInvolved = fixture.team1 === team.id || fixture.team2 === team.id;
            const playoffTypes = ['playoff', 'Qualifier', 'Qualifier 1', 'Qualifier 2', 'Eliminator', 'Final'];
            const isNotPlayoff = !fixture.fixtureType || !playoffTypes.includes(fixture.fixtureType);
            return isTeamInvolved && isNotPlayoff;
          });

          let battleWins = 0;
          let battleLosses = 0;
          let points = 0;
          let gameWins = 0;
          let gameLosses = 0;
          let pointsWon = 0;
          let pointsLost = 0;

          teamFixtures.forEach(fixture => {
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

              fixture.matches.forEach(match => {
                if (match.scores && match.status === 'completed') {
                  completedMatches++;
                  
                  if (match.matchType !== 'dreamBreaker' && match.matchTypeLabel !== 'Dream Breaker' && match.matchTypeLabel !== 'Game Breaker') {
                    const team1Scores = match.scores.player1 || {};
                    const team2Scores = match.scores.player2 || {};
                    
                    let team1Games = 0;
                    let team2Games = 0;
                    let team1MatchPoints = 0;
                    let team2MatchPoints = 0;

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

                    team1TotalGames += team1Games;
                    team2TotalGames += team2Games;
                    team1TotalPoints += team1MatchPoints;
                    team2TotalPoints += team2MatchPoints;
                  }

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

              const remainingMatches = totalMatches - completedMatches;
              const matchesNeededToWin = Math.ceil(totalMatches / 2);
              
              let team1WonFixture = false;
              let team2WonFixture = false;
              let fixtureDecided = false;

              if (team1MatchWins >= matchesNeededToWin) {
                team1WonFixture = true;
                fixtureDecided = true;
              } else if (team2MatchWins >= matchesNeededToWin) {
                team2WonFixture = true;
                fixtureDecided = true;
              } else if (fixture.status === 'completed') {
                team1WonFixture = team1MatchWins > team2MatchWins;
                team2WonFixture = team2MatchWins > team1MatchWins;
                fixtureDecided = true;
              }
              
              if (isTeam1) {
                gameWins += team1TotalGames;
                gameLosses += team2TotalGames;
                pointsWon += team1TotalPoints;
                pointsLost += team2TotalPoints;
                
                if (fixtureDecided) {
                  if (team1WonFixture) {
                    battleWins++;
                    points += 3;
                  } else if (team2WonFixture) {
                    battleLosses++;
                  }
                }
              } else {
                gameWins += team2TotalGames;
                gameLosses += team1TotalGames;
                pointsWon += team2TotalPoints;
                pointsLost += team1TotalPoints;
                
                if (fixtureDecided) {
                  if (team2WonFixture) {
                    battleWins++;
                    points += 3;
                  } else if (team1WonFixture) {
                    battleLosses++;
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

        // Log team data to see what fields are available
        console.log('Sample team data:', teamStats.length > 0 ? teamStats[0] : 'No teams');
        console.log('All teams:', teamStats);

        // Separate teams by conference from tournament data
        const conference1TeamIds = tournamentData?.conferences?.conference1 || [];
        const conference2TeamIds = tournamentData?.conferences?.conference2 || [];

        console.log('Conference 1 Team IDs:', conference1TeamIds);
        console.log('Conference 2 Team IDs:', conference2TeamIds);

        const confA = teamStats.filter(team => conference1TeamIds.includes(team.id));
        const confB = teamStats.filter(team => conference2TeamIds.includes(team.id));

        console.log('Conference A teams:', confA);
        console.log('Conference B teams:', confB);
        console.log('Total teams:', teamStats.length);

        setConferenceATeams(confA);
        setConferenceBTeams(confB);
        setTeams(teamStats);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
        setConferenceATeams([]);
        setConferenceBTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const renderTeamsTable = (teamsData) => {
    if (teamsData.length === 0) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-lg text-gray-400">No teams found for this conference</div>
        </div>
      );
    }

    return (
      <>
        {/* Table Container with Header and Rows */}
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="flex items-center pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-600 min-w-max sm:min-w-0">
            <div className="w-12 sm:w-16 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              Rank
            </div>
            <div className="flex-1 min-w-[120px] text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
              Team
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Battle Wins</span>
              <span className="sm:hidden">BW</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Battle Losses</span>
              <span className="sm:hidden">BL</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Game Wins</span>
              <span className="sm:hidden">GW</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Game Losses</span>
              <span className="sm:hidden">GL</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Points Won</span>
              <span className="sm:hidden">PW</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Points Lost</span>
              <span className="sm:hidden">PL</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Game Diff</span>
              <span className="sm:hidden">GD</span>
            </div>
            <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Points Diff</span>
              <span className="sm:hidden">PD</span>
            </div>
            <div className="w-12 sm:w-16 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>
              <span className="hidden sm:inline">Points</span>
              <span className="sm:hidden">Pts</span>
            </div>
          </div>
          
          {/* Table Rows */}
          <div className="space-y-0">
          {teamsData.map((team, index) => (
            <div key={team.id} className="flex items-center py-3 sm:py-4 hover:bg-gray-700 transition-colors px-2 sm:px-4 border-b border-orange-500 border-opacity-20 last:border-b-0 min-w-max sm:min-w-0">
              {/* Rank */}
              <div className="w-12 sm:w-16 flex-shrink-0">
                <span className="text-orange-400 font-bold text-base sm:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {index + 1}
                </span>
              </div>
              
              {/* Team */}
              <div className="flex-1 min-w-[150px] sm:min-w-[120px] flex items-center space-x-2 sm:space-x-4">
                <div className="flex-shrink-0">
                  {team.logo?.url ? (
                    <OptimizedImage
                      src={team.logo.url}
                      alt={team.name}
                      type="logoSmall"
                      className="h-8 sm:h-10 lg:h-12 w-auto object-contain"
                    />
                  ) : (
                    <div className="h-8 sm:h-10 lg:h-12 w-12 bg-orange-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {team.name?.charAt(0) || 'T'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg whitespace-normal sm:truncate" style={{fontFamily: 'Avantique, sans-serif'}}>
                    {team.name}
                  </h3>
                </div>
              </div>
              
              {/* Battle Wins */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-green-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.battleWins || 0}
                </span>
              </div>
              
              {/* Battle Losses */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-red-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.battleLosses || 0}
                </span>
              </div>
              
              {/* Game Wins */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-blue-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.gameWins || 0}
                </span>
              </div>
              
              {/* Game Losses */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-purple-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.gameLosses || 0}
                </span>
              </div>
              
              {/* Points Won */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-cyan-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.pointsWon || 0}
                </span>
              </div>
              
              {/* Points Lost */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className="text-pink-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.pointsLost || 0}
                </span>
              </div>
              
              {/* Game Difference */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className={`font-medium text-sm sm:text-base lg:text-lg ${team.gamesDifference >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.gamesDifference >= 0 ? '+' : ''}{team.gamesDifference || 0}
                </span>
              </div>
              
              {/* Points Difference */}
              <div className="w-16 sm:w-20 text-center flex-shrink-0">
                <span className={`font-medium text-sm sm:text-base lg:text-lg ${team.pointsDifference >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.pointsDifference >= 0 ? '+' : ''}{team.pointsDifference || 0}
                </span>
              </div>
              
              {/* Points - Frozen Column */}
              <div className="w-12 sm:w-16 text-center flex-shrink-0 sticky right-0 bg-gray-800 z-10 hover:bg-gray-700">
                <span className="text-orange-400 font-bold text-base sm:text-lg lg:text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {team.points || 0}
                </span>
              </div>
            </div>
          ))}
         </div>
       </div>
      </>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      <NewHomeNavbar />
      
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          {/* Page Title */}
          <div className="flex justify-between items-center mb-8 sm:mb-12">
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold italic" style={{fontFamily: 'Avantique, sans-serif'}}>
              HPL CLUBS TABLE
            </h2>
          </div>

          {/* Tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="flex space-x-2 sm:space-x-4">
              {['Conference A', 'Conference B'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Teams Table */}
          <div className="bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg text-gray-400">Loading teams...</div>
              </div>
            ) : (
              renderTeamsTable(activeTab === 'Conference A' ? conferenceATeams : conferenceBTeams)
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
