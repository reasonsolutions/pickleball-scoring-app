import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Import logo assets
import hplLogoWhite from '../assets/hpllogo_white.png';
import keerthiWhite from '../assets/keerthi_white.png';
import vijayaWhite from '../assets/vijaya_white.png';
import centreCourtLogo from '../assets/centrecourt_logo.png';
import naturalsWhite from '../assets/naturals_white.png';
import anvitaWhite from '../assets/Anvita_white.png';
import scuziWhite from '../assets/scuzi_white.png';
import pickloutWhite from '../assets/picklout_white.png';
import studio318 from '../assets/studio318.png';

// Import changing logos
import apDental from '../assets/changinglogos/AP Dental - associate - 5 seconds.png';
import bagelBrigade from '../assets/changinglogos/Bagel Brigade - Associate - 5 seconds.png';
import continental from '../assets/changinglogos/Continental - principal - 10 seconds-1.png';
import dasosPrincipal from '../assets/changinglogos/Dasos_-_Principal_-_10_seconds_j6svw1.png';
import fewl from '../assets/changinglogos/Fewl - associate 5 seconds.png';
import greendhobi from '../assets/changinglogos/Greendhobi - associate - 5 seconds-2.png';
import hisensePrincipal from '../assets/changinglogos/Hisense_new_logo_-_Principal_-_10_seconds_e72wup.png';
import keerthEstates from '../assets/changinglogos/KEERTH_ESTATES_LOGO-_Principal_10_seconds_lr6jhf.png';
import lionCharge from '../assets/changinglogos/LionCharge-associate - 5 seconds.png';
import mahiPrincipal from '../assets/changinglogos/mahi Principal - 10 seconds.png';
import malle from '../assets/changinglogos/Malle - associate - 5 seconds.png';
import mercedesBenz from '../assets/changinglogos/Mercedes-Benz Silver Star Logo - Principal 10 seconds.png';
import musterWhitePrincipal from '../assets/changinglogos/muster_white_principal.png';
import principleMuster from '../assets/changinglogos/Principle Muster Logo (white).png';
import priyaCement from '../assets/changinglogos/Priya Cement - Principal - 10 seconds.png';
import sindhuWhitePrincipal from '../assets/changinglogos/sindhu_white_principal.png';
import sitharaPrincipal from '../assets/changinglogos/Sithara_Logo_Principal_-_10_seconds_ukdqho.png';
import skillTyroPrincipal from '../assets/changinglogos/SkillTyro_HD_Logo_Prinicipal_-_10_seconds_cliqpe.png';
import snapbot from '../assets/changinglogos/Snapbot - Associate - 5 seconds.png';
import studio318Principal from '../assets/changinglogos/studio318logo_principal.png';
import teramorPrincipal from '../assets/changinglogos/Teramor_-_Principal_-_10_seconds_wgtpii.png';
import tv5 from '../assets/changinglogos/TV5 - Associate - 5 seconds.png';

// Define the changing logos array with their durations
const changingLogos = [
  { src: apDental, name: 'AP Dental - associate - 5 seconds.png', duration: 5000 },
  { src: bagelBrigade, name: 'Bagel Brigade - Associate - 5 seconds.png', duration: 5000 },
  { src: continental, name: 'Continental - principal - 10 seconds-1.png', duration: 10000 },
  { src: dasosPrincipal, name: 'Dasos_-_Principal_-_10_seconds_j6svw1.png', duration: 10000 },
  { src: fewl, name: 'Fewl - associate 5 seconds.png', duration: 5000 },
  { src: greendhobi, name: 'Greendhobi - associate - 5 seconds-2.png', duration: 5000 },
  { src: hisensePrincipal, name: 'Hisense_new_logo_-_Principal_-_10_seconds_e72wup.png', duration: 10000 },
  { src: keerthEstates, name: 'KEERTH_ESTATES_LOGO-_Principal_10_seconds_lr6jhf.png', duration: 10000 },
  { src: lionCharge, name: 'LionCharge-associate - 5 seconds.png', duration: 5000 },
  { src: mahiPrincipal, name: 'mahi Principal - 10 seconds.png', duration: 10000 },
  { src: malle, name: 'Malle - associate - 5 seconds.png', duration: 5000 },
  { src: mercedesBenz, name: 'Mercedes-Benz Silver Star Logo - Principal 10 seconds.png', duration: 10000 },
  { src: musterWhitePrincipal, name: 'muster_white_principal.png', duration: 10000 },
  { src: principleMuster, name: 'Principle Muster Logo (white).png', duration: 10000 },
  { src: priyaCement, name: 'Priya Cement - Principal - 10 seconds.png', duration: 10000 },
  { src: sindhuWhitePrincipal, name: 'sindhu_white_principal.png', duration: 10000 },
  { src: sitharaPrincipal, name: 'Sithara_Logo_Principal_-_10_seconds_ukdqho.png', duration: 10000 },
  { src: skillTyroPrincipal, name: 'SkillTyro_HD_Logo_Prinicipal_-_10_seconds_cliqpe.png', duration: 10000 },
  { src: snapbot, name: 'Snapbot - Associate - 5 seconds.png', duration: 5000 },
  { src: studio318Principal, name: 'studio318logo_principal.png', duration: 10000 },
  { src: teramorPrincipal, name: 'Teramor_-_Principal_-_10_seconds_wgtpii.png', duration: 10000 },
  { src: tv5, name: 'TV5 - Associate - 5 seconds.png', duration: 5000 }
];

// ChangingLogo component with fade effects
const ChangingLogo = ({ className, style }) => {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const cycleLogo = () => {
      const currentLogo = changingLogos[currentLogoIndex];
      
      // Start fade out
      setIsVisible(false);
      
      // After fade out completes, change logo and fade in
      setTimeout(() => {
        setCurrentLogoIndex((prevIndex) => (prevIndex + 1) % changingLogos.length);
        setIsVisible(true);
      }, 300); // 300ms fade transition
    };

    // Set timeout for current logo duration
    const currentLogo = changingLogos[currentLogoIndex];
    timeoutRef.current = setTimeout(cycleLogo, currentLogo.duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentLogoIndex]);

  const currentLogo = changingLogos[currentLogoIndex];

  return (
    <img
      src={currentLogo.src}
      alt="Changing Logo"
      className={`${className} transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={style}
    />
  );
};

export default function OutsideDisplay() {
  const { tournamentId, dateString } = useParams();
  const [tournament, setTournament] = useState(null);
  const [centerCourtMatch, setCenterCourtMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Use refs to avoid recreating callbacks and triggering re-subscriptions
  const currentFixtureRef = useRef(null);
  const listenersSetupRef = useRef(false);

  // Extract video ID from YouTube URL (including live URLs)
  const extractVideoId = useCallback((url) => {
    if (!url) return null;
    
    // Handle different YouTube URL formats including live URLs
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/, // Handle YouTube Live URLs
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('🎬 Video ID extracted using pattern:', pattern, 'Result:', match[1]);
        return match[1];
      }
    }
    
    console.log('🎬 No video ID found for URL:', url);
    return null;
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Set up Firebase listeners - same approach as MainDisplay
  const setupFirebaseListeners = useCallback(() => {
    if (!tournamentId || !dateString || listenersSetupRef.current) return;

    console.log('🔧 Setting up Firebase listeners (ONE TIME)');
    listenersSetupRef.current = true;

    // Display settings listener
    const displaySettingId = `${tournamentId}_${dateString}`;
    const displaySettingsUnsubscribe = onSnapshot(
      doc(db, 'display_settings', displaySettingId),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const displaySetting = docSnapshot.data();
          const selectedFixture = displaySetting.currentFixture || displaySetting.currentMainFixture;
          
          if (selectedFixture) {
            console.log('📺 Display settings updated:', selectedFixture);
            
            // Try to get the full fixture data from fixtures collection to get YouTube URL
            if (selectedFixture.fixtureGroupId) {
              try {
                console.log('🔍 Looking for fixture with fixtureGroupId:', selectedFixture.fixtureGroupId);
                
                // Query for fixtures with this fixtureGroupId to get the YouTube URL
                const fixtureQuery = query(
                  collection(db, 'fixtures'),
                  where('tournamentId', '==', tournamentId),
                  where('fixtureGroupId', '==', selectedFixture.fixtureGroupId)
                );
                
                const fixtureSnapshot = await getDocs(fixtureQuery);
                
                if (!fixtureSnapshot.empty) {
                  // Get the first fixture document to check for YouTube URL
                  const firstFixture = fixtureSnapshot.docs[0].data();
                  console.log('🔍 First fixture data keys:', Object.keys(firstFixture));
                  console.log('🔍 All fixture data:', firstFixture);
                  console.log('🔍 YouTube URL in fixture (youtubeUrl):', firstFixture.youtubeUrl);
                  console.log('🔍 YouTube URL in fixture (youtubeLink):', firstFixture.youtubeLink);
                  console.log('🔍 YouTube URL in fixture (youtube_url):', firstFixture.youtube_url);
                  console.log('🔍 YouTube URL in fixture (youTubeUrl):', firstFixture.youTubeUrl);
                  console.log('🔍 YouTube URL in fixture (liveStreamUrl):', firstFixture.liveStreamUrl);
                  
                  // Try different possible field names for YouTube URL - CORRECT FIELD IS "youtubeLink"
                  const youtubeUrl = firstFixture.youtubeLink ||  // ← This is the correct field name!
                                   firstFixture.youtubeUrl ||
                                   firstFixture.youtube_url ||
                                   firstFixture.youTubeUrl ||
                                   firstFixture.liveStreamUrl ||
                                   firstFixture.streamUrl;
                  
                  // Enhance the selected fixture with YouTube URL if found
                  const enhancedFixture = {
                    ...selectedFixture,
                    youtubeUrl: youtubeUrl
                  };
                  
                  currentFixtureRef.current = enhancedFixture;
                  console.log('📺 Enhanced fixture with YouTube URL:', youtubeUrl);
                } else {
                  currentFixtureRef.current = selectedFixture;
                  console.log('📺 No fixtures found for fixtureGroupId');
                }
              } catch (error) {
                console.error('Error fetching fixture for YouTube URL:', error);
                currentFixtureRef.current = selectedFixture;
              }
            } else {
              currentFixtureRef.current = selectedFixture;
            }
          }
        }
      },
      (error) => {
        console.error('Error listening to display settings:', error);
      }
    );

    // Matches listener - listen to all matches and filter for center court + current fixture
    const matchesQuery = query(
      collection(db, 'fixtures'),
      where('tournamentId', '==', tournamentId)
    );
    
    const matchesUnsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
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

        console.log('🎯 Center court matches found:', dateMatches.length);

        // If we have a current fixture, filter matches for that fixture
        const currentFixture = currentFixtureRef.current;
        let fixtureMatches = dateMatches;
        
        if (currentFixture) {
          fixtureMatches = dateMatches.filter(match =>
            match.fixtureGroupId === currentFixture.fixtureGroupId
          );
          console.log('🎯 Matches for current fixture:', fixtureMatches.length);
        }

        // Find the best match to display (live > with YouTube > any)
        const liveMatch = fixtureMatches.find(match =>
          match.status === 'live' || match.status === 'in_progress'
        );
        
        const matchWithYouTube = fixtureMatches.find(match => match.youtubeUrl);
        
        const selectedMatch = liveMatch || matchWithYouTube || fixtureMatches[0];
        
        if (selectedMatch) {
          // Check for YouTube URL at match level first, then fixture level
          let youtubeUrl = selectedMatch.youtubeLink || selectedMatch.youtubeUrl;
          
          // If no match-level YouTube URL, check if current fixture has one
          if (!youtubeUrl && currentFixture && (currentFixture.youtubeLink || currentFixture.youtubeUrl)) {
            youtubeUrl = currentFixture.youtubeLink || currentFixture.youtubeUrl;
            console.log('🎬 Using fixture-level YouTube URL:', youtubeUrl);
          }
          
          // Create enhanced match object with YouTube URL
          const enhancedMatch = {
            ...selectedMatch,
            youtubeUrl: youtubeUrl
          };
          
          console.log('🎯 Selected center court match:', {
            id: selectedMatch.id,
            teams: `${selectedMatch.team1Name} vs ${selectedMatch.team2Name}`,
            status: selectedMatch.status,
            hasMatchYouTube: !!selectedMatch.youtubeUrl,
            hasFixtureYouTube: !!(currentFixture && currentFixture.youtubeUrl),
            finalYoutubeUrl: youtubeUrl
          });
          
          // Enhanced YouTube URL logging
          if (youtubeUrl) {
            console.log('🎬 YOUTUBE URL FOUND:', youtubeUrl);
            const videoId = extractVideoId(youtubeUrl);
            console.log('🎬 EXTRACTED VIDEO ID:', videoId);
            console.log('🎬 EMBED URL WILL BE:', `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1`);
          } else {
            console.log('🎬 NO YOUTUBE URL FOUND FOR MATCH OR FIXTURE');
          }
          
          setCenterCourtMatch(enhancedMatch);
        } else {
          console.log('🎯 No center court matches found');
          setCenterCourtMatch(null);
        }
      },
      (error) => {
        console.error('Error listening to matches:', error);
      }
    );

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      displaySettingsUnsubscribe();
      matchesUnsubscribe();
    };
  }, [tournamentId, dateString]);

  // Initial data fetch - runs once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        
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

  // Set up listeners when component mounts
  useEffect(() => {
    if (tournamentId && dateString) {
      const cleanup = setupFirebaseListeners();
      
      return () => {
        if (cleanup) {
          cleanup();
        }
        listenersSetupRef.current = false;
      };
    }
  }, [tournamentId, dateString, setupFirebaseListeners]);

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
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const videoId = centerCourtMatch?.youtubeUrl ? extractVideoId(centerCourtMatch.youtubeUrl) : null;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Top Logos Row */}
      <div className="absolute top-8 left-0 right-0 flex justify-center items-center space-x-32">
        <img src={hplLogoWhite} alt="HPL Logo" className="h-20 w-auto" />
        <img src={centreCourtLogo} alt="Centre Court" className="h-16 w-auto" />
        <img src={anvitaWhite} alt="Anvita" className="h-16 w-auto" />
      </div>

      {/* Left Side Logos - Spread from top to bottom of video container */}
      <div className="absolute left-12 flex flex-col justify-between" style={{
        top: '17.5%',  // Start at the top of the video container area
        bottom: '27%', // End at the bottom of the video container area
        height: '55.5%' // Match the video container height area
      }}>
        <img src={naturalsWhite} alt="Naturals" className="max-h-16 w-auto object-contain" />
        <img src={scuziWhite} alt="Scuzi" className="max-h-16 w-auto object-contain" />
        <img src={vijayaWhite} alt="Vijaya" className="max-h-16 w-auto object-contain" />
      </div>

      {/* Right Side Logos - Spread from top to bottom of video container */}
      <div className="absolute right-12 flex flex-col justify-between" style={{
        top: '17.5%',  // Start at the top of the video container area
        bottom: '27%', // End at the bottom of the video container area
        height: '55.5%' // Match the video container height area
      }}>
        <img src={naturalsWhite} alt="Naturals" className="max-h-16 w-auto object-contain" />
        <img src={scuziWhite} alt="Scuzi" className="max-h-16 w-auto object-contain" />
        <img src={vijayaWhite} alt="Vijaya" className="max-h-16 w-auto object-contain" />
      </div>

      {/* Bottom Logos Row - Changing logos with fade effects */}
      <div className="absolute bottom-8 flex justify-between items-center" style={{
        left: '12.5%',  // Start at the left edge of the video container
        right: '12.5%', // End at the right edge of the video container
        width: '75%'    // Match the video container width
      }}>
        <ChangingLogo className="w-auto object-contain" style={{ height: '4.25rem' }} />
        <ChangingLogo className="w-auto object-contain" style={{ height: '4.25rem' }} />
        <ChangingLogo className="w-auto object-contain" style={{ height: '4.25rem' }} />
        <ChangingLogo className="w-auto object-contain" style={{ height: '4.25rem' }} />
        <ChangingLogo className="w-auto object-contain" style={{ height: '4.25rem' }} />
      </div>

      {/* Main Video Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[75%] h-[65%] bg-red-600 rounded-lg overflow-hidden shadow-2xl">
          {videoId ? (
            <>
              {console.log('🎬 RENDERING YOUTUBE VIDEO:', {
                videoId,
                embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&fs=1&enablejsapi=1`,
                matchData: centerCourtMatch
              })}
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&fs=1&enablejsapi=1`}
                title="Center Court Live Stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-red-600">
              <div className="text-center text-white">
                <div className="text-8xl mb-8">🏓</div>
                <h2 className="text-4xl font-bold mb-4">Center Court</h2>
                <p className="text-xl opacity-75 mb-4">
                  {centerCourtMatch ? (
                    <>
                      {centerCourtMatch.team1Name} vs {centerCourtMatch.team2Name}
                      <br />
                      <span className="text-lg">No live stream available</span>
                    </>
                  ) : (
                    'No center court match scheduled'
                  )}
                </p>
                {tournament && (
                  <div className="text-lg opacity-60">
                    {tournament.name}
                    <br />
                    {formatDate(dateString)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}