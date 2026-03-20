import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function StreamingVenues() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [venueGroups, setVenueGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [venues, setVenues] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  // Debug logging
  useEffect(() => {
    console.log('🎯 StreamingVenues component mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Tournament ID from params:', tournamentId);
    console.log('📍 Current pathname:', window.location.pathname);
    
    // Check if page is being redirected
    const checkRedirect = () => {
      console.log('✅ StreamingVenues component is still mounted - no redirect detected');
    };
    
    const timer = setTimeout(checkRedirect, 2000);
    return () => clearTimeout(timer);
  }, [tournamentId]);

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
          where('tournamentId', '==', tournamentId),
          limit(1000)
        );
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixturesData = fixturesSnapshot.docs.map(doc => {
          const fixtureData = doc.data();
          return {
            id: doc.id,
            ...fixtureData
          };
        });

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

        // Group fixtures by venue
        const groupedByVenue = {};
        fixturesData.forEach(fixture => {
          // Only group fixtures that have a venueName (venue field may be empty)
          if (!fixture.venueName || fixture.venueName.trim() === '') {
            return;
          }
          
          const venueName = fixture.venueName.trim();
          const venueId = fixture.venue || venueName; // Use venue if available, otherwise use venueName as ID
          
          // Create a unique key for each venue using venueName for consistency
          const venueKey = venueName;
          
          if (!groupedByVenue[venueKey]) {
            groupedByVenue[venueKey] = {
              id: venueKey,
              venueName: venueName,
              venueId: venueId,
              matches: [],
              fixtureCount: 0,
              dates: new Set()
            };
          }
          
          groupedByVenue[venueKey].matches.push(fixture);
          groupedByVenue[venueKey].dates.add(
            fixture.date?.toDate ? fixture.date.toDate().toISOString().split('T')[0] : 'no-date'
          );
          groupedByVenue[venueKey].fixtureCount = new Set(
            groupedByVenue[venueKey].matches.map(m => `${m.team1}_${m.team2}`)
          ).size;
        });

        // Convert to array and sort by venue name
        const venueGroupsArray = Object.values(groupedByVenue).sort((a, b) => {
          return a.venueName.localeCompare(b.venueName);
        });

        console.log('Venue Groups:', venueGroupsArray);
        console.log('Total venues:', venueGroupsArray.length);
        console.log('Total fixtures:', fixturesData.length);
        console.log('Fixtures with venueName:', fixturesData.filter(f => f.venueName && f.venueName.trim() !== '').length);

        setVenueGroups(venueGroupsArray);

        // Extract unique venues for filters
        const uniqueVenues = new Set();
        fixturesData.forEach(fixture => {
          if (fixture.venueName && fixture.venueName.trim() !== '') {
            uniqueVenues.add(fixture.venueName);
          }
        });
        
        setVenues([...uniqueVenues].sort());

        // Extract unique dates and find closest to today
        const uniqueDates = [...new Set(fixturesData.map(fixture => {
          const date = fixture.date?.toDate ? fixture.date.toDate() : new Date(fixture.date || '1970-01-01');
          return date.toISOString().split('T')[0];
        }))].sort();

        setAvailableDates(uniqueDates);

        // Don't set a default date filter - show all venues initially
        // Users can filter by date if they want
        console.log('Available dates:', uniqueDates);
        console.log('Not setting default date filter - showing all venues');
        setDateFilter('');

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

  const filteredVenueGroups = venueGroups.filter(venueGroup => {
    // Filter by venue
    const venueMatch = !venueFilter || venueGroup.venueName === venueFilter;
    
    // Filter by date - check if any match in the venue group has the selected date
    let dateMatch = true;
    if (dateFilter) {
      dateMatch = venueGroup.matches.some(match => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
        const matchDateString = matchDate.toISOString().split('T')[0];
        return matchDateString === dateFilter;
      });
    }
    
    return venueMatch && dateMatch;
  });

  const handleVenueClick = (venueGroup) => {
    // Navigate to streaming venue overlay showing all matches at this venue
    // Use venueName instead of venueId since that's what's consistently populated in fixtures
    navigate(`/streaming-venue-overlay/${encodeURIComponent(venueGroup.venueName)}/${tournamentId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Venue Streaming Overlay</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          <p className="text-base-content/70">Click on any venue to view streaming overlay options</p>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="card-title mb-4">Filters</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Venue Filter */}
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-semibold">Filter by Venue</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                >
                  <option value="">All Venues</option>
                  {venues.map(venue => (
                    <option key={venue} value={venue}>{venue}</option>
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
              {(venueFilter || dateFilter) && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">&nbsp;</span>
                  </label>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setVenueFilter('');
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

        {/* Venue Count */}
        <div className="text-center mb-6">
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Total Venues</div>
              <div className="stat-value text-warning">{filteredVenueGroups.length}</div>
              <div className="stat-desc">
                {venueFilter || dateFilter ? (
                  <>
                    {venueFilter && `Venue: ${venueFilter}`}
                    {venueFilter && dateFilter && ' • '}
                    {dateFilter && `Date: ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                  </>
                ) : 'Showing all venues'}
              </div>
            </div>
          </div>
        </div>

        {/* Venues Grid */}
        {filteredVenueGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📍</div>
            <h3 className="text-2xl font-bold mb-2">No venues found</h3>
            <p className="text-base-content/70">
              {venueFilter || dateFilter ? 'No venues found for the selected filters' : 'No venues scheduled yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenueGroups.map((venueGroup) => (
              <div
                key={venueGroup.id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                onClick={() => handleVenueClick(venueGroup)}
              >
                <div className="card-body">
                  {/* Venue Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="badge badge-accent badge-lg">
                      📍 {venueGroup.venueName}
                    </div>
                    <div className="badge badge-secondary">
                      {venueGroup.matches.length} match{venueGroup.matches.length !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {/* Fixture Count */}
                  <div className="text-center mb-3">
                    <div className="text-sm text-base-content/70">
                      {venueGroup.fixtureCount} fixture{venueGroup.fixtureCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-center mb-4">
                    <div className="text-sm text-base-content/70">
                      {venueGroup.dates.size === 1
                        ? `${[...venueGroup.dates][0]}`
                        : `${venueGroup.dates.size} dates`
                      }
                    </div>
                  </div>

                  {/* Teams Preview */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-semibold text-base-content/70">Teams Playing:</div>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(venueGroup.matches.map(m => m.team1Name))].slice(0, 3).map((team, idx) => (
                        <div key={idx} className="badge badge-warning badge-sm">
                          {team}
                        </div>
                      ))}
                      {[...new Set(venueGroup.matches.map(m => m.team1Name))].length > 3 && (
                        <div className="badge badge-warning badge-sm">
                          +{[...new Set(venueGroup.matches.map(m => m.team1Name))].length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Click to view streaming options */}
                  <div className="card-actions justify-center mt-4">
                    <div className="badge badge-outline">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Click for streaming overlays
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
