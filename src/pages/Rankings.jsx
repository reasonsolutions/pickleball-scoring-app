import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';
import Footer from '../components/Footer';
import { shouldShowPlayerNames, parseDate, formatDateForDisplay } from '../utils/dateTimeUtils';

// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (time24) => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
};

export default function Rankings() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('TEAM STANDINGS');
  const [selectedFixture, setSelectedFixture] = useState(null);

  // Fetch tournaments from Firebase
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const snapshot = await getDocs(tournamentsRef);
        const tournamentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTournaments(tournamentsList);
        
        // Set first tournament as default if available
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
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
            // Exclude playoff fixtures from rankings calculations
            const playoffTypes = ['playoff', 'Qualifier', 'Qualifier 1', 'Qualifier 2', 'Eliminator', 'Final'];
            const isNotPlayoff = !fixture.fixtureType || !playoffTypes.includes(fixture.fixtureType);
            return isTeamInvolved && isNotPlayoff;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeagueNavbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tournaments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeagueNavbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tournament Dropdown */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label htmlFor="tournament-select" className="text-lg font-semibold text-gray-700">
              Tournament:
            </label>
            <select
              id="tournament-select"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-64"
            >
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {['SCHEDULE', 'TEAM STANDINGS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-md font-semibold text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Team Standings Table */}
        {activeTab === 'TEAM STANDINGS' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {teamsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg">Loading team standings...</div>
              </div>
            ) : teams.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg text-gray-500">No teams found for this tournament</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Battle Wins
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Battle Losses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-100">
                        Points ↓
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Game Wins
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Game Losses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Won
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Lost
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Games Diff
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Diff
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {team.logo?.url && (
                              <img
                                src={team.logo.url}
                                alt={team.name}
                                className="w-8 h-8 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {team.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {team.battleWins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.battleLosses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold bg-blue-50">
                          {team.points}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.gameWins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.gameLosses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.pointsWon}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.pointsLost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={team.gamesDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {team.gamesDifference > 0 ? '+' : ''}{team.gamesDifference}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={team.pointsDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {team.pointsDifference > 0 ? '+' : ''}{team.pointsDifference}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'SCHEDULE' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {fixturesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg">Loading fixtures...</div>
              </div>
            ) : fixtures.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg text-gray-500">No fixtures found for this tournament</div>
              </div>
            ) : (
              <div className="p-6">
                {(() => {
                  // Group fixtures by date
                  const fixturesByDate = {};
                  fixtures.forEach(fixture => {
                    let dateKey = 'No Date';
                    if (fixture.date) {
                      try {
                        // Handle different date formats
                        let dateObj;
                        if (typeof fixture.date === 'string') {
                          // Try parsing as ISO string first, then as other formats
                          dateObj = new Date(fixture.date);
                          if (isNaN(dateObj.getTime())) {
                            // Try parsing as DD/MM/YYYY or MM/DD/YYYY
                            const parts = fixture.date.split(/[-/]/);
                            if (parts.length === 3) {
                              // Assume DD/MM/YYYY format first
                              dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                              if (isNaN(dateObj.getTime())) {
                                // Try MM/DD/YYYY format
                                dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
                              }
                            }
                          }
                        } else if (fixture.date.toDate) {
                          // Firestore Timestamp
                          dateObj = fixture.date.toDate();
                        } else {
                          dateObj = new Date(fixture.date);
                        }
                        
                        if (!isNaN(dateObj.getTime())) {
                          dateKey = dateObj.toDateString();
                        }
                      } catch (error) {
                        console.warn('Error parsing date:', fixture.date, error);
                      }
                    }
                    
                    if (!fixturesByDate[dateKey]) {
                      fixturesByDate[dateKey] = [];
                    }
                    fixturesByDate[dateKey].push(fixture);
                  });

                  return Object.entries(fixturesByDate).map(([date, dateFixtures]) => (
                    <div key={date} className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                        {date === 'No Date' ? 'Unscheduled' : formatDateForDisplay(date)}
                      </h3>
                      <div className="grid gap-4">
                        {dateFixtures.map(fixture => (
                          <div key={fixture.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedFixture(selectedFixture?.id === fixture.id ? null : fixture)}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                {/* Team 1 */}
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  {fixture.team1Details?.logo?.url && (
                                    <img
                                      src={fixture.team1Details.logo.url}
                                      alt={fixture.team1Details.name}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                  )}
                                  <span className="font-medium text-gray-900 truncate">
                                    {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                  </span>
                                </div>
                                
                                {/* VS */}
                                <div className="text-gray-500 font-semibold flex-shrink-0">VS</div>
                                
                                {/* Team 2 */}
                                <div className="flex items-center space-x-2 flex-1 justify-end min-w-0">
                                  <span className="font-medium text-gray-900 truncate">
                                    {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                  </span>
                                  {fixture.team2Details?.logo?.url && (
                                    <img
                                      src={fixture.team2Details.logo.url}
                                      alt={fixture.team2Details.name}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Fixture Info and Status */}
                              <div className="flex items-center justify-between sm:justify-end sm:ml-6 sm:text-right sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-1">
                                <div className="flex items-center space-x-2 sm:flex-col sm:space-x-0 sm:space-y-1">
                                  {fixture.time && (
                                    <div className="text-sm text-gray-600">
                                      {fixture.time}
                                    </div>
                                  )}
                                  
                                  {/* Match count */}
                                  <div className="text-xs text-gray-500">
                                    {fixture.matches?.length || 0} match{(fixture.matches?.length || 0) !== 1 ? 'es' : ''}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 sm:flex-col sm:space-x-0 sm:space-y-1 sm:items-end">
                                  <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                    fixture.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : fixture.status === 'in-progress'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {fixture.status === 'completed' ? 'Completed' :
                                     fixture.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                                  </div>
                                  
                                  {/* Show overall fixture result if completed */}
                                  {fixture.status === 'completed' && fixture.matches && (
                                    <div className="text-sm font-semibold text-gray-900">
                                      {(() => {
                                        let team1Wins = 0;
                                        let team2Wins = 0;
                                        
                                        fixture.matches.forEach(match => {
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
                                        
                                        return `${team1Wins} - ${team2Wins}`;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              </div>
                            </div>
                            
                            {/* Detailed matches view */}
                            {selectedFixture?.id === fixture.id && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <div className="mb-3">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    Matches in this Fixture
                                  </h4>
                                  <div className="text-sm text-gray-600">
                                    Click on a fixture to collapse this view
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {(() => {
                                    // Define the correct match order
                                    const matchOrder = {
                                      'Men\'s Doubles': 1,
                                      'Women\'s Doubles': 2,
                                      'Men\'s Singles': 3,
                                      'Women\'s Singles': 4,
                                      'Men\'s Doubles (2)': 5,
                                      'Mixed Doubles': 6,
                                      'Game Breaker': 7,
                                      'Dream Breaker': 7 // Alternative name for Game Breaker
                                    };
                                    
                                    // Sort matches according to the defined order
                                    const sortedMatches = [...(fixture.matches || [])].sort((a, b) => {
                                      const aOrder = matchOrder[a.matchTypeLabel] || 999;
                                      const bOrder = matchOrder[b.matchTypeLabel] || 999;
                                      return aOrder - bOrder;
                                    });
                                    
                                    return sortedMatches.map((match, matchIndex) => (
                                    <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-gray-900">
                                            Match {matchIndex + 1}
                                          </span>
                                          {match.matchTypeLabel && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                              {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                                            </span>
                                          )}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full ${
                                          match.status === 'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : match.status === 'in-progress'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {match.status === 'completed' ? 'Completed' :
                                           match.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                          {/* Team 1 Players */}
                                          <div className="space-y-2 flex-1">
                                            <div className="flex items-center space-x-2">
                                              {fixture.team1Details?.logo?.url && (
                                                <img
                                                  src={fixture.team1Details.logo.url}
                                                  alt={fixture.team1Details.name}
                                                  className="w-6 h-6 rounded-full"
                                                />
                                              )}
                                              <span className="font-medium text-gray-900">
                                                {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600 ml-8">
                                              {(() => {
                                                // Check if we should show player names using utility function
                                                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                                                
                                                // If it's too early to show player names
                                                if (!showPlayerNames) {
                                                  return (
                                                    <div className="text-gray-400 italic">Players will be revealed at 5:05PM Matchday</div>
                                                  );
                                                }
                                                
                                                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                                                
                                                if (isSinglesMatch) {
                                                  // For Singles matches, show only player1Team1
                                                  return match.player1Team1 ? (
                                                    <div>{match.player1Team1}</div>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Player not assigned</div>
                                                  );
                                                } else {
                                                  // For Doubles matches, show both players
                                                  return match.player1Team1 && match.player2Team1 ? (
                                                    <>
                                                      <div>{match.player1Team1}</div>
                                                      <div>{match.player2Team1}</div>
                                                    </>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Players not assigned</div>
                                                  );
                                                }
                                              })()}
                                            </div>
                                          </div>
                                          
                                          {/* Game Scores in center */}
                                          <div className="text-center px-4">
                                            {match.scores && match.status === 'completed' ? (
                                              <div className="flex flex-col space-y-1">
                                                {(() => {
                                                  const team1Scores = match.scores.player1 || {};
                                                  const team2Scores = match.scores.player2 || {};
                                                  const gamesCount = match.gamesCount || 3;
                                                  const games = [];
                                                  
                                                  for (let i = 1; i <= gamesCount; i++) {
                                                    const gameKey = `game${i}`;
                                                    const team1Score = team1Scores[gameKey] || 0;
                                                    const team2Score = team2Scores[gameKey] || 0;
                                                    
                                                    // Only show games that have been played (non-zero scores)
                                                    if (team1Score > 0 || team2Score > 0) {
                                                      games.push(
                                                        <div key={i} className="text-lg font-bold text-gray-900">
                                                          <span>{team1Score}</span>
                                                          <span className="text-gray-500 mx-2">-</span>
                                                          <span>{team2Score}</span>
                                                        </div>
                                                      );
                                                    }
                                                  }
                                                  
                                                  return games.length > 0 ? games : (
                                                    <div className="text-gray-500 font-semibold">VS</div>
                                                  );
                                                })()}
                                              </div>
                                            ) : (
                                              <div className="text-gray-500 font-semibold">VS</div>
                                            )}
                                          </div>
                                          
                                          {/* Team 2 Players */}
                                          <div className="space-y-2 flex-1 text-right">
                                            <div className="flex items-center space-x-2 justify-end">
                                              <span className="font-medium text-gray-900">
                                                {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                              </span>
                                              {fixture.team2Details?.logo?.url && (
                                                <img
                                                  src={fixture.team2Details.logo.url}
                                                  alt={fixture.team2Details.name}
                                                  className="w-6 h-6 rounded-full"
                                                />
                                              )}
                                            </div>
                                            <div className="text-sm text-gray-600 mr-8">
                                              {(() => {
                                                // Check if we should show player names using utility function
                                                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                                                
                                                // If it's too early to show player names
                                                if (!showPlayerNames) {
                                                  return (
                                                    <div className="text-gray-400 italic">Players will be revealed at 5:05PM Matchday</div>
                                                  );
                                                }
                                                
                                                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                                                
                                                if (isSinglesMatch) {
                                                  // For Singles matches, show only player1Team2
                                                  return match.player1Team2 ? (
                                                    <div>{match.player1Team2}</div>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Player not assigned</div>
                                                  );
                                                } else {
                                                  // For Doubles matches, show both players
                                                  return match.player1Team2 && match.player2Team2 ? (
                                                    <>
                                                      <div>{match.player1Team2}</div>
                                                      <div>{match.player2Team2}</div>
                                                    </>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Players not assigned</div>
                                                  );
                                                }
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Detailed Game Scores - Show individual game scores below */}
                                      {match.scores && match.status === 'completed' && (
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Game Scores:</span>
                                            <div className="flex space-x-4">
                                              {(() => {
                                                const team1Scores = match.scores.player1 || {};
                                                const team2Scores = match.scores.player2 || {};
                                                const gamesCount = match.gamesCount || 3;
                                                const games = [];
                                                
                                                for (let i = 1; i <= gamesCount; i++) {
                                                  const gameKey = `game${i}`;
                                                  const team1Score = team1Scores[gameKey] || 0;
                                                  const team2Score = team2Scores[gameKey] || 0;
                                                  games.push(
                                                    <div key={i} className="text-sm">
                                                      <span className="font-medium">{team1Score}</span>
                                                      <span className="text-gray-500 mx-1">-</span>
                                                      <span className="font-medium">{team2Score}</span>
                                                    </div>
                                                  );
                                                }
                                                
                                                return games;
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Match Winner - Show for incomplete matches */}
                                      {match.status !== 'completed' && (
                                        <div className="mt-2 text-center">
                                          <div className="text-sm text-gray-500 italic">
                                            {match.status === 'in-progress' ? 'Match in progress' : 'Match not started'}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Show winner for completed matches */}
                                      {match.scores && match.status === 'completed' && (
                                        <div className="mt-2 text-center">
                                          {(() => {
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
                                            
                                            const winner = team1Games > team2Games
                                              ? (fixture.team1Details?.name || fixture.team1Name || 'Team 1')
                                              : team2Games > team1Games
                                              ? (fixture.team2Details?.name || fixture.team2Name || 'Team 2')
                                              : null;
                                            
                                            return winner ? (
                                              <div className="text-sm font-medium text-green-600">
                                                Winner: {winner}
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-500">
                                                Draw
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}