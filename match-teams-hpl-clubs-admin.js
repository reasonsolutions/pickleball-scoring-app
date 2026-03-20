// This script matches active teams from hpl-clubs collection with teams in teams collection
// and adds the hplClubId field to matched teams

import admin from 'firebase-admin';

// Initialize Firebase Admin with default credentials
// Note: This requires you to have service account credentials set up or be authenticated with Google Cloud
try {
  admin.initializeApp({
    projectId: 'pickleball-app-9ccf7'
  });
} catch (error) {
  // App might already be initialized
  console.log('Firebase app initialization note:', error.message);
}

const db = admin.firestore();

/**
 * Matches active teams from hpl-clubs collection with teams in teams collection
 * Adds hplClubId field to matched teams
 * 
 * From hpl-clubs:
 * {
 *   id: "hpl-club-id",
 *   proposedClubName: "Team Name",
 *   isActive: true
 * }
 * 
 * To teams collection:
 * {
 *   name: "Team Name",
 *   hplClubId: "hpl-club-id"  // NEW FIELD
 * }
 */
async function matchTeamsWithHplClubs() {
  try {
    console.log('Starting team matching process...\n');

    // Get all teams from teams collection
    const teamsSnapshot = await db.collection('teams').get();

    if (teamsSnapshot.empty) {
      console.log('No teams found in the database.');
      return;
    }

    console.log(`Found ${teamsSnapshot.size} teams. Processing...\n`);

    // Get all active hpl-clubs
    const hplClubsSnapshot = await db.collection('hpl-clubs').where('isActive', '==', true).get();
    
    if (hplClubsSnapshot.empty) {
      console.log('No active clubs found in hpl-clubs collection.');
      return;
    }

    // Create a mapping of club names to club IDs using proposedClubName
    const clubNameMap = {};
    hplClubsSnapshot.forEach(doc => {
      const clubData = doc.data();
      const clubName = clubData.proposedClubName;
      
      if (clubName) {
        // Normalize the name for matching (trim and lowercase)
        const normalizedName = clubName.toLowerCase().trim();
        clubNameMap[normalizedName] = {
          clubId: doc.id,
          originalName: clubName,
          isActive: clubData.isActive
        };
      }
    });

    console.log(`Found ${Object.keys(clubNameMap).length} active clubs in hpl-clubs.\n`);
    console.log('Active club names:', Object.keys(clubNameMap).map(k => clubNameMap[k].originalName), '\n');

    let matchedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const matchedTeams = [];
    const unmatchedTeams = [];

    // Process each team
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const teamName = teamData.name || '';
      const teamNameNormalized = teamName.toLowerCase().trim();

      // Check if team has a matching club in hpl-clubs by name
      const matchingClub = clubNameMap[teamNameNormalized];

      if (matchingClub) {
        try {
          // Update the team document with hplClubId
          await db.collection('teams').doc(teamId).update({
            hplClubId: matchingClub.clubId
          });

          console.log(`✓ Matched: ${teamName} (${teamId})`);
          console.log(`  - HPL Club ID: ${matchingClub.clubId}`);
          console.log(`  - Club Name: ${matchingClub.originalName}\n`);
          
          matchedTeams.push({
            teamId,
            teamName,
            hplClubId: matchingClub.clubId,
            clubName: matchingClub.originalName
          });
          matchedCount++;
        } catch (error) {
          console.error(`✗ Failed to update ${teamName}: ${error.message}\n`);
          failedCount++;
        }
      } else {
        console.log(`⊘ Unmatched: ${teamName} (${teamId}) - No matching active club found in hpl-clubs\n`);
        unmatchedTeams.push({
          teamId,
          teamName
        });
        skippedCount++;
      }
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`Total teams processed: ${teamsSnapshot.size}`);
    console.log(`Successfully matched: ${matchedCount}`);
    console.log(`Unmatched (no matching club): ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('=============================\n');

    // Log matched teams
    if (matchedTeams.length > 0) {
      console.log('MATCHED TEAMS:');
      matchedTeams.forEach(team => {
        console.log(`  - ${team.teamName} (${team.teamId}) → HPL Club: ${team.clubName} (${team.hplClubId})`);
      });
      console.log();
    }

    // Log unmatched teams
    if (unmatchedTeams.length > 0) {
      console.log('UNMATCHED TEAMS:');
      unmatchedTeams.forEach(team => {
        console.log(`  - ${team.teamName} (${team.teamId})`);
      });
      console.log();
    }

  } catch (error) {
    console.error('Error matching teams with hpl-clubs:', error);
    process.exit(1);
  }
}

// Run the script
matchTeamsWithHplClubs()
  .then(() => {
    console.log('Team matching completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
