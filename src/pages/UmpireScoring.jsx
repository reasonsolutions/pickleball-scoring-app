import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

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

  const handleSetupComplete = () => {
    initializeScores(gamesCount, pointsPerGame);
    setSetupStep('scoring');
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
    
    // Save to Firebase
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        scores: newScores,
        gamesCount,
        pointsPerGame,
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

  const getPlayerImage = (playerKey) => {
    // Return placeholder for now - can be enhanced to fetch actual player images
    return null;
  };

  const handleEndMatch = async () => {
    try {
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'completed',
        scores,
        gamesCount,
        pointsPerGame,
        completedAt: serverTimestamp()
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

      {/* Player 1 Scoring */}
      <div className="bg-purple-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
              {getPlayerImage('player1') ? (
                <img 
                  src={getPlayerImage('player1')} 
                  alt="Player 1" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">P1</span>
              )}
            </div>
            <div className="text-xl font-bold text-black">
              {getPlayerName('player1')}
            </div>
          </div>
          
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
        </div>
      </div>

      {/* Player 2 Scoring */}
      <div className="bg-gray-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
              {getPlayerImage('player2') ? (
                <img 
                  src={getPlayerImage('player2')} 
                  alt="Player 2" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">P2</span>
              )}
            </div>
            <div className="text-xl font-bold text-black">
              {getPlayerName('player2')}
            </div>
          </div>
          
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
        </div>
      </div>

      {/* End Match Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-400 p-4">
        <button
          className="w-full py-4 text-2xl font-bold text-black bg-transparent border-none"
          onClick={handleEndMatch}
        >
          SWIPE TO END MATCH
        </button>
      </div>

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