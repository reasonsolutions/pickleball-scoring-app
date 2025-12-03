import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function UmpireMatchList() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [fixtureGroups, setFixtureGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [teams, setTeams] = useState([]);
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

        // Fetch all fixtures for this tournament
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixturesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Define match type order
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

        // Sort fixtures by date, time, match type, and match order
        fixturesData.sort((a, b) => {
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

        setFixtures(fixturesData);

        // Group fixtures by team matchups and date, including all match types within each fixture
        const groupedFixtures = {};
        fixturesData.forEach(fixture => {
          // Create a unique key for team matchup including date and court
          const team1 = fixture.team1Name || 'TBD';
          const team2 = fixture.team2Name || 'TBD';
          const fixtureDate = fixture.date?.toDate ? fixture.date.toDate().toISOString().split('T')[0] : 'no-date';
          const court = fixture.court || 'no-court';
          const matchupKey = `${team1}_vs_${team2}_${fixtureDate}_${court}`;
          
          if (!groupedFixtures[matchupKey]) {
            groupedFixtures[matchupKey] = {
              id: matchupKey,
              team1Name: team1,
              team2Name: team2,
              team1: fixture.team1,
              team2: fixture.team2,
              matches: [],
              date: fixture.date,
              pool: fixture.pool,
              court: court
            };
          }
          
          groupedFixtures[matchupKey].matches.push(fixture);
        });

        // Convert to array and sort by date
        const fixtureGroupsArray = Object.values(groupedFixtures).sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          return dateA.getTime() - dateB.getTime();
        });

        setFixtureGroups(fixtureGroupsArray);

        // Extract unique teams for filters
        const uniqueTeams = new Set();
        fixturesData.forEach(fixture => {
          if (fixture.team1Name) uniqueTeams.add(fixture.team1Name);
          if (fixture.team2Name) uniqueTeams.add(fixture.team2Name);
        });
        
        setTeams([...uniqueTeams].sort());

        // Extract unique dates and find closest to today
        const uniqueDates = [...new Set(fixturesData.map(fixture => {
          const date = fixture.date?.toDate ? fixture.date.toDate() : new Date(fixture.date || '1970-01-01');
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

        setDateFilter(closestDate || '');

      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Tournament ID:', tournamentId);
        setError(`Failed to load tournament data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  const filteredFixtureGroups = fixtureGroups.filter(fixtureGroup => {
    // Filter by team - check if the selected team is either team1 or team2
    const teamMatch = !teamFilter ||
      fixtureGroup.team1Name === teamFilter ||
      fixtureGroup.team2Name === teamFilter;
    
    // Filter by date
    const dateMatch = !dateFilter || (() => {
      const fixtureDate = fixtureGroup.date?.toDate ? fixtureGroup.date.toDate() : new Date(fixtureGroup.date || '1970-01-01');
      const fixtureDateString = fixtureDate.toISOString().split('T')[0];
      return fixtureDateString === dateFilter;
    })();
    
    return teamMatch && dateMatch;
  });

  const handleFixtureClick = (fixtureGroup) => {
    // Navigate to fixture details page showing individual matches
    navigate(`/umpire-matches/${tournamentId}/fixture/${fixtureGroup.id}`);
  };

  const handleMatchClick = (fixtureId) => {
    const umpireUrl = `${window.location.origin}/umpire/${fixtureId}`;
    window.open(umpireUrl, '_blank');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Umpire Match List</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          <p className="text-base-content/70">Click on any match to open the umpire scoring interface</p>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="card-title mb-4">Filters</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Team Filter */}
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-semibold">Filter by Team</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-semibold">Filter by Date</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="">All Dates</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(teamFilter || dateFilter) && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">&nbsp;</span>
                  </label>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setTeamFilter('');
                      setDateFilter('');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixture Count */}
        <div className="text-center mb-6">
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Total Fixtures</div>
              <div className="stat-value text-primary">{filteredFixtureGroups.length}</div>
              <div className="stat-desc">
                {teamFilter || dateFilter ? (
                  <>
                    {teamFilter && `Team: ${teamFilter}`}
                    {teamFilter && dateFilter && ' • '}
                    {dateFilter && `Date: ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                  </>
                ) : 'Showing all fixtures'}
              </div>
            </div>
          </div>
        </div>

        {/* Fixtures Grid */}
        {filteredFixtureGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏓</div>
            <h3 className="text-2xl font-bold mb-2">No fixtures found</h3>
            <p className="text-base-content/70">
              {teamFilter || dateFilter ? 'No fixtures found for the selected filters' : 'No fixtures scheduled yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFixtureGroups.map((fixtureGroup) => (
              <div
                key={fixtureGroup.id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                onClick={() => handleFixtureClick(fixtureGroup)}
              >
                <div className="card-body">
                  {/* Fixture Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="badge badge-primary badge-lg">
                      {fixtureGroup.court !== 'no-court' ? fixtureGroup.court : (fixtureGroup.matches[0]?.court || 'Court TBD')}
                    </div>
                    <div className="badge badge-secondary">
                      {fixtureGroup.matches.length} match{fixtureGroup.matches.length !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {/* Match Types Preview */}
                  <div className="text-center mb-3">
                    <div className="flex flex-wrap justify-center gap-1">
                      {[...new Set(fixtureGroup.matches.map(match => match.fixtureType || 'League'))].map(type => (
                        type !== 'League' && (
                          <div key={type} className="badge badge-accent badge-sm">
                            {type}
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Team vs Team */}
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold">
                      {fixtureGroup.team1Name} vs {fixtureGroup.team2Name}
                    </div>
                    <div className="text-base-content/70">
                      {formatDate(fixtureGroup.date?.toDate ? fixtureGroup.date.toDate() : fixtureGroup.date)}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="space-y-3">
                    {/* Team 1 */}
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <div className="text-sm text-base-content/70 mb-1">Team 1</div>
                      <div className="text-lg font-bold text-primary">
                        {fixtureGroup.team1Name}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center text-2xl font-bold text-primary">VS</div>

                    {/* Team 2 */}
                    <div className="bg-secondary/10 rounded-lg p-3 text-center">
                      <div className="text-sm text-base-content/70 mb-1">Team 2</div>
                      <div className="text-lg font-bold text-secondary">
                        {fixtureGroup.team2Name}
                      </div>
                    </div>
                  </div>

                  {/* Click to view matches */}
                  <div className="card-actions justify-center mt-4">
                    <div className="badge badge-outline">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Click to view matches
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