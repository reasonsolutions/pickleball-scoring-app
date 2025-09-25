import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function StreamingFixtureMatches() {
  const { tournamentId, fixtureGroupId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [fixtureInfo, setFixtureInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          setTournament(tournamentDoc.data());
        } else {
          setError('Tournament not found');
          return;
        }

        // Fetch matches for this fixture group
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter matches that belong to this fixture group
        const team1 = fixtureGroupId.split('_vs_')[0];
        const team2 = fixtureGroupId.split('_vs_')[1];
        
        const fixtureMatches = allMatches.filter(match => {
          const matchTeam1 = match.team1Name || 'TBD';
          const matchTeam2 = match.team2Name || 'TBD';
          return (matchTeam1 === team1 && matchTeam2 === team2) ||
                 (matchTeam1 === team2 && matchTeam2 === team1);
        });

        // Sort matches by date and time
        fixtureMatches.sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          // If dates are the same, sort by time
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
        });

        setMatches(fixtureMatches);

        // Set fixture info from first match
        if (fixtureMatches.length > 0) {
          const firstMatch = fixtureMatches[0];
          setFixtureInfo({
            team1Name: firstMatch.team1Name,
            team2Name: firstMatch.team2Name,
            date: firstMatch.date,
            pool: firstMatch.pool
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load fixture data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && fixtureGroupId) {
      fetchData();
    }
  }, [tournamentId, fixtureGroupId]);

  const handleStreamingClick = (matchId) => {
    const streamingUrl = `${window.location.origin}/streaming-overlay/${matchId}`;
    window.open(streamingUrl, '_blank');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'No time';
    return timeString;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/streaming-matches/${tournamentId}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Fixtures
            </button>
          </div>
          
          <h1 className="text-4xl font-bold text-warning mb-2">Streaming Overlays</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          
          {fixtureInfo && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-lg">
              <div className="flex items-center gap-4">
                <span className="text-warning font-bold">{fixtureInfo.team1Name}</span>
                <span className="text-base-content/60">VS</span>
                <span className="text-secondary font-bold">{fixtureInfo.team2Name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base-content/60 hidden sm:inline">•</span>
                <span className="text-base-content/70">
                  {formatDate(fixtureInfo.date)}
                </span>
                {fixtureInfo.pool && (
                  <>
                    <span className="text-base-content/60 hidden sm:inline">•</span>
                    <div className="badge badge-warning">{fixtureInfo.pool}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Match Count */}
        <div className="text-center mb-6">
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Total Matches</div>
              <div className="stat-value text-warning">{matches.length}</div>
              <div className="stat-desc">Click on any match to open streaming overlay</div>
            </div>
          </div>
        </div>

        {/* Matches Grid */}
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-2xl font-bold mb-2">No matches found</h3>
            <p className="text-base-content/70">No matches scheduled for this fixture yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <div
                key={match.id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                onClick={() => handleStreamingClick(match.id)}
              >
                <div className="card-body">
                  {/* Match Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-lg font-bold">Match {index + 1}</div>
                    <div className="badge badge-secondary">
                      Court {match.court || 'TBD'}
                    </div>
                  </div>

                  {/* Match Type and Time */}
                  <div className="text-center mb-4">
                    <div className="badge badge-warning badge-lg mb-2">
                      {match.matchTypeLabel || 'Match'}
                    </div>
                    <div className="text-base-content/70">{formatTime(match.time)}</div>
                  </div>

                  {/* Teams */}
                  <div className="space-y-3">
                    {/* Team 1 */}
                    <div className="bg-base-200 rounded-lg p-3">
                      <div className="text-sm text-base-content/70 mb-1">Team 1</div>
                      <div className="font-semibold">
                        {match.player1Team1 && match.player2Team1 
                          ? `${match.player1Team1} & ${match.player2Team1}`
                          : match.team1Name || 'TBD'
                        }
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center text-2xl font-bold text-warning">VS</div>

                    {/* Team 2 */}
                    <div className="bg-base-200 rounded-lg p-3">
                      <div className="text-sm text-base-content/70 mb-1">Team 2</div>
                      <div className="font-semibold">
                        {match.player1Team2 && match.player2Team2 
                          ? `${match.player1Team2} & ${match.player2Team2}`
                          : match.team2Name || 'TBD'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Click for Streaming Overlay */}
                  <div className="card-actions justify-center mt-4">
                    <div className="badge badge-outline">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Click for streaming overlay
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}