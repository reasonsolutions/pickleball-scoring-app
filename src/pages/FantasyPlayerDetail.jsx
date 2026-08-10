import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';

export default function FantasyPlayerDetail() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState('');

  useEffect(() => {
    fetchPlayerFantasyDetails();
  }, [playerId]);

  const fetchPlayerFantasyDetails = async () => {
    try {
      setLoading(true);

      // Fetch player details
      const playerDoc = await getDoc(doc(db, 'players', playerId));
      if (!playerDoc.exists()) {
        setLoading(false);
        return;
      }

      const playerData = { id: playerDoc.id, ...playerDoc.data() };
      setPlayer(playerData);

      // Fetch tournament details
      if (playerData.tournamentId) {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', playerData.tournamentId));
        if (tournamentDoc.exists()) {
          setTournamentName(tournamentDoc.data().name || tournamentDoc.data().tournamentName || 'Tournament');
        }

        // Fetch all completed fixtures for this tournament
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', playerData.tournamentId),
          where('status', '==', 'completed')
        );
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixturesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter matches where this player participated and calculate fantasy points
        const playerMatches = [];
        
        fixturesData.forEach(fixture => {
          const isPlayer1Team1 = fixture.player1Team1 === playerData.name || fixture.player1Team1Id === playerData.id;
          const isPlayer2Team1 = fixture.player2Team1 === playerData.name || fixture.player2Team1Id === playerData.id;
          const isPlayer1Team2 = fixture.player1Team2 === playerData.name || fixture.player1Team2Id === playerData.id;
          const isPlayer2Team2 = fixture.player2Team2 === playerData.name || fixture.player2Team2Id === playerData.id;

          const isInTeam1 = isPlayer1Team1 || isPlayer2Team1;
          const isInTeam2 = isPlayer1Team2 || isPlayer2Team2;

          if (isInTeam1 || isInTeam2) {
            const matchBreakdown = calculateMatchFantasyPoints(fixture, playerData, isInTeam1);
            playerMatches.push({
              ...fixture,
              ...matchBreakdown,
              isInTeam1
            });
          }
        });

        // Sort by date (most recent first)
        playerMatches.sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return dateB - dateA;
        });

        setMatches(playerMatches);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching player fantasy details:', error);
      setLoading(false);
    }
  };

  const calculateMatchFantasyPoints = (fixture, player, isInTeam1) => {
    const scores = fixture.scores || {};
    const player1Scores = scores.player1 || {};
    const player2Scores = scores.player2 || {};
    const gamesCount = fixture.gamesCount || 3;

    // Calculate total points for each team
    let team1TotalPoints = 0;
    let team2TotalPoints = 0;

    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      team1TotalPoints += parseInt(player1Scores[gameKey]) || 0;
      team2TotalPoints += parseInt(player2Scores[gameKey]) || 0;
    }

    const playerTeamPoints = isInTeam1 ? team1TotalPoints : team2TotalPoints;
    const opponentTeamPoints = isInTeam1 ? team2TotalPoints : team1TotalPoints;

    // Calculate fantasy points breakdown
    const breakdown = {
      participationPoints: 2,
      matchPoints: playerTeamPoints,
      winLossPoints: 0,
      marginBonus: 0,
      milestoneBonus: 0,
      totalFantasyPoints: 0
    };

    // Win/Loss Points
    const playerWon = playerTeamPoints > opponentTeamPoints;
    breakdown.winLossPoints = playerWon ? 2 : -1;

    // Win Difference Bonus (only for winners)
    const pointDifference = Math.abs(playerTeamPoints - opponentTeamPoints);
    
    if (playerWon) {
      if (pointDifference === 4) {
        breakdown.marginBonus = 1;
      } else if (pointDifference >= 5 && pointDifference <= 8) {
        breakdown.marginBonus = 2;
      } else if (pointDifference >= 9 && pointDifference <= 12) {
        breakdown.marginBonus = 3;
      } else if (pointDifference > 12) {
        breakdown.marginBonus = 5;
      }
    }

    // Milestone Bonus Points (single highest milestone reached)
    if (playerTeamPoints >= 15) {
      breakdown.milestoneBonus = 5;
    } else if (playerTeamPoints >= 11) {
      breakdown.milestoneBonus = 3;
    } else if (playerTeamPoints >= 8) {
      breakdown.milestoneBonus = 2;
    } else if (playerTeamPoints >= 4) {
      breakdown.milestoneBonus = 1;
    }

    breakdown.totalFantasyPoints =
      breakdown.participationPoints +
      breakdown.matchPoints +
      breakdown.winLossPoints +
      breakdown.marginBonus +
      breakdown.milestoneBonus;

    return {
      ...breakdown,
      playerTeamPoints,
      opponentTeamPoints,
      playerWon,
      pointDifference,
      team1TotalPoints,
      team2TotalPoints
    };
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const totalFantasyPoints = matches.reduce((sum, match) => sum + match.totalFantasyPoints, 0);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/admin/fantasy')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Fantasy Leaderboard
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : !player ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Player Not Found</h3>
              <p className="text-gray-600">The player you're looking for doesn't exist.</p>
            </div>
          ) : (
            <>
              {/* Player Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-8 mb-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{player.name}</h1>
                    {player.teamName && (
                      <p className="text-orange-100 text-lg">{player.teamName}</p>
                    )}
                    {tournamentName && (
                      <p className="text-orange-100 text-sm mt-1">{tournamentName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-orange-100 mb-1">Total Fantasy Points</div>
                    <div className="text-5xl font-bold">{totalFantasyPoints}</div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">Matches Played</div>
                  <div className="text-2xl font-bold text-gray-900">{matches.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">Matches Won</div>
                  <div className="text-2xl font-bold text-green-600">
                    {matches.filter(m => m.playerWon).length}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">Matches Lost</div>
                  <div className="text-2xl font-bold text-red-600">
                    {matches.filter(m => !m.playerWon).length}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">Avg Points/Match</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {matches.length > 0 ? (totalFantasyPoints / matches.length).toFixed(1) : 0}
                  </div>
                </div>
              </div>

              {/* Match Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Match-by-Match Breakdown</h2>
                  <p className="text-gray-600 mt-1">Detailed fantasy points calculation for each match</p>
                </div>

                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No completed matches found for this player.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {matches.map((match, index) => (
                      <div key={match.id} className="p-6 hover:bg-gray-50">
                        {/* Match Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                match.playerWon 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {match.playerWon ? 'WON' : 'LOST'}
                              </span>
                              <span className="text-gray-500 text-sm">{formatDate(match.date)}</span>
                              {match.matchType && (
                                <span className="text-gray-500 text-sm capitalize">
                                  {match.matchType}
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                              {match.team1Name} vs {match.team2Name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Score: {match.team1TotalPoints} - {match.team2TotalPoints}
                              {match.isInTeam1 ? ` (Playing for ${match.team1Name})` : ` (Playing for ${match.team2Name})`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 mb-1">Fantasy Points</div>
                            <div className="text-3xl font-bold text-orange-600">
                              {match.totalFantasyPoints > 0 ? '+' : ''}{match.totalFantasyPoints}
                            </div>
                          </div>
                        </div>

                        {/* Points Breakdown */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Participation:</span>
                              <span className="text-sm font-semibold text-green-600">
                                +{match.participationPoints}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Match Points:</span>
                              <span className="text-sm font-semibold text-green-600">
                                +{match.matchPoints}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Win/Loss:</span>
                              <span className={`text-sm font-semibold ${
                                match.winLossPoints > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {match.winLossPoints > 0 ? '+' : ''}{match.winLossPoints}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Margin Bonus:</span>
                              <span className="text-sm font-semibold text-green-600">
                                {match.marginBonus > 0 ? `+${match.marginBonus}` : '0'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Milestone Bonus:</span>
                              <span className="text-sm font-semibold text-green-600">
                                {match.milestoneBonus > 0 ? `+${match.milestoneBonus}` : '0'}
                              </span>
                            </div>
                          </div>
                          
                          {(match.marginBonus > 0 || match.milestoneBonus > 0) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                              {match.marginBonus > 0 && (
                                <p className="text-xs text-gray-600">
                                  <strong>Margin Bonus:</strong> Won by {match.pointDifference} points
                                  {match.pointDifference === 4 && ' (+1 bonus)'}
                                  {match.pointDifference >= 5 && match.pointDifference <= 8 && ' (+2 bonus)'}
                                  {match.pointDifference >= 9 && match.pointDifference <= 12 && ' (+3 bonus)'}
                                  {match.pointDifference > 12 && ' (+5 bonus)'}
                                </p>
                              )}
                              {match.milestoneBonus > 0 && (
                                <p className="text-xs text-gray-600">
                                  <strong>Milestone Bonus:</strong> Scored {match.playerTeamPoints} points
                                  {match.playerTeamPoints >= 15 && ' (15+ pts milestone: +5 bonus)'}
                                  {match.playerTeamPoints >= 11 && match.playerTeamPoints < 15 && ' (11+ pts milestone: +3 bonus)'}
                                  {match.playerTeamPoints >= 8 && match.playerTeamPoints < 11 && ' (8+ pts milestone: +2 bonus)'}
                                  {match.playerTeamPoints >= 4 && match.playerTeamPoints < 8 && ' (4+ pts milestone: +1 bonus)'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
