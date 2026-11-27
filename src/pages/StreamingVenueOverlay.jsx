import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
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
import centrecourtWhiteLogo from '../assets/centrecourtwhite.png';
import iluCcplHydWhiteLogo from '../assets/ilu_ccpl_hyd_white.png';

// Count matches won by each side across the completed matches of a fixture group
const getFixtureWins = (matches, fixtureGroupId) => {
  const wins = { team1: 0, team2: 0 };
  if (!fixtureGroupId) return wins;

  matches.forEach(match => {
    if (match.fixtureGroupId !== fixtureGroupId || match.status !== 'completed') return;
    if (!match.scores || !match.scores.player1 || !match.scores.player2) return;

    let team1TotalScore = 0;
    let team2TotalScore = 0;
    Object.keys(match.scores.player1).forEach(gameKey => {
      if (gameKey.startsWith('game')) {
        team1TotalScore += match.scores.player1[gameKey] || 0;
        team2TotalScore += match.scores.player2[gameKey] || 0;
      }
    });

    if (team1TotalScore > team2TotalScore) wins.team1++;
    else if (team2TotalScore > team1TotalScore) wins.team2++;
  });

  return wins;
};

export default function StreamingVenueOverlay() {
   const { venueId: venueName, tournamentId } = useParams();
   const venueId = decodeURIComponent(venueName);
   const [venue, setVenue] = useState(null);
   const [matches, setMatches] = useState([]);
   const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
   const [tournament, setTournament] = useState(null);
   const [teams, setTeams] = useState({});
   const [cachedTeams, setCachedTeams] = useState({});
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [serveTicker, setServeTicker] = useState(null);
   const [previousServer, setPreviousServer] = useState(null);
   const [activePlayerCard, setActivePlayerCard] = useState(null);
   const [playerCardTimer, setPlayerCardTimer] = useState(null);
   const [pointTicker, setPointTicker] = useState(null);
   const [previousScores, setPreviousScores] = useState({ player1: 0, player2: 0 });
   const [hasCompletedMatches, setHasCompletedMatches] = useState(false);
   const [showFixtureResult, setShowFixtureResult] = useState(false);
   
   // Use refs to track previous scores without recreating listener
   const previousScoresRef = useRef({ player1: 0, player2: 0 });
   const previousServerRef = useRef(null);

  // Team logo mapping
  const teamLogos = {
    'CCPL': hplLogoWhite,
    'Challenger': challengerLogo,
    'Centre Court': centrecourtLogo,
    'Mavericks': mavericksLogo,
    'All Stars': allstarsLogo,
    'Dasos': dasosLogo,
    'Starry Smashers': starrysmashersLogo,
    'Keerthi': keerthiLogo,
    'Nandi': nandiLogo,
    'Teramor Titans': teramorLogo,
    'Raptors': raptorsLogo
  };

  // Force transparent html/body/#root so OBS / vMix browser sources key cleanly
  useEffect(() => {
    const els = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean);
    const prev = els.map(el => el.style.getPropertyValue('background'));
    els.forEach(el => el.style.setProperty('background', 'transparent', 'important'));
    return () => {
      els.forEach((el, i) => {
        if (prev[i]) el.style.setProperty('background', prev[i]);
        else el.style.removeProperty('background');
      });
    };
  }, []);

  // Fetch all matches for this venue (initial load only)
  useEffect(() => {
    if (!venueId || !tournamentId) return;

    const fetchVenueMatches = async () => {
      try {
        // Fetch all fixtures for this tournament and venue
        // Query by venueName since that's what's consistently populated in fixtures
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId),
          where('venueName', '==', venueId),
          limit(1000)
        );

        let fixturesSnapshot = await getDocs(fixturesQuery);
        let matchesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // If no exact match found, try to find closest match
        if (matchesData.length === 0) {
          console.log('No exact venue match found for:', venueId);
          console.log('Attempting to find closest match...');
          
          // Fetch all fixtures for this tournament
          const allFixturesQuery = query(
            collection(db, 'fixtures'),
            where('tournamentId', '==', tournamentId),
            limit(1000)
          );
          
          const allFixturesSnapshot = await getDocs(allFixturesQuery);
          const allFixtures = allFixturesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Find unique venue names
          const uniqueVenues = [...new Set(allFixtures.map(f => f.venueName).filter(Boolean))];
          console.log('Available venues:', uniqueVenues);
          
          // Find closest match using string similarity
          let closestVenue = null;
          let highestSimilarity = 0;
          
          uniqueVenues.forEach(venue => {
            // Calculate similarity score (check if one contains the other)
            const venueIdLower = venueId.toLowerCase();
            const venueLower = venue.toLowerCase();
            
            let similarity = 0;
            if (venueLower === venueIdLower) {
              similarity = 100; // Exact match
            } else if (venueLower.includes(venueIdLower) || venueIdLower.includes(venueLower)) {
              similarity = 50; // Partial match
            }
            
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              closestVenue = venue;
            }
          });
          
          if (closestVenue) {
            console.log('Found closest match:', closestVenue);
            matchesData = allFixtures.filter(f => f.venueName === closestVenue);
          }
        }

        // Sort by date and time
        matchesData.sort((a, b) => {
          // Compare calendar days only - stored timestamps can carry inconsistent times of day
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          dateA.setHours(0, 0, 0, 0);
          dateB.setHours(0, 0, 0, 0);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          return (a.matchNumber || 0) - (b.matchNumber || 0);
        });

        setMatches(matchesData);

        // Fetch tournament details
        if (tournamentId) {
          const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
          if (tournamentDoc.exists()) {
            setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching venue matches:', err);
        setError('Failed to load venue matches');
        setLoading(false);
      }
    };

    fetchVenueMatches();
  }, [venueId, tournamentId]);

  // Set up real-time listener for current match
  useEffect(() => {
    console.log('🔍 Listener effect triggered. Matches length:', matches.length, 'Current index:', currentMatchIndex);
    
    if (matches.length === 0 || currentMatchIndex >= matches.length) {
      console.log('⚠️ Guard condition failed - returning early');
      return;
    }

    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch) {
      console.log('⚠️ No current match found');
      return;
    }

    console.log('🎯 Setting up listener for match:', currentMatch.id);

    // Set up real-time listener for the current match
    const unsubscribeMatch = onSnapshot(
      doc(db, 'fixtures', currentMatch.id),
      (matchDoc) => {
        try {
          if (matchDoc.exists()) {
            const matchData = { id: matchDoc.id, ...matchDoc.data() };
            console.log('📊 Match data updated from Firebase:', matchData);
            console.log('📊 Match scores:', matchData.scores);
            console.log('📊 Current match index:', currentMatchIndex);
            console.log('🎯 Current Fixture ID:', currentMatch.id);

            // Update matches array with latest data
            setMatches(prevMatches =>
              prevMatches.map(m => m.id === currentMatch.id ? matchData : m)
            );

            // Calculate current scores using the same logic as formatScore
            const getCurrentScore = (playerKey) => {
              if (!matchData.scores || !matchData.scores[playerKey]) return 0;
              const playerScores = matchData.scores[playerKey];
              let totalScore = 0;
              Object.keys(playerScores).forEach(gameKey => {
                if (gameKey.startsWith('game')) {
                  totalScore += playerScores[gameKey] || 0;
                }
              });
              return totalScore;
            };

            const currentPlayer1Score = getCurrentScore('player1');
            const currentPlayer2Score = getCurrentScore('player2');

            console.log('Score check:', {
              current: { player1: currentPlayer1Score, player2: currentPlayer2Score },
              previous: previousScoresRef.current
            });

            // Check if player1 scored
            if (currentPlayer1Score > previousScoresRef.current.player1) {
              console.log('Player 1 scored!');
              setPointTicker({
                team: 'player1',
                teamName: matchData.team1Name,
                points: currentPlayer1Score - previousScoresRef.current.player1,
                timestamp: Date.now()
              });
              setTimeout(() => setPointTicker(null), 3000);
            }
            // Check if player2 scored
            else if (currentPlayer2Score > previousScoresRef.current.player2) {
              console.log('Player 2 scored!');
              setPointTicker({
                team: 'player2',
                teamName: matchData.team2Name,
                points: currentPlayer2Score - previousScoresRef.current.player2,
                timestamp: Date.now()
              });
              setTimeout(() => setPointTicker(null), 3000);
            }

            // Update previous scores in ref and state
            previousScoresRef.current = {
              player1: currentPlayer1Score,
              player2: currentPlayer2Score
            };
            setPreviousScores(previousScoresRef.current);

            // Check for serve changes and trigger ticker (only for non-dreambreaker matches)
            if (!matchData.matchType || matchData.matchType !== 'dreamBreaker') {
              const currentServer = matchData.servingPlayer;

              // Check if server changed
              if (previousServerRef.current && currentServer && currentServer !== previousServerRef.current) {
                const serverNumber = currentServer === 'player1' ? '1' : '2';
                setServeTicker({
                  server: currentServer,
                  serverNumber: serverNumber,
                  timestamp: Date.now()
                });

                // Clear ticker after 3 seconds
                setTimeout(() => setServeTicker(null), 3000);
              }

              // Update previous server in ref and state
              previousServerRef.current = currentServer;
              setPreviousServer(currentServer);
            }

            // Fetch team details asynchronously without blocking the listener
            const fetchTeamDetails = async () => {
              const teamsData = {};

              if (matchData.team1) {
                if (cachedTeams[matchData.team1]) {
                  teamsData.team1 = cachedTeams[matchData.team1];
                } else {
                  try {
                    const team1Doc = await getDoc(doc(db, 'teams', matchData.team1));
                    if (team1Doc.exists()) {
                      const team1Data = { id: team1Doc.id, ...team1Doc.data() };
                      teamsData.team1 = team1Data;
                      setCachedTeams(prev => ({ ...prev, [matchData.team1]: team1Data }));
                    }
                  } catch (err) {
                    console.error('Error fetching team1:', err);
                  }
                }
              }

              if (matchData.team2) {
                if (cachedTeams[matchData.team2]) {
                  teamsData.team2 = cachedTeams[matchData.team2];
                } else {
                  try {
                    const team2Doc = await getDoc(doc(db, 'teams', matchData.team2));
                    if (team2Doc.exists()) {
                      const team2Data = { id: team2Doc.id, ...team2Doc.data() };
                      teamsData.team2 = team2Data;
                      setCachedTeams(prev => ({ ...prev, [matchData.team2]: team2Data }));
                    }
                  } catch (err) {
                    console.error('Error fetching team2:', err);
                  }
                }
              }

              setTeams(teamsData);
            };

            // Call async function without awaiting
            fetchTeamDetails().catch(err => console.error('Error in fetchTeamDetails:', err));

            // Initialize previous server on first load
            if (previousScoresRef.current.player1 === 0 && previousScoresRef.current.player2 === 0) {
              previousServerRef.current = matchData.servingPlayer;
              setPreviousServer(matchData.servingPlayer);
            }
          }
        } catch (err) {
          console.error('Error in match listener:', err);
        }
      },
      (error) => {
        console.error('Error listening to match:', error);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from match listener');
      unsubscribeMatch();
    };
  }, [currentMatchIndex, matches.length]);

  // Set up listeners for all other matches to detect status changes (for active match detection)
  useEffect(() => {
    if (matches.length <= 1) return;

    const otherMatches = matches.filter((_, index) => index !== currentMatchIndex);
    const unsubscribers = otherMatches.map(match => {
      return onSnapshot(
        doc(db, 'fixtures', match.id),
        (matchDoc) => {
          if (matchDoc.exists()) {
            const updatedMatch = { id: matchDoc.id, ...matchDoc.data() };
            console.log('Other match updated:', { id: match.id, status: updatedMatch.status });
            // Update matches array with the new status
            setMatches(prevMatches =>
              prevMatches.map(m => m.id === match.id ? updatedMatch : m)
            );
          }
        }
      );
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [matches.length]);

  // Find and set the active match whenever matches change
  useEffect(() => {
    if (matches.length === 0) return;

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (match) => {
      const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
      matchDate.setHours(0, 0, 0, 0);
      return matchDate.getTime() === today.getTime();
    };

    // Check if there are any completed matches for TODAY ONLY
    const completedTodayCount = matches.filter(match => match.status === 'completed' && isToday(match)).length;
    
    const hasCompletedToday = completedTodayCount > 0;
    setHasCompletedMatches(hasCompletedToday);

    let newIndex = 0;

    // Priority 1: Find the first in-progress/live match (regardless of completed status)
    const liveMatchIndex = matches.findIndex(match =>
      match.status === 'in-progress' || match.status === 'live'
    );

    // Next upcoming match in the same fixture as the most recently completed match
    // Only today's completed matches count, so a fixture result is never shown on a different day
    const lastCompletedIndex = matches.map(match => match.status === 'completed' && isToday(match)).lastIndexOf(true);
    const lastCompleted = matches[lastCompletedIndex];
    const fixtureGroupId = lastCompleted?.fixtureGroupId;
    const fixtureMatches = fixtureGroupId ? matches.filter(match => match.fixtureGroupId === fixtureGroupId) : [];
    const fixtureWins = getFixtureWins(matches, fixtureGroupId);
    // The Game Breaker is only played when the fixture is tied after all regular matches (e.g. 3-3)
    const regularMatchesDone = fixtureMatches
      .filter(match => match.matchType !== 'dreamBreaker')
      .every(match => match.status === 'completed');
    const gameBreakerNeeded = regularMatchesDone && fixtureWins.team1 === fixtureWins.team2;
    const nextInFixtureIndex = fixtureGroupId
      ? matches.findIndex(match =>
          match.fixtureGroupId === fixtureGroupId &&
          match.status !== 'completed' &&
          (match.matchType !== 'dreamBreaker' || gameBreakerNeeded)
        )
      : -1;

    let fixtureResult = false;

    if (liveMatchIndex !== -1) {
      // Found a live match - display it
      newIndex = liveMatchIndex;
    } else if (nextInFixtureIndex !== -1) {
      // A match just ended - show the next match of that fixture
      newIndex = nextInFixtureIndex;
    } else if (fixtureGroupId) {
      // Fixture is decided - show the result
      newIndex = lastCompletedIndex;
      fixtureResult = true;
    } else if (hasCompletedToday) {
      // No live match, but there are completed matches TODAY
      // Find first match that is not scheduled and not completed
      const activeMatchIndex = matches.findIndex(match =>
        match.status && match.status !== 'scheduled' && match.status !== 'completed'
      );


      if (activeMatchIndex !== -1) {
        newIndex = activeMatchIndex;
      } else {
        // Find first scheduled match
        const scheduledIndex = matches.findIndex(match => match.status === 'scheduled');
        newIndex = scheduledIndex !== -1 ? scheduledIndex : 0;
      }
    } else {
      // No completed matches today and no live match
      // Find the match closest to current date and time
      const now = new Date();
      let closestMatchIndex = 0;
      let closestTimeDifference = Infinity;

      // Skip completed matches from other days so their results aren't shown
      const hasPending = matches.some(match => match.status !== 'completed');

      matches.forEach((match, index) => {
        if (hasPending && match.status === 'completed') return;
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
        const matchTime = match.time || '00:00';
        const [hours, minutes] = matchTime.split(':').map(Number);
        matchDate.setHours(hours, minutes, 0, 0);

        const timeDifference = Math.abs(matchDate.getTime() - now.getTime());

        if (timeDifference < closestTimeDifference) {
          closestTimeDifference = timeDifference;
          closestMatchIndex = index;
        }
      });

      newIndex = closestMatchIndex;
    }

    console.log('Checking for active match:', {
      totalMatches: matches.length,
      completedTodayCount,
      hasCompletedToday,
      liveMatchIndex,
      newIndex,
      matchStatuses: matches.map((m, i) => ({ index: i, status: m.status }))
    });
    
    // Always update to the new index
    console.log('Switching to match index:', newIndex);
    setCurrentMatchIndex(newIndex);
    setShowFixtureResult(fixtureResult);
  }, [matches]);

  const getTeamLogo = (teamKey) => {
    if (teams[teamKey]) {
      if (teams[teamKey].logoUrl) {
        return teams[teamKey].logoUrl;
      }

      if (teams[teamKey].logo && teams[teamKey].logo.url) {
        return teams[teamKey].logo.url;
      }

      if (teams[teamKey].logo && typeof teams[teamKey].logo === 'string') {
        return teams[teamKey].logo;
      }
    }

    return hplLogoWhite;
  };

  const formatScore = (playerKey) => {
    const match = matches[currentMatchIndex];
    if (!match || !match.scores || !match.scores[playerKey]) return '0';

    const playerScores = match.scores[playerKey];
    let totalScore = 0;

    Object.keys(playerScores).forEach(gameKey => {
      if (gameKey.startsWith('game')) {
        totalScore += playerScores[gameKey] || 0;
      }
    });

    return totalScore.toString();
  };

  const getMatchesWon = (teamKey) => {
    const currentMatch = matches[currentMatchIndex];
    return getFixtureWins(matches, currentMatch?.fixtureGroupId)[teamKey];
  };

  const getStatusConfig = () => {
    const match = matches[currentMatchIndex];
    if (!match) return { label: 'Loading', bg: 'linear-gradient(90deg,#7b2cff,#3a6dff 65%,#2de2ff)', ink: '#07021f', dot: '#07021f', glow: 'rgba(90,90,255,.5)' };

    if (match.status === 'in-progress' || match.status === 'live') {
      return { 
        label: 'Live', 
        bg: 'linear-gradient(90deg,#ff2d78,#ff6a3d 60%,#ff9a2e)', 
        ink: '#1a0633', 
        dot: '#1a0633', 
        glow: 'rgba(255,80,120,.5)' 
      };
    } else if (hasCompletedMatches) {
      return { 
        label: 'About to start', 
        bg: 'linear-gradient(90deg,#7b2cff,#3a6dff 65%,#2de2ff)', 
        ink: '#07021f', 
        dot: '#07021f', 
        glow: 'rgba(90,90,255,.5)' 
      };
    } else {
      return { 
        label: 'About to start', 
        bg: 'linear-gradient(90deg,#7b2cff,#3a6dff 65%,#2de2ff)', 
        ink: '#07021f', 
        dot: '#07021f', 
        glow: 'rgba(90,90,255,.5)' 
      };
    }
  };

  if (loading) {
    return (
      <div className="streaming-overlay-transparent min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading venue matches...</div>
      </div>
    );
  }

  if (error || matches.length === 0) {
    return (
      <div className="streaming-overlay-transparent min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'No matches found for this venue'}</div>
      </div>
    );
  }

  const currentMatch = matches[currentMatchIndex];
  const statusConfig = getStatusConfig();
  const isLive = currentMatch.status === 'in-progress' || currentMatch.status === 'live';
  const isUpcoming = !currentMatch.status || currentMatch.status === 'scheduled' || currentMatch.status === 'upcoming';
  const isDreamBreaker = currentMatch.matchType === 'dreamBreaker';
  const matchTypeLabel = currentMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : currentMatch.matchTypeLabel || currentMatch.matchType || 'Match';
  const upNextStatus = { label: 'Up Next', bg: 'linear-gradient(90deg,#7b2cff,#3a6dff 65%,#2de2ff)', ink: '#07021f', dot: '#07021f', glow: 'rgba(90,90,255,.5)' };
  const finalStatus = { label: 'Final', bg: 'linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.1))', ink: '#fff', dot: '#ff9a2e', glow: 'rgba(0,0,0,.4)' };
  const badgeConfig = showFixtureResult ? finalStatus : isUpcoming ? upNextStatus : statusConfig;
  const fixtureWins = getFixtureWins(matches, currentMatch.fixtureGroupId);
  const team1Name = currentMatch.team1Name || 'Team 1';
  const team2Name = currentMatch.team2Name || 'Team 2';
  const fixtureWinner = fixtureWins.team1 > fixtureWins.team2 ? 'team1' : fixtureWins.team2 > fixtureWins.team1 ? 'team2' : null;
  const fixtureResultText = fixtureWinner === 'team1'
    ? `${team1Name} beat ${team2Name} ${fixtureWins.team1}–${fixtureWins.team2}`
    : fixtureWinner === 'team2'
      ? `${team2Name} beat ${team1Name} ${fixtureWins.team2}–${fixtureWins.team1}`
      : `${team1Name} and ${team2Name} drew ${fixtureWins.team1}–${fixtureWins.team2}`;
  const team1Players = [currentMatch.player1Team1, currentMatch.player2Team1].filter(Boolean);
  const team2Players = [currentMatch.player1Team2, currentMatch.player2Team2].filter(Boolean);
  const nextNote = ['Next match', currentMatch.court && (/court/i.test(currentMatch.court) ? currentMatch.court : `Court ${currentMatch.court}`), !currentMatch.court && currentMatch.venueName]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="streaming-overlay-transparent min-h-screen bg-transparent relative overflow-hidden font-schibsted">
      {/* Score Display - Top Left Corner */}
      <div className="absolute top-4 left-4 z-40" style={{ transform: 'scale(0.48)', transformOrigin: 'top left', width: '1040px' }}>
        <div className="flex flex-col gap-3.5">
          
          {/* Status Badge */}
          <div className="flex items-center gap-3.5">
            <div 
              className="relative overflow-hidden flex items-center gap-3 px-7 py-3 rounded-xl shadow-lg"
              style={{ 
                background: badgeConfig.bg,
                boxShadow: `0 0 46px ${badgeConfig.glow}, inset 0 1px 0 rgba(255,255,255,.45)`
              }}
            >
              <span 
                className="w-3 h-3 rounded-full"
                style={{ 
                  background: badgeConfig.dot,
                  animation: 'livepulse 1.6s ease-in-out infinite'
                }}
              />
              <span 
                className="relative font-unbounded font-black text-2xl tracking-widest uppercase"
                style={{ color: badgeConfig.ink }}
              >
                {badgeConfig.label}
              </span>
              <span 
                className="absolute top-0 bottom-0 left-0 w-1/3"
                style={{
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)',
                  animation: 'sheen 3.4s ease-in-out infinite'
                }}
              />
            </div>
            <div 
              className="flex-1 h-0.5 rounded"
              style={{ background: 'linear-gradient(90deg,rgba(255,154,46,.85),rgba(255,45,120,.5),transparent)' }}
            />
          </div>

          {showFixtureResult ? (
          /* Fixture Result Card */
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(90deg,rgba(255,106,61,.16),rgba(12,4,34,.92) 32%,rgba(12,4,34,.92) 68%,rgba(123,44,255,.18))',
              border: '1px solid rgba(255,255,255,.16)',
              boxShadow: '0 34px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.28)',
              backdropFilter: 'blur(16px)'
            }}
          >
            <div
              className="absolute left-0 right-0 top-0 h-1.5 z-[1]"
              style={{ background: 'linear-gradient(90deg,#ff9a2e,#ff2d78 55%,#7b2cff)' }}
            />
            <div className="relative grid overflow-hidden" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px minmax(0,1fr)', height: '250px' }}>
              <span
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: '-6%', bottom: '-6%', left: '-40px', width: '420px',
                  background: `url(${getTeamLogo('team1')}) left center/contain no-repeat`,
                  opacity: fixtureWinner === 'team1' ? 0.4 : 0.18,
                  mixBlendMode: 'screen',
                  WebkitMaskImage: 'linear-gradient(90deg,#000 25%,transparent 95%)',
                  maskImage: 'linear-gradient(90deg,#000 25%,transparent 95%)'
                }}
              />
              <div className="relative flex flex-col items-start justify-center gap-4 min-w-0 pl-11 text-left" style={{ opacity: fixtureWinner && fixtureWinner !== 'team1' ? 0.6 : 1 }}>
                <div className="max-w-full font-unbounded font-black text-[34px] uppercase text-white" style={{ lineHeight: 1.05, letterSpacing: '-0.035em', textWrap: 'balance', textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
                  {team1Name}
                </div>
                <div className="w-14 h-[3px] rounded-sm" style={{ background: 'linear-gradient(90deg,#ff9a2e,#ff2d78)' }} />
                {fixtureWinner === 'team1' && (
                  <div className="px-3 py-1.5 rounded-md font-schibsted font-extrabold text-[17px] leading-none tracking-[0.2em] uppercase text-[#1a0633]" style={{ background: 'linear-gradient(90deg,#ffc72e,#ff9a2e)', boxShadow: '0 0 24px rgba(255,180,60,.5)' }}>
                    Winner
                  </div>
                )}
              </div>
              <div className="relative flex flex-col items-center justify-center gap-4">
                <span className="absolute left-1/2 w-px" style={{ top: '28px', bottom: '28px', background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.2),transparent)' }} />
                <div className="relative px-3.5 py-2 rounded-lg font-schibsted font-extrabold text-[15px] leading-none tracking-[0.2em] uppercase text-[#ff9a2e] whitespace-nowrap" style={{ background: 'rgba(5,2,26,.9)', border: '1px solid rgba(255,154,46,.6)' }}>
                  Fixture Result
                </div>
                <div className="relative px-3.5 font-unbounded font-black text-[64px] leading-none text-white whitespace-nowrap" style={{ background: 'rgba(12,4,34,.92)', letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 36px rgba(255,45,120,.7),0 4px 18px rgba(0,0,0,.5)' }}>
                  {fixtureWins.team1}–{fixtureWins.team2}
                </div>
              </div>
              <span
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: '-6%', bottom: '-6%', right: '-40px', width: '420px',
                  background: `url(${getTeamLogo('team2')}) right center/contain no-repeat`,
                  opacity: fixtureWinner === 'team2' ? 0.4 : 0.18,
                  mixBlendMode: 'screen',
                  WebkitMaskImage: 'linear-gradient(270deg,#000 25%,transparent 95%)',
                  maskImage: 'linear-gradient(270deg,#000 25%,transparent 95%)'
                }}
              />
              <div className="relative flex flex-col items-end justify-center gap-4 min-w-0 pr-11 text-right" style={{ opacity: fixtureWinner && fixtureWinner !== 'team2' ? 0.6 : 1 }}>
                <div className="max-w-full font-unbounded font-black text-[34px] uppercase text-white" style={{ lineHeight: 1.05, letterSpacing: '-0.035em', textWrap: 'balance', textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
                  {team2Name}
                </div>
                <div className="w-14 h-[3px] rounded-sm" style={{ background: 'linear-gradient(270deg,#ff9a2e,#ff2d78)' }} />
                {fixtureWinner === 'team2' && (
                  <div className="px-3 py-1.5 rounded-md font-schibsted font-extrabold text-[17px] leading-none tracking-[0.2em] uppercase text-[#1a0633]" style={{ background: 'linear-gradient(90deg,#ffc72e,#ff9a2e)', boxShadow: '0 0 24px rgba(255,180,60,.5)' }}>
                    Winner
                  </div>
                )}
              </div>
            </div>
            <div
              className="relative flex items-center justify-center gap-4 px-6 py-3"
              style={{
                background: 'linear-gradient(90deg,rgba(4,1,14,.95),rgba(12,4,34,.9))',
                borderTop: '1px solid rgba(255,154,46,.65)'
              }}
            >
              <img src={iluCcplHydWhiteLogo} alt="ILU CCPL HYD" className="h-[30px] w-auto" />
              <span className="w-px h-[22px] bg-white/20" />
              <span className="font-schibsted font-extrabold text-[19px] leading-none tracking-[0.16em] uppercase text-white/80 whitespace-nowrap overflow-hidden text-ellipsis">
                {fixtureResultText}
              </span>
            </div>
          </div>
          ) : isUpcoming ? (
          /* Up Next Card */
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(90deg,rgba(255,106,61,.16),rgba(12,4,34,.92) 32%,rgba(12,4,34,.92) 68%,rgba(123,44,255,.18))',
              border: '1px solid rgba(255,255,255,.16)',
              boxShadow: '0 34px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.28)',
              backdropFilter: 'blur(16px)'
            }}
          >
            <div
              className="absolute left-0 right-0 top-0 h-1.5 z-[1]"
              style={{ background: 'linear-gradient(90deg,#ff9a2e,#ff2d78 55%,#7b2cff)' }}
            />
            <div className="relative grid overflow-hidden" style={{ gridTemplateColumns: 'minmax(0,1fr) 220px minmax(0,1fr)', height: '250px' }}>
              <span
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: '-6%', bottom: '-6%', left: '-40px', width: '420px',
                  background: `url(${getTeamLogo('team1')}) left center/contain no-repeat`,
                  opacity: 0.3,
                  mixBlendMode: 'screen',
                  WebkitMaskImage: 'linear-gradient(90deg,#000 25%,transparent 95%)',
                  maskImage: 'linear-gradient(90deg,#000 25%,transparent 95%)'
                }}
              />
              <div className="relative flex flex-col items-start justify-center gap-4 min-w-0 pl-11 text-left">
                <div className="max-w-full font-unbounded font-black text-[34px] uppercase text-white" style={{ lineHeight: 1.05, letterSpacing: '-0.035em', textWrap: 'balance', textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
                  {currentMatch.team1Name || 'Team 1'}
                </div>
                <div className="w-14 h-[3px] rounded-sm" style={{ background: 'linear-gradient(90deg,#ff9a2e,#ff2d78)' }} />
                {!isDreamBreaker && (
                  <div className="flex flex-col items-start gap-[9px]">
                    {(team1Players.length ? team1Players : ['TBD']).map((p, i) => (
                      <div key={i} className="font-schibsted font-extrabold text-[22px] leading-none tracking-[0.12em] uppercase text-[#ffb96b] whitespace-nowrap" style={{ textShadow: '0 2px 6px rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.8)' }}>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex flex-col items-center justify-center gap-4">
                <span className="absolute left-1/2 w-px" style={{ top: '28px', bottom: '28px', background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.2),transparent)' }} />
                <div className="relative px-3.5 py-2 rounded-lg font-schibsted font-extrabold text-[15px] leading-none tracking-[0.2em] uppercase text-[#ff9a2e] whitespace-nowrap" style={{ background: 'rgba(5,2,26,.9)', border: '1px solid rgba(255,154,46,.6)' }}>
                  {matchTypeLabel}
                </div>
                <div className="relative px-3.5 font-unbounded font-black text-[64px] leading-none text-white" style={{ background: 'rgba(12,4,34,.92)', letterSpacing: '-0.05em', textShadow: '0 0 36px rgba(255,45,120,.7),0 4px 18px rgba(0,0,0,.5)' }}>
                  VS
                </div>
              </div>
              <span
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: '-6%', bottom: '-6%', right: '-40px', width: '420px',
                  background: `url(${getTeamLogo('team2')}) right center/contain no-repeat`,
                  opacity: 0.3,
                  mixBlendMode: 'screen',
                  WebkitMaskImage: 'linear-gradient(270deg,#000 25%,transparent 95%)',
                  maskImage: 'linear-gradient(270deg,#000 25%,transparent 95%)'
                }}
              />
              <div className="relative flex flex-col items-end justify-center gap-4 min-w-0 pr-11 text-right">
                <div className="max-w-full font-unbounded font-black text-[34px] uppercase text-white" style={{ lineHeight: 1.05, letterSpacing: '-0.035em', textWrap: 'balance', textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
                  {currentMatch.team2Name || 'Team 2'}
                </div>
                <div className="w-14 h-[3px] rounded-sm" style={{ background: 'linear-gradient(270deg,#ff9a2e,#ff2d78)' }} />
                {!isDreamBreaker && (
                  <div className="flex flex-col items-end gap-[9px]">
                    {(team2Players.length ? team2Players : ['TBD']).map((p, i) => (
                      <div key={i} className="font-schibsted font-extrabold text-[22px] leading-none tracking-[0.12em] uppercase text-[#ffb96b] whitespace-nowrap" style={{ textShadow: '0 2px 6px rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.8)' }}>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div
              className="relative flex items-center justify-center gap-4 px-6 py-3"
              style={{
                background: 'linear-gradient(90deg,rgba(4,1,14,.95),rgba(12,4,34,.9))',
                borderTop: '1px solid rgba(255,154,46,.65)'
              }}
            >
              <img src={iluCcplHydWhiteLogo} alt="ILU CCPL HYD" className="h-[30px] w-auto" />
              <span className="w-px h-[22px] bg-white/20" />
              <span className="font-schibsted font-extrabold text-[19px] leading-none tracking-[0.16em] uppercase text-white/80 whitespace-nowrap">
                {nextNote}
              </span>
            </div>
          </div>
          ) : (
          /* Main Score Card */
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg,rgba(20,20,40,.95),rgba(10,10,25,.98))',
              border: '1px solid rgba(255,255,255,.16)',
              boxShadow: '0 34px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.28)',
              backdropFilter: 'blur(16px)'
            }}
          >
            {/* Top gradient line */}
            <div 
              className="absolute left-0 right-0 top-0 h-1.5"
              style={{ background: 'linear-gradient(90deg,#ff9a2e,#ff2d78 55%,#7b2cff)' }}
            />

            <div className="relative grid" style={{ gridTemplateColumns: '168px 92px minmax(0,1fr) 148px' }}>
              
              {/* Logo Section */}
              <div
                className="flex items-center justify-center p-3.5"
                style={{
                  background: 'linear-gradient(180deg,#0b0420,#160835)',
                  borderRight: '1px solid rgba(255,255,255,.12)'
                }}
              >
                <img
                  src={iluCcplHydWhiteLogo}
                  alt="ILU CCPL HYD"
                  className="w-full max-w-[142px] h-auto"
                />
              </div>

              {/* Matches Won Column */}
              <div 
                className="grid"
                style={{ 
                  gridTemplateRows: '1fr 1fr',
                  borderRight: '1px solid rgba(255,255,255,.12)'
                }}
              >
                <div 
                  className="flex flex-col items-center justify-center gap-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.12)' }}
                >
                  <div className="font-schibsted font-extrabold text-xs tracking-[0.22em] uppercase text-white/80">Won</div>
                  <div className="font-unbounded font-black text-[40px] leading-none text-white" style={{ letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                    {getMatchesWon('team1')}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="font-schibsted font-extrabold text-xs tracking-[0.22em] uppercase text-white/80">Won</div>
                  <div className="font-unbounded font-black text-[40px] leading-none text-white" style={{ letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                    {getMatchesWon('team2')}
                  </div>
                </div>
              </div>

              {/* Teams Section */}
              <div className="grid" style={{ gridTemplateRows: '1fr 1fr', minWidth: 0 }}>
                {/* Team 1 */}
                <div
                  className="relative overflow-hidden grid items-center gap-4 px-6 py-4 min-w-0"
                  style={{
                    gridTemplateColumns: 'minmax(0,1fr) auto',
                    borderBottom: '1px solid rgba(255,255,255,.12)',
                    background: currentMatch.servingPlayer === 'player1' && isLive ? 'rgba(255,154,46,.1)' : 'transparent'
                  }}
                >
                  {/* Decorative background - team logo */}
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-10 transform -translate-y-1/2 w-[180px] h-[180px] pointer-events-none"
                    style={{
                      backgroundImage: `url(${getTeamLogo('team1')})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      opacity: 0.24,
                      mixBlendMode: 'screen',
                      WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 60%)',
                      maskImage: 'linear-gradient(90deg,transparent,#000 60%)'
                    }}
                  />
                  <div className="relative flex flex-col gap-1.5 min-w-0">
                    <div className="font-unbounded font-black text-[31px] leading-none uppercase whitespace-nowrap overflow-hidden text-ellipsis text-white" style={{ letterSpacing: '-0.03em' }}>
                      {currentMatch.team1Name || 'Team 1'}
                    </div>
                    {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                      <div className="font-schibsted font-extrabold text-[23px] leading-none tracking-[0.1em] uppercase text-[#ffb96b] whitespace-nowrap overflow-hidden text-ellipsis">
                        {currentMatch.player1Team1 || 'TBD'}
                        {currentMatch.player2Team1 && ` / ${currentMatch.player2Team1}`}
                      </div>
                    )}
                  </div>
                  {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex-none w-[18px] h-[18px] rounded-full"
                        style={{
                          background: isLive && currentMatch.servingPlayer === 'player1' ? '#ffc72e' : 'rgba(255,255,255,.09)',
                          boxShadow: isLive && currentMatch.servingPlayer === 'player1' ? '0 0 18px rgba(255,199,46,.9)' : 'inset 0 0 0 1px rgba(255,255,255,.14)',
                          animation: isLive && currentMatch.servingPlayer === 'player1' ? 'servepulse 1.8s ease-in-out infinite' : 'none'
                        }}
                      />
                      {(currentMatch.teamServeCount || 0) === 1 && (
                        <span
                          className="flex-none w-[18px] h-[18px] rounded-full"
                          style={{
                            background: isLive && currentMatch.servingPlayer === 'player1' ? '#ffc72e' : 'rgba(255,255,255,.09)',
                            boxShadow: isLive && currentMatch.servingPlayer === 'player1' ? '0 0 18px rgba(255,199,46,.9)' : 'inset 0 0 0 1px rgba(255,255,255,.14)',
                            animation: isLive && currentMatch.servingPlayer === 'player1' ? 'servepulse 1.8s ease-in-out infinite' : 'none'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Team 2 */}
                <div
                  className="relative overflow-hidden grid items-center gap-4 px-6 py-4 min-w-0"
                  style={{
                    gridTemplateColumns: 'minmax(0,1fr) auto',
                    background: currentMatch.servingPlayer === 'player2' && isLive ? 'rgba(255,154,46,.1)' : 'transparent'
                  }}
                >
                  {/* Decorative background - team logo */}
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-10 transform -translate-y-1/2 w-[180px] h-[180px] pointer-events-none"
                    style={{
                      backgroundImage: `url(${getTeamLogo('team2')})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      opacity: 0.24,
                      mixBlendMode: 'screen',
                      WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 60%)',
                      maskImage: 'linear-gradient(90deg,transparent,#000 60%)'
                    }}
                  />
                  <div className="relative flex flex-col gap-1.5 min-w-0">
                    <div className="font-unbounded font-black text-[31px] leading-none uppercase whitespace-nowrap overflow-hidden text-ellipsis text-white" style={{ letterSpacing: '-0.03em' }}>
                      {currentMatch.team2Name || 'Team 2'}
                    </div>
                    {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                      <div className="font-schibsted font-extrabold text-[23px] leading-none tracking-[0.1em] uppercase text-[#ffb96b] whitespace-nowrap overflow-hidden text-ellipsis">
                        {currentMatch.player1Team2 || 'TBD'}
                        {currentMatch.player2Team2 && ` / ${currentMatch.player2Team2}`}
                      </div>
                    )}
                  </div>
                  {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex-none w-[18px] h-[18px] rounded-full"
                        style={{
                          background: isLive && currentMatch.servingPlayer === 'player2' ? '#ffc72e' : 'rgba(255,255,255,.09)',
                          boxShadow: isLive && currentMatch.servingPlayer === 'player2' ? '0 0 18px rgba(255,199,46,.9)' : 'inset 0 0 0 1px rgba(255,255,255,.14)',
                          animation: isLive && currentMatch.servingPlayer === 'player2' ? 'servepulse 1.8s ease-in-out infinite' : 'none'
                        }}
                      />
                      {(currentMatch.teamServeCount || 0) === 1 && (
                        <span
                          className="flex-none w-[18px] h-[18px] rounded-full"
                          style={{
                            background: isLive && currentMatch.servingPlayer === 'player2' ? '#ffc72e' : 'rgba(255,255,255,.09)',
                            boxShadow: isLive && currentMatch.servingPlayer === 'player2' ? '0 0 18px rgba(255,199,46,.9)' : 'inset 0 0 0 1px rgba(255,255,255,.14)',
                            animation: isLive && currentMatch.servingPlayer === 'player2' ? 'servepulse 1.8s ease-in-out infinite' : 'none'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Scores Section */}
              <div
                className="grid"
                style={{
                  gridTemplateRows: '1fr 1fr',
                  borderLeft: '1px solid rgba(255,255,255,.14)'
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg,#ff8a1f,#ef6a12)',
                    borderBottom: '1px solid rgba(0,0,0,.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)'
                  }}
                >
                  <span
                    className="font-unbounded font-black text-[62px] leading-none text-white"
                    style={{
                      letterSpacing: '-0.06em',
                      fontVariantNumeric: 'tabular-nums',
                      textShadow: '0 3px 14px rgba(0,0,0,.45)'
                    }}
                  >
                    {formatScore('player1')}
                  </span>
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg,#e9691a,#c9500d)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22)'
                  }}
                >
                  <span
                    className="font-unbounded font-black text-[62px] leading-none text-white"
                    style={{
                      letterSpacing: '-0.06em',
                      fontVariantNumeric: 'tabular-nums',
                      textShadow: '0 3px 14px rgba(0,0,0,.45)'
                    }}
                  >
                    {formatScore('player2')}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Ticker */}
            <div
              className="relative grid items-center gap-6 px-6 py-3"
              style={{
                gridTemplateColumns: 'minmax(0,1fr)',
                background: 'linear-gradient(90deg,rgba(4,1,14,.95),rgba(12,4,34,.9))',
                borderTop: '1px solid rgba(255,154,46,.65)'
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex-none font-unbounded font-black text-[22px] tracking-[0.08em] uppercase text-[#ff9a2e]">
                  {matchTypeLabel}
                </span>
                <span className="flex-none w-px h-5.5 bg-white/20" />
                <span className="font-schibsted font-extrabold text-[19px] tracking-[0.16em] uppercase text-white/80 whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentMatch.venueName || 'Venue'}
                </span>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Point Ticker */}
      {pointTicker && (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-t-lg shadow-2xl border-4 border-green-400">
            <div className="flex items-center space-x-3 font-danson">
              <span className="text-2xl font-black uppercase tracking-wider">
                {pointTicker.teamName} SCORES!
              </span>
              <div className="bg-white text-green-700 px-3 py-1 rounded-full font-black text-xl">
                +{pointTicker.points}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
