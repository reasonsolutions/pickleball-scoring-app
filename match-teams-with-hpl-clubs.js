import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Try service account key first
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';

let initialized = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'pickleball-app-9ccf7'
    });
    initialized = true;
    console.log('Initialized with service account key\n');
  } catch (error) {
    console.log('Could not initialize with service account key:', error.message);
  }
}

// If not initialized, try with default credentials (for Firebase CLI)
if (!initialized) {
  try {
    admin.initializeApp({
      projectId: 'pickleball-app-9ccf7'
    });
    initialized = true;
    console.log('Initialized with default credentials\n');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. You have a service-account-key.json in the project root, OR');
    console.error('2. You are logged in with Firebase CLI (run: firebase login)');
    process.exit(1);
  }
}

const db = admin.firestore();

// Normalize team names for matching (lowercase, trim, remove extra spaces)
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function matchTeamsWithHplClubs() {
  try {
    console.log('Starting team matching process...\n');

    // Fetch all active teams from hpl-clubs collection
    console.log('Fetching active teams from hpl-clubs collection...');
    const hplClubsSnapshot = await db.collection('hpl-clubs')
      .where('isActive', '==', true)
      .get();

    if (hplClubsSnapshot.empty) {
      console.log('No active teams found in hpl-clubs collection');
      return;
    }

    console.log(`Found ${hplClubsSnapshot.size} active teams in hpl-clubs collection\n`);

    // Create a map of normalized team names to hpl-clubs data
    const hplClubsMap = new Map();

    hplClubsSnapshot.forEach(doc => {
      const data = doc.data();
      const teamName = data.teamName || data.name || '';
      const normalizedName = normalizeTeamName(teamName);

      if (normalizedName) {
        hplClubsMap.set(normalizedName, {
          id: doc.id,
          teamName: teamName,
          ...data
        });
      }
    });

    console.log(`Created map with ${hplClubsMap.size} normalized team names\n`);

    // Fetch all teams from teams collection
    console.log('Fetching teams from teams collection...');
    const teamsSnapshot = await db.collection('teams').get();

    if (teamsSnapshot.empty) {
      console.log('No teams found in teams collection');
      return;
    }

    console.log(`Found ${teamsSnapshot.size} teams in teams collection\n`);

    // Match teams and update with hpl-clubs ID
    let matchedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const unmatchedTeams = [];

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamName = teamData.teamName || teamData.name || '';
      const normalizedTeamName = normalizeTeamName(teamName);

      // Try exact match first
      let hplClubMatch = hplClubsMap.get(normalizedTeamName);

      // If no exact match, try partial matching
      if (!hplClubMatch) {
        for (const [normalizedHplName, hplData] of hplClubsMap.entries()) {
          if (normalizedTeamName.includes(normalizedHplName) || 
              normalizedHplName.includes(normalizedTeamName)) {
            hplClubMatch = hplData;
            break;
          }
        }
      }

      if (hplClubMatch) {
        matchedCount++;
        console.log(`✓ Matched: "${teamName}" -> "${hplClubMatch.teamName}" (ID: ${hplClubMatch.id})`);

        // Update the team document with hpl-clubs ID
        try {
          await db.collection('teams').doc(teamDoc.id).update({
            hplClubId: hplClubMatch.id
          });
          updatedCount++;
          console.log(`  - Successfully updated team ${teamDoc.id}\n`);
        } catch (updateError) {
          console.error(`  ✗ Error updating team ${teamDoc.id}: ${updateError.message}\n`);
          failedCount++;
        }
      } else {
        console.log(`✗ No match found for: "${teamName}" (${teamDoc.id})\n`);
        unmatchedTeams.push({
          teamId: teamDoc.id,
          teamName: teamName
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('MATCHING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total teams in teams collection: ${teamsSnapshot.size}`);
    console.log(`Total active teams in hpl-clubs: ${hplClubsMap.size}`);
    console.log(`Matched teams: ${matchedCount}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed updates: ${failedCount}`);
    console.log(`Unmatched teams: ${unmatchedTeams.length}`);
    console.log('='.repeat(60));

    if (unmatchedTeams.length > 0) {
      console.log('\nUnmatched teams:');
      unmatchedTeams.forEach(team => {
        console.log(`  - ${team.teamName} (ID: ${team.teamId})`);
      });
    }

    console.log('\nMatching process completed successfully!');

  } catch (error) {
    console.error('Error during team matching:', error);
    process.exit(1);
  }
}

// Run the script
matchTeamsWithHplClubs()
  .then(() => {
    console.log('\nScript execution finished');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
