import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    password: '',
    confirmPassword: '',
    clubDescription: '',
    communityExistence: '',
    whyJoinLeague: '',
    winningVsCulture: '',
    clubFeeling: '',
    venueAccess: '',
    venueName: '',
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [submittedClubId, setSubmittedClubId] = useState(null);
  
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

  // Countdown timer effect for success modal
  useEffect(() => {
    let timer;
    if (showSuccessModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (showSuccessModal && countdown === 0 && submittedClubId) {
      // Redirect to club profile page
      navigate(`/club-profile/${submittedClubId}`);
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown, submittedClubId, navigate]);

  // Password validation functions
  const isValidPassword = (password) => {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return password.length >= minLength && hasLetter && hasNumber;
  };

  const doPasswordsMatch = () => {
    return formData.password === formData.confirmPassword;
  };

  // Password encryption function
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Function to check for duplicate registrations
  const checkForDuplicates = async (phoneNumber, emailId) => {
    try {
      // Check for duplicate phone number
      const phoneQuery = query(
        collection(db, 'hpl-clubs'),
        where('phoneNumber', '==', phoneNumber)
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        return {
          isDuplicate: true,
          message: 'A club registration already exists with this phone number. Please use a different phone number.'
        };
      }

      // Check for duplicate email ID
      const emailQuery = query(
        collection(db, 'hpl-clubs'),
        where('emailId', '==', emailId)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return {
          isDuplicate: true,
          message: 'A club registration already exists with this email address. Please use a different email address.'
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // If there's an error checking, allow the submission to proceed
      return { isDuplicate: false };
    }
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
      'emailId',
      'password',
      'confirmPassword',
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

    // Check password validation
    if (!isValidPassword(formData.password)) {
      return 'Password must be at least 8 characters long and contain both letters and numbers';
    }

    // Check password confirmation
    if (!doPasswordsMatch()) {
      return 'Passwords do not match';
    }

    // Check required array fields
    for (const field of requiredArrayFields) {
      if (!formData[field] || formData[field].length === 0) {
        return `Please complete the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    }

    // Check that all final declarations are checked (should be 5)
    if (formData.finalDeclarations.length !== 5) {
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
      // Check for duplicate registrations
      const duplicateCheck = await checkForDuplicates(formData.phoneNumber, formData.emailId);
      if (duplicateCheck.isDuplicate) {
        setSubmitError(duplicateCheck.message);
        setIsSubmitting(false);
        return;
      }

      // Show payment modal instead of directly submitting
      setIsSubmitting(false);
      setShowPaymentModal(true);

    } catch (error) {
      console.error('Error validating form:', error);
      setSubmitError('Failed to validate form. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Function to handle successful payment and submit to database
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setPaymentProcessing(true);
      console.log('Processing payment success:', paymentData);
      
      // Hash the password before saving
      const hashedPassword = await hashPassword(formData.password || 'defaultPassword');
      
      // Prepare data for Firebase (exclude confirmPassword, include hashed password and payment info)
      const { confirmPassword, password, ...otherData } = formData;
      const submissionData = {
        ...otherData,
        password: hashedPassword,
        submittedAt: serverTimestamp(),
        status: 'pending',
        paymentInfo: {
          paymentId: paymentData.razorpay_payment_id || 'test_payment_id',
          orderId: paymentData.razorpay_order_id || 'test_order_id',
          signature: paymentData.razorpay_signature || 'test_signature',
          amount: 500000, // Rs. 5000 in paise
          currency: 'INR',
          paidAt: serverTimestamp(),
          paymentMethod: 'razorpay'
        }
      };

      console.log('Submitting data to Firebase:', submissionData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'hpl-clubs'), submissionData);
      
      console.log('Successfully saved to Firebase with ID:', docRef.id);
      
      // Store the club ID for redirection
      setSubmittedClubId(docRef.id);
      
      // Hide payment modal and show success modal
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setCountdown(5);
      
      // Reset form after successful submission
      setFormData({
        proposedClubName: '',
        primaryOwnerName: '',
        clubNamingFormat: '',
        phoneNumber: '',
        emailId: '',
        password: '',
        confirmPassword: '',
        clubDescription: '',
        communityExistence: '',
        whyJoinLeague: '',
        winningVsCulture: '',
        clubFeeling: '',
        venueAccess: '',
        venueName: '',
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
      console.error('Error submitting form after payment:', error);
      setSubmitError(`Payment successful but failed to submit form: ${error.message}. Please contact support with payment ID: ${paymentData.razorpay_payment_id || 'N/A'}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Function to handle Razorpay payment
  const handlePayment = async () => {
    setPaymentProcessing(true);

    // For development/testing purposes, let's create a mock payment flow
    // This simulates a successful payment without actually processing through Razorpay
    try {
      console.log('Starting mock payment process...');
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock payment data
      const mockPaymentData = {
        razorpay_payment_id: 'pay_test_' + Date.now(),
        razorpay_order_id: 'order_test_' + Date.now(),
        razorpay_signature: 'test_signature_' + Date.now()
      };
      
      console.log('Mock payment successful:', mockPaymentData);
      
      // Process the successful payment
      handlePaymentSuccess(mockPaymentData);
      
    } catch (error) {
      console.error('Mock payment error:', error);
      setPaymentProcessing(false);
      setSubmitError('Payment processing failed. Please try again.');
    }
  };

  // Alternative function for real Razorpay integration (commented out for now)
  const handleRazorpayPayment = async () => {
    // Check if Razorpay is loaded
    if (!window.Razorpay) {
      setSubmitError('Payment gateway not loaded. Please refresh the page and try again.');
      setPaymentProcessing(false);
      return;
    }

    setPaymentProcessing(true);

    try {
      const options = {
        key: 'rzp_live_SBc21pvQK1l6sZ',
        amount: 500000,
        currency: 'INR',
        name: 'HPL Club Registration',
        description: 'Club Registration Fee - Refundable if application is rejected',
        handler: function (response) {
          console.log('Payment successful:', response);
          handlePaymentSuccess(response);
        },
        prefill: {
          name: formData.primaryOwnerName || 'Test User',
          email: formData.emailId || 'test@example.com',
          contact: formData.phoneNumber || '9999999999'
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(false);
            console.log('Payment modal dismissed by user');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setPaymentProcessing(false);
        setSubmitError(`Payment failed: ${response.error.description || 'Please try again'}`);
      });

      rzp.open();
    } catch (error) {
      console.error('Error initializing Razorpay:', error);
      setPaymentProcessing(false);
      setSubmitError('Failed to initialize payment gateway. Please try again.');
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

      {/* Registration Form Section */}
      <div className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto px-6 sm:px-8 lg:px-12 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="space-y-8 lg:space-y-12">
            {/* Form Title */}
            <h2 className="text-gray-400 text-2xl sm:text-3xl lg:text-4xl font-bold italic leading-tight" style={{fontFamily: 'Avantique, sans-serif'}}>
              REGISTRATION FORM
            </h2>
            
            {/* Form */}
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Success Message */}
              {submitSuccess && (
                <div className="bg-green-600 text-white p-4 rounded-lg mb-6">
                  <p className="font-semibold">Registration submitted successfully!</p>
                  <p>Thank you for your application. We will review it and get back to you soon.</p>
                </div>
              )}


              {/* First Row - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Proposed Club Name */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Proposed Club / Community Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.proposedClubName}
                    onChange={(e) => handleInputChange('proposedClubName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                </div>

                {/* Primary Owner Name */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Name of Primary Owner / Lead <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Primary Owner"
                    value={formData.primaryOwnerName}
                    onChange={(e) => handleInputChange('primaryOwnerName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                </div>
              </div>

              {/* Second Row - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Preferred Club Naming Format */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Preferred Club Naming Format: Mandatory Suffix (Select 1) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="PC"
                        checked={formData.clubNamingFormat === 'PC'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        PC (Pickleball Club)
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="PBC"
                        checked={formData.clubNamingFormat === 'PBC'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        PBC (Pickleball Center)
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Athletic"
                        checked={formData.clubNamingFormat === 'Athletic'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Athletic
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Academy"
                        checked={formData.clubNamingFormat === 'Academy'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Academy
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Collective"
                        checked={formData.clubNamingFormat === 'Collective'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Collective
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Crew"
                        checked={formData.clubNamingFormat === 'Crew'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Crew
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Union"
                        checked={formData.clubNamingFormat === 'Union'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Union
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="clubNamingFormat"
                        value="Social"
                        checked={formData.clubNamingFormat === 'Social'}
                        onChange={(e) => handleInputChange('clubNamingFormat', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Social
                      </span>
                    </label>
                  </div>
                </div>

                {/* Phone Number and Email */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Number"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Email ID"
                      value={formData.emailId}
                      onChange={(e) => handleInputChange('emailId', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                    />
                  </div>
                </div>
              </div>

              {/* Password Fields Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Password */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                  {formData.password && !isValidPassword(formData.password) && (
                    <p className="text-red-400 text-sm mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Password must be at least 8 characters with letters and numbers
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                  {formData.confirmPassword && !doPasswordsMatch() && (
                    <p className="text-red-400 text-sm mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>

              {/* Third Row - Two Dropdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What best describes your club or community today? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clubDescription}
                    onChange={(e) => handleInputChange('clubDescription', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    <option value="">Choose</option>
                    <option value="pickleball-venue">Pickleball venue</option>
                    <option value="residential-gated">Residential / gated community</option>
                    <option value="academy-training">Academy / training centre</option>
                    <option value="corporate-institutional">Corporate / institutional group</option>
                    <option value="independent-collective">Independent pickleball collective</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    How long has this community existed (formally or informally)? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.communityExistence}
                    onChange={(e) => handleInputChange('communityExistence', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    <option value="">Choose</option>
                    <option value="less-than-6-months">Less than 6 months</option>
                    <option value="6-12-months">6-12 months</option>
                    <option value="1-3-years">1-3 years</option>
                    <option value="3-plus-years">3+ years</option>
                  </select>
                </div>
              </div>

              {/* Fourth Row - Two Text Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Why do you want to own a team in the HPL Community League? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Your answer"
                    value={formData.whyJoinLeague}
                    onChange={(e) => handleInputChange('whyJoinLeague', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What excites you more: winning matches or building a culture? Why? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Your answer"
                    value={formData.winningVsCulture}
                    onChange={(e) => handleInputChange('winningVsCulture', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  ></textarea>
                </div>
              </div>

              {/* Fifth Row - Two Text Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    How will people feel inside your club? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Answer"
                    value={formData.clubFeeling}
                    onChange={(e) => handleInputChange('clubFeeling', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  ></textarea>
                </div>

              </div>

              {/* Sixth Row - Venue Access and Values */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Do you have access to a home venue for hosting matches? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="venue-access"
                        value="yes-confirmed"
                        checked={formData.venueAccess === 'yes-confirmed'}
                        onChange={(e) => handleInputChange('venueAccess', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Yes (confirmed)
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="venue-access"
                        value="in-progress"
                        checked={formData.venueAccess === 'in-progress'}
                        onChange={(e) => handleInputChange('venueAccess', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        In progress
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="venue-access"
                        value="not-yet"
                        checked={formData.venueAccess === 'not-yet'}
                        onChange={(e) => handleInputChange('venueAccess', e.target.value)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Not yet
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conditional Venue Name Field */}
                {formData.venueAccess === 'yes-confirmed' && (
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      What is the name of this venue? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Venue name"
                      value={formData.venueName}
                      onChange={(e) => handleInputChange('venueName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                    />
                  </div>
                )}
              </div>

              {/* Seventh Row - Community Manager and Phone */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Name of the Community Manager throughout the season? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Answer"
                    value={formData.communityManagerName}
                    onChange={(e) => handleInputChange('communityManagerName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Number"
                    value={formData.managerPhoneNumber}
                    onChange={(e) => handleInputChange('managerPhoneNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                </div>
              </div>

              {/* Eighth Row - Email and Player Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Email ID"
                    value={formData.managerEmailId}
                    onChange={(e) => handleInputChange('managerEmailId', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    How would you select players for your club? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerSelectionCriteria.includes('performance')}
                        onChange={(e) => handleCheckboxChange('playerSelectionCriteria', 'performance', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Performance</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerSelectionCriteria.includes('time-commitment')}
                        onChange={(e) => handleCheckboxChange('playerSelectionCriteria', 'time-commitment', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Time-Commitment</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerSelectionCriteria.includes('attitude-team-player')}
                        onChange={(e) => handleCheckboxChange('playerSelectionCriteria', 'attitude-team-player', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Attitude - Team Player</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerSelectionCriteria.includes('other')}
                        onChange={(e) => handleCheckboxChange('playerSelectionCriteria', 'other', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Other</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Ninth Row - Explain with word count */}
              <div className="space-y-3">
                <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Explain in 50 words, why any player should join your club. Think USPs. <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows="6"
                    placeholder="Provide detailed explanation..."
                    value={formData.clubUSP}
                    onChange={(e) => handleInputChange('clubUSP', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                    maxLength="500"
                  ></textarea>
                  <div className="absolute bottom-3 right-3 text-gray-400 text-sm">
                    50 words
                  </div>
                </div>
              </div>

              {/* Tenth Row - Two Dropdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What is your long term goal with the club? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.longTermGoals.includes('player-development')}
                        onChange={(e) => handleCheckboxChange('longTermGoals', 'player-development', e.target.checked)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Player Development
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.longTermGoals.includes('social-impact')}
                        onChange={(e) => handleCheckboxChange('longTermGoals', 'social-impact', e.target.checked)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Social Impact
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.longTermGoals.includes('fun-only')}
                        onChange={(e) => handleCheckboxChange('longTermGoals', 'fun-only', e.target.checked)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Fun & Fun only
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.longTermGoals.includes('other')}
                        onChange={(e) => handleCheckboxChange('longTermGoals', 'other', e.target.checked)}
                        className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Other
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What benefits will you give to your players? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerBenefits.includes('coaching')}
                        onChange={(e) => handleCheckboxChange('playerBenefits', 'coaching', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Coaching</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerBenefits.includes('socials')}
                        onChange={(e) => handleCheckboxChange('playerBenefits', 'socials', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Socials</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerBenefits.includes('equipment')}
                        onChange={(e) => handleCheckboxChange('playerBenefits', 'equipment', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Equipment</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playerBenefits.includes('others')}
                        onChange={(e) => {
                          handleCheckboxChange('playerBenefits', 'others', e.target.checked);
                          setShowOtherBenefits(e.target.checked);
                        }}
                        className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-white text-sm sm:text-base" style={{fontFamily: 'Avantique, sans-serif'}}>Others</span>
                    </label>
                    {showOtherBenefits && (
                      <div className="mt-3 ml-7">
                        <input
                          type="text"
                          placeholder="Please specify other benefits..."
                          value={formData.otherBenefits}
                          onChange={(e) => handleInputChange('otherBenefits', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Eleventh Row - Two Text Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What would be the unique thing about the fun culture in your club? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Answer"
                    value={formData.uniqueCulture}
                    onChange={(e) => handleInputChange('uniqueCulture', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Designated roles and responsibilities? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.rolesResponsibilities}
                    onChange={(e) => handleInputChange('rolesResponsibilities', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    <option value="">Select structure</option>
                    <option value="formal">Formal structure</option>
                    <option value="informal">Informal approach</option>
                    <option value="flexible">Flexible roles</option>
                    <option value="hierarchical">Hierarchical</option>
                  </select>
                </div>
              </div>

              {/* Final Text Area */}
              <div className="space-y-3">
                <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Anything else you'd like the league to know about you or your club? <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="Answer"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                ></textarea>
              </div>

              {/* Final Declaration */}
              <div className="space-y-6 pt-8">
                <h3 className="text-white text-xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  FINAL DECLARATION <span className="text-red-500">*</span>
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.finalDeclarations.includes('application-not-guarantee')}
                      onChange={(e) => handleCheckboxChange('finalDeclarations', 'application-not-guarantee', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      I understand that this is an application, not a guarantee of selection
                    </span>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.finalDeclarations.includes('uphold-rules-values')}
                      onChange={(e) => handleCheckboxChange('finalDeclarations', 'uphold-rules-values', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      I agree to uphold league rules, professionalism, and community values
                    </span>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.finalDeclarations.includes('governing-body-discretion')}
                      onChange={(e) => handleCheckboxChange('finalDeclarations', 'governing-body-discretion', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      I agree that all aspects of the league are at the discretion of the governing body
                    </span>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.finalDeclarations.includes('pay-registration-fee')}
                      onChange={(e) => handleCheckboxChange('finalDeclarations', 'pay-registration-fee', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      I agree to pay the club registration fee of Rs. 5000/- + Applicable taxes to submit my application. I understand that this amount will be refunded if my application is rejected.
                    </span>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.finalDeclarations.includes('pay-club-fee-if-approved')}
                      onChange={(e) => handleCheckboxChange('finalDeclarations', 'pay-club-fee-if-approved', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      If approved as a club, I agree to pay the club registration fee of Rs. 2,00,000/- + Applicable taxes.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8 flex flex-col items-end space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${
                    isSubmitting
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 hover:scale-105'
                  } text-white px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform shadow-2xl uppercase`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
                
                {/* Error Message - Now displayed below submit button */}
                {submitError && (
                  <div className="bg-red-600 text-white p-4 rounded-lg w-full">
                    <p className="font-semibold">Error:</p>
                    <p>{submitError}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                Complete Your Registration
              </h3>
              <div className="text-gray-700 space-y-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p className="text-lg font-semibold text-orange-600">Registration Fee: ₹5,000/-</p>
                <p className="text-sm">+ Applicable taxes</p>
                <div className="bg-orange-50 p-4 rounded-lg mt-4">
                  <p className="text-sm text-gray-600">
                    <strong>Important:</strong> This amount will be <span className="text-green-600 font-semibold">fully refunded</span> if your club application is rejected.
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  You are required to pay the club registration fee to submit your application.
                  This payment confirms your commitment to the HPL Community League.
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSubmitError('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-bold transition-colors"
                style={{fontFamily: 'Avantique, sans-serif'}}
                disabled={paymentProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleRazorpayPayment}
                disabled={paymentProcessing}
                className={`flex-1 ${
                  paymentProcessing
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                {paymentProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                Application Submitted Successfully!
              </h3>
              <div className="text-gray-700 space-y-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p>You have applied to be a part of HPL Clubs as a Club.</p>
                <p>HPL Admin will review your profile and send approval through the platform.</p>
                <p>Keep an eye on your dashboard.</p>
                <p className="font-semibold text-orange-600">Welcome to club sport.</p>
                <p className="font-semibold text-orange-600">The game grows up.</p>
                <div className="mt-6 flex items-center justify-center space-x-4">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray={`${((5 - countdown) / 5) * 100}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {countdown}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Redirecting to your club profile in {countdown} seconds...
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition-colors"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}