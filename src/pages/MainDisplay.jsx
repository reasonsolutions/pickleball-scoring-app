import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

// Import team logos (keep these for team logos, not sponsor logos)
import paddleLogo from '../assets/paddle.png';
import allstarsLogo from '../assets/allstars.png';
import challengerLogo from '../assets/challenger.png';
import dasosLogo from '../assets/dasos.png';
import mavericksLogo from '../assets/mavericks.png';
import nandiLogo from '../assets/nandi.png';
import raptorsLogo from '../assets/raptors.png';
import starrysmashersLogo from '../assets/starrysmashers.png';
import keerthiLogo from '../assets/keerthi.png';
import teramorLogo from '../assets/teramor.png';

// Import bottom logos (keep these for now)
import dasosWhiteBottom from '../assets/bottomlogos/dasos_white.png';
import hisenseWhiteBottom from '../assets/bottomlogos/hisense_white.png';
import keerthiWhiteBottom from '../assets/bottomlogos/keerthi_white.png';
import musterWhiteBottom from '../assets/bottomlogos/muster_white.png';
import priyaCementBottom from '../assets/bottomlogos/Priya_Cement.png';
import sindhuWhiteBottom from '../assets/bottomlogos/sindhu_white.png';
import sitharaWhiteBottom from '../assets/bottomlogos/Sithara_white.png';
import skillTyroWhiteBottom from '../assets/bottomlogos/SkillTyro_white.png';
import teramorWhiteBottom from '../assets/bottomlogos/teramor_white.png';

export default function MainDisplay() {
  const { tournamentId, dateString } = useParams();
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
  
  // Use refs to avoid recreating callbacks and triggering re-subscriptions
  const centerCourtMatchesRef = useRef([]);
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
  }, []); // No dependencies - stable callback

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

  // Function to get team logo based on team name
  const getTeamLogo = useCallback((teamName) => {
    if (!teamName) return paddleLogo;
    
    const teamNameLower = teamName.toLowerCase();
    const teamLogoMap = {
      'allstars': allstarsLogo,
      'all stars': allstarsLogo,
      'challenger': challengerLogo,
      'challengers': challengerLogo,
      'dasos': dasosLogo,
      'mavericks': mavericksLogo,
      'maverick': mavericksLogo,
      'nandi': nandiLogo,
      'nandi chargers': nandiLogo,
      'chargers': nandiLogo,
      'raptors': raptorsLogo,
      'raptor': raptorsLogo,
      'starrysmashers': starrysmashersLogo,
      'starry smashers': starrysmashersLogo,
      'smashers': starrysmashersLogo,
      'keerthi': keerthiLogo,
      'teramor titans': teramorLogo,
      'teramor': teramorLogo,
      'titans': teramorLogo
    };
    
    if (teamLogoMap[teamNameLower]) {
      return teamLogoMap[teamNameLower];
    }
    
    for (const [key, logo] of Object.entries(teamLogoMap)) {
      if (teamNameLower.includes(key) || key.includes(teamNameLower)) {
        return logo;
      }
    }
    
    return paddleLogo;
  }, []);

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
          count: sortedItems.length,
          items: sortedItems.map(item => ({
            rank: item.rank,
            title: item.title,
            type: item.type,
            url: item.url,
            videoId: item.type === 'video' ? extractVideoId(item.url) : null
          }))
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
    console.log('🖼️ Featured Image Check - Starting:', {
      totalMatches: matches.length,
      matchStatuses: matches.map(m => ({ id: m.id, status: m.status, teams: `${m.team1Name} vs ${m.team2Name}` }))
    });

    if (matches.length === 0) {
      console.log('🖼️ No matches found - not showing featured image');
      setShowFeaturedImage(false);
      return;
    }

    // Check if ALL matches have status "scheduled"
    const allScheduled = matches.every(match => match.status === 'scheduled');
    
    // Get featured image from any match (they should all have the same one from fixture level)
    const featuredImage = matches.find(match => match.featuredImage)?.featuredImage;
    
    console.log('🖼️ Featured Image Decision:', {
      allScheduled,
      featuredImageFound: !!featuredImage,
      featuredImageUrl: featuredImage?.secure_url || featuredImage,
      shouldShow: allScheduled && !!featuredImage
    });

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
    console.log('🎬 Ads Media Check - Starting:', {
      currentLiveMatch: currentLiveMatch ? {
        id: currentLiveMatch.id,
        status: currentLiveMatch.status,
        team1: currentLiveMatch.team1Name,
        team2: currentLiveMatch.team2Name,
        timeoutInProgress: currentLiveMatch.timeoutInProgress,
        timeoutTeam: currentLiveMatch.timeoutTeam
      } : null,
      mediaItemsCount: mediaItems.length,
      totalMatches: matches.length
    });

    if (mediaItems.length === 0) {
      console.log('🎬 No media items available - not showing ads');
      setShowAdsMedia(false);
      return;
    }

    // Check if ANY LIVE match has timeout in progress
    const hasTimeoutInProgress = matches.some(match => {
      const isLive = match.status === 'live' || match.status === 'in_progress';
      
      // More explicit timeout check - only consider active timeouts
      const timeoutValue = match.timeoutInProgress;
      const hasActiveTimeout = timeoutValue !== null &&
        timeoutValue !== undefined &&
        timeoutValue !== false &&
        (timeoutValue === true ||
         (typeof timeoutValue === 'object' &&
          timeoutValue.team &&
          timeoutValue.startTime)); // Must have both team and startTime for object-based timeouts
      
      console.log('🔍 Timeout check for match:', {
        matchId: match.id,
        teams: `${match.team1Name} vs ${match.team2Name}`,
        status: match.status,
        isLive,
        timeoutInProgress: match.timeoutInProgress,
        timeoutValue,
        hasActiveTimeout,
        shouldShowForThisMatch: isLive && hasActiveTimeout
      });
      
      return isLive && hasActiveTimeout;
    });
    
    // Check if ANY match just completed (status = 'completed')
    const hasCompletedMatch = matches.some(match => match.status === 'completed');
    
    // Check if ANY match is currently live (status = 'live')
    const hasLiveMatch = matches.some(match => match.status === 'live' || match.status === 'in_progress');

    // Show ads if: timeout in progress OR (there's a completed match AND no live matches) AND we have media items
    const shouldShow = (hasTimeoutInProgress || (hasCompletedMatch && !hasLiveMatch)) && mediaItems.length > 0;
    
    console.log('🎬 Ads Media Decision:', {
      hasTimeoutInProgress,
      hasCompletedMatch,
      hasLiveMatch,
      timeoutMatches: matches.filter(m => {
        const isLive = m.status === 'live' || m.status === 'in_progress';
        const timeoutValue = m.timeoutInProgress;
        const hasActiveTimeout = timeoutValue !== null &&
          timeoutValue !== undefined &&
          timeoutValue !== false &&
          (timeoutValue === true ||
           (typeof timeoutValue === 'object' &&
            timeoutValue.team &&
            timeoutValue.startTime));
        return isLive && hasActiveTimeout;
      }).map(m => ({
        id: m.id,
        teams: `${m.team1Name} vs ${m.team2Name}`,
        status: m.status,
        timeoutValue: m.timeoutInProgress,
        timeoutTeam: typeof m.timeoutInProgress === 'object' ? m.timeoutInProgress.team : 'unknown'
      })),
      completedMatches: matches.filter(m => m.status === 'completed').map(m => ({ id: m.id, teams: `${m.team1Name} vs ${m.team2Name}` })),
      liveMatches: matches.filter(m => m.status === 'live' || m.status === 'in_progress').map(m => ({ id: m.id, teams: `${m.team1Name} vs ${m.team2Name}` })),
      shouldShow,
      mediaItemsCount: mediaItems.length
    });

    setShowAdsMedia(shouldShow);
    
    // Handle timeout timer start/stop (but not the countdown itself)
    if (hasTimeoutInProgress && shouldShow && !timeoutStarted) {
      console.log('⏰ Starting timeout timer - 60 seconds');
      setTimeoutStarted(true);
      setIsTimeoutActive(true);
      setTimeoutTimer(60); // 60 seconds = 1 minute
    } else if (!hasTimeoutInProgress && timeoutStarted) {
      // Timeout ended, reset timer
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

  // Helper function to calculate fixture score (how many matches each team won)
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
      // Find the Game Breaker match (usually marked as such or the 7th match)
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
  }, [checkShouldShowAdsMedia, checkShouldShowFeaturedImage, mediaItems, calculateFixtureScore]); // Updated dependencies

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
  }, [tournamentId]); // Only depends on tournamentId

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
          // Sort by rank to maintain order
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

  // DRS video state listener - monitors live match for DRS video changes
  useEffect(() => {
    if (!liveMatch?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'fixtures', liveMatch.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const matchData = docSnapshot.data();
        
        // Check if DRS video should be playing
        if (matchData.drsVideoActive && matchData.drsVideoUrl && !isDRSVideoPlaying) {
          // Save current display state
          setPreviousDisplayState({
            showAdsMedia,
            currentMediaIndex,
            isTimeoutActive
          });
          
          // Stop any current media/timeout
          setShowAdsMedia(false);
          setIsTimeoutActive(false);
          
          // Start DRS video
          setDrsVideoUrl(matchData.drsVideoUrl);
          setIsDRSVideoPlaying(true);
          
          console.log('🎥 DRS Video started:', matchData.drsVideoUrl);
        }
        // Check if DRS video should be stopped
        else if (!matchData.drsVideoActive && isDRSVideoPlaying) {
          // Stop DRS video and restore previous state
          setIsDRSVideoPlaying(false);
          setDrsVideoUrl('');
          
          // Restore previous display state
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
      
      // Clear any existing interval
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
      }
      
      // Start countdown
      timeoutIntervalRef.current = setInterval(() => {
        setTimeoutTimer(prev => {
          console.log('⏰ Timer tick, current value:', prev);
          if (prev <= 1) {
            clearInterval(timeoutIntervalRef.current);
            timeoutIntervalRef.current = null;
            setIsTimeoutActive(false);
            setTimeoutTimer(null);
            setTimeoutStarted(false);
            setShowAdsMedia(false); // Hide ads container and return to match display
            console.log('⏰ Timeout timer ended');
            
            // Clear timeout in Firebase to close the video container
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
      
      // Cleanup function
      return () => {
        if (timeoutIntervalRef.current) {
          clearInterval(timeoutIntervalRef.current);
          timeoutIntervalRef.current = null;
        }
      };
    }
  }, [isTimeoutActive, timeoutTimer]); // Only run when these change

  // Media cycling effect - handles both videos and images
  useEffect(() => {
    if (!showAdsMedia || mediaItems.length <= 1) {
      return;
    }

    console.log('🎬 Media cycling enabled for', mediaItems.length, 'items');
  }, [showAdsMedia, mediaItems.length]);

  // Handle media cycling - videos end naturally, images need timer
  const handleMediaEnd = useCallback(() => {
    if (mediaItems.length > 1) {
      console.log('🎬 Media ended, switching to next item');
      setCurrentMediaIndex((prevIndex) =>
        (prevIndex + 1) % mediaItems.length
      );
    }
  }, [mediaItems.length]);

  // Image timer effect - show images for 10 seconds
  useEffect(() => {
    const currentItem = getCurrentMediaItem();
    if (showAdsMedia && currentItem && currentItem.type === 'image') {
      console.log('🖼️ Starting 10-second timer for image:', currentItem.title);
      const timer = setTimeout(() => {
        console.log('🖼️ Image timer ended, switching to next media');
        handleMediaEnd();
      }, 10000); // 10 seconds

      setImageTimer(timer);

      return () => {
        if (timer) {
          clearTimeout(timer);
          setImageTimer(null);
        }
      };
    }
  }, [showAdsMedia, currentMediaIndex, getCurrentMediaItem, handleMediaEnd]);

  // Set up Firebase listeners - runs once
  useEffect(() => {
    if (!tournamentId || !dateString || listenersSetupRef.current) {
      return;
    }

    console.log('🔧 Setting up Firebase listeners (ONE TIME)');
    listenersSetupRef.current = true;

    // Display settings listener
    const displaySettingId = `${tournamentId}_${dateString}`;
    const displaySettingsUnsubscribe = onSnapshot(
      doc(db, 'display_settings', displaySettingId),
      (docSnapshot) => {
        incrementFirebaseReads('Display Settings Listener', displaySettingId);
        
        if (docSnapshot.exists()) {
          const displaySetting = docSnapshot.data();
          const selectedFixture = displaySetting.currentFixture || displaySetting.currentMainFixture;
          
          if (selectedFixture) {
            console.log('📺 Display settings updated:', selectedFixture);
            currentFixtureRef.current = selectedFixture;
            setCurrentFixture(selectedFixture);
            
            // Update matches with current fixture
            if (centerCourtMatchesRef.current.length > 0) {
              updateMatchesForFixture(selectedFixture, centerCourtMatchesRef.current);
            }
          }
        }
      },
      (error) => {
        console.error('Error listening to display settings:', error);
      }
    );

    // Matches listener
    const matchesQuery = query(
      collection(db, 'fixtures'),
      where('tournamentId', '==', tournamentId)
    );
    
    const matchesUnsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        incrementFirebaseReads('Matches Query', `${snapshot.docs.length} total matches`);
        
        const allMatches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter for center court matches on this date
        const dateMatches = allMatches.filter(match => {
          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          const matchDateString = matchDate.toISOString().split('T')[0];
          const courtName = match.court?.toLowerCase() || '';
          
          return matchDateString === dateString &&
                 (courtName.includes('center') || courtName.includes('centre'));
        });

        console.log('🔥 Center court matches updated:', dateMatches.length);
        
        // Store in ref
        centerCourtMatchesRef.current = dateMatches;
        
        // Set default fixture if none exists
        if (dateMatches.length > 0 && !currentFixtureRef.current) {
          const firstFixture = dateMatches[0];
          const defaultFixture = {
            team1Name: firstFixture.team1Name,
            team2Name: firstFixture.team2Name,
            fixtureGroupId: firstFixture.fixtureGroupId
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
        console.error('Error in matches listener:', error);
      }
    );

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      displaySettingsUnsubscribe();
      matchesUnsubscribe();
      listenersSetupRef.current = false;
      
      // Clean up timeout interval
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = null;
      }
    };
  }, [tournamentId, dateString, incrementFirebaseReads, updateMatchesForFixture]);

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Show featured image if all matches are scheduled
  if (showFeaturedImage && featuredImageUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
                  e.target.src = logo.url; // Fallback to original URL
                }}
              />
            ))
          ) : (
            // Fallback to show a message when no logos are configured
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Center Court Matches</h2>
          <p>No center court matches found for {formatDate(dateString)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Header with logos - Fixed at top */}
      <div className="flex justify-evenly items-center px-12 py-6 flex-shrink-0">
        {displayLogos.length > 0 ? (
          displayLogos.map((logo, index) => (
            <img
              key={logo.id || index}
              src={logo.publicId ? getOptimizedLogoUrl(logo.publicId, { width: 260, height: 104 }) : logo.url}
              alt={logo.title || 'Sponsor Logo'}
              className="h-20 w-auto max-w-[156px] object-contain"
              onError={(e) => {
                e.target.src = logo.url; // Fallback to original URL
              }}
            />
          ))
        ) : (
          // Fallback to show a message when no logos are configured
          <div className="text-white text-sm opacity-50">No logos configured</div>
        )}
      </div>

      {/* Main content area - Expandable */}
      <div className="flex-1 flex flex-col px-12">
        {/* Main Live Match Display */}
        <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 border border-slate-600 shadow-2xl">
          {/* Match Type Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white bg-slate-600 rounded-lg py-3 px-6 inline-block">
              {liveMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : liveMatch.matchTypeLabel}
            </h2>
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between">
            {/* Team 1 */}
            <div className="flex items-center space-x-8 flex-1">
              <div className="text-center">
                {/* Team 1 Match Wins Counter */}
                <div className="text-6xl font-bold text-white mb-4">
                  {completedMatches.filter(match => {
                    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
                    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
                    return team1Score > team2Score;
                  }).length}
                </div>
                <img
                  src={getTeamLogo(currentFixture.team1Name)}
                  alt={`${currentFixture.team1Name} Logo`}
                  className="w-40 h-40 object-contain"
                />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white mb-2">{currentFixture.team1Name}</h3>
                <div className="text-lg text-slate-300 space-y-1">
                  {liveMatch.player1Team1 && (
                    <div className="font-medium">{liveMatch.player1Team1}</div>
                  )}
                  {liveMatch.player2Team1 && (
                    <div className="font-medium">{liveMatch.player2Team1}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="px-12">
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center relative">
                  <span className="text-8xl font-bold text-white">
                    {liveMatch.scores?.player1?.game1 ||
                     liveMatch.scores?.player1?.total ||
                     liveMatch.team1Score ||
                     liveMatch.score1 ||
                     0}
                  </span>
                  {/* Team 1 Serve Indicators */}
                  {renderServeIndicators(liveMatch, 'team1')}
                </div>
                <span className="text-6xl font-bold text-slate-400">-</span>
                <div className="text-center relative">
                  <span className="text-8xl font-bold text-white">
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
            <div className="flex items-center space-x-8 flex-1 justify-end">
              <div className="text-right">
                <h3 className="text-2xl font-bold text-white mb-2">{currentFixture.team2Name}</h3>
                <div className="text-lg text-slate-300 space-y-1">
                  {liveMatch.player1Team2 && (
                    <div className="font-medium">{liveMatch.player1Team2}</div>
                  )}
                  {liveMatch.player2Team2 && (
                    <div className="font-medium">{liveMatch.player2Team2}</div>
                  )}
                </div>
              </div>
              <div className="text-center">
                {/* Team 2 Match Wins Counter */}
                <div className="text-6xl font-bold text-white mb-4">
                  {completedMatches.filter(match => {
                    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
                    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
                    return team2Score > team1Score;
                  }).length}
                </div>
                <img
                  src={getTeamLogo(currentFixture.team2Name)}
                  alt={`${currentFixture.team2Name} Logo`}
                  className="w-40 h-40 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Matches in Fixture */}
      <div className="px-12">
        <div className="grid grid-cols-5 gap-6">
          {(() => {
            // In Game Breaker scenario (3-3), show the 6 matches that were played before
            const fixtureScore = calculateFixtureScore(completedMatches);
            const isGameBreakerScenario = fixtureScore.team1Wins === 3 && fixtureScore.team2Wins === 3;
            
            let matchesToShow;
            if (isGameBreakerScenario) {
              // Show the 6 completed matches that were played before the Game Breaker (exclude the live Game Breaker)
              matchesToShow = completedMatches
                .filter(match => match.id !== liveMatch.id)
                .slice(0, 6);
            } else {
              // Normal scenario: show completed + upcoming, excluding live match, max 5
              matchesToShow = [...completedMatches, ...upcomingMatches]
                .filter(match => match.id !== liveMatch.id)
                .slice(0, 5);
            }
            
            return matchesToShow.map((match, index) => (
                <div key={match.id} className="bg-slate-800 rounded-xl p-6 border border-slate-600 shadow-lg">
                  {/* Match Type Header */}
                  <div className="text-center mb-6">
                    <h4 className="text-lg font-semibold text-white bg-slate-700 rounded py-3 px-4">
                      {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                    </h4>
                  </div>
                  
                  {/* Team 1 Section */}
                  <div className="mb-4">
                    <div className="text-left text-slate-400 text-sm mb-2">{currentFixture.team1Name}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="text-white text-lg font-medium">
                          {(() => {
                            // Handle different match types
                            if (match.player1Team1 && match.player2Team1) {
                              // Doubles - show both players
                              return `${match.player1Team1.split(' ')[0]} & ${match.player2Team1.split(' ')[0]}`;
                            } else if (match.player1Team1) {
                              // Singles - show single player
                              return match.player1Team1.split(' ')[0];
                            } else if (match.player1) {
                              // Alternative field name
                              return match.player1.split(' ')[0];
                            } else {
                              return 'TBD';
                            }
                          })()}
                        </div>
                      </div>
                      <div className="text-white text-4xl font-bold">
                        {match.scores?.player1?.game1 || match.scores?.player1?.total || 0}
                      </div>
                    </div>
                  </div>

                  {/* Separator Line */}
                  <div className="border-t border-slate-600 my-4"></div>

                  {/* Team 2 Section */}
                  <div>
                    <div className="text-left text-slate-400 text-sm mb-2">{currentFixture.team2Name}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="text-white text-lg font-medium">
                          {(() => {
                            // Handle different match types
                            if (match.player1Team2 && match.player2Team2) {
                              // Doubles - show both players
                              return `${match.player1Team2.split(' ')[0]} & ${match.player2Team2.split(' ')[0]}`;
                            } else if (match.player1Team2) {
                              // Singles - show single player
                              return match.player1Team2.split(' ')[0];
                            } else if (match.player2) {
                              // Alternative field name
                              return match.player2.split(' ')[0];
                            } else {
                              return 'TBD';
                            }
                          })()}
                        </div>
                      </div>
                      <div className="text-white text-4xl font-bold">
                        {match.scores?.player2?.game1 || match.scores?.player2?.total || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ));
          })()}
        </div>
      </div>

      {/* Bottom Logos Section - Fixed at bottom */}
      <div className="px-12 py-6 flex-shrink-0">
        <div className="flex justify-evenly items-center w-full">
          {bottomLogos.map((logo, index) => (
            <img
              key={`${logo.id}-${index}`}
              src={logo.url.includes('cloudinary.com')
                ? logo.url.replace('/upload/', '/upload/w_200,h_80,c_fit,f_auto,q_auto/')
                : logo.url
              }
              alt={logo.name || `Logo ${index + 1}`}
              className="h-20 w-auto"
              onError={(e) => {
                console.error('Failed to load bottom logo:', logo.url);
                e.target.style.display = 'none';
              }}
            />
          ))}
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
                {/* Timeout Timer Overlay - Only show during timeout */}
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
                    console.log('🎬 Rendering media overlay:', {
                      currentItem,
                      type: currentItem?.type,
                      videoId,
                      isDirectVideo,
                      currentMediaIndex,
                      totalItems: mediaItems.length,
                      showAdsMedia
                    });
                    
                    if (!currentItem) {
                      return (
                        <div className="text-center text-white">
                          <div className="text-8xl mb-8">🎬</div>
                          <h2 className="text-6xl font-bold mb-4">Loading Media...</h2>
                        </div>
                      );
                    }
                    
                    if (currentItem.type === 'image') {
                      // Image display
                      console.log('🖼️ Displaying image:', currentItem.url);
                      
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
                      // Video display
                      if (videoId) {
                        // YouTube video
                        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1`;
                        console.log('🎬 YouTube embed URL:', embedUrl);
                        
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
                        // Direct video file (Cloudinary, etc.)
                        console.log('🎬 Direct video URL:', currentItem.url);
                        
                        return (
                          <div className="w-full h-full">
                            <video
                              className="w-full h-full object-contain"
                              autoPlay
                              loop={mediaItems.length === 1} // Only loop if it's the only item
                              muted={false}
                              controls={false}
                              playsInline
                              onEnded={handleMediaEnd} // Switch to next media when current ends
                            >
                              <source src={currentItem.url} type={
                                currentItem.url.toLowerCase().includes('.webm') ? 'video/webm' :
                                currentItem.url.toLowerCase().includes('.mp4') ? 'video/mp4' :
                                currentItem.url.toLowerCase().includes('.ogg') ? 'video/ogg' :
                                currentItem.url.toLowerCase().includes('.mov') ? 'video/quicktime' :
                                'video/mp4' // default fallback
                              } />
                              Your browser does not support the video tag or this video format.
                            </video>
                          </div>
                        );
                      } else {
                        console.log('🎬 Invalid video format:', currentItem.url);
                        return (
                          <div className="text-center text-white">
                            <div className="text-8xl mb-8">🎥</div>
                            <h2 className="text-6xl font-bold mb-4">Video Error</h2>
                            <p className="text-2xl text-slate-300">
                              {currentItem.title || 'Invalid video format'}
                            </p>
                            <p className="text-lg text-red-400 mt-4">
                              URL: {currentItem.url}
                            </p>
                          </div>
                        );
                      }
                    } else {
                      console.log('🎬 Unknown media type:', currentItem.type);
                      return (
                        <div className="text-center text-white">
                          <div className="text-8xl mb-8">❓</div>
                          <h2 className="text-6xl font-bold mb-4">Unknown Media Type</h2>
                          <p className="text-2xl text-slate-300">
                            {currentItem.title || 'Unknown media'}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Debug Info */}
                <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>ADS MODE ACTIVE</span>
                  </div>
                  <div className="mt-1 text-xs">
                    {getCurrentMediaItem()?.type === 'image' ? 'Image Display (10s)' : 'Video Display'}
                  </div>
                  <div className="mt-1 text-xs">
                    {currentMediaIndex + 1} of {mediaItems.length}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* DRS Video Overlay */}
      {isDRSVideoPlaying && drsVideoUrl && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* YouTube Video Embed */}
            <iframe
              src={`https://www.youtube.com/embed/${extractVideoId(drsVideoUrl)}?autoplay=1&controls=1&rel=0&modestbranding=1`}
              title="DRS Review Video"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            
            {/* DRS Overlay Info */}
            <div className="absolute top-4 left-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>🎥 DRS REVIEW IN PROGRESS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}