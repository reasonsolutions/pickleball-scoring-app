import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';
import { parseDate, formatDateForDisplay } from '../utils/dateTimeUtils';

// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Utility function to check if players should be revealed
const shouldRevealPlayers = (fixture) => {
  if (!fixture.date || !fixture.time) return false;
  
  try {
    // Parse the fixture date
    let fixtureDate;
    if (typeof fixture.date === 'string') {
      fixtureDate = new Date(fixture.date);
    } else if (fixture.date.toDate) {
      fixtureDate = fixture.date.toDate();
    } else {
      fixtureDate = new Date(fixture.date);
    }
    
    // Parse the time (HH:MM format)
    const [hours, minutes] = fixture.time.split(':');
    fixtureDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    // Get current time
    const now = new Date();
    
    // Calculate time difference in milliseconds
    const timeDiff = fixtureDate - now;
    
    // Players are revealed if match is within 1 hour (3600000 ms) or has already started/completed
    // timeDiff <= 3600000 means: match is within 1 hour OR has started (negative timeDiff)
    return timeDiff <= 3600000;
  } catch (error) {
    console.warn('Error checking player reveal time:', error);
    return false;
  }
};


export default function ClubsResults() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Conference A');
  const [conferenceAFixtures, setConferenceAFixtures] = useState([]);
  const [conferenceBFixtures, setConferenceBFixtures] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [hiddenFixtures, setHiddenFixtures] = useState(['2026-07-01']); // Hide July 1, 2026

  // Add font styles
  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
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
  `;

  // Fetch HPL Clubs tournament fixtures
  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        setLoading(true);

        // Find HPL Clubs tournament
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentsSnapshot = await getDocs(tournamentsRef);
        
        let hplClubsTournamentId = null;
        let tournamentData = null;
        
        tournamentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const tournamentName = data.name || data.tournamentName || '';
          if (tournamentName.toLowerCase().includes('clubs')) {
            hplClubsTournamentId = doc.id;
            tournamentData = data;
          }
        });

        if (!hplClubsTournamentId) {
          setFixtures([]);
          setLoading(false);
          return;
        }

        // Fetch teams for the tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', hplClubsTournamentId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch matches for the tournament using tournamentId
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', hplClubsTournamentId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Create team lookup
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
              playingTime: match.playingTime,
              fixtureType: match.fixtureType || 'League',
              matches: [],
              status: 'scheduled'
            };
          }
          fixtureGroups[groupId].matches.push(match);
        });

        // Convert to array
        const fixturesArray = Object.values(fixtureGroups);
        
        // Determine fixture status based on matches and Game Breaker logic
         fixturesArray.forEach(fixture => {
           const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
           const totalMatches = fixture.matches.length;
           
           // Check if a team has won more than 3 matches (Game Breaker logic)
           let team1Wins = 0;
           let team2Wins = 0;
           
           fixture.matches.forEach(match => {
             if (match.status === 'completed' && match.scores) {
               const team1Scores = match.scores.player1 || {};
               const team2Scores = match.scores.player2 || {};
               const gamesCount = match.gamesCount || 3;
               
               for (let i = 1; i <= gamesCount; i++) {
                 const gameKey = `game${i}`;
                 const team1Score = team1Scores[gameKey] || 0;
                 const team2Score = team2Scores[gameKey] || 0;
                 
                 if (team1Score > team2Score) {
                   team1Wins++;
                 } else if (team2Score > team1Score) {
                   team2Wins++;
                 }
               }
             }
           });
           
           // If either team has won more than 3 matches, the fixture is completed
           if (team1Wins > 3 || team2Wins > 3) {
             fixture.status = 'completed';
           } else if (completedMatches === totalMatches && totalMatches > 0) {
             // All matches completed and no team has won more than 3 (Game Breaker scenario)
             fixture.status = 'completed';
           } else if (completedMatches > 0) {
             fixture.status = 'in-progress';
           } else {
             fixture.status = 'scheduled';
           }
         });

        // Sort fixtures by date
        fixturesArray.sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return dateB - dateA;
        });

        // Separate by conference
        const conference1TeamIds = tournamentData?.conferences?.conference1 || [];
        const conference2TeamIds = tournamentData?.conferences?.conference2 || [];

        // If no conference data, show all fixtures in both tabs
        let confAFixtures = fixturesArray;
        let confBFixtures = fixturesArray;

        // If conference data exists, filter by conference
        if (conference1TeamIds.length > 0 || conference2TeamIds.length > 0) {
          confAFixtures = fixturesArray.filter(fixture =>
            conference1TeamIds.includes(fixture.team1) || conference1TeamIds.includes(fixture.team2)
          );
          confBFixtures = fixturesArray.filter(fixture =>
            conference2TeamIds.includes(fixture.team1) || conference2TeamIds.includes(fixture.team2)
          );
        }

        setFixtures(fixturesArray);
        setConferenceAFixtures(confAFixtures);
        setConferenceBFixtures(confBFixtures);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  const renderFixtures = (fixturesData) => {
    if (fixturesData.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No fixtures available</p>
        </div>
      );
    }

    // Group fixtures by date
    const fixturesByDate = {};
    const dateOrder = [];
    fixturesData.forEach(fixture => {
      let dateKey = 'No Date';
      let dateString = '';
      if (fixture.date) {
        try {
          let dateObj;
          if (typeof fixture.date === 'string') {
            dateObj = new Date(fixture.date);
          } else if (fixture.date.toDate) {
            dateObj = fixture.date.toDate();
          } else {
            dateObj = new Date(fixture.date);
          }
          
          if (!isNaN(dateObj.getTime())) {
            dateKey = dateObj.toDateString();
            // Format date as YYYY-MM-DD for comparison with hidden fixtures
            dateString = dateObj.toISOString().split('T')[0];
          }
        } catch (error) {
          console.warn('Error parsing date:', fixture.date, error);
        }
      }
      
      // Skip if this fixture's date is in the hidden list
      if (hiddenFixtures.includes(dateString)) {
        return;
      }
      
      if (!fixturesByDate[dateKey]) {
        fixturesByDate[dateKey] = [];
        dateOrder.push({
          dateKey,
          dateObj: dateKey === 'No Date' ? new Date(0) : new Date(dateKey)
        });
      }
      fixturesByDate[dateKey].push(fixture);
    });

    // Sort dates in ascending order
    dateOrder.sort((a, b) => a.dateObj - b.dateObj);

    return (
      <div className="space-y-6">
        {dateOrder.map(({ dateKey }) => {
          const dateFixtures = fixturesByDate[dateKey] || [];
          return (
            <div key={dateKey}>
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                {dateKey === 'No Date' ? 'Unscheduled' : formatDateForDisplay(dateKey)}
              </h3>
              <div className="grid gap-4">
                {dateFixtures.map(fixture => (
                  <div key={fixture.id} className="border border-gray-600 rounded-lg overflow-hidden bg-gray-700">
                    <div
                      className="p-4 hover:bg-gray-600 cursor-pointer transition-colors"
                      onClick={() => setSelectedFixture(selectedFixture?.id === fixture.id ? null : fixture)}
                    >
                      <div className="flex flex-col space-y-3">
                        {/* Teams Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                            {/* Team 1 - HOME */}
                            <div className="flex flex-col items-center space-y-1 flex-1 min-w-0">
                              <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
                                Home
                              </div>
                              <div className="flex items-center space-x-2 flex-1 min-w-0 justify-center">
                                {fixture.team1Details?.logo?.url && (
                                  <OptimizedImage
                                    src={fixture.team1Details.logo.url}
                                    alt={fixture.team1Details.name}
                                    type="logoSmall"
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                  />
                                )}
                                <span className="font-medium text-white truncate text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                </span>
                              </div>
                            </div>
                            
                            {/* VS */}
                            <div className="text-gray-300 font-semibold flex-shrink-0" style={{fontFamily: 'Avantique, sans-serif'}}>VS</div>
                            
                            {/* Team 2 - AWAY */}
                            <div className="flex flex-col items-center space-y-1 flex-1 justify-end min-w-0">
                              <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
                                Away
                              </div>
                              <div className="flex items-center space-x-2 flex-1 justify-end min-w-0">
                                <span className="font-medium text-white truncate text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                </span>
                                {fixture.team2Details?.logo?.url && (
                                  <OptimizedImage
                                    src={fixture.team2Details.logo.url}
                                    alt={fixture.team2Details.name}
                                    type="logoSmall"
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side info - Time and Status */}
                          <div className="flex items-center justify-between sm:justify-end sm:ml-6 sm:text-right sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-1 mt-2 sm:mt-0">
                            <div className="flex items-center space-x-2 sm:flex-col sm:space-x-0 sm:space-y-1">
                              {(fixture.playingTime || fixture.time) && (
                                <div className="text-sm text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {formatTimeTo12Hour(fixture.playingTime || fixture.time)}
                                </div>
                              )}
                              
                              {/* Match count */}
                              <div className="text-xs text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                                {fixture.matches?.length || 0} match{(fixture.matches?.length || 0) !== 1 ? 'es' : ''}
                              </div>
                            </div>
                            
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
                          </div>
                        </div>
                        
                        {/* Venue - Centered at bottom */}
                        {fixture.team1Details?.venue && (
                          <div className="flex justify-center">
                            <div className="text-xs text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                              📍 {fixture.team1Details.venue}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Detailed matches view */}
                    {selectedFixture?.id === fixture.id && (
                      <div className="border-t border-gray-400 bg-gray-50 p-4">
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
                                      {match.matchTypeLabel}
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
                                  {/* Team 1 */}
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center space-x-2">
                                      {fixture.team1Details?.logo?.url && (
                                        <OptimizedImage
                                          src={fixture.team1Details.logo.url}
                                          alt={fixture.team1Details.name}
                                          type="logoSmall"
                                          className="w-6 h-6 rounded-full"
                                        />
                                      )}
                                      <span className="font-medium text-gray-900">
                                        {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* VS */}
                                  <div className="text-center px-4">
                                    {match.scores && match.status === 'completed' ? (
                                      <div className="flex flex-col space-y-2">
                                        {(() => {
                                          const team1Scores = match.scores.player1 || {};
                                          const team2Scores = match.scores.player2 || {};
                                          const gamesCount = match.gamesCount || 3;
                                          const games = [];
                                          let team1WinCount = 0;
                                          let team2WinCount = 0;
                                          
                                          for (let i = 1; i <= gamesCount; i++) {
                                            const gameKey = `game${i}`;
                                            const team1Score = team1Scores[gameKey] || 0;
                                            const team2Score = team2Scores[gameKey] || 0;
                                            
                                            if (team1Score > 0 || team2Score > 0) {
                                              games.push(
                                                <div key={i} className="text-lg font-bold text-gray-900">
                                                  <span>{team1Score}</span>
                                                  <span className="text-gray-500 mx-2">-</span>
                                                  <span>{team2Score}</span>
                                                </div>
                                              );
                                              
                                              // Count wins
                                              if (team1Score > team2Score) {
                                                team1WinCount++;
                                              } else if (team2Score > team1Score) {
                                                team2WinCount++;
                                              }
                                            }
                                          }
                                          
                                          return (
                                            <>
                                              {games.length > 0 && games}
                                              {team1WinCount !== team2WinCount && (
                                                <div className="text-sm font-bold text-green-600 mt-2">
                                                  {team1WinCount > team2WinCount ? '✓ Team 1 Won' : '✓ Team 2 Won'}
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 font-semibold">VS</div>
                                    )}
                                  </div>
                                  
                                  {/* Team 2 */}
                                  <div className="space-y-2 flex-1 text-right">
                                    <div className="flex items-center space-x-2 justify-end">
                                      <span className="font-medium text-gray-900">
                                        {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                      </span>
                                      {fixture.team2Details?.logo?.url && (
                                        <OptimizedImage
                                          src={fixture.team2Details.logo.url}
                                          alt={fixture.team2Details.name}
                                          type="logoSmall"
                                          className="w-6 h-6 rounded-full"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Players Section */}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                {(() => {
                                  const canReveal = shouldRevealPlayers(fixture);
                                  const isGameBreaker = match.matchType === 'dreamBreaker' || match.matchTypeLabel === 'Dream Breaker' || match.matchTypeLabel === 'Game Breaker';
                                  
                                  // Extract players from match object
                                  let team1Players = [];
                                  let team2Players = [];
                                  
                                  if (isGameBreaker) {
                                    // For Game Breaker, use the 8-player lineup arrays but only show first 6
                                    team1Players = (match.gameBreakerPlayersTeam1 || []).filter(p => p && p.trim() !== '').slice(0, 6);
                                    team2Players = (match.gameBreakerPlayersTeam2 || []).filter(p => p && p.trim() !== '').slice(0, 6);
                                  } else {
                                    // For regular matches, use the 2-player format
                                    if (match.player1Team1) team1Players.push(match.player1Team1);
                                    if (match.player2Team1) team1Players.push(match.player2Team1);
                                    if (match.player1Team2) team2Players.push(match.player1Team2);
                                    if (match.player2Team2) team2Players.push(match.player2Team2);
                                  }
                                  
                                  return canReveal ? (
                                    <div>
                                      {isGameBreaker ? (
                                        // Game Breaker Lineup - Vertical Stack
                                        <div>
                                          <div className="text-xs font-semibold text-gray-600 uppercase mb-3">Game Breaker Lineup</div>
                                          <div className="flex gap-4">
                                            {/* Team 1 Lineup */}
                                            <div className="flex-1">
                                              <div className="text-xs font-semibold text-gray-500 mb-2">
                                                {fixture.team1Details?.name || fixture.team1Name || 'Team 1'}
                                              </div>
                                              <div className="space-y-1">
                                                {team1Players && team1Players.length > 0 ? (
                                                  team1Players.map((player, idx) => (
                                                    <div key={idx} className="text-sm text-gray-700">
                                                      {idx + 1}. {player}
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-sm text-gray-500 italic">No players assigned</div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Team 2 Lineup */}
                                            <div className="flex-1 text-right">
                                              <div className="text-xs font-semibold text-gray-500 mb-2">
                                                {fixture.team2Details?.name || fixture.team2Name || 'Team 2'}
                                              </div>
                                              <div className="space-y-1">
                                                {team2Players && team2Players.length > 0 ? (
                                                  team2Players.map((player, idx) => (
                                                    <div key={idx} className="text-sm text-gray-700">
                                                      {player} {idx + 1}.
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-sm text-gray-500 italic">No players assigned</div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // Regular Match Players - Side by Side
                                        <div className="flex gap-4">
                                          {/* Team 1 Players */}
                                          <div className="flex-1">
                                            <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                              {fixture.team1Details?.name || fixture.team1Name || 'Team 1'} Players
                                            </div>
                                            <div className="space-y-1">
                                              {team1Players && team1Players.length > 0 ? (
                                                team1Players.map((player, idx) => (
                                                  <div key={idx} className="text-sm text-gray-700">
                                                    • {player}
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-sm text-gray-500 italic">No players assigned</div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Team 2 Players */}
                                          <div className="flex-1 text-right">
                                            <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                              {fixture.team2Details?.name || fixture.team2Name || 'Team 2'} Players
                                            </div>
                                            <div className="space-y-1">
                                              {team2Players && team2Players.length > 0 ? (
                                                team2Players.map((player, idx) => (
                                                  <div key={idx} className="text-sm text-gray-700">
                                                    {player} •
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-sm text-gray-500 italic">No players assigned</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-600 italic text-center py-2">
                                      Players will be unveiled 1 hour before the Scheduled Match Time
                                    </div>
                                  );
                                })()}
                              </div>
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
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Main Content */}
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          {/* Page Title */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-400 mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              Schedule & Results
            </h1>
            <div className="w-24 h-1 bg-orange-500"></div>
          </div>

          {/* Conference Tabs */}
          <div className="mb-8">
            <div className="flex space-x-4">
              {['Conference A', 'Conference B'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule & Results View */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              {fixtures.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No fixtures found in database</p>
                </div>
              ) : (
                renderFixtures(activeTab === 'Conference A' ? conferenceAFixtures : conferenceBFixtures)
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
