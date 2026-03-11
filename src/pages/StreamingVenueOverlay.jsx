import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
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

export default function StreamingVenueOverlay() {
   const { venueId, tournamentId } = useParams();
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

  // Team logo mapping
  const teamLogos = {
    'HPL': hplLogoWhite,
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

  // Fetch all matches for this venue (initial load only)
  useEffect(() => {
    if (!venueId || !tournamentId) return;

    const fetchVenueMatches = async () => {
      try {
        // Fetch all fixtures for this tournament and venue
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId),
          where('venue', '==', venueId)
        );

        const fixturesSnapshot = await getDocs(fixturesQuery);
        const matchesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by date and time
        matchesData.sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
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
    if (matches.length === 0 || currentMatchIndex >= matches.length) return;

    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch) return;

    // Set up real-time listener for the current match
    const unsubscribeMatch = onSnapshot(
      doc(db, 'fixtures', currentMatch.id),
      async (matchDoc) => {
        try {
          if (matchDoc.exists()) {
            const matchData = { id: matchDoc.id, ...matchDoc.data() };

            // Update matches array with latest data
            setMatches(prevMatches =>
              prevMatches.map(m => m.id === currentMatch.id ? matchData : m)
            );

            // Check for score changes - only if we have previous match data
            if (matches[currentMatchIndex]) {
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
                previous: previousScores
              });

              // Check if player1 scored
              if (currentPlayer1Score > previousScores.player1) {
                console.log('Player 1 scored!');
                setPointTicker({
                  team: 'player1',
                  teamName: matchData.team1Name,
                  points: currentPlayer1Score - previousScores.player1,
                  timestamp: Date.now()
                });
                setTimeout(() => setPointTicker(null), 3000);
              }
              // Check if player2 scored
              else if (currentPlayer2Score > previousScores.player2) {
                console.log('Player 2 scored!');
                setPointTicker({
                  team: 'player2',
                  teamName: matchData.team2Name,
                  points: currentPlayer2Score - previousScores.player2,
                  timestamp: Date.now()
                });
                setTimeout(() => setPointTicker(null), 3000);
              }

              // Update previous scores
              setPreviousScores({
                player1: currentPlayer1Score,
                player2: currentPlayer2Score
              });
            }

            // Check for serve changes and trigger ticker (only for non-dreambreaker matches)
            if (matches[currentMatchIndex] && (!matchData.matchType || matchData.matchType !== 'dreamBreaker')) {
              const currentServer = matchData.servingPlayer;

              // Check if server changed
              if (previousServer && currentServer && currentServer !== previousServer) {
                const serverNumber = currentServer === 'player1' ? '1' : '2';
                setServeTicker({
                  server: currentServer,
                  serverNumber: serverNumber,
                  timestamp: Date.now()
                });

                // Clear ticker after 3 seconds
                setTimeout(() => setServeTicker(null), 3000);
              }

              // Update previous server
              setPreviousServer(currentServer);
            }

            // Fetch team details
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

            // Initialize previous server on first load
            if (!matches[currentMatchIndex]) {
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
      unsubscribeMatch();
    };
  }, [currentMatchIndex]);

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
  }, [currentMatchIndex, matches.length]);

  // Find and set the active match whenever matches change
  useEffect(() => {
    if (matches.length === 0) return;

    // Find the first match that is in-progress (not scheduled and not completed)
    const activeMatchIndex = matches.findIndex(match =>
      match.status && match.status !== 'scheduled' && match.status !== 'completed'
    );

    console.log('Checking for active match:', {
      totalMatches: matches.length,
      activeMatchIndex,
      matchStatuses: matches.map((m, i) => ({ index: i, status: m.status }))
    });

    // If no active match found, default to the first match
    const newIndex = activeMatchIndex !== -1 ? activeMatchIndex : 0;
    
    // Only update if the active match index changed
    if (newIndex !== currentMatchIndex) {
      console.log('Switching to match index:', newIndex);
      setCurrentMatchIndex(newIndex);
    }
  }, [matches, currentMatchIndex]);

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

  const ServeTicker = ({ ticker, side }) => {
    if (!ticker) return null;

    const isLeft = side === 'left';
    const shouldShow = (ticker.server === 'player1' && isLeft) || (ticker.server === 'player2' && !isLeft);

    if (!shouldShow) return null;

    return (
      <div className={`absolute top-1/2 transform -translate-y-1/2 ${isLeft ? 'left-2' : 'right-2'} z-20`}>
        <div className="animate-bounce bg-green-500 text-white px-3 py-2 rounded-full shadow-lg border-2 border-green-600">
          <div className="flex items-center space-x-1 font-danson">
            <span className="text-lg font-bold">SERVE</span>
            <span className="text-sm">{ticker.serverNumber}</span>
          </div>
        </div>
      </div>
    );
  };

  const PointTicker = ({ ticker }) => {
    if (!ticker) return null;

    return (
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-t-lg shadow-2xl border-4 border-green-400">
          <div className="flex items-center space-x-3 font-danson">
            <span className="text-2xl font-black uppercase tracking-wider">
              {ticker.teamName} SCORES!
            </span>
            <div className="bg-white text-green-700 px-3 py-1 rounded-full font-black text-xl">
              +{ticker.points}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ServeIndicator = ({ side }) => {
    const match = matches[currentMatchIndex];
    if (!match) return null;

    const isLeft = side === 'left';
    const currentServer = match.servingPlayer || 'player1';
    const shouldShow = (currentServer === 'player1' && isLeft) || (currentServer === 'player2' && !isLeft);

    if (!shouldShow) return null;

    const serveNumber = (match.teamServeCount || 0) + 1;

    return (
      <div className={`absolute top-1/2 transform -translate-y-1/2 z-20 ${isLeft ? 'left-[38%]' : 'right-[38%]'}`}>
        <div className="relative">
          <div
            className={`w-0 h-0 ${
              isLeft
                ? 'border-l-[30px] border-l-yellow-400 border-r-[30px] border-r-transparent border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent'
                : 'border-r-[30px] border-r-yellow-400 border-l-[30px] border-l-transparent border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent'
            }`}
          />
          <div className={`absolute top-1/2 ${isLeft ? 'left-2' : 'right-2'} transform -translate-y-1/2`}>
            <span className="text-green-800 text-lg font-black font-danson">{serveNumber}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading venue matches...</div>
      </div>
    );
  }

  if (error || matches.length === 0) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'No matches found for this venue'}</div>
      </div>
    );
  }

  const currentMatch = matches[currentMatchIndex];

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Venue Header */}
      <div className="absolute top-4 right-4 z-40 text-white text-right">
        <div className="text-sm font-bold uppercase tracking-wider bg-black px-3 py-2 border-2 border-orange-500 font-danson">
          {currentMatch.venueName || 'Venue'}
        </div>
        <div className="text-xs text-gray-300 mt-2">
          Match {currentMatchIndex + 1} of {matches.length}
        </div>
      </div>

      {/* Score Display - Top Left Corner */}
      <div className="absolute top-4 left-4 z-40">
        <div className="flex flex-col space-y-0 w-80">
          {/* Match Info Header */}
          <div className="flex items-center space-x-0 mb-0">
            <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider bg-black px-2 py-1 border-2 border-orange-500 font-danson">
              Match {currentMatch.matchNumber || 1}
            </div>
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-2 py-1 shadow-lg border-2 border-orange-400 text-xs sm:text-sm font-bold font-danson">
              {(currentMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : currentMatch.matchTypeLabel) || currentMatch.matchType || 'Match'}
            </div>
          </div>

          {/* Team 1 Row */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 py-2 shadow-lg border-2 border-orange-500 grid grid-cols-12 items-center gap-2">
            <div className="col-span-2 flex justify-center">
              <div className="w-10 h-10">
                <img
                  src={getTeamLogo('team1')}
                  alt={currentMatch.team1Name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="col-span-5 flex flex-col min-w-0 space-y-0.5">
              {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                <>
                  <div className="text-xs font-semibold text-orange-300 whitespace-nowrap">
                    {currentMatch.player1Team1 || 'TBD'}
                  </div>
                  {currentMatch.player2Team1 && (
                    <div className="text-xs font-semibold text-orange-300 whitespace-nowrap">
                      {currentMatch.player2Team1}
                    </div>
                  )}
                </>
              )}
              {(currentMatch.matchType === 'dreamBreaker') && (
                <div className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  {currentMatch.team1Name}
                </div>
              )}
            </div>

            {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
              <div className="col-span-2 flex justify-center items-center space-x-1">
                {currentMatch.servingPlayer === 'player1' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    {(currentMatch.teamServeCount || 0) === 1 && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    )}
                  </>
                )}
              </div>
            )}

            <div className={`col-span-3 text-2xl sm:text-3xl font-black text-right ${pointTicker && pointTicker.team === 'player1' ? 'animate-score-pulse' : ''}`}>
              {formatScore('player1')}
            </div>
          </div>

          {/* Team 2 Row */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 py-2 shadow-lg border-2 border-orange-500 grid grid-cols-12 items-center gap-2">
            <div className="col-span-2 flex justify-center">
              <div className="w-10 h-10">
                <img
                  src={getTeamLogo('team2')}
                  alt={currentMatch.team2Name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="col-span-5 flex flex-col min-w-0 space-y-0.5">
              {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
                <>
                  <div className="text-xs font-semibold text-orange-300 whitespace-nowrap">
                    {currentMatch.player1Team2 || 'TBD'}
                  </div>
                  {currentMatch.player2Team2 && (
                    <div className="text-xs font-semibold text-orange-300 whitespace-nowrap">
                      {currentMatch.player2Team2}
                    </div>
                  )}
                </>
              )}
              {(currentMatch.matchType === 'dreamBreaker') && (
                <div className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  {currentMatch.team2Name}
                </div>
              )}
            </div>

            {(!currentMatch.matchType || currentMatch.matchType !== 'dreamBreaker') && (
              <div className="col-span-2 flex justify-center items-center space-x-1">
                {currentMatch.servingPlayer === 'player2' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    {(currentMatch.teamServeCount || 0) === 1 && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    )}
                  </>
                )}
              </div>
            )}

            <div className={`col-span-3 text-2xl sm:text-3xl font-black text-right ${pointTicker && pointTicker.team === 'player2' ? 'animate-score-pulse' : ''}`}>
              {formatScore('player2')}
            </div>
          </div>
        </div>
      </div>

      {/* Point Ticker */}
      <PointTicker ticker={pointTicker} />
    </div>
  );
}
