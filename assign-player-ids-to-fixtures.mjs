#!/usr/bin/env node

/**
 * Script to assign player IDs to fixtures
 *
 * This script:
 * 1. Fetches all fixtures from the fixtures collection
 * 2. For each fixture, extracts player names (player1Team1, player2Team1, player1Team2, player2Team2)
 * 3. Matches player names with player IDs from the players collection
 * 4. Ensures tournament IDs match between fixture and player
 * 5. Adds new fields: player1Team1Id, player2Team1Id, player1Team2Id, player2Team2Id
 * 6. For dream breaker matches, also handles gameBreakerPlayersTeam1 and gameBreakerPlayersTeam2
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ firebase-service-account.json not found in project root');
  console.error('Please download it from Firebase Console and place it in the project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pickleball-app-9ccf7'
});

const db = admin.firestore();

// Helper function to normalize player names for matching
function normalizePlayerName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Main function
async function assignPlayerIdsToFixtures() {
  console.log('🚀 Starting player ID assignment to fixtures...\n');
  
  try {
    // Step 1: Fetch all fixtures
    console.log('📥 Fetching all fixtures...');
    const fixturesSnapshot = await db.collection('fixtures').get();
    console.log(`✓ Found ${fixturesSnapshot.size} fixtures\n`);

    if (fixturesSnapshot.empty) {
      console.log('No fixtures found. Exiting.');
      return;
    }

    // Step 2: Fetch all players
    console.log('📥 Fetching all players...');
    const playersSnapshot = await db.collection('players').get();
    console.log(`✓ Found ${playersSnapshot.size} players\n`);

    if (playersSnapshot.empty) {
      console.log('No players found. Exiting.');
      return;
    }

    // Step 3: Build a map of player names to player IDs, grouped by tournament
    console.log('🔨 Building player name to ID mapping...');
    const playersByTournament = {};
    
    playersSnapshot.forEach(doc => {
      const player = doc.data();
      const tournamentId = player.tournamentId;
      const playerName = normalizePlayerName(player.name);
      
      if (!tournamentId || !playerName) return;
      
      if (!playersByTournament[tournamentId]) {
        playersByTournament[tournamentId] = {};
      }
      
      // Store player ID by normalized name
      if (!playersByTournament[tournamentId][playerName]) {
        playersByTournament[tournamentId][playerName] = [];
      }
      
      playersByTournament[tournamentId][playerName].push({
        id: doc.id,
        name: player.name,
        tournamentId: player.tournamentId
      });
    });
    
    console.log(`✓ Built mapping for ${Object.keys(playersByTournament).length} tournaments\n`);

    // Step 4: Process each fixture
    console.log('🔄 Processing fixtures...\n');
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const fixtureDoc of fixturesSnapshot.docs) {
      const fixture = fixtureDoc.data();
      const fixtureId = fixtureDoc.id;
      const tournamentId = fixture.tournamentId;

      // Skip if no tournament ID
      if (!tournamentId) {
        console.log(`⚠️  Skipping fixture ${fixtureId} - No tournament ID`);
        skippedCount++;
        continue;
      }

      // Skip if no players for this tournament
      if (!playersByTournament[tournamentId]) {
        console.log(`⚠️  Skipping fixture ${fixtureId} - No players found for tournament ${tournamentId}`);
        skippedCount++;
        continue;
      }

      const playersMap = playersByTournament[tournamentId];
      const updateData = {};
      let hasUpdates = false;

      // Process regular doubles players
      const playerFields = [
        'player1Team1',
        'player2Team1',
        'player1Team2',
        'player2Team2'
      ];

      console.log(`📝 Processing fixture ${fixtureId}...`);
      
      for (const field of playerFields) {
        const playerName = fixture[field];
        
        if (playerName && typeof playerName === 'string') {
          const normalizedName = normalizePlayerName(playerName);
          const matchedPlayers = playersMap[normalizedName];
          
          if (matchedPlayers && matchedPlayers.length > 0) {
            // Use the first match (or you could add logic to handle multiple matches)
            const playerId = matchedPlayers[0].id;
            const idField = `${field}Id`;
            
            // Only update if the ID field doesn't exist or is different
            if (!fixture[idField] || fixture[idField] !== playerId) {
              updateData[idField] = playerId;
              hasUpdates = true;
              console.log(`   ✓ ${field}: "${playerName}" → ID: ${playerId}`);
            }
            
            if (matchedPlayers.length > 1) {
              console.log(`   ⚠️  Multiple matches found for "${playerName}", using first match`);
            }
          } else {
            console.log(`   ⚠️  No match found for ${field}: "${playerName}"`);
          }
        }
      }

      // Process dream breaker players if applicable
      if (fixture.matchType === 'dreamBreaker' || fixture.fixtureType === 'dreambreaker') {
        const dreamBreakerFields = [
          'gameBreakerPlayersTeam1',
          'gameBreakerPlayersTeam2'
        ];

        for (const field of dreamBreakerFields) {
          const playerArray = fixture[field];
          
          if (Array.isArray(playerArray) && playerArray.length > 0) {
            const playerIds = [];
            let foundAllPlayers = true;
            
            for (const playerName of playerArray) {
              if (playerName && typeof playerName === 'string' && playerName.trim() !== '') {
                const normalizedName = normalizePlayerName(playerName);
                const matchedPlayers = playersMap[normalizedName];
                
                if (matchedPlayers && matchedPlayers.length > 0) {
                  playerIds.push(matchedPlayers[0].id);
                  console.log(`   ✓ ${field}: "${playerName}" → ID: ${matchedPlayers[0].id}`);
                } else {
                  playerIds.push('');
                  foundAllPlayers = false;
                  console.log(`   ⚠️  No match found in ${field}: "${playerName}"`);
                }
              } else {
                playerIds.push('');
              }
            }
            
            const idField = `${field}Ids`;
            if (foundAllPlayers || playerIds.some(id => id !== '')) {
              updateData[idField] = playerIds;
              hasUpdates = true;
            }
          }
        }
      }

      // Update the fixture if there are changes
      if (hasUpdates) {
        try {
          await db.collection('fixtures').doc(fixtureId).update(updateData);
          console.log(`   ✅ Updated fixture ${fixtureId}\n`);
          updatedCount++;
        } catch (error) {
          console.error(`   ❌ Error updating fixture ${fixtureId}:`, error.message);
          errors.push({ fixtureId, error: error.message });
          errorCount++;
        }
      } else {
        console.log(`   ℹ️  No updates needed for fixture ${fixtureId}\n`);
        skippedCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total fixtures processed: ${fixturesSnapshot.size}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no changes needed): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ fixtureId, error }) => {
        console.log(`   - Fixture ${fixtureId}: ${error}`);
      });
    }
    
    console.log('='.repeat(70) + '\n');
    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
assignPlayerIdsToFixtures()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
