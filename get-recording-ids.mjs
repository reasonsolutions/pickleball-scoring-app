import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account key
const serviceAccountPath = path.join(__dirname, 'functions', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pickleball-scoring-app.firebaseio.com'
});

const db = admin.firestore();

async function getRecordingIds() {
  try {
    console.log('Fetching all fixtures with recording IDs...\n');
    
    const fixturesSnapshot = await db.collection('fixtures')
      .where('recording_id', '!=', null)
      .get();
    
    if (fixturesSnapshot.empty) {
      console.log('No fixtures with recording IDs found.');
      process.exit(0);
    }
    
    console.log(`Found ${fixturesSnapshot.size} fixtures with recording IDs:\n`);
    console.log('='.repeat(100));
    
    const recordingIds = [];
    
    fixturesSnapshot.forEach(doc => {
      const data = doc.data();
      const recordingId = data.recording_id;
      const sessionId = data.session_id;
      const team1Name = data.team1Name || 'Unknown';
      const team2Name = data.team2Name || 'Unknown';
      const matchType = data.matchTypeLabel || data.matchType || 'Unknown';
      const date = data.date ? data.date.toDate().toLocaleDateString() : 'Unknown';
      
      recordingIds.push({
        fixtureId: doc.id,
        recording_id: recordingId,
        session_id: sessionId,
        team1: team1Name,
        team2: team2Name,
        matchType: matchType,
        date: date
      });
      
      console.log(`Fixture ID: ${doc.id}`);
      console.log(`  Recording ID: ${recordingId}`);
      console.log(`  Session ID: ${sessionId}`);
      console.log(`  Match: ${team1Name} vs ${team2Name}`);
      console.log(`  Type: ${matchType}`);
      console.log(`  Date: ${date}`);
      console.log('-'.repeat(100));
    });
    
    console.log('\n' + '='.repeat(100));
    console.log(`\nTotal Recording IDs: ${recordingIds.length}\n`);
    
    // Output as JSON for easy parsing
    console.log('JSON Format:');
    console.log(JSON.stringify(recordingIds, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error fetching recording IDs:', error);
    process.exit(1);
  }
}

getRecordingIds();
