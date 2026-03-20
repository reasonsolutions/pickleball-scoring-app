#!/usr/bin/env node

/**
 * Update Players Ratings Script
 * 
 * This script updates the singlesRating, doublesRating, and duprId in the players collection
 * based on matching data from the clubs-players collection.
 * 
 * Matches players by:
 * 1. Email address (primary)
 * 2. Full name (fallback)
 * 
 * Usage:
 *   node update-players-ratings.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyDFO4nUrgpBBydJoim9HFBLAOan94Bg7Fw",
  authDomain: "pickleball-app-9ccf7.firebaseapp.com",
  projectId: "pickleball-app-9ccf7",
  storageBucket: "pickleball-app-9ccf7.firebasestorage.app",
  messagingSenderId: "248577092150",
  appId: "1:248577092150:web:fb1415679f016111c2c697",
  measurementId: "G-6FRPZQJQ3B"
};

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('UPDATING PLAYER RATINGS FROM CLUBS-PLAYERS');
    console.log('='.repeat(70) + '\n');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Fetch all players from clubs-players collection
    console.log('📥 Fetching players from clubs-players collection...');
    const clubsPlayersSnapshot = await getDocs(collection(db, 'clubs-players'));
    console.log(`✓ Found ${clubsPlayersSnapshot.size} players in clubs-players collection\n`);

    if (clubsPlayersSnapshot.empty) {
      console.log('No players found in clubs-players collection');
      process.exit(0);
    }

    // Fetch all players from players collection
    console.log('📥 Fetching players from players collection...');
    const playersSnapshot = await getDocs(collection(db, 'players'));
    console.log(`✓ Found ${playersSnapshot.size} players in players collection\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateResults = [];

    console.log('🔄 Matching and updating players...\n');

    // Process each player in clubs-players
    for (const clubsPlayerDoc of clubsPlayersSnapshot.docs) {
      const clubsPlayerData = clubsPlayerDoc.data();
      const clubsPlayerId = clubsPlayerDoc.id;

      // Extract relevant fields from clubs-players
      const singlesRating = clubsPlayerData.singlesRating || 'Na';
      const doublesRating = clubsPlayerData.doublesRating || 'Na';
      const duprId = clubsPlayerData.duprId || '';
      const emailId = clubsPlayerData.emailId;
      const fullName = clubsPlayerData.fullName;

      console.log(`Processing: ${fullName} (${emailId})`);

      // Try to find matching player in players collection
      let matchedPlayer = null;
      let matchedPlayerId = null;

      // First, try to match by email
      if (emailId) {
        const emailQuery = query(collection(db, 'players'), where('emailId', '==', emailId));
        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          matchedPlayer = emailSnapshot.docs[0].data();
          matchedPlayerId = emailSnapshot.docs[0].id;
        }
      }

      // If not found by email, try to match by name
      if (!matchedPlayer && fullName) {
        const nameQuery = query(collection(db, 'players'), where('name', '==', fullName));
        const nameSnapshot = await getDocs(nameQuery);

        if (!nameSnapshot.empty) {
          matchedPlayer = nameSnapshot.docs[0].data();
          matchedPlayerId = nameSnapshot.docs[0].id;
        }
      }

      if (matchedPlayer && matchedPlayerId) {
        // Update the matched player
        const updateData = {
          singlesRating: singlesRating,
          doublesRating: doublesRating,
          duprId: duprId,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'players', matchedPlayerId), updateData);

        updatedCount++;
        updateResults.push({
          status: 'updated',
          clubsPlayerId,
          playerId: matchedPlayerId,
          name: fullName,
          email: emailId,
          singlesRating,
          doublesRating,
          duprId
        });

        console.log(`  ✓ Updated player: ${fullName}`);
        console.log(`    - Singles Rating: ${singlesRating}`);
        console.log(`    - Doubles Rating: ${doublesRating}`);
        console.log(`    - DUPR ID: ${duprId}\n`);
      } else {
        notFoundCount++;
        updateResults.push({
          status: 'not_found',
          clubsPlayerId,
          name: fullName,
          email: emailId,
          singlesRating,
          doublesRating,
          duprId
        });

        console.log(`  ✗ No matching player found in players collection\n`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total players processed: ${clubsPlayersSnapshot.size}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not found in players collection: ${notFoundCount}`);
    console.log('='.repeat(70) + '\n');

    // Save detailed results to file
    const resultsFile = 'update-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(updateResults, null, 2));
    console.log(`✓ Detailed results saved to: ${resultsFile}\n`);

    console.log('✓ Update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Update failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
