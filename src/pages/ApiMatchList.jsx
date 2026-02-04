import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function ApiMatchList() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
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

        // Fetch all matches for this tournament
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Group matches by team matchups and date, including all match types within each fixture (identical to StreamingMatchList)
        const groupedMatches = {};
        matchesData.forEach(match => {
          // Create a unique key for team matchup including date and court
          const team1 = match.team1Name || 'TBD';
          const team2 = match.team2Name || 'TBD';
          const fixtureDate = match.date?.toDate ? match.date.toDate().toISOString().split('T')[0] : 'no-date';
          const court = match.court || 'no-court';
          const matchupKey = `${team1}_vs_${team2}_${fixtureDate}_${court}`;
          
          if (!groupedMatches[matchupKey]) {
            groupedMatches[matchupKey] = {
              id: matchupKey,
              team1Name: team1,
              team2Name: team2,
              team1: match.team1,
              team2: match.team2,
              matches: [],
              date: match.date,
              pool: match.pool,
              court: court
            };
          }
          
          groupedMatches[matchupKey].matches.push(match);
        });

        // Convert to array and sort by date
        const fixtureGroupsArray = Object.values(groupedMatches).sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          return dateA.getTime() - dateB.getTime();
        });

        setFixtureGroups(fixtureGroupsArray);

        // Extract unique teams for filters
        const uniqueTeams = new Set();
        matchesData.forEach(match => {
          if (match.team1Name) uniqueTeams.add(match.team1Name);
          if (match.team2Name) uniqueTeams.add(match.team2Name);
        });
        
        setTeams([...uniqueTeams].sort());

        // Extract unique dates and find closest to today
        const uniqueDates = [...new Set(matchesData.map(match => {
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

        setDateFilter(closestDate || '');

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
    navigate(`/api-matches/${tournamentId}/fixture/${fixtureGroup.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">API Match List</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          <p className="text-base-content/70">
            Click on any fixture to access JSON data for individual matches
          </p>
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
              <div className="stat-title">
                {teamFilter || dateFilter ? 'Filtered Fixtures' : 'Total Fixtures'}
              </div>
              <div className="stat-value text-primary">{filteredFixtureGroups.length}</div>
              <div className="stat-desc">Click on any fixture to get match JSON data</div>
            </div>
          </div>
        </div>

        {/* Fixtures Grid */}
        {filteredFixtureGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏓</div>
            <h3 className="text-2xl font-bold mb-2">
              {teamFilter || dateFilter ? 'No fixtures match your filters' : 'No fixtures found'}
            </h3>
            <p className="text-base-content/70">
              {teamFilter || dateFilter
                ? 'Try adjusting your filters or clear them to see all fixtures'
                : 'No matches have been scheduled for this tournament yet'
              }
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
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold mb-2">Fixture</div>
                    {fixtureGroup.pool && (
                      <div className="badge badge-primary mb-2">{fixtureGroup.pool}</div>
                    )}
                    <div className="text-sm text-base-content/70">
                      {formatDate(fixtureGroup.date)}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="space-y-3">
                    {/* Team 1 */}
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <div className="font-bold text-primary">
                        {fixtureGroup.team1Name}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center text-2xl font-bold text-primary">VS</div>

                    {/* Team 2 */}
                    <div className="bg-secondary/10 rounded-lg p-3 text-center">
                      <div className="font-bold text-secondary">
                        {fixtureGroup.team2Name}
                      </div>
                    </div>
                  </div>

                  {/* Match Count */}
                  <div className="text-center mt-4">
                    <div className="badge badge-outline">
                      {fixtureGroup.matches.length} match{fixtureGroup.matches.length !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {/* Click for API */}
                  <div className="card-actions justify-center mt-4">
                    <div className="badge badge-outline">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Click for API Access
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