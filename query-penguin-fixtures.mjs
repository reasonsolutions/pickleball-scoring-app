import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./functions/serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pickleball-scoring-app.firebaseio.com'
});

const db = admin.firestore();

async function countPenguinFixtures() {
  try {
    const snapshot = await db.collection('fixtures')
      .where('Team1', '==', 'Penguin')
      .get();
    
    console.log(`\nTotal fixtures with Penguin as Team1: ${snapshot.size}`);
    
    // Show details of each fixture
    if (snapshot.size > 0) {
      console.log('\nFixture Details:');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Team1: ${data.Team1}`);
        console.log(`  Team2: ${data.Team2}`);
        console.log(`  Date: ${data.Date || 'N/A'}`);
        console.log(`  Venue: ${data.Venue || 'N/A'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error querying fixtures:', error);
    process.exit(1);
  }
}

countPenguinFixtures();
