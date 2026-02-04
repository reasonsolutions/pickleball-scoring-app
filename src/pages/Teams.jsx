import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import { fetchTournamentsOptimized, fetchTeamsAndPlayersOptimized } from '../services/optimizedFirebaseService';

export default function Teams() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch tournaments on component mount
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsList = await fetchTournamentsOptimized();
        setTournaments(tournamentsList);
        
        // Set first tournament as default if available
        if (tournamentsList.length > 0) {
          setSelectedTournament(tournamentsList[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setError('Failed to load tournaments');
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
      try {
        setLoading(true);
        const { teams: teamsData } = await fetchTeamsAndPlayersOptimized(selectedTournament);
        setTeams(teamsData);
        setError('');
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError('Failed to load teams');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTournament]);

  if (loading) {
    return (
      <>
        <style>
          {`
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Regular.woff') format('woff');
              font-weight: 400;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Medium.woff') format('woff');
              font-weight: 500;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Semibold.woff') format('woff');
              font-weight: 600;
              font-style: normal;
            }
            @font-face {
              font-family: 'Avantique';
              src: url('/src/assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
              font-weight: 700;
              font-style: normal;
            }
          `}
        </style>
        <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
          <NewHomeNavbar />
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>Loading teams...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>
        {`
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Regular.woff') format('woff');
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Medium.woff') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Semibold.woff') format('woff');
            font-weight: 600;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('/src/assets/fonts/Avantique/Avantique-Bold.woff') format('woff');
            font-weight: 700;
            font-style: normal;
          }
        `}
      </style>
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <NewHomeNavbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Avantique, sans-serif' }}>
              Hyderabad Pickleball League Teams
            </h1>
            <p className="text-lg text-gray-300 mb-6" style={{ fontFamily: 'Avantique, sans-serif' }}>
              Meet all the teams competing in the league
            </p>

            {/* Tournament Selection */}
            {tournaments.length > 0 && (
              <div className="mb-8">
                <label htmlFor="tournament-select" className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  Select Tournament:
                </label>
                <select
                  id="tournament-select"
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  className="px-4 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 max-w-md mx-auto bg-gray-800 text-white"
                  style={{ fontFamily: 'Avantique, sans-serif' }}
                >
                  {tournaments.map(tournament => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center mb-8">
              <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded max-w-md mx-auto" style={{ fontFamily: 'Avantique, sans-serif' }}>
                {error}
              </div>
            </div>
          )}

          {/* Teams Grid - 4x4 layout */}
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${selectedTournament}/${team.id}`}
                  className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center justify-center min-h-[200px] transform hover:scale-105 cursor-pointer border border-gray-700 hover:border-orange-500"
                >
                  <div className="w-24 h-24 mb-4 flex items-center justify-center">
                    {team.logo?.url ? (
                      <img
                        src={team.logo.url}
                        alt={`${team.name} logo`}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white text-center hover:text-orange-400 transition-colors" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-sm text-gray-300 text-center mt-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {team.description}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-orange-500 font-medium" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    View Details →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !loading && !error && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>No Teams Found</h3>
                <p className="text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  No teams have been added to this tournament yet.
                </p>
              </div>
            )
          )}
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}