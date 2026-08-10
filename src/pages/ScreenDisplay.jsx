import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function ScreenDisplay() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState([]);

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

        // Fetch all matches for this tournament
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort matches by date, time, and match type
        allMatchesData.sort((a, b) => {
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

        setAllMatches(allMatchesData);

        // Extract unique dates
        const uniqueDates = [...new Set(allMatchesData.map(match => {
          const date = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          return date.toISOString().split('T')[0];
        }))].sort();

        setAvailableDates(uniqueDates);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId, isSuperAdmin]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMatchesForDate = (dateString) => {
    return allMatches.filter(match => {
      const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
      const matchDateString = matchDate.toISOString().split('T')[0];
      return matchDateString === dateString;
    });
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
        {/* Header with Display Controller */}
        <div className="mb-8">
          <div className="flex justify-end items-start mb-4">
            {/* Display Controller Button */}
            <button
              className="btn btn-primary"
              onClick={() => {
                const controllerUrl = `${window.location.origin}/display-controller/${tournamentId}`;
                window.open(controllerUrl, '_blank');
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Display Controller
            </button>
          </div>
          
          <h1 className="text-4xl font-bold text-primary mb-2">Screen Display</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          <p className="text-base-content/70">Select a date to view matches and display options</p>
        </div>

        {/* Date Boxes */}
        {availableDates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold mb-2">No matches scheduled</h3>
            <p className="text-base-content/70">No matches found for this tournament</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableDates.map((dateString) => {
              const matchesForDate = getMatchesForDate(dateString);
              
              return (
                <div
                  key={dateString}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="card-body">
                    {/* Date Header */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-primary mb-2">
                        {formatDate(dateString)}
                      </h3>
                      <div className="badge badge-secondary">
                        {matchesForDate.length} match{matchesForDate.length !== 1 ? 'es' : ''}
                      </div>
                    </div>

                    {/* Match Summary */}
                    <div className="mb-4 max-h-32 overflow-y-auto">
                      {matchesForDate.slice(0, 3).map((match, index) => (
                        <div key={match.id} className="text-sm mb-1 p-2 bg-base-200 rounded">
                          <div className="font-medium">
                            {match.team1Name} vs {match.team2Name}
                          </div>
                          <div className="text-xs text-base-content/70">
                            {match.time} • {match.matchTypeLabel || 'Match'}
                          </div>
                        </div>
                      ))}
                      {matchesForDate.length > 3 && (
                        <div className="text-xs text-center text-base-content/50 mt-2">
                          +{matchesForDate.length - 3} more matches
                        </div>
                      )}
                    </div>

                    {/* Display Buttons */}
                    <div className="card-actions justify-center space-y-2">
                      <div className="flex gap-2 w-full">
                        <button
                          className="btn btn-primary btn-sm flex-1"
                          onClick={() => {
                            const mainDisplayUrl = `${window.location.origin}/main-display/${tournamentId}/${dateString}`;
                            window.open(mainDisplayUrl, '_blank');
                          }}
                        >
                          Main Display
                        </button>
                        
                        <button
                          className="btn btn-secondary btn-sm flex-1"
                          onClick={() => {
                            const sideDisplayUrl = `${window.location.origin}/side-display/${tournamentId}/${dateString}`;
                            window.open(sideDisplayUrl, '_blank');
                          }}
                        >
                          Side Display
                        </button>
                      </div>
                      
                      <div className="flex gap-2 w-full">
                        <button
                          className="btn btn-accent btn-sm flex-1"
                          onClick={() => {
                            const outsideDisplayUrl = `${window.location.origin}/outside-display/${tournamentId}/${dateString}`;
                            window.open(outsideDisplayUrl, '_blank');
                          }}
                        >
                          Outside Display
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}