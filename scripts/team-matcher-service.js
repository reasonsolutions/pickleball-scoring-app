/**
 * Team Matcher Service
 * Handles matching teams from hpl-clubs collection with teams collection
 */

/**
 * Normalize team names for matching
 * @param {string} name - Team name to normalize
 * @returns {string} Normalized team name
 */
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Fetch active teams from hpl-clubs collection
 * @param {admin.firestore.Firestore} db - Firestore database instance
 * @returns {Promise<Map>} Map of normalized names to hpl-clubs data
 */
export async function fetchActiveHplClubs(db) {
  console.log('📥 Fetching active teams from hpl-clubs collection...');
  
  const hplClubsSnapshot = await db.collection('hpl-clubs')
    .where('isActive', '==', true)
    .get();

  if (hplClubsSnapshot.empty) {
    console.log('⚠ No active teams found in hpl-clubs collection\n');
    return new Map();
  }

  const hplClubsMap = new Map();

  hplClubsSnapshot.forEach(doc => {
    const data = doc.data();
    const clubName = data.proposedClubName || data.teamName || data.name || '';
    const normalizedName = normalizeTeamName(clubName);

    if (normalizedName) {
      hplClubsMap.set(normalizedName, {
        id: doc.id,
        clubName: clubName,
        isActive: data.isActive,
        ...data
      });
    }
  });

  console.log(`✓ Found ${hplClubsMap.size} active teams in hpl-clubs\n`);
  return hplClubsMap;
}

/**
 * Fetch all teams from teams collection
 * @param {admin.firestore.Firestore} db - Firestore database instance
 * @returns {Promise<Array>} Array of team documents
 */
export async function fetchAllTeams(db) {
  console.log('📥 Fetching teams from teams collection...');
  
  const teamsSnapshot = await db.collection('teams').get();

  if (teamsSnapshot.empty) {
    console.log('⚠ No teams found in teams collection\n');
    return [];
  }

  console.log(`✓ Found ${teamsSnapshot.size} teams\n`);
  return teamsSnapshot.docs;
}

/**
 * Match a single team with hpl-clubs
 * @param {string} teamName - Team name to match
 * @param {Map} hplClubsMap - Map of normalized names to hpl-clubs data
 * @returns {Object|null} Matching hpl-club data or null
 */
function matchTeamWithHplClub(teamName, hplClubsMap) {
  const normalizedTeamName = normalizeTeamName(teamName);

  // Try exact match first
  let match = hplClubsMap.get(normalizedTeamName);

  // If no exact match, try partial matching
  if (!match) {
    for (const [normalizedHplName, hplData] of hplClubsMap.entries()) {
      if (normalizedTeamName.includes(normalizedHplName) || 
          normalizedHplName.includes(normalizedTeamName)) {
        match = hplData;
        break;
      }
    }
  }

  return match;
}

/**
 * Match teams and update with hpl-clubs ID
 * @param {admin.firestore.Firestore} db - Firestore database instance
 * @param {Array} teamDocs - Array of team documents
 * @param {Map} hplClubsMap - Map of normalized names to hpl-clubs data
 * @returns {Promise<Object>} Matching results summary
 */
export async function matchAndUpdateTeams(db, teamDocs, hplClubsMap) {
  console.log('🔄 Matching teams and updating with hpl-clubs IDs...\n');

  const results = {
    matched: [],
    unmatched: [],
    failed: [],
    totalProcessed: teamDocs.length
  };

  for (const teamDoc of teamDocs) {
    const teamData = teamDoc.data();
    const teamId = teamDoc.id;
    const teamName = teamData.name || teamData.teamName || '';

    const hplClubMatch = matchTeamWithHplClub(teamName, hplClubsMap);

    if (hplClubMatch) {
      try {
        // Update the team document with hplClubId
        await db.collection('teams').doc(teamId).update({
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

  return results;
}

/**
 * Print matching results summary
 * @param {Object} results - Matching results from matchAndUpdateTeams
 */
export function printResultsSummary(results) {
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
}
