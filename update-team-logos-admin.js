import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
// Make sure you have your service account key file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Service account key file not found at ${serviceAccountPath}`);
  console.error('Please set FIREBASE_SERVICE_ACCOUNT_PATH environment variable or place service-account-key.json in the root directory');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pickleball-app-9ccf7'
});

const db = admin.firestore();

/**
 * Updates team logos from hpl-clubs format to teams collection format
 * Matches teams by proposedClubName from hpl-clubs
 * 
 * From hpl-clubs format:
 * {
 *   publicId: "pickleball_app/team_logos/...",
 *   public_id: "pickleball_app/team_logos/...",
 *   secure_url: "https://...",
 *   url: "https://..."
 * }
 * 
 * To teams format:
 * {
 *   publicId: "pickleball_app/team_logos/...",
 *   url: "https://..."
 * }
 */
async function updateTeamLogos() {
  try {
    console.log('Starting team logo update process...\n');

    // Get all teams
    const teamsSnapshot = await db.collection('teams').get();

    if (teamsSnapshot.empty) {
      console.log('No teams found in the database.');
      return;
    }

    console.log(`Found ${teamsSnapshot.size} teams. Processing...\n`);

    // Get all hpl-clubs
    const hplClubsSnapshot = await db.collection('hpl-clubs').get();
    
    // Create a mapping of club names to logos using proposedClubName
    const clubLogoMap = {};
    hplClubsSnapshot.forEach(doc => {
      const clubData = doc.data();
      const clubName = clubData.proposedClubName;
      
      if (clubData.teamLogo && clubName) {
        // Normalize the name for matching (trim and lowercase)
        const normalizedName = clubName.toLowerCase().trim();
        clubLogoMap[normalizedName] = {
          clubId: doc.id,
          originalName: clubName,
          logo: clubData.teamLogo
        };
      }
    });

    console.log(`Found ${Object.keys(clubLogoMap).length} clubs with logos.\n`);
    console.log('Club names in hpl-clubs:', Object.keys(clubLogoMap).map(k => clubLogoMap[k].originalName), '\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Process each team
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const teamName = teamData.name || '';
      const teamNameNormalized = teamName.toLowerCase().trim();

      // Check if team has a matching club in hpl-clubs by name
      const matchingClub = clubLogoMap[teamNameNormalized];

      if (matchingClub) {
        // Transform the logo format
        const updatedLogo = {
          publicId: matchingClub.logo.publicId || matchingClub.logo.public_id,
          url: matchingClub.logo.secure_url || matchingClub.logo.url
        };

        try {
          // Update the team document using Admin SDK
          await db.collection('teams').doc(teamId).update({
            logo: updatedLogo
          });

          console.log(`✓ Updated: ${teamName} (${teamId})`);
          console.log(`  - Club ID: ${matchingClub.clubId}`);
          console.log(`  - Club Name: ${matchingClub.originalName}`);
          console.log(`  - publicId: ${updatedLogo.publicId}`);
          console.log(`  - url: ${updatedLogo.url}\n`);
          updatedCount++;
        } catch (error) {
          console.error(`✗ Failed to update ${teamName}: ${error.message}\n`);
          failedCount++;
        }
      } else {
        console.log(`⊘ Skipped: ${teamName} (${teamId}) - No matching club found in hpl-clubs\n`);
        skippedCount++;
      }
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`Total teams processed: ${teamsSnapshot.size}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no matching club): ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('=============================\n');

  } catch (error) {
    console.error('Error updating team logos:', error);
    process.exit(1);
  }
}

// Run the script
updateTeamLogos().then(() => {
  console.log('Team logo update completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
