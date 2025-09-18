import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import SwipeToEndMatch from '../components/SwipeToEndMatch';
import YouTubeUrlManager from '../components/YouTubeUrlManager';

export default function UmpireScoring() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Match setup states
  const [setupStep, setSetupStep] = useState('games'); // 'games', 'points', 'scoring'
  const [gamesCount, setGamesCount] = useState(3);
  const [pointsPerGame, setPointsPerGame] = useState([11, 11, 11]);
  
  // Scoring states
  const [scores, setScores] = useState({});
  const [currentGame, setCurrentGame] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  
  // Serve states
  const [servingPlayer, setServingPlayer] = useState('player1'); // 'player1' or 'player2'
  const [serveSequence, setServeSequence] = useState(0); // 0 = first serve, 1 = second serve (for doubles)
  const [teamServeCount, setTeamServeCount] = useState(0); // 0 = first serve of team, 1 = second serve of team

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
        if (matchDoc.exists()) {
          const matchData = { id: matchDoc.id, ...matchDoc.data() };
          setMatch(matchData);
          
          // Initialize scores if match has existing scoring data
          if (matchData.scores) {
            setScores(matchData.scores);
            setSetupStep('scoring');
            setGamesCount(matchData.gamesCount || 3);
            setPointsPerGame(matchData.pointsPerGame || [11, 11, 11]);
            setServingPlayer(matchData.servingPlayer || 'player1');
            setServeSequence(matchData.serveSequence || 0);
            setTeamServeCount(matchData.teamServeCount || 0);
          } else {
            // Initialize empty scores structure
            initializeScores(gamesCount, pointsPerGame);
          }
        } else {
          setError('Match not found');
        }
      } catch (error) {
        console.error('Error fetching match:', error);
        setError('Failed to load match details');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  const initializeScores = (games, points) => {
    const initialScores = {
      player1: {},
      player2: {}
    };
    
    for (let i = 0; i < games; i++) {
      initialScores.player1[`game${i + 1}`] = 0;
      initialScores.player2[`game${i + 1}`] = 0;
    }
    
    setScores(initialScores);
  };

  const handleGamesCountChange = (increment) => {
    const newCount = Math.max(1, Math.min(5, gamesCount + increment));
    setGamesCount(newCount);
    
    // Adjust points array
    const newPoints = [...pointsPerGame];
    if (newCount > pointsPerGame.length) {
      // Add new games with default 11 points
      for (let i = pointsPerGame.length; i < newCount; i++) {
        newPoints.push(11);
      }
    } else if (newCount < pointsPerGame.length) {
      // Remove excess games
      newPoints.splice(newCount);
    }
    setPointsPerGame(newPoints);
  };

  const handlePointsChange = (gameIndex, points) => {
    const newPoints = [...pointsPerGame];
    newPoints[gameIndex] = Math.max(1, Math.min(21, points));
    setPointsPerGame(newPoints);
  };

  const handleSetupComplete = async () => {
    initializeScores(gamesCount, pointsPerGame);
    setSetupStep('scoring');
    
    // Set match status to 'live' when scoring starts
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'live',
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        teamServeCount,
        startedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error setting match to live:', error);
    }
  };

  const updateScore = async (player, gameIndex, increment) => {
    const gameKey = `game${gameIndex + 1}`;
    const currentScore = scores[player][gameKey];
    const newScore = Math.max(0, currentScore + increment);
    
    const newScores = {
      ...scores,
      [player]: {
        ...scores[player],
        [gameKey]: newScore
      }
    };
    
    setScores(newScores);
    
    // Save to Firebase with live status
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        scores: newScores,
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        teamServeCount,
        status: 'live',
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating scores:', error);
      setError('Failed to save scores');
    }
  };

  const getPlayerName = (playerKey) => {
    if (!match) return 'Player';
    
    if (playerKey === 'player1') {
      return match.player1Team1 || match.team1Name || 'Player 1';
    } else {
      return match.player1Team2 || match.team2Name || 'Player 2';
    }
  };

  const getPartnerName = (playerKey) => {
    if (!match) return null;
    
    if (playerKey === 'player1') {
      return match.player2Team1 || null;
    } else {
      return match.player2Team2 || null;
    }
  };

  const isDoublesMatch = () => {
    return match && (match.player2Team1 || match.player2Team2);
  };

  const getPlayerImage = (playerKey) => {
    // Return placeholder for now - can be enhanced to fetch actual player images
    return null;
  };

  const handleServeChange = async () => {
    let newServingPlayer = servingPlayer;
    let newTeamServeCount = teamServeCount;
    let newServeSequence = serveSequence;

    if (isDoublesMatch()) {
      // Doubles serving logic: each team serves twice
      if (teamServeCount === 0) {
        // First serve of the team, move to second serve
        newTeamServeCount = 1;
        setTeamServeCount(1);
      } else {
        // Second serve of the team, switch to other team's first serve
        newServingPlayer = servingPlayer === 'player1' ? 'player2' : 'player1';
        newTeamServeCount = 0;
        newServeSequence = 0;
        setServingPlayer(newServingPlayer);
        setTeamServeCount(0);
        setServeSequence(0);
      }
    } else {
      // Singles serving logic: just toggle between players
      newServingPlayer = servingPlayer === 'player1' ? 'player2' : 'player1';
      newServeSequence = 0;
      setServingPlayer(newServingPlayer);
      setServeSequence(0);
    }

    // Save serve state to Firebase for real-time sync
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        servingPlayer: newServingPlayer,
        serveSequence: newServeSequence,
        teamServeCount: newTeamServeCount,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating serve state:', error);
      setError('Failed to update serve state');
    }
  };

  const getServeIndicator = (playerKey) => {
    if (servingPlayer !== playerKey) return null;
    
    if (isDoublesMatch()) {
      // Show 1 or 2 pickleball icons based on team serve count
      const iconCount = teamServeCount + 1;
      return (
        <div className="flex items-center ml-2">
          {Array.from({ length: iconCount }, (_, index) => (
            <svg
              key={index}
              className="w-4 h-4 text-orange-500 mr-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1s1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
              <rect x="10.5" y="16" width="3" height="6" rx="1.5"/>
            </svg>
          ))}
          <span className="text-sm text-green-700 font-normal">
            (Serve {iconCount}/2)
          </span>
        </div>
      );
    } else {
      // Singles: just show serving indicator
      return (
        <span className="ml-2 text-sm text-green-700 font-normal">(Serving)</span>
      );
    }
  };

  const handleEndMatch = async () => {
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'completed',
        scores,
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        completedAt: serverTimestamp(),
        endedAt: serverTimestamp()
      });
      setMatchEnded(true);
    } catch (error) {
      console.error('Error ending match:', error);
      setError('Failed to end match');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error || 'Match not found'}</span>
        </div>
      </div>
    );
  }

  if (matchEnded) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-4">Match Completed!</h2>
            <p className="text-lg mb-4">Scores have been saved successfully.</p>
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Match data synchronized</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Games Count Setup
  if (setupStep === 'games') {
    return (
      <div className="min-h-screen bg-base-200 p-4">
        <div className="max-w-md mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <h2 className="card-title justify-center text-2xl mb-6">Match Setup</h2>
              <p className="text-lg mb-6">How many games will this match consist of?</p>
              
              <div className="flex items-center justify-center gap-6 mb-8">
                <button 
                  className="btn btn-circle btn-lg btn-outline"
                  onClick={() => handleGamesCountChange(-1)}
                  disabled={gamesCount <= 1}
                >
                  <span className="text-2xl">-</span>
                </button>
                
                <div className="text-6xl font-bold text-primary">
                  {gamesCount}
                </div>
                
                <button 
                  className="btn btn-circle btn-lg btn-outline"
                  onClick={() => handleGamesCountChange(1)}
                  disabled={gamesCount >= 5}
                >
                  <span className="text-2xl">+</span>
                </button>
              </div>
              
              <button 
                className="btn btn-primary btn-lg w-full"
                onClick={() => setSetupStep('points')}
              >
                Next: Set Points per Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Points per Game Setup
  if (setupStep === 'points') {
    return (
      <div className="min-h-screen bg-base-200 p-4">
        <div className="max-w-md mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title justify-center text-2xl mb-6">Points per Game</h2>
              <p className="text-center text-lg mb-6">Set the points needed to win each game:</p>
              
              <div className="space-y-4 mb-8">
                {pointsPerGame.map((points, index) => (
                  <div key={index} className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Game {index + 1}</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="21"
                      value={points}
                      onChange={(e) => handlePointsChange(index, parseInt(e.target.value) || 1)}
                      className="input input-bordered input-lg text-center text-xl"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button 
                  className="btn btn-outline flex-1"
                  onClick={() => setSetupStep('games')}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleSetupComplete}
                >
                  Start Scoring
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Scoring Interface
  return (
    <div className="min-h-screen bg-base-200">
      {/* Header with game tabs */}
      <div className="bg-base-100 shadow-sm">
        <div className="flex justify-center">
          {Array.from({ length: gamesCount }, (_, index) => (
            <button
              key={index}
              className={`px-6 py-4 text-lg font-bold border-b-2 ${
                currentGame === index 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-base-content/60'
              }`}
              onClick={() => setCurrentGame(index)}
            >
              Game {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Scores Display */}
      <div className="bg-base-100 py-4">
        <div className="flex justify-center">
          {Array.from({ length: gamesCount }, (_, index) => (
            <div key={index} className="px-4 text-center">
              <div className="text-sm text-base-content/60 mb-1">Game {index + 1}</div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {scores.player1?.[`game${index + 1}`] || 0}
                </div>
                <div className="text-2xl font-bold">
                  {scores.player2?.[`game${index + 1}`] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Serve Change Button - Positioned between player sections */}
      <div className="relative flex justify-center items-center py-4 bg-base-200">
        <button
          className="w-20 h-20 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 z-10"
          onClick={handleServeChange}
          title="Change Serve"
        >
          {/* Paddle Icon */}
          <svg
            className="w-10 h-10 text-black"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1s1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
            <rect x="10.5" y="16" width="3" height="6" rx="1.5"/>
          </svg>
        </button>
      </div>

      {/* Player 1 Scoring */}
      <div className={`p-6 ${servingPlayer === 'player1' ? 'bg-green-200' : 'bg-purple-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
              servingPlayer === 'player1' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {getPlayerImage('player1') ? (
                <img
                  src={getPlayerImage('player1')}
                  alt="Player 1"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">P1</span>
              )}
              {servingPlayer === 'player1' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-black">
              <div className="flex items-center">
                {getPlayerName('player1')}
                {getServeIndicator('player1')}
              </div>
              {isDoublesMatch() && getPartnerName('player1') && (
                <div className="text-lg font-medium text-gray-700 mt-1">
                  {getPartnerName('player1')}
                </div>
              )}
            </div>
          </div>
          
          {servingPlayer === 'player1' && (
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-square btn-lg bg-black text-white hover:bg-gray-800"
                onClick={() => updateScore('player1', currentGame, 1)}
              >
                <span className="text-2xl">+</span>
              </button>
              <button
                className="btn btn-square btn-lg bg-black text-white hover:bg-gray-800"
                onClick={() => updateScore('player1', currentGame, -1)}
              >
                <span className="text-2xl">-</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Player 2 Scoring */}
      <div className={`p-6 ${servingPlayer === 'player2' ? 'bg-green-200' : 'bg-gray-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
              servingPlayer === 'player2' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {getPlayerImage('player2') ? (
                <img
                  src={getPlayerImage('player2')}
                  alt="Player 2"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">P2</span>
              )}
              {servingPlayer === 'player2' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-black">
              <div className="flex items-center">
                {getPlayerName('player2')}
                {getServeIndicator('player2')}
              </div>
              {isDoublesMatch() && getPartnerName('player2') && (
                <div className="text-lg font-medium text-gray-700 mt-1">
                  {getPartnerName('player2')}
                </div>
              )}
            </div>
          </div>
          
          {servingPlayer === 'player2' && (
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-square btn-lg bg-black text-white hover:bg-gray-800"
                onClick={() => updateScore('player2', currentGame, 1)}
              >
                <span className="text-2xl">+</span>
              </button>
              <button
                className="btn btn-square btn-lg bg-black text-white hover:bg-gray-800"
                onClick={() => updateScore('player2', currentGame, -1)}
              >
                <span className="text-2xl">-</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swipe to End Match */}
      <SwipeToEndMatch onEndMatch={handleEndMatch} />

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="alert alert-error">
            <span>{error}</span>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}