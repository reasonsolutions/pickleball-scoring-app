import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import SwipeToEndMatch from '../components/SwipeToEndMatch';
import YouTubeUrlManager from '../components/YouTubeUrlManager';
import paddleIcon from '../assets/paddle.png';

export default function UmpireScoring() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allFixtureMatches, setAllFixtureMatches] = useState([]);
  
  // Match setup states
  const [setupStep, setSetupStep] = useState('games'); // 'games', 'points', 'scoring'
  const [gamesCount, setGamesCount] = useState(1);
  const [pointsPerGame, setPointsPerGame] = useState([11]);
  
  // Scoring states
  const [scores, setScores] = useState({});
  const [currentGame, setCurrentGame] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  
  // Serve states
  const [servingPlayer, setServingPlayer] = useState('player1'); // 'player1' or 'player2'
  const [serveSequence, setServeSequence] = useState(0); // 0 = first serve, 1 = second serve (for doubles)
  const [teamServeCount, setTeamServeCount] = useState(0); // 0 = first serve of team, 1 = second serve of team

  // Substitution states
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionStep, setSubstitutionStep] = useState('team'); // 'team', 'player', 'substitute'
  const [selectedTeam, setSelectedTeam] = useState(null); // 'team1' or 'team2'
  const [selectedPlayer, setSelectedPlayer] = useState(null); // player to be substituted
  const [substitutePlayer, setSubstitutePlayer] = useState(''); // new player name

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch match data
        const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
        if (matchDoc.exists()) {
          const matchData = { id: matchDoc.id, ...matchDoc.data() };
          setMatch(matchData);
          
          // Check if match has been set up (has scores, status is live/completed, or has game configuration)
          const isMatchSetup = matchData.scores ||
                              matchData.status === 'live' ||
                              matchData.status === 'completed' ||
                              (matchData.gamesCount && matchData.pointsPerGame);
          
          if (isMatchSetup) {
            // Match is already set up, go directly to scoring interface
            setSetupStep('scoring');
            setGamesCount(matchData.gamesCount || 1);
            setPointsPerGame(matchData.pointsPerGame || [11]);
            setServingPlayer(matchData.servingPlayer || 'player1');
            setServeSequence(matchData.serveSequence || 0);
            setTeamServeCount(matchData.teamServeCount || 0);
            
            if (matchData.scores) {
              setScores(matchData.scores);
            } else {
              // Initialize empty scores structure with the saved configuration
              initializeScores(matchData.gamesCount || 1, matchData.pointsPerGame || [11]);
            }
          } else {
            // Match not set up yet, start with setup flow
            initializeScores(gamesCount, pointsPerGame);
          }

          // Fetch teams, players, and all fixture matches for substitution
          const [teamsSnapshot, playersSnapshot, fixturesSnapshot] = await Promise.all([
            getDocs(collection(db, 'teams')),
            getDocs(collection(db, 'players')),
            getDocs(collection(db, 'fixtures'))
          ]);

          const teamsData = teamsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const playersData = playersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filter matches from the same fixture (tournament)
          const fixtureMatches = fixturesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(fixtureMatch =>
              fixtureMatch.tournamentId === matchData.tournamentId &&
              fixtureMatch.id !== matchData.id
            );

          setTeams(teamsData);
          setPlayers(playersData);
          setAllFixtureMatches(fixtureMatches);
        } else {
          setError('Match not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load match details');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchData();
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

  const calculateMatchWinner = () => {
    if (!scores || !scores.player1 || !scores.player2) return null;
    
    let player1GamesWon = 0;
    let player2GamesWon = 0;
    
    // Count games won by each player
    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      const player1Score = scores.player1[gameKey] || 0;
      const player2Score = scores.player2[gameKey] || 0;
      
      if (player1Score > player2Score) {
        player1GamesWon++;
      } else if (player2Score > player1Score) {
        player2GamesWon++;
      }
    }
    
    // Determine winner based on games won
    if (player1GamesWon > player2GamesWon) {
      return {
        winner: 'player1',
        winnerName: getPlayerName('player1'),
        winnerTeam: match.team1Name || 'Team 1',
        finalScore: `${player1GamesWon}-${player2GamesWon}`,
        gamesWon: {
          player1: player1GamesWon,
          player2: player2GamesWon
        }
      };
    } else if (player2GamesWon > player1GamesWon) {
      return {
        winner: 'player2',
        winnerName: getPlayerName('player2'),
        winnerTeam: match.team2Name || 'Team 2',
        finalScore: `${player2GamesWon}-${player1GamesWon}`,
        gamesWon: {
          player1: player1GamesWon,
          player2: player2GamesWon
        }
      };
    }
    
    // In case of tie (shouldn't happen in normal play)
    return {
      winner: 'tie',
      winnerName: 'Tie',
      winnerTeam: 'Tie',
      finalScore: `${player1GamesWon}-${player2GamesWon}`,
      gamesWon: {
        player1: player1GamesWon,
        player2: player2GamesWon
      }
    };
  };

  const handleEndMatch = async () => {
    try {
      const matchResult = calculateMatchWinner();
      
      await updateDoc(doc(db, 'fixtures', matchId), {
        status: 'completed',
        scores,
        gamesCount,
        pointsPerGame,
        servingPlayer,
        serveSequence,
        completedAt: serverTimestamp(),
        endedAt: serverTimestamp(),
        // Add winner information
        winner: matchResult?.winner || null,
        winnerName: matchResult?.winnerName || null,
        winnerTeam: matchResult?.winnerTeam || null,
        finalScore: matchResult?.finalScore || null,
        gamesWon: matchResult?.gamesWon || null
      });
      setMatchEnded(true);
    } catch (error) {
      console.error('Error ending match:', error);
      setError('Failed to end match');
    }
  };

  // Substitution functions
  const handleSubstitutionClick = () => {
    setShowSubstitutionModal(true);
    setSubstitutionStep('team');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSubstitutePlayer('');
  };

  // Check if a team can make substitutions (hasn't made any in other matches)
  const canTeamMakeSubstitution = (team) => {
    if (!match) return false;
    
    const teamId = team === 'team1' ? match.team1 : match.team2;
    return !hasTeamMadeSubstitutionsInFixture(teamId);
  };

  const handleTeamSelection = (team) => {
    setSelectedTeam(team);
    setSubstitutionStep('player');
  };

  const handlePlayerSelection = (player) => {
    setSelectedPlayer(player);
    setSubstitutionStep('substitute');
  };

  const handleSubstitution = async () => {
    if (!selectedTeam || !selectedPlayer || !substitutePlayer) {
      setError('Please complete all substitution fields');
      return;
    }

    console.log('Starting substitution:', {
      selectedTeam,
      selectedPlayer,
      substitutePlayer,
      matchId,
      currentGame
    });

    try {
      const updates = {};
      
      // Update the player name in the match data
      if (selectedTeam === 'team1') {
        if (selectedPlayer === match.player1Team1) {
          updates.player1Team1 = substitutePlayer;
          console.log('Updating player1Team1:', selectedPlayer, '->', substitutePlayer);
        } else if (selectedPlayer === match.player2Team1) {
          updates.player2Team1 = substitutePlayer;
          console.log('Updating player2Team1:', selectedPlayer, '->', substitutePlayer);
        }
      } else if (selectedTeam === 'team2') {
        if (selectedPlayer === match.player1Team2) {
          updates.player1Team2 = substitutePlayer;
          console.log('Updating player1Team2:', selectedPlayer, '->', substitutePlayer);
        } else if (selectedPlayer === match.player2Team2) {
          updates.player2Team2 = substitutePlayer;
          console.log('Updating player2Team2:', selectedPlayer, '->', substitutePlayer);
        }
      }

      // Check if we found a matching player to substitute
      if (Object.keys(updates).length === 0) {
        console.error('No matching player found for substitution');
        setError('Player not found in the match');
        return;
      }

      // Add substitution record
      const substitutionRecord = {
        timestamp: new Date().toISOString(), // Use ISO string instead of serverTimestamp for now
        team: selectedTeam,
        playerOut: selectedPlayer,
        playerIn: substitutePlayer,
        game: currentGame + 1
      };

      // Handle substitutions array properly
      const currentSubstitutions = match.substitutions || [];
      updates.substitutions = [...currentSubstitutions, substitutionRecord];

      console.log('Updates to apply:', updates);

      await updateDoc(doc(db, 'fixtures', matchId), updates);
      
      console.log('Substitution successful');
      
      // Update local match state
      setMatch(prev => ({
        ...prev,
        ...updates
      }));

      // Close modal
      setShowSubstitutionModal(false);
      setSubstitutionStep('team');
      setSelectedTeam(null);
      setSelectedPlayer(null);
      setSubstitutePlayer('');
      
    } catch (error) {
      console.error('Error making substitution:', error);
      console.error('Error details:', error.message);
      setError(`Failed to make substitution: ${error.message}`);
    }
  };

  const closeSubstitutionModal = () => {
    setShowSubstitutionModal(false);
    setSubstitutionStep('team');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSubstitutePlayer('');
  };

  // Get all players from a team (for substitution)
  const getTeamPlayers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name, age: player.age, gender: player.gender } : null;
    }).filter(Boolean);
  };

  // Get currently playing players from a team
  const getCurrentlyPlayingPlayers = (team) => {
    if (!match) return [];
    
    const players = [];
    if (team === 'team1') {
      if (match.player1Team1) players.push(match.player1Team1);
      if (match.player2Team1) players.push(match.player2Team1);
    } else if (team === 'team2') {
      if (match.player1Team2) players.push(match.player1Team2);
      if (match.player2Team2) players.push(match.player2Team2);
    }
    return players;
  };

  // Get player gender
  const getPlayerGender = (playerName) => {
    const player = players.find(p => p.name === playerName);
    return player?.gender || null;
  };

  // Check if player is playing in other matches in the same fixture
  const isPlayerInOtherMatches = (playerName) => {
    let matchCount = 0;
    
    allFixtureMatches.forEach(fixtureMatch => {
      const playersInMatch = [
        fixtureMatch.player1Team1,
        fixtureMatch.player2Team1,
        fixtureMatch.player1Team2,
        fixtureMatch.player2Team2
      ].filter(Boolean);
      
      if (playersInMatch.includes(playerName)) {
        matchCount++;
      }
    });
    
    return matchCount >= 2; // Player is in 2 or more other matches
  };

  // Check if player is in another match of the same type
  const isPlayerInSameMatchType = (playerName, matchType) => {
    return allFixtureMatches.some(fixtureMatch => {
      if (fixtureMatch.matchType !== matchType) return false;
      
      const playersInMatch = [
        fixtureMatch.player1Team1,
        fixtureMatch.player2Team1,
        fixtureMatch.player1Team2,
        fixtureMatch.player2Team2
      ].filter(Boolean);
      
      return playersInMatch.includes(playerName);
    });
  };

  // Check if a team has already made substitutions in other matches in the fixture
  const hasTeamMadeSubstitutionsInFixture = (teamId) => {
    return allFixtureMatches.some(fixtureMatch => {
      // Check if this match involves the team and has substitutions
      const isTeamInMatch = fixtureMatch.team1 === teamId || fixtureMatch.team2 === teamId;
      const hasSubstitutions = fixtureMatch.substitutions && fixtureMatch.substitutions.length > 0;
      
      if (isTeamInMatch && hasSubstitutions) {
        // Check if any substitution was made by this team
        return fixtureMatch.substitutions.some(sub => {
          const subTeamId = sub.team === 'team1' ? fixtureMatch.team1 : fixtureMatch.team2;
          return subTeamId === teamId;
        });
      }
      
      return false;
    });
  };

  // Get available players for substitution with advanced filtering
  const getAvailablePlayersForSubstitution = (team) => {
    if (!match) return [];
    
    const teamId = team === 'team1' ? match.team1 : match.team2;
    const allTeamPlayers = getTeamPlayers(teamId);
    const currentlyPlaying = getCurrentlyPlayingPlayers(team);
    
    return allTeamPlayers.filter(player => {
      // Don't show currently playing players
      if (currentlyPlaying.includes(player.name)) return false;
      
      // Don't show the same player being substituted
      if (selectedPlayer && player.name === selectedPlayer) return false;
      
      // Rule 1: Player who is in 2 other matches cannot be shown
      if (isPlayerInOtherMatches(player.name)) return false;
      
      // Rule 4: In men's doubles, if a player is playing in another men's doubles match, don't show
      if (match.matchType === 'mensDoubles' && isPlayerInSameMatchType(player.name, 'mensDoubles')) {
        return false;
      }
      
      // Rule 2 & 3: Gender-based filtering
      const playerGender = getPlayerGender(player.name);
      
      if (match.matchType === 'mensDoubles' || match.matchType === 'mensSingles') {
        // Only show men
        return playerGender === 'Male';
      } else if (match.matchType === 'womensDoubles' || match.matchType === 'womensSingles') {
        // Only show women
        return playerGender === 'Female';
      } else if (match.matchType === 'mixedDoubles') {
        // For mixed doubles, match the gender of the player being substituted
        if (!selectedPlayer) return true; // If no player selected yet, show all
        
        const selectedPlayerGender = getPlayerGender(selectedPlayer);
        return playerGender === selectedPlayerGender;
      }
      
      return true;
    });
  };

  // Check if a player was substituted in
  const isPlayerSubstitutedIn = (playerName) => {
    if (!match || !match.substitutions) return false;
    
    return match.substitutions.some(sub => sub.playerIn === playerName);
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
      {/* Header with game tabs and substitution button */}
      <div className="bg-base-100 shadow-sm">
        <div className="flex justify-between items-center px-4">
          <div className="flex-1"></div>
          <div className="flex justify-center flex-1">
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
          <div className="flex-1 flex justify-end">
            <button
              className={`btn btn-sm ${
                canTeamMakeSubstitution('team1') || canTeamMakeSubstitution('team2')
                  ? 'btn-outline hover:btn-primary'
                  : 'btn-disabled opacity-50 cursor-not-allowed'
              }`}
              onClick={handleSubstitutionClick}
              disabled={!canTeamMakeSubstitution('team1') && !canTeamMakeSubstitution('team2')}
              title={
                canTeamMakeSubstitution('team1') || canTeamMakeSubstitution('team2')
                  ? "Player Substitution"
                  : "Both teams have used their substitution allowance"
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Sub
            </button>
          </div>
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
          <img
            src={paddleIcon}
            alt="Paddle"
            className="w-10 h-10 object-contain"
          />
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
            <div className="text-xl font-bold text-gray-800">
              <div className="flex items-center gap-2">
                <span>{getPlayerName('player1')}</span>
                {isPlayerSubstitutedIn(getPlayerName('player1')) && (
                  <div className="tooltip" data-tip="Substituted In">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                      SUB IN
                    </span>
                  </div>
                )}
                {getServeIndicator('player1')}
              </div>
              {isDoublesMatch() && getPartnerName('player1') && (
                <div className="text-lg font-medium text-gray-700 mt-1 flex items-center gap-2">
                  <span>{getPartnerName('player1')}</span>
                  {isPlayerSubstitutedIn(getPartnerName('player1')) && (
                    <div className="tooltip" data-tip="Substituted In">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        SUB IN
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {servingPlayer === 'player1' && (
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-square btn-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => updateScore('player1', currentGame, 1)}
              >
                <span className="text-2xl">+</span>
              </button>
              <button
                className="btn btn-square btn-lg bg-gray-600 text-white hover:bg-gray-700"
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
            <div className="text-xl font-bold text-gray-800">
              <div className="flex items-center gap-2">
                <span>{getPlayerName('player2')}</span>
                {isPlayerSubstitutedIn(getPlayerName('player2')) && (
                  <div className="tooltip" data-tip="Substituted In">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                      SUB IN
                    </span>
                  </div>
                )}
                {getServeIndicator('player2')}
              </div>
              {isDoublesMatch() && getPartnerName('player2') && (
                <div className="text-lg font-medium text-gray-700 mt-1 flex items-center gap-2">
                  <span>{getPartnerName('player2')}</span>
                  {isPlayerSubstitutedIn(getPartnerName('player2')) && (
                    <div className="tooltip" data-tip="Substituted In">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        SUB IN
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {servingPlayer === 'player2' && (
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-square btn-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => updateScore('player2', currentGame, 1)}
              >
                <span className="text-2xl">+</span>
              </button>
              <button
                className="btn btn-square btn-lg bg-gray-600 text-white hover:bg-gray-700"
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

      {/* Substitution Modal */}
      {showSubstitutionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Player Substitution</h3>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={closeSubstitutionModal}
                >
                  ×
                </button>
              </div>

              {/* Team Selection Step */}
              {substitutionStep === 'team' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Select Team</h4>
                  <div className="space-y-3">
                    <button
                      className={`btn w-full justify-start ${
                        canTeamMakeSubstitution('team1')
                          ? 'btn-outline hover:btn-primary'
                          : 'btn-disabled opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canTeamMakeSubstitution('team1') && handleTeamSelection('team1')}
                      disabled={!canTeamMakeSubstitution('team1')}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{match.team1Name || 'Team 1'}</div>
                        <div className="text-sm opacity-70">
                          {match.player1Team1}{match.player2Team1 && ` & ${match.player2Team1}`}
                        </div>
                        {!canTeamMakeSubstitution('team1') && (
                          <div className="text-xs text-error mt-1">
                            Already used substitution in this fixture
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      className={`btn w-full justify-start ${
                        canTeamMakeSubstitution('team2')
                          ? 'btn-outline hover:btn-primary'
                          : 'btn-disabled opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canTeamMakeSubstitution('team2') && handleTeamSelection('team2')}
                      disabled={!canTeamMakeSubstitution('team2')}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{match.team2Name || 'Team 2'}</div>
                        <div className="text-sm opacity-70">
                          {match.player1Team2}{match.player2Team2 && ` & ${match.player2Team2}`}
                        </div>
                        {!canTeamMakeSubstitution('team2') && (
                          <div className="text-xs text-error mt-1">
                            Already used substitution in this fixture
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                  
                  {/* Show message if no teams can make substitutions */}
                  {!canTeamMakeSubstitution('team1') && !canTeamMakeSubstitution('team2') && (
                    <div className="alert alert-warning mt-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>Both teams have already used their substitution allowance in this fixture.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Player Selection Step */}
              {substitutionStep === 'player' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">
                    Select Player to Substitute ({selectedTeam === 'team1' ? match.team1Name || 'Team 1' : match.team2Name || 'Team 2'})
                  </h4>
                  <div className="space-y-3">
                    {getCurrentlyPlayingPlayers(selectedTeam).map((player, index) => (
                      <button
                        key={index}
                        className="btn btn-outline w-full justify-start"
                        onClick={() => handlePlayerSelection(player)}
                      >
                        {player}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-ghost mt-4"
                    onClick={() => setSubstitutionStep('team')}
                  >
                    ← Back to Team Selection
                  </button>
                </div>
              )}

              {/* Substitute Player Selection Step */}
              {substitutionStep === 'substitute' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Select Substitute Player</h4>
                  
                  {/* Substitution Preview */}
                  <div className="mb-6 p-4 bg-base-200 rounded-lg">
                    <div className="text-sm opacity-70 mb-3">Substitution Preview:</div>
                    
                    {/* Player going out */}
                    <div className="flex items-center justify-between mb-2 p-2 bg-red-100 text-red-800 rounded">
                      <div className="flex items-center">
                        <div className="font-semibold">{selectedPlayer}</div>
                        <div className="text-sm ml-2 opacity-70">(Going Out)</div>
                      </div>
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    
                    {/* Player coming in */}
                    {substitutePlayer && (
                      <div className="flex items-center justify-between p-2 bg-green-100 text-green-800 rounded">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        <div className="flex items-center">
                          <div className="text-sm mr-2 opacity-70">(Coming In)</div>
                          <div className="font-semibold">{substitutePlayer}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs opacity-60 mt-2">
                      Team: {selectedTeam === 'team1' ? match.team1Name || 'Team 1' : match.team2Name || 'Team 2'}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="text-sm font-medium mb-2">Available Players:</div>
                    {getAvailablePlayersForSubstitution(selectedTeam).map((player, index) => (
                      <button
                        key={index}
                        className={`btn w-full justify-start ${
                          substitutePlayer === player.name
                            ? 'btn-success text-white'
                            : 'btn-outline'
                        }`}
                        onClick={() => setSubstitutePlayer(player.name)}
                      >
                        <div className="text-left">
                          <div className="font-semibold">{player.name}</div>
                          {player.age && (
                            <div className="text-sm opacity-70">Age: {player.age}</div>
                          )}
                        </div>
                        {substitutePlayer === player.name && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {getAvailablePlayersForSubstitution(selectedTeam).length === 0 && (
                      <div className="text-center py-4 text-base-content/60">
                        No available players for substitution
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      className="btn btn-ghost flex-1"
                      onClick={() => setSubstitutionStep('player')}
                    >
                      ← Back
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      onClick={handleSubstitution}
                      disabled={!substitutePlayer}
                    >
                      Confirm Substitution
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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