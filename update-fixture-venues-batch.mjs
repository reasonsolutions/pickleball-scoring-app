#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import fs from 'fs';

const execAsync = promisify(exec);

async function updateFixtureVenues() {
  try {
    console.log('🚀 Starting to update fixture venues...\n');
    
    // Check if Firebase CLI is available
    try {
      await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      console.error('Please install Firebase CLI: npm install -g firebase-tools');
      process.exit(1);
    }

    // Use Firestore REST API
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch all teams
    console.log('👥 Fetching teams...');
    const teamsResponse = await fetch(`${baseUrl}/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!teamsResponse.ok) {
      throw new Error(`Failed to fetch teams: ${teamsResponse.statusText}`);
    }

    const teamsData = await teamsResponse.json();
    const teamDocs = teamsData.documents || [];
    
    // Create a map of team IDs to their venue information
    const teamVenueMap = {};
    teamDocs.forEach(doc => {
      const teamId = doc.name.split('/').pop();
      const venueId = doc.fields?.venueId?.stringValue;
      const venueName = doc.fields?.venue?.stringValue;
      teamVenueMap[teamId] = {
        venueId: venueId || '',
        venueName: venueName || ''
      };
    });

    console.log(`✅ Found ${teamDocs.length} teams\n`);

    // Fetch all fixtures
    console.log('📋 Fetching fixtures...');
    const fixturesResponse = await fetch(`${baseUrl}/fixtures`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!fixturesResponse.ok) {
      throw new Error(`Failed to fetch fixtures: ${fixturesResponse.statusText}`);
    }

    const fixturesData = await fixturesResponse.json();
    const fixtureDocs = fixturesData.documents || [];
    
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    console.log(`✅ Found ${fixtureDocs.length} fixtures\n`);
    console.log('Processing fixtures:\n');

    // Create batch write requests
    const batchRequests = [];

    // Process each fixture
    for (const doc of fixtureDocs) {
      const fixtureId = doc.name.split('/').pop();
      const team1Id = doc.fields?.team1?.stringValue;
      const team1Name = doc.fields?.team1Name?.stringValue;

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

      // Create update request
      const updateUrl = `${baseUrl}/fixtures/${fixtureId}`;
      const updatedFields = { ...doc.fields };
      updatedFields.venue = { stringValue: newVenue };
      updatedFields.venueName = { stringValue: newVenueName };

      const updatePayload = {
        fields: updatedFields
      };

      batchRequests.push({
        fixtureId,
        team1Name,
        newVenue,
        newVenueName,
        updateUrl,
        updatePayload
      });
    }

    console.log(`📝 Prepared ${batchRequests.length} update requests\n`);
    console.log('Sending updates to Firestore...\n');

    // Send all updates
    for (const request of batchRequests) {
      try {
        const updateResponse = await fetch(request.updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request.updatePayload)
        });

        if (updateResponse.ok) {
          console.log(`✅ Updated fixture "${request.fixtureId}"`);
          console.log(`   Team1: ${request.team1Name}`);
          console.log(`   Venue ID: ${request.newVenue}`);
          console.log(`   Venue Name: ${request.newVenueName}\n`);
          updatedCount++;
        } else {
          console.log(`❌ Failed to update fixture "${request.fixtureId}": ${updateResponse.statusText}\n`);
          notFoundCount++;
        }
      } catch (error) {
        console.log(`❌ Error updating fixture "${request.fixtureId}": ${error.message}\n`);
        notFoundCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total fixtures processed: ${fixtureDocs.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (no team1): ${skippedCount}`);
    console.log(`❌ Failed to match: ${notFoundCount}`);
    console.log('='.repeat(60));

    console.log('\n✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

// Run the update
updateFixtureVenues();
