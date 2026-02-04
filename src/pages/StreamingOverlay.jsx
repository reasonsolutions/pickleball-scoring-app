import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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

export default function StreamingOverlay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState({});
  const [cachedTeams, setCachedTeams] = useState({});
  const [fixture, setFixture] = useState(null);
  const [fixtureContext, setFixtureContext] = useState(null);
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

  useEffect(() => {
    if (!matchId) return;

    // Set up real-time listener for overlay controls
    const overlayControlId = `overlay_${matchId}`;
    const unsubscribeOverlayControl = onSnapshot(
      doc(db, 'overlay_controls', overlayControlId),
      (controlDoc) => {
        if (controlDoc.exists()) {
          const controlData = controlDoc.data();
          const newPlayerCard = controlData.activePlayerCard;
          
          // Clear existing timer if there is one
          if (playerCardTimer) {
            clearTimeout(playerCardTimer);
          }
          
          if (newPlayerCard) {
            setActivePlayerCard(newPlayerCard);
            
            // Set timer to hide card after 8 seconds
            const timer = setTimeout(() => {
              setActivePlayerCard(null);
            }, 8000);
            
            setPlayerCardTimer(timer);
          } else {
            setActivePlayerCard(null);
            setPlayerCardTimer(null);
          }
        } else {
          setActivePlayerCard(null);
          if (playerCardTimer) {
            clearTimeout(playerCardTimer);
            setPlayerCardTimer(null);
          }
        }
      },
      (error) => {
        console.error('Error listening to overlay controls:', error);
      }
    );

    // Set up real-time listener for the match
    const unsubscribeMatch = onSnapshot(
      doc(db, 'fixtures', matchId),
      async (matchDoc) => {
        try {
          if (matchDoc.exists()) {
            const matchData = { id: matchDoc.id, ...matchDoc.data() };
            
            // Check for score changes and trigger point ticker
            if (match) {
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
            if (match && (!matchData.matchType || matchData.matchType !== 'dreamBreaker')) {
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
            
            setMatch(matchData);

            // Fetch tournament details
            if (matchData.tournamentId) {
              const tournamentDoc = await getDoc(doc(db, 'tournaments', matchData.tournamentId));
              if (tournamentDoc.exists()) {
                setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
              }
            }

            // Fetch team details for logos (with caching)
            const teamsData = {};
            
            if (matchData.team1) {
              if (cachedTeams[matchData.team1]) {
                // Use cached data
                teamsData.team1 = cachedTeams[matchData.team1];
              } else {
                // Fetch and cache
                try {
                  const team1Doc = await getDoc(doc(db, 'teams', matchData.team1));
                  if (team1Doc.exists()) {
                    const team1Data = { id: team1Doc.id, ...team1Doc.data() };
                    teamsData.team1 = team1Data;
                    setCachedTeams(prev => ({ ...prev, [matchData.team1]: team1Data }));
                  }
                } catch (team1Error) {
                  console.error('Error fetching team1:', team1Error);
                }
              }
            }
            if (matchData.team2) {
              if (cachedTeams[matchData.team2]) {
                // Use cached data
                teamsData.team2 = cachedTeams[matchData.team2];
              } else {
                // Fetch and cache
                try {
                  const team2Doc = await getDoc(doc(db, 'teams', matchData.team2));
                  if (team2Doc.exists()) {
                    const team2Data = { id: team2Doc.id, ...team2Doc.data() };
                    teamsData.team2 = team2Data;
                    setCachedTeams(prev => ({ ...prev, [matchData.team2]: team2Data }));
                  }
                } catch (team2Error) {
                  console.error('Error fetching team2:', team2Error);
                }
              }
            }
            setTeams(teamsData);
            
            // Try to determine fixture context from related matches
            if (matchData.fixtureGroupId && !fixtureContext) {
              try {
                // Query for other matches with the same fixtureGroupId to find the tournament stage
                const { query, where, getDocs, collection } = await import('firebase/firestore');
                const relatedMatchesQuery = query(
                  collection(db, 'fixtures'),
                  where('fixtureGroupId', '==', matchData.fixtureGroupId)
                );
                const relatedMatchesSnapshot = await getDocs(relatedMatchesQuery);
                
                // Look for a match that has a tournament stage fixtureType
                let tournamentStage = null;
                relatedMatchesSnapshot.forEach((doc) => {
                  const matchData = doc.data();
                  if (matchData.fixtureType && ['quarterfinal', 'semifinal', 'thirdplace', 'third-place', 'final'].includes(matchData.fixtureType)) {
                    tournamentStage = matchData.fixtureType;
                  }
                });
                
                if (tournamentStage) {
                  setFixtureContext({ stage: tournamentStage });
                }
              } catch (error) {
                console.error('Error determining fixture context:', error);
              }
            }
            
            // Initialize previous server on first load
            if (!match) {
              setPreviousServer(matchData.servingPlayer);
            }
          } else {
            setError('Match not found');
          }
        } catch (error) {
          console.error('Error fetching match:', error);
          setError('Failed to load match data');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to match:', error);
        setError('Failed to load match data');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMatch();
      unsubscribeOverlayControl();
      if (playerCardTimer) {
        clearTimeout(playerCardTimer);
      }
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'Match not found'}</div>
      </div>
    );
  }

  const getTeamLogo = (teamKey) => {
    // Check different possible logo field structures
    if (teams[teamKey]) {
      // Try logoUrl field first
      if (teams[teamKey].logoUrl) {
        return teams[teamKey].logoUrl;
      }
      
      // Try logo.url structure (based on Firestore rules)
      if (teams[teamKey].logo && teams[teamKey].logo.url) {
        return teams[teamKey].logo.url;
      }
      
      // Try direct logo field
      if (teams[teamKey].logo && typeof teams[teamKey].logo === 'string') {
        return teams[teamKey].logo;
      }
    }
    
    // Only use fallback if absolutely no data is available
    return hplLogoWhite;
  };

  // Helper function to format fixture type for display
  const formatFixtureType = (fixtureType) => {
    switch (fixtureType) {
      case 'league': return 'League';
      case 'quarterfinal': return 'Quarter Final';
      case 'semifinal': return 'Semi Final';
      case 'thirdplace': return 'Third Place';
      case 'third-place': return 'Third Place';
      case 'final': return 'Final';
      case 'dreambreaker': return 'Game Breaker';
      case 'minidreambreaker': return 'Mini Game Breaker';
      case 'roundrobin': return 'Round Robin';
      case 'custom': return 'Custom';
      case 'playoff': return 'Playoff';
      default: return fixtureType || 'Unknown';
    }
  };

  const formatScore = (playerKey) => {
    if (!match.scores || !match.scores[playerKey]) return '0';
    
    const playerScores = match.scores[playerKey];
    let totalScore = 0;
    
    // Sum up all game scores for the player
    Object.keys(playerScores).forEach(gameKey => {
      if (gameKey.startsWith('game')) {
        totalScore += playerScores[gameKey] || 0;
      }
    });
    
    return totalScore.toString();
  };

  // Serve Ticker Component (shows when serve changes)
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

  // Point Ticker Component (shows when a team scores)
  const PointTicker = ({ ticker }) => {
    if (!ticker) return null;
    
    return (
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-t-lg shadow-2xl border-4 border-green-400" style={{
          background: `
            linear-gradient(145deg, #16a34a 0%, #15803d 50%, #166534 100%),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 2px, transparent 2px, transparent calc(100% - 2px), rgba(0,0,0,0.3) calc(100% - 2px), rgba(0,0,0,0.2) 100%)
          `,
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.25),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            inset 2px 0 0 rgba(255,255,255,0.15),
            inset -2px 0 0 rgba(0,0,0,0.2)
          `
        }}>
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

  // Static Serve Indicator Component (yellow triangle with serve number)
  const ServeIndicator = ({ side }) => {
    const isLeft = side === 'left';
    
    // If no servingPlayer field, default to player1 serving
    const currentServer = match.servingPlayer || 'player1';
    const shouldShow = (currentServer === 'player1' && isLeft) || (currentServer === 'player2' && !isLeft);
    
    if (!shouldShow) return null;
    
    // Get serve number - for doubles, use teamServeCount (0 = first serve, 1 = second serve)
    const serveNumber = (match.teamServeCount || 0) + 1;
    
    return (
      <div className={`absolute top-1/2 transform -translate-y-1/2 z-20 ${isLeft ? 'left-[38%]' : 'right-[38%]'}`}>
        <div className="relative">
          {/* Yellow triangle pointing towards the score */}
          <div
            className={`w-0 h-0 ${
              isLeft
                ? 'border-l-[30px] border-l-yellow-400 border-r-[30px] border-r-transparent border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent'
                : 'border-r-[30px] border-r-yellow-400 border-l-[30px] border-l-transparent border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent'
            }`}
          />
          {/* Serve number inside triangle */}
          <div className={`absolute top-1/2 ${isLeft ? 'left-2' : 'right-2'} transform -translate-y-1/2`}>
            <span className="text-green-800 text-lg font-black font-danson">{serveNumber}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Streaming Overlay positioned at bottom center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-7xl px-4">
        <div className="relative h-20 sm:h-24 lg:h-28">
          
          {/* Left Team Card */}
          <div className="absolute left-0 top-0 h-full flex items-center pl-20 pr-20 overflow-hidden border-2 border-orange-500" style={{
            width: '45%',
            clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 100%, 0 100%)',
            background: `
              linear-gradient(145deg, #334155 0%, #1e293b 50%, #0f172a 100%),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 1px, transparent 1px, transparent calc(100% - 1px), rgba(0,0,0,0.2) calc(100% - 1px), rgba(0,0,0,0.1) 100%)
            `,
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.25),
              inset 1px 0 0 rgba(255,255,255,0.1),
              inset -1px 0 0 rgba(0,0,0,0.1)
            `
          }}>
            {/* Pickleball pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 1px, transparent 1px),
                linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%)
              `,
              backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px, 20px 20px, 60px 60px, 60px 60px',
              filter: 'blur(0.5px) contrast(1.2)'
            }} />
            {/* Noise filter overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              mixBlendMode: 'overlay'
            }} />
            
            {/* Team 1 Info */}
            <div className="flex flex-col min-w-0 flex-1 relative z-10">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-white uppercase tracking-wider truncate font-anthem">
                {match.team1Name}
              </div>
              {(!match.matchType || match.matchType !== 'dreamBreaker') && (
                <div className="text-sm sm:text-base lg:text-lg font-bold text-orange-300 truncate font-danson">
                  {match.player1Team1 && match.player2Team1
                    ? `${match.player1Team1}/${match.player2Team1}`
                    : match.player1Team1 || 'TBD'
                  }
                </div>
              )}
            </div>
            
            {/* Pool/Court indicator for Team 1 */}
            {match.pool && (
              <div className="bg-orange-500 text-white px-2 py-1 font-bold text-sm flex-shrink-0 ml-2 border border-orange-400 relative z-10 font-danson">
                {match.pool}
              </div>
            )}
          </div>

          {/* Right Team Card */}
          <div className="absolute right-0 top-0 h-full flex items-center justify-end pl-20 pr-20 overflow-hidden border-2 border-orange-500" style={{
            width: '45%',
            clipPath: 'polygon(40px 0, 100% 0, 100% 100%, 0 100%)',
            background: `
              linear-gradient(145deg, #334155 0%, #1e293b 50%, #0f172a 100%),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 1px, transparent 1px, transparent calc(100% - 1px), rgba(0,0,0,0.2) calc(100% - 1px), rgba(0,0,0,0.1) 100%)
            `,
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.25),
              inset 1px 0 0 rgba(255,255,255,0.1),
              inset -1px 0 0 rgba(0,0,0,0.1)
            `
          }}>
            {/* Pickleball pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 2px, transparent 2px),
                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 1px, transparent 1px),
                linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%)
              `,
              backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px, 20px 20px, 60px 60px, 60px 60px',
              filter: 'blur(0.5px) contrast(1.2)'
            }} />
            {/* Noise filter overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              mixBlendMode: 'overlay'
            }} />
            
            {/* Team 2 Info */}
            <div className="flex flex-col min-w-0 flex-1 text-right relative z-10">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-white uppercase tracking-wider truncate font-anthem">
                {match.team2Name}
              </div>
              {(!match.matchType || match.matchType !== 'dreamBreaker') && (
                <div className="text-sm sm:text-base lg:text-lg font-bold text-orange-300 truncate font-danson">
                  {match.player1Team2 && match.player2Team2
                    ? `${match.player1Team2}/${match.player2Team2}`
                    : match.player1Team2 || 'TBD'
                  }
                </div>
              )}
            </div>
            
          </div>

          {/* Team Logos as Overlays */}
          {/* Team 1 Logo Overlay - 90% outside to the left, 10% inside the left box */}
          <div className="absolute top-1/2 transform -translate-y-1/2 z-20" style={{ left: '-72px' }}>
            <div className="relative">
              {/* White glow background */}
              <div className="absolute inset-0 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                filter: 'blur(8px)',
                transform: 'scale(1.2)',
                zIndex: -1
              }} />
              <img
                src={getTeamLogo('team1')}
                alt={match.team1Name}
                className="w-20 h-20 sm:w-26 sm:h-26 lg:w-32 lg:h-32 object-contain drop-shadow-lg relative z-10"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4)) drop-shadow(0 0 24px rgba(255,255,255,0.2))'
                }}
              />
            </div>
          </div>

          {/* Team 2 Logo Overlay - 90% outside to the right, 10% inside the right box */}
          <div className="absolute top-1/2 transform -translate-y-1/2 z-20" style={{ right: '-72px' }}>
            <div className="relative">
              {/* White glow background */}
              <div className="absolute inset-0 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                filter: 'blur(8px)',
                transform: 'scale(1.2)',
                zIndex: -1
              }} />
              <img
                src={getTeamLogo('team2')}
                alt={match.team2Name}
                className="w-20 h-20 sm:w-26 sm:h-26 lg:w-32 lg:h-32 object-contain drop-shadow-lg relative z-10"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4)) drop-shadow(0 0 24px rgba(255,255,255,0.2))'
                }}
              />
            </div>
          </div>

          {/* Serve Indicators and Tickers */}
          {(!match.matchType || match.matchType !== 'dreamBreaker') && (
            <>
              {/* Static serve indicators */}
              <ServeIndicator side="left" />
              <ServeIndicator side="right" />
              
              {/* Animated serve change tickers */}
              <ServeTicker ticker={serveTicker} side="left" />
              <ServeTicker ticker={serveTicker} side="right" />
            </>
          )}

          {/* Center Section */}
          <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-full flex flex-col items-center justify-center space-y-1 z-10">
            {/* Match Number */}
            <div className="text-xs sm:text-sm lg:text-base font-bold text-white uppercase tracking-wider bg-black px-3 py-1 border-2 border-orange-500 font-danson">
              {(() => {
                // Use matchNumber if available, otherwise default to Match 1
                const matchNumber = match.matchNumber || 1;
                return `Match ${matchNumber}`;
              })()}
            </div>
            
            {/* Score Display */}
            <div className="bg-gradient-to-r from-red-700 to-red-800 text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 shadow-2xl border-4 border-orange-500 transform skew-x-[-2deg]">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <span className={`text-2xl sm:text-3xl lg:text-4xl font-black ${pointTicker && pointTicker.team === 'player1' ? 'animate-score-pulse' : ''}`}>
                  {formatScore('player1')}
                </span>
                <span className="text-xl sm:text-2xl lg:text-3xl font-light text-red-200">|</span>
                <span className={`text-2xl sm:text-3xl lg:text-4xl font-black ${pointTicker && pointTicker.team === 'player2' ? 'animate-score-pulse' : ''}`}>
                  {formatScore('player2')}
                </span>
              </div>
            </div>
            
            {/* Match Type */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 sm:px-5 lg:px-6 py-1 sm:py-2 shadow-lg border-2 border-orange-400">
              <span className="text-sm sm:text-base lg:text-lg font-bold font-danson">
                {(match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel) || match.matchType || 'Match'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Point Ticker */}
      <PointTicker ticker={pointTicker} />

      {/* Player Info Card Overlay */}
      {activePlayerCard && (() => {
        // Determine which team the player belongs to
        const isTeam1Player = match.player1Team1 === activePlayerCard.name || match.player2Team1 === activePlayerCard.name;
        const isTeam2Player = match.player1Team2 === activePlayerCard.name || match.player2Team2 === activePlayerCard.name;
        
        // Position the card above the correct team name area, not overlapping the center score
        const positionClass = isTeam1Player ? 'left-4' : isTeam2Player ? 'right-4' : 'left-1/2 transform -translate-x-1/2';
        
        return (
          <div className={`absolute bottom-40 ${positionClass} z-30`}>
            <div className="rounded-2xl shadow-2xl overflow-hidden animate-fade-in" style={{ width: '550px', height: '350px', background: 'linear-gradient(135deg, #ffffff 0%, #FE7743 100%)' }}>
              <div className="flex h-full">
                {/* Left side - Large Player Photo */}
                <div className="w-1/2 relative overflow-hidden">
                  <img
                    src={activePlayerCard.photo || 'https://via.placeholder.com/275x350/cccccc/666666?text=No+Photo'}
                    alt={activePlayerCard.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/275x350/cccccc/666666?text=No+Photo';
                    }}
                  />
                  {/* Team Logo overlay on photo */}
                  <div className="absolute top-4 left-4">
                    <div className="w-12 h-12 bg-white/90 rounded-full shadow-lg flex items-center justify-center">
                      <img
                        src={isTeam1Player ? getTeamLogo('team1') : isTeam2Player ? getTeamLogo('team2') : getTeamLogo('team1')}
                        alt="Team Logo"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Right side - Player Stats */}
                <div className="w-1/2 p-5 flex flex-col justify-center space-y-3">
                  {/* Player Name */}
                  <div className="text-right mb-2">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wider leading-tight font-sporty-pro">
                      {activePlayerCard.name.split(' ').map((word, index) => (
                        <div key={index} className="block">{word}</div>
                      ))}
                    </h2>
                  </div>

                  {/* First Row - Rating */}
                  <div className="bg-white/95 rounded-lg p-4 text-center">
                    <div className="text-2xl font-black text-black leading-none font-sporty-pro">
                      {activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles')
                        ? (activePlayerCard.doublesRating || 'N/A')
                        : (activePlayerCard.singlesRating || 'N/A')
                      }
                    </div>
                    <div className="text-xs text-gray-700 uppercase font-bold tracking-wide mt-1 font-sporty-pro">
                      {activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles') ? 'DOUBLES' : 'SINGLES'} RATING
                    </div>
                  </div>

                  {/* Second Row - Wins and Losses */}
                  <div className="flex space-x-2">
                    <div className="bg-white/95 rounded-lg p-3 text-center flex-1">
                      <div className="text-xl font-black text-green-600 leading-none font-sporty-pro">
                        {activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles')
                          ? (activePlayerCard.doublesWins || 0)
                          : (activePlayerCard.singlesWins || 0)
                        }
                      </div>
                      <div className="text-xs text-gray-700 uppercase font-bold tracking-wide mt-1 font-sporty-pro">WINS</div>
                    </div>
                    <div className="bg-white/95 rounded-lg p-3 text-center flex-1">
                      <div className="text-xl font-black text-red-600 leading-none font-sporty-pro">
                        {activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles')
                          ? (activePlayerCard.doublesLosses || 0)
                          : (activePlayerCard.singlesLosses || 0)
                        }
                      </div>
                      <div className="text-xs text-gray-700 uppercase font-bold tracking-wide mt-1 font-sporty-pro">LOSSES</div>
                    </div>
                  </div>

                  {/* Third Row - Win Rate */}
                  <div className="bg-white/95 rounded-lg p-4 text-center">
                    <div className="text-2xl font-black text-blue-600 leading-none font-sporty-pro">
                      {(() => {
                        const wins = activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles')
                          ? (activePlayerCard.doublesWins || 0)
                          : (activePlayerCard.singlesWins || 0);
                        const losses = activePlayerCard.matchType && activePlayerCard.matchType.toLowerCase().includes('doubles')
                          ? (activePlayerCard.doublesLosses || 0)
                          : (activePlayerCard.singlesLosses || 0);
                        const total = wins + losses;
                        if (total === 0) return '0%';
                        return Math.round((wins / total) * 100) + '%';
                      })()}
                    </div>
                    <div className="text-xs text-gray-700 uppercase font-bold tracking-wide mt-1 font-sporty-pro">WIN RATE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}