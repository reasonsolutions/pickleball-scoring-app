#!/usr/bin/env node

/**
 * Match Teams with HPL Clubs Script (Web SDK Version)
 * 
 * This script matches active teams from the hpl-clubs collection with teams
 * in the teams collection and adds the hplClubId field to matched teams.
 * 
 * Usage:
 *   node scripts/match-teams-hpl-clubs-web.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFO4nUrgpBBydJoim9HFBLAOan94Bg7Fw",
  authDomain: "pickleball-app-9ccf7.firebaseapp.com",
  projectId: "pickleball-app-9ccf7",
  storageBucket: "pickleball-app-9ccf7.firebasestorage.app",
  messagingSenderId: "248577092150",
  appId: "1:248577092150:web:fb1415679f016111c2c697",
  measurementId: "G-6FRPZQJQ3B"
};

// Normalize team names for matching
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('TEAM MATCHING WITH HPL CLUBS (Web SDK)');
    console.log('='.repeat(70) + '\n');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Fetch all hpl-clubs (not filtering by isActive since none may be marked as active)
    console.log('📥 Fetching teams from hpl-clubs collection...');
    const allHplClubsSnapshot = await getDocs(collection(db, 'hpl-clubs'));
    console.log(`  Total hpl-clubs documents: ${allHplClubsSnapshot.size}\n`);

    // Create map of normalized names to hpl-clubs data
    const hplClubsMap = new Map();
    allHplClubsSnapshot.forEach(doc => {
      const data = doc.data();
      const clubName = data.proposedClubName || data.teamName || data.name || '';
      const normalizedName = normalizeTeamName(clubName);

      if (normalizedName) {
        hplClubsMap.set(normalizedName, {
          id: doc.id,
          clubName: clubName,
          isActive: data.isActive
        });
      }
    });

    console.log(`✓ Found ${hplClubsMap.size} teams in hpl-clubs\n`);

    if (hplClubsMap.size === 0) {
      console.log('No clubs to match against. Exiting.\n');
      process.exit(0);
    }

    // Fetch all teams
    console.log('📥 Fetching teams from teams collection...');
    const teamsSnapshot = await getDocs(collection(db, 'teams'));

    console.log(`✓ Found ${teamsSnapshot.size} teams\n`);

    if (teamsSnapshot.empty) {
      console.log('No teams to process. Exiting.\n');
      process.exit(0);
    }

    // Match and update teams
    console.log('🔄 Matching teams and updating with hpl-clubs IDs...\n');

    const results = {
      matched: [],
      unmatched: [],
      failed: [],
      totalProcessed: teamsSnapshot.size
    };

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const teamName = teamData.name || teamData.teamName || '';

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
        try {
          // Update the team document with hplClubId
          await updateDoc(doc(db, 'teams', teamId), {
            hplClubId: hplClubMatch.id
          });

          results.matched.push({
            teamId,
            teamName,
            hplClubId: hplClubMatch.id,
            hplClubName: hplClubMatch.clubName
          });

          console.log(`✓ Matched: "${teamName}" → "${hplClubMatch.clubName}"`);
          console.log(`  Team ID: ${teamId}`);
          console.log(`  HPL Club ID: ${hplClubMatch.id}\n`);
        } catch (error) {
          results.failed.push({
            teamId,
            teamName,
            error: error.message
          });

          console.error(`✗ Failed to update "${teamName}": ${error.message}\n`);
        }
      } else {
        results.unmatched.push({
          teamId,
          teamName
        });

        console.log(`⊘ Unmatched: "${teamName}" (${teamId})\n`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEAM MATCHING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total teams processed: ${results.totalProcessed}`);
    console.log(`Successfully matched & updated: ${results.matched.length}`);
    console.log(`Unmatched teams: ${results.unmatched.length}`);
    console.log(`Failed updates: ${results.failed.length}`);
    console.log('='.repeat(70) + '\n');

    if (results.matched.length > 0) {
      console.log('✓ MATCHED TEAMS:');
      results.matched.forEach(team => {
        console.log(`  • ${team.teamName} (${team.teamId})`);
        console.log(`    → HPL Club: ${team.hplClubName} (${team.hplClubId})`);
      });
      console.log();
    }

    if (results.unmatched.length > 0) {
      console.log('⊘ UNMATCHED TEAMS:');
      results.unmatched.forEach(team => {
        console.log(`  • ${team.teamName} (${team.teamId})`);
      });
      console.log();
    }

    if (results.failed.length > 0) {
      console.log('✗ FAILED UPDATES:');
      results.failed.forEach(team => {
        console.log(`  • ${team.teamName} (${team.teamId})`);
        console.log(`    Error: ${team.error}`);
      });
      console.log();
    }

    console.log('✓ Team matching completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Fatal error during team matching:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
