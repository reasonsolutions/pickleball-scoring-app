import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { resolveDisplayLogos, useMatchLogoOverride } from '../utils/matchLogos';
import SlidingImagesOverlay from '../components/SlidingImagesOverlay';
import TimeoutSequenceOverlay, { getActiveTimeout } from '../components/TimeoutSequenceOverlay';
import { getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

// Import background image
import mainDisplayBg from '../assets/maindisplay.png';

// Import default paddle logo as fallback
import paddleLogo from '../assets/paddle.png';
import LineupIntro, { pickIntroScene } from '../components/LineupIntro';
import MatchPreview from '../components/MatchPreview';
import TitleSponsorScreen, { useTitleSponsorWindow } from '../components/TitleSponsorScreen';
import AllSquareOverlay, { useAllSquareTrigger } from '../components/AllSquareOverlay';
import ElectricStreakOverlay, { useElectricStreakTrigger } from '../components/ElectricStreakOverlay';
import MatchPointOverlay, { useMatchPointTrigger } from '../components/MatchPointOverlay';
import { computeSeasonRecords } from '../utils/seasonRecords';
import { getActiveJumbotronTheme, getJumbotronTheme, JumbotronThemeStyles, JumbotronThemeBackdrop, JumbotronThemeForeground, JumbotronPillFrame, themedScore } from '../components/jumbotronThemes';

// Jumbotron header logo (fallback when no display logos are configured)
import terminusLogo from '../assets/terminus-ccpl-logo.png';

export default function MainDisplay() {
  const { tournamentId, dateString } = useParams();
  const [tournament, setTournament] = useState(null);
  const [currentFixture, setCurrentFixture] = useState(null);
  // Lineup intro triggered from the Remote
  const [introScene, setIntroScene] = useState(null);
  const finishedIntroRef = useRef(null);
  const [liveMatch, setLiveMatch] = useState(null);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [fixtureMatches, setFixtureMatches] = useState([]);
  // Fixture win-loss record per team name across the tournament, e.g. { 'Raptors': '3-1 season' }
  const [seasonRecords, setSeasonRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseReadCount, setFirebaseReadCount] = useState(0);
  
  // Ads Media state (videos and images)
  const [mediaItems, setMediaItems] = useState([]);
  
  // Dynamic logos state
  const [displayLogos, setDisplayLogos] = useState([]);
  const [bottomLogos, setBottomLogos] = useState([]);
  const [logosDocData, setLogosDocData] = useState({});
  const [slidingImages, setSlidingImages] = useState([]);
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
  // Today's matches for this court, kept in state for the title sponsor window
  const [courtDayMatches, setCourtDayMatches] = useState([]);
  const centerCourtMatchesRef = useRef([]);
  const currentFixtureRef = useRef(null);
  const readCountRef = useRef(0);
  const listenersSetupRef = useRef(false);
  const timeoutIntervalRef = useRef(null);

  // Scale the fixed 1920x1080 jumbotron canvas to fit the screen
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const fit = () => setFitScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

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
        // Team names repeat across tournaments - prefer this tournament's team, then any team with a logo
        const teamDocs = snapshot.docs.map(d => d.data());
        const hasLogo = (t) => t.logo?.url || t.logoUrl;
        const teamData =
          teamDocs.find(t => t.tournamentId === tournamentId && hasLogo(t)) ||
          teamDocs.find(t => t.tournamentId === tournamentId) ||
          teamDocs.find(hasLogo) ||
          teamDocs[0];
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
  }, [teamLogosCache, tournamentId]);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        {Array.from({ length: dotCount }, (_, index) => (
          <span
            key={index}
            style={{ display: 'block', width: 26, height: 26, borderRadius: '50%', background: 'var(--jb-serve, #ffd23a)', animation: 'jb-servepulse 1.6s ease-in-out infinite' }}
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
          timeoutValue.startTime &&
          timeoutValue.type === 'substitution')); // Regular timeouts run TimeoutSequenceOverlay instead
      
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

  // Helper function to calculate total points for each team in all matches
  const calculateTotalPoints = useCallback((matches) => {
    let team1Points = 0;
    let team2Points = 0;
    
    matches.forEach(match => {
      if (match.status === 'completed') {
        const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
        const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
        team1Points += team1Score;
        team2Points += team2Score;
      }
    });
    
    return { team1Points, team2Points };
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
    setFixtureMatches(fixtureMatches);
    
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

  // Live tournament logos; the current match's own logos override the defaults
  useEffect(() => {
    if (!tournamentId) return;
    const unsubscribe = onSnapshot(
      doc(db, 'tournament_logos', tournamentId),
      (logosDoc) => setLogosDocData(logosDoc.exists() ? logosDoc.data() : {}),
      (error) => {
        console.error('Error loading display logos:', error);
        setLogosDocData({});
      }
    );
    return () => unsubscribe();
  }, [tournamentId]);

  const matchLogoOverride = useMatchLogoOverride(tournamentId, dateString, currentFixture);

  useEffect(() => {
    const resolved = resolveDisplayLogos(logosDocData, dateString, currentFixture, matchLogoOverride);
    setDisplayLogos(resolved.displayLogos);
    setBottomLogos(resolved.bottomLogos);
    setSlidingImages(resolved.slidingImages);
  }, [logosDocData, matchLogoOverride, dateString, currentFixture?.fixtureGroupId, currentFixture?.team1Name, currentFixture?.team2Name]);

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
          
          // Start DRS video with team data
          setDrsVideoUrl(matchData.drsVideoUrl);
          setIsDRSVideoPlaying(true);
          
          // Store DRS team data for display
          setMatch(prevMatch => ({
            ...prevMatch,
            drsTeam: matchData.drsTeam,
            drsTeamName: matchData.drsTeamName
          }));
          
          // Fetch team logos
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
          
          console.log('🎥 DRS Video started:', matchData.drsVideoUrl, 'Team:', matchData.drsTeamName);
        }
        // Check if DRS video should be stopped
        else if (!matchData.drsVideoActive && isDRSVideoPlaying) {
          // Stop DRS video and restore previous state
          setIsDRSVideoPlaying(false);
          setDrsVideoUrl('');
          setTeam1Logo(null);
          setTeam2Logo(null);
          
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
          setIntroScene(prev => {
            const next = pickIntroScene(displaySetting.mainScene);
            if (next && next.startedAt === prev?.startedAt) return prev;
            // Don't replay an intro that already finished on this screen
            if (next && next.startedAt === finishedIntroRef.current) return null;
            return next;
          });
          
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

        setSeasonRecords(computeSeasonRecords(allMatches));

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
        setCourtDayMatches(dateMatches);
        
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

  // Regular timeout on the live match drives the timeout takeover (team -> ads -> countdown)
  const activeTimeout = getActiveTimeout(liveMatch);
  const clearActiveTimeout = useCallback(() => {
    if (!liveMatch?.id) return;
    updateDoc(doc(db, 'fixtures', liveMatch.id), { timeoutInProgress: null })
      .catch(error => console.error('Error clearing timeout in Firebase:', error));
  }, [liveMatch?.id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const showTitleSponsor = useTitleSponsorWindow(dateString, courtDayMatches);
  const showAllSquare = useAllSquareTrigger(liveMatch);
  const showElectricStreak = useElectricStreakTrigger(liveMatch);
  const showMatchPoint = useMatchPointTrigger(liveMatch);

  // Title sponsor screen before the next fixture and after the day's fixtures are decided
  if (showTitleSponsor) {
    return <TitleSponsorScreen />;
  }

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

  // Show featured image if all matches are scheduled
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

  const introOverlay = introScene ? (
    <LineupIntro
      key={introScene.startedAt}
      scene={introScene}
      tournamentId={tournamentId}
      onDone={() => {
        finishedIntroRef.current = introScene.startedAt;
        setIntroScene(null);
      }}
    />
  ) : null;

  if (!currentFixture || !liveMatch) {
    return (
      <>
      {introOverlay}
      <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mainDisplayBg})`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Center Court Matches</h2>
          <p>No center court matches found for {formatDate(dateString)}</p>
        </div>
      </div>
      </>
    );
  }

  // Between matches, preview the next one instead of the scoreboard (ads and DRS still take over when active)
  const isMatchActive = liveMatch.status === 'live' || liveMatch.status === 'in_progress' || liveMatch.status === 'completed';
  if (!isMatchActive && !isDRSVideoPlaying && !showAdsMedia) {
    return (
      <>
        <MatchPreview
          tournamentId={tournamentId}
          dateString={dateString}
          team1Name={currentFixture.team1Name}
          team2Name={currentFixture.team2Name}
          team1Logo={mainTeam1Logo}
          team2Logo={mainTeam2Logo}
          matches={fixtureMatches}
          nextMatch={liveMatch}
          records={seasonRecords}
          scale={fitScale}
        />
        {introOverlay}
      </>
    );
  }

  // ---- Jumbotron design values (presentation only) ----
  const jt = getJumbotronTheme(getActiveJumbotronTheme(logosDocData));
  const jbPalette = jt.palette;
  const [jbC1, jbC2, jbC3, jbC4] = jbPalette;
  const [jbB1, jbB2, jbB3, jbB4] = jt.blobColors || [jbC1, jbC2, jbC3, jbC1];
  const jbBlob = (key, bg, w, h, x, y, anim, blur) => (
    <div
      key={key}
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: '50%', background: bg, filter: `blur(${blur + jt.blobBlurBoost}px)`, opacity: jt.blobOpacity, animation: anim, willChange: 'transform', mixBlendMode: 'screen' }}
    />
  );

  const team1MatchesWon = completedMatches.filter(match => {
    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
    return team1Score > team2Score;
  }).length;
  const team2MatchesWon = completedMatches.filter(match => {
    const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
    const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
    return team2Score > team1Score;
  }).length;

  const liveScore1 = liveMatch.scores?.player1?.game1 ||
    liveMatch.scores?.player1?.total ||
    liveMatch.team1Score ||
    liveMatch.score1 ||
    0;
  const liveScore2 = liveMatch.scores?.player2?.game1 ||
    liveMatch.scores?.player2?.total ||
    liveMatch.team2Score ||
    liveMatch.score2 ||
    0;

  const liveTeam1Players = [liveMatch.player1Team1, liveMatch.player2Team1].filter(Boolean).join(' / ');
  const liveTeam2Players = [liveMatch.player1Team2, liveMatch.player2Team2].filter(Boolean).join(' / ');

  // In Game Breaker scenario (3-3), show the 6 matches that were played before
  const otherMatchesToShow = (() => {
    const fixtureScore = calculateFixtureScore(completedMatches);
    const isGameBreakerScenario = fixtureScore.team1Wins === 3 && fixtureScore.team2Wins === 3;

    if (isGameBreakerScenario) {
      // Show the 6 completed matches that were played before the Game Breaker (exclude the live Game Breaker)
      return completedMatches
        .filter(match => match.id !== liveMatch.id)
        .slice(0, 6);
    }
    // Normal scenario: show completed + upcoming, excluding live match, max 5
    return [...completedMatches, ...upcomingMatches]
      .filter(match => match.id !== liveMatch.id)
      .slice(0, 5);
  })();

  const getTeam1PlayersShort = (match) => {
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
    }
    return 'TBD';
  };

  const getTeam2PlayersShort = (match) => {
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
    }
    return 'TBD';
  };

  const getCardStyle = (match) => {
    const scoreA = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
    const scoreB = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
    const done = match.status === 'completed';
    const isLive = match.status === 'live' || match.status === 'in_progress';
    const aWin = done && scoreA > scoreB;
    const bWin = done && scoreB > scoreA;
    const win = jt.winBg, winBorder = jt.winBorder, lose = 'rgba(0,0,0,.25)', loseBorder = 'rgba(255,255,255,.06)';
    return {
      scoreA,
      scoreB,
      status: done ? 'Final' : isLive ? 'Live' : 'Up Next',
      badgeBg: done ? 'rgba(255,255,255,.12)' : isLive ? jbC1 : jt.upNextBadge,
      badgeColor: done ? 'rgba(255,255,255,.8)' : '#fff',
      glow: isLive ? `radial-gradient(ellipse at 50% 0%, ${jbC1}55, transparent 60%)` : 'none',
      aBg: aWin ? win : bWin ? lose : 'rgba(255,255,255,.05)',
      bBg: bWin ? win : aWin ? lose : 'rgba(255,255,255,.05)',
      aBorder: aWin ? winBorder : loseBorder,
      bBorder: bWin ? winBorder : loseBorder,
      aColor: bWin ? 'rgba(255,255,255,.4)' : '#fff',
      bColor: aWin ? 'rgba(255,255,255,.4)' : '#fff',
    };
  };

  const jbLabel = (label) => (label === 'Dream Breaker' ? 'Game Breaker' : label);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: jt.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Schibsted Grotesk', sans-serif" }}>
      <style>{`
        @keyframes jb-drift1{0%{transform:translate(-8%,-6%) rotate(-12deg) scale(1)}50%{transform:translate(6%,4%) rotate(-6deg) scale(1.15)}100%{transform:translate(-8%,-6%) rotate(-12deg) scale(1)}}
        @keyframes jb-drift2{0%{transform:translate(10%,8%) rotate(14deg) scale(1.1)}50%{transform:translate(-6%,-4%) rotate(20deg) scale(0.95)}100%{transform:translate(10%,8%) rotate(14deg) scale(1.1)}}
        @keyframes jb-drift3{0%{transform:translate(0,0) scale(1);opacity:.9}50%{transform:translate(-4%,6%) scale(1.25);opacity:.6}100%{transform:translate(0,0) scale(1);opacity:.9}}
        @keyframes jb-livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,45,120,.7)}50%{opacity:.6;box-shadow:0 0 0 10px rgba(255,45,120,0)}}
        @keyframes jb-servepulse{0%,100%{box-shadow:0 0 0 0 rgba(255,210,58,.75),0 0 18px rgba(255,210,58,.8)}50%{box-shadow:0 0 0 14px rgba(255,210,58,0),0 0 18px rgba(255,210,58,.8)}}
        @keyframes jb-sheen{0%{transform:translateX(-140%) skewX(-20deg)}100%{transform:translateX(240%) skewX(-20deg)}}
      `}</style>
      <JumbotronThemeStyles theme={jt.name} />

      {/* Jumbotron canvas (1920x1080, scaled to fit) */}
      <div style={{ position: 'relative', flex: 'none', width: 1920, height: 1080, transform: `scale(${fitScale})`, transformOrigin: 'center center', overflow: 'hidden', background: jt.canvasBg, color: '#fff', '--jb-serve': jt.serveDot }}>
        <SlidingImagesOverlay
          images={slidingImages}
          startAfter={logosDocData.slidingImagesStartAfter || 0}
          duration={logosDocData.slidingImagesDuration || 5}
        />
        {activeTimeout && (
          <TimeoutSequenceOverlay
            timeout={activeTimeout}
            teamName={activeTimeout.team === 'team1' ? liveMatch.team1Name : liveMatch.team2Name}
            teamLogo={getTeamLogo(activeTimeout.team === 'team1' ? liveMatch.team1Name : liveMatch.team2Name)}
            images={slidingImages}
            onComplete={clearActiveTimeout}
          />
        )}
        {/* Animated backdrop */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `radial-gradient(ellipse at 50% 100%, ${jbC4} 0%, ${jt.canvasBg} 70%)` }}>
          {jbBlob('b1', `radial-gradient(ellipse at center, ${jbB1} 0%, transparent 65%)`, 1400, 700, -200, -150, 'jb-drift1 14s ease-in-out infinite', 70)}
          {jbBlob('b2', `radial-gradient(ellipse at center, ${jbB2} 0%, transparent 65%)`, 1500, 800, 700, 350, 'jb-drift2 18s ease-in-out infinite', 80)}
          {jbBlob('b3', `radial-gradient(ellipse at center, ${jbB3} 0%, transparent 60%)`, 700, 350, 1200, -100, 'jb-drift3 11s ease-in-out infinite', 60)}
          {jbBlob('b4', `radial-gradient(ellipse at center, ${jbB4} 0%, transparent 60%)`, 900, 400, 300, 750, 'jb-drift3 16s ease-in-out infinite reverse', 70)}
        </div>
        <JumbotronThemeBackdrop theme={jt.name} palette={jbPalette} />
        <div style={{ position: 'absolute', inset: 0, background: jt.vignette }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px)', mixBlendMode: 'overlay', pointerEvents: 'none' }} />
        <JumbotronThemeForeground theme={jt.name} palette={jbPalette} />

        <div style={{ position: 'relative', display: 'grid', gridTemplateRows: bottomLogos.length > 0 ? 'auto 1fr auto auto' : 'auto 1fr auto', gridTemplateColumns: 'minmax(0,1fr)', height: '100%', width: '100%', padding: '48px 72px 56px', boxSizing: 'border-box', gap: bottomLogos.length > 0 ? 28 : 36 }}>

          {/* Header: sponsor logos (falls back to the Terminus CCPL logo) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: displayLogos.length > 0 ? 'space-evenly' : 'center' }}>
            {displayLogos.length > 0 ? (
              displayLogos.map((logo, index) => (
                <img
                  key={logo.id || index}
                  src={logo.publicId ? getOptimizedLogoUrl(logo.publicId, { width: 260, height: 104 }) : logo.url}
                  alt={logo.title || 'Sponsor Logo'}
                  style={{ height: 100, width: 'auto', maxWidth: 220, objectFit: 'contain', filter: jt.logoGlow }}
                  onError={(e) => {
                    e.target.src = logo.url; // Fallback to original URL
                  }}
                />
              ))
            ) : (
              <img src={terminusLogo} alt="Terminus CCPL HYD" style={{ height: 120, width: 'auto', display: 'block', filter: jt.logoGlow }} />
            )}
          </div>

          {/* Main scoreboard */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 28, padding: '0 16px', minWidth: 0, borderRadius: 32, background: 'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))', border: jt.scoreboardBorder, boxShadow: '0 40px 120px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25)', backdropFilter: 'blur(14px)' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: jt.topBar }} />
            </div>

            {/* Team 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: 28, paddingLeft: 16, minWidth: 0 }}>
              <div style={{ position: 'relative', width: 220, height: 220, borderRadius: 28, padding: 4, background: jt.team1Frame, boxShadow: jt.team1FrameGlow, boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: jt.logoTileBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={mainTeam1Logo || paddleLogo} alt={`${currentFixture.team1Name} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <div style={{ font: "500 22px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.3em', textTransform: 'uppercase', color: jt.wonLabel }}>Matches won</div>
                <div style={{ font: "900 30px/1 'Unbounded',sans-serif", letterSpacing: '-.05em', background: jt.team1WonText, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: jt.team1WonGlow }}>{team1MatchesWon}</div>
                <div style={{ font: "900 36px/1.05 'Unbounded',sans-serif", textTransform: 'uppercase', letterSpacing: '-.01em', textWrap: 'balance', minWidth: 0 }}>{currentFixture.team1Name}</div>
                {liveTeam1Players && (
                  <div style={{ font: "500 24px/1.25 'Schibsted Grotesk',sans-serif", color: 'rgba(255,255,255,.72)', textWrap: 'balance' }}>{liveTeam1Players}</div>
                )}
              </div>
            </div>

            {/* Center game score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 44px', borderRadius: 24, flex: 'none', background: jt.centerBg, border: jt.centerBorder, boxShadow: jt.centerGlow }}>
              <JumbotronPillFrame theme={jt.name}>
                <div style={{ position: 'relative', overflow: 'hidden', padding: jt.pillPadding, marginBottom: jt.pillMargin, borderRadius: jt.pillRadius, background: jt.pillBg, font: jt.pillFont, letterSpacing: jt.pillLetterSpacing, textTransform: jt.pillTransform, color: jt.pillColor, whiteSpace: 'nowrap', boxShadow: jt.pillGlow }}>
                  {jbLabel(liveMatch.matchTypeLabel)}
                  <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)', animation: 'jb-sheen 3.2s ease-in-out infinite' }} />
                </div>
              </JumbotronPillFrame>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, font: "900 190px/1 'Unbounded',sans-serif", letterSpacing: '-.06em', fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {/* Team 1 Serve Indicators */}
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderServeIndicators(liveMatch, 'team1')}
                  </div>
                  <span style={{ minWidth: '1.1ch', textAlign: 'center', textShadow: jt.scoreGlow }}>{themedScore(liveScore1, jt)}</span>
                </div>
                <span style={{ width: 56, height: 14, marginTop: 50, borderRadius: 7, background: jt.dash, boxShadow: jt.dashGlow }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {/* Team 2 Serve Indicators */}
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderServeIndicators(liveMatch, 'team2')}
                  </div>
                  <span style={{ minWidth: '1.1ch', textAlign: 'center', textShadow: jt.scoreGlow }}>{themedScore(liveScore2, jt, 0.37)}</span>
                </div>
              </div>
            </div>

            {/* Team 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 28, paddingRight: 16, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'right', alignItems: 'flex-end', minWidth: 0 }}>
                <div style={{ font: "500 22px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.3em', textTransform: 'uppercase', color: jt.wonLabel }}>Matches won</div>
                <div style={{ font: "900 30px/1 'Unbounded',sans-serif", letterSpacing: '-.05em', background: jt.team2WonText, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: jt.team2WonGlow }}>{team2MatchesWon}</div>
                <div style={{ font: "900 36px/1.05 'Unbounded',sans-serif", textTransform: 'uppercase', letterSpacing: '-.01em', textWrap: 'balance', minWidth: 0 }}>{currentFixture.team2Name}</div>
                {liveTeam2Players && (
                  <div style={{ font: "500 24px/1.25 'Schibsted Grotesk',sans-serif", color: 'rgba(255,255,255,.72)', textWrap: 'balance' }}>{liveTeam2Players}</div>
                )}
              </div>
              <div style={{ position: 'relative', width: 220, height: 220, borderRadius: 28, padding: 4, background: jt.team2Frame, boxShadow: jt.team2FrameGlow, boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: jt.logoTileBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={mainTeam2Logo || paddleLogo} alt={`${currentFixture.team2Name} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Other Matches in Fixture */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(5, otherMatchesToShow.length)},minmax(0,1fr))`, gap: 24, minWidth: 0 }}>
            {otherMatchesToShow.map((match) => {
              const s = getCardStyle(match);
              return (
                <div key={match.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, padding: '22px 26px 26px', borderRadius: 22, minWidth: 0, background: 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025))', border: jt.cardBorder, boxShadow: '0 20px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.2)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: s.glow, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ font: "700 22px/1.1 'Unbounded',sans-serif", letterSpacing: '.02em', textTransform: 'uppercase', minWidth: 0, textWrap: 'balance', background: jt.cardLabel, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{jbLabel(match.matchTypeLabel)}</div>
                    <div style={{ flex: 'none', font: "800 16px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.2em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 999, background: s.badgeBg, color: s.badgeColor, animation: s.status === 'Live' ? 'jb-livepulse 1.6s ease-in-out infinite' : 'none' }}>{s.status}</div>
                  </div>
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: s.aBg, border: `1px solid ${s.aBorder}` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <div style={{ font: "800 17px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', textWrap: 'balance' }}>{currentFixture.team1Name}</div>
                      <div style={{ font: "500 19px/1.25 'Schibsted Grotesk',sans-serif", color: 'rgba(255,255,255,.72)', textWrap: 'balance' }}>{getTeam1PlayersShort(match)}</div>
                    </div>
                    <div style={{ font: "900 48px/1 'Unbounded',sans-serif", letterSpacing: '-.04em', minWidth: '2.2ch', textAlign: 'right', color: s.aColor, fontVariantNumeric: 'tabular-nums' }}>{themedScore(s.scoreA, jt, 0.74)}</div>
                  </div>
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: s.bBg, border: `1px solid ${s.bBorder}` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <div style={{ font: "800 17px/1 'Schibsted Grotesk',sans-serif", letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', textWrap: 'balance' }}>{currentFixture.team2Name}</div>
                      <div style={{ font: "500 19px/1.25 'Schibsted Grotesk',sans-serif", color: 'rgba(255,255,255,.72)', textWrap: 'balance' }}>{getTeam2PlayersShort(match)}</div>
                    </div>
                    <div style={{ font: "900 48px/1 'Unbounded',sans-serif", letterSpacing: '-.04em', minWidth: '2.2ch', textAlign: 'right', color: s.bColor, fontVariantNumeric: 'tabular-nums' }}>{themedScore(s.scoreB, jt, 1.11)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Logos Section */}
          {bottomLogos.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', width: '100%' }}>
              {bottomLogos.map((logo, index) => (
                <img
                  key={`${logo.id}-${index}`}
                  src={logo.url}
                  alt={logo.name || `Logo ${index + 1}`}
                  style={{ height: 72, width: 'auto' }}
                  onError={(e) => {
                    console.error('Failed to load bottom logo:', logo.url);
                    e.target.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}
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
                            <p className="text-2xl text-orange-200">
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
                          <p className="text-2xl text-orange-200">
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

      {introOverlay}
      {/* Plays once each time the live match score is tied */}
      {showAllSquare && <AllSquareOverlay />}
      {/* Plays once each time a team scores 3 points in a row */}
      {/* Match point takes priority when both fire on the same point */}
      {showMatchPoint ? <MatchPointOverlay /> : showElectricStreak && <ElectricStreakOverlay />}
    </div>
  );
}
