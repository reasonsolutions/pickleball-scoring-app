import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFO4nUrgpBBydJoim9HFBLAOan94Bg7Fw",
  authDomain: "pickleball-app-9ccf7.firebaseapp.com",
  projectId: "pickleball-app-9ccf7",
  storageBucket: "pickleball-app-9ccf7.firebasestorage.app",
  messagingSenderId: "248577092150",
  appId: "1:248577092150:web:fb1415679f016111c2c697",
  measurementId: "G-6FRPZQJQ3B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Calculates similarity between two strings using Levenshtein distance
 * Returns a score between 0 and 1 (1 = exact match, 0 = completely different)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Levenshtein distance
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function getEditDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Updates team logos from hpl-clubs format to teams collection format
 * Uses fuzzy matching to find similar team names
 * 
 * From hpl-clubs format:
 * {
 *   publicId: "pickleball_app/team_logos/...",
 *   public_id: "pickleball_app/team_logos/...",
 *   secure_url: "https://...",
 *   url: "https://..."
 * }
 * 
 * To teams format:
 * {
 *   publicId: "pickleball_app/team_logos/...",
 *   url: "https://..."
 * }
 */
async function updateTeamLogos() {
  try {
    console.log('Starting team logo update process with fuzzy matching...\n');

    // Get all teams
    const teamsRef = collection(db, 'teams');
    const teamsSnapshot = await getDocs(teamsRef);

    if (teamsSnapshot.empty) {
      console.log('No teams found in the database.');
      return;
    }

    console.log(`Found ${teamsSnapshot.size} teams. Processing...\n`);

    // Get all hpl-clubs
    const hplClubsRef = collection(db, 'hpl-clubs');
    const hplClubsSnapshot = await getDocs(hplClubsRef);
    
    // Create a mapping of club names to logos using proposedClubName
    const clubLogoMap = {};
    hplClubsSnapshot.forEach(doc => {
      const clubData = doc.data();
      const clubName = clubData.proposedClubName;
      
      if (clubData.teamLogo && clubName) {
        clubLogoMap[clubName] = {
          clubId: doc.id,
          originalName: clubName,
          logo: clubData.teamLogo
        };
      }
    });

    console.log(`Found ${Object.keys(clubLogoMap).length} clubs with logos.\n`);
    console.log('Club names in hpl-clubs:', Object.keys(clubLogoMap), '\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Process each team
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const teamName = teamData.name || '';

      // Find the best matching club using fuzzy matching
      let bestMatch = null;
      let bestScore = 0.6; // Minimum similarity threshold (60%)

      for (const [clubName, clubInfo] of Object.entries(clubLogoMap)) {
        const similarity = calculateSimilarity(teamName, clubName);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = clubInfo;
        }
      }

      if (bestMatch) {
        // Transform the logo format
        const updatedLogo = {
          publicId: bestMatch.logo.publicId || bestMatch.logo.public_id,
          url: bestMatch.logo.secure_url || bestMatch.logo.url
        };

        try {
          // Update the team document
          await updateDoc(doc(db, 'teams', teamId), {
            logo: updatedLogo
          });

          console.log(`✓ Updated: ${teamName} (${teamId})`);
          console.log(`  - Matched with: ${bestMatch.originalName} (similarity: ${(bestScore * 100).toFixed(1)}%)`);
          console.log(`  - Club ID: ${bestMatch.clubId}`);
          console.log(`  - publicId: ${updatedLogo.publicId}`);
          console.log(`  - url: ${updatedLogo.url}\n`);
          updatedCount++;
        } catch (error) {
          console.error(`✗ Failed to update ${teamName}: ${error.message}\n`);
          failedCount++;
        }
      } else {
        console.log(`⊘ Skipped: ${teamName} (${teamId}) - No matching club found in hpl-clubs\n`);
        skippedCount++;
      }
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`Total teams processed: ${teamsSnapshot.size}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no matching club): ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('=============================\n');

  } catch (error) {
    console.error('Error updating team logos:', error);
    process.exit(1);
  }
}

// Run the script
updateTeamLogos().then(() => {
  console.log('Team logo update completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
