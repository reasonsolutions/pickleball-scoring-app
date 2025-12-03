import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';
import Footer from '../components/Footer';
import {
  fetchTournamentsOptimized,
  fetchMinimalTournamentData,
  fetchTeamsAndPlayersOptimized,
  fetchHomePageContentOptimized,
  fetchTournamentStatsOptimized
} from '../services/optimizedFirebaseService';

export default function Home() {
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [teamsWithStats, setTeamsWithStats] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [news, setNews] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  
  // Ref for player photo caching
  const playerPhotoMapRef = useRef({});

  // Fetch tournaments with caching
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournamentsList = await fetchTournamentsOptimized();
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

  // Fetch minimal tournament data when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchTournamentData = async () => {
      try {
        const tournamentData = await fetchMinimalTournamentData(selectedTournament);
        
        if (tournamentData.tournament) {
          setCurrentTournament(tournamentData.tournament);
          
          // Process initial matches (live + recent)
          const allMatches = [...tournamentData.liveMatches, ...tournamentData.recentMatches];
          processMatchesForDisplay(allMatches);
        }
        
        // Reset team selection when tournament changes
        setSelectedTeam('');
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        setCurrentTournament(null);
        setMatches([]);
        setSelectedTeam('');
        setTeamsWithStats([]);
      }
    };

    fetchTournamentData();
  }, [selectedTournament]);

  // Process matches for display (helper function)
  const processMatchesForDisplay = useCallback(async (fixturesData, playerPhotoMap = {}) => {
    try {
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

      setMatches(filteredMatches);
    } catch (error) {
      console.error('Error processing match updates:', error);
      setMatches([]);
    }
  }, [selectedTeam]);

  // Real-time listener for live matches (replaces polling)
  useEffect(() => {
    if (!selectedTournament) return;

    // Set up real-time listener for all matches, then filter for live ones
    const allMatchesQuery = query(
      collection(db, 'fixtures'),
      where('tournamentId', '==', selectedTournament)
    );

    console.log('🔧 Setting up real-time listener for live matches');
    
    const unsubscribe = onSnapshot(
      allMatchesQuery,
      async (snapshot) => {
        try {
          console.log('🔥 Real-time update: Matches changed');
          
          // Filter for live matches in JavaScript to avoid composite index requirement
          const allMatches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          const liveMatches = allMatches.filter(match =>
            match.status === 'live' || match.status === 'in-progress'
          );

          // If we have live matches and need player photos, fetch them once
          if (liveMatches.length > 0 && Object.keys(playerPhotoMapRef.current).length === 0) {
            try {
              const { players } = await fetchTeamsAndPlayersOptimized(selectedTournament);
              const newPlayerPhotoMap = {};
              players.forEach(player => {
                if (player.name && player.photo?.url) {
                  newPlayerPhotoMap[player.name] = player.photo.url;
                }
              });
              playerPhotoMapRef.current = newPlayerPhotoMap;
            } catch (error) {
              console.warn('Could not fetch player photos:', error);
            }
          }
          
          processMatchesForDisplay(liveMatches, playerPhotoMapRef.current);
        } catch (error) {
          console.error('Error processing live match updates:', error);
        }
      },
      (error) => {
        console.error('Error in live matches listener:', error);
      }
    );

    // Cleanup listener on unmount or tournament change
    return () => {
      console.log('🧹 Cleaning up live matches listener');
      unsubscribe();
      playerPhotoMapRef.current = {}; // Reset photo cache
    };
  }, [selectedTournament, processMatchesForDisplay]);

  // Fetch home page content (videos, news, featured articles) with caching
  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const content = await fetchHomePageContentOptimized();
        
        // Set videos (admin videos or fallback to fixture videos)
        if (content.videos.length > 0) {
          const videosData = content.videos.map(video => ({
            id: video.id,
            title: video.title,
            youtubeUrl: video.youtubeUrl,
            description: video.description,
            videoId: video.videoId,
            player1Name: video.title, // Use title as display name
            player2Name: '', // No opponent for admin videos
            tournamentName: video.description || 'Featured Video'
          }));
          setFeaturedVideos(videosData);
        } else if (content.fallbackVideos.length > 0) {
          const videosData = content.fallbackVideos.map(video => ({
            id: video.id,
            ...video,
            player1Name: video.player1Team1 || video.team1Name || 'Team 1',
            player2Name: video.player1Team2 || video.team2Name || 'Team 2',
            tournamentName: tournaments.find(t => t.id === video.tournamentId)?.name ||
                           tournaments.find(t => t.id === video.tournamentId)?.tournamentName ||
                           'Tournament Match'
          }));
          setFeaturedVideos(videosData);
        } else {
          setFeaturedVideos([]);
        }
        
        // Set news and featured articles
        setNews(content.news);
        setFeaturedArticles(content.featuredArticles);
        
      } catch (error) {
        console.error('Error fetching home page content:', error);
        setFeaturedVideos([]);
        setNews([]);
        setFeaturedArticles([]);
      }
    };

    fetchHomeContent();
  }, [tournaments]);

  // Lazy load team statistics when needed
  const loadTeamStatistics = useCallback(async () => {
    if (!selectedTournament || teamsWithStats.length > 0) return;
    
    try {
      const stats = await fetchTournamentStatsOptimized(selectedTournament);
      setTeamsWithStats(stats.teams);
      setTeams(stats.teams);
    } catch (error) {
      console.error('Error loading team statistics:', error);
    }
  }, [selectedTournament, teamsWithStats.length]);

  // Load team statistics when tournament is selected (lazy loading)
  useEffect(() => {
    if (selectedTournament) {
      loadTeamStatistics();
    }
  }, [selectedTournament, loadTeamStatistics]);

  // Helper function to extract YouTube video ID
  const extractVideoId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
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

  return (
    <div className="league-home min-h-screen bg-gray-50">
      {/* Live Tournament Scores Banner */}
      <div className="live-scores-banner">
        <div className="flex items-center px-4 py-2 w-full">
          {/* Left Side - Dropdowns */}
          <div className="flex flex-col min-w-0 mr-4">
            {/* Tournament Dropdown */}
            <div className="flex items-center min-w-0 mb-2">
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
              <div className="flex items-center min-w-0">
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
          </div>

          {/* Right Side - Navigation and Live Matches */}

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
            {matches.map((match) => {
              // Determine winner based on scores
              const getWinner = () => {
                let player1Wins = 0;
                let player2Wins = 0;
                
                for (let i = 0; i < match.scores.length; i++) {
                  const p1Score = parseInt(match.scores[i]) || 0;
                  const p2Score = parseInt(match.opponentScores[i]) || 0;
                  
                  if (p1Score > p2Score) player1Wins++;
                  else if (p2Score > p1Score) player2Wins++;
                }
                
                if (player1Wins > player2Wins) return 'player1';
                if (player2Wins > player1Wins) return 'player2';
                return 'none';
              };
              
              const winner = getWinner();
              
              return (
                <Link key={match.id} to={`/match/${match.id}`} className="compact-score-card cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="compact-score-content">
                    {/* Team 1 Row */}
                    <div className="compact-team-row">
                      <div className="compact-players">
                        <div className="compact-player-avatars">
                          <div className={`compact-avatar-wrapper ${winner === 'player1' ? 'winner' : 'loser'}`}>
                            <img
                              src={match.player1.avatar}
                              alt={match.player1.name}
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
                          {match.player1.partner && (
                            <div className={`compact-avatar-wrapper ${winner === 'player1' ? 'winner' : 'loser'}`}>
                              <img
                                src={match.player1.partnerAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face"}
                                alt={match.player1.partner}
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
                            {typeof match.player1.name === 'string' ?
                              match.player1.name.split(' ').length > 1 ?
                                match.player1.name.split(' ')[0].charAt(0) + '. ' + match.player1.name.split(' ').slice(1).join(' ')
                                : match.player1.name
                              : 'Player 1'}
                          </div>
                          {match.player1.partner && (
                            <div className="compact-player-name">
                              {typeof match.player1.partner === 'string' ?
                                match.player1.partner.split(' ').length > 1 ?
                                  match.player1.partner.split(' ')[0].charAt(0) + '. ' + match.player1.partner.split(' ').slice(1).join(' ')
                                  : match.player1.partner
                                : 'Partner 1'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="compact-scores">
                        {match.scores.map((score, index) => (
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
                              src={match.player2.avatar}
                              alt={match.player2.name}
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
                          {match.player2.partner && (
                            <div className={`compact-avatar-wrapper ${winner === 'player2' ? 'winner' : 'loser'}`}>
                              <img
                                src={match.player2.partnerAvatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face"}
                                alt={match.player2.partner}
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
                            {typeof match.player2.name === 'string' ?
                              match.player2.name.split(' ').length > 1 ?
                                match.player2.name.split(' ')[0].charAt(0) + '. ' + match.player2.name.split(' ').slice(1).join(' ')
                                : match.player2.name
                              : 'Player 2'}
                          </div>
                          {match.player2.partner && (
                            <div className="compact-player-name">
                              {typeof match.player2.partner === 'string' ?
                                match.player2.partner.split(' ').length > 1 ?
                                  match.player2.partner.split(' ')[0].charAt(0) + '. ' + match.player2.partner.split(' ').slice(1).join(' ')
                                  : match.player2.partner
                                : 'Partner 2'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="compact-scores">
                        {match.opponentScores.map((score, index) => (
                          <span key={index} className={`compact-score ${winner === 'player2' && score !== '-' ? 'winner-score' : ''}`}>
                            {score}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="compact-score-footer">
                    <span className="compact-time">{match.time || '6:27 PM PDT'}</span>
                    <span className="compact-status">{match.status || 'Bronze'}</span>
                    {match.isLive && (
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

      {/* Main Content Grid */}
      <div className="py-8">
        <div className="grid-4-col px-4">
          {/* Left Sidebar - Team Rankings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Team Rankings</h2>
            
            {/* Rankings Table */}
            <div className="space-y-3">
              <div className="grid gap-2 text-sm font-semibold text-gray-600 pb-2 border-b" style={{gridTemplateColumns: '60px 1fr 80px'}}>
                <span>Rank</span>
                <span>Team</span>
                <span>Points</span>
              </div>
              {teamsWithStats.slice(0, 8).map((team, index) => (
                <div key={team.id} className="grid gap-2 items-center py-2 hover:bg-gray-50 rounded" style={{gridTemplateColumns: '60px 1fr 80px'}}>
                  <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                  <div className="flex items-center space-x-2 min-w-0">
                    {team.logo?.url ? (
                      <img src={team.logo.url} alt={team.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600">
                          {team.name?.charAt(0) || 'T'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">{team.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{team.points || 0}</span>
                </div>
              ))}
              {teamsWithStats.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No team data available
                </div>
              )}
            </div>

            <Link to="/rankings" className="block text-center mt-4 text-orange-600 hover:text-orange-700 font-medium">
              View Full Rankings
            </Link>

            {/* Social Media */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Follow us</h3>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/hyderabadpickleballleague"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon hover:text-orange-500"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@centrecourtsports"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon hover:text-orange-500"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>


          {/* Center Content - Featured Articles */}
          <div>
            {/* Featured Articles */}
            {featuredArticles.length > 0 ? (
              featuredArticles.map((article) => {
                // Calculate time ago
                const getTimeAgo = (date) => {
                  if (!date) return 'Unknown';
                  
                  const now = new Date();
                  const publishDate = date.toDate ? date.toDate() : new Date(date);
                  const diffInMs = now - publishDate;
                  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                  const diffInDays = Math.floor(diffInHours / 24);
                  
                  if (diffInDays > 0) {
                    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
                  } else if (diffInHours > 0) {
                    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
                  } else {
                    return 'Just now';
                  }
                };

                return (
                  <Link key={article.id} to={`/news/${article.id}`} className="featured-article block hover:opacity-90 transition-opacity">
                    <img
                      src={typeof article.featuredImage === 'string'
                        ? article.featuredImage
                        : article.featuredImage?.secure_url || "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=300&fit=crop"}
                      alt={article.title}
                    />
                    <div className="article-content">
                      <h3 className="article-title">
                        {article.title}
                      </h3>
                      <p className="article-excerpt">
                        {article.subtext}
                      </p>
                      <div className="article-meta">
                        <span>{getTimeAgo(article.publishDate)}</span>
                        <span>•</span>
                        <span>Featured Article</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              // Fallback content when no featured articles exist
              <>
                <div className="featured-article">
                  <img
                    src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=300&fit=crop"
                    alt="Pickleball match"
                  />
                  <div className="article-content">
                    <h3 className="article-title">
                      Johnson, Black hand Waters, Bright first loss in three-game battle
                    </h3>
                    <p className="article-excerpt">
                      The Dallas Flash teammates overcame a Game 1 defeat to advance to their second Championship Sunday on the PPA Tour.
                    </p>
                    <div className="article-meta">
                      <span>1 day ago</span>
                      <span>•</span>
                      <span>Will Daughton</span>
                    </div>
                  </div>
                </div>

                <div className="featured-article">
                  <img
                    src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=300&fit=crop"
                    alt="Men's doubles final"
                  />
                  <div className="article-content">
                    <h3 className="article-title">
                      Johns and Tardio, Alshon and Daescu book spots in men's doubles final
                    </h3>
                    <p className="article-excerpt">
                      Two of the top men's doubles teams in the world will face off for the fourth time on Sunday with a gold medal on the line.
                    </p>
                    <div className="article-meta">
                      <span>1 day ago</span>
                      <span>•</span>
                      <span>Will Daughton</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar - Latest News */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Latest news</h2>
            <div className="space-y-4">
              {news.length > 0 ? (
                news.map((article) => {
                  // Calculate time ago
                  const getTimeAgo = (date) => {
                    if (!date) return 'Unknown';
                    
                    const now = new Date();
                    const publishDate = date.toDate ? date.toDate() : new Date(date);
                    const diffInMs = now - publishDate;
                    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                    const diffInDays = Math.floor(diffInHours / 24);
                    
                    if (diffInDays > 0) {
                      return `${diffInDays}d ago`;
                    } else if (diffInHours > 0) {
                      return `${diffInHours}h ago`;
                    } else {
                      return 'Just now';
                    }
                  };

                  return (
                    <Link key={article.id} to={`/news/${article.id}`} className="news-item block hover:bg-gray-50 rounded p-2 -m-2 transition-colors">
                      <h4 className="font-medium text-gray-900 mb-1 hover:text-orange-600">
                        {article.title}
                      </h4>
                      <p className="text-sm text-gray-500">{getTimeAgo(article.publishDate)}</p>
                    </Link>
                  );
                })
              ) : (
                // Fallback content when no admin news exists
                [1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="news-item">
                    <h4 className="font-medium text-gray-900 mb-1">
                      Ankit Sharma Obtains NoC From Puducherry
                    </h4>
                    <p className="text-sm text-gray-500">13h ago</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Far Right - Featured Videos */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Featured Videos</h2>
              <div className="space-y-4">
                {featuredVideos.length > 0 ? (
                  featuredVideos.map((video) => {
                    const videoId = extractVideoId(video.youtubeUrl);
                    return (
                      <div key={video.id} className="video-thumbnail">
                        {videoId ? (
                          <div className="relative">
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                              alt="Video thumbnail"
                              className="w-full h-32 object-cover rounded"
                              onError={(e) => {
                                // Fallback to medium quality thumbnail if maxres fails
                                e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                              }}
                            />
                            <a
                              href={video.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="video-play-button"
                            >
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </a>
                            {video.status === 'live' && (
                              <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                LIVE
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-500">Invalid Video</span>
                          </div>
                        )}
                        <div className="mt-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {video.player1Name} vs {video.player2Name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {video.tournamentName}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback content when no videos with YouTube URLs are available
                  [1, 2, 3].map((video) => (
                    <div key={video} className="video-thumbnail">
                      <img
                        src={`https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=180&fit=crop&q=${video}`}
                        alt="Video thumbnail"
                        className="w-full h-32 object-cover rounded"
                      />
                      <div className="video-play-button">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Sample Match Highlights
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          No live streams available
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link to="/videos" className="block text-center mt-4 text-orange-600 hover:text-orange-700 font-medium">
                More Videos
              </Link>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}