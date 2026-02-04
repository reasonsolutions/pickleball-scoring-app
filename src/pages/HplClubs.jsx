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

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

// Import images
import hplLogo from '../assets/hpl_logo.png';
import hplClubsLogo from '../assets/hplclubs_logo.png';
import clubOwnerImage from '../assets/hplclubs/clubowner.png';
import clubsPlayerImage from '../assets/hplclubs/clubsplayer.jpeg';

export default function HplClubs() {
  // Add font styles
  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
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
  `;

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
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Club Information Section */}
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl bg-gradient-to-r from-orange-900 via-gray-900 to-black">
            {/* Hexagonal Pattern Background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff6b35' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '30px 30px'
              }}
            ></div>
            
            {/* Additional Hexagonal Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ff6b35' fill-opacity='0.3'%3E%3Cpolygon points='20,1 37,11 37,29 20,39 3,29 3,11'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '80px 80px',
                backgroundPosition: '40px 40px'
              }}
            ></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-6 sm:p-8 lg:p-12 space-y-6 lg:space-y-0 lg:space-x-12 xl:space-x-16">
              {/* Left Side - Logo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 flex items-center justify-center">
                  <img
                    src={hplClubsLogo}
                    alt="HPL Clubs Logo"
                    className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain"
                    onError={(e) => {
                      // Fallback to a simple HPL text if image fails
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center">
                    <span className="text-orange-500 font-bold text-lg sm:text-xl lg:text-2xl" style={{fontFamily: 'Avantique, sans-serif'}}>
                      HPL CLUBS
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle - Text Content */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <h2 className="text-orange-400 text-2xl sm:text-3xl lg:text-4xl font-bold italic leading-tight" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Read This Before Applying as<br />
                  <span className="text-orange-300">a Club or Player</span>
                </h2>
                <p className="text-white text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{fontFamily: 'Avantique, sans-serif'}}>
                  The HPL Club League is a grassroots, club-based pickleball competition designed to build long-term community, identity, and structure within the sport.
                </p>
              </div>

              {/* Right Side - Button */}
              <div className="flex-shrink-0">
                <Link to="/hpl-club-rules" className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg lg:text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl inline-block" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Read Rules
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Section */}
      <div className="py-8 sm:py-12 lg:py-16 relative">
        <div className="mx-auto px-4 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          {/* Background Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-gray-800 text-[8rem] sm:text-[12rem] lg:text-[16rem] xl:text-[20rem] font-black opacity-10 select-none" style={{fontFamily: 'Avantique, sans-serif'}}>
              CLUBS
            </h1>
          </div>

          {/* Registration Cards */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Club Registration Card */}
            <Link to="/hpl-club-registration" className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl aspect-square transform transition-all duration-300 group-hover:scale-105">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${clubOwnerImage})`
                  }}
                >
                </div>
                
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
                  {/* Top Section */}
                  <div>
                    <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      #HPLCLUBS
                    </h2>
                  </div>
                  
                  {/* Bottom Section */}
                  <div className="space-y-4">
                    <div className="p-4 sm:p-6">
                      <h3 className="text-xl sm:text-2xl lg:text-[3.5rem] font-bold" style={{fontFamily: 'Avantique, sans-serif', color: '#FE7743', lineHeight: '1.4'}}>
                        CLUB<br />
                        REGISTRATION
                      </h3>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex justify-end">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all duration-300">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Player Registration Card */}
            <Link to="/hpl-player-registration" className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl aspect-square transform transition-all duration-300 group-hover:scale-105">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${clubsPlayerImage})`
                  }}
                >
                </div>
                
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
                  {/* Top Section */}
                  <div>
                    <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      #HPLPLAYERS
                    </h2>
                  </div>
                  
                  {/* Bottom Section */}
                  <div className="space-y-4">
                    <div className="p-4 sm:p-6">
                      <h3 className="text-xl sm:text-2xl lg:text-[3.5rem] font-bold" style={{fontFamily: 'Avantique, sans-serif', color: '#FE7743', lineHeight: '1.4'}}>
                        PLAYER<br />
                        REGISTRATION
                      </h3>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex justify-end">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all duration-300">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}