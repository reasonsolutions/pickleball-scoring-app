import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
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

export default function HplClubRegistration() {
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
  const [showOtherBenefits, setShowOtherBenefits] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    proposedClubName: '',
    primaryOwnerName: '',
    clubNamingFormat: '',
    phoneNumber: '',
    emailId: '',
    clubDescription: '',
    communityExistence: '',
    whyJoinLeague: '',
    winningVsCulture: '',
    clubFeeling: '',
    venueAccess: '',
    protectedValues: [],
    communityManagerName: '',
    managerPhoneNumber: '',
    managerEmailId: '',
    playerSelectionCriteria: [],
    clubUSP: '',
    longTermGoals: [],
    playerBenefits: [],
    otherBenefits: '',
    uniqueCulture: '',
    rolesResponsibilities: '',
    additionalInfo: '',
    finalDeclarations: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
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

  // Form handling functions
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      'proposedClubName',
      'primaryOwnerName',
      'clubNamingFormat',
      'phoneNumber',
      'communityManagerName',
      'managerPhoneNumber',
      'managerEmailId',
      'clubUSP',
      'uniqueCulture',
      'additionalInfo'
    ];

    const requiredArrayFields = [
      'finalDeclarations'
    ];

    // Check required text fields
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        return `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    }

    // Check required array fields
    for (const field of requiredArrayFields) {
      if (!formData[field] || formData[field].length === 0) {
        return `Please complete the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    }

    // Check that all final declarations are checked (should be 3)
    if (formData.finalDeclarations.length !== 3) {
      return 'Please accept all final declarations';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Prepare data for Firebase
      const submissionData = {
        ...formData,
        submittedAt: serverTimestamp(),
        status: 'pending' // You can add status tracking
      };

      // Save to Firebase
      await addDoc(collection(db, 'hpl-clubs'), submissionData);
      
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        proposedClubName: '',
        primaryOwnerName: '',
        clubNamingFormat: '',
        phoneNumber: '',
        emailId: '',
        clubDescription: '',
        communityExistence: '',
        whyJoinLeague: '',
        winningVsCulture: '',
        clubFeeling: '',
        venueAccess: '',
        protectedValues: [],
        communityManagerName: '',
        managerPhoneNumber: '',
        managerEmailId: '',
        playerSelectionCriteria: [],
        clubUSP: '',
        longTermGoals: [],
        playerBenefits: [],
        otherBenefits: '',
        uniqueCulture: '',
        rolesResponsibilities: '',
        additionalInfo: '',
        finalDeclarations: []
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Club Registration Form Section */}
      <div className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto px-6 sm:px-8 lg:px-12 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="space-y-8 lg:space-y-12">
            {/* Title */}
            <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold italic leading-tight" style={{fontFamily: 'Avantique, sans-serif'}}>
              CLUB REGISTRATION FORM
            </h1>
            
            {/* Content */}
            <div className="space-y-6 lg:space-y-8 text-white max-w-6xl">
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                The HPL Community League is a curated, club-led league designed to build strong pickleball communities across the city.
                HPL itself will continue to operate only its main league.
              </p>
              
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                Through the Community League, CentreCourt is extending a responsibility — to identify, empower, and work with clubs and community leaders who can build
                culture, uphold standards, and steward the sport locally.
              </p>
              
              <div className="space-y-4">
                <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                  This is not an open-entry tournament.
                </p>
                <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Approval is based on <span className="text-orange-400 font-semibold">intent, values, leadership maturity, and execution capability</span> — not just playing strength.
                </p>
              </div>
              
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                Submitting this application does not guarantee selection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}