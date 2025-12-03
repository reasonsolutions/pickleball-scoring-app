import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LeagueNavbar from '../components/LeagueNavbar';
import Footer from '../components/Footer';
import { fetchTournamentStatsOptimized, fetchTournamentsOptimized, fetchTeamsAndPlayersOptimized } from '../services/optimizedFirebaseService';

export default function TeamDetail() {
  const { tournamentId, teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament stats and team players data
        const [statsData, tournamentsData, playersData] = await Promise.all([
          fetchTournamentStatsOptimized(tournamentId),
          fetchTournamentsOptimized(),
          fetchTeamsAndPlayersOptimized(tournamentId)
        ]);

        // Find the specific team and its ranking
        const teamIndex = statsData.teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) {
          setError('Team not found');
          return;
        }

        const teamData = {
          ...statsData.teams[teamIndex],
          ranking: teamIndex + 1 // Position in the sorted array + 1
        };

        // Find tournament info
        const tournamentData = tournamentsData.find(t => t.id === tournamentId);
        
        // Get players for this team using the playerIds array from the team data
        const teamPlayers = playersData.players.filter(player =>
          teamData.playerIds && teamData.playerIds.includes(player.id)
        );

        setTeam({ ...teamData, players: teamPlayers });
        setTournament(tournamentData);
        setError('');
      } catch (error) {
        console.error('Error fetching team data:', error);
        setError('Failed to load team details');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && teamId) {
      fetchTeamData();
    }
  }, [tournamentId, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeagueNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading team details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeagueNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto">
              {error || 'Team not found'}
            </div>
            <Link 
              to="/teams" 
              className="mt-4 inline-block bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Back to Teams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Team ranking is already calculated and stored in team.ranking
  const teamRanking = team.ranking;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeagueNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link to="/teams" className="text-gray-500 hover:text-gray-700">Teams</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-orange-500">{team.name}</span>
        </nav>

        {/* Team Detail Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 px-6 py-8 md:px-12 md:py-12">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-center md:text-left mb-6 md:mb-0">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 uppercase tracking-wide">
                  {team.name}
                </h1>
                {tournament && (
                  <p className="text-orange-100 text-lg">
                    {tournament.name || tournament.tournamentName}
                  </p>
                )}
              </div>
              
              {/* Team Logo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  {team.logo?.url ? (
                    <img
                      src={team.logo.url}
                      alt={`${team.name} logo`}
                      className="w-20 h-20 md:w-28 md:h-28 object-contain rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-28 md:h-28 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Team Ranking */}
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                  #{teamRanking}
                </div>
                <div className="text-gray-600 font-medium uppercase tracking-wide">
                  Team Ranking
                </div>
              </div>

              {/* Battle Wins */}
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                  {team.battleWins || 0}
                </div>
                <div className="text-gray-600 font-medium uppercase tracking-wide">
                  # of Battle Wins
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Battle Losses: {team.battleLosses || 0}
                </div>
              </div>

              {/* Game Wins */}
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                  {team.gameWins || 0}
                </div>
                <div className="text-gray-600 font-medium uppercase tracking-wide">
                  Game Wins
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Game Losses: {team.gameLosses || 0}
                </div>
              </div>

              {/* Points Difference */}
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                  {team.pointsDifference > 0 ? '+' : ''}{team.pointsDifference || 0}
                </div>
                <div className="text-gray-600 font-medium uppercase tracking-wide">
                  Points Difference
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Total Points: {team.points || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Summary and About Section - Below the main component */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Player Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Player Summary</h2>
            
            {team.players && team.players.length > 0 ? (
              <div className="space-y-4">
                {team.players.map((player, index) => (
                  <div key={player.id || index} className="flex items-center p-4 bg-gray-50 rounded-lg border-l-4 border-orange-500">
                    {/* Player Photo */}
                    <div className="flex-shrink-0 mr-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                        {player.photo?.url ? (
                          <img
                            src={player.photo.url}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                        </div>
                        
                        {/* DUPR Ratings */}
                        <div className="text-right">
                          <div className="mb-2">
                            <div className="text-2xl font-bold text-orange-500">
                              {player.doublesRating || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                              Doubles<br />DUPR Rating
                            </div>
                          </div>
                          {player.singlesRating && (
                            <div>
                              <div className="text-lg font-semibold text-gray-700">
                                {player.singlesRating}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">
                                Singles<br />DUPR Rating
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p>No players found for this team</p>
              </div>
            )}
          </div>

          {/* Right Side - About Team */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ABOUT {team.name.toUpperCase()}</h2>
              
              {/* Social Media Icons */}
              <div className="flex space-x-3">
                {/* Instagram */}
                {team.socialMedia?.instagram && (
                  <a
                    href={team.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white hover:bg-orange-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                
                {/* Facebook */}
                {team.socialMedia?.facebook && (
                  <a
                    href={team.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                
                {/* YouTube */}
                {team.socialMedia?.youtube && (
                  <a
                    href={team.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Team Description */}
            <div className="text-gray-700 leading-relaxed">
              {team.description ? (
                <p className="mb-4">{team.description}</p>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Team description not available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}