#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Function to calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Function to calculate edit distance (Levenshtein distance)
function getEditDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

async function fetchAllDocuments(baseUrl, collectionName) {
  let allDocuments = [];
  let pageToken = null;
  let pageCount = 0;

  while (true) {
    pageCount++;
    let url = `${baseUrl}/${collectionName}?pageSize=1000`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${collectionName}: ${response.statusText}`);
    }

    const data = await response.json();
    const documents = data.documents || [];
    allDocuments = allDocuments.concat(documents);

    console.log(`  📄 Page ${pageCount}: Fetched ${documents.length} documents`);

    // Check if there are more pages
    if (!data.nextPageToken) {
      break;
    }
    pageToken = data.nextPageToken;
  }

  return allDocuments;
}

async function removeDroppedPlayersFromTeams() {
  try {
    console.log('🚀 Starting to remove dropped players from teams...\n');
    
    // Check if Firebase CLI is available
    try {
      const { stdout } = await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      console.error('Please install Firebase CLI: npm install -g firebase-tools');
      console.error('Then login: firebase login');
      process.exit(1);
    }

    // Use Firestore REST API
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Step 1: Fetch all players from clubs-players collection with pagination
    console.log('📥 Fetching players from clubs-players collection...');
    const playerDocs = await fetchAllDocuments(baseUrl, 'clubs-players');
    
    console.log(`📊 Found ${playerDocs.length} total players in clubs-players collection\n`);

    // Step 2: Identify dropped players (those with former-club field)
    const droppedPlayers = [];
    
    for (const playerDoc of playerDocs) {
      const formerClub = playerDoc.fields?.['former-club']?.stringValue;
      
      if (formerClub) {
        const playerId = playerDoc.name.split('/').pop();
        const playerName = playerDoc.fields?.fullName?.stringValue || playerDoc.fields?.name?.stringValue || 'Unknown';
        
        droppedPlayers.push({
          playerId,
          formerClubId: formerClub,
          playerName
        });
      }
    }
    
    console.log(`🔍 Found ${droppedPlayers.length} dropped players\n`);
    
    if (droppedPlayers.length > 0) {
      console.log('📋 Dropped Players List:');
      droppedPlayers.forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.playerName} (Club ID: ${player.formerClubId})`);
      });
      console.log();
    }
    
    if (droppedPlayers.length === 0) {
      console.log('✨ No dropped players found. Nothing to update.\n');
      process.exit(0);
    }

    // Step 3: Fetch all teams with pagination
    console.log('📥 Fetching teams from teams collection...');
    const teamDocs = await fetchAllDocuments(baseUrl, 'teams');
    
    console.log(`📊 Found ${teamDocs.length} total teams in database\n`);

    // Step 3.5: Fetch all clubs from hpl-clubs collection for name verification with pagination
    console.log('📥 Fetching clubs from hpl-clubs collection...');
    const clubDocs = await fetchAllDocuments(baseUrl, 'hpl-clubs');
    
    console.log(`📊 Found ${clubDocs.length} total clubs in database\n`);

    // Create a map of club IDs to club names for quick lookup
    const clubIdToNameMap = {};
    for (const clubDoc of clubDocs) {
      const clubId = clubDoc.name.split('/').pop();
      const clubName = clubDoc.fields?.proposedClubName?.stringValue || 'Unknown';
      clubIdToNameMap[clubId] = clubName;
    }

    // Step 3.6: Fetch all players from players collection for name matching with pagination
    console.log('📥 Fetching players from players collection...');
    const playerCollectionDocs = await fetchAllDocuments(baseUrl, 'players');
    
    console.log(`📊 Found ${playerCollectionDocs.length} total players in players collection\n`);

    // Create a map of player names to array of player IDs (in case of duplicates)
    const playerNameToIdsMap = {};
    for (const playerDoc of playerCollectionDocs) {
      const playerId = playerDoc.name.split('/').pop();
      const playerName = playerDoc.fields?.name?.stringValue || '';
      if (playerName) {
        const nameLower = playerName.toLowerCase();
        if (!playerNameToIdsMap[nameLower]) {
          playerNameToIdsMap[nameLower] = [];
        }
        playerNameToIdsMap[nameLower].push(playerId);
      }
    }

    // Step 4: For each dropped player, find and update the corresponding team
    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;
    
    for (const droppedPlayer of droppedPlayers) {
      try {
        // Get the club name from the former-club ID
        const clubName = clubIdToNameMap[droppedPlayer.formerClubId];
        
        if (!clubName) {
          console.log(`⚠️  Club not found in hpl-clubs collection (Club ID: ${droppedPlayer.formerClubId}, Player: ${droppedPlayer.playerName})`);
          notFoundCount++;
          continue;
        }

        // Find the team that has matching hplClubId
        const matchingTeams = teamDocs.filter(team => {
          const hplClubId = team.fields?.hplClubId?.stringValue;
          return hplClubId === droppedPlayer.formerClubId;
        });
        
        if (matchingTeams.length === 0) {
          console.log(`⚠️  No team found with hplClubId matching ${droppedPlayer.formerClubId} (Club: "${clubName}", Player: ${droppedPlayer.playerName})`);
          notFoundCount++;
          continue;
        }

        // Process each matching team
        for (const matchingTeam of matchingTeams) {
          const teamId = matchingTeam.name.split('/').pop();
          const teamName = matchingTeam.fields?.name?.stringValue || 'Unknown';
          const playerIds = matchingTeam.fields?.playerIds?.arrayValue?.values || [];
          
          // Get all possible player IDs from the players collection using player name
          const possiblePlayerIds = playerNameToIdsMap[droppedPlayer.playerName.toLowerCase()];
          
          if (!possiblePlayerIds || possiblePlayerIds.length === 0) {
            console.log(`⚠️  Player ${droppedPlayer.playerName} not found in players collection`);
            skippedCount++;
            continue;
          }
          
          // Find which of the possible player IDs is actually in the team
          let playerIdIndex = -1;
          let matchedPlayerId = null;
          
          for (const possibleId of possiblePlayerIds) {
            const index = playerIds.findIndex(id => id.stringValue === possibleId);
            if (index !== -1) {
              playerIdIndex = index;
              matchedPlayerId = possibleId;
              break;
            }
          }
          
          if (playerIdIndex === -1) {
            console.log(`ℹ️  Player ${droppedPlayer.playerName} not found in team ${teamName}`);
            if (possiblePlayerIds.length > 1) {
              console.log(`   Note: Found ${possiblePlayerIds.length} players with this name, but none in this team`);
            }
            continue;
          }

          // Verify hplClubId matches before dropping
          console.log(`\n🔍 Verification Check:`);
          console.log(`   Player: ${droppedPlayer.playerName}`);
          console.log(`   Former Club ID: ${droppedPlayer.formerClubId}`);
          console.log(`   Club Name (from hpl-clubs): ${clubName}`);
          console.log(`   Team Name: ${teamName}`);
          console.log(`   Team hplClubId: ${droppedPlayer.formerClubId}`);
          console.log(`   Player ID (from players collection): ${matchedPlayerId}`);
          if (possiblePlayerIds.length > 1) {
            console.log(`   Note: Found ${possiblePlayerIds.length} players with this name, using the one in team`);
          }
          console.log(`   Team ID: ${teamId}`);
          console.log(`   Match Status: ✅ hplClubId verified (Exact match)`);
          console.log(`   Action: Removing player from team\n`);

          // Remove the player ID from the array
          const updatedPlayerIds = playerIds.filter((_, index) => index !== playerIdIndex);
          
          // Update the team document
          const updateUrl = `${baseUrl}/teams/${teamId}`;
          const updatePayload = {
            fields: {
              ...matchingTeam.fields,
              playerIds: {
                arrayValue: {
                  values: updatedPlayerIds
                }
              }
            }
          };

          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
          });

          if (updateResponse.ok) {
            console.log(`✅ Removed ${droppedPlayer.playerName} from team ${teamName} (Club: ${clubName})`);
            updatedCount++;
          } else {
            console.log(`⚠️  Failed to update team ${teamName}: ${updateResponse.statusText}`);
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing player ${droppedPlayer.playerName}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully removed: ${updatedCount} players`);
    console.log(`⚠️  Teams not found: ${notFoundCount}`);
    console.log(`⏭️  Skipped/Failed: ${skippedCount}`);
    console.log(`📊 Total dropped players processed: ${droppedPlayers.length}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing dropped players:', error.message);
    console.error('\nMake sure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

removeDroppedPlayersFromTeams();
