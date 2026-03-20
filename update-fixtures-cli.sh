#!/bin/bash

# This script updates fixture venues using Firebase CLI
# It requires firebase-tools to be installed and authenticated

PROJECT_ID="pickleball-app-9ccf7"

echo "🚀 Starting fixture venue updates..."
echo ""

# Get all fixtures and update them one by one using firebase CLI
# Since we can't directly use Firestore REST API without proper auth,
# we'll use a Node.js script with proper Firebase initialization

node << 'NODEJS_SCRIPT'
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to initialize with default credentials
try {
  admin.initializeApp({
    projectId: 'pickleball-app-9ccf7'
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK');
  console.error('Make sure you have GOOGLE_APPLICATION_CREDENTIALS set or are using gcloud auth');
  process.exit(1);
}

const db = admin.firestore();

async function updateFixtures() {
  try {
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

    console.log('📋 Fetching fixtures...');
    const fixturesSnapshot = await db.collection('fixtures').get();
    
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    console.log(`✅ Found ${fixturesSnapshot.size} fixtures\n`);
    console.log('Processing fixtures:\n');

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

      const teamVenue = teamVenueMap[team1Id];
      
      if (!teamVenue) {
        console.log(`❌ Team "${team1Id}" not found for fixture "${fixtureId}" (${team1Name})`);
        notFoundCount++;
        continue;
      }

      const newVenue = teamVenue.venueId;
      const newVenueName = teamVenue.venueName;

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
        console.log(`❌ Failed to update fixture "${fixtureId}": ${error.message}\n`);
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

updateFixtures();
NODEJS_SCRIPT
