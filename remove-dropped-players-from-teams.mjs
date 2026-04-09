import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
// Try to use service account key file first, then fall back to application default credentials
let serviceAccount;
try {
  const keyPath = join(__dirname, 'pickleball-app-9ccf7-firebase-adminsdk-key.json');
  const keyFile = readFileSync(keyPath, 'utf8');
  serviceAccount = JSON.parse(keyFile);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pickleball-app-9ccf7'
  });
  console.log('✅ Using service account key file for authentication\n');
} catch (error) {
  // Fall back to application default credentials
  console.log('⚠️  Service account key file not found, using application default credentials\n');
  admin.initializeApp({
    projectId: 'pickleball-app-9ccf7'
  });
}

const db = admin.firestore();

async function removeDroppedPlayersFromTeams() {
  try {
    console.log('🚀 Starting to remove dropped players from teams...\n');
    
    // Step 1: Get all players with former-club field
    const playersSnapshot = await db.collection('clubs-players').get();
    const droppedPlayers = [];
    
    console.log(`📊 Found ${playersSnapshot.docs.length} players in clubs-players collection\n`);
    
    for (const playerDoc of playersSnapshot.docs) {
      const player = playerDoc.data();
      
      // Check if player has former-club field
      if (player['former-club']) {
        droppedPlayers.push({
          playerId: playerDoc.id,
          formerClubId: player['former-club'],
          playerName: player.fullName || player.name || 'Unknown'
        });
      }
    }
    
    console.log(`🔍 Found ${droppedPlayers.length} dropped players\n`);
    
    if (droppedPlayers.length === 0) {
      console.log('✨ No dropped players found. Nothing to update.\n');
      process.exit(0);
    }
    
    // Step 2: For each dropped player, find and update the corresponding team
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const droppedPlayer of droppedPlayers) {
      try {
        // Find the team that belongs to the former club
        const teamsSnapshot = await db.collection('teams')
          .where('hplClubId', '==', droppedPlayer.formerClubId)
          .get();
        
        if (teamsSnapshot.empty) {
          console.log(`⚠️  No team found for club ${droppedPlayer.formerClubId} (Player: ${droppedPlayer.playerName})`);
          notFoundCount++;
          continue;
        }
        
        // Update each team to remove the player ID
        for (const teamDoc of teamsSnapshot.docs) {
          const team = teamDoc.data();
          const playerIds = team.playerIds || [];
          
          // Check if player is in the team
          if (playerIds.includes(droppedPlayer.playerId)) {
            // Remove the player ID from the array
            const updatedPlayerIds = playerIds.filter(id => id !== droppedPlayer.playerId);
            
            await teamDoc.ref.update({
              playerIds: updatedPlayerIds
            });
            
            console.log(`✅ Removed ${droppedPlayer.playerName} (${droppedPlayer.playerId}) from team ${team.name}`);
            updatedCount++;
          } else {
            console.log(`ℹ️  Player ${droppedPlayer.playerName} not found in team ${team.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing player ${droppedPlayer.playerName}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount} player removals`);
    console.log(`⚠️  Not found: ${notFoundCount} teams`);
    console.log(`📊 Total dropped players processed: ${droppedPlayers.length}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing dropped players:', error);
    process.exit(1);
  }
}

removeDroppedPlayersFromTeams();
