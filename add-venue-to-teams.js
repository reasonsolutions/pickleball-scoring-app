import admin from 'firebase-admin';

// Initialize Firebase Admin with default credentials
admin.initializeApp({
  projectId: 'pickleball-app-9ccf7'
});

const db = admin.firestore();

// Venue mapping for teams - exact names from database
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
    console.log('Starting to add venue field to teams...');
    
    const teamsSnapshot = await db.collection('teams').get();
    let updatedCount = 0;
    let notFoundCount = 0;
    const teamsList = [];
    
    for (const doc of teamsSnapshot.docs) {
      const team = doc.data();
      const teamName = team.name;
      const venue = venueMapping[teamName];
      
      teamsList.push({ name: teamName, venue: venue || 'NOT FOUND' });
      
      if (venue) {
        await doc.ref.update({
          venue: venue
        });
        console.log(`✓ Updated ${teamName} with venue: ${venue}`);
        updatedCount++;
      } else {
        console.log(`✗ No venue found for team: ${teamName}`);
        notFoundCount++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`Updated: ${updatedCount} teams`);
    console.log(`Not found: ${notFoundCount} teams`);
    console.log('\nTeams and Venues:');
    teamsList.forEach(t => {
      console.log(`${t.name} -> ${t.venue}`);
    });
    console.log('Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding venues:', error);
    process.exit(1);
  }
}

addVenuesToTeams();
