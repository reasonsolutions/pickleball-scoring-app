import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';

export default function MatchDetails() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Live scores banner state
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [currentTournament, setCurrentTournament] = useState(null);

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
        // Use dummy tournaments if Firebase fails
        const dummyTournaments = [
          { id: '1', name: 'PPA Tour: Open at the Las Vegas Strip' },
          { id: '2', name: 'Hyderabad Open Championship' },
          { id: '3', name: 'Summer League Finals' }
        ];
        setTournaments(dummyTournaments);
        setSelectedTournament('1');
      }
    };

    fetchTournaments();
  }, []);

  // Fetch tournament details and teams when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchTournamentAndTeams = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', selectedTournament));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          setCurrentTournament(tournamentData);

          // Always try to fetch teams for this tournament
          const teamsQuery = query(
            collection(db, 'teams'),
            where('tournamentId', '==', selectedTournament)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          const teamsData = teamsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTeams(teamsData);
        }
        
        // Reset team selection when tournament changes
        setSelectedTeam('');
      } catch (error) {
        console.error('Error fetching tournament and teams:', error);
        setCurrentTournament(null);
        setTeams([]);
        setSelectedTeam('');
      }
    };

    fetchTournamentAndTeams();
  }, [selectedTournament]);

  // Real-time listener for matches in selected tournament
  useEffect(() => {
    if (!selectedTournament) return;

    // Fetch players data first to get photo URLs
    const fetchPlayersAndMatches = async () => {
      try {
        // Fetch players for this tournament
        const playersQuery = query(
          collection(db, 'players'),
          where('tournamentId', '==', selectedTournament)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Create a mapping from player name to photo URL
        const playerPhotoMap = {};
        playersData.forEach(player => {
          if (player.name && player.photo?.url) {
            playerPhotoMap[player.name] = player.photo.url;
          }
        });

        // Set up real-time listener for fixtures
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', selectedTournament)
        );

        const unsubscribe = onSnapshot(fixturesQuery, (snapshot) => {
          try {
            const fixturesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Transform Firebase fixtures to match the expected format for live scores
            const transformedMatches = fixturesData
              .filter(fixture => {
                // Only show matches that have scores (completed or in-progress) or are currently live
                return fixture.scores || fixture.status === 'in-progress' || fixture.status === 'live';
              })
              .map(fixture => {
            // Get player names and create display format
            const player1Name = fixture.player1Team1 || fixture.team1Name || 'Team 1';
            const player1Partner = fixture.player2Team1 || null;
            const player2Name = fixture.player1Team2 || fixture.team2Name || 'Team 2';
            const player2Partner = fixture.player2Team2 || null;

            // Transform scores from Firebase format to display format
            const actualGamesCount = fixture.gamesCount || 3;
            let scores = Array(actualGamesCount).fill('-');
            let opponentScores = Array(actualGamesCount).fill('-');
            
            if (fixture.scores) {
              const player1Scores = fixture.scores.player1 || {};
              const player2Scores = fixture.scores.player2 || {};
              
              // Extract scores for each game
              for (let i = 1; i <= (fixture.gamesCount || 3); i++) {
                const gameKey = `game${i}`;
                if (player1Scores[gameKey] !== undefined) {
                  scores[i - 1] = player1Scores[gameKey];
                }
                if (player2Scores[gameKey] !== undefined) {
                  opponentScores[i - 1] = player2Scores[gameKey];
                }
              }
            }

            // Determine if match is live
            const isLive = fixture.status === 'live';
            
            // Format time
            let displayTime = '';
            if (fixture.time) {
              displayTime = fixture.time;
            } else if (fixture.date && fixture.date.toDate) {
              displayTime = fixture.date.toDate().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            }

            return {
              id: fixture.id,
              team1Id: fixture.team1,
              team2Id: fixture.team2,
              team1Name: fixture.team1Name,
              team2Name: fixture.team2Name,
              player1: {
                name: player1Name,
                partner: player1Partner,
                avatar: playerPhotoMap[player1Name] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
                partnerAvatar: player1Partner ? (playerPhotoMap[player1Partner] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face') : null
              },
              player2: {
                name: player2Name,
                partner: player2Partner,
                avatar: playerPhotoMap[player2Name] || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
                partnerAvatar: player2Partner ? (playerPhotoMap[player2Partner] || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face') : null
              },
              scores: scores,
              opponentScores: opponentScores,
              time: displayTime,
              status: fixture.matchTypeLabel || fixture.matchType || 'Match',
              isLive: isLive
            };
          });

        // Apply team filtering if a team is selected
        const filteredMatches = selectedTeam
          ? transformedMatches.filter(match =>
              match.team1Id === selectedTeam || match.team2Id === selectedTeam
            )
          : transformedMatches;

        setLiveMatches(filteredMatches);
      } catch (error) {
        console.error('Error processing real-time match updates:', error);
        setMatches([]);
      }
        }, (error) => {
          console.error('Error with real-time listener:', error);
          setLiveMatches([]);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching players:', error);
        setLiveMatches([]);
      }
    };

    fetchPlayersAndMatches();
  }, [selectedTournament]);

  useEffect(() => {
    if (!matchId) return;

    // Set up real-time listener for the match
    const unsubscribe = onSnapshot(
      doc(db, 'fixtures', matchId),
      (doc) => {
        if (doc.exists()) {
          const matchData = { id: doc.id, ...doc.data() };
          setMatch(matchData);
          
          // Set the tournament for this match if not already set
          if (matchData.tournamentId && !selectedTournament) {
            setSelectedTournament(matchData.tournamentId);
          }
        } else {
          setError('Match not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching match:', error);
        setError('Failed to load match details');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId, selectedTournament]);

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

  const getScores = () => {
    if (!match || !match.scores) {
      return {
        player1: ['-', '-', '-'],
        player2: ['-', '-', '-']
      };
    }

    const gamesCount = match.gamesCount || 3;
    const player1Scores = [];
    const player2Scores = [];

    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      player1Scores.push(match.scores.player1?.[gameKey] || '-');
      player2Scores.push(match.scores.player2?.[gameKey] || '-');
    }

    return {
      player1: player1Scores,
      player2: player2Scores
    };
  };

  const getTournamentName = () => {
    return match?.tournamentName || match?.tournament?.name || 'Tournament';
  };

  const getTeamName = (playerKey) => {
    if (!match) return null;
    
    if (playerKey === 'player1') {
      return match.team1Name || null;
    } else {
      return match.team2Name || null;
    }
  };

  const getMatchTitle = () => {
    const player1 = getPlayerName('player1');
    const player2 = getPlayerName('player2');
    const team1 = getTeamName('player1');
    const team2 = getTeamName('player2');
    
    let title = `${player1} vs ${player2}`;
    if (team1 && team2) {
      title += ` (${team1} vs ${team2})`;
    }
    return title;
  };

  const getYouTubeVideoId = () => {
    // Extract YouTube video ID from various URL formats
    const youtubeUrl = match?.youtubeUrl || match?.youtubeLink;
    
    if (youtubeUrl) {
      // Handle different YouTube URL formats
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = youtubeUrl.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    
    // Fallback to direct video ID if provided
    if (match?.youtubeVideoId) {
      return match.youtubeVideoId;
    }
    
    // Default fallback - a sample pickleball match video
    return 'dQw4w9WgXcQ';
  };

  const hasYouTubeVideo = () => {
    return match?.youtubeUrl || match?.youtubeLink || match?.youtubeVideoId;
  };

  const isMatchLive = () => {
    return match?.status === 'live' || match?.status === 'in-progress';
  };

  // Scroll functions for live scores
  const scrollLeft = () => {
    const container = document.querySelector('.live-scores-container');
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.querySelector('.live-scores-container');
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || 'Match not found'}
          </div>
          <Link to="/" className="text-orange-600 hover:text-orange-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const scores = getScores();

  return (
    <div className="league-home min-h-screen bg-gray-50">
      {/* Live Tournament Scores Banner */}
      <div className="live-scores-banner">
        <div className="flex items-center px-4 py-2 w-full">
          {/* Tournament Dropdown */}
          <div className="flex items-center min-w-0 mr-4">
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 max-w-xs truncate"
            >
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name || tournament.tournamentName || `Tournament ${tournament.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Team Dropdown - Show for team format tournaments or when teams exist */}
          {(currentTournament?.format === 'team' || teams.length > 0) && (
            <div className="flex items-center min-w-0 mr-4">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 max-w-xs truncate"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors mr-2"
            disabled={matches.length === 0}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Live Matches Container */}
          <div className="live-scores-container flex-1 mx-2">
            {matches.map((liveMatch) => {
              // Determine winner based on scores
              const getWinner = () => {
                let player1Wins = 0;
                let player2Wins = 0;
                
                for (let i = 0; i < liveMatch.scores.length; i++) {
                  const p1Score = parseInt(liveMatch.scores[i]) || 0;
                  const p2Score = parseInt(liveMatch.opponentScores[i]) || 0;
                  
                  if (p1Score > p2Score) player1Wins++;
                  else if (p2Score > p1Score) player2Wins++;
                }
                
                if (player1Wins > player2Wins) return 'player1';
                if (player2Wins > player1Wins) return 'player2';
                return 'none';
              };
              
              const winner = getWinner();
              
              return (
                <Link key={liveMatch.id} to={`/match/${liveMatch.id}`} className={`compact-score-card cursor-pointer hover:shadow-lg transition-shadow ${liveMatch.id === matchId ? 'ring-2 ring-orange-500' : ''}`}>
                  <div className="compact-score-content">
                    {/* Team 1 Row */}
                    <div className="compact-team-row">
                      <div className="compact-players">
                        <div className="compact-player-avatars">
                          <div className={`compact-avatar-wrapper ${winner === 'player1' ? 'winner' : 'loser'}`}>
                            <img
                              src={liveMatch.player1.avatar}
                              alt={liveMatch.player1.name}
                              className="compact-player-avatar"
                            />
                            {winner === 'player1' && (
                              <div className="winner-indicator">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {winner === 'player2' && (
                              <div className="loser-indicator">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {liveMatch.player1.partner && (
                            <div className={`compact-avatar-wrapper ${winner === 'player1' ? 'winner' : 'loser'}`}>
                              <img
                                src={liveMatch.player1.partnerAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face"}
                                alt={liveMatch.player1.partner}
                                className="compact-player-avatar"
                              />
                              {winner === 'player1' && (
                                <div className="winner-indicator">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {winner === 'player2' && (
                                <div className="loser-indicator">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="compact-player-names">
                          <div className="compact-player-name">
                            {typeof liveMatch.player1.name === 'string' ?
                              liveMatch.player1.name.split(' ').length > 1 ?
                                liveMatch.player1.name.split(' ')[0].charAt(0) + '. ' + liveMatch.player1.name.split(' ').slice(1).join(' ')
                                : liveMatch.player1.name
                              : 'Player 1'}
                          </div>
                          {liveMatch.player1.partner && (
                            <div className="compact-player-name">
                              {typeof liveMatch.player1.partner === 'string' ?
                                liveMatch.player1.partner.split(' ').length > 1 ?
                                  liveMatch.player1.partner.split(' ')[0].charAt(0) + '. ' + liveMatch.player1.partner.split(' ').slice(1).join(' ')
                                  : liveMatch.player1.partner
                                : 'Partner 1'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="compact-scores">
                        {liveMatch.scores.map((score, index) => (
                          <span key={index} className={`compact-score ${winner === 'player1' && score !== '-' ? 'winner-score' : ''}`}>
                            {score}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Team 2 Row */}
                    <div className="compact-team-row">
                      <div className="compact-players">
                        <div className="compact-player-avatars">
                          <div className={`compact-avatar-wrapper ${winner === 'player2' ? 'winner' : 'loser'}`}>
                            <img
                              src={liveMatch.player2.avatar}
                              alt={liveMatch.player2.name}
                              className="compact-player-avatar"
                            />
                            {winner === 'player2' && (
                              <div className="winner-indicator">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {winner === 'player1' && (
                              <div className="loser-indicator">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {liveMatch.player2.partner && (
                            <div className={`compact-avatar-wrapper ${winner === 'player2' ? 'winner' : 'loser'}`}>
                              <img
                                src={liveMatch.player2.partnerAvatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face"}
                                alt={liveMatch.player2.partner}
                                className="compact-player-avatar"
                              />
                              {winner === 'player2' && (
                                <div className="winner-indicator">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {winner === 'player1' && (
                                <div className="loser-indicator">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="compact-player-names">
                          <div className="compact-player-name">
                            {typeof liveMatch.player2.name === 'string' ?
                              liveMatch.player2.name.split(' ').length > 1 ?
                                liveMatch.player2.name.split(' ')[0].charAt(0) + '. ' + liveMatch.player2.name.split(' ').slice(1).join(' ')
                                : liveMatch.player2.name
                              : 'Player 2'}
                          </div>
                          {liveMatch.player2.partner && (
                            <div className="compact-player-name">
                              {typeof liveMatch.player2.partner === 'string' ?
                                liveMatch.player2.partner.split(' ').length > 1 ?
                                  liveMatch.player2.partner.split(' ')[0].charAt(0) + '. ' + liveMatch.player2.partner.split(' ').slice(1).join(' ')
                                  : liveMatch.player2.partner
                                : 'Partner 2'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="compact-scores">
                        {liveMatch.opponentScores.map((score, index) => (
                          <span key={index} className={`compact-score ${winner === 'player2' && score !== '-' ? 'winner-score' : ''}`}>
                            {score}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="compact-score-footer">
                    <span className="compact-time">{liveMatch.time || '6:27 PM PDT'}</span>
                    <span className="compact-status">{liveMatch.status || 'Bronze'}</span>
                    {liveMatch.isLive && (
                      <div className="compact-live-indicator">
                        <div className="live-dot"></div>
                        LIVE
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            
            {matches.length === 0 && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                No live matches for this tournament
              </div>
            )}
          </div>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors ml-2"
            disabled={matches.length === 0}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <LeagueNavbar />

      {/* Header */}
      <div className="bg-blue-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="text-sm mb-2">
                <Link to="/" className="hover:text-orange-300">Home</Link>
                <span className="mx-2">/</span>
                <span>Match Details</span>
              </nav>
              <div>
                <h1 className="text-2xl font-bold">{getTournamentName()}</h1>
                <div className="mt-2">
                  <div className="text-lg font-semibold">
                    {getPlayerName('player1')} vs {getPlayerName('player2')}
                  </div>
                  {(getTeamName('player1') || getTeamName('player2')) && (
                    <div className="text-sm text-blue-200 mt-1">
                      {getTeamName('player1') || 'Team 1'} vs {getTeamName('player2') || 'Team 2'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata'
                })} IST
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* YouTube Video - Left Side (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <div className="bg-gray-200 rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                {hasYouTubeVideo() ? (
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId()}?autoplay=1&mute=1&controls=1&rel=0`}
                    title="Live Match Stream"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-700">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold mb-2">No Live Stream Available</h3>
                      <p className="text-gray-600">The live stream for this match is not currently available.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Video Controls/Info */}
            <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {hasYouTubeVideo() ? 'Live Match Stream' : 'Match Details'}
                  </h2>
                  <p className="text-gray-600">
                    {getMatchTitle()}
                  </p>
                  {!hasYouTubeVideo() && (
                    <p className="text-sm text-orange-600 mt-1">
                      Stream will be available when the match goes live
                    </p>
                  )}
                </div>
                {isMatchLive() && (
                  <div className="flex items-center text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
                    <span className="font-semibold">LIVE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scorecard - Right Side (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Scorecard Header */}
              <div className="bg-red-600 text-white px-4 py-3">
                <h3 className="text-lg font-bold">Live Pickleball | Scorecard</h3>
              </div>

              {/* Scorecard Content */}
              <div className="p-4">
                {/* Column Headers */}
                <div className="grid grid-cols-5 gap-2 mb-4 text-sm font-semibold text-gray-600">
                  <div className="col-span-2">Players Names</div>
                  <div className="text-center">G1</div>
                  <div className="text-center">G2</div>
                  <div className="text-center">G3</div>
                </div>

                {/* Player 1 Row */}
                <div className="grid grid-cols-5 gap-2 items-center py-3 border-b border-gray-200">
                  <div className="col-span-2 flex items-center">
                    <div className="flex -space-x-2 mr-3">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
                        alt="Player 1"
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                      {getPartnerName('player1') && (
                        <img
                          src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face"
                          alt="Partner 1"
                          className="w-8 h-8 rounded-full border-2 border-white"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{getPlayerName('player1')}</div>
                      {getPartnerName('player1') && (
                        <div className="font-semibold text-sm">{getPartnerName('player1')}</div>
                      )}
                      {getTeamName('player1') && (
                        <div className="text-xs text-gray-500 mt-1">{getTeamName('player1')}</div>
                      )}
                    </div>
                  </div>
                  {scores.player1.map((score, index) => (
                    <div key={index} className="text-center">
                      <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        score !== '-' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {score}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Player 2 Row */}
                <div className="grid grid-cols-5 gap-2 items-center py-3">
                  <div className="col-span-2 flex items-center">
                    <div className="flex -space-x-2 mr-3">
                      <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
                        alt="Player 2"
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                      {getPartnerName('player2') && (
                        <img
                          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face"
                          alt="Partner 2"
                          className="w-8 h-8 rounded-full border-2 border-white"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{getPlayerName('player2')}</div>
                      {getPartnerName('player2') && (
                        <div className="font-semibold text-sm">{getPartnerName('player2')}</div>
                      )}
                      {getTeamName('player2') && (
                        <div className="text-xs text-gray-500 mt-1">{getTeamName('player2')}</div>
                      )}
                    </div>
                  </div>
                  {scores.player2.map((score, index) => (
                    <div key={index} className="text-center">
                      <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        score !== '-' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Status */}
              <div className="bg-gray-50 px-4 py-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {match.time || 'Live'}
                  </span>
                  <span className={`font-semibold ${
                    isMatchLive() ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {isMatchLive() ? 'LIVE' : match.status || 'Match'}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Match Info */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Match Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tournament:</span>
                  <span className="font-medium">{getTournamentName()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Match Type:</span>
                  <span className="font-medium">{match.matchTypeLabel || match.matchType || 'Singles'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Games:</span>
                  <span className="font-medium">Best of {match.gamesCount || 3}</span>
                </div>
                {match.court && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Court:</span>
                    <span className="font-medium">{match.court}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}