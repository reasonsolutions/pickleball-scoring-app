#!/usr/bin/env node

/**
 * Match Teams with HPL Clubs Script (Firebase REST API Version)
 * 
 * This script matches active teams from the hpl-clubs collection with teams
 * in the teams collection and adds the hplClubId field to matched teams.
 * 
 * Usage:
 *   node scripts/match-teams-hpl-clubs-rest.js
 * 
 * Requirements:
 *   - Firebase project configured in firebase.json
 *   - Network access to Firebase Firestore
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'pickleball-app-9ccf7';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get ID token from Firebase CLI
function getIdToken() {
  try {
    const configPath = `${process.env.HOME}/.config/firebase/tokens.json`;
    if (fs.existsSync(configPath)) {
      const tokens = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return tokens[PROJECT_ID]?.access_token || null;
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Normalize team names for matching
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Extract value from Firestore document field
function extractValue(field) {
  if (!field) return null;
  if (field.stringValue) return field.stringValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.integerValue) return parseInt(field.integerValue);
  if (field.doubleValue) return parseFloat(field.doubleValue);
  return null;
}

// Fetch documents from Firestore
async function fetchCollection(collectionName) {
  try {
    const url = `${FIRESTORE_API}/${collectionName}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error.message);
    return [];
  }
}

// Update document in Firestore
async function updateDocument(collectionName, docId, updates) {
  try {
    const url = `${FIRESTORE_API}/${collectionName}/${docId}`;
    
    const fields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (typeof value === 'number') {
        fields[key] = { integerValue: String(value) };
      }
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: fields
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating ${collectionName}/${docId}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('TEAM MATCHING WITH HPL CLUBS (Firebase REST API)');
    console.log('='.repeat(70) + '\n');

    // Fetch active hpl-clubs
    console.log('📥 Fetching active teams from hpl-clubs collection...');
    const hplClubsDocs = await fetchCollection('hpl-clubs');

    // Filter active clubs and create map
    const hplClubsMap = new Map();
    hplClubsDocs.forEach(doc => {
      const fields = doc.fields || {};
      const isActive = extractValue(fields.isActive);
      
      if (isActive === true) {
        const clubName = extractValue(fields.proposedClubName) || 
                        extractValue(fields.teamName) || 
                        extractValue(fields.name) || '';
        const normalizedName = normalizeTeamName(clubName);
        const docId = doc.name?.split('/').pop();

        if (normalizedName && docId) {
          hplClubsMap.set(normalizedName, {
            id: docId,
            clubName: clubName,
            isActive: true
          });
        }
      }
    });

    console.log(`✓ Found ${hplClubsMap.size} active teams in hpl-clubs\n`);

    if (hplClubsMap.size === 0) {
      console.log('No active clubs to match against. Exiting.\n');
      process.exit(0);
    }

    // Fetch all teams
    console.log('📥 Fetching teams from teams collection...');
    const teamsDocs = await fetchCollection('teams');

    console.log(`✓ Found ${teamsDocs.length} teams\n`);

    if (teamsDocs.length === 0) {
      console.log('No teams to process. Exiting.\n');
      process.exit(0);
    }

    // Match and update teams
    console.log('🔄 Matching teams and updating with hpl-clubs IDs...\n');

    const results = {
      matched: [],
      unmatched: [],
      failed: [],
      totalProcessed: teamsDocs.length
    };

    for (const teamDoc of teamsDocs) {
      const fields = teamDoc.fields || {};
      const teamId = teamDoc.name?.split('/').pop();
      const teamName = extractValue(fields.name) || 
                      extractValue(fields.teamName) || '';

      if (!teamId) continue;

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
        const updated = await updateDocument('teams', teamId, {
          hplClubId: hplClubMatch.id
        });

        if (updated) {
          results.matched.push({
            teamId,
            teamName,
            hplClubId: hplClubMatch.id,
            hplClubName: hplClubMatch.clubName
          });

          console.log(`✓ Matched: "${teamName}" → "${hplClubMatch.clubName}"`);
          console.log(`  Team ID: ${teamId}`);
          console.log(`  HPL Club ID: ${hplClubMatch.id}\n`);
        } else {
          results.failed.push({
            teamId,
            teamName,
            error: 'Update failed'
          });

          console.error(`✗ Failed to update "${teamName}"\n`);
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
