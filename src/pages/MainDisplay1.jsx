import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { resolveDisplayLogos, useMatchLogoOverride } from '../utils/matchLogos';
import { getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';
import paddleLogo from '../assets/paddle.png';
import clubsLogo from '../assets/CLUBS.png';
import SlidingImagesCarousel from '../components/SlidingImagesCarousel';
import './MainDisplay1.css';

export default function MainDisplay1() {
  const { tournamentId, dateString } = useParams();
  const [tournament, setTournament] = useState(null);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [liveMatch, setLiveMatch] = useState(null);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseReadCount, setFirebaseReadCount] = useState(0);
  const [mediaItems, setMediaItems] = useState([]);
  const [displayLogos, setDisplayLogos] = useState([]);
  const [bottomLogos, setBottomLogos] = useState([]);
  const [logosDocData, setLogosDocData] = useState({});
  const [slidingImages, setSlidingImages] = useState([]);
  const [slidingImagesStartAfter, setSlidingImagesStartAfter] = useState(0);
  const [slidingImagesDuration, setSlidingImagesDuration] = useState(5);
  const [currentSlidingImageIndex, setCurrentSlidingImageIndex] = useState(0);
  const [showSlidingImage, setShowSlidingImage] = useState(false);
  const [slidingImageAnimationState, setSlidingImageAnimationState] = useState('hidden'); // 'hidden', 'slideUp', 'slideDown'
  const [showAdsMedia, setShowAdsMedia] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [imageTimer, setImageTimer] = useState(null);
  const [teamLogosCache, setTeamLogosCache] = useState({});
  const [timeoutTimer, setTimeoutTimer] = useState(null);
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [timeoutStarted, setTimeoutStarted] = useState(false);
  const [isDRSVideoPlaying, setIsDRSVideoPlaying] = useState(false);
  const [drsVideoUrl, setDrsVideoUrl] = useState('');
  const [previousDisplayState, setPreviousDisplayState] = useState(null);
  const [showFeaturedImage, setShowFeaturedImage] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [team1Logo, setTeam1Logo] = useState(null);
  const [team2Logo, setTeam2Logo] = useState(null);
  const [mainTeam1Logo, setMainTeam1Logo] = useState(null);
  const [mainTeam2Logo, setMainTeam2Logo] = useState(null);
  
  const centerCourtMatchesRef = useRef([]);
  const currentFixtureRef = useRef(null);
  const readCountRef = useRef(0);
  const listenersSetupRef = useRef(false);
  const timeoutIntervalRef = useRef(null);
  const slidingImageTimerRef = useRef(null);
  const slidingImageCycleRef = useRef(null);
  const slidingImageIndexRef = useRef(0);

  const cleanupStaleTimeouts = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const fixturesQuery = query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId));
      const snapshot = await getDocs(fixturesQuery);
      const cleanupPromises = [];
      
      snapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const isLive = data.status === 'live' || data.status === 'in_progress';
        if (data.timeoutInProgress && data.timeoutInProgress !== null && !isLive) {
          cleanupPromises.push(updateDoc(doc(db, 'fixtures', docSnapshot.id), { timeoutInProgress: null }));
        }
      });
      
      if (cleanupPromises.length > 0) await Promise.all(cleanupPromises);
    } catch (error) {
      console.error('Error cleaning up stale timeouts:', error);
    }
  }, [tournamentId]);

  const incrementFirebaseReads = useCallback((operation, details = '') => {
    readCountRef.current++;
    if (readCountRef.current % 10 === 0) setFirebaseReadCount(readCountRef.current);
  }, []);

  const extractVideoId = useCallback((url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }, []);

  const isDirectVideoUrl = useCallback((url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }, []);

  const getCurrentMediaItem = useCallback(() => {
    if (!showAdsMedia || mediaItems.length === 0) return null;
    return mediaItems[currentMediaIndex];
  }, [showAdsMedia, mediaItems, currentMediaIndex]);

  const getTeamLogo = useCallback((teamName) => {
    if (!teamName) return paddleLogo;
    return teamLogosCache[teamName] || paddleLogo;
  }, [teamLogosCache]);
  
  const fetchTeamLogo = useCallback(async (teamName) => {
    if (!teamName || teamLogosCache[teamName]) return;
    try {
      const teamsQuery = query(collection(db, 'teams'), where('name', '==', teamName));
      const snapshot = await getDocs(teamsQuery);
      if (snapshot.docs.length > 0) {
        const teamData = snapshot.docs[0].data();
        const logoUrl = teamData.logo?.url || teamData.logoUrl || paddleLogo;
        setTeamLogosCache(prev => ({ ...prev, [teamName]: logoUrl }));
      }
    } catch (error) {
      console.error('Error fetching team logo:', error);
    }
  }, [teamLogosCache]);

  const isDoublesMatch = useCallback((match) => {
    return match && (match.player2Team1 || match.player2Team2);
  }, []);

  const loadMediaItems = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const mediaDoc = await getDoc(doc(db, 'video_links', tournamentId));
      incrementFirebaseReads('Media Items Read', tournamentId);
      if (mediaDoc.exists()) {
        const data = mediaDoc.data();
        const items = data.mediaItems || data.links?.map(link => ({ ...link, type: 'video' })) || [];
        const sortedItems = items.sort((a, b) => a.rank - b.rank);
        setMediaItems(sortedItems);
      } else {
        setMediaItems([]);
      }
    } catch (error) {
      console.error('Error loading media items:', error);
      setMediaItems([]);
    }
  }, [tournamentId, incrementFirebaseReads, extractVideoId]);

  const checkShouldShowFeaturedImage = useCallback((matches) => {
    // Featured image display disabled
    setShowFeaturedImage(false);
    setFeaturedImageUrl('');
  }, []);

  const checkShouldShowAdsMedia = useCallback((matches, currentLiveMatch) => {
    if (mediaItems.length === 0) {
      setShowAdsMedia(false);
      return;
    }

    const hasTimeoutInProgress = matches.some(match => {
      const isLive = match.status === 'live' || match.status === 'in_progress';
      const timeoutValue = match.timeoutInProgress;
      const hasActiveTimeout = timeoutValue !== null && timeoutValue !== undefined && timeoutValue !== false &&
        (timeoutValue === true || (typeof timeoutValue === 'object' && timeoutValue.team && timeoutValue.startTime));
      return isLive && hasActiveTimeout;
    });
    
    const hasCompletedMatch = matches.some(match => match.status === 'completed');
    const hasLiveMatch = matches.some(match => match.status === 'live' || match.status === 'in_progress');
    const shouldShow = (hasTimeoutInProgress || (hasCompletedMatch && !hasLiveMatch)) && mediaItems.length > 0;

    setShowAdsMedia(shouldShow);
    
    if (hasTimeoutInProgress && shouldShow && !timeoutStarted) {
      setTimeoutStarted(true);
      setIsTimeoutActive(true);
      setTimeoutTimer(60);
    } else if (!hasTimeoutInProgress && timeoutStarted) {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = null;
      }
      setIsTimeoutActive(false);
      setTimeoutTimer(null);
      setTimeoutStarted(false);
    }
  }, [mediaItems.length, timeoutStarted]);

  const calculateFixtureScore = useCallback((matches) => {
    let team1Wins = 0;
    let team2Wins = 0;
    matches.forEach(match => {
      if (match.status === 'completed') {
        // Check if winner field exists
        if (match.winner) {
          if (match.winner === 'team1' || match.winner === 'player1') {
            team1Wins++;
          } else if (match.winner === 'team2' || match.winner === 'player2') {
            team2Wins++;
          }
        } else {
          // If no winner field, determine from scores
          const team1Score = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
          const team2Score = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
          if (team1Score > team2Score) {
            team1Wins++;
          } else if (team2Score > team1Score) {
            team2Wins++;
          }
        }
      }
    });
    return { team1Wins, team2Wins };
  }, []);

  const updateMatchesForFixture = useCallback((selectedFixture, matches) => {
    const fixtureMatches = matches.filter(match => match.fixtureGroupId === selectedFixture.fixtureGroupId);
    fixtureMatches.sort((a, b) => {
      const orderA = a.matchOrder || a.sequence || a.matchNumber || 0;
      const orderB = b.matchOrder || b.sequence || b.matchNumber || 0;
      return orderA - orderB;
    });

    const completed = fixtureMatches.filter(match => match.status === 'completed');
    const inProgress = fixtureMatches.filter(match => match.status === 'live' || match.status === 'in_progress');
    const upcoming = fixtureMatches.filter(match => !match.status || match.status === 'scheduled');

    console.log('🏆 Fixture Matches:', fixtureMatches.map(m => ({ id: m.id, status: m.status, team1: m.team1Name, team2: m.team2Name })));
    console.log('✅ Completed Matches:', completed.length, completed.map(m => ({ id: m.id, status: m.status, scores: m.scores })));
    
    const fixtureScore = calculateFixtureScore(completed);
    console.log('📊 Fixture Score:', fixtureScore);
    setCompletedMatches(completed);
    setUpcomingMatches(upcoming);
    
    let liveMatchToSet = null;
    if (fixtureScore.team1Wins === 3 && fixtureScore.team2Wins === 3) {
      const gameBreakerMatch = fixtureMatches.find(match =>
        match.matchTypeLabel === 'Game Breaker' || match.matchTypeLabel === 'Dream Breaker' ||
        (match.matchOrder === 7 || match.sequence === 7 || match.matchNumber === 7)
      );
      if (gameBreakerMatch) liveMatchToSet = gameBreakerMatch;
    }
    
    if (!liveMatchToSet) {
      if (inProgress.length > 0) liveMatchToSet = inProgress[0];
      else if (upcoming.length > 0) liveMatchToSet = upcoming[0];
      else if (completed.length > 0) liveMatchToSet = completed[completed.length - 1];
    }
    
    setLiveMatch(liveMatchToSet);
    checkShouldShowFeaturedImage(fixtureMatches);
    if (liveMatchToSet) checkShouldShowAdsMedia(fixtureMatches, liveMatchToSet);
  }, [checkShouldShowAdsMedia, checkShouldShowFeaturedImage, mediaItems, calculateFixtureScore]);

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
    if (tournamentId) fetchInitialData();
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) cleanupStaleTimeouts();
  }, [tournamentId, cleanupStaleTimeouts]);

  useEffect(() => {
    if (tournamentId) loadMediaItems();
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
    setSlidingImagesStartAfter(logosDocData.slidingImagesStartAfter || 0);
    setSlidingImagesDuration(logosDocData.slidingImagesDuration || 5);
  }, [logosDocData, matchLogoOverride, dateString, currentFixture?.fixtureGroupId, currentFixture?.team1Name, currentFixture?.team2Name]);

  useEffect(() => {
    if (!liveMatch) return;
    const fetchLogos = async () => {
      if (liveMatch.team1Name) await fetchTeamLogo(liveMatch.team1Name);
      if (liveMatch.team2Name) await fetchTeamLogo(liveMatch.team2Name);
    };
    fetchLogos();
  }, [liveMatch?.team1Name, liveMatch?.team2Name, fetchTeamLogo]);

  useEffect(() => {
    if (liveMatch) {
      setMainTeam1Logo(getTeamLogo(liveMatch.team1Name));
      setMainTeam2Logo(getTeamLogo(liveMatch.team2Name));
    }
  }, [liveMatch, teamLogosCache, getTeamLogo]);

  useEffect(() => {
    if (!liveMatch?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'fixtures', liveMatch.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const matchData = docSnapshot.data();
        if (matchData.drsVideoActive && matchData.drsVideoUrl && !isDRSVideoPlaying) {
          setPreviousDisplayState({ showAdsMedia, currentMediaIndex, isTimeoutActive });
          setShowAdsMedia(false);
          setIsTimeoutActive(false);
          setDrsVideoUrl(matchData.drsVideoUrl);
          setIsDRSVideoPlaying(true);
        } else if (!matchData.drsVideoActive && isDRSVideoPlaying) {
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
        }
      }
    });
    return () => unsubscribe();
  }, [liveMatch?.id, isDRSVideoPlaying, showAdsMedia, currentMediaIndex, isTimeoutActive, previousDisplayState]);

  useEffect(() => {
    if (isTimeoutActive && timeoutTimer !== null && timeoutTimer > 0) {
      if (timeoutIntervalRef.current) clearInterval(timeoutIntervalRef.current);
      timeoutIntervalRef.current = setInterval(() => {
        setTimeoutTimer(prev => {
          if (prev <= 1) {
            clearInterval(timeoutIntervalRef.current);
            timeoutIntervalRef.current = null;
            setIsTimeoutActive(false);
            setTimeoutTimer(null);
            setTimeoutStarted(false);
            setShowAdsMedia(false);
            if (liveMatch?.id) {
              updateDoc(doc(db, 'fixtures', liveMatch.id), { timeoutInProgress: null });
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

  useEffect(() => {
    if (!showAdsMedia || mediaItems.length <= 1) return;
  }, [showAdsMedia, mediaItems.length]);

  const handleMediaEnd = useCallback(() => {
    if (mediaItems.length > 1) {
      setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
    }
  }, [mediaItems.length]);

  useEffect(() => {
    const currentItem = getCurrentMediaItem();
    if (showAdsMedia && currentItem && currentItem.type === 'image') {
      const timer = setTimeout(() => handleMediaEnd(), 10000);
      setImageTimer(timer);
      return () => {
        if (timer) {
          clearTimeout(timer);
          setImageTimer(null);
        }
      };
    }
  }, [showAdsMedia, currentMediaIndex, getCurrentMediaItem, handleMediaEnd]);

  // Sliding Images Animation Effect
  useEffect(() => {
    if (slidingImages.length === 0) return;

    const startSlidingImageCycle = () => {
      // Clear any existing timers
      if (slidingImageTimerRef.current) clearTimeout(slidingImageTimerRef.current);
      if (slidingImageCycleRef.current) clearTimeout(slidingImageCycleRef.current);

      let currentIndex = 0;

      const runCycle = () => {
        // Wait for slidingImagesStartAfter seconds before showing
        slidingImageTimerRef.current = setTimeout(() => {
          setSlidingImageAnimationState('slideUp');
          setShowSlidingImage(true);
          setCurrentSlidingImageIndex(currentIndex);

          // After slideUp animation (2 seconds) + duration, start slideDown
          slidingImageCycleRef.current = setTimeout(() => {
            setSlidingImageAnimationState('slideDown');

            // Wait for slideDown animation to complete (2 seconds) before hiding
            slidingImageTimerRef.current = setTimeout(() => {
              setShowSlidingImage(false);
              setSlidingImageAnimationState('hidden');
              currentIndex = (currentIndex + 1) % slidingImages.length;
              
              // Restart cycle
              runCycle();
            }, 2000);
          }, 2000 + slidingImagesDuration * 1000);
        }, slidingImagesStartAfter * 1000);
      };

      runCycle();
    };

    startSlidingImageCycle();

    return () => {
      if (slidingImageTimerRef.current) clearTimeout(slidingImageTimerRef.current);
      if (slidingImageCycleRef.current) clearTimeout(slidingImageCycleRef.current);
    };
  }, [slidingImages.length, slidingImagesStartAfter, slidingImagesDuration]);

  useEffect(() => {
    if (!tournamentId || !dateString || listenersSetupRef.current) return;
    listenersSetupRef.current = true;

    const displaySettingId = `${tournamentId}_${dateString}`;
    const displaySettingsUnsubscribe = onSnapshot(
      doc(db, 'display_settings', displaySettingId),
      (docSnapshot) => {
        incrementFirebaseReads('Display Settings Listener', displaySettingId);
        if (docSnapshot.exists()) {
          const displaySetting = docSnapshot.data();
          const selectedFixture = displaySetting.currentFixture || displaySetting.currentMainFixture;
          if (selectedFixture) {
            currentFixtureRef.current = selectedFixture;
            setCurrentFixture(selectedFixture);
            if (centerCourtMatchesRef.current.length > 0) {
              updateMatchesForFixture(selectedFixture, centerCourtMatchesRef.current);
            }
          }
        }
      }
    );

    const matchesQuery = query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId));
    const matchesUnsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      incrementFirebaseReads('Matches Query', `${snapshot.docs.length} total matches`);
      const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const dateMatches = allMatches.filter(match => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
        const matchDateString = matchDate.toISOString().split('T')[0];
        const courtName = match.court?.toLowerCase() || '';
        return matchDateString === dateString && (courtName.includes('center') || courtName.includes('centre'));
      });

      centerCourtMatchesRef.current = dateMatches;
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
      if (currentFixtureRef.current) {
        updateMatchesForFixture(currentFixtureRef.current, dateMatches);
      }
    });

    return () => {
      displaySettingsUnsubscribe();
      matchesUnsubscribe();
      listenersSetupRef.current = false;
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="loading loading-spinner loading-lg text-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!currentFixture || !liveMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Center Court Matches</h2>
          <p>No center court matches found for {formatDate(dateString)}</p>
        </div>
      </div>
    );
  }

  const fixtureScore = calculateFixtureScore(completedMatches);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden flex flex-col" style={{
      background: 'radial-gradient(120% 80% at 50% 110%, rgba(225,90,28,0.18), transparent 60%), radial-gradient(80% 60% at 50% -10%, rgba(225,90,28,0.08), transparent 60%), linear-gradient(180deg, #08050300 0%, #050302 100%), #050302'
    }}>
      {/* Top Bar */}
      <div className="h-20 border-b border-orange-900 flex items-center justify-between px-12 bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src={clubsLogo} alt="CLUBS" className="h-16 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-8 text-sm">
          <span className="text-gray-400 tracking-widest">CENTER COURT · FRI · 29 MAY 2026</span>
          <div className="flex items-center gap-2 bg-red-900 px-4 py-2 rounded">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold tracking-widest zuume-display">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-12 gap-8 overflow-hidden">
        {/* Hero Match */}
        <div className="flex-1 bg-gradient-to-b from-orange-950/40 to-black/40 border border-orange-900/50 rounded-lg p-12 relative overflow-hidden">
          
          {/* Match Type Badge */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-12 py-3 rounded text-3xl font-black tracking-[0.2em] z-10 match-type-badge-2-1" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, transform: 'translateX(-50%) scale(0.8)' }}>
            {liveMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : liveMatch.matchTypeLabel}
          </div>

          <div className="relative z-10 flex items-center justify-between h-full pt-12 gap-12">
            {/* Team 1 (Home) - Logo Col First */}
            <div className="flex-1 flex items-center gap-12">
              {/* Logo Column */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <div className="text-7xl font-black text-white zuume-display matches-won-2-1" style={{ textShadow: '0 4px 0 rgba(0,0,0,0.4), 0 0 50px rgba(225,90,28,0.4)' }}>
                    {fixtureScore.team1Wins}
                  </div>
                  <div className="text-xs text-orange-400 tracking-widest mt-2">MATCHES WON</div>
                </div>
                <img src={mainTeam1Logo || paddleLogo} alt={currentFixture.team1Name} className="w-48 h-48 object-contain" />
              </div>
              
              {/* Team Meta */}
              <div className="flex flex-col gap-3">
                {liveMatch.servingPlayer === 'player1' && (
                  <div className="serve-dot-container">
                    {Array.from({ length: (isDoublesMatch(liveMatch) ? (liveMatch.teamServeCount || 0) + 1 : 1) }, (_, i) => (
                      <div key={i} className="serve-dot"></div>
                    ))}
                  </div>
                )}
                <h3 className="text-5xl font-black text-white zuume-display leading-tight team-name-2-1">{currentFixture.team1Name}</h3>
                <div className="text-orange-400 font-bold text-2xl zuume-display space-y-1 player-name-2-1">
                  {liveMatch.player1Team1 && <div className="uppercase">{liveMatch.player1Team1}</div>}
                  {liveMatch.player2Team1 && <div className="uppercase">{liveMatch.player2Team1}</div>}
                </div>
              </div>
            </div>

            {/* Center Score */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              <div className="text-xs text-orange-400 tracking-widest mb-4">GAME · IN PLAY</div>
              <div className="flex items-baseline gap-8">
                <div className="text-9xl font-black text-white zuume-display score-number-2-1" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.5), 0 0 80px rgba(225,90,28,0.55)' }}>
                  {liveMatch.scores?.player1?.game1 || liveMatch.scores?.player1?.total || liveMatch.team1Score || liveMatch.score1 || 0}
                </div>
                <div className="text-7xl font-black text-orange-500 zuume-display score-dash-2-1">–</div>
                <div className="text-9xl font-black text-white zuume-display score-number-2-1" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.5), 0 0 80px rgba(225,90,28,0.55)' }}>
                  {liveMatch.scores?.player2?.game1 || liveMatch.scores?.player2?.total || liveMatch.team2Score || liveMatch.score2 || 0}
                </div>
              </div>
            </div>

            {/* Team 2 (Away) - Team Meta First */}
            <div className="flex-1 flex items-center gap-12 flex-row-reverse">
              {/* Logo Column */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <div className="text-7xl font-black text-white zuume-display matches-won-2-1" style={{ textShadow: '0 4px 0 rgba(0,0,0,0.4), 0 0 50px rgba(225,90,28,0.4)' }}>
                    {fixtureScore.team2Wins}
                  </div>
                  <div className="text-xs text-orange-400 tracking-widest mt-2">MATCHES WON</div>
                </div>
                <img src={mainTeam2Logo || paddleLogo} alt={currentFixture.team2Name} className="w-48 h-48 object-contain" />
              </div>
              
              {/* Team Meta */}
              <div className="flex flex-col gap-3 text-right">
                {liveMatch.servingPlayer === 'player2' && (
                  <div className="serve-dot-container justify-end">
                    {Array.from({ length: (isDoublesMatch(liveMatch) ? (liveMatch.teamServeCount || 0) + 1 : 1) }, (_, i) => (
                      <div key={i} className="serve-dot"></div>
                    ))}
                  </div>
                )}
                <h3 className="text-5xl font-black text-white zuume-display leading-tight team-name-2-1">{currentFixture.team2Name}</h3>
                <div className="text-orange-400 font-bold text-2xl zuume-display space-y-1 player-name-2-1">
                  {liveMatch.player1Team2 && <div className="uppercase">{liveMatch.player1Team2}</div>}
                  {liveMatch.player2Team2 && <div className="uppercase">{liveMatch.player2Team2}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Matches */}
        <div className="grid grid-cols-5 gap-4 flex-shrink-0">
          {(() => {
            const isGameBreakerScenario = fixtureScore.team1Wins === 3 && fixtureScore.team2Wins === 3;
            let matchesToShow;
            if (isGameBreakerScenario) {
              matchesToShow = completedMatches.filter(match => match.id !== liveMatch.id).slice(0, 6);
            } else {
              matchesToShow = [...completedMatches, ...upcomingMatches].filter(match => match.id !== liveMatch.id).slice(0, 5);
            }
            
            return matchesToShow.map((match, index) => (
              <div key={match.id} className="bg-orange-950/60 border border-orange-900/50 rounded-lg p-6">
                <div className="text-center mb-4">
                  <h4 className="text-2xl font-black bg-orange-600 text-white rounded py-3 px-4 tracking-[0.15em] whitespace-nowrap" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, transform: 'scale(0.7)', transformOrigin: 'center' }}>
                    {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                  </h4>
                </div>
                
                {/* Team 1 */}
                <div className="mb-4">
                  <div className="text-orange-400 text-sm font-bold mb-2">{currentFixture.team1Name}</div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-white font-bold zuume-display leading-tight flex-1">
                      {(() => {
                        if (match.player1Team1 && match.player2Team1) {
                          return (
                            <div className="space-y-1">
                              <div>{match.player1Team1}</div>
                              <div>{match.player2Team1}</div>
                            </div>
                          );
                        } else if (match.player1Team1) {
                          return <div>{match.player1Team1}</div>;
                        } else if (match.player1) {
                          return <div>{match.player1}</div>;
                        } else {
                          return <div>TBD</div>;
                        }
                      })()}
                    </div>
                    <div className="text-white text-4xl font-black zuume-display flex-shrink-0">
                      {match.scores?.player1?.game1 || match.scores?.player1?.total || 0}
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-orange-900/50 my-4"></div>

                {/* Team 2 */}
                <div>
                  <div className="text-orange-400 text-sm font-bold mb-2">{currentFixture.team2Name}</div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-white font-bold zuume-display leading-tight flex-1">
                      {(() => {
                        if (match.player1Team2 && match.player2Team2) {
                          return (
                            <div className="space-y-1">
                              <div>{match.player1Team2}</div>
                              <div>{match.player2Team2}</div>
                            </div>
                          );
                        } else if (match.player1Team2) {
                          return <div>{match.player1Team2}</div>;
                        } else if (match.player2) {
                          return <div>{match.player2}</div>;
                        } else {
                          return <div>TBD</div>;
                        }
                      })()}
                    </div>
                    <div className="text-white text-4xl font-black zuume-display flex-shrink-0">
                      {match.scores?.player2?.game1 || match.scores?.player2?.total || 0}
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Bottom Logos */}
      <div className="px-12 py-6 flex-shrink-0 border-t border-orange-900 bg-gradient-to-t from-black/95 to-black/60">
        <div className="flex justify-evenly items-center w-full">
          {bottomLogos.map((logo, index) => (
            <img
              key={`${logo.id}-${index}`}
              src={logo.url}
              alt={logo.name || `Logo ${index + 1}`}
              className="h-20 w-auto"
              onError={(e) => {
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
                {isTimeoutActive && timeoutTimer !== null && (
                  <div className="absolute top-8 left-8 z-60 bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg">
                    <div className="text-8xl font-bold font-mono">
                      {Math.floor(timeoutTimer / 60)}:{(timeoutTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-2xl text-center mt-2 opacity-75">TIMEOUT</div>
                  </div>
                )}
                
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
                            <p className="text-2xl text-orange-200">{currentItem.title || 'Invalid video format'}</p>
                            <p className="text-lg text-red-400 mt-4">URL: {currentItem.url}</p>
                          </div>
                        );
                      }
                    } else {
                      return (
                        <div className="text-center text-white">
                          <div className="text-8xl mb-8">❓</div>
                          <h2 className="text-6xl font-bold mb-4">Unknown Media Type</h2>
                          <p className="text-2xl text-orange-200">{currentItem.title || 'Unknown media'}</p>
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

      {/* Sliding Images Container */}
      {(showSlidingImage || slidingImageAnimationState === 'slideDown') && slidingImages.length > 0 && (
        <div
          className="sliding-image-container fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center overflow-hidden"
          style={{
            height: '42%',
            backgroundColor: '#000',
            animation: slidingImageAnimationState === 'slideUp' ? 'slideUp 2s ease-in-out forwards' : slidingImageAnimationState === 'slideDown' ? 'slideDown 2s ease-in-out forwards' : 'none'
          }}
        >
          <img
            src={slidingImages[currentSlidingImageIndex]?.url || slidingImages[currentSlidingImageIndex]?.publicId}
            alt="Sliding Image"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* DRS Pending Screen */}
      {isDRSVideoPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-20">
            <img src="/src/assets/centrecourt_logo.png" alt="Centre Court Logo" className="h-16 w-auto object-contain" />
            <img src="/src/assets/hpllogo_white.png" alt="CCPL Logo" className="h-16 w-auto object-contain" />
          </div>
          
          <div className="relative z-10 w-full flex items-center justify-center px-16">
            <div className="flex-1 flex justify-end pr-16">
              {team1Logo ? (
                <img src={team1Logo} alt={liveMatch?.team1Name || 'Team 1'} className="w-64 h-64 object-contain opacity-80" />
              ) : (
                <img src={getTeamLogo(liveMatch?.team1Name)} alt={liveMatch?.team1Name || 'Team 1'} className="w-64 h-64 object-contain opacity-80" />
              )}
            </div>
            
            <div className="flex-shrink-0 text-center">
              <div className="font-championer text-8xl md:text-9xl lg:text-[12rem] font-bold leading-none animate-drs-heartbeat"
                style={{
                  color: '#e98318',
                  textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(233, 131, 24, 0.3)',
                  fontFamily: 'Championer, Arial Black, Impact, Helvetica Neue, sans-serif'
                }}>
                <div className="mb-4">DECISION</div>
                <div>PENDING</div>
              </div>
            </div>
            
            <div className="flex-1 flex justify-start pl-16">
              {team2Logo ? (
                <img src={team2Logo} alt={liveMatch?.team2Name || 'Team 2'} className="w-64 h-64 object-contain opacity-80" />
              ) : (
                <img src={getTeamLogo(liveMatch?.team2Name)} alt={liveMatch?.team2Name || 'Team 2'} className="w-64 h-64 object-contain opacity-80" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}