import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK with application default credentials
// Make sure you have GOOGLE_APPLICATION_CREDENTIALS environment variable set
// or run: gcloud auth application-default login

admin.initializeApp({
  projectId: 'pickleball-app-9ccf7'
});

const db = admin.firestore();

// Venue mapping for teams
const venueMapping = {
  '48': '48 PicklePark',
  'The Build Crew': 'Pro-touch Manikonda',
  'FALCONS': 'House of Play (HOP)',
  'Bend it Club': 'Bend it BNR Hills',
  'DRC Sports Foundation': 'Ready Set Pickle',
  'Jubilee Hills Pickleball Club': 'Pickleball Collective - DMart',
  'Penguin': 'Vanam',
  'TRP': 'The Rooftop Pickle (TRP)',
  'Racket Garden Academy': 'Racket Garden',
  'Paddock': 'Paddock - Rooftop Pickle',
  'Ye': 'Vanam',
  'Courtyard Crusaders': 'The Pickleball Courtyard',
  'Vikings Pickleball club': 'House of Play (HOP)',
  'SOO Collective': 'SOO Coffee and Pickleball',
  'Gladiators PC': 'Pick Paddlers',
  'Badgers': 'Softserve',
  'Deccan collective': 'Olympians arena , apollo hospital',
  'The PB Social': 'The Pickleball Social',
  'Pro-touch': 'Pro-touch Manikonda',
  'BELLEZZA': 'Lodha Bellezza'
};

async function addVenuesToTeams() {
  try {
    console.log('🚀 Starting to add venue field to teams...\n');
    
    const teamsSnapshot = await db.collection('teams').get();
    let updatedCount = 0;
    let notFoundCount = 0;
    const teamsList = [];

    console.log(`📊 Found ${teamsSnapshot.docs.length} teams in database\n`);

    for (const docSnapshot of teamsSnapshot.docs) {
      const team = docSnapshot.data();
      const teamName = team.name;
      const venue = venueMapping[teamName];

      teamsList.push({ 
        id: docSnapshot.id,
        name: teamName, 
        venue: venue || 'NOT FOUND' 
      });

      if (venue) {
        await docSnapshot.ref.update({
          venue: venue
        });
        console.log(`✅ Updated ${teamName} with venue: ${venue}`);
        updatedCount++;
      } else {
        console.log(`❌ No venue found for team: ${teamName}`);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount} teams`);
    console.log(`❌ Not found: ${notFoundCount} teams`);
    console.log(`📊 Total: ${teamsList.length} teams`);
    console.log('='.repeat(60) + '\n');

    if (notFoundCount > 0) {
      console.log('⚠️  Teams without venue mapping:');
      teamsList
        .filter(t => t.venue === 'NOT FOUND')
        .forEach(t => {
          console.log(`   - ${t.name}`);
        });
      console.log();
    }

    console.log('✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding venues:', error);
    process.exit(1);
  }
}

addVenuesToTeams();
