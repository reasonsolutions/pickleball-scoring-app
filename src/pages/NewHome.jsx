import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import {
  fetchTournamentsOptimized,
  fetchMinimalTournamentData,
  fetchTeamsAndPlayersOptimized,
  fetchHomePageContentOptimized,
  fetchTournamentStatsOptimized
} from '../services/optimizedFirebaseService';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function NewHome() {
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentVideoSlide, setCurrentVideoSlide] = useState(0);
  
  // Ref for player photo caching
  const playerPhotoMapRef = useRef({});
  
  // Auto-advance slider
  useEffect(() => {
    if (featuredArticles.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
      }, 5000); // Change slide every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [featuredArticles.length]);

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
        
        // Set news and featured articles
        setNews(content.news);
        setFeaturedArticles(content.featuredArticles);
        
      } catch (error) {
        console.error('Error fetching home page content:', error);
        setNews([]);
        setFeaturedArticles([]);
      }
    };

    fetchHomeContent();
  }, [tournaments]);

  // Fetch videos directly from Firestore (same logic as Videos page)
  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        // Fetch from admin-managed featured videos
        const featuredVideosQuery = query(
          collection(db, 'featuredVideos'),
          orderBy('createdAt', 'desc')
        );
        
        const featuredSnapshot = await getDocs(featuredVideosQuery);
        
        if (featuredSnapshot.docs.length > 0) {
          // Use admin-managed videos
          const videosData = featuredSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              youtubeUrl: data.youtubeUrl,
              description: data.description,
              videoId: data.videoId,
              createdAt: data.createdAt,
              type: 'featured'
            };
          });
          setFeaturedVideos(videosData);
        } else {
          // Fallback to fixtures with YouTube URLs if no admin videos exist
          const fixturesRef = collection(db, 'fixtures');
          const fixturesQuery = query(
            fixturesRef,
            orderBy('createdAt', 'desc')
          );
          
          const fixturesSnapshot = await getDocs(fixturesQuery);
          const videosData = fixturesSnapshot.docs
            .map(doc => doc.data())
            .filter(data => data.youtubeUrl && data.youtubeUrl.trim() !== '')
            .map(data => ({
              id: data.id,
              title: `${data.player1Team1 || data.team1Name || 'Team 1'} vs ${data.player1Team2 || data.team2Name || 'Team 2'}`,
              youtubeUrl: data.youtubeUrl,
              description: tournaments.find(t => t.id === data.tournamentId)?.name ||
                          tournaments.find(t => t.id === data.tournamentId)?.tournamentName ||
                          'Tournament Match',
              createdAt: data.createdAt,
              type: 'match'
            }));
          setFeaturedVideos(videosData);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setFeaturedVideos([]);
      }
    };

    fetchAllVideos();
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

  // Slider navigation functions
  const nextSlide = () => {
    const slides = featuredArticles.length > 0 ? featuredArticles : [{}];
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    const slides = featuredArticles.length > 0 ? featuredArticles : [{}];
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Video slider navigation functions
  const nextVideoSlide = () => {
    const totalSlides = Math.ceil(featuredVideos.length / 3);
    setCurrentVideoSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevVideoSlide = () => {
    const totalSlides = Math.ceil(featuredVideos.length / 3);
    setCurrentVideoSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToVideoSlide = (index) => {
    setCurrentVideoSlide(index);
  };

  return (
    <div className="league-home min-h-screen" style={{backgroundColor: '#212121'}}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Hero Section Slider */}
      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 w-full max-w-full sm:w-full sm:max-w-none lg:w-full lg:max-w-none xl:w-[1600px] xl:max-w-[1600px]">
          <div className="hero-section relative overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl h-[50vh] sm:h-[60vh] lg:h-[80vh]">
            {featuredArticles.length > 0 ? (
              <>
                <Link
                  to={`/news/${featuredArticles[currentSlide]?.id}`}
                  className="hero-slide relative w-full h-full block group cursor-pointer"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('${
                        featuredArticles[currentSlide]?.featuredImage?.url ||
                        featuredArticles[currentSlide]?.featuredImage?.secure_url ||
                        featuredArticles[currentSlide]?.featuredImage ||
                        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop"
                      }')`
                    }}
                  >
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Content Overlay */}
                  <div className="relative z-10 h-full flex items-end">
                    <div className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 lg:pb-16 w-full">
                      <div className="max-w-4xl">
                        {/* Featured Badge */}
                        <div className="mb-4 sm:mb-6">
                          <span className="inline-block bg-orange-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide uppercase" style={{fontFamily: 'Avantique, sans-serif'}}>
                            Featured
                          </span>
                        </div>
                        
                        {/* Main Title */}
                        <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 leading-tight group-hover:text-orange-300 transition-colors duration-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {featuredArticles[currentSlide]?.title || "Featured Article"}
                        </h1>
                        
                        {/* Description */}
                        <p className="text-orange-300 text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-3xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {featuredArticles[currentSlide]?.subtext || "Click to read the full article"}
                        </p>
                        
                        {/* Read More Button */}
                        <div className="inline-flex items-center text-white bg-orange-500 hover:bg-orange-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors duration-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Read Full Article
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Navigation Arrows */}
                {featuredArticles.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        nextSlide();
                      }}
                      className="absolute right-2 sm:right-4 lg:right-8 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 sm:p-3 lg:p-4 transition-all duration-300"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        prevSlide();
                      }}
                      className="absolute left-2 sm:left-4 lg:left-8 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 sm:p-3 lg:p-4 transition-all duration-300"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Slide Indicators */}
                {featuredArticles.length > 1 && (
                  <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2 sm:space-x-3">
                    {featuredArticles.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          goToSlide(index);
                        }}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white transition-opacity duration-300 ${index === currentSlide ? 'opacity-100' : 'opacity-50'}`}
                      ></button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="hero-slide relative w-full h-full">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop')`
                  }}
                >
                  {/* Dark Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                </div>
                
                {/* Content Overlay */}
                <div className="relative z-10 h-full flex items-end">
                  <div className="px-8 pb-16 w-full">
                    <div className="max-w-4xl">
                      {/* Champions Badge */}
                      <div className="mb-6">
                        <span className="inline-block bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold tracking-wide uppercase" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Champions
                        </span>
                      </div>
                      
                      {/* Main Title */}
                      <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Mavericks vs. All Stars: An Analytical Breakdown of Pressure, Strategy, and Team Dynamics in the Championship
                      </h1>
                      
                      {/* Description */}
                      <p className="text-orange-300 text-lg md:text-xl mb-8 max-w-3xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                        In David Foster Wallace's essays on tennis, the sport becomes a lens for how modern systems assign value to individuals. Tennis, he argues, mirrors meritocracy at its most unforgiving:
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latest News Section */}
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 space-y-4 sm:space-y-0">
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold italic" style={{fontFamily: 'Avantique, sans-serif'}}>LATEST NEWS</h2>
            <Link to="/news" className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-colors" style={{fontFamily: 'Avantique, sans-serif'}}>
              VIEW ALL NEWS
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {(() => {
              // Get sorted non-featured news articles (news state already contains only non-featured articles)
              const sortedNews = news
                .sort((a, b) => {
                  const dateA = a.publishDate?.toDate ? a.publishDate.toDate() : new Date(a.publishDate || 0);
                  const dateB = b.publishDate?.toDate ? b.publishDate.toDate() : new Date(b.publishDate || 0);
                  return dateB - dateA; // Latest first
                })
                .slice(0, 3); // Show only the latest 3 non-featured articles

              // If no articles available, show a message
              if (sortedNews.length === 0) {
                return (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>No news articles yet</h3>
                    <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>Check back later for the latest updates from Hyderabad Pickleball League.</p>
                  </div>
                );
              }

              return sortedNews.map((article) => {
                // Calculate time ago
                const getTimeAgo = (date) => {
                  if (!date) return 'Unknown';
                  
                  const now = new Date();
                  const publishDate = date.toDate ? date.toDate() : new Date(date);
                  const diffInMs = now - publishDate;
                  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                  const diffInDays = Math.floor(diffInHours / 24);
                  
                  if (diffInDays > 0) {
                    return `${diffInDays}D AGO`;
                  } else if (diffInHours > 0) {
                    return `${diffInHours}H AGO`;
                  } else {
                    return 'JUST NOW';
                  }
                };

                const formatDate = (date) => {
                  if (!date) return 'UNKNOWN DATE';
                  
                  const publishDate = date.toDate ? date.toDate() : new Date(date);
                  return publishDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }).toUpperCase();
                };

                return (
                  <Link key={article.id} to={`/news/${article.id}`} className="news-card-large block group">
                    <div className="transition-transform duration-300 group-hover:scale-105">
                      <div className="overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl mb-4 sm:mb-6 h-48 sm:h-64 lg:h-80">
                        <img
                          src={
                            article.featuredImage?.secure_url ||
                            article.featuredImage?.url ||
                            (typeof article.featuredImage === 'string' ? article.featuredImage : null) ||
                            article.image?.secure_url ||
                            article.image?.url ||
                            (typeof article.image === 'string' ? article.image : null) ||
                            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop"
                          }
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="px-1 sm:px-2">
                        <div className="text-orange-400 text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {formatDate(article.publishDate)} • {getTimeAgo(article.publishDate)}
                        </div>
                        <h3 className="text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight group-hover:text-orange-300 transition-colors" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {article.title.toUpperCase()}
                        </h3>
                      </div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Team Rankings Section */}
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="flex justify-between items-center mb-8 sm:mb-12">
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold italic" style={{fontFamily: 'Avantique, sans-serif'}}>TEAM RANKINGS</h2>
          </div>
          
          <div className="bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            {/* Table Header */}
            <div className="flex items-center pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-600">
              <div className="w-12 sm:w-16 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
                Rank
              </div>
              <div className="flex-1 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide" style={{fontFamily: 'Avantique, sans-serif'}}>
                Team
              </div>
              <div className="w-16 sm:w-20 lg:w-24 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                <span className="hidden sm:inline">Won</span>
                <span className="sm:hidden">W</span>
              </div>
              <div className="w-16 sm:w-20 lg:w-24 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                <span className="hidden sm:inline">Lost</span>
                <span className="sm:hidden">L</span>
              </div>
              <div className="w-16 sm:w-20 text-gray-400 font-semibold text-xs sm:text-sm uppercase tracking-wide text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                <span className="hidden sm:inline">Points</span>
                <span className="sm:hidden">Pts</span>
              </div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-0">
              {teamsWithStats.slice(0, 8).map((team, index) => (
                <div key={team.id} className="flex items-center py-3 sm:py-4 hover:bg-gray-700 transition-colors px-2 sm:px-4 border-b border-orange-500 border-opacity-20 last:border-b-0">
                  {/* Rank */}
                  <div className="w-12 sm:w-16">
                    <span className="text-orange-400 font-bold text-base sm:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Team */}
                  <div className="flex-1 flex items-center space-x-2 sm:space-x-4">
                    <div className="flex-shrink-0">
                      {team.logo?.url ? (
                        <img
                          src={team.logo.url}
                          alt={team.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-orange-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                            {team.name?.charAt(0) || 'T'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg truncate" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {team.name}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Battles Won */}
                  <div className="w-16 sm:w-20 lg:w-24 text-center">
                    <span className="text-green-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {team.matchesWon || 0}
                    </span>
                  </div>
                  
                  {/* Battles Lost */}
                  <div className="w-16 sm:w-20 lg:w-24 text-center">
                    <span className="text-red-400 font-medium text-sm sm:text-base lg:text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {team.matchesLost || 0}
                    </span>
                  </div>
                  
                  {/* Points */}
                  <div className="w-16 sm:w-20 text-center">
                    <span className="text-orange-400 font-bold text-base sm:text-lg lg:text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {team.points || 0}
                    </span>
                  </div>
                </div>
              ))}
              
              {teamsWithStats.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg">
                    No team data available
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-600">
              <Link
                to="/teams"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 lg:px-12 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-colors"
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                VIEW ALL TEAMS
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Videos Section */}
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="flex justify-between items-center mb-8 sm:mb-12">
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold italic" style={{fontFamily: 'Avantique, sans-serif'}}>FEATURED VIDEOS</h2>
          </div>
          
          {/* Video Navigation Dots */}
          <div className="flex justify-center items-center mb-6 sm:mb-8 space-x-1 sm:space-x-2 overflow-x-auto pb-2">
            <button className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            {(() => {
              const totalSlides = Math.ceil(featuredVideos.length / 3);
              return Array.from({ length: totalSlides }, (_, index) => (
                <button
                  key={index}
                  onClick={() => goToVideoSlide(index)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold transition-colors flex-shrink-0 ${
                    index === currentVideoSlide
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  <span className="text-xs sm:text-sm lg:text-base">{index + 1}</span>
                </button>
              ));
            })()}
          </div>
          
          {/* Video Slider */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentVideoSlide * 100}%)` }}
            >
              {(() => {
                // Use only real videos from database
                const videosToShow = featuredVideos;
                
                if (videosToShow.length === 0) {
                  return (
                    <div className="w-full flex-shrink-0">
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-lg">
                          No videos available
                        </div>
                        <p className="text-gray-500 mt-2">
                          Check back later for featured videos and match highlights.
                        </p>
                      </div>
                    </div>
                  );
                }
                
                const slides = [];
                const totalSlides = Math.ceil(videosToShow.length / 3);
                
                for (let i = 0; i < totalSlides; i++) {
                  const slideVideos = videosToShow.slice(i * 3, (i * 3) + 3);
                  slides.push(
                    <div key={i} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        {slideVideos.map((video, index) => {
                          if (!video) return null;
                          const videoId = extractVideoId(video.youtubeUrl);
                          
                          return (
                            <div key={video.id} className="video-card group cursor-pointer">
                              <a
                                href={video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl mb-4 sm:mb-6 h-48 sm:h-64 lg:h-80">
                                  {videoId ? (
                                    <img
                                      src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                      alt={video.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                      <span className="text-gray-400 text-sm">Video Thumbnail</span>
                                    </div>
                                  )}
                                  
                                  {/* Play Button Overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all duration-300">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                      <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                  
                                  {/* Video Type Badge */}
                                  <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                                    <span className="bg-orange-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      {video.type === 'featured' ? 'FEATURED' : 'MATCH'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="px-1 sm:px-2">
                                  <h3 className="text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight group-hover:text-orange-300 transition-colors" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {video.title.toUpperCase()}
                                  </h3>
                                  {video.description && (
                                    <p className="text-gray-300 text-xs sm:text-sm mt-1 sm:mt-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      {video.description}
                                    </p>
                                  )}
                                </div>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return slides;
              })()}
            </div>
          </div>
          
          <div className="text-center mt-8 sm:mt-12">
            <Link
              to="/videos"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 lg:px-12 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-colors"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              VIEW ALL VIDEOS
            </Link>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
