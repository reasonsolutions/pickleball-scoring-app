#!/usr/bin/env node

/**
 * Match Teams with HPL Clubs Script
 * 
 * This script matches active teams from the hpl-clubs collection with teams
 * in the teams collection and adds the hplClubId field to matched teams.
 * 
 * Usage:
 *   node scripts/match-teams-hpl-clubs.js
 * 
 * Requirements:
 *   - Firebase Admin SDK initialized with service account or Firebase CLI login
 *   - Access to 'hpl-clubs' and 'teams' collections in Firestore
 */

import { initializeFirebaseAdmin } from './firebase-admin-init.js';
import {
  fetchActiveHplClubs,
  fetchAllTeams,
  matchAndUpdateTeams,
  printResultsSummary
} from './team-matcher-service.js';

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('TEAM MATCHING WITH HPL CLUBS');
    console.log('='.repeat(70) + '\n');

    // Initialize Firebase
    const db = initializeFirebaseAdmin();

    // Fetch active hpl-clubs
    const hplClubsMap = await fetchActiveHplClubs(db);

    if (hplClubsMap.size === 0) {
      console.log('No active clubs to match against. Exiting.\n');
      process.exit(0);
    }

    // Fetch all teams
    const teamDocs = await fetchAllTeams(db);

    if (teamDocs.length === 0) {
      console.log('No teams to process. Exiting.\n');
      process.exit(0);
    }

    // Match and update teams
    const results = await matchAndUpdateTeams(db, teamDocs, hplClubsMap);

    // Print summary
    printResultsSummary(results);

    console.log('✓ Team matching completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Fatal error during team matching:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
