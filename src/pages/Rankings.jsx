import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';

export default function Rankings() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
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

  // Fetch teams when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchTeams = async () => {
      setTeamsLoading(true);
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

        // Fetch fixtures to calculate team statistics
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', selectedTournament)
        );
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixtures = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate team statistics
        const teamStats = teamsData.map(team => {
          const teamFixtures = fixtures.filter(fixture => 
            fixture.team1 === team.id || fixture.team2 === team.id
          );

          let wins = 0;
          let losses = 0;
          let points = 0;
          let regWins = 0;
          let regLosses = 0;
          let dbWins = 0;
          let dbLosses = 0;
          let matches = 0;
          let totalPoints = 0;

          teamFixtures.forEach(fixture => {
            if (fixture.scores && fixture.status === 'completed') {
              matches++;
              const isTeam1 = fixture.team1 === team.id;
              const team1Scores = fixture.scores.player1 || {};
              const team2Scores = fixture.scores.player2 || {};
              
              let team1Games = 0;
              let team2Games = 0;
              let team1TotalPoints = 0;
              let team2TotalPoints = 0;

              // Count games won and total points
              for (let i = 1; i <= (fixture.gamesCount || 3); i++) {
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
                totalPoints += team1TotalPoints;
                if (team1Won) {
                  wins++;
                  points += 3; // 3 points for a win
                  if (team1Games === 2 && team2Games === 0) {
                    regWins++;
                  } else {
                    dbWins++;
                  }
                } else if (team2Won) {
                  losses++;
                  if (team2Games === 2 && team1Games === 0) {
                    regLosses++;
                  } else {
                    dbLosses++;
                    points += 1; // 1 point for losing in 3 games
                  }
                }
              } else {
                totalPoints += team2TotalPoints;
                if (team2Won) {
                  wins++;
                  points += 3; // 3 points for a win
                  if (team2Games === 2 && team1Games === 0) {
                    regWins++;
                  } else {
                    dbWins++;
                  }
                } else if (team1Won) {
                  losses++;
                  if (team1Games === 2 && team2Games === 0) {
                    regLosses++;
                  } else {
                    dbLosses++;
                    points += 1; // 1 point for losing in 3 games
                  }
                }
              }
            }
          });

          const ptsPerMatch = matches > 0 ? (totalPoints / matches).toFixed(2) : '0.00';

          return {
            ...team,
            wins,
            losses,
            points,
            regWins,
            regLosses,
            dbWins,
            dbLosses,
            matches,
            ptsPerMatch: parseFloat(ptsPerMatch)
          };
        });

        // Sort teams by points (descending), then by wins, then by points per match
        teamStats.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.ptsPerMatch - a.ptsPerMatch;
        });

        setTeams(teamStats);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
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
            {['SCHEDULE', 'TEAM STANDINGS', 'PLAYER STANDINGS'].map((tab) => (
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
                        Wins
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Losses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-100">
                        Points ↓
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reg Wins
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reg Losses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DB Wins
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DB Losses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matches
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PTS/Match
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
                          {team.wins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold bg-blue-50">
                          {team.points}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.regWins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.regLosses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.dbWins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.dbLosses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.matches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {team.ptsPerMatch}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'SCHEDULE' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-lg text-gray-500">Schedule view coming soon...</div>
          </div>
        )}

        {activeTab === 'PLAYER STANDINGS' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-lg text-gray-500">Player standings view coming soon...</div>
          </div>
        )}
      </div>
    </div>
  );
}