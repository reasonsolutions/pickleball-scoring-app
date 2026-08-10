import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import * as XLSX from 'xlsx';

export default function Fantasy() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTournamentId, setActiveTournamentId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'fantasyPoints', direction: 'desc' });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [activeTab, setActiveTab] = useState('points');
  const [playerCosts, setPlayerCosts] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFantasyData();
  }, []);

  const fetchFantasyData = async () => {
    try {
      setLoading(true);

      // Fetch active tournament ID from app settings
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      const appSettingsDoc = await getDoc(appSettingsRef);
      
      if (!appSettingsDoc.exists() || !appSettingsDoc.data().activeTournamentId) {
        setLoading(false);
        return;
      }

      const tournamentId = appSettingsDoc.data().activeTournamentId;
      setActiveTournamentId(tournamentId);

      // Fetch tournament details
      const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
      if (tournamentDoc.exists()) {
        setTournamentName(tournamentDoc.data().name || tournamentDoc.data().tournamentName || 'Tournament');
      }

      // Fetch all players for this tournament
      const playersQuery = query(
        collection(db, 'players'),
        where('tournamentId', '==', tournamentId)
      );
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch existing fantasy player data (including costs)
      const tournamentDocRef = doc(db, 'fantasy-players', tournamentId);
      const playersSubcollection = collection(tournamentDocRef, 'players');
      const fantasyPlayersSnapshot = await getDocs(playersSubcollection);
      const existingCosts = {};
      fantasyPlayersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.cost !== undefined) {
          existingCosts[doc.id] = data.cost;
        }
      });
      setPlayerCosts(existingCosts);

      // Fetch all fixtures for this tournament
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', tournamentId),
        where('status', '==', 'completed')
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      const fixturesData = fixturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate fantasy points for each player
      const playersWithFantasyPoints = playersData.map(player => {
        const fantasyStats = calculateFantasyPoints(player, fixturesData);
        return {
          ...player,
          ...fantasyStats
        };
      });

      // Sort by fantasy points (descending)
      playersWithFantasyPoints.sort((a, b) => b.fantasyPoints - a.fantasyPoints);

      setPlayers(playersWithFantasyPoints);
      
      // Automatically save calculated stats to Firestore
      await saveFantasyStatsToFirestore(playersWithFantasyPoints, tournamentId, existingCosts);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fantasy data:', error);
      setLoading(false);
    }
  };

  const calculateFantasyPoints = (player, fixtures) => {
    let totalFantasyPoints = 0;
    let matchesPlayed = 0;
    let matchesWon = 0;
    let matchesLost = 0;
    let totalPointsScored = 0;
    const matchDetails = [];

    fixtures.forEach(fixture => {
      // Check if player participated in this match
      const isPlayer1Team1 = fixture.player1Team1 === player.name || fixture.player1Team1Id === player.id;
      const isPlayer2Team1 = fixture.player2Team1 === player.name || fixture.player2Team1Id === player.id;
      const isPlayer1Team2 = fixture.player1Team2 === player.name || fixture.player1Team2Id === player.id;
      const isPlayer2Team2 = fixture.player2Team2 === player.name || fixture.player2Team2Id === player.id;

      const isInTeam1 = isPlayer1Team1 || isPlayer2Team1;
      const isInTeam2 = isPlayer1Team2 || isPlayer2Team2;

      if (!isInTeam1 && !isInTeam2) {
        return; // Player didn't participate in this match
      }

      matchesPlayed++;

      // Get match scores
      const scores = fixture.scores || {};
      const player1Scores = scores.player1 || {};
      const player2Scores = scores.player2 || {};
      const gamesCount = fixture.gamesCount || 3;

      // Calculate total points for each team
      let team1TotalPoints = 0;
      let team2TotalPoints = 0;

      for (let i = 1; i <= gamesCount; i++) {
        const gameKey = `game${i}`;
        team1TotalPoints += parseInt(player1Scores[gameKey]) || 0;
        team2TotalPoints += parseInt(player2Scores[gameKey]) || 0;
      }

      // Determine match type (singles or doubles)
      const isSingles = fixture.matchType === 'singles' || 
                        (!fixture.player2Team1 && !fixture.player2Team2);

      // Calculate points for this match
      let matchFantasyPoints = 0;

      // 1. Participation Points: +2 for playing
      matchFantasyPoints += 2;

      // 2. Match Points: 1 point per point won
      if (isInTeam1) {
        matchFantasyPoints += team1TotalPoints;
        totalPointsScored += team1TotalPoints;
      } else {
        matchFantasyPoints += team2TotalPoints;
        totalPointsScored += team2TotalPoints;
      }

      // 3. Win/Loss Points
      const team1Won = team1TotalPoints > team2TotalPoints;
      const playerWon = (isInTeam1 && team1Won) || (isInTeam2 && !team1Won);

      if (playerWon) {
        matchFantasyPoints += 2; // +2 for winning
        matchesWon++;
      } else {
        matchFantasyPoints -= 1; // -1 for losing
        matchesLost++;
      }

      // 4. Win Difference Bonus
      const pointDifference = Math.abs(team1TotalPoints - team2TotalPoints);
      let marginBonus = 0;
      
      if (playerWon) {
        if (pointDifference === 4) {
          marginBonus = 1;
          matchFantasyPoints += 1;
        } else if (pointDifference >= 5 && pointDifference <= 8) {
          marginBonus = 2;
          matchFantasyPoints += 2;
        } else if (pointDifference >= 9 && pointDifference <= 12) {
          marginBonus = 3;
          matchFantasyPoints += 3;
        } else if (pointDifference > 12) {
          marginBonus = 5;
          matchFantasyPoints += 5;
        }
      }

      // 5. Milestone Bonus Points (single highest milestone reached)
      const playerTeamPoints = isInTeam1 ? team1TotalPoints : team2TotalPoints;
      let milestoneBonus = 0;
      
      if (playerTeamPoints >= 15) {
        milestoneBonus = 5;
        matchFantasyPoints += 5;
      } else if (playerTeamPoints >= 11) {
        milestoneBonus = 3;
        matchFantasyPoints += 3;
      } else if (playerTeamPoints >= 8) {
        milestoneBonus = 2;
        matchFantasyPoints += 2;
      } else if (playerTeamPoints >= 4) {
        milestoneBonus = 1;
        matchFantasyPoints += 1;
      }

      totalFantasyPoints += matchFantasyPoints;

      // Store match details
      matchDetails.push({
        matchId: fixture.id,
        fixtureGroupId: fixture.fixtureGroupId,
        date: fixture.date,
        team1Name: fixture.team1Name,
        team2Name: fixture.team2Name,
        playerTeam: isInTeam1 ? fixture.team1Name : fixture.team2Name,
        opponentTeam: isInTeam1 ? fixture.team2Name : fixture.team1Name,
        playerTeamScore: playerTeamPoints,
        opponentTeamScore: isInTeam1 ? team2TotalPoints : team1TotalPoints,
        won: playerWon,
        participationPoints: 2,
        matchPoints: playerTeamPoints,
        winLossPoints: playerWon ? 2 : -1,
        marginBonus,
        milestoneBonus,
        totalFantasyPoints: matchFantasyPoints
      });
    });

    return {
      fantasyPoints: totalFantasyPoints,
      matchesPlayed,
      matchesWon,
      matchesLost,
      totalPointsScored,
      avgPointsPerMatch: matchesPlayed > 0 ? parseFloat((totalPointsScored / matchesPlayed).toFixed(1)) : 0,
      matchDetails
    };
  };

  const saveFantasyStatsToFirestore = async (playersData, tournamentId, costs) => {
    try {
      console.log('Saving fantasy stats to Firestore...');
      
      for (const player of playersData) {
        const tournamentDoc = doc(db, 'fantasy-players', tournamentId);
        const playersSubcollection = collection(tournamentDoc, 'players');
        const fantasyPlayerRef = doc(playersSubcollection, player.id);
        
        await setDoc(fantasyPlayerRef, {
          playerId: player.id,
          playerName: player.name,
          teamName: player.teamName || '',
          tournamentId: tournamentId,
          fantasyPoints: player.fantasyPoints,
          matchesPlayed: player.matchesPlayed,
          matchesWon: player.matchesWon,
          matchesLost: player.matchesLost,
          totalPointsScored: player.totalPointsScored,
          avgPointsPerMatch: player.avgPointsPerMatch,
          matches: player.matchDetails || [],
          cost: costs[player.id] || 0,
          lastUpdated: serverTimestamp()
        });
      }
      
      console.log('✅ Fantasy stats saved successfully for', playersData.length, 'players');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ Error saving fantasy stats:', error);
    }
  };

  const handleSyncToDatabase = async () => {
    if (players.length === 0 || !activeTournamentId) {
      alert('No data to sync. Please ensure players are loaded.');
      return;
    }

    try {
      setSyncing(true);
      console.log('Syncing fantasy data to Firestore...');
      console.log('Structure: fantasy-players/{tournamentId}/players/{playerId}');
      
      // Step 1: Sync player data
      for (const player of players) {
        // Path: fantasy-players/{tournamentId}/players/{playerId}
        // Create reference to tournament document, then subcollection
        const tournamentDoc = doc(db, 'fantasy-players', activeTournamentId);
        const playersSubcollection = collection(tournamentDoc, 'players');
        const fantasyPlayerRef = doc(playersSubcollection, player.id);
        
        await setDoc(fantasyPlayerRef, {
          playerId: player.id,
          playerName: player.name,
          teamName: player.teamName || '',
          tournamentId: activeTournamentId,
          fantasyPoints: player.fantasyPoints,
          matchesPlayed: player.matchesPlayed,
          matchesWon: player.matchesWon,
          matchesLost: player.matchesLost,
          totalPointsScored: player.totalPointsScored,
          avgPointsPerMatch: player.avgPointsPerMatch,
          matches: player.matchDetails || [],
          cost: playerCosts[player.id] || 0,
          lastUpdated: serverTimestamp()
        });
      }
      
      console.log('✅ Fantasy player data synced successfully for', players.length, 'players');
      
      // Step 2: Update fantasy teams with calculated points
      console.log('Updating fantasy teams points...');
      await updateFantasyTeamsPoints(activeTournamentId, players);
      
      setLastSyncTime(new Date());
      console.log(`Path: fantasy-players/${activeTournamentId}/players/{playerId}`);
      alert(`Successfully synced ${players.length} players and updated team points!`);
    } catch (error) {
      console.error('❌ Error syncing fantasy data:', error);
      alert('Error syncing data to database. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const updateFantasyTeamsPoints = async (tournamentId, playersData) => {
    try {
      // Create a map of player ID to player data (including match details) for quick lookup
      const playerDataMap = {};
      playersData.forEach(player => {
        playerDataMap[player.id] = {
          fantasyPoints: player.fantasyPoints,
          matchDetails: player.matchDetails || []
        };
      });

      // Fetch all fantasy teams for this tournament
      const teamsQuery = query(
        collection(db, 'fantasy-teams'),
        where('tournamentId', '==', tournamentId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      
      console.log(`Found ${teamsSnapshot.docs.length} fantasy teams to update`);

      // Update each team's points
      for (const teamDoc of teamsSnapshot.docs) {
        const teamData = teamDoc.data();
        const teamRef = doc(db, 'fantasy-teams', teamDoc.id);
        
        console.log(`\n🔍 Processing team: ${teamData.teamName}`);
        console.log('Gameweeks data:', teamData.gameweeks);
        
        // Calculate total points from all players in the team
        let totalPoints = 0;
        const playerIds = teamData.playerIds || [];
        
        playerIds.forEach(playerId => {
          const playerData = playerDataMap[playerId];
          const playerPoints = playerData ? playerData.fantasyPoints : 0;
          totalPoints += playerPoints;
        });

        // Update gameweeks points if they exist
        const updatedGameweeks = { ...teamData.gameweeks };
        
        if (updatedGameweeks) {
          Object.keys(updatedGameweeks).forEach(gameweekKey => {
            const gameweek = updatedGameweeks[gameweekKey];
            console.log(`\n📅 Processing gameweek: ${gameweekKey}`, gameweek);
            
            if (gameweek && gameweek.playerIds) {
              let gameweekPoints = 0;
              
              // Get the gameweek date - it's stored as a single date string (gameweekDate)
              let gameweekDate = null;
              if (gameweek.gameweekDate) {
                gameweekDate = new Date(gameweek.gameweekDate);
                // Set to start of day for comparison
                gameweekDate.setHours(0, 0, 0, 0);
              }
              
              console.log(`Gameweek date: ${gameweekDate}`);
              
              gameweek.playerIds.forEach(playerId => {
                const playerData = playerDataMap[playerId];
                if (!playerData) {
                  console.log(`⚠️ No data found for player: ${playerId}`);
                  return;
                }
                
                // Calculate points only from matches within this gameweek's date range
                let playerGameweekPoints = 0;
                console.log(`Player ${playerId} has ${playerData.matchDetails.length} matches`);
                
                playerData.matchDetails.forEach(match => {
                  // Handle both Timestamp objects and regular date strings
                  let matchDate = null;
                  if (match.date) {
                    if (match.date.seconds) {
                      matchDate = new Date(match.date.seconds * 1000);
                    } else if (match.date.toDate) {
                      matchDate = match.date.toDate();
                    } else {
                      matchDate = new Date(match.date);
                    }
                  }
                  
                  console.log(`Match date: ${matchDate}, Points: ${match.totalFantasyPoints}`);
                  
                  // Check if match date matches the gameweek date (same day)
                  if (matchDate && gameweekDate) {
                    // Set match date to start of day for comparison
                    const matchDateOnly = new Date(matchDate);
                    matchDateOnly.setHours(0, 0, 0, 0);
                    
                    if (matchDateOnly.getTime() === gameweekDate.getTime()) {
                      playerGameweekPoints += match.totalFantasyPoints || 0;
                      console.log(`✅ Match included! Player gameweek points now: ${playerGameweekPoints}`);
                    } else {
                      console.log(`❌ Match on different date - Match: ${matchDateOnly.toDateString()}, Gameweek: ${gameweekDate.toDateString()}`);
                    }
                  } else {
                    console.log(`⚠️ Missing date info - matchDate: ${matchDate}, gameweekDate: ${gameweekDate}`);
                  }
                });
                
                console.log(`Player ${playerId} gameweek points: ${playerGameweekPoints}`);
                gameweekPoints += playerGameweekPoints;
              });
              
              console.log(`Total gameweek ${gameweekKey} points: ${gameweekPoints}`);
              
              updatedGameweeks[gameweekKey] = {
                ...gameweek,
                points: gameweekPoints
              };
            }
          });
        }

        // Update the team document
        await updateDoc(teamRef, {
          totalPoints: totalPoints,
          gameweeks: updatedGameweeks,
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Updated team ${teamData.teamName}: ${totalPoints} points`);
      }

      console.log('✅ All fantasy teams updated successfully');
    } catch (error) {
      console.error('❌ Error updating fantasy teams:', error);
      throw error;
    }
  };

  const handleCostChange = (playerId, value) => {
    const cost = parseFloat(value) || 0;
    setPlayerCosts(prev => ({
      ...prev,
      [playerId]: cost
    }));
  };

  const handleExportPlayers = () => {
    if (players.length === 0) {
      alert('No players to export');
      return;
    }

    // Prepare data for export
    const exportData = players.map((player, index) => ({
      'Rank': index + 1,
      'Player Name': player.name,
      'Team': player.teamName || '',
      'Cost': playerCosts[player.id] || 0
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Players');

    // Generate filename
    const fileName = `Fantasy_Players_${tournamentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fileName);
  };

  const handleImportPlayers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Update costs from imported data
        const updatedCosts = { ...playerCosts };
        let updatedCount = 0;

        jsonData.forEach(row => {
          const playerName = row['Player Name'];
          const cost = parseFloat(row['Cost']) || 0;

          // Find player by name
          const player = players.find(p => p.name === playerName);
          if (player) {
            updatedCosts[player.id] = cost;
            updatedCount++;
          }
        });

        setPlayerCosts(updatedCosts);
        alert(`Successfully imported costs for ${updatedCount} players!`);
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Error importing file. Please make sure it\'s a valid Excel file with the correct format.');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input
    event.target.value = '';
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });

    const sortedPlayers = [...players].sort((a, b) => {
      const aValue = a[key] || 0;
      const bValue = b[key] || 0;

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setPlayers(sortedPlayers);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h1 className="text-3xl font-bold text-gray-900">Fantasy Leaderboard</h1>
              </div>
              
              {/* Sync to DB Button */}
              <button
                onClick={handleSyncToDatabase}
                disabled={syncing || players.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  syncing || players.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Sync to DB
                  </>
                )}
              </button>
            </div>
            
            <div className="ml-11">
              {tournamentName && (
                <p className="text-gray-600">Tournament: <span className="font-semibold">{tournamentName}</span></p>
              )}
              {lastSyncTime && (
                <p className="text-sm text-gray-500 mt-1">
                  Last synced: {lastSyncTime.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('points')}
                    className={`${
                      activeTab === 'points'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Points
                  </button>
                  <button
                    onClick={() => setActiveTab('players')}
                    className={`${
                      activeTab === 'players'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Players
                  </button>
                </nav>

                {/* Export/Import buttons - only show in Players tab */}
                {activeTab === 'players' && players.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={handleExportPlayers}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportPlayers}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Import
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fantasy Points Explanation - Only show in Points tab */}
          {activeTab === 'points' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">How Fantasy Points Work:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Participation:</strong> +2 points for playing a match</li>
                <li>• <strong>Match Points:</strong> +1 point for each point won in the match</li>
                <li>• <strong>Win Bonus:</strong> +2 points for winning, -1 point for losing</li>
                <li>• <strong>Win Margin Bonus:</strong> By 4 pts (+1), By 5-8 pts (+2), By 9-12 pts (+3), Above 12 pts (+5)</li>
                <li>• <strong>Milestone Bonus:</strong> 4 pts (+1), 8 pts (+2), 11 pts (+3), 15 pts (+5)</li>
              </ul>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : !activeTournamentId ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Tournament</h3>
                <p className="text-gray-600">Please set an active tournament in App Settings first.</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Players Found</h3>
                <p className="text-gray-600">No players found for this tournament.</p>
              </div>
            ) : activeTab === 'points' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player Name
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('fantasyPoints')}
                      >
                        <div className="flex items-center gap-1">
                          Fantasy Points
                          {getSortIcon('fantasyPoints')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('matchesPlayed')}
                      >
                        <div className="flex items-center gap-1">
                          Matches
                          {getSortIcon('matchesPlayed')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('matchesWon')}
                      >
                        <div className="flex items-center gap-1">
                          Wins
                          {getSortIcon('matchesWon')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('matchesLost')}
                      >
                        <div className="flex items-center gap-1">
                          Losses
                          {getSortIcon('matchesLost')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalPointsScored')}
                      >
                        <div className="flex items-center gap-1">
                          Total Points
                          {getSortIcon('totalPointsScored')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('avgPointsPerMatch')}
                      >
                        <div className="flex items-center gap-1">
                          Avg/Match
                          {getSortIcon('avgPointsPerMatch')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player, index) => (
                      <tr
                        key={player.id}
                        className={`hover:bg-gray-50 ${index < 3 ? 'bg-orange-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && (
                              <span className="text-2xl mr-2">🥇</span>
                            )}
                            {index === 1 && (
                              <span className="text-2xl mr-2">🥈</span>
                            )}
                            {index === 2 && (
                              <span className="text-2xl mr-2">🥉</span>
                            )}
                            <span className={`text-sm font-medium ${index < 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/admin/fantasy/player/${player.id}`)}
                            className="text-left hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                          >
                            <div className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                              {player.name}
                            </div>
                            {player.teamName && (
                              <div className="text-sm text-gray-500">{player.teamName}</div>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-bold ${index < 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {player.fantasyPoints}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.matchesPlayed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {player.matchesWon}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {player.matchesLost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.totalPointsScored}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.avgPointsPerMatch}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Players Tab with Cost */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player, index) => (
                      <tr
                        key={player.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && (
                              <span className="text-2xl mr-2">🥇</span>
                            )}
                            {index === 1 && (
                              <span className="text-2xl mr-2">🥈</span>
                            )}
                            {index === 2 && (
                              <span className="text-2xl mr-2">🥉</span>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {player.name}
                          </div>
                          {player.teamName && (
                            <div className="text-sm text-gray-500">{player.teamName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={playerCosts[player.id] || ''}
                            onChange={(e) => handleCostChange(player.id, e.target.value)}
                            placeholder="Enter cost"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          {players.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-1">Total Players</div>
                <div className="text-2xl font-bold text-gray-900">{players.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-1">Highest Score</div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...players.map(p => p.fantasyPoints))}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-1">Average Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(players.reduce((sum, p) => sum + p.fantasyPoints, 0) / players.length).toFixed(0)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-1">Total Matches</div>
                <div className="text-2xl font-bold text-gray-900">
                  {players.reduce((sum, p) => sum + p.matchesPlayed, 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
