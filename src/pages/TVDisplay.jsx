import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import hplLogoWhite from '../assets/hpllogo_white.png';
import challengerLogo from '../assets/challenger.png';
import centrecourtLogo from '../assets/centrecourt_logo.png';
import mavericksLogo from '../assets/mavericks.png';
import allstarsLogo from '../assets/allstars.png';
import dasosLogo from '../assets/dasos.png';
import starrysmashersLogo from '../assets/starrysmashers.png';
import keerthiLogo from '../assets/keerthi.png';
import nandiLogo from '../assets/nandi.png';
import teramorLogo from '../assets/teramor.png';
import raptorsLogo from '../assets/raptors.png';

export default function TVDisplay() {
  const { matchId, tournamentId: routeTournamentId } = useParams();
  // Use tournamentId from route if available, otherwise use matchId
  const tournamentId = routeTournamentId || matchId;
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedStage, setSelectedStage] = useState('all'); // 'all', 'quarterfinal', 'semifinal', 'thirdplace', 'final'

  // Team logo mapping with multiple variations
  const teamLogos = {
    // HPL variations
    'HPL': hplLogoWhite,
    'hpl': hplLogoWhite,
    
    // Challenger variations
    'Challenger': challengerLogo,
    'challenger': challengerLogo,
    'The Challenger Spirit': challengerLogo,
    'Challenger Spirit': challengerLogo,
    
    // Centre Court variations
    'Centre Court': centrecourtLogo,
    'centre court': centrecourtLogo,
    'CentreCourt': centrecourtLogo,
    'centrecourt': centrecourtLogo,
    
    // Mavericks variations
    'Mavericks': mavericksLogo,
    'mavericks': mavericksLogo,
    'Maverick': mavericksLogo,
    'maverick': mavericksLogo,
    
    // All Stars variations
    'All Stars': allstarsLogo,
    'all stars': allstarsLogo,
    'AllStars': allstarsLogo,
    'allstars': allstarsLogo,
    'All-Stars': allstarsLogo,
    
    // Dasos variations
    'Dasos': dasosLogo,
    'dasos': dasosLogo,
    'DASOS': dasosLogo,
    
    // Starry Smashers variations
    'Starry Smashers': starrysmashersLogo,
    'starry smashers': starrysmashersLogo,
    'StarrySmashers': starrysmashersLogo,
    'starrysmashers': starrysmashersLogo,
    
    // Keerthi variations
    'Keerthi': keerthiLogo,
    'keerthi': keerthiLogo,
    'KEERTHI': keerthiLogo,
    
    // Nandi variations
    'Nandi': nandiLogo,
    'nandi': nandiLogo,
    'NANDI': nandiLogo,
    'Nandi Chargers': nandiLogo,
    'nandi chargers': nandiLogo,
    
    // Teramor variations
    'Teramor Titans': teramorLogo,
    'teramor titans': teramorLogo,
    'Teramor': teramorLogo,
    'teramor': teramorLogo,
    'TeramorTitans': teramorLogo,
    'teramortitans': teramorLogo,
    
    // Raptors variations
    'Raptors': raptorsLogo,
    'raptors': raptorsLogo,
    'RAPTORS': raptorsLogo,
    'Raptor': raptorsLogo,
    'raptor': raptorsLogo
  };

  useEffect(() => {
    if (!tournamentId) {
      setError('No tournament ID provided in URL');
      setLoading(false);
      return;
    }

    let unsubscribeTournament = null;
    let unsubscribeFixtures = null;

    const setupRealtimeListeners = async () => {
      try {
        setLoading(true);
        setError('');

        // Set up real-time listener for tournament details
        unsubscribeTournament = onSnapshot(
          doc(db, 'tournaments', tournamentId),
          (tournamentDoc) => {
            if (tournamentDoc.exists()) {
              setTournament(tournamentDoc.data());
            } else {
              setError(`Tournament not found with ID: ${tournamentId}`);
              setLoading(false);
              return;
            }
          },
          (error) => {
            console.error('Error fetching tournament:', error);
            setError(`Failed to load tournament data: ${error.message}`);
            setLoading(false);
          }
        );

        // Set up real-time listener for fixtures
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        unsubscribeFixtures = onSnapshot(
          fixturesQuery,
          (fixturesSnapshot) => {
            const fixturesData = fixturesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Use all fixtures - don't filter by quarterfinal since you have 4 matches per matchup
            // The filtering was too restrictive and missing matches
            setFixtures(fixturesData);
            
            // Skip fetching team details since we're using local assets
            setTeams({});
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching fixtures:', error);
            setError(`Failed to load fixtures data: ${error.message}`);
            setLoading(false);
          }
        );

      } catch (error) {
        console.error('Error setting up listeners:', error);
        setError(`Failed to setup real-time updates: ${error.message}`);
        setLoading(false);
      }
    };

    setupRealtimeListeners();

    // Cleanup function to unsubscribe from listeners
    return () => {
      if (unsubscribeTournament) {
        unsubscribeTournament();
      }
      if (unsubscribeFixtures) {
        unsubscribeFixtures();
      }
    };
  }, [tournamentId]);


  const getTeamLogo = (teamId, teamName) => {
    // Use only predefined logos from src/assets based on team name
    if (!teamName) return hplLogoWhite;
    
    // Try exact match first
    if (teamLogos[teamName]) {
      return teamLogos[teamName];
    }
    
    // Try lowercase match
    if (teamLogos[teamName.toLowerCase()]) {
      return teamLogos[teamName.toLowerCase()];
    }
    
    // Try uppercase match
    if (teamLogos[teamName.toUpperCase()]) {
      return teamLogos[teamName.toUpperCase()];
    }
    
    // Try to find partial matches for common team names
    const lowerName = teamName.toLowerCase();
    if (lowerName.includes('challenger')) return challengerLogo;
    if (lowerName.includes('centre') || lowerName.includes('center')) return centrecourtLogo;
    if (lowerName.includes('maverick')) return mavericksLogo;
    if (lowerName.includes('allstar') || lowerName.includes('all star')) return allstarsLogo;
    if (lowerName.includes('dasos')) return dasosLogo;
    if (lowerName.includes('starry') || lowerName.includes('smasher')) return starrysmashersLogo;
    if (lowerName.includes('keerthi')) return keerthiLogo;
    if (lowerName.includes('nandi')) return nandiLogo;
    if (lowerName.includes('teramor') || lowerName.includes('titan')) return teramorLogo;
    if (lowerName.includes('raptor')) return raptorsLogo;
    
    // Fallback to default logo
    return hplLogoWhite;
  };

  const formatScore = (fixture, playerKey) => {
    if (!fixture.scores || !fixture.scores[playerKey]) return '0';
    
    const playerScores = fixture.scores[playerKey];
    let totalScore = 0;
    
    Object.keys(playerScores).forEach(gameKey => {
      if (gameKey.startsWith('game')) {
        totalScore += playerScores[gameKey] || 0;
      }
    });
    
    return totalScore.toString();
  };

  // Helper function to determine fixture stage
  const getFixtureStage = (fixture) => {
    // Check for quarterfinal
    if (fixture.fixtureType === 'quarterfinal' ||
        fixture.playoffStage === 'quarterfinal' ||
        fixture.stage === 'quarterfinal' ||
        fixture.tournamentStage === 'quarterfinal' ||
        (fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('quarter')) ||
        (fixture.playoffName && fixture.playoffName.toLowerCase().includes('quarter')) ||
        (fixture.fixtureType === 'playoff' && fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('quarter'))) {
      return 'quarterfinal';
    }
    // Check for semifinal
    if (fixture.fixtureType === 'semifinal' ||
        fixture.playoffStage === 'semifinal' ||
        fixture.stage === 'semifinal' ||
        fixture.tournamentStage === 'semifinal' ||
        (fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('semi')) ||
        (fixture.playoffName && fixture.playoffName.toLowerCase().includes('semi')) ||
        (fixture.fixtureType === 'playoff' && fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('semi'))) {
      return 'semifinal';
    }
    // Check for third place
    if (fixture.fixtureType === 'thirdplace' || fixture.fixtureType === 'third-place' ||
        fixture.playoffStage === 'thirdplace' || fixture.playoffStage === 'third-place' ||
        fixture.stage === 'thirdplace' || fixture.stage === 'third-place' ||
        fixture.tournamentStage === 'thirdplace' || fixture.tournamentStage === 'third-place' ||
        (fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('third')) ||
        (fixture.playoffName && fixture.playoffName.toLowerCase().includes('third')) ||
        (fixture.fixtureType === 'playoff' && fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('third'))) {
      return 'thirdplace';
    }
    // Check for final
    if (fixture.fixtureType === 'final' ||
        fixture.playoffStage === 'final' ||
        fixture.stage === 'final' ||
        fixture.tournamentStage === 'final' ||
        (fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('final')) ||
        (fixture.playoffName && fixture.playoffName.toLowerCase().includes('final')) ||
        (fixture.fixtureType === 'playoff' && fixture.matchTypeLabel && fixture.matchTypeLabel.toLowerCase().includes('final'))) {
      return 'final';
    }
    return 'other';
  };

  // Filter fixtures by selected stage
  let filteredFixtures;
  if (selectedStage === 'all') {
    filteredFixtures = fixtures;
  } else if (['quarterfinal', 'semifinal', 'thirdplace', 'final'].includes(selectedStage)) {
    // For all tournament stages, show all matches for fixtures that have at least one match of that stage
    const relevantMatchups = new Set();
    fixtures.forEach(fixture => {
      if (getFixtureStage(fixture) === selectedStage) {
        const team1 = fixture.team1Name || 'TBD';
        const team2 = fixture.team2Name || 'TBD';
        const matchupKey = `${team1}_vs_${team2}`;
        relevantMatchups.add(matchupKey);
      }
    });
    
    // Include all matches from those matchups
    filteredFixtures = fixtures.filter(fixture => {
      const team1 = fixture.team1Name || 'TBD';
      const team2 = fixture.team2Name || 'TBD';
      const matchupKey = `${team1}_vs_${team2}`;
      return relevantMatchups.has(matchupKey);
    });
  } else {
    filteredFixtures = fixtures.filter(fixture => getFixtureStage(fixture) === selectedStage);
  }

  // Group fixtures by team matchups and sort matches
  // Special handling for tournament stage fixtures - group them all together
  const groupedFixtures = {};
  filteredFixtures.forEach(fixture => {
    let matchupKey;
    const stage = getFixtureStage(fixture);
    
    // Regular grouping by team matchups for all tournament stages
    const team1 = fixture.team1Name || 'TBD';
    const team2 = fixture.team2Name || 'TBD';
    matchupKey = `${team1}_vs_${team2}`;
    
    if (!groupedFixtures[matchupKey]) {
      groupedFixtures[matchupKey] = {
        team1Name: team1,
        team2Name: team2,
        team1Id: fixture.team1,
        team2Id: fixture.team2,
        matches: [],
        stage: stage // Add stage info for regular groups too
      };
    }
    
    groupedFixtures[matchupKey].matches.push(fixture);
  });


  // Sort matches within each fixture group with consistent ordering
  Object.values(groupedFixtures).forEach(group => {
    // Define the desired match order
    const getMatchTypeOrder = (fixture) => {
      const matchType = fixture.matchTypeLabel || fixture.matchType || '';
      const lowerMatchType = matchType.toLowerCase();
      
      // Game Breaker match - should be in 5th column
      if (lowerMatchType.includes("dream breaker") || lowerMatchType.includes("dreambreaker")) {
        return 4; // Game Breaker (5th column)
      }
      
      // Men's Doubles variations
      if (lowerMatchType.includes("men's doubles") && lowerMatchType.includes("(2)")) {
        return 2; // Men's Doubles (2)
      } else if (lowerMatchType.includes("men's doubles") || lowerMatchType.includes("mens doubles")) {
        return 0; // Men's Doubles
      }
      
      // Mixed Doubles variations
      if (lowerMatchType.includes("mixed doubles") && lowerMatchType.includes("(2)")) {
        return 3; // Mixed Doubles (2)
      } else if (lowerMatchType.includes("mixed doubles")) {
        return 1; // Mixed Doubles
      }
      
      // Fallback for other match types - try to extract numbers
      const numberMatch = matchType.match(/(\d+)/);
      if (numberMatch) {
        return parseInt(numberMatch[1]) + 10; // Put numbered matches after the standard 4
      }
      
      return 99; // Unknown match types go to the end
    };

    // Check if this group has game breaker matches
    const hasDreamBreaker = group.matches.some(match => {
      const matchType = match.matchTypeLabel || match.matchType || '';
      const lowerMatchType = matchType.toLowerCase();
      return lowerMatchType.includes("dream breaker") || lowerMatchType.includes("dreambreaker");
    });
    
    // Store this info in the group for later use
    group.hasDreamBreaker = hasDreamBreaker;

    // Sort matches by the defined order: Men's Doubles, Mixed Doubles, Men's Doubles (2), Mixed Doubles (2)
    group.matches.sort((a, b) => {
      const orderA = getMatchTypeOrder(a);
      const orderB = getMatchTypeOrder(b);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order, use fallback sorting
      if (a.matchTypeLabel && b.matchTypeLabel) {
        return a.matchTypeLabel.localeCompare(b.matchTypeLabel);
      }
      
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      
      if (a.createdAt && b.createdAt) {
        const timeA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const timeB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return timeA.getTime() - timeB.getTime();
      }
      
      return (a.id || '').localeCompare(b.id || '');
    });
  });

  const fixtureGroups = Object.values(groupedFixtures);
  
  // Get unique teams for logo display
  const uniqueTeams = Array.from(new Set(fixtures.flatMap(f => [f.team1Name, f.team2Name]))).filter(Boolean);

  // Auto-scroll effect with pauses at top and bottom
  useEffect(() => {
    if (fixtureGroups.length === 0) return;

    const startScrolling = () => {
      const scrollContainer = document.getElementById('scroll-container');
      if (!scrollContainer) return;

      const containerHeight = scrollContainer.scrollHeight;
      const viewportHeight = scrollContainer.clientHeight;
      const maxScroll = containerHeight - viewportHeight;
      
      if (maxScroll <= 0) return; // No need to scroll if content fits

      let phase = 'pauseTop'; // 'pauseTop', 'scrollDown', 'pauseBottom', 'scrollUp'
      let phaseStartTime = null;
      let animationId = null;

      const phaseDurations = {
        pauseTop: 5000,    // 5 seconds at top
        scrollDown: 5000,  // 5 seconds to scroll down
        pauseBottom: 5000, // 5 seconds at bottom
        scrollUp: 5000     // 5 seconds to scroll up
      };

      const animate = (currentTime) => {
        if (!phaseStartTime) phaseStartTime = currentTime;
        const elapsed = currentTime - phaseStartTime;
        const phaseDuration = phaseDurations[phase];

        if (elapsed < phaseDuration) {
          const container = document.getElementById('scroll-container');
          if (container) {
            switch (phase) {
              case 'pauseTop':
                container.scrollTop = 0;
                break;
              case 'scrollDown':
                const downProgress = elapsed / phaseDuration;
                const easeInOut = 0.5 - 0.5 * Math.cos(downProgress * Math.PI);
                container.scrollTop = easeInOut * maxScroll;
                break;
              case 'pauseBottom':
                container.scrollTop = maxScroll;
                break;
              case 'scrollUp':
                const upProgress = elapsed / phaseDuration;
                const easeInOutUp = 0.5 - 0.5 * Math.cos(upProgress * Math.PI);
                container.scrollTop = maxScroll - (easeInOutUp * maxScroll);
                break;
            }
          }
          animationId = requestAnimationFrame(animate);
        } else {
          // Move to next phase
          phaseStartTime = currentTime;
          switch (phase) {
            case 'pauseTop':
              phase = 'scrollDown';
              break;
            case 'scrollDown':
              phase = 'pauseBottom';
              break;
            case 'pauseBottom':
              phase = 'scrollUp';
              break;
            case 'scrollUp':
              phase = 'pauseTop';
              break;
          }
          animationId = requestAnimationFrame(animate);
        }
      };

      animationId = requestAnimationFrame(animate);
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    };

    const timer = setTimeout(startScrolling, 1000); // Start after 1 second

    return () => {
      clearTimeout(timer);
    };
  }, [fixtureGroups]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div className="flex items-center">
          <img src={challengerLogo} alt="The Challenger Spirit" className="h-16 w-auto mr-4" />
        </div>
        <div className="text-center flex flex-col items-center">
          <img src={centrecourtLogo} alt="Centre Court" className="h-12 w-auto mx-auto mb-2" />
          {/* Stage Filter Dropdown */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-white"
          >
            <option value="all">All Matches</option>
            <option value="quarterfinal">Quarter Finals</option>
            <option value="semifinal">Semi Finals</option>
            <option value="thirdplace">Third Place</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="flex items-center">
          <img src={hplLogoWhite} alt="Hyderabad Pickleball League" className="h-16 w-auto ml-4" />
        </div>
      </div>


      {/* Main Content */}
      <div id="scroll-container" className="flex-1 overflow-hidden">
        {/* Fixtures Grid - Each row is a fixture with 4 matches */}
        <div className="space-y-8">
          {fixtureGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Header for tournament stages (shown once when filtered) */}
              {selectedStage === 'quarterfinal' && groupIndex === 0 && (
                <div className="w-full text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">QUARTER FINALS</h2>
                  <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                </div>
              )}
              
              {selectedStage === 'semifinal' && groupIndex === 0 && (
                <div className="w-full text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">SEMI FINALS</h2>
                  <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                </div>
              )}
              
              {selectedStage === 'thirdplace' && groupIndex === 0 && (
                <div className="w-full text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">THIRD PLACE</h2>
                  <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                </div>
              )}
              
              {selectedStage === 'final' && groupIndex === 0 && (
                <div className="w-full text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">FINAL</h2>
                  <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                </div>
              )}
              
              <div className="flex items-center">
                {/* Team Logos Column for this fixture */}
                <div className="w-48 flex flex-col justify-center space-y-4 mr-8">
                  {/* Team 1 Logo */}
                  <div className="flex justify-center">
                    <img
                      src={getTeamLogo(group.team1Id, group.team1Name)}
                      alt={group.team1Name}
                      className="h-24 w-24 object-contain"
                    />
                  </div>
                  
                  {/* VS Text */}
                  <div className="flex justify-center">
                    <span className="text-white text-2xl font-bold">VS</span>
                  </div>
                  
                  {/* Team 2 Logo */}
                  <div className="flex justify-center">
                    <img
                      src={getTeamLogo(group.team2Id, group.team2Name)}
                      alt={group.team2Name}
                      className="h-24 w-24 object-contain"
                    />
                  </div>
                </div>

                {/* Right Arrow pointing to matches */}
                <div className="flex items-center mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
  
                {/* Match Cards for this fixture */}
                <div className={`flex-1 grid gap-4 ${group.hasDreamBreaker ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {/* Display all matches for this fixture, up to 4 or 5 columns */}
              {Array.from({ length: group.hasDreamBreaker ? 5 : 4 }, (_, matchIndex) => {
                const fixture = group.matches[matchIndex];
                
                return (
                  <div key={matchIndex} className="bg-gray-800 rounded-lg border border-gray-600 p-4 h-full flex flex-col">
                    {/* Match Type Header */}
                    <div className="text-center mb-4">
                      <div className="bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold">
                        {fixture ? ((fixture.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : fixture.matchTypeLabel) || fixture.matchType || 'MATCH') : 'MATCH'}
                      </div>
                    </div>

                    {fixture ? (
                      <>
                        {(() => {
                          // Check if this is a game breaker match
                          const matchType = fixture.matchTypeLabel || fixture.matchType || '';
                          const lowerMatchType = matchType.toLowerCase();
                          const isDreamBreaker = lowerMatchType.includes("dream breaker") || lowerMatchType.includes("dreambreaker");
                          
                          return (
                            <>
                              {/* Team 1 */}
                              <div className="mb-4">
                                <div className="text-sm text-gray-400 mb-1">
                                  {fixture.team1Name || group.team1Name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    {isDreamBreaker ? (
                                      // For dream breaker matches, show team name
                                      <div className="text-lg font-semibold">
                                        {(fixture.team1Name || group.team1Name || 'TBD').toUpperCase()}
                                      </div>
                                    ) : (
                                      // For regular matches, show player names
                                      <>
                                        <div className="text-lg font-semibold">
                                          {fixture.player1Team1
                                            ? `${fixture.player1Team1.toUpperCase()}`
                                            : 'TBD'
                                          }
                                        </div>
                                        {/* Separator line between players */}
                                        <div className="w-[30%] h-px bg-gray-500 my-1"></div>
                                        <div className="text-lg font-semibold">
                                          {fixture.player2Team1
                                            ? `${fixture.player2Team1.toUpperCase()}`
                                            : 'TBD'
                                          }
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="text-4xl font-bold">
                                    {formatScore(fixture, 'player1')}
                                  </div>
                                </div>
                              </div>

                              {/* Team 2 */}
                              <div>
                                <div className="text-sm text-gray-400 mb-1">
                                  {fixture.team2Name || group.team2Name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    {isDreamBreaker ? (
                                      // For dream breaker matches, show team name
                                      <div className="text-lg font-semibold">
                                        {(fixture.team2Name || group.team2Name || 'TBD').toUpperCase()}
                                      </div>
                                    ) : (
                                      // For regular matches, show player names
                                      <>
                                        <div className="text-lg font-semibold">
                                          {fixture.player1Team2
                                            ? `${fixture.player1Team2.toUpperCase()}`
                                            : 'TBD'
                                          }
                                        </div>
                                        {/* Separator line between players */}
                                        <div className="w-[30%] h-px bg-gray-500 my-1"></div>
                                        <div className="text-lg font-semibold">
                                          {fixture.player2Team2
                                            ? `${fixture.player2Team2.toUpperCase()}`
                                            : 'TBD'
                                          }
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="text-4xl font-bold">
                                    {formatScore(fixture, 'player2')}
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        {/* Empty match slot */}
                        <div className="mb-4">
                          <div className="text-sm text-gray-400 mb-1">{group.team1Name}</div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-semibold text-gray-500">TBD</div>
                              <div className="text-lg font-semibold text-gray-500">TBD</div>
                            </div>
                            <div className="text-4xl font-bold text-gray-500">-</div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400 mb-1">{group.team2Name}</div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-semibold text-gray-500">TBD</div>
                              <div className="text-lg font-semibold text-gray-500">TBD</div>
                            </div>
                            <div className="text-4xl font-bold text-gray-500">-</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}