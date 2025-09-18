import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import LeagueNavbar from '../components/LeagueNavbar';

export default function Home() {
  const [activeTab, setActiveTab] = useState('WD');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [featuredVideos, setFeaturedVideos] = useState([]);

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

  // Real-time listener for matches in selected tournament
  useEffect(() => {
    if (!selectedTournament) return;

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
            let scores = ['-', '-', '-'];
            let opponentScores = ['-', '-', '-'];
            
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
              player1: {
                name: player1Name,
                partner: player1Partner,
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face'
              },
              player2: {
                name: player2Name,
                partner: player2Partner,
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face'
              },
              scores: scores,
              opponentScores: opponentScores,
              time: displayTime,
              status: fixture.matchTypeLabel || fixture.matchType || 'Match',
              isLive: isLive
            };
          });

        setMatches(transformedMatches);
      } catch (error) {
        console.error('Error processing real-time match updates:', error);
        setMatches([]);
      }
    }, (error) => {
      console.error('Error with real-time listener:', error);
      setMatches([]);
    });

    // Cleanup listener on unmount or tournament change
    return () => unsubscribe();
  }, [selectedTournament]);

  // Fetch fixtures with YouTube URLs for featured videos
  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        const fixturesRef = collection(db, 'fixtures');
        const videosQuery = query(
          fixturesRef,
          where('youtubeUrl', '!=', ''),
          orderBy('youtubeUrl'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const snapshot = await getDocs(videosQuery);
        const videosData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            player1Name: data.player1Team1 || data.team1Name || 'Team 1',
            player2Name: data.player1Team2 || data.team2Name || 'Team 2',
            tournamentName: tournaments.find(t => t.id === data.tournamentId)?.name ||
                           tournaments.find(t => t.id === data.tournamentId)?.tournamentName ||
                           'Tournament Match'
          };
        });
        
        setFeaturedVideos(videosData);
      } catch (error) {
        console.error('Error fetching featured videos:', error);
        // Fallback to empty array if there's an error
        setFeaturedVideos([]);
      }
    };

    // Only fetch when tournaments are loaded
    if (tournaments.length > 0) {
      fetchFeaturedVideos();
    }
  }, [tournaments]);

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

  // Dummy data for leaderboard
  const leaderboardData = {
    WD: [
      { rank: 1, name: 'B. Johns', area: 'HYD', points: 16500, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
      { rank: 2, name: 'F. Staksrud', area: 'HYD', points: 14200, avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' },
      { rank: 3, name: 'H. Patriquin', area: 'HYD', points: 13800, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
      { rank: 4, name: 'G. Tardio', area: 'HYD', points: 13300, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
      { rank: 5, name: 'A. Daescu', area: 'HYD', points: 12400, avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face' },
      { rank: 6, name: 'C. Alshon', area: 'HYD', points: 11250, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
      { rank: 7, name: 'J. Johnson', area: 'HYD', points: 10000, avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face' },
      { rank: 8, name: 'C. Klinger', area: 'HYD', points: 9000, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
      { rank: 9, name: 'C. Johns', area: 'HYD', points: 8750, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' },
      { rank: 10, name: 'D. Frazier', area: 'HYD', points: 7550, avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face' }
    ]
  };

  const tabs = ['WD', 'WS', 'WX', 'MX', 'MD', 'MS'];

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
            {matches.map((match) => (
              <Link key={match.id} to={`/match/${match.id}`} className="score-card cursor-pointer hover:shadow-lg transition-shadow">
                <div className="score-card-header">
                  {tournaments.find(t => t.id === selectedTournament)?.name ||
                   tournaments.find(t => t.id === selectedTournament)?.tournamentName ||
                   'Tournament'}
                </div>
                <div className="score-card-content">
                  <div className="player-row">
                    <div className="player-info">
                      <img
                        src={match.player1.avatar}
                        alt={match.player1.name}
                        className="player-avatar-small"
                      />
                      <div>
                        <div className="player-name">{match.player1.name}</div>
                        {match.player1.partner && (
                          <div className="player-name">{match.player1.partner}</div>
                        )}
                      </div>
                    </div>
                    <div className="score-display">
                      {match.scores.map((score, index) => (
                        <span key={index} className="score-number">{score}</span>
                      ))}
                    </div>
                  </div>
                  <div className="player-row">
                    <div className="player-info">
                      <img
                        src={match.player2.avatar}
                        alt={match.player2.name}
                        className="player-avatar-small"
                      />
                      <div>
                        <div className="player-name">{match.player2.name}</div>
                        {match.player2.partner && (
                          <div className="player-name">{match.player2.partner}</div>
                        )}
                      </div>
                    </div>
                    <div className="score-display">
                      {match.opponentScores.map((score, index) => (
                        <span key={index} className="score-number">{score}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="score-card-footer">
                  <span>{match.time}</span>
                  <span className="match-status">{match.status}</span>
                  {match.isLive && (
                    <div className="live-indicator">
                      <div className="live-dot"></div>
                      LIVE
                    </div>
                  )}
                </div>
                
                {/* Live indicator in bottom right corner */}
                {match.isLive && (
                  <div className="live-indicator-corner">
                    <div className="live-dot"></div>
                    LIVE
                  </div>
                )}
              </Link>
            ))}
            
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
          {/* Left Sidebar - Leaderboard */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Leaderboard</h2>
            
            {/* Tabs */}
            <div className="leaderboard-tabs">
              {tabs.map(tab => (
                <button
                  key={tab}
                  className={`leaderboard-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-sm font-semibold text-gray-600 pb-2 border-b">
                <span>Rank</span>
                <span>Player</span>
                <span>Area</span>
                <span>Points</span>
              </div>
              {leaderboardData[activeTab]?.map((player) => (
                <div key={player.rank} className="grid grid-cols-4 gap-2 items-center py-2 hover:bg-gray-50 rounded">
                  <span className="font-semibold text-gray-900">{player.rank}</span>
                  <div className="flex items-center space-x-2">
                    <img src={player.avatar} alt={player.name} className="player-avatar" />
                    <span className="text-sm font-medium text-gray-900">{player.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{player.area}</span>
                  <span className="text-sm font-semibold text-gray-900">{player.points.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <Link to="/leaderboard" className="block text-center mt-4 text-orange-600 hover:text-orange-700 font-medium">
              View Full Leaderboard
            </Link>

            {/* Social Media */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Follow us</h3>
              <div className="flex space-x-4">
                <a href="#" className="social-icon hover:text-orange-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon hover:text-orange-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon hover:text-orange-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon hover:text-orange-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Center Content - Quick Access */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Quick Access</h2>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=400&fit=crop" 
                alt="Pickleball players in action" 
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            </div>

            {/* Featured Articles */}
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
          </div>

          {/* Right Sidebar - Latest News */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Latest news</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="news-item">
                  <h4 className="font-medium text-gray-900 mb-1">
                    Ankit Sharma Obtains NoC From Puducherry
                  </h4>
                  <p className="text-sm text-gray-500">13h ago</p>
                </div>
              ))}
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

            {/* Advertisement */}
            <div className="ad-banner">
              <h3 className="text-lg font-bold mb-2">Pickleball Australia</h3>
              <p className="text-sm mb-3">JOINS THE DUPR FAMILY.</p>
              <div className="text-2xl font-bold">DUPR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}