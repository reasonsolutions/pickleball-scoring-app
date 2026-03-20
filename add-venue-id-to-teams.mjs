#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
}

// Find closest match using Levenshtein distance
function findClosestMatch(searchTerm, options, threshold = 3) {
  let closestMatch = null;
  let closestDistance = threshold;

  for (const option of options) {
    const distance = levenshteinDistance(
      searchTerm.toLowerCase(),
      option.toLowerCase()
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closestMatch = option;
    }
  }

  return closestMatch;
}

async function addVenueIdToTeams() {
  try {
    console.log('🚀 Starting to add venueId to teams...\n');
    
    // Check if Firebase CLI is available
    try {
      await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      console.error('Please install Firebase CLI: npm install -g firebase-tools');
      process.exit(1);
    }

    // Use Firestore REST API with Firebase CLI authentication
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch all venues
    console.log('📍 Fetching venues...');
    const venuesResponse = await fetch(`${baseUrl}/venues`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!venuesResponse.ok) {
      throw new Error(`Failed to fetch venues: ${venuesResponse.statusText}`);
    }

    const venuesData = await venuesResponse.json();
    const venueDocs = venuesData.documents || [];
    
    // Create a map of venue names to their document IDs
    const venueMap = {};
    const venueNames = [];
    venueDocs.forEach(doc => {
      const venueName = doc.fields?.name?.stringValue;
      const venueId = doc.name.split('/').pop();
      if (venueName) {
        venueMap[venueName] = venueId;
        venueNames.push(venueName);
      }
    });

    console.log(`✅ Found ${Object.keys(venueMap).length} venues\n`);
    console.log('Venue mapping:');
    Object.entries(venueMap).forEach(([name, id]) => {
      console.log(`  - ${name}: ${id}`);
    });
    console.log('\n');

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
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let forbiddenCount = 0;
    let fuzzyMatchCount = 0;
    const notFoundVenues = new Set();
    const fuzzyMatches = [];

    console.log(`✅ Found ${teamDocs.length} teams\n`);
    console.log('Processing teams:\n');

    // Process each team
    for (const doc of teamDocs) {
      const teamName = doc.fields?.name?.stringValue;
      const venueName = doc.fields?.venue?.stringValue;
      const teamId = doc.name.split('/').pop();

      if (!venueName) {
        console.log(`⚠️  Team "${teamName}" has no venue field, skipping...`);
        notFoundCount++;
        continue;
      }

      // Find exact match first
      let venueId = venueMap[venueName];
      let matchType = 'exact';

      // If no exact match, try fuzzy matching
      if (!venueId) {
        const closestMatch = findClosestMatch(venueName, venueNames);
        if (closestMatch) {
          venueId = venueMap[closestMatch];
          matchType = 'fuzzy';
          fuzzyMatches.push({
            team: teamName,
            original: venueName,
            matched: closestMatch
          });
        }
      }

      if (venueId) {
        // Update the team document with venueId field
        const updateUrl = `${baseUrl}/teams/${teamId}`;
        const updatePayload = {
          fields: {
            ...doc.fields,
            venueId: { stringValue: venueId }
          }
        };

        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
          if (matchType === 'fuzzy') {
            console.log(`✅ Updated "${teamName}" with venueId: ${venueId} (venue: "${venueName}" → "${fuzzyMatches[fuzzyMatches.length - 1].matched}") [FUZZY MATCH]`);
            fuzzyMatchCount++;
          } else {
            console.log(`✅ Updated "${teamName}" with venueId: ${venueId} (venue: ${venueName})`);
          }
          updatedCount++;
        } else if (updateResponse.status === 403) {
          console.log(`🔒 Permission denied for "${teamName}" (Forbidden)`);
          forbiddenCount++;
        } else {
          console.log(`❌ Failed to update "${teamName}": ${updateResponse.statusText}`);
          notFoundCount++;
        }
      } else {
        console.log(`❌ No matching venue found for team "${teamName}" (venue: "${venueName}")`);
        notFoundVenues.add(venueName);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total teams processed: ${teamDocs.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`   - Exact matches: ${updatedCount - fuzzyMatchCount}`);
    console.log(`   - Fuzzy matches: ${fuzzyMatchCount}`);
    console.log(`❌ Failed to match: ${notFoundCount}`);
    console.log(`🔒 Permission denied: ${forbiddenCount}`);

    if (fuzzyMatches.length > 0) {
      console.log('\n🔍 Fuzzy Matches Applied:');
      fuzzyMatches.forEach(match => {
        console.log(`  - "${match.team}": "${match.original}" → "${match.matched}"`);
      });
    }

    if (notFoundVenues.size > 0) {
      console.log('\n⚠️  Venues not found in database (even with fuzzy matching):');
      notFoundVenues.forEach(venue => {
        console.log(`  - "${venue}"`);
      });
    }

    console.log('\n✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

// Run the script
addVenueIdToTeams();
