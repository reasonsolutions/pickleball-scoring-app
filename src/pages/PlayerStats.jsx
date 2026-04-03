import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import Court3DVisualization from '../components/Court3DVisualization';

import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function PlayerStats() {
  const { playerId, clubId } = useParams();
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [matchFixtures, setMatchFixtures] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState(null);

  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueRegularFont}') format('woff');
      font-weight: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueMediumFont}') format('woff');
      font-weight: 500;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueSemiboldFont}') format('woff');
      font-weight: 600;
    }
  `;

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        const playerDoc = await getDoc(doc(db, 'clubs-players', playerId));
        if (!playerDoc.exists()) throw new Error('Player not found');

        const pData = playerDoc.data();
        setPlayerData({ id: playerDoc.id, ...pData });

        if (clubId) {
          const clubDoc = await getDoc(doc(db, 'hpl-clubs', clubId));
          if (clubDoc.exists()) setClubData({ id: clubDoc.id, ...clubDoc.data() });
        } else if (pData.recruitedBy) {
          const clubDoc = await getDoc(doc(db, 'hpl-clubs', pData.recruitedBy));
          if (clubDoc.exists()) setClubData({ id: clubDoc.id, ...clubDoc.data() });
        }

        const allAnalyticsSnapshot = await getDocs(collection(db, 'clutch-analytics'));
        const matches = allAnalyticsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const players = data.players || [];
          return players.some(p => p.selectedPlayerName === pData.fullName);
        }).map(doc => {
          const data = doc.data();
          const players = data.players || [];
          const playerIndex = players.findIndex(p => p.selectedPlayerName === pData.fullName);
          return { id: doc.id, ...data, playerIndex };
        });

        matches.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
          return dateB - dateA;
        });

        // Fetch fixture data for each match to get opposition team names
        const fixturesMap = {};
        for (const match of matches) {
          try {
            const fixtureDoc = await getDoc(doc(db, 'fixtures', match.id));
            if (fixtureDoc.exists()) {
              const fixtureData = fixtureDoc.data();
              console.log('Fixture data for', match.id, ':', fixtureData);
              fixturesMap[match.id] = fixtureData;
            } else {
              console.log('No fixture found for match:', match.id);
            }
          } catch (err) {
            console.log('Could not fetch fixture for match:', match.id, err);
          }
        }
        setMatchFixtures(fixturesMap);

        setMatchHistory(matches);
        if (matches.length > 0) {
          setPlayerStats(calculateAggregatedStats(matches));
          setSelectedMatchForStats(matches[0]);
        }
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    if (playerId) fetchPlayerData();
  }, [playerId, clubId]);

  const calculateAggregatedStats = (matches) => {
    const stats = {
      totalMatches: matches.length,
      wins: 0,
      losses: 0,
      totalShots: 0,
      totalDinks: 0,
      totalDrives: 0,
      totalDrops: 0,
      totalSmashes: 0,
      totalLobs: 0,
      totalResets: 0,
      totalSpeedups: 0,
      totalPoaches: 0,
      totalServes: 0,
      totalVolleys: 0,
      totalGroundStrokes: 0,
      totalDistance: 0,
      totalServeSpeed: 0,
      totalDriveSpeed: 0,
      serveCount: 0,
      driveCount: 0,
      courtCoveragePoints: [],
      averageServeSpeed: 0,
      averageDriveSpeed: 0
    };

    matches.forEach(match => {
       const playerIndex = match.playerIndex;
       if (playerIndex === -1) return;

       const playerData = match.gameStats?.player_data?.[playerIndex];
       if (!playerData) return;

       const trends = playerData.trends || {};
       if (trends.flags?.won_game) {
         stats.wins++;
       } else {
         stats.losses++;
       }

       const courtCoverage = playerData.court_coverage || {};
       stats.totalDistance += courtCoverage.total_distance_covered || 0;
       
       // Count shots by type from rallies - filter by player_id
       const rallies = match.gameStats?.rallies || [];
       const serveSpeeds = [];
       const driveSpeeds = [];
       
       rallies.forEach(rally => {
         const shots = rally.shots || [];
         shots.forEach(shot => {
           // Only count shots by this player
           if (shot.player_id !== playerIndex) return;
           
           const tags = shot.tags || {};
           const tagKeys = Object.keys(tags);
           
           // Check tags for shot types
           const hasDink = tagKeys.some(k => k.includes('type;dink'));
           const hasDrive = tagKeys.some(k => k.includes('type;drive'));
           const hasDrop = tagKeys.some(k => k.includes('type;drop'));
           const hasSmash = tagKeys.some(k => k.includes('type;smash'));
           const hasServe = tagKeys.some(k => k.includes('type;serve'));
           
           // Count shot types
           if (hasDink) stats.totalDinks++;
           if (hasDrive) stats.totalDrives++;
           if (hasDrop) stats.totalDrops++;
           if (hasSmash) stats.totalSmashes++;
           if (hasServe) stats.totalServes++;
           
           // Count boolean fields
           if (shot.is_reset) stats.totalResets++;
           if (shot.is_poach) stats.totalPoaches++;
           if (shot.is_speedup) stats.totalSpeedups++;
           
           // Count volleys and ground strokes
           // Serves count as ground strokes (hit from ground)
           if (shot.is_volley && !hasServe) {
             stats.totalVolleys++;
           } else if (!shot.is_volley || hasServe) {
             stats.totalGroundStrokes++;
           }
           
           // Collect speeds for averaging (already in mph)
           if (hasServe && shot.resulting_ball_movement?.speed) {
             serveSpeeds.push(shot.resulting_ball_movement.speed);
           }
           if (hasDrive && shot.resulting_ball_movement?.speed) {
             driveSpeeds.push(shot.resulting_ball_movement.speed);
           }
         });
       });
       
       stats.totalShots += stats.totalDinks + stats.totalDrives + stats.totalDrops + stats.totalSmashes + stats.totalServes + stats.totalResets + stats.totalSpeedups + stats.totalPoaches;
       
       if (serveSpeeds.length > 0) {
         const avgServeSpeed = serveSpeeds.reduce((a, b) => a + b, 0) / serveSpeeds.length;
         stats.totalServeSpeed += avgServeSpeed;
         stats.serveCount++;
       }

       if (driveSpeeds.length > 0) {
         const avgDriveSpeed = driveSpeeds.reduce((a, b) => a + b, 0) / driveSpeeds.length;
         stats.totalDriveSpeed += avgDriveSpeed;
         stats.driveCount++;
       }

       if (courtCoverage) {
         stats.courtCoveragePoints.push(courtCoverage);
       }
     });

    stats.averageServeSpeed = stats.serveCount > 0 ? (stats.totalServeSpeed / stats.serveCount).toFixed(1) : 0;
    stats.averageDriveSpeed = stats.driveCount > 0 ? (stats.totalDriveSpeed / stats.driveCount).toFixed(1) : 0;
    stats.winRate = stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : 0;

    return stats;
  };

  const b64ToBytes = (b64) => {
    const bin = atob(b64);
    return Array.from({length: bin.length}, (_, i) => bin.charCodeAt(i));
  };

  const drawCourtHeatmap = (canvas, xs, ys) => {
    if (!canvas) return;
    
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W_CSS = canvas.parentElement?.clientWidth || 420;
    const ASPECT = 22 / 20;
    const H_CSS = W_CSS * ASPECT;

    canvas.style.width = W_CSS + 'px';
    canvas.style.height = H_CSS + 'px';
    canvas.width = Math.round(W_CSS * DPR);
    canvas.height = Math.round(H_CSS * DPR);

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    const W = W_CSS, H = H_CSS;

    ctx.fillStyle = '#f2f4f0';
    ctx.fillRect(0, 0, W, H);

    const COORD_MAX = 127;
    const GRID = 120;
    const density = new Float32Array(GRID * GRID);
    const n = xs.length;
    const BW = 4.5;

    for (let i = 0; i < n; i++) {
      // Map x coordinate: flip horizontally
      const gx = ((COORD_MAX - xs[i]) / COORD_MAX) * (GRID - 1);
      // Map y coordinate: 0-127 maps to 0-GRID (top/net to bottom/baseline) with offset
      const gy = Math.min((ys[i] / COORD_MAX) * (GRID - 1) + GRID * 0.10, GRID - 1);
      const r = Math.ceil(BW * 3);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.round(gx + dx), ny = Math.round(gy + dy);
          if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
          density[ny * GRID + nx] += Math.exp(-0.5 * (dx*dx + dy*dy) / (BW*BW));
        }
      }
    }

    const heatColour = (t) => {
      const stops = [
        [0,    [100, 210, 200,   0]],
        [0.15, [100, 210, 200,  90]],
        [0.32, [160, 230,  80, 155]],
        [0.50, [240, 230,   0, 195]],
        [0.65, [255, 150,   0, 220]],
        [0.80, [255,  50,  20, 240]],
        [1.0,  [210,   0, 180, 255]],
      ];
      for (let i = 0; i < stops.length - 1; i++) {
        const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
        if (t <= t1) {
          const f = (t - t0) / (t1 - t0);
          return c0.map((v, j) => Math.round(v + f * (c1[j] - v)));
        }
      }
      return stops[stops.length - 1][1];
    };

    const hc = document.createElement('canvas');
    hc.width = GRID; hc.height = GRID;
    const hctx = hc.getContext('2d');
    const img = hctx.createImageData(GRID, GRID);
    let maxD = 0;
    for (let i = 0; i < density.length; i++) if (density[i] > maxD) maxD = density[i];

    for (let i = 0; i < density.length; i++) {
      const t = maxD > 0 ? density[i] / maxD : 0;
      const tg = t < 0.02 ? 0 : Math.pow(t, 0.45);
      const [r, g, b, a] = heatColour(tg);
      img.data[i*4] = r; img.data[i*4+1] = g;
      img.data[i*4+2] = b;
      img.data[i*4+3] = tg < 0.001 ? 0 : a;
    }
    hctx.putImageData(img, 0, 0);

    ctx.save();
    ctx.filter = `blur(${Math.round(W / GRID * 2.2)}px)`;
    ctx.drawImage(hc, 0, 0, W, H);
    ctx.filter = 'none';
    ctx.restore();

    const kitchenY = (7 / 22) * H;
    const centerX = W / 2;
    ctx.strokeStyle = 'rgba(80, 90, 110, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.beginPath(); ctx.moveTo(0, kitchenY); ctx.lineTo(W, kitchenY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX, kitchenY); ctx.lineTo(centerX, H); ctx.stroke();

    ctx.strokeStyle = 'rgba(60, 70, 90, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.stroke();

    const fs = Math.round(W * 0.033);
    ctx.font = `bold ${fs}px system-ui`;
    ctx.fillStyle = 'rgba(80, 90, 110, 0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('NET', W/2, 15);
    ctx.fillText('NVZ', W/2, kitchenY - 5);
    ctx.fillText('BASELINE', W/2, H - 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <NewHomeNavbar />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <NewHomeNavbar />
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-red-400 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
              Error
            </h2>
            <p className="text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {error || 'Player not found'}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
              style={{ fontFamily: 'Avantique, sans-serif' }}
            >
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentMatchStats = selectedMatchForStats ? 
    selectedMatchForStats.gameStats?.player_data?.[selectedMatchForStats.playerIndex] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      <NewHomeNavbar />

      <div className="w-full bg-[#3A3A3A] py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 text-orange-500 hover:text-orange-400 text-lg font-semibold"
            style={{ fontFamily: 'Avantique, sans-serif' }}
          >
            ← Back
          </button>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-[25%] flex justify-center">
              {playerData.photoUrl || playerData.photo?.url ? (
                <div className="w-64 h-80 rounded-2xl overflow-hidden shadow-2xl">
                  <OptimizedImage
                    src={playerData.photoUrl || playerData.photo?.url}
                    alt={playerData.fullName}
                    type="playerPhoto"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="w-64 h-80 rounded-2xl bg-gray-700 flex items-center justify-center shadow-2xl">
                  <span className="text-8xl">👤</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-[50%] text-center md:text-left">
              <h1 className="text-6xl font-bold text-white mb-8" style={{ fontFamily: 'Avantique, sans-serif' }}>
                {playerData.fullName}
              </h1>

              <div className="space-y-6">
                <div>
                  <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Team
                  </h3>
                  <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    {clubData?.proposedClubName || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Age
                    </h3>
                    <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerData.age || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Gender
                    </h3>
                    <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerData.gender || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Singles DUPR
                    </h3>
                    <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerData.singlesRating || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Doubles DUPR
                    </h3>
                    <p className="text-2xl text-white font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerData.doublesRating || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-[25%] flex justify-center">
              {clubData?.teamLogo?.url ? (
                <div className="w-48 h-48">
                  <OptimizedImage
                    src={clubData.teamLogo.url}
                    alt={clubData.proposedClubName}
                    type="logo"
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    {clubData?.proposedClubName?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {playerStats && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <h2 className="text-5xl font-bold text-orange-500 mb-2" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  STATS
                </h2>
                {selectedMatchForStats && matchFixtures[selectedMatchForStats.id] && (
                  <p className="text-gray-400 font-bold" style={{ fontFamily: 'Avantique, sans-serif', fontSize: '2.25rem' }}>
                    {matchFixtures[selectedMatchForStats.id].matchTypeLabel || matchFixtures[selectedMatchForStats.id].matchType}
                  </p>
                )}
              </div>
              <select
                value={selectedMatchForStats?.id || ''}
                onChange={(e) => {
                  const match = matchHistory.find(m => m.id === e.target.value);
                  setSelectedMatchForStats(match);
                }}
                className="bg-gray-700 text-white px-6 py-3 rounded-lg border border-gray-600 focus:border-orange-500 outline-none"
                style={{ fontFamily: 'Avantique, sans-serif' }}
              >
                {matchHistory.map((match) => {
                  const fixture = matchFixtures[match.id];
                  let oppositionTeam = 'Unknown Team';
                  let matchType = '';
                  
                  if (fixture) {
                    // Determine which team the player's club belongs to
                    const playerTeamId = clubData?.id;
                    
                    // If player's team is team1, show team2 name, otherwise show team1 name
                    if (playerTeamId === fixture.team1) {
                      oppositionTeam = fixture.team2Name || 'Unknown Team';
                    } else if (playerTeamId === fixture.team2) {
                      oppositionTeam = fixture.team1Name || 'Unknown Team';
                    } else {
                      // Fallback: show team2 if we can't determine
                      oppositionTeam = fixture.team2Name || fixture.team1Name || 'Unknown Team';
                    }
                    
                    // Get match type label
                    matchType = fixture.matchTypeLabel || fixture.matchType || '';
                  }
                  
                  return (
                    <option key={match.id} value={match.id}>
                      vs {oppositionTeam} {matchType ? `[${matchType}]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <Court3DVisualization
              matchData={selectedMatchForStats}
              playerIndex={selectedMatchForStats?.playerIndex}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white uppercase text-sm tracking-wider mb-4 font-semibold" style={{ fontFamily: 'Avantique, sans-serif' }}>
                  Court Coverage
                </h3>
                <div className="court-wrapper rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && currentMatchStats?.court_coverage?.heat_map_coordinates) {
                        const xs = b64ToBytes(currentMatchStats.court_coverage.heat_map_coordinates.xs_encoded);
                        const ys = b64ToBytes(currentMatchStats.court_coverage.heat_map_coordinates.ys_encoded);
                        drawCourtHeatmap(canvas, xs, ys);
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Total Distance
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {(currentMatchStats?.court_coverage?.total_distance_covered || 0).toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">FT</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Average Serve
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.averageServeSpeed}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">MPH</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Total Shots
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {currentMatchStats?.shot_count || 0}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Average Drive
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.averageDriveSpeed}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">MPH</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Ground Strokes
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.totalGroundStrokes}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Volleys
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.totalVolleys}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Total Distance
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {(currentMatchStats?.court_coverage?.total_distance_covered || 0).toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">FT</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Average Serve
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.averageServeSpeed}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">MPH</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Total Shots
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {currentMatchStats?.shot_count || 0}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Average Drive
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.averageDriveSpeed}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">MPH</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Ground Strokes
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.totalGroundStrokes}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Volleys
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.totalVolleys}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Win Rate
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.winRate}%
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Total Matches
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.totalMatches}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Wins
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.wins}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      Losses
                    </h3>
                    <p className="text-4xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {playerStats.losses}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Dinks', value: playerStats.totalDinks },
                { label: 'Drives', value: playerStats.totalDrives },
                { label: 'Drops', value: playerStats.totalDrops },
                { label: 'Smashes', value: playerStats.totalSmashes },
                { label: 'Lobs', value: playerStats.totalLobs },
                { label: 'Resets', value: playerStats.totalResets },
                { label: 'Speedups', value: playerStats.totalSpeedups },
                { label: 'Poaches', value: playerStats.totalPoaches }
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-800 rounded-xl p-6 text-center">
                  <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-3" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    {stat.label}
                  </h3>
                  <p className="text-3xl font-bold text-orange-500" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
