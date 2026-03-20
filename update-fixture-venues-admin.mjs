#!/usr/bin/env node

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json not found');
  console.error('Please download it from Firebase Console and place it in the project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pickleball-app-9ccf7'
});

const db = admin.firestore();

async function updateFixtureVenues() {
  try {
    console.log('🚀 Starting to update fixture venues...\n');

    // Fetch all teams
    console.log('👥 Fetching teams...');
    const teamsSnapshot = await db.collection('teams').get();
    const teamVenueMap = {};

    teamsSnapshot.forEach(doc => {
      const teamData = doc.data();
      teamVenueMap[doc.id] = {
        venueId: teamData.venueId || '',
        venueName: teamData.venue || ''
      };
    });

    console.log(`✅ Found ${teamsSnapshot.size} teams\n`);

    // Fetch all fixtures
    console.log('📋 Fetching fixtures...');
    const fixturesSnapshot = await db.collection('fixtures').get();
    
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    console.log(`✅ Found ${fixturesSnapshot.size} fixtures\n`);
    console.log('Processing fixtures:\n');

    // Process each fixture
    for (const doc of fixturesSnapshot.docs) {
      const fixtureId = doc.id;
      const fixtureData = doc.data();
      const team1Id = fixtureData.team1;
      const team1Name = fixtureData.team1Name;

      if (!team1Id) {
        console.log(`⏭️  Fixture "${fixtureId}" has no team1, skipping...`);
        skippedCount++;
        continue;
      }

      // Get venue information from team1
      const teamVenue = teamVenueMap[team1Id];
      
      if (!teamVenue) {
        console.log(`❌ Team "${team1Id}" not found for fixture "${fixtureId}" (${team1Name})`);
        notFoundCount++;
        continue;
      }

      const newVenue = teamVenue.venueId;
      const newVenueName = teamVenue.venueName;

      // Update the fixture document with venue information from team1
      try {
        await db.collection('fixtures').doc(fixtureId).update({
          venue: newVenue,
          venueName: newVenueName
        });

        console.log(`✅ Updated fixture "${fixtureId}"`);
        console.log(`   Team1: ${team1Name} (${team1Id})`);
        console.log(`   Venue ID: ${newVenue}`);
        console.log(`   Venue Name: ${newVenueName}\n`);
        updatedCount++;
      } catch (error) {
        console.log(`❌ Failed to update fixture "${fixtureId}": ${error.message}`);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total fixtures processed: ${fixturesSnapshot.size}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (no team1): ${skippedCount}`);
    console.log(`❌ Failed to match: ${notFoundCount}`);
    console.log('='.repeat(60));

    console.log('\n✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the update
updateFixtureVenues();
