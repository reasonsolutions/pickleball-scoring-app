import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function StreamingOverlayController() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePlayerCard, setActivePlayerCard] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch match details
        const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
        if (matchDoc.exists()) {
          const matchData = { id: matchDoc.id, ...matchDoc.data() };
          setMatch(matchData);

          // Fetch tournament details
          if (matchData.tournamentId) {
            const tournamentDoc = await getDoc(doc(db, 'tournaments', matchData.tournamentId));
            if (tournamentDoc.exists()) {
              setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
            }
          }

          // Fetch player details for this match
          const playerNames = [];
          if (matchData.player1Team1) playerNames.push(matchData.player1Team1);
          if (matchData.player2Team1) playerNames.push(matchData.player2Team1);
          if (matchData.player1Team2) playerNames.push(matchData.player1Team2);
          if (matchData.player2Team2) playerNames.push(matchData.player2Team2);

          // Remove duplicates from playerNames
          const uniquePlayerNames = [...new Set(playerNames)];

          if (uniquePlayerNames.length > 0) {
            // Query players by name and tournament
            const playersQuery = query(
              collection(db, 'players'),
              where('name', 'in', uniquePlayerNames),
              where('tournamentId', '==', matchData.tournamentId)
            );
            
            const playersSnapshot = await getDocs(playersQuery);
            const allPlayersData = playersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Filter to only include players that are actually in this match
            // and remove duplicates by name (keep the first occurrence)
            const uniquePlayersMap = new Map();
            allPlayersData.forEach(player => {
              if (uniquePlayerNames.includes(player.name) && !uniquePlayersMap.has(player.name)) {
                uniquePlayersMap.set(player.name, player);
              }
            });
            
            setPlayers(Array.from(uniquePlayersMap.values()));
          }
        } else {
          setError('Match not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchData();
    }
  }, [matchId]);

  const handleShowPlayerCard = async (player) => {
    setSaving(true);
    try {
      // Extract photo URL properly
      const getPhotoUrl = (photoData) => {
        if (!photoData) return null;
        if (typeof photoData === 'string') return photoData;
        if (photoData.url) return photoData.url;
        if (photoData.secure_url) return photoData.secure_url;
        return null;
      };

      // Save the active player card to Firestore for real-time sync with overlay
      // Handle undefined values by providing defaults
      const overlayControlId = `overlay_${matchId}`;
      await setDoc(doc(db, 'overlay_controls', overlayControlId), {
        matchId,
        activePlayerCard: {
          id: player.id,
          name: player.name || 'Unknown Player',
          photo: getPhotoUrl(player.photo),
          doublesRating: player.doublesRating || 0,
          doublesWins: player.doublesWins || 0,
          doublesLosses: player.doublesLosses || 0,
          singlesRating: player.singlesRating || 0,
          singlesWins: player.singlesWins || 0,
          singlesLosses: player.singlesLosses || 0,
          matchType: match.matchTypeLabel || match.matchType || 'Match'
        },
        updatedAt: serverTimestamp()
      });
      
      setActivePlayerCard(player);
      console.log('Player card activated:', player.name);
    } catch (error) {
      console.error('Error showing player card:', error);
      alert('Error showing player card: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleHidePlayerCard = async () => {
    setSaving(true);
    try {
      // Clear the active player card
      const overlayControlId = `overlay_${matchId}`;
      await setDoc(doc(db, 'overlay_controls', overlayControlId), {
        matchId,
        activePlayerCard: null,
        updatedAt: serverTimestamp()
      });
      
      setActivePlayerCard(null);
      console.log('Player card hidden');
    } catch (error) {
      console.error('Error hiding player card:', error);
      alert('Error hiding player card: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getPlayerTeam = (playerName) => {
    if (match.player1Team1 === playerName || match.player2Team1 === playerName) {
      return { team: 'Team 1', teamName: match.team1Name };
    }
    if (match.player1Team2 === playerName || match.player2Team2 === playerName) {
      return { team: 'Team 2', teamName: match.team2Name };
    }
    return { team: 'Unknown', teamName: 'Unknown' };
  };

  const getPhotoUrl = (photoData) => {
    if (!photoData) return null;
    if (typeof photoData === 'string') return photoData;
    if (photoData.url) return photoData.url;
    if (photoData.secure_url) return photoData.secure_url;
    return null;
  };

  const isDoublesMatch = () => {
    const matchType = match?.matchTypeLabel || match?.matchType || '';
    return matchType.toLowerCase().includes('doubles');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error || 'Match not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Streaming Overlay Controller</h1>
          <h2 className="text-2xl font-semibold mb-2">{tournament?.name}</h2>
          <div className="flex items-center gap-4 text-lg">
            <span className="text-warning font-bold">{match.team1Name}</span>
            <span className="text-base-content/60">VS</span>
            <span className="text-secondary font-bold">{match.team2Name}</span>
            <span className="text-base-content/60">•</span>
            <span className="badge badge-warning">{match.matchTypeLabel || match.matchType}</span>
          </div>
        </div>

        {/* Current Status */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h3 className="card-title">Current Player Card Status</h3>
            {activePlayerCard ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-12 h-12 rounded-full">
                      <img src={activePlayerCard.photo || '/default-avatar.png'} alt={activePlayerCard.name} />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">{activePlayerCard.name}</div>
                    <div className="text-sm text-base-content/70">Currently showing on overlay</div>
                  </div>
                </div>
                <button
                  className={`btn btn-error ${saving ? 'loading' : ''}`}
                  onClick={handleHidePlayerCard}
                  disabled={saving}
                >
                  Hide Player Card
                </button>
              </div>
            ) : (
              <div className="text-base-content/70">No player card currently showing</div>
            )}
          </div>
        </div>

        {/* Players Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold">Match Players</h3>
          
          {players.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold mb-2">No Player Data Found</h3>
              <p className="text-base-content/70">Player information not available for this match</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {players.map((player) => {
                const playerTeam = getPlayerTeam(player.name);
                const isDoubles = isDoublesMatch();
                const rating = isDoubles ? player.doublesRating : player.singlesRating;
                const wins = isDoubles ? player.doublesWins : player.singlesWins;
                const losses = isDoubles ? player.doublesLosses : player.singlesLosses;
                
                return (
                  <div
                    key={player.id}
                    className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 ${
                      activePlayerCard?.id === player.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleShowPlayerCard(player)}
                  >
                    <div className="card-body">
                      {/* Player Photo */}
                      <div className="avatar mx-auto mb-4">
                        <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                          <img
                            src={getPhotoUrl(player.photo) || 'https://via.placeholder.com/150/cccccc/666666?text=No+Photo'}
                            alt={player.name}
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/150/cccccc/666666?text=No+Photo';
                            }}
                          />
                        </div>
                      </div>

                      {/* Player Name */}
                      <h4 className="card-title text-center text-lg mb-2">{player.name}</h4>

                      {/* Team Info */}
                      <div className="text-center mb-3">
                        <div className="badge badge-outline">{playerTeam.team}</div>
                        <div className="text-sm text-base-content/70 mt-1">{playerTeam.teamName}</div>
                      </div>

                      {/* Rating */}
                      <div className="text-center mb-3">
                        <div className="text-2xl font-bold text-primary">
                          {rating || 'N/A'}
                        </div>
                        <div className="text-sm text-base-content/70">
                          {isDoubles ? 'Doubles' : 'Singles'} Rating
                        </div>
                      </div>

                      {/* Win/Loss Record */}
                      <div className="flex justify-center gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-success">{wins || 0}</div>
                          <div className="text-xs text-base-content/70">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-error">{losses || 0}</div>
                          <div className="text-xs text-base-content/70">Losses</div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="card-actions justify-center">
                        <button
                          className={`btn btn-sm ${
                            activePlayerCard?.id === player.id ? 'btn-success' : 'btn-primary'
                          } ${saving ? 'loading' : ''}`}
                          disabled={saving}
                        >
                          {activePlayerCard?.id === player.id ? 'Currently Showing' : 'Show Player Card'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h3 className="card-title">Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-base-content/70">
              <li>Click on any player card to show their information on the streaming overlay</li>
              <li>The player card will display their photo, name, rating, and win/loss record</li>
              <li>For doubles matches, doubles ratings and records are shown</li>
              <li>For singles matches, singles ratings and records are shown</li>
              <li>Click "Hide Player Card" to remove the player information from the overlay</li>
              <li>Only one player card can be shown at a time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}