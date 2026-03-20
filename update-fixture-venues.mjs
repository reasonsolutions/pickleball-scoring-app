#!/usr/bin/env node

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const projectId = 'pickleball-app-9ccf7';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

/**
 * Fetch all fixtures from Firestore REST API with pagination
 */
async function getAllFixtures() {
  try {
    const fixtures = [];
    let pageToken = null;
    let pageCount = 0;

    do {
      pageCount++;
      const url = pageToken
        ? `${baseUrl}/fixtures?pageSize=1000&pageToken=${encodeURIComponent(pageToken)}`
        : `${baseUrl}/fixtures?pageSize=1000`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch fixtures: ${response.statusText}`);
      }

      const data = await response.json();
      const documents = data.documents || [];

      if (documents.length === 0) break;

      const pageFixtures = documents.map(doc => {
        const docId = doc.name.split('/').pop();
        const team1Field = doc.fields?.team1;
        const team1Value = team1Field?.stringValue || (team1Field?.referenceValue ? team1Field.referenceValue.split('/').pop() : '');
        
        return {
          id: docId,
          team1: team1Value,
          team1Name: doc.fields?.team1Name?.stringValue || '',
          venue: doc.fields?.venue?.stringValue || '',
          venueName: doc.fields?.venueName?.stringValue || '',
          rawFields: doc.fields
        };
      });

      fixtures.push(...pageFixtures);
      pageToken = data.nextPageToken;

      console.log(`   📄 Fetched page ${pageCount} (${documents.length} fixtures, total: ${fixtures.length})`);
    } while (pageToken);

    return fixtures;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
}

/**
 * Fetch a team by ID from Firestore REST API
 */
async function getTeamById(teamId) {
  try {
    const response = await fetch(`${baseUrl}/teams/${teamId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const doc = await response.json();
    return {
      id: teamId,
      venueId: doc.fields?.venueId?.stringValue || '',
      venue: doc.fields?.venue?.stringValue || ''
    };
  } catch (error) {
    console.error(`Error fetching team ${teamId}:`, error);
    return null;
  }
}

/**
 * Update fixture with venue information from team
 */
async function updateFixtureVenue(fixtureId, rawFields, venueId, venueName) {
  try {
    const updateUrl = `${baseUrl}/fixtures/${fixtureId}`;
    const updatePayload = {
      fields: {
        ...rawFields,
        venue: { stringValue: venueId || '' },
        venueName: { stringValue: venueName || '' }
      }
    };

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to update fixture: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating fixture ${fixtureId}:`, error);
    throw error;
  }
}

/**
 * Main function to process all fixtures
 */
async function processFixtures() {
  console.log('🚀 Starting fixture venue update process...\n');

  try {
    // Check Firebase CLI availability
    try {
      await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      console.error('Please install Firebase CLI: npm install -g firebase-tools');
      process.exit(1);
    }

    // Fetch all fixtures
    const fixtures = await getAllFixtures();
    console.log(`📋 Found ${fixtures.length} fixtures\n`);

    if (fixtures.length === 0) {
      console.log('✅ No fixtures to process');
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const updates = [];

    // Process each fixture
    for (const fixture of fixtures) {
      const { id, team1, team1Name } = fixture;

      // Skip if team1 is empty
      if (!team1 || (typeof team1 === 'string' && team1.trim() === '')) {
        console.log(`⏭️  Skipping fixture ${id} - team1 is empty`);
        skipCount++;
        continue;
      }

      try {
        // Fetch team data
        const team = await getTeamById(team1);

        if (!team) {
          console.log(`⚠️  Warning: Team ${team1} not found for fixture ${id}`);
          skipCount++;
          continue;
        }

        const { venueId, venue } = team;

        // Prepare update
        updates.push({
          fixtureId: id,
          team1Id: team1,
          team1Name: team1Name,
          oldVenue: fixture.venue || 'EMPTY',
          oldVenueName: fixture.venueName || 'EMPTY',
          newVenue: venueId || 'EMPTY',
          newVenueName: venue || 'EMPTY'
        });

        console.log(`📝 Fixture ${id} (${team1Name})`);
        console.log(`   Team ID: ${team1}`);
        console.log(`   Old Venue: "${fixture.venue}" / "${fixture.venueName}"`);
        console.log(`   New Venue: "${venueId}" / "${venue}"`);

        // Perform update
        await updateFixtureVenue(id, fixture.rawFields, venueId, venue);
        successCount++;
        console.log(`   ✅ Updated\n`);

      } catch (error) {
        console.error(`❌ Error processing fixture ${id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${fixtures.length}`);
    console.log('='.repeat(60));

    if (updates.length > 0) {
      console.log('\n📋 Update Details:');
      console.log(JSON.stringify(updates, null, 2));
    }

    // Exit with appropriate code
    if (errorCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
processFixtures().catch(error => {
  console.error('❌ Unhandled error:', error.message);
  console.error('\nMake sure you are logged in with Firebase CLI:');
  console.error('  firebase login');
  process.exit(1);
});
