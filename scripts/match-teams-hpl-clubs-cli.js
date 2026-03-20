#!/usr/bin/env node

/**
 * Match Teams with HPL Clubs Script (Firebase CLI Version)
 * 
 * This script matches active teams from the hpl-clubs collection with teams
 * in the teams collection and adds the hplClubId field to matched teams.
 * 
 * Usage:
 *   node scripts/match-teams-hpl-clubs-cli.js
 * 
 * Requirements:
 *   - Firebase CLI installed and authenticated (firebase login)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Normalize team names for matching
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('TEAM MATCHING WITH HPL CLUBS (Firebase CLI)');
    console.log('='.repeat(70) + '\n');

    // Fetch active hpl-clubs
    console.log('📥 Fetching active teams from hpl-clubs collection...');
    const hplClubsJson = execSync(
      'firebase firestore:get hpl-clubs --recursive --pretty 2>/dev/null || echo "[]"',
      { encoding: 'utf-8' }
    );

    let hplClubsDocs = [];
    try {
      const parsed = JSON.parse(hplClubsJson);
      hplClubsDocs = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    } catch (e) {
      console.log('⚠ Could not parse hpl-clubs data');
    }

    // Filter active clubs and create map
    const hplClubsMap = new Map();
    hplClubsDocs.forEach(doc => {
      const data = doc.fields || doc;
      if (data.isActive?.booleanValue === true || data.isActive === true) {
        const clubName = data.proposedClubName?.stringValue || data.proposedClubName || 
                        data.teamName?.stringValue || data.teamName || 
                        data.name?.stringValue || data.name || '';
        const normalizedName = normalizeTeamName(clubName);

        if (normalizedName) {
          hplClubsMap.set(normalizedName, {
            id: doc.name?.split('/').pop() || doc.id,
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
    const teamsJson = execSync(
      'firebase firestore:get teams --recursive --pretty 2>/dev/null || echo "[]"',
      { encoding: 'utf-8' }
    );

    let teamsDocs = [];
    try {
      const parsed = JSON.parse(teamsJson);
      teamsDocs = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    } catch (e) {
      console.log('⚠ Could not parse teams data');
    }

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
      const teamData = teamDoc.fields || teamDoc;
      const teamId = teamDoc.name?.split('/').pop() || teamDoc.id;
      const teamName = teamData.name?.stringValue || teamData.name || 
                      teamData.teamName?.stringValue || teamData.teamName || '';

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
          // Update the team document with hplClubId using Firebase CLI
          execSync(
            `firebase firestore:set teams/${teamId} '{"hplClubId":"${hplClubMatch.id}"}' --merge 2>/dev/null`,
            { encoding: 'utf-8' }
          );

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
