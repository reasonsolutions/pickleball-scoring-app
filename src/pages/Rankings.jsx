import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';

export default function Rankings() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('TEAM STANDINGS');

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
              status: 'scheduled'
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Convert to array and determine fixture status
        const fixturesArray = Object.values(fixtureGroups).map(fixture => {
          const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
          const totalMatches = fixture.matches.length;
          
          if (completedMatches === totalMatches && totalMatches > 0) {
            fixture.status = 'completed';
          } else if (completedMatches > 0) {
            fixture.status = 'in-progress';
          } else {
            fixture.status = 'scheduled';
          }
          
          return fixture;
        });

        // Sort fixtures by date
        const sortedFixtures = fixturesArray.sort((a, b) => {
          const parseDate = (dateValue) => {
            if (!dateValue) return new Date(0);
            
            try {
              let dateObj;
              if (typeof dateValue === 'string') {
                dateObj = new Date(dateValue);
                if (isNaN(dateObj.getTime())) {
                  // Try parsing as DD/MM/YYYY or MM/DD/YYYY
                  const parts = dateValue.split(/[-/]/);
                  if (parts.length === 3) {
                    // Assume DD/MM/YYYY format first
                    dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                    if (isNaN(dateObj.getTime())) {
                      // Try MM/DD/YYYY format
                      dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
                    }
                  }
                }
              } else if (dateValue.toDate) {
                // Firestore Timestamp
                dateObj = dateValue.toDate();
              } else {
                dateObj = new Date(dateValue);
              }
              
              return isNaN(dateObj.getTime()) ? new Date(0) : dateObj;
            } catch (error) {
              return new Date(0);
            }
          };
          
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          return dateA - dateB;
        });

        setFixtures(sortedFixtures);

        // Calculate team statistics
        const teamStats = teamsData.map(team => {
          const teamMatches = matchesData.filter(match =>
            match.team1 === team.id || match.team2 === team.id
          );

          let battleWins = 0;
          let battleLosses = 0;
          let points = 0;
          let gameWins = 0;
          let gameLosses = 0;
          let pointsWon = 0;
          let pointsLost = 0;

          teamMatches.forEach(match => {
            if (match.scores && match.status === 'completed') {
              const isTeam1 = match.team1 === team.id;
              const team1Scores = match.scores.player1 || {};
              const team2Scores = match.scores.player2 || {};
              
              let team1Games = 0;
              let team2Games = 0;
              let team1TotalPoints = 0;
              let team2TotalPoints = 0;

              // Count games won and total points
              for (let i = 1; i <= (match.gamesCount || 3); i++) {
                const gameKey = `game${i}`;
                const team1Score = parseInt(team1Scores[gameKey]) || 0;
                const team2Score = parseInt(team2Scores[gameKey]) || 0;
                
                team1TotalPoints += team1Score;
                team2TotalPoints += team2Score;
                
                if (team1Score > team2Score) {
                  team1Games++;
                } else if (team2Score > team1Score) {
                  team2Games++;
                }
              }

              // Determine match winner
              const team1Won = team1Games > team2Games;
              const team2Won = team2Games > team1Games;
              
              if (isTeam1) {
                pointsWon += team1TotalPoints;
                pointsLost += team2TotalPoints;
                gameWins += team1Games;
                gameLosses += team2Games;
                
                if (team1Won) {
                  battleWins++;
                  points += 3; // 3 points for a win
                } else if (team2Won) {
                  battleLosses++;
                  if (team1Games > 0) {
                    points += 1; // 1 point for losing but winning at least one game
                  }
                }
              } else {
                pointsWon += team2TotalPoints;
                pointsLost += team1TotalPoints;
                gameWins += team2Games;
                gameLosses += team1Games;
                
                if (team2Won) {
                  battleWins++;
                  points += 3; // 3 points for a win
                } else if (team1Won) {
                  battleLosses++;
                  if (team2Games > 0) {
                    points += 1; // 1 point for losing but winning at least one game
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
                        {date === 'No Date' ? 'Unscheduled' : (() => {
                          try {
                            const dateObj = new Date(date);
                            if (isNaN(dateObj.getTime())) {
                              return date;
                            }
                            return dateObj.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          } catch (error) {
                            return date;
                          }
                        })()}
                      </h3>
                      <div className="grid gap-4">
                        {dateFixtures.map(fixture => (
                          <div key={fixture.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                {/* Team 1 */}
                                <div className="flex items-center space-x-2 flex-1">
                                  {fixture.team1Details?.logo?.url && (
                                    <img
                                      src={fixture.team1Details.logo.url}
                                      alt={fixture.team1Details.name}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  )}
                                  <span className="font-medium text-gray-900">
                                    {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                  </span>
                                </div>
                                
                                {/* VS */}
                                <div className="text-gray-500 font-semibold">VS</div>
                                
                                {/* Team 2 */}
                                <div className="flex items-center space-x-2 flex-1 justify-end">
                                  <span className="font-medium text-gray-900">
                                    {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                  </span>
                                  {fixture.team2Details?.logo?.url && (
                                    <img
                                      src={fixture.team2Details.logo.url}
                                      alt={fixture.team2Details.name}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Fixture Info and Status */}
                              <div className="ml-6 text-right">
                                {fixture.time && (
                                  <div className="text-sm text-gray-600 mb-1">
                                    {fixture.time}
                                  </div>
                                )}
                                
                                {/* Match count */}
                                <div className="text-xs text-gray-500 mb-1">
                                  {fixture.matches?.length || 0} match{(fixture.matches?.length || 0) !== 1 ? 'es' : ''}
                                </div>
                                
                                <div className={`text-xs px-2 py-1 rounded-full ${
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
                                  <div className="text-sm font-semibold text-gray-900 mt-1">
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
    </div>
  );
}