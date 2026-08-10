import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

// Import background image
import mainDisplayBg from '../assets/maindisplay.png';

// Import default paddle logo as fallback
import paddleLogo from '../assets/paddle.png';

export default function VenueScreenDisplay() {
  const { tournamentId, venueName, dateString } = useParams();
  const decodedVenueName = venueName ? decodeURIComponent(venueName) : '';
  
  const [tournament, setTournament] = useState(null);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [liveMatch, setLiveMatch] = useState(null);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseReadCount, setFirebaseReadCount] = useState(0);
  
  // Ads Media state (videos and images)
  const [mediaItems, setMediaItems] = useState([]);
  
  // Dynamic logos state
  const [displayLogos, setDisplayLogos] = useState([]);
  const [bottomLogos, setBottomLogos] = useState([]);
  const [showAdsMedia, setShowAdsMedia] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [imageTimer, setImageTimer] = useState(null);
  
  // Team logos cache state
  const [teamLogosCache, setTeamLogosCache] = useState({});
  
  // Timeout timer state
  const [timeoutTimer, setTimeoutTimer] = useState(null);
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [timeoutStarted, setTimeoutStarted] = useState(false);
  
  // DRS video state
  const [isDRSVideoPlaying, setIsDRSVideoPlaying] = useState(false);
  const [drsVideoUrl, setDrsVideoUrl] = useState('');
  const [previousDisplayState, setPreviousDisplayState] = useState(null);
  
  // Featured image state
  const [showFeaturedImage, setShowFeaturedImage] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  
  // Team logos state for DRS
  const [team1Logo, setTeam1Logo] = useState(null);
  const [team2Logo, setTeam2Logo] = useState(null);
  
  // Team logos state for main display
  const [mainTeam1Logo, setMainTeam1Logo] = useState(null);
  const [mainTeam2Logo, setMainTeam2Logo] = useState(null);
  
  // Use refs to avoid recreating callbacks and triggering re-subscriptions
  const venueMatchesRef = useRef([]);
  const currentFixtureRef = useRef(null);
  const readCountRef = useRef(0);
  const listenersSetupRef = useRef(false);
  const timeoutIntervalRef = useRef(null);

  // Cleanup stale timeout data (only for non-live matches)
  const cleanupStaleTimeouts = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      console.log('🧹 Cleaning up stale timeout data...');
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', tournamentId)
      );
      
      const snapshot = await getDocs(fixturesQuery);
      const cleanupPromises = [];
      
      snapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const isLive = data.status === 'live' || data.status === 'in_progress';
        
        // Only cleanup timeouts for non-live matches
        if (data.timeoutInProgress && data.timeoutInProgress !== null && !isLive) {
          console.log(`🧹 Clearing stale timeout for non-live match: ${data.team1Name} vs ${data.team2Name} (status: ${data.status})`);
          cleanupPromises.push(
            updateDoc(doc(db, 'fixtures', docSnapshot.id), {
              timeoutInProgress: null
            })
          );
        }
      });
      
      if (cleanupPromises.length > 0) {
        await Promise.all(cleanupPromises);
        console.log(`🧹 Cleaned up ${cleanupPromises.length} stale timeouts`);
      } else {
        console.log('🧹 No stale timeouts found');
      }
    } catch (error) {
      console.error('Error cleaning up stale timeouts:', error);
    }
  }, [tournamentId]);

  // Stable increment function using ref
  const incrementFirebaseReads = useCallback((operation, details = '') => {
    console.log(`🔥 Firebase Read: ${operation} ${details}`);
    readCountRef.current++;
    
    // Update state every 10 reads to reduce re-renders
    if (readCountRef.current % 10 === 0) {
      setFirebaseReadCount(readCountRef.current);
    }
  }, []);

  // Extract video ID from YouTube URL
  const extractVideoId = useCallback((url) => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  }, []);

  // Check if URL is a direct video file (mp4, webm, etc.)
  const isDirectVideoUrl = useCallback((url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }, []);

  // Get current media item to display
  const getCurrentMediaItem = useCallback(() => {
    if (!showAdsMedia || mediaItems.length === 0) return null;
    return mediaItems[currentMediaIndex];
  }, [showAdsMedia, mediaItems, currentMediaIndex]);

  // Function to get team logo from cache
  const getTeamLogo = useCallback((teamName) => {
    if (!teamName) return paddleLogo;
    
    // Return from cache if available
    if (teamLogosCache[teamName]) {
      return teamLogosCache[teamName];
    }
    
    // Return default if not in cache yet
    return paddleLogo;
  }, [teamLogosCache]);
  
  // Function to fetch team logo from Firestore
  const fetchTeamLogo = useCallback(async (teamName) => {
    if (!teamName || teamLogosCache[teamName]) return;
    
    try {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('name', '==', teamName)
      );
      const snapshot = await getDocs(teamsQuery);
      
      if (snapshot.docs.length > 0) {
        const teamData = snapshot.docs[0].data();
        const logoUrl = teamData.logo?.url || teamData.logoUrl || paddleLogo;
        
        // Cache the logo
        setTeamLogosCache(prev => ({
          ...prev,
          [teamName]: logoUrl
        }));
      }
    } catch (error) {
      console.error('Error fetching team logo:', error);
    }
  }, [teamLogosCache]);

  // Helper function to determine if a match is singles or doubles
  const isDoublesMatch = useCallback((match) => {
    return match && (match.player2Team1 || match.player2Team2);
  }, []);

  // Helper function to render serve indicators (dots)
  const renderServeIndicators = useCallback((match, servingTeam) => {
    if (!match || !match.servingPlayer) return null;
    
    const isDoubles = isDoublesMatch(match);
    const isServingTeam = (servingTeam === 'team1' && match.servingPlayer === 'player1') ||
                         (servingTeam === 'team2' && match.servingPlayer === 'player2');
    
    if (!isServingTeam) return null;
    
    // For singles: always show 1 dot
    // For doubles: show 1 or 2 dots based on teamServeCount
    const dotCount = isDoubles ? (match.teamServeCount || 0) + 1 : 1;
    
    return (
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 flex justify-center mt-2">
        {Array.from({ length: dotCount }, (_, index) => (
          <div
            key={index}
            className="w-3 h-3 bg-yellow-400 rounded-full mx-1 shadow-lg"
          />
        ))}
      </div>
    );
  }, [isDoublesMatch]);

  // Load media items for ads (videos and images)
  const loadMediaItems = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      console.log('🔍 Loading media items for tournament:', tournamentId);
      const mediaDoc = await getDoc(doc(db, 'video_links', tournamentId));
      incrementFirebaseReads('Media Items Read', tournamentId);
      
      if (mediaDoc.exists()) {
        const data = mediaDoc.data();
        // Handle backward compatibility - convert old video links to new format
        const items = data.mediaItems || data.links?.map(link => ({
          ...link,
          type: 'video'
        })) || [];
        const sortedItems = items.sort((a, b) => a.rank - b.rank);
        setMediaItems(sortedItems);
        console.log('🎬 Media items loaded successfully:', {
          count: sortedItems.length
        });
      } else {
        console.log('🎬 No media items document found for tournament:', tournamentId);
        setMediaItems([]);
      }
    } catch (error) {
      console.error('❌ Error loading media items:', error);
      setMediaItems([]);
    }
  }, [tournamentId, incrementFirebaseReads, extractVideoId]);

  // Check if all matches are scheduled and get featured image
  const checkShouldShowFeaturedImage = useCallback((matches) => {
    if (matches.length === 0) {
      setShowFeaturedImage(false);
      return;
    }

    // Check if ALL matches have status "scheduled"
    const allScheduled = matches.every(match => match.status === 'scheduled');
    
    // Get featured image from any match
    const featuredImage = matches.find(match => match.featuredImage)?.featuredImage;

    if (allScheduled && featuredImage) {
      const imageUrl = featuredImage.secure_url || featuredImage;
      setFeaturedImageUrl(imageUrl);
      setShowFeaturedImage(true);
    } else {
      setShowFeaturedImage(false);
      setFeaturedImageUrl('');
    }
  }, []);

  // Check if we should show ads media
  const checkShouldShowAdsMedia = useCallback((matches, currentLiveMatch) => {
    if (mediaItems.length === 0) {
      setShowAdsMedia(false);
      return;
    }

    // Check if ANY LIVE match has timeout in progress
    const hasTimeoutInProgress = matches.some(match => {
      const isLive = match.status === 'live' || match.status === 'in_progress';
      const timeoutValue = match.timeoutInProgress;
      const hasActiveTimeout = timeoutValue !== null &&
        timeoutValue !== undefined &&
        timeoutValue !== false &&
        (timeoutValue === true ||
         (typeof timeoutValue === 'object' &&
          timeoutValue.team &&
          timeoutValue.startTime));
      
      return isLive && hasActiveTimeout;
    });
    
    // Check if ANY match just completed (status = 'completed')
    const hasCompletedMatch = matches.some(match => match.status === 'completed');
    
    // Check if ANY match is currently live (status = 'live')
    const hasLiveMatch = matches.some(match => match.status === 'live' || match.status === 'in_progress');

    // Show ads if: timeout in progress OR (there's a completed match AND no live matches) AND we have media items
    const shouldShow = (hasTimeoutInProgress || (hasCompletedMatch && !hasLiveMatch)) && mediaItems.length > 0;

    setShowAdsMedia(shouldShow);
    
    // Handle timeout timer start/stop
    if (hasTimeoutInProgress && shouldShow && !timeoutStarted) {
      console.log('⏰ Starting timeout timer - 60 seconds');
      setTimeoutStarted(true);
      setIsTimeoutActive(true);
      setTimeoutTimer(60);
    } else if (!hasTimeoutInProgress && timeoutStarted) {
      console.log('⏰ Timeout ended, resetting timer');
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = null;
      }
      setIsTimeoutActive(false);
      setTimeoutTimer(null);
      setTimeoutStarted(false);
    }
  }, [mediaItems.length, timeoutStarted]);

  // Helper function to calculate fixture score
  const calculateFixtureScore = useCallback((matches) => {
    let team1Wins = 0;
    let team2Wins = 0;
    
    matches.forEach(match => {
      if (match.status === 'completed' && match.winner) {
        if (match.winner === 'team1') {
          team1Wins++;
        } else if (match.winner === 'team2') {
          team2Wins++;
        }
      }
    });
    
    return { team1Wins, team2Wins };
  }, []);

  // Stable update function that doesn't depend on state
  const updateMatchesForFixture = useCallback((selectedFixture, matches) => {
    console.log('=== UPDATING MATCHES FOR FIXTURE ===');
    console.log('Selected fixture:', selectedFixture);
    console.log('Total matches:', matches.length);
    
    const fixtureMatches = matches.filter(match =>
      match.fixtureGroupId === selectedFixture.fixtureGroupId
    );

    console.log('Fixture matches found:', fixtureMatches.length);
    
    fixtureMatches.sort((a, b) => {
      const orderA = a.matchOrder || a.sequence || a.matchNumber || 0;
      const orderB = b.matchOrder || b.sequence || b.matchNumber || 0;
      return orderA - orderB;
    });

    const completed = fixtureMatches.filter(match => match.status === 'completed');
    const inProgress = fixtureMatches.filter(match =>
      match.status === 'live' || match.status === 'in_progress'
    );
    const upcoming = fixtureMatches.filter(match =>
      !match.status || match.status === 'scheduled'
    );

    console.log('Match categorization:', {
      completed: completed.length,
      inProgress: inProgress.length,
      upcoming: upcoming.length
    });

    // Calculate fixture score
    const fixtureScore = calculateFixtureScore(completed);
    console.log('Fixture Score:', `${fixtureScore.team1Wins} - ${fixtureScore.team2Wins}`);

    setCompletedMatches(completed);
    setUpcomingMatches(upcoming);
    
    // Set live match priority with Game Breaker logic
    let liveMatchToSet = null;
    
    // Check for Game Breaker scenario (3-3 score)
    if (fixtureScore.team1Wins === 3 && fixtureScore.team2Wins === 3) {
      const gameBreakerMatch = fixtureMatches.find(match =>
        match.matchTypeLabel === 'Game Breaker' ||
        match.matchTypeLabel === 'Dream Breaker' ||
        (match.matchOrder === 7 || match.sequence === 7 || match.matchNumber === 7)
      );
      
      if (gameBreakerMatch) {
        liveMatchToSet = gameBreakerMatch;
        console.log('🎯 GAME BREAKER MATCH SET (3-3 scenario):', liveMatchToSet.team1Name, 'vs', liveMatchToSet.team2Name);
      }
    }
    
    // If no Game Breaker scenario or Game Breaker not found, use normal priority
    if (!liveMatchToSet) {
      if (inProgress.length > 0) {
        liveMatchToSet = inProgress[0];
        console.log('✅ LIVE MATCH SET (being umpired):', liveMatchToSet.team1Name, 'vs', liveMatchToSet.team2Name);
      } else if (upcoming.length > 0) {
        liveMatchToSet = upcoming[0];
        console.log('⏳ LIVE MATCH SET (upcoming):', liveMatchToSet.team1Name, 'vs', liveMatchToSet.team2Name);
      } else if (completed.length > 0) {
        liveMatchToSet = completed[completed.length - 1];
        console.log('✅ LIVE MATCH SET (last completed):', liveMatchToSet.team1Name, 'vs', liveMatchToSet.team2Name);
      }
    }
    
    setLiveMatch(liveMatchToSet);
    
    // Check if we should show featured image (when all matches are scheduled)
    checkShouldShowFeaturedImage(fixtureMatches);
    
    // Check if we should show ads media
    if (liveMatchToSet) {
      checkShouldShowAdsMedia(fixtureMatches, liveMatchToSet);
    }
  }, [checkShouldShowAdsMedia, checkShouldShowFeaturedImage, mediaItems, calculateFixtureScore]);

  // Initial data fetch - runs once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        incrementFirebaseReads('Tournament Read', tournamentId);
        
        if (tournamentDoc.exists()) {
          setTournament(tournamentDoc.data());
        } else {
          setError('Tournament not found');
          return;
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchInitialData();
    }
  }, [tournamentId]);

  // Cleanup stale timeouts on component mount
  useEffect(() => {
    if (tournamentId) {
      cleanupStaleTimeouts();
    }
  }, [tournamentId, cleanupStaleTimeouts]);

  // Load media items when component mounts
  useEffect(() => {
    if (tournamentId) {
      loadMediaItems();
    }
  }, [tournamentId, loadMediaItems]);

  // Load display logos when component mounts
  useEffect(() => {
    const loadDisplayLogos = async () => {
      if (!tournamentId) return;
      
      try {
        const logosDoc = await getDoc(doc(db, 'tournament_logos', tournamentId));
        if (logosDoc.exists()) {
          const data = logosDoc.data();
          const topLogos = data.displayLogos || [];
          const bottomLogosData = data.bottomLogos || [];
          const sortedTopLogos = topLogos.sort((a, b) => a.rank - b.rank);
          const sortedBottomLogos = bottomLogosData.sort((a, b) => a.rank - b.rank);
          setDisplayLogos(sortedTopLogos);
          setBottomLogos(sortedBottomLogos);
        } else {
          setDisplayLogos([]);
          setBottomLogos([]);
        }
      } catch (error) {
        console.error('Error loading display logos:', error);
        setDisplayLogos([]);
        setBottomLogos([]);
      }
    };

    if (tournamentId) {
      loadDisplayLogos();
    }
  }, [tournamentId]);

  // Fetch team logos when live match changes
  useEffect(() => {
    if (!liveMatch) return;
    
    const fetchLogos = async () => {
      if (liveMatch.team1Name) {
        await fetchTeamLogo(liveMatch.team1Name);
      }
      if (liveMatch.team2Name) {
        await fetchTeamLogo(liveMatch.team2Name);
      }
    };
    
    fetchLogos();
  }, [liveMatch?.team1Name, liveMatch?.team2Name, fetchTeamLogo]);

  // Update main team logos when cache changes
  useEffect(() => {
    if (liveMatch) {
      setMainTeam1Logo(getTeamLogo(liveMatch.team1Name));
      setMainTeam2Logo(getTeamLogo(liveMatch.team2Name));
    }
  }, [liveMatch, teamLogosCache, getTeamLogo]);

  // DRS video state listener
  useEffect(() => {
    if (!liveMatch?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'fixtures', liveMatch.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const matchData = docSnapshot.data();
        
        if (matchData.drsVideoActive && matchData.drsVideoUrl && !isDRSVideoPlaying) {
          setPreviousDisplayState({
            showAdsMedia,
            currentMediaIndex,
            isTimeoutActive
          });
          
          setShowAdsMedia(false);
          setIsTimeoutActive(false);
          
          setDrsVideoUrl(matchData.drsVideoUrl);
          setIsDRSVideoPlaying(true);
          
          const fetchTeamLogos = async () => {
            try {
              if (matchData.team1Id) {
                const team1Doc = await getDoc(doc(db, 'teams', matchData.team1Id));
                if (team1Doc.exists()) {
                  const team1Data = team1Doc.data();
                  setTeam1Logo(team1Data.logoUrl || null);
                }
              }
              
              if (matchData.team2Id) {
                const team2Doc = await getDoc(doc(db, 'teams', matchData.team2Id));
                if (team2Doc.exists()) {
                  const team2Data = team2Doc.data();
                  setTeam2Logo(team2Data.logoUrl || null);
                }
              }
            } catch (error) {
              console.error('Error fetching team logos:', error);
            }
          };
          
          fetchTeamLogos();
          
          console.log('🎥 DRS Video started:', matchData.drsVideoUrl);
        }
        else if (!matchData.drsVideoActive && isDRSVideoPlaying) {
          setIsDRSVideoPlaying(false);
          setDrsVideoUrl('');
          setTeam1Logo(null);
          setTeam2Logo(null);
          
          if (previousDisplayState) {
            setShowAdsMedia(previousDisplayState.showAdsMedia);
            setCurrentMediaIndex(previousDisplayState.currentMediaIndex);
            setIsTimeoutActive(previousDisplayState.isTimeoutActive);
            setPreviousDisplayState(null);
          }
          
          console.log('🎥 DRS Video stopped');
        }
      }
    });

    return () => unsubscribe();
  }, [liveMatch?.id, isDRSVideoPlaying, showAdsMedia, currentMediaIndex, isTimeoutActive, previousDisplayState]);

  // Timeout timer countdown effect
  useEffect(() => {
    if (isTimeoutActive && timeoutTimer !== null && timeoutTimer > 0) {
      console.log('⏰ Starting timer countdown interval, current timer:', timeoutTimer);
      
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
      }
      
      timeoutIntervalRef.current = setInterval(() => {
        setTimeoutTimer(prev => {
          console.log('⏰ Timer tick, current value:', prev);
          if (prev <= 1) {
            clearInterval(timeoutIntervalRef.current);
            timeoutIntervalRef.current = null;
            setIsTimeoutActive(false);
            setTimeoutTimer(null);
            setTimeoutStarted(false);
            setShowAdsMedia(false);
            console.log('⏰ Timeout timer ended');
            
            if (liveMatch?.id) {
              updateDoc(doc(db, 'fixtures', liveMatch.id), {
                timeoutInProgress: null
              }).then(() => {
                console.log('✅ Timeout cleared in Firebase');
              }).catch(error => {
                console.error('❌ Error clearing timeout in Firebase:', error);
              });
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timeoutIntervalRef.current) {
          clearInterval(timeoutIntervalRef.current);
          timeoutIntervalRef.current = null;
        }
      };
    }
  }, [isTimeoutActive, timeoutTimer]);

  // Media cycling effect
  useEffect(() => {
    if (!showAdsMedia || mediaItems.length <= 1) {
      return;
    }

    console.log('🎬 Media cycling enabled for', mediaItems.length, 'items');
  }, [showAdsMedia, mediaItems.length]);

  // Handle media cycling
  const handleMediaEnd = useCallback(() => {
    if (mediaItems.length > 1) {
      console.log('🎬 Media ended, switching to next item');
      setCurrentMediaIndex((prevIndex) =>
        (prevIndex + 1) % mediaItems.length
      );
    }
  }, [mediaItems.length]);

  // Image timer effect
  useEffect(() => {
    const currentItem = getCurrentMediaItem();
    if (showAdsMedia && currentItem && currentItem.type === 'image') {
      console.log('🖼️ Starting 10-second timer for image:', currentItem.title);
      const timer = setTimeout(() => {
        console.log('🖼️ Image timer ended, switching to next media');
        handleMediaEnd();
      }, 10000);

      setImageTimer(timer);

      return () => {
        if (timer) {
          clearTimeout(timer);
          setImageTimer(null);
        }
      };
    }
  }, [showAdsMedia, currentMediaIndex, getCurrentMediaItem, handleMediaEnd]);

  // Live match listener for timeout detection
  useEffect(() => {
    if (!liveMatch?.id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'fixtures', liveMatch.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = docSnapshot.data();
          console.log('🔄 Live match timeout check:', {
            id: liveMatch.id,
            timeoutInProgress: matchData.timeoutInProgress,
            status: matchData.status
          });
          
          // Re-check if we should show ads media when timeout changes
          if (venueMatchesRef.current.length > 0 && currentFixtureRef.current) {
            updateMatchesForFixture(currentFixtureRef.current, venueMatchesRef.current);
          }
        }
      },
      (error) => {
        console.error('Error listening to live match timeout:', error);
      }
    );

    return () => unsubscribe();
  }, [liveMatch?.id, updateMatchesForFixture]);

  // Set up Firebase listeners for venue-specific matches
  useEffect(() => {
    if (!tournamentId || !dateString || !decodedVenueName || listenersSetupRef.current) {
      return;
    }

    console.log('🔧 Setting up Firebase listeners for venue:', decodedVenueName);
    listenersSetupRef.current = true;

    // Matches listener - filter by venue and date
    const matchesQuery = query(
      collection(db, 'fixtures'),
      where('tournamentId', '==', tournamentId),
      where('venueName', '==', decodedVenueName)
    );
    
    const matchesUnsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        incrementFirebaseReads('Venue Matches Query', `${snapshot.docs.length} total matches`);
        
        const allMatches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter for matches on this date
        const dateMatches = allMatches.filter(match => {
          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          const matchDateString = matchDate.toISOString().split('T')[0];
          
          return matchDateString === dateString;
        });

        console.log('🔥 Venue matches updated:', dateMatches.length);
        
        // Store in ref
        venueMatchesRef.current = dateMatches;
        
        // Set default fixture if none exists
        if (dateMatches.length > 0 && !currentFixtureRef.current) {
          // First, try to find a fixture with an active match (status = 'live' or 'in_progress')
          let fixtureToSet = null;
          
          // Group matches by fixtureGroupId
          const fixtureGroups = {};
          dateMatches.forEach(match => {
            if (!fixtureGroups[match.fixtureGroupId]) {
              fixtureGroups[match.fixtureGroupId] = [];
            }
            fixtureGroups[match.fixtureGroupId].push(match);
          });
          
          // Find fixture with active match
          for (const [fixtureGroupId, matches] of Object.entries(fixtureGroups)) {
            const hasActiveMatch = matches.some(m => m.status === 'live' || m.status === 'in_progress');
            if (hasActiveMatch) {
              fixtureToSet = matches[0];
              console.log('🎯 Found fixture with active match:', fixtureGroupId);
              break;
            }
          }
          
          // If no active match, use the first fixture
          if (!fixtureToSet) {
            fixtureToSet = dateMatches[0];
            console.log('📍 No active match found, using first fixture');
          }
          
          const defaultFixture = {
            team1Name: fixtureToSet.team1Name,
            team2Name: fixtureToSet.team2Name,
            fixtureGroupId: fixtureToSet.fixtureGroupId
          };
          currentFixtureRef.current = defaultFixture;
          setCurrentFixture(defaultFixture);
        }
        
        // Update matches if we have a current fixture
        if (currentFixtureRef.current) {
          updateMatchesForFixture(currentFixtureRef.current, dateMatches);
        }
      },
      (error) => {
        console.error('Error in venue matches listener:', error);
      }
    );

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      matchesUnsubscribe();
      listenersSetupRef.current = false;
      
      // Clean up timeout interval
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = null;
      }
    };
  }, [tournamentId, dateString, decodedVenueName, incrementFirebaseReads, updateMatchesForFixture, liveMatch?.id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="loading loading-spinner loading-lg text-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (showFeaturedImage && featuredImageUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        {/* Header with logos */}
        <div className="absolute top-0 left-0 right-0 flex justify-evenly items-center px-12 py-6">
          {displayLogos.length > 0 ? (
            displayLogos.map((logo, index) => (
              <img
                key={logo.id || index}
                src={logo.publicId ? getOptimizedLogoUrl(logo.publicId, { width: 260, height: 104 }) : logo.url}
                alt={logo.title || 'Sponsor Logo'}
                className="h-20 w-auto max-w-[156px] object-contain"
                onError={(e) => {
                  e.target.src = logo.url;
                }}
              />
            ))
          ) : (
            <div className="text-white text-sm opacity-50">No logos configured</div>
          )}
        </div>
        
        {/* Featured Image Display */}
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={featuredImageUrl}
            alt="Featured Tournament Image"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    );
  }

  if (!currentFixture || !liveMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Matches at This Venue</h2>
          <p>No matches found for {decodedVenueName} on {formatDate(dateString)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white overflow-hidden flex flex-col bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      {/* Main content area */}
      <div className="flex-1 flex flex-col px-8 py-8 gap-6">
        {/* Main Live Match Display */}
        <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-gradient-to-r from-orange-900 to-orange-800 rounded-2xl p-12 border border-orange-600 shadow-2xl relative overflow-hidden flex flex-col justify-center">
          {/* Lightning animation effects */}
          <div className="absolute inset-0 rounded-2xl border-4 border-orange-400 opacity-75 animate-pulse"></div>
          <div
            className="absolute inset-0 rounded-2xl border-2 border-yellow-300 opacity-60"
            style={{
              animation: 'lightning 1.5s ease-in-out infinite',
              boxShadow: '0 0 20px rgba(255, 255, 0, 0.5), inset 0 0 20px rgba(255, 165, 0, 0.3)'
            }}
          ></div>
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 0, 0.3) 50%, transparent 70%)',
              animation: 'electricSweep 15s linear infinite'
            }}
          ></div>
          
          {/* Content wrapper to ensure it's above the animations */}
          <div className="relative z-10">
          {/* Match Type Header */}
          <div className="text-center mb-12">
            <h2 className="text-6xl font-bold text-white bg-orange-700 rounded-lg py-4 px-8 inline-block">
              {liveMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : liveMatch.matchTypeLabel}
            </h2>
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between h-full">
            {/* Team 1 */}
            <div className="flex items-center space-x-12 flex-1">
              <div className="text-center">
                {/* Team 1 Match Wins Counter */}
                <div className="text-9xl font-bold text-white mb-6">
                  {completedMatches.filter(match => {
                    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
                    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
                    return team1Score > team2Score;
                  }).length}
                </div>
                <img
                   src={mainTeam1Logo || paddleLogo}
                   alt={`${currentFixture.team1Name} Logo`}
                   className="w-56 h-56 object-contain"
                 />
              </div>
              <div className="text-left">
                <h3 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'SATriumph, sans-serif' }}>{currentFixture.team1Name}</h3>
                <div className="text-orange-200 space-y-2">
                  {liveMatch.player1Team1 && (
                    <div style={{ fontSize: '3rem', lineHeight: '4rem', fontWeight: 700 }}>{liveMatch.player1Team1}</div>
                  )}
                  {liveMatch.player2Team1 && (
                    <div style={{ fontSize: '3rem', lineHeight: '4rem', fontWeight: 700 }}>{liveMatch.player2Team1}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="px-16">
              <div className="flex items-center justify-center space-x-12">
                <div className="text-center relative">
                  <span className="text-9xl font-bold text-white">
                    {liveMatch.scores?.player1?.game1 ||
                     liveMatch.scores?.player1?.total ||
                     liveMatch.team1Score ||
                     liveMatch.score1 ||
                     0}
                  </span>
                  {/* Team 1 Serve Indicators */}
                  {renderServeIndicators(liveMatch, 'team1')}
                </div>
                <span className="text-8xl font-bold text-orange-400">-</span>
                <div className="text-center relative">
                  <span className="text-9xl font-bold text-white">
                    {liveMatch.scores?.player2?.game1 ||
                     liveMatch.scores?.player2?.total ||
                     liveMatch.team2Score ||
                     liveMatch.score2 ||
                     0}
                  </span>
                  {/* Team 2 Serve Indicators */}
                  {renderServeIndicators(liveMatch, 'team2')}
                </div>
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex items-center space-x-12 flex-1 justify-end">
              <div className="text-right">
                <h3 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'SATriumph, sans-serif' }}>{currentFixture.team2Name}</h3>
                <div className="text-orange-200 space-y-2">
                  {liveMatch.player1Team2 && (
                    <div style={{ fontSize: '3rem', lineHeight: '4rem', fontWeight: 700 }}>{liveMatch.player1Team2}</div>
                  )}
                  {liveMatch.player2Team2 && (
                    <div style={{ fontSize: '3rem', lineHeight: '4rem', fontWeight: 700 }}>{liveMatch.player2Team2}</div>
                  )}
                </div>
              </div>
              <div className="text-center">
                {/* Team 2 Match Wins Counter */}
                <div className="text-9xl font-bold text-white mb-6">
                  {completedMatches.filter(match => {
                    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
                    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
                    return team2Score > team1Score;
                  }).length}
                </div>
                <img
                   src={mainTeam2Logo || paddleLogo}
                   alt={`${currentFixture.team2Name} Logo`}
                   className="w-56 h-56 object-contain"
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
          </div>
    
          {/* Full-Screen Ads Media Overlay */}
      {showAdsMedia && mediaItems.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {(() => {
            const currentItem = getCurrentMediaItem();
            const videoId = currentItem && currentItem.type === 'video' ? extractVideoId(currentItem.url) : null;
            const isDirectVideo = currentItem && currentItem.type === 'video' ? isDirectVideoUrl(currentItem.url) : false;
            
            return (
              <>
                {/* Timeout Timer Overlay */}
                {isTimeoutActive && timeoutTimer !== null && (
                  <div className="absolute top-8 left-8 z-60 bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg">
                    <div className="text-8xl font-bold font-mono">
                      {Math.floor(timeoutTimer / 60)}:{(timeoutTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-2xl text-center mt-2 opacity-75">
                      TIMEOUT
                    </div>
                  </div>
                )}
                
                {/* Media Display */}
                <div className="w-full h-full flex items-center justify-center">
                  {(() => {
                    if (!currentItem) {
                      return (
                        <div className="text-center text-white">
                          <div className="text-8xl mb-8">🎬</div>
                          <h2 className="text-6xl font-bold mb-4">Loading Media...</h2>
                        </div>
                      );
                    }
                    
                    if (currentItem.type === 'image') {
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={currentItem.url}
                            alt={currentItem.title || 'Advertisement Image'}
                            className="max-w-full max-h-full object-contain"
                            style={{ height: "100%" }}
                          />
                        </div>
                      );
                    } else if (currentItem.type === 'video') {
                      if (videoId) {
                        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1`;
                        
                        return (
                          <div className="w-full h-full">
                            <iframe
                              className="w-full h-full"
                              src={embedUrl}
                              title={currentItem.title || 'Advertisement Video'}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              allowFullScreen
                            />
                          </div>
                        );
                      } else if (isDirectVideo) {
                        return (
                          <div className="w-full h-full">
                            <video
                              className="w-full h-full object-contain"
                              autoPlay
                              loop={mediaItems.length === 1}
                              muted={false}
                              controls={false}
                              playsInline
                              onEnded={handleMediaEnd}
                            >
                              <source src={currentItem.url} type={
                                currentItem.url.toLowerCase().includes('.webm') ? 'video/webm' :
                                currentItem.url.toLowerCase().includes('.mp4') ? 'video/mp4' :
                                currentItem.url.toLowerCase().includes('.ogg') ? 'video/ogg' :
                                currentItem.url.toLowerCase().includes('.mov') ? 'video/quicktime' :
                                'video/mp4'
                              } />
                              Your browser does not support the video tag or this video format.
                            </video>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-center text-white">
                            <div className="text-8xl mb-8">🎥</div>
                            <h2 className="text-6xl font-bold mb-4">Video Error</h2>
                            <p className="text-2xl text-orange-200">
                              {currentItem.title || 'Invalid video format'}
                            </p>
                          </div>
                        );
                      }
                    } else {
                      return (
                        <div className="text-center text-white">
                          <div className="text-8xl mb-8">❓</div>
                          <h2 className="text-6xl font-bold mb-4">Unknown Media Type</h2>
                          <p className="text-2xl text-orange-200">
                            {currentItem.title || 'Unknown media'}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>

              </>
            );
          })()}
        </div>
      )}

      {/* DRS Pending Screen */}
      {isDRSVideoPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Background Video */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/src/assets/backgrounds/drs_background.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Top Logos */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-20">
            <img
              src="/src/assets/centrecourt_logo.png"
              alt="Centre Court Logo"
              className="h-16 w-auto object-contain"
            />
            <img
              src="/src/assets/hpllogo_white.png"
              alt="CCPL Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          
          {/* Content Overlay */}
          <div className="relative z-10 w-full flex items-center justify-center px-16">
            {/* Left Team Logo */}
            <div className="flex-1 flex justify-end pr-16">
              {team1Logo ? (
                <img
                  src={team1Logo}
                  alt={liveMatch?.team1Name || 'Team 1'}
                  className="w-64 h-64 object-contain opacity-80"
                />
              ) : (
                <img
                  src={getTeamLogo(liveMatch?.team1Name)}
                  alt={liveMatch?.team1Name || 'Team 1'}
                  className="w-64 h-64 object-contain opacity-80"
                />
              )}
            </div>
            
            {/* Center Text */}
            <div className="flex-shrink-0 text-center">
              <div
                className="font-championer text-8xl md:text-9xl lg:text-[12rem] font-bold leading-none animate-drs-heartbeat"
                style={{
                  color: '#e98318',
                  textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(233, 131, 24, 0.3)',
                  fontFamily: 'Championer, Arial Black, Impact, Helvetica Neue, sans-serif'
                }}
              >
                <div className="mb-4">DECISION</div>
                <div>PENDING</div>
              </div>
            </div>
            
            {/* Right Team Logo */}
            <div className="flex-1 flex justify-start pl-16">
              {team2Logo ? (
                <img
                  src={team2Logo}
                  alt={liveMatch?.team2Name || 'Team 2'}
                  className="w-64 h-64 object-contain opacity-80"
                />
              ) : (
                <img
                  src={getTeamLogo(liveMatch?.team2Name)}
                  alt={liveMatch?.team2Name || 'Team 2'}
                  className="w-64 h-64 object-contain opacity-80"
                />
              )}
            </div>
          </div>
          
        </div>
      )}

      </div>

      {/* Bottom Scores Section - Other Completed Matches */}
      {completedMatches.length > 0 && (
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h3 className="text-2xl font-bold text-orange-400 mb-4">Other Matches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedMatches.map((match, index) => (
                <div key={match.id || index} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <div className="text-sm text-gray-400 mb-2">
                    {match.matchTypeLabel || 'Match'}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {match.team1Name}
                      </div>
                      {match.player1Team1 && (
                        <div className="text-xs text-gray-300">{match.player1Team1}</div>
                      )}
                      {match.player2Team1 && (
                        <div className="text-xs text-gray-300">{match.player2Team1}</div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mx-3">
                      {match.scores?.player1?.game1 ||
                       match.scores?.player1?.total ||
                       match.team1Score ||
                       match.score1 ||
                       0}
                    </div>
                  </div>
                  <div className="border-t border-gray-600 my-2"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {match.team2Name}
                      </div>
                      {match.player1Team2 && (
                        <div className="text-xs text-gray-300">{match.player1Team2}</div>
                      )}
                      {match.player2Team2 && (
                        <div className="text-xs text-gray-300">{match.player2Team2}</div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mx-3">
                      {match.scores?.player2?.game1 ||
                       match.scores?.player2?.total ||
                       match.team2Score ||
                       match.score2 ||
                       0}
                    </div>
                  </div>
                  {match.winner && (
                    <div className="mt-3 text-center">
                      <span className="text-xs font-bold text-orange-400 bg-orange-900 bg-opacity-50 px-2 py-1 rounded">
                        {match.winner === 'team1' ? match.team1Name : match.team2Name} Won
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}