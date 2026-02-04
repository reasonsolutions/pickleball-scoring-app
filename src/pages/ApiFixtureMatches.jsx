import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { shouldShowPlayerNames } from '../utils/dateTimeUtils';

export default function ApiFixtureMatches() {
  const { tournamentId, fixtureGroupId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [fixtureInfo, setFixtureInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
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

        // Fetch matches for this fixture group
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter matches that belong to this fixture group
        // Parse the fixture group ID to extract team names, date, and court
        // Format: Team1_vs_Team2_YYYY-MM-DD_Court
        const parts = fixtureGroupId.split('_');
        const vsIndex = parts.findIndex(part => part === 'vs');
        
        if (vsIndex === -1) {
          console.error('Invalid fixture group ID format:', fixtureGroupId);
          setError('Invalid fixture group ID format');
          return;
        }
        
        // Extract team names (everything before 'vs' and between 'vs' and date)
        const team1Parts = parts.slice(0, vsIndex);
        const team1 = team1Parts.join(' ');
        
        // Find the date part (YYYY-MM-DD format)
        let dateIndex = -1;
        for (let i = vsIndex + 1; i < parts.length; i++) {
          if (parts[i].match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateIndex = i;
            break;
          }
        }
        
        let team2, expectedDate, expectedCourt;
        if (dateIndex !== -1) {
          // Extract team2 (between 'vs' and date)
          const team2Parts = parts.slice(vsIndex + 1, dateIndex);
          team2 = team2Parts.join(' ');
          
          // Extract date and court
          expectedDate = parts[dateIndex];
          expectedCourt = parts.slice(dateIndex + 1).join(' ');
        } else {
          // Fallback: assume everything after 'vs' is team2
          const team2Parts = parts.slice(vsIndex + 1);
          team2 = team2Parts.join(' ');
        }
        
        console.log('Parsed fixture info:', { team1, team2, expectedDate, expectedCourt });
        
        const fixtureMatches = allMatchesData.filter(match => {
          const matchTeam1 = match.team1Name || 'TBD';
          const matchTeam2 = match.team2Name || 'TBD';
          
          // Check if teams match (in either order)
          const teamsMatch = (matchTeam1 === team1 && matchTeam2 === team2) ||
                            (matchTeam1 === team2 && matchTeam2 === team1);
          
          // If we have expected date and court, also check those
          if (expectedDate && expectedCourt) {
            const matchDate = match.date?.toDate ? match.date.toDate().toISOString().split('T')[0] : 'no-date';
            const matchCourt = match.court || 'no-court';
            
            return teamsMatch && matchDate === expectedDate && matchCourt === expectedCourt;
          }
          
          return teamsMatch;
        });
        
        console.log('Found matches:', fixtureMatches.length);

        // Define match type order (identical to UmpireMatchList)
        const getMatchTypeOrder = (matchType) => {
          const order = {
            "Men's Doubles": 1,
            "Mens Doubles": 1,
            "Women's Doubles": 2,
            "Womens Doubles": 2,
            "Men's Singles": 3,
            "Mens Singles": 3,
            "Women's Singles": 4,
            "Womens Singles": 4,
            "Men's Doubles (2)": 5,
            "Mens Doubles (2)": 5,
            "Mixed Doubles": 6
          };
          return order[matchType] || 999;
        };

        // Sort matches by date, time, match type, and match order (identical to UmpireMatchList)
        fixtureMatches.sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          // If dates are the same, sort by time
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
          }
          // If time is also the same, sort by match type order
          const matchTypeA = a.matchTypeLabel || a.matchType || '';
          const matchTypeB = b.matchTypeLabel || b.matchType || '';
          const typeOrderA = getMatchTypeOrder(matchTypeA);
          const typeOrderB = getMatchTypeOrder(matchTypeB);
          if (typeOrderA !== typeOrderB) {
            return typeOrderA - typeOrderB;
          }
          // If match type is also the same, sort by match order/sequence/number
          const orderA = a.matchOrder || a.sequence || a.matchNumber || 0;
          const orderB = b.matchOrder || b.sequence || b.matchNumber || 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // Final tie-breaker: document ID for absolute consistency
          return a.id.localeCompare(b.id);
        });

        setAllMatches(fixtureMatches);
        setMatches(fixtureMatches);

        // Extract unique dates and find closest to today
        const uniqueDates = [...new Set(fixtureMatches.map(match => {
          const date = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          return date.toISOString().split('T')[0];
        }))].sort();

        setAvailableDates(uniqueDates);

        // Find the date closest to today
        const today = new Date().toISOString().split('T')[0];
        let closestDate = uniqueDates[0];
        let minDiff = Math.abs(new Date(today) - new Date(uniqueDates[0]));

        uniqueDates.forEach(date => {
          const diff = Math.abs(new Date(today) - new Date(date));
          if (diff < minDiff) {
            minDiff = diff;
            closestDate = date;
          }
        });

        setSelectedDate(closestDate || '');

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

  // Filter matches based on selected date
  useEffect(() => {
    if (selectedDate && allMatches.length > 0) {
      const filtered = allMatches.filter(match => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
        const matchDateString = matchDate.toISOString().split('T')[0];
        return matchDateString === selectedDate;
      });
      setFilteredMatches(filtered);
    } else {
      setFilteredMatches(allMatches);
    }
  }, [selectedDate, allMatches]);

  const handleMatchClick = (matchId) => {
    console.log('Match clicked:', matchId);
    const basicScoreUrl = `${window.location.origin}/basic-score/${matchId}`;
    console.log('Opening URL:', basicScoreUrl);
    
    // Try to open in new tab, fallback to current tab if blocked
    try {
      const newWindow = window.open(basicScoreUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        // Pop-up blocked, navigate in current tab
        console.log('Pop-up blocked, navigating in current tab');
        window.location.href = basicScoreUrl;
      }
    } catch (error) {
      console.error('Error opening window:', error);
      // Fallback to current tab
      window.location.href = basicScoreUrl;
    }
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
              onClick={() => navigate(`/admin/tournaments/${tournamentId}/fixtures`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Fixtures
            </button>
          </div>
          
          <h1 className="text-4xl font-bold text-primary mb-2">API Fixture Matches</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          
          {fixtureInfo && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-lg">
              <div className="flex items-center gap-4">
                <span className="text-primary font-bold">{fixtureInfo.team1Name}</span>
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
                    <div className="badge badge-primary">{fixtureInfo.pool}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Filter */}
        {availableDates.length > 1 && (
          <div className="mb-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">Filter by Date</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`btn btn-sm ${selectedDate === '' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedDate('')}
                  >
                    All Dates
                  </button>
                  {availableDates.map(date => (
                    <button
                      key={date}
                      className={`btn btn-sm ${selectedDate === date ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Count */}
        <div className="text-center mb-6">
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">
                {selectedDate ? 'Matches on Selected Date' : 'Total Matches'}
              </div>
              <div className="stat-value text-primary">
                {selectedDate ? filteredMatches.length : matches.length}
              </div>
              <div className="stat-desc">Click on any match to get JSON data</div>
            </div>
          </div>
        </div>

        {/* Matches Grid */}
        {(selectedDate ? filteredMatches : matches).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏓</div>
            <h3 className="text-2xl font-bold mb-2">
              {selectedDate ? 'No matches found for selected date' : 'No matches found'}
            </h3>
            <p className="text-base-content/70">
              {selectedDate
                ? 'Try selecting a different date or view all dates'
                : 'No matches scheduled for this fixture yet'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedDate ? filteredMatches : matches).map((match, index) => (
              <div
                key={match.id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                onClick={() => handleMatchClick(match.id)}
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
                    <div className="badge badge-primary badge-lg mb-2">
                      {(match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel) || 'Match'}
                    </div>
                    <div className="text-base-content/70">{formatTime(match.time)}</div>
                  </div>

                  {/* Teams */}
                  <div className="space-y-3">
                    {/* Team 1 */}
                    <div className="bg-base-200 rounded-lg p-3">
                      <div className="text-sm text-base-content/70 mb-1">Team 1</div>
                      <div className="font-semibold">
                        {(() => {
                          // Check if we should show player names using utility function
                          const showPlayerNames = shouldShowPlayerNames(match, fixtureInfo);
                          
                          // If it's too early to show player names
                          if (!showPlayerNames) {
                            return (
                              <div className="text-base-content/50 italic">
                                Players will be revealed at 5:05PM Matchday
                              </div>
                            );
                          }
                          
                          // Show player names
                          return match.player1Team1 && match.player2Team1
                            ? `${match.player1Team1} & ${match.player2Team1}`
                            : match.player1Team1 || match.team1Name || 'TBD';
                        })()}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center text-2xl font-bold text-primary">VS</div>

                    {/* Team 2 */}
                    <div className="bg-base-200 rounded-lg p-3">
                      <div className="text-sm text-base-content/70 mb-1">Team 2</div>
                      <div className="font-semibold">
                        {(() => {
                          // Check if we should show player names using utility function
                          const showPlayerNames = shouldShowPlayerNames(match, fixtureInfo);
                          
                          // If it's too early to show player names
                          if (!showPlayerNames) {
                            return (
                              <div className="text-base-content/50 italic">
                                Players will be revealed at 5:05PM Matchday
                              </div>
                            );
                          }
                          
                          // Show player names
                          return match.player1Team2 && match.player2Team2
                            ? `${match.player1Team2} & ${match.player2Team2}`
                            : match.player1Team2 || match.team2Name || 'TBD';
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Get JSON */}
                  <div className="card-actions justify-center mt-4">
                    <div className="badge badge-outline">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Get JSON
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