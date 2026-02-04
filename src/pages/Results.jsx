import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import { shouldShowPlayerNames, parseDate, formatDateForDisplay } from '../utils/dateTimeUtils';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return '';
  
  // Handle time in HH:MM format
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${ampm}`;
};

export default function Results() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('playoffs'); // Default to Playoffs tab

  // Migration function to add playingTime field to existing matches
  const migratePlayingTime = async (fixtures) => {
    if (migrationComplete) return fixtures;
    
    console.log('🔄 Checking matches for playingTime migration...');
    const matchesToUpdate = [];
    
    // Extract all individual matches from fixtures
    fixtures.forEach(fixture => {
      fixture.matches.forEach(match => {
        if (!match.playingTime && match.time) {
          matchesToUpdate.push({
            id: match.id,
            playingTime: match.time
          });
        }
      });
    });
    
    if (matchesToUpdate.length > 0) {
      // Update matches in batches
      const updatePromises = matchesToUpdate.map(async (match) => {
        try {
          await updateDoc(doc(db, 'fixtures', match.id), {
            playingTime: match.playingTime
          });
        } catch (error) {
          console.error(`Failed to update match ${match.id}:`, error);
        }
      });
      
      await Promise.all(updatePromises);
    }
    
    setMigrationComplete(true);
    
    // Return updated fixtures with playingTime field added to matches
    return fixtures.map(fixture => ({
      ...fixture,
      playingTime: fixture.playingTime || fixture.time || '18:00',
      matches: fixture.matches.map(match => ({
        ...match,
        playingTime: match.playingTime || match.time || '18:00'
      }))
    }));
  };

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

  // Fetch fixtures when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchFixtures = async () => {
      setFixturesLoading(true);
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

        // Fetch matches to create fixtures
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', selectedTournament)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Create team lookup for fixture display
        const teamLookup = {};
        teamsData.forEach(team => {
          teamLookup[team.id] = team;
        });

        // Group matches by fixtureGroupId to create fixtures
        const fixtureGroups = {};
        matchesData.forEach(match => {
          const groupId = match.fixtureGroupId || match.id;
          if (!fixtureGroups[groupId]) {
            fixtureGroups[groupId] = {
              id: groupId,
              team1: match.team1,
              team2: match.team2,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              team1Details: teamLookup[match.team1],
              team2Details: teamLookup[match.team2],
              date: match.date,
              time: match.time,
              playingTime: match.playingTime, // Add playingTime field
              fixtureType: match.fixtureType || 'League', // Add fixtureType from match
              matches: [],
              status: 'scheduled'
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Update fixture playingTime to use the most recent playingTime from any match in the group
        Object.values(fixtureGroups).forEach(fixture => {
          // Find the most recent playingTime that's not the default 18:00
          const playingTimes = fixture.matches.map(m => m.playingTime).filter(pt => pt && pt !== '18:00');
          if (playingTimes.length > 0) {
            // Use the first non-default playingTime found
            fixture.playingTime = playingTimes[0];
          }
        });

        // Convert to array and determine fixture status
        const fixturesArray = Object.values(fixtureGroups).map(fixture => {
          // Helper function to determine if fixture is effectively completed
          const isFixtureEffectivelyCompleted = (matches) => {
            // Separate regular matches from gamebreaker
            const regularMatches = matches.filter(m =>
              m.matchType !== 'dreamBreaker' &&
              m.matchTypeLabel !== 'Dream Breaker' &&
              m.matchTypeLabel !== 'Game Breaker'
            );
            const gamebreakerMatches = matches.filter(m =>
              m.matchType === 'dreamBreaker' ||
              m.matchTypeLabel === 'Dream Breaker' ||
              m.matchTypeLabel === 'Game Breaker'
            );
            
            // Count completed regular matches
            const completedRegularMatches = regularMatches.filter(m => m.status === 'completed');
            
            // If less than 6 regular matches are completed, hide gamebreaker
            if (completedRegularMatches.length < 6) {
              return { isCompleted: false, shouldHideGamebreaker: true, filteredMatches: regularMatches };
            }
            
            // Count wins for each team in regular matches
            let team1Wins = 0;
            let team2Wins = 0;
            
            completedRegularMatches.forEach(match => {
              if (match.scores && match.status === 'completed') {
                const team1Scores = match.scores.player1 || {};
                const team2Scores = match.scores.player2 || {};
                let team1Games = 0;
                let team2Games = 0;
                
                for (let i = 1; i <= (match.gamesCount || 3); i++) {
                  const gameKey = `game${i}`;
                  const team1Score = parseInt(team1Scores[gameKey]) || 0;
                  const team2Score = parseInt(team2Scores[gameKey]) || 0;
                  
                  if (team1Score > team2Score) {
                    team1Games++;
                  } else if (team2Score > team1Score) {
                    team2Games++;
                  }
                }
                
                if (team1Games > team2Games) {
                  team1Wins++;
                } else if (team2Games > team1Games) {
                  team2Wins++;
                }
              }
            });
            
            // If one team has won 4+ out of 6 regular matches, fixture is effectively completed
            const isCompleted = team1Wins >= 4 || team2Wins >= 4;
            const shouldHideGamebreaker = isCompleted;
            
            // Filter out gamebreaker matches if fixture is effectively completed
            const filteredMatches = shouldHideGamebreaker ? regularMatches : matches;
            
            return { isCompleted, shouldHideGamebreaker, filteredMatches };
          };
          
          const { isCompleted, shouldHideGamebreaker, filteredMatches } = isFixtureEffectivelyCompleted(fixture.matches);
          
          // Update fixture matches to exclude gamebreaker if needed
          fixture.matches = filteredMatches;
          
          const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
          const totalMatches = fixture.matches.length;
          
          if (isCompleted || (completedMatches === totalMatches && totalMatches > 0)) {
            fixture.status = 'completed';
          } else if (completedMatches > 0) {
            fixture.status = 'in-progress';
          } else {
            fixture.status = 'scheduled';
          }
          
          return fixture;
        });

        // Sort fixtures by date, then by playing time
        const sortedFixtures = fixturesArray.sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          // First sort by date
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
          }
          
          // If dates are the same, sort by playing time
          const timeA = a.playingTime || a.time || '18:00';
          const timeB = b.playingTime || b.time || '18:00';
          
          // Convert time strings to comparable format (e.g., "09:00" vs "21:00")
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          const totalMinutesA = hoursA * 60 + minutesA;
          const totalMinutesB = hoursB * 60 + minutesB;
          
          return totalMinutesA - totalMinutesB;
        });

        // Run migration to add playingTime field to fixtures that don't have it
        const migratedFixtures = await migratePlayingTime(sortedFixtures);
        setFixtures(migratedFixtures);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setFixtures([]);
      } finally {
        setFixturesLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedTournament]);

  if (loading) {
    return (
      <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
        <style>{`
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueRegularFont}') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueMediumFont}') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueSemiboldFont}') format('woff');
            font-weight: 600;
            font-style: normal;
          }
          @font-face {
            font-family: 'Avantique';
            src: url('${AvantiqueBoldFont}') format('woff');
            font-weight: bold;
            font-style: normal;
          }
        `}</style>
        
        <NewHomeNavbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-white" style={{fontFamily: 'Avantique, sans-serif'}}>Loading tournaments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>
      
      <NewHomeNavbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tournament Dropdown */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label htmlFor="tournament-select" className="text-lg font-semibold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
              Tournament:
            </label>
            <select
              id="tournament-select"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-64"
              style={{fontFamily: 'Avantique, sans-serif'}}
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
          <div className="border-b border-gray-600">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('league')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'league'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                League
              </button>
              <button
                onClick={() => setActiveTab('playoffs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'playoffs'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Playoffs
              </button>
            </nav>
          </div>
        </div>

        {/* Results Schedule */}
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
          {fixturesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg text-white" style={{fontFamily: 'Avantique, sans-serif'}}>Loading results...</div>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>No results found for this tournament</div>
            </div>
          ) : (
            <div className="p-6">
              {(() => {
                // Filter fixtures based on active tab
                const filteredFixtures = fixtures.filter(fixture => {
                  const fixtureType = fixture.fixtureType;
                  
                  if (activeTab === 'league') {
                    // League tab shows League fixtures and any fixtures without a specific playoff type
                    // This includes: undefined, "League", "dreambreaker", etc. (anything that's not playoffs)
                    const playoffTypes = ['Qualifier', 'Qualifier 1', 'Qualifier 2', 'Eliminator', 'Final'];
                    return !fixtureType || fixtureType === 'League' || !playoffTypes.includes(fixtureType);
                  } else {
                    // Playoffs tab shows only specific playoff fixture types
                    const playoffTypes = ['Qualifier', 'Qualifier 1', 'Qualifier 2', 'Eliminator', 'Final'];
                    return fixtureType && playoffTypes.includes(fixtureType);
                  }
                });

                // Group filtered fixtures by date
                const fixturesByDate = {};
                filteredFixtures.forEach(fixture => {
                  let dateKey = 'No Date';
                  
                  
                  if (fixture.date) {
                    try {
                      // Handle different date formats
                      let dateObj;
                      if (typeof fixture.date === 'string') {
                        // Try parsing as ISO string first, then as other formats
                        dateObj = new Date(fixture.date);
                        if (isNaN(dateObj.getTime())) {
                          // Try parsing as DD/MM/YYYY or MM/DD/YYYY
                          const parts = fixture.date.split(/[-/]/);
                          if (parts.length === 3) {
                            // Assume DD/MM/YYYY format first
                            dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                            if (isNaN(dateObj.getTime())) {
                              // Try MM/DD/YYYY format
                              dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
                            }
                          }
                        }
                      } else if (fixture.date.toDate) {
                        // Firestore Timestamp
                        dateObj = fixture.date.toDate();
                      } else {
                        dateObj = new Date(fixture.date);
                      }
                      
                      if (!isNaN(dateObj.getTime())) {
                        dateKey = dateObj.toDateString();
                      }
                    } catch (error) {
                      console.warn('Error parsing date:', fixture.date, error);
                    }
                  }
                  
                  if (!fixturesByDate[dateKey]) {
                    fixturesByDate[dateKey] = [];
                  }
                  fixturesByDate[dateKey].push(fixture);
                });

                return Object.entries(fixturesByDate).map(([date, dateFixtures]) => (
                  <div key={date} className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {date === 'No Date' ? 'Unscheduled' : formatDateForDisplay(date)}
                    </h3>
                    <div className="grid gap-4">
                      {dateFixtures.map(fixture => (
                        <div key={fixture.id} className="border border-gray-600 rounded-lg overflow-hidden bg-gray-700">
                          <div
                            className="p-4 hover:bg-gray-600 cursor-pointer transition-colors"
                            onClick={() => setSelectedFixture(selectedFixture?.id === fixture.id ? null : fixture)}
                          >
                            {/* Fixture Type Name - Only show for playoffs tab */}
                            {activeTab === 'playoffs' && fixture.fixtureType && (
                              <div className="text-center mb-3">
                                <span className="text-sm font-semibold text-orange-500 bg-orange-900 bg-opacity-30 px-3 py-1 rounded-full" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {fixture.fixtureType}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                {/* Team 1 */}
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  {fixture.team1Details?.logo?.url && (
                                    <img
                                      src={fixture.team1Details.logo.url}
                                      alt={fixture.team1Details.name}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                  )}
                                  <span className="font-medium text-white truncate" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                  </span>
                                </div>
                                
                                {/* VS */}
                                <div className="text-gray-300 font-semibold flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>VS</div>
                                
                                {/* Team 2 */}
                                <div className="flex items-center space-x-2 flex-1 justify-end min-w-0">
                                  <span className="font-medium text-white truncate" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                  </span>
                                  {fixture.team2Details?.logo?.url && (
                                    <img
                                      src={fixture.team2Details.logo.url}
                                      alt={fixture.team2Details.name}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Fixture Info and Status */}
                              <div className="flex items-center justify-between sm:justify-end sm:ml-6 sm:text-right sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-1">
                                <div className="flex items-center space-x-2 sm:flex-col sm:space-x-0 sm:space-y-1">
                                  {(fixture.playingTime || fixture.time) && (
                                    <div className="text-sm text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      {formatTimeTo12Hour(fixture.playingTime || fixture.time)}
                                      {/* Temporary debug - remove after testing */}
                                    </div>
                                  )}
                                  
                                  {/* Match count */}
                                  <div className="text-xs text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {fixture.matches?.length || 0} match{(fixture.matches?.length || 0) !== 1 ? 'es' : ''}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 sm:flex-col sm:space-x-0 sm:space-y-1 sm:items-end">
                                  <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                    fixture.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : fixture.status === 'in-progress'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {fixture.status === 'completed' ? 'Completed' :
                                     fixture.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                                  </div>
                                  
                                  {/* Show overall fixture result if completed */}
                                  {fixture.status === 'completed' && fixture.matches && (
                                    <div className="text-sm font-semibold text-gray-900">
                                      {(() => {
                                        let team1Wins = 0;
                                        let team2Wins = 0;
                                        
                                        fixture.matches.forEach(match => {
                                          if (match.scores && match.status === 'completed') {
                                            const team1Scores = match.scores.player1 || {};
                                            const team2Scores = match.scores.player2 || {};
                                            let team1Games = 0;
                                            let team2Games = 0;
                                            
                                            for (let i = 1; i <= (match.gamesCount || 3); i++) {
                                              const gameKey = `game${i}`;
                                              const team1Score = parseInt(team1Scores[gameKey]) || 0;
                                              const team2Score = parseInt(team2Scores[gameKey]) || 0;
                                              
                                              if (team1Score > team2Score) {
                                                team1Games++;
                                              } else if (team2Score > team1Score) {
                                                team2Games++;
                                              }
                                            }
                                            
                                            if (team1Games > team2Games) {
                                              team1Wins++;
                                            } else if (team2Games > team1Games) {
                                              team2Wins++;
                                            }
                                          }
                                        });
                                        
                                        return `${team1Wins} - ${team2Wins}`;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Detailed matches view */}
                          {selectedFixture?.id === fixture.id && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4">
                              <div className="mb-3">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                  Matches in this Fixture
                                </h4>
                                <div className="text-sm text-gray-600">
                                  Click on a fixture to collapse this view
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                {(() => {
                                  // Define the correct match order
                                  const matchOrder = {
                                    'Men\'s Doubles': 1,
                                    'Women\'s Doubles': 2,
                                    'Men\'s Singles': 3,
                                    'Women\'s Singles': 4,
                                    'Men\'s Doubles (2)': 5,
                                    'Mixed Doubles': 6,
                                    'Game Breaker': 7,
                                    'Dream Breaker': 7 // Alternative name for Game Breaker
                                  };
                                  
                                  // Sort matches according to the defined order
                                  const sortedMatches = [...(fixture.matches || [])].sort((a, b) => {
                                    const aOrder = matchOrder[a.matchTypeLabel] || 999;
                                    const bOrder = matchOrder[b.matchTypeLabel] || 999;
                                    return aOrder - bOrder;
                                  });
                                  
                                  return sortedMatches.map((match, matchIndex) => (
                                    <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-gray-900">
                                            Match {matchIndex + 1}
                                          </span>
                                          {match.matchTypeLabel && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                              {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                                            </span>
                                          )}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full ${
                                          match.status === 'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : match.status === 'in-progress'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {match.status === 'completed' ? 'Completed' :
                                           match.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                          {/* Team 1 Players */}
                                          <div className="space-y-2 flex-1">
                                            <div className="flex items-center space-x-2">
                                              {fixture.team1Details?.logo?.url && (
                                                <img
                                                  src={fixture.team1Details.logo.url}
                                                  alt={fixture.team1Details.name}
                                                  className="w-6 h-6 rounded-full"
                                                />
                                              )}
                                              <span className="font-medium text-gray-900">
                                                {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600 ml-8">
                                              {(() => {
                                                // Check if we should show player names using utility function
                                                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                                                
                                                // If it's too early to show player names
                                                if (!showPlayerNames) {
                                                  return (
                                                    <div className="text-gray-400 italic">Players will be revealed at 5:05PM Matchday</div>
                                                  );
                                                }
                                                
                                                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                                                
                                                if (isSinglesMatch) {
                                                  // For Singles matches, show only player1Team1
                                                  return match.player1Team1 ? (
                                                    <div>{match.player1Team1}</div>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Player not assigned</div>
                                                  );
                                                } else {
                                                  // For Doubles matches, show both players
                                                  return match.player1Team1 && match.player2Team1 ? (
                                                    <>
                                                      <div>{match.player1Team1}</div>
                                                      <div>{match.player2Team1}</div>
                                                    </>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Players not assigned</div>
                                                  );
                                                }
                                              })()}
                                            </div>
                                          </div>
                                          
                                          {/* Game Scores in center */}
                                          <div className="text-center px-4">
                                            {match.scores && match.status === 'completed' ? (
                                              <div className="flex flex-col space-y-1">
                                                {(() => {
                                                  const team1Scores = match.scores.player1 || {};
                                                  const team2Scores = match.scores.player2 || {};
                                                  const gamesCount = match.gamesCount || 3;
                                                  const games = [];
                                                  
                                                  for (let i = 1; i <= gamesCount; i++) {
                                                    const gameKey = `game${i}`;
                                                    const team1Score = team1Scores[gameKey] || 0;
                                                    const team2Score = team2Scores[gameKey] || 0;
                                                    
                                                    // Only show games that have been played (non-zero scores)
                                                    if (team1Score > 0 || team2Score > 0) {
                                                      games.push(
                                                        <div key={i} className="text-lg font-bold text-gray-900">
                                                          <span>{team1Score}</span>
                                                          <span className="text-gray-500 mx-2">-</span>
                                                          <span>{team2Score}</span>
                                                        </div>
                                                      );
                                                    }
                                                  }
                                                  
                                                  return games.length > 0 ? games : (
                                                    <div className="text-gray-500 font-semibold">VS</div>
                                                  );
                                                })()}
                                              </div>
                                            ) : (
                                              <div className="text-gray-500 font-semibold">VS</div>
                                            )}
                                          </div>
                                          
                                          {/* Team 2 Players */}
                                          <div className="space-y-2 flex-1 text-right">
                                            <div className="flex items-center space-x-2 justify-end">
                                              <span className="font-medium text-gray-900">
                                                {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                              </span>
                                              {fixture.team2Details?.logo?.url && (
                                                <img
                                                  src={fixture.team2Details.logo.url}
                                                  alt={fixture.team2Details.name}
                                                  className="w-6 h-6 rounded-full"
                                                />
                                              )}
                                            </div>
                                            <div className="text-sm text-gray-600 mr-8">
                                              {(() => {
                                                // Check if we should show player names using utility function
                                                const showPlayerNames = shouldShowPlayerNames(match, fixture);
                                                
                                                // If it's too early to show player names
                                                if (!showPlayerNames) {
                                                  return (
                                                    <div className="text-gray-400 italic">Players will be revealed at 5:05PM Matchday</div>
                                                  );
                                                }
                                                
                                                const isSinglesMatch = match.matchTypeLabel?.includes('Singles');
                                                
                                                if (isSinglesMatch) {
                                                  // For Singles matches, show only player1Team2
                                                  return match.player1Team2 ? (
                                                    <div>{match.player1Team2}</div>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Player not assigned</div>
                                                  );
                                                } else {
                                                  // For Doubles matches, show both players
                                                  return match.player1Team2 && match.player2Team2 ? (
                                                    <>
                                                      <div>{match.player1Team2}</div>
                                                      <div>{match.player2Team2}</div>
                                                    </>
                                                  ) : (
                                                    <div className="text-gray-400 italic">Players not assigned</div>
                                                  );
                                                }
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Show winner for completed matches */}
                                      {match.scores && match.status === 'completed' && (
                                        <div className="mt-2 text-center">
                                          {(() => {
                                            const team1Scores = match.scores.player1 || {};
                                            const team2Scores = match.scores.player2 || {};
                                            let team1Games = 0;
                                            let team2Games = 0;
                                            
                                            for (let i = 1; i <= (match.gamesCount || 3); i++) {
                                              const gameKey = `game${i}`;
                                              const team1Score = parseInt(team1Scores[gameKey]) || 0;
                                              const team2Score = parseInt(team2Scores[gameKey]) || 0;
                                              
                                              if (team1Score > team2Score) {
                                                team1Games++;
                                              } else if (team2Score > team1Score) {
                                                team2Games++;
                                              }
                                            }
                                            
                                            const winner = team1Games > team2Games
                                              ? (fixture.team1Details?.name || fixture.team1Name || 'Team 1')
                                              : team2Games > team1Games
                                              ? (fixture.team2Details?.name || fixture.team2Name || 'Team 2')
                                              : null;
                                            
                                            return winner ? (
                                              <div className="text-sm font-medium text-green-600">
                                                Winner: {winner}
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-500">
                                                Draw
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}