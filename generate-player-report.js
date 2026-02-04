/**
 * Player Report Generator for All Stars and Credicon Mavericks
 * This script fetches player data from Firebase and generates a comprehensive report
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './src/utils/firebase.js';

/**
 * Fetch all tournaments
 */
async function fetchTournaments() {
  try {
    console.log('🔍 Fetching tournaments...');
    const tournamentsRef = collection(db, 'tournaments');
    const snapshot = await getDocs(tournamentsRef);
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${tournaments.length} tournaments`);
    return tournaments;
  } catch (error) {
    console.error('❌ Error fetching tournaments:', error);
    return [];
  }
}

/**
 * Fetch teams for a specific tournament
 */
async function fetchTeamsForTournament(tournamentId) {
  try {
    const teamsRef = collection(db, 'teams');
    const teamsQuery = query(teamsRef, where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(teamsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Error fetching teams for tournament ${tournamentId}:`, error);
    return [];
  }
}

/**
 * Fetch players for a specific tournament
 */
async function fetchPlayersForTournament(tournamentId) {
  try {
    const playersRef = collection(db, 'players');
    const playersQuery = query(playersRef, where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(playersQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Error fetching players for tournament ${tournamentId}:`, error);
    return [];
  }
}

/**
 * Find target teams across all tournaments
 */
async function findTargetTeams() {
  const targetTeamNames = ['All Stars', 'Credicon Mavericks'];
  const foundTeams = [];
  
  const tournaments = await fetchTournaments();
  
  for (const tournament of tournaments) {
    console.log(`\n🔍 Searching in tournament: ${tournament.name || tournament.tournamentName || tournament.id}`);
    
    const teams = await fetchTeamsForTournament(tournament.id);
    
    for (const team of teams) {
      const teamName = team.name || '';
      
      // Check if this team matches any of our target teams (case-insensitive)
      const matchedTargetName = targetTeamNames.find(targetName => 
        teamName.toLowerCase().includes(targetName.toLowerCase()) ||
        targetName.toLowerCase().includes(teamName.toLowerCase())
      );
      
      if (matchedTargetName) {
        console.log(`✅ Found target team: "${teamName}" (matches "${matchedTargetName}")`);
        foundTeams.push({
          ...team,
          tournamentId: tournament.id,
          tournamentName: tournament.name || tournament.tournamentName || tournament.id,
          targetName: matchedTargetName
        });
      }
    }
  }
  
  return foundTeams;
}

/**
 * Get players for specific teams
 */
async function getPlayersForTeams(teams) {
  const teamPlayers = [];
  
  for (const team of teams) {
    console.log(`\n🔍 Fetching players for team: ${team.name}`);
    
    // Get all players for this tournament
    const allPlayers = await fetchPlayersForTournament(team.tournamentId);
    
    // Filter players that belong to this team
    const teamPlayerIds = team.playerIds || [];
    const playersInTeam = allPlayers.filter(player => teamPlayerIds.includes(player.id));
    
    console.log(`✅ Found ${playersInTeam.length} players in team "${team.name}"`);
    
    teamPlayers.push({
      team: team,
      players: playersInTeam
    });
  }
  
  return teamPlayers;
}

/**
 * Format player information for display
 */
function formatPlayerInfo(player) {
  const info = [];
  
  info.push(`Name: ${player.name || 'N/A'}`);
  
  if (player.age) {
    info.push(`Age: ${player.age}`);
  }
  
  if (player.gender) {
    info.push(`Gender: ${player.gender}`);
  }
  
  if (player.duprId) {
    info.push(`DUPR ID: ${player.duprId}`);
  }
  
  // Ratings and statistics
  if (player.doublesRating) {
    info.push(`Doubles Rating: ${player.doublesRating}`);
  }
  
  if (player.doublesWins !== undefined || player.doublesLosses !== undefined) {
    const wins = player.doublesWins || 0;
    const losses = player.doublesLosses || 0;
    info.push(`Doubles Record: ${wins}W - ${losses}L`);
  }
  
  if (player.singlesRating) {
    info.push(`Singles Rating: ${player.singlesRating}`);
  }
  
  if (player.singlesWins !== undefined || player.singlesLosses !== undefined) {
    const wins = player.singlesWins || 0;
    const losses = player.singlesLosses || 0;
    info.push(`Singles Record: ${wins}W - ${losses}L`);
  }
  
  if (player.photo?.url || player.photoUrl) {
    info.push(`Photo: Available`);
  }
  
  return info.join(' | ');
}

/**
 * Generate and display the player report
 */
async function generatePlayerReport() {
  console.log('🚀 Starting Player Report Generation...\n');
  console.log('=' .repeat(80));
  console.log('PLAYER REPORT FOR ALL STARS AND CREDICON MAVERICKS');
  console.log('=' .repeat(80));
  
  try {
    // Find target teams
    const targetTeams = await findTargetTeams();
    
    if (targetTeams.length === 0) {
      console.log('\n❌ No target teams found!');
      console.log('Searched for: All Stars, Credicon Mavericks');
      return;
    }
    
    console.log(`\n✅ Found ${targetTeams.length} target team(s)`);
    
    // Get players for each team
    const teamPlayersData = await getPlayersForTeams(targetTeams);
    
    // Generate report
    console.log('\n' + '=' .repeat(80));
    console.log('DETAILED PLAYER REPORT');
    console.log('=' .repeat(80));
    
    let totalPlayers = 0;
    
    for (const teamData of teamPlayersData) {
      const { team, players } = teamData;
      
      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`TEAM: ${team.name.toUpperCase()}`);
      console.log(`Tournament: ${team.tournamentName}`);
      console.log(`Team ID: ${team.id}`);
      console.log(`Total Players: ${players.length}`);
      if (team.description) {
        console.log(`Description: ${team.description}`);
      }
      console.log(`${'▓'.repeat(60)}`);
      
      if (players.length === 0) {
        console.log('\n  ⚠️  No players found for this team');
        continue;
      }
      
      // Sort players by name
      players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      players.forEach((player, index) => {
        console.log(`\n  ${index + 1}. ${formatPlayerInfo(player)}`);
      });
      
      totalPlayers += players.length;
      
      // Team statistics
      const playersWithDoublesRating = players.filter(p => p.doublesRating).length;
      const playersWithSinglesRating = players.filter(p => p.singlesRating).length;
      const playersWithPhotos = players.filter(p => p.photo?.url || p.photoUrl).length;
      
      console.log(`\n  📊 TEAM STATISTICS:`);
      console.log(`     • Players with Doubles Rating: ${playersWithDoublesRating}/${players.length}`);
      console.log(`     • Players with Singles Rating: ${playersWithSinglesRating}/${players.length}`);
      console.log(`     • Players with Photos: ${playersWithPhotos}/${players.length}`);
      
      if (playersWithDoublesRating > 0) {
        const avgDoublesRating = players
          .filter(p => p.doublesRating)
          .reduce((sum, p) => sum + p.doublesRating, 0) / playersWithDoublesRating;
        console.log(`     • Average Doubles Rating: ${avgDoublesRating.toFixed(3)}`);
      }
      
      if (playersWithSinglesRating > 0) {
        const avgSinglesRating = players
          .filter(p => p.singlesRating)
          .reduce((sum, p) => sum + p.singlesRating, 0) / playersWithSinglesRating;
        console.log(`     • Average Singles Rating: ${avgSinglesRating.toFixed(3)}`);
      }
    }
    
    // Overall summary
    console.log('\n' + '=' .repeat(80));
    console.log('SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Total Teams Found: ${teamPlayersData.length}`);
    console.log(`Total Players: ${totalPlayers}`);
    
    const allPlayers = teamPlayersData.flatMap(td => td.players);
    const totalWithDoublesRating = allPlayers.filter(p => p.doublesRating).length;
    const totalWithSinglesRating = allPlayers.filter(p => p.singlesRating).length;
    const totalWithPhotos = allPlayers.filter(p => p.photo?.url || p.photoUrl).length;
    
    console.log(`Players with Doubles Rating: ${totalWithDoublesRating}/${totalPlayers}`);
    console.log(`Players with Singles Rating: ${totalWithSinglesRating}/${totalPlayers}`);
    console.log(`Players with Photos: ${totalWithPhotos}/${totalPlayers}`);
    
    if (totalWithDoublesRating > 0) {
      const overallAvgDoublesRating = allPlayers
        .filter(p => p.doublesRating)
        .reduce((sum, p) => sum + p.doublesRating, 0) / totalWithDoublesRating;
      console.log(`Overall Average Doubles Rating: ${overallAvgDoublesRating.toFixed(3)}`);
    }
    
    if (totalWithSinglesRating > 0) {
      const overallAvgSinglesRating = allPlayers
        .filter(p => p.singlesRating)
        .reduce((sum, p) => sum + p.singlesRating, 0) / totalWithSinglesRating;
      console.log(`Overall Average Singles Rating: ${overallAvgSinglesRating.toFixed(3)}`);
    }
    
    console.log('\n✅ Player report generation completed!');
    
  } catch (error) {
    console.error('❌ Error generating player report:', error);
  }
}

// Export the main function for use in other modules
export { generatePlayerReport };

// If running directly (not imported), execute the report
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePlayerReport();
}