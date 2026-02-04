import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import PhotoUpload from '../components/PhotoUpload';
import AadharUpload from '../components/AadharUpload';
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

export default function HplPlayerRegistration() {
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
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredPlayerId, setRegisteredPlayerId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [submitError, setSubmitError] = useState(''); // Add error state for form errors
  
  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Form state variables
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    emailId: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: '',
    singlesRating: '',
    doublesRating: '',
    singlesReliabilityScore: '',
    doublesReliabilityScore: '',
    duprId: '',
    aadharData: null, // Will contain { file, cloudinaryUrl, cloudinaryPublicId, previewUrl, fileName, fileType }
    dilemma1: '',
    dilemma2: '',
    dilemma3: '',
    whyPickYou: '',
    leagueCommitment: false,
    registrationFee: false,
    photoData: null // Will contain { file, cloudinaryUrl, cloudinaryPublicId, previewUrl }
  });
  
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

  // Countdown timer effect for success modal
  useEffect(() => {
    let timer;
    if (showSubmissionModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (showSubmissionModal && countdown === 0) {
      // Redirect to player profile
      if (registeredPlayerId) {
        navigate(`/player-profile/${registeredPlayerId}`);
      }
    }
    return () => clearTimeout(timer);
  }, [showSubmissionModal, countdown, registeredPlayerId, navigate]);

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

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation function
  const isValidPassword = (password) => {
    // At least 8 characters, contains at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

  // Check if passwords match
  const doPasswordsMatch = () => {
    return formData.password === formData.confirmPassword && formData.password.length > 0;
  };

  // Hash password using Web Crypto API
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Generate 4-digit OTP
  const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Handle email verification
  const handleEmailVerification = async () => {
    if (!isValidEmail(formData.emailId)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsVerifyingEmail(true);
    
    try {
      // Firebase project ID from .firebaserc
      const projectId = 'pickleball-app-9ccf7';
      
      // Try to call Firebase Function to send OTP email
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/sendOtpEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.emailId
        })
      });

      if (!response.ok) {
        throw new Error('Firebase Function not deployed yet');
      }

      const result = await response.json();

      if (result.status === 'success') {
        alert(`OTP sent to ${formData.emailId}. Please check your email.`);
        setShowOtpModal(true);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Fallback: Generate OTP locally for testing until Firebase Functions are set up
      const newOtp = generateOtp();
      setGeneratedOtp(newOtp);
      
      alert(`⚠️ Email service not configured yet.\n\nFor testing, use this OTP: ${newOtp}\n\nTo enable real emails, follow the setup guide in EMAIL_OTP_SETUP.md`);
      setShowOtpModal(true);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle OTP verification
  const handleOtpVerification = async () => {
    const enteredOtp = otp.join('');
    
    if (enteredOtp.length !== 4) {
      alert('Please enter the complete 4-digit OTP.');
      return;
    }
    
    setIsVerifyingOtp(true);
    
    try {
      // Query Firestore directly to verify OTP - simplified query to avoid complex index
      const otpQuery = query(
        collection(db, 'email-otps'),
        where('email', '==', formData.emailId)
      );
      
      const querySnapshot = await getDocs(otpQuery);
      
      if (!querySnapshot.empty) {
        // Find the matching OTP and check if it's still valid
        let validOtpFound = false;
        
        for (const doc of querySnapshot.docs) {
          const otpData = doc.data();
          
          // Check if OTP matches and is still valid (within 10 minutes)
          if (otpData.otp === enteredOtp) {
            const otpCreatedAt = otpData.createdAt.toDate();
            const now = new Date();
            const timeDifference = (now - otpCreatedAt) / (1000 * 60); // in minutes
            
            if (timeDifference <= 10) {
              // OTP is valid
              validOtpFound = true;
              setIsEmailVerified(true);
              setShowOtpModal(false);
              setOtp(['', '', '', '']);
              alert('Email verified successfully!');
              break;
            }
          }
        }
        
        if (!validOtpFound) {
          alert('Invalid or expired OTP. Please try again.');
        }
      } else {
        alert('No OTP found for this email. Please request a new one.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Error verifying OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Close OTP modal
  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtp(['', '', '', '']);
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    // Debug: Log dilemma changes
    if (field.startsWith('dilemma')) {
      console.log(`Dilemma field changed: ${field} = ${value}`);
    }
    
    // Reset email verification if email changes
    if (field === 'emailId' && value !== formData.emailId) {
      setIsEmailVerified(false);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle photo upload with Cloudinary data
  const handlePhotoChange = (photoData) => {
    setFormData(prev => ({
      ...prev,
      photoData: photoData // Contains { file, cloudinaryUrl, cloudinaryPublicId, previewUrl }
    }));
  };

  // Handle Aadhar upload with Cloudinary data
  const handleAadharChange = (aadharData) => {
    setFormData(prev => ({
      ...prev,
      aadharData: aadharData // Contains { file, cloudinaryUrl, cloudinaryPublicId, previewUrl, fileName, fileType }
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      // Reset any previous errors
      setSubmitError('');
      
      if (!formData.fullName || !formData.mobileNumber || !formData.emailId ||
          !formData.password || !formData.confirmPassword || !formData.gender ||
          !formData.dateOfBirth || !formData.singlesRating || !formData.doublesRating ||
          !formData.singlesReliabilityScore || !formData.doublesReliabilityScore ||
          !formData.whyPickYou || !formData.leagueCommitment || !formData.registrationFee) {
        setSubmitError('Please fill in all required fields and accept the acknowledgements.');
        setIsSubmitting(false);
        return;
      }

      // Validate email verification
      if (!isEmailVerified) {
        setSubmitError('Please verify your email address before submitting the form.');
        setIsSubmitting(false);
        return;
      }

      // Validate password requirements
      if (!isValidPassword(formData.password)) {
        setSubmitError('Password must be at least 8 characters long and contain both letters and numbers.');
        setIsSubmitting(false);
        return;
      }

      // Validate password confirmation
      if (!doPasswordsMatch()) {
        setSubmitError('Passwords do not match. Please check and try again.');
        setIsSubmitting(false);
        return;
      }

      // Validate photo upload
      if (!formData.photoData) {
        setSubmitError('Please upload a photo to complete your registration.');
        setIsSubmitting(false);
        return;
      }

      // Validate Aadhar upload
      if (!formData.aadharData) {
        setSubmitError('Please upload your Aadhar card to complete your registration.');
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate DUPR ID submissions
      if (formData.duprId && formData.duprId.trim()) {
        try {
          const duplicateQuery = query(
            collection(db, 'clubs-players'),
            where('duprId', '==', formData.duprId.trim())
          );
          const duplicateSnapshot = await getDocs(duplicateQuery);
          
          if (!duplicateSnapshot.empty) {
            setSubmitError('A player with this DUPR ID has already registered. Each DUPR ID can only be used once.');
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          console.error('Error checking for duplicate DUPR ID:', error);
          alert('Error validating registration. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Check for duplicate email submissions as additional protection
      try {
        const emailQuery = query(
          collection(db, 'clubs-players'),
          where('emailId', '==', formData.emailId.trim())
        );
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          setSubmitError('A player with this email address has already registered. Each email can only be used once.');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('Error checking for duplicate email:', error);
        setSubmitError('Error validating registration. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Validate mobile number is exactly 10 digits
      const mobileNumber = formData.mobileNumber.trim();
      if (!/^\d{10}$/.test(mobileNumber)) {
        setSubmitError('Mobile number must be exactly 10 digits.');
        setIsSubmitting(false);
        return;
      }

      // Format date to DD-MM-YYYY for storage
      const dateParts = formData.dateOfBirth.split('-'); // Input format is YYYY-MM-DD
      const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Convert to DD-MM-YYYY

      // Debug: Log form data before saving
      console.log('Form data before saving:', formData);
      
      // Hash the password before saving
      const hashedPassword = await hashPassword(formData.password);
      
      // Prepare data for Firebase
      const playerData = {
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        emailId: formData.emailId.trim(),
        password: hashedPassword, // Store hashed password in database
        gender: formData.gender,
        dateOfBirth: formattedDate,
        singlesRating: formData.singlesRating.trim(),
        doublesRating: formData.doublesRating.trim(),
        singlesReliabilityScore: formData.singlesReliabilityScore.trim(),
        doublesReliabilityScore: formData.doublesReliabilityScore.trim(),
        duprId: formData.duprId.trim(),
        dilemma1: formData.dilemma1 || '', // Ensure it's not undefined
        dilemma2: formData.dilemma2 || '', // Ensure it's not undefined
        dilemma3: formData.dilemma3 || '', // Ensure it's not undefined
        whyPickYou: formData.whyPickYou.trim(),
        leagueCommitment: formData.leagueCommitment,
        registrationFee: formData.registrationFee,
        // Store Cloudinary photo data
        photoUrl: formData.photoData.cloudinaryUrl,
        photoPublicId: formData.photoData.cloudinaryPublicId,
        photoFileName: formData.photoData.file.name,
        photoFileSize: formData.photoData.file.size,
        // Store Cloudinary Aadhar document data
        aadharUrl: formData.aadharData.cloudinaryUrl,
        aadharPublicId: formData.aadharData.cloudinaryPublicId,
        aadharFileName: formData.aadharData.fileName,
        aadharFileType: formData.aadharData.fileType,
        aadharFileSize: formData.aadharData.file.size,
        status: 'pending', // Default status
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Debug: Log player data before saving
      console.log('Player data being saved to Firebase:', playerData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'clubs-players'), playerData);
      console.log('Player registration saved with ID: ', docRef.id);
      
      // Store the player ID and show success modal
      setRegisteredPlayerId(docRef.id);
      setShowSubmissionModal(true);
      setCountdown(5); // Reset countdown
      
      // Reset form
      setFormData({
        fullName: '',
        mobileNumber: '',
        emailId: '',
        password: '',
        confirmPassword: '',
        gender: '',
        dateOfBirth: '',
        singlesRating: '',
        doublesRating: '',
        singlesReliabilityScore: '',
        doublesReliabilityScore: '',
        duprId: '',
        aadharData: null,
        dilemma1: '',
        dilemma2: '',
        dilemma3: '',
        whyPickYou: '',
        leagueCommitment: false,
        registrationFee: false,
        photoData: null
      });
      
      // Reset email verification status
      setIsEmailVerified(false);
      
    } catch (error) {
      console.error('Error saving player registration:', error);
      setSubmitError('There was an error submitting your registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowSubmissionModal(false);
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

      {/* Player Registration Form Section */}
      <div className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto px-6 sm:px-8 lg:px-12 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="space-y-8 lg:space-y-12">
            {/* Title */}
            <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold italic leading-tight" style={{fontFamily: 'Avantique, sans-serif'}}>
              PLAYER REGISTRATION FORM
            </h1>
            
            {/* Welcome Content */}
            <div className="space-y-6 lg:space-y-8 text-white max-w-6xl">
              <h2 className="text-orange-400 text-xl sm:text-2xl lg:text-3xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                Welcome
              </h2>
              
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                This is a club-based, season-long league built around community and identity.
              </p>
              
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                Register here to be part of the HPL Club League player pool.
              </p>
              
              <p className="text-base sm:text-lg lg:text-xl leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                Clubs will review profiles and send invitations.
              </p>
              
              <p className="text-orange-400 text-base sm:text-lg lg:text-xl font-semibold leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                You choose where you belong.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Form Section */}
      <div className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto px-6 sm:px-8 lg:px-12 max-w-full sm:max-w-none lg:max-w-none xl:max-w-[1600px]">
          <div className="space-y-8 lg:space-y-12">
            {/* Form */}
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* BASIC DETAILS Section */}
              <div className="space-y-6">
                <h3 className="text-orange-400 text-xl sm:text-2xl lg:text-3xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  BASIC DETAILS
                </h3>
                
                {/* Full Name and Mobile Number */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Short answer"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter 10 digit mobile number"
                      value={formData.mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        if (value.length <= 10) {
                          handleInputChange('mobileNumber', value);
                        }
                      }}
                      maxLength="10"
                      pattern="[0-9]{10}"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>
                </div>

                {/* Email ID and Gender */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        placeholder="Email"
                        value={formData.emailId}
                        onChange={(e) => handleInputChange('emailId', e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        style={{fontFamily: 'Avantique, sans-serif'}}
                        required
                      />
                      {isValidEmail(formData.emailId) && !isEmailVerified && (
                        <button
                          type="button"
                          onClick={handleEmailVerification}
                          disabled={isVerifyingEmail}
                          className={`${isVerifyingEmail ? 'bg-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap`}
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        >
                          {isVerifyingEmail ? 'Sending...' : 'Verify'}
                        </button>
                      )}
                      {isEmailVerified && (
                        <div className="flex items-center px-4 py-3 bg-green-600 text-white rounded-lg">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span className="font-medium whitespace-nowrap" style={{fontFamily: 'Avantique, sans-serif'}}>Verified</span>
                        </div>
                      )}
                    </div>
                    {isEmailVerified && (
                      <p className="text-green-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                        ✓ Email verified successfully
                      </p>
                    )}
                  </div>
               </div>

               {/* Password and Confirm Password */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                 <div className="space-y-3">
                   <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                     Password <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="password"
                     placeholder="Enter password"
                     value={formData.password}
                     onChange={(e) => handleInputChange('password', e.target.value)}
                     className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                     style={{fontFamily: 'Avantique, sans-serif'}}
                     required
                   />
                   {formData.password && !isValidPassword(formData.password) && (
                     <p className="text-red-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                       Password must be at least 8 characters with letters and numbers
                     </p>
                   )}
                   {formData.password && isValidPassword(formData.password) && (
                     <p className="text-green-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                       ✓ Password meets requirements
                     </p>
                   )}
                 </div>

                 <div className="space-y-3">
                   <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                     Confirm Password <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="password"
                     placeholder="Confirm password"
                     value={formData.confirmPassword}
                     onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                     className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                     style={{fontFamily: 'Avantique, sans-serif'}}
                     required
                   />
                   {formData.confirmPassword && !doPasswordsMatch() && (
                     <p className="text-red-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                       Passwords do not match
                     </p>
                   )}
                   {formData.confirmPassword && doPasswordsMatch() && (
                     <p className="text-green-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                       ✓ Passwords match
                     </p>
                   )}
                 </div>
               </div>

               {/* Gender */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                          required
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Male
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                          required
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Female
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{
                        fontFamily: 'Avantique, sans-serif',
                        colorScheme: 'dark'
                      }}
                      required
                    />
                    <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Format: DD-MM-YYYY
                    </p>
                  </div>
                  <div></div>
                </div>

                {/* Photo Upload */}
                <PhotoUpload
                  onPhotoChange={handlePhotoChange}
                  currentPhoto={formData.photoData?.file}
                  currentPreview={formData.photoData?.previewUrl}
                />
              </div>

              {/* ELIGIBILITY Section */}
              <div className="space-y-6">
                <h3 className="text-orange-400 text-xl sm:text-2xl lg:text-3xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  ELIGIBILITY
                </h3>
                
                {/* DUPR Ratings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Singles Rating */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      DUPR Singles Rating <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter rating or NA"
                      value={formData.singlesRating}
                      onChange={(e) => handleInputChange('singlesRating', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>

                  {/* Doubles Rating */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      DUPR Doubles Rating <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter rating or NA"
                      value={formData.doublesRating}
                      onChange={(e) => handleInputChange('doublesRating', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>
                </div>

                {/* Reliability Scores Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Singles Reliability Score */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      DUPR Singles Reliability Score <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reliability score or NA"
                      value={formData.singlesReliabilityScore}
                      onChange={(e) => handleInputChange('singlesReliabilityScore', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>

                  {/* Doubles Reliability Score */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      DUPR Doubles Reliability Score <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reliability score or NA"
                      value={formData.doublesReliabilityScore}
                      onChange={(e) => handleInputChange('doublesReliabilityScore', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    />
                  </div>
                </div>

                {/* Eligibility Note */}
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Only players with DUPR 4.2 or below at the time of registration form release are eligible to apply. If you don't have a rating or reliability score, please enter "NA".
                  </p>
                </div>

                {/* DUPR ID Question */}
                <div className="space-y-3">
                  <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                    What is your DUPR ID? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Short answer"
                    value={formData.duprId}
                    onChange={(e) => handleInputChange('duprId', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                </div>

                {/* Aadhar Upload */}
                <AadharUpload
                  onAadharChange={handleAadharChange}
                  currentAadhar={formData.aadharData}
                  currentPreview={formData.aadharData?.previewUrl}
                />
              </div>

              {/* EVERYDAY DILEMMAS Section */}
              <div className="space-y-6">
                <h3 className="text-orange-400 text-xl sm:text-2xl lg:text-3xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  🧠 A FEW EVERYDAY DILEMMAS
                </h3>
                <p className="text-gray-400 text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                  (There are no right answers — just choose what feels most natural to you)
                </p>
                
                {/* Questions 6, 7, 8 in 2-column grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Question 9 */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      You're driving a bus with no passengers. Ahead, the road is blocked. <span className="text-red-500">*</span>
                    </label>
                    <div className="ml-4 space-y-2 text-white text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      <p>• If you keep going, the bus will be badly damaged.</p>
                      <p>• If you swerve, you'll damage a small roadside shop.</p>
                      <p className="font-medium">What feels right?</p>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma1"
                          value="stay-course"
                          checked={formData.dilemma1 === 'stay-course'}
                          onChange={(e) => handleInputChange('dilemma1', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Stay on course — avoid causing harm directly
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma1"
                          value="swerve"
                          checked={formData.dilemma1 === 'swerve'}
                          onChange={(e) => handleInputChange('dilemma1', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Swerve — minimise overall damage
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma1"
                          value="stop"
                          checked={formData.dilemma1 === 'stop'}
                          onChange={(e) => handleInputChange('dilemma1', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Stop and accept whatever happens next
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma1"
                          value="depends"
                          checked={formData.dilemma1 === 'depends'}
                          onChange={(e) => handleInputChange('dilemma1', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          It depends on how serious the damage is
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Question 10 */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      You have one extra ticket to an event. <span className="text-red-500">*</span>
                    </label>
                    <div className="ml-4 space-y-2 text-white text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      <p>• One friend really wants it.</p>
                      <p>• Another friend would benefit more from it.</p>
                      <p className="font-medium">What do you do?</p>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma2"
                          value="wants-more"
                          checked={formData.dilemma2 === 'wants-more'}
                          onChange={(e) => handleInputChange('dilemma2', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Give it to the one who wants it more
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma2"
                          value="needs-more"
                          checked={formData.dilemma2 === 'needs-more'}
                          onChange={(e) => handleInputChange('dilemma2', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Give it to the one who needs it more
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma2"
                          value="first-asked"
                          checked={formData.dilemma2 === 'first-asked'}
                          onChange={(e) => handleInputChange('dilemma2', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Decide based on who asked first
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma2"
                          value="another-solution"
                          checked={formData.dilemma2 === 'another-solution'}
                          onChange={(e) => handleInputChange('dilemma2', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Try to find another solution
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Questions 15 and 16 in 2-column grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Question 15 */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      You know a group decision is slightly flawed. <span className="text-red-500">*</span>
                    </label>
                    <div className="ml-4 space-y-2 text-white text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      <p>Pointing it out may create tension, but staying quiet keeps things smooth.</p>
                      <p className="font-medium">What do you do?</p>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma3"
                          value="speak-up"
                          checked={formData.dilemma3 === 'speak-up'}
                          onChange={(e) => handleInputChange('dilemma3', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Speak up — correctness matters
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma3"
                          value="stay-quiet"
                          checked={formData.dilemma3 === 'stay-quiet'}
                          onChange={(e) => handleInputChange('dilemma3', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Stay quiet — harmony matters
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma3"
                          value="speak-private"
                          checked={formData.dilemma3 === 'speak-private'}
                          onChange={(e) => handleInputChange('dilemma3', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Speak up later in private
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="dilemma3"
                          value="depends-flaw"
                          checked={formData.dilemma3 === 'depends-flaw'}
                          onChange={(e) => handleInputChange('dilemma3', e.target.value)}
                          className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Decide based on how big the flaw is
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Question 16 */}
                  <div className="space-y-3">
                    <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Why should a club pick you? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Think beyond skill. What do you bring as a teammate over a season?
                    </p>
                    <textarea
                      rows="4"
                      placeholder="Long answer (3–5 lines recommended)"
                      value={formData.whyPickYou}
                      onChange={(e) => handleInputChange('whyPickYou', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-vertical"
                      style={{fontFamily: 'Avantique, sans-serif'}}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* FINAL ACKNOWLEDGEMENTS Section */}
              <div className="space-y-6">
                <h3 className="text-orange-400 text-xl sm:text-2xl lg:text-3xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  FINAL ACKNOWLEDGEMENTS
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.leagueCommitment}
                      onChange={(e) => handleInputChange('leagueCommitment', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      required
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      <strong>League Commitment</strong><br />
                      I understand that selection into a club does not guarantee playing time and that final decisions rest with the club.
                    </span>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.registrationFee}
                      onChange={(e) => handleInputChange('registrationFee', e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      required
                    />
                    <span className="text-white text-base" style={{fontFamily: 'Avantique, sans-serif'}}>
                      <strong>Player Registration Fee</strong><br />
                      I understand that if selected, I will be required to pay a ₹5,000 player registration fee to confirm my place.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8 flex flex-col items-end space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:scale-105'} text-white px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform shadow-2xl uppercase`}
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

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center space-y-6">
              {/* Title */}
              <h3 className="text-orange-400 text-2xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                Verify Your Email
              </h3>
              
              {/* Message */}
              <div className="space-y-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p>We've sent a 4-digit verification code to:</p>
                <p className="text-orange-400 font-semibold">{formData.emailId}</p>
                <p>Please enter the code below:</p>
              </div>
              
              {/* OTP Input Fields */}
              <div className="flex justify-center space-x-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && index > 0) {
                        const prevInput = document.getElementById(`otp-${index - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    className="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  />
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={closeOtpModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOtpVerification}
                  disabled={isVerifyingOtp || otp.join('').length !== 4}
                  className={`${isVerifyingOtp || otp.join('').length !== 4 ? 'bg-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white px-6 py-3 rounded-lg font-medium transition-colors`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              
              {/* Resend Option */}
              <div className="text-center">
                <button
                  onClick={handleEmailVerification}
                  disabled={isVerifyingEmail}
                  className="text-orange-400 hover:text-orange-300 text-sm underline transition-colors"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {isVerifyingEmail ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Success Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-orange-400 text-2xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                Registration Successful!
              </h3>
              
              {/* Message */}
              <div className="space-y-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p>You're now part of the HPL Club League player pool.</p>
                <p>Clubs will review profiles and send invitations through the platform.</p>
                <p>Keep an eye on your dashboard.</p>
                <p className="text-orange-400 font-semibold">Welcome to club sport.</p>
                <p className="text-orange-400 font-semibold">The game grows up.</p>
              </div>

              {/* Timer and Redirect Message */}
              <div className="space-y-4">
                <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                  We are moving you to your player profile page in {countdown} seconds
                </p>
                
                {/* Circular Timer */}
                <div className="mx-auto w-16 h-16 relative">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-600"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (countdown / 5)}`}
                      className="text-orange-500 transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {countdown}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105"
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
