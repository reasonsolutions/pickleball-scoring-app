import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import tileBackground from '../assets/backgrounds/tile.png';

// Import team logos
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

export default function ExcitementDisplay() {
  const { tournamentId, dateString } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to get team logo based on team name (same as MainDisplay)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          setTournament(tournamentDoc.data());
        } else {
          setError('Tournament not found');
          return;
        }

        // Fetch matches for the specific date
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter matches for the specific date
        const filteredMatches = allMatches.filter(match => {
          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          const matchDateString = matchDate.toISOString().split('T')[0];
          return matchDateString === dateString;
        });

        // Sort matches by time
        filteredMatches.sort((a, b) => {
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
        });

        setMatches(filteredMatches);

        // Load current display settings from Firestore (same as MainDisplay)
        const displaySettingId = `${tournamentId}_${dateString}`;
        try {
          const displaySettingDoc = await getDoc(doc(db, 'display_settings', displaySettingId));
          if (displaySettingDoc.exists()) {
            const displaySetting = displaySettingDoc.data();
            const currentMainFixture = displaySetting.currentFixture || displaySetting.currentMainFixture;
            setCurrentFixture(currentMainFixture);

            // Fetch team data for the current fixture to get player images
            if (currentMainFixture && currentMainFixture.team1Name) {
              try {
                const teamsQuery = query(
                  collection(db, 'teams'),
                  where('tournamentId', '==', tournamentId),
                  where('name', '==', currentMainFixture.team1Name)
                );
                const teamsSnapshot = await getDocs(teamsQuery);
                if (!teamsSnapshot.empty) {
                  const teamDoc = teamsSnapshot.docs[0];
                  const teamData = { id: teamDoc.id, ...teamDoc.data() };
                  setCurrentTeam(teamData);
                } else {
                  setCurrentTeam(null);
                }
              } catch (error) {
                console.error('Error loading team data:', error);
                setCurrentTeam(null);
              }
            } else {
              setCurrentTeam(null);
            }
          } else {
            setCurrentFixture(null);
            setCurrentTeam(null);
          }
        } catch (error) {
          console.error('Error loading display setting:', error);
          setCurrentFixture(null);
          setCurrentTeam(null);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && dateString) {
      fetchData();
    }
  }, [tournamentId, dateString]);

  // Set up the display for 80ft x 6ft dimensions with tiled background
  useEffect(() => {
    // Set body with tiled background and remove margins/padding
    document.body.style.backgroundImage = `url(${tileBackground})`;
    document.body.style.backgroundRepeat = 'repeat';
    document.body.style.backgroundSize = 'auto';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';

    // Cleanup on unmount
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundSize = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
    };
  }, []);

  // Thunder Flash Effects Only (no visible lightning lines)
  const ThunderEffects = () => {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0.5, height: '100vh' }}>
        {/* Primary Thunder Flash Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center,
              rgba(255, 255, 255, 0.7) 0%,
              rgba(173, 216, 230, 0.4) 30%,
              rgba(135, 206, 250, 0.2) 60%,
              transparent 100%)`,
            animation: 'thunderFlash1 3s ease-in-out infinite',
            opacity: 0
          }}
        />

        {/* Secondary Thunder Flash */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 20%,
              rgba(255, 255, 255, 0.6) 0%,
              rgba(173, 216, 230, 0.3) 40%,
              transparent 70%)`,
            animation: 'thunderFlash2 4s ease-in-out 1s infinite',
            opacity: 0
          }}
        />

        {/* Tertiary Thunder Flash */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 70% 80%,
              rgba(255, 255, 255, 0.5) 0%,
              rgba(135, 206, 250, 0.3) 50%,
              transparent 80%)`,
            animation: 'thunderFlash3 5s ease-in-out 2s infinite',
            opacity: 0
          }}
        />

        {/* Intense Screen Flash */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            animation: 'screenFlash 6s ease-in-out infinite',
            opacity: 0
          }}
        />

        {/* Ambient Thunder Glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(45deg,
              rgba(173, 216, 230, 0.1) 0%,
              transparent 30%,
              rgba(135, 206, 250, 0.1) 70%,
              transparent 100%)`,
            animation: 'ambientGlow 8s ease-in-out infinite',
            opacity: 0
          }}
        />
        
        <style jsx>{`
          @keyframes thunderFlash1 {
            0% { opacity: 0; }
            1% { opacity: 0.9; }
            2% { opacity: 0; }
            3% { opacity: 0.7; }
            4% { opacity: 0; }
            5% { opacity: 1; }
            6% { opacity: 0; }
            100% { opacity: 0; }
          }

          @keyframes thunderFlash2 {
            0% { opacity: 0; }
            1.5% { opacity: 0.8; }
            3% { opacity: 0; }
            4.5% { opacity: 0.6; }
            6% { opacity: 0; }
            100% { opacity: 0; }
          }

          @keyframes thunderFlash3 {
            0% { opacity: 0; }
            2% { opacity: 0.7; }
            4% { opacity: 0; }
            6% { opacity: 0.5; }
            8% { opacity: 0; }
            100% { opacity: 0; }
          }

          @keyframes screenFlash {
            0% { opacity: 0; }
            0.5% { opacity: 0.6; }
            1% { opacity: 0; }
            1.5% { opacity: 0.8; }
            2% { opacity: 0; }
            2.5% { opacity: 0.4; }
            3% { opacity: 0; }
            100% { opacity: 0; }
          }

          @keyframes ambientGlow {
            0% { opacity: 0; }
            10% { opacity: 0.3; }
            20% { opacity: 0; }
            30% { opacity: 0.2; }
            40% { opacity: 0; }
            50% { opacity: 0.4; }
            60% { opacity: 0; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  };

  // Metal welding sparks animation component
  const SparksAnimation = () => {
    const sparks = Array.from({ length: 300 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 3,
      size: 1 + Math.random() * 3,
      angle: -45 + Math.random() * 90, // Random angle for realistic spark trajectory
      distance: 50 + Math.random() * 200, // How far the spark travels horizontally
      color: ['#FFA500', '#FF4500', '#FFD700', '#FF6347', '#FFFF00'][Math.floor(Math.random() * 5)]
    }));

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1, height: '100vh' }}>
        {sparks.map((spark) => (
          <div
            key={spark.id}
            className="absolute"
            style={{
              left: `${spark.left}%`,
              top: '0px',
              width: `${spark.size}px`,
              height: `${spark.size * 3}px`, // Elongated like real sparks
              backgroundColor: spark.color,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', // Teardrop shape
              boxShadow: `0 0 8px ${spark.color}, 0 0 16px ${spark.color}`,
              animation: `metalSpark ${spark.duration}s linear ${spark.delay}s infinite`,
              transformOrigin: 'center top'
            }}
          />
        ))}
        <style jsx>{`
          @keyframes metalSpark {
            0% {
              transform: translateY(0px) translateX(0px) rotate(${Math.random() * 360}deg);
              opacity: 1;
              scale: 1;
            }
            20% {
              opacity: 0.9;
              scale: 1.1;
            }
            90% {
              opacity: 0.8;
              scale: 0.8;
            }
            100% {
              transform: translateY(calc(100vh + 50px)) translateX(${Math.random() > 0.5 ? '' : '-'}${50 + Math.random() * 100}px) rotate(${360 + Math.random() * 360}deg);
              opacity: 0.2;
              scale: 0.3;
            }
          }
        `}</style>
      </div>
    );
  };

  // Team Logo Animation Component
  const TeamLogoAnimation = () => {
    return (
      <style jsx>{`
        /* Local Font Definitions */
        @font-face {
          font-family: 'Speaker';
          src: url('/src/fonts/Speaker.woff') format('woff');
          font-weight: bold;
          font-display: swap;
        }
        
        @font-face {
          font-family: 'Aglatia';
          src: url('/src/fonts/Aglatia.woff') format('woff');
          font-weight: bold;
          font-display: swap;
        }
        
        @font-face {
          font-family: 'CookConthic';
          src: url('/src/fonts/CookConthic.woff') format('woff');
          font-weight: bold;
          font-display: swap;
        }
        
        @font-face {
          font-family: 'OldNorth';
          src: url('/src/fonts/OldNorth-Regular.woff') format('woff');
          font-weight: bold;
          font-display: swap;
        }
        
        .logo-center {
          animation: logoSequence 12s ease-in-out infinite;
        }
        
        .logo-left {
          animation: logoLeftSequence 12s ease-in-out infinite;
        }
        
        .logo-right {
          animation: logoRightSequence 12s ease-in-out infinite;
        }
        
        
        @keyframes logoSequence {
          0% { opacity: 1; transform: scale(1); }
          4% { opacity: 0.3; transform: scale(0.95); }
          8% { opacity: 1; transform: scale(1); }
          12% { opacity: 0.3; transform: scale(0.95); }
          16% { opacity: 1; transform: scale(1); }
          20% { opacity: 0.7; transform: scale(1); }
          40% { opacity: 0.7; transform: scale(1); }
          60% { opacity: 1; transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes logoLeftSequence {
          0% { opacity: 0; transform: translateX(0) scale(1); }
          16% { opacity: 0; transform: translateX(0) scale(1); }
          20% { opacity: 1; transform: translateX(-200px) scale(0.8); }
          40% { opacity: 1; transform: translateX(-200px) scale(0.8); }
          60% { opacity: 1; transform: translateX(0) scale(1); }
          64% { opacity: 0; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(0) scale(1); }
        }
        
        @keyframes logoRightSequence {
          0% { opacity: 0; transform: translateX(0) scale(1); }
          16% { opacity: 0; transform: translateX(0) scale(1); }
          20% { opacity: 1; transform: translateX(200px) scale(0.8); }
          40% { opacity: 1; transform: translateX(200px) scale(0.8); }
          60% { opacity: 1; transform: translateX(0) scale(1); }
          64% { opacity: 0; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(0) scale(1); }
        }
        
      `}</style>
    );
  };

  if (loading) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${tileBackground})`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto'
        }}
      >
        <div className="text-white text-4xl bg-black bg-opacity-70 px-8 py-4 rounded">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${tileBackground})`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto'
        }}
      >
        <div className="text-red-500 text-4xl bg-black bg-opacity-70 px-8 py-4 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen text-white overflow-hidden"
      style={{
        // Optimize for ultra-wide 80ft x 6ft display (approximately 13.33:1 aspect ratio)
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `url(${tileBackground})`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto'
      }}
    >
      {/* Thunder Effects Layer - Right above background */}
      <ThunderEffects />
      
      {/* Sparks Animation Layer - Above thunder, below content */}
      <SparksAnimation />
      
      {/* Team Logo Animation Styles */}
      <TeamLogoAnimation />

      {/* Left Side - Team Logo (40ft width, 4ft height) */}
      <div className="absolute left-0 top-0 h-full flex items-center justify-center" style={{ width: '50%' }}>
        {currentFixture && currentFixture.team1Name ? (
          <div className="flex items-center justify-center h-full w-full relative">
            {/* Logo Section - Vertically Centered */}
            <div className="flex items-center justify-center w-full relative">
              {/* Center Logo */}
              <div className="relative">
                <img
                  src={getTeamLogo(currentFixture.team1Name)}
                  alt={`${currentFixture.team1Name} Logo`}
                  className="max-h-96 max-w-96 object-contain logo-center"
                  style={{
                    height: '24rem', // Full size for vertical centering
                    width: 'auto',
                    filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))'
                  }}
                />
              </div>
              
              {/* Left Duplicate Logo */}
              <div className="absolute" style={{ left: '12.5%' }}>
                <img
                  src={getTeamLogo(currentFixture.team1Name)}
                  alt={`${currentFixture.team1Name} Logo Left`}
                  className="max-h-96 max-w-96 object-contain logo-left"
                  style={{
                    height: '24rem',
                    width: 'auto',
                    filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
                    opacity: 0
                  }}
                />
              </div>
              
              {/* Right Duplicate Logo */}
              <div className="absolute" style={{ right: '12.5%' }}>
                <img
                  src={getTeamLogo(currentFixture.team1Name)}
                  alt={`${currentFixture.team1Name} Logo Right`}
                  className="max-h-96 max-w-96 object-contain logo-right"
                  style={{
                    height: '24rem',
                    width: 'auto',
                    filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
                    opacity: 0
                  }}
                />
              </div>
            </div>
            
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl text-gray-400 bg-black bg-opacity-50 px-6 py-3 rounded-lg">
              No Team Selected
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Player Images Only (40ft width) */}
      <div className="absolute right-0 bottom-0 h-full flex items-end justify-center" style={{ width: '50%' }}>
        {/* Player Images Section - From bottom up to 5ft high */}
        {currentTeam && currentTeam.playerImages && currentTeam.playerImages.length > 0 ? (
          <div className="w-full flex items-end justify-center px-2 pb-0">
            <div className="flex justify-center items-end w-full" style={{
              gap: currentTeam.playerImages.length > 8 ? '0.25rem' :
                   currentTeam.playerImages.length > 6 ? '0.5rem' :
                   currentTeam.playerImages.length > 4 ? '0.75rem' : '1rem'
            }}>
              {currentTeam.playerImages.map((playerImage, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={playerImage.url}
                    alt={`Player ${index + 1}`}
                    className="object-contain"
                    style={{
                      maxHeight: '30rem', // Keep original 5ft height (30rem)
                      width: 'auto'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-4xl text-gray-400 bg-black bg-opacity-50 px-6 py-3 rounded-lg">
              No Player Images Available
            </div>
          </div>
        )}
      </div>


    </div>
  );
}