#!/usr/bin/env node

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Verify Firebase service account file exists
 */
function verifyServiceAccountFile() {
  log('blue', '\n📋 Checking Firebase Service Account File...');
  
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json';
  
  if (!fs.existsSync(serviceAccountPath)) {
    log('red', `❌ Service account file not found at: ${serviceAccountPath}`);
    log('yellow', '\n📝 To fix this:');
    log('yellow', '1. Go to Firebase Console: https://console.firebase.google.com/');
    log('yellow', '2. Select project: pickleball-app-9ccf7');
    log('yellow', '3. Click gear icon → Project Settings → Service Accounts');
    log('yellow', '4. Click "Generate New Private Key"');
    log('yellow', '5. Save as firebase-service-account.json in project root');
    return false;
  }
  
  log('green', `✅ Service account file found at: ${serviceAccountPath}`);
  return true;
}

/**
 * Verify Firebase Admin SDK initialization
 */
async function verifyFirebaseConnection() {
  log('blue', '\n🔗 Checking Firebase Connection...');
  
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json';
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'pickleball-app-9ccf7'
    });
    
    log('green', '✅ Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    log('red', `❌ Failed to initialize Firebase: ${error.message}`);
    return false;
  }
}

/**
 * Verify Firestore collections exist
 */
async function verifyCollections() {
  log('blue', '\n📚 Checking Firestore Collections...');
  
  const db = admin.firestore();
  
  try {
    // Check fixtures collection
    const fixturesSnapshot = await db.collection('fixtures').limit(1).get();
    const fixturesCount = (await db.collection('fixtures').count().get()).data().count;
    log('green', `✅ Fixtures collection exists (${fixturesCount} documents)`);
    
    // Check teams collection
    const teamsSnapshot = await db.collection('teams').limit(1).get();
    const teamsCount = (await db.collection('teams').count().get()).data().count;
    log('green', `✅ Teams collection exists (${teamsCount} documents)`);
    
    return { fixtures: fixturesCount, teams: teamsCount };
  } catch (error) {
    log('red', `❌ Failed to access collections: ${error.message}`);
    return null;
  }
}

/**
 * Verify fixture structure
 */
async function verifyFixtureStructure() {
  log('blue', '\n🔍 Checking Fixture Structure...');
  
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection('fixtures').limit(1).get();
    
    if (snapshot.empty) {
      log('yellow', '⚠️  No fixtures found to verify structure');
      return false;
    }
    
    const fixture = snapshot.docs[0].data();
    const requiredFields = ['team1', 'team1Name', 'venue', 'venueName'];
    const missingFields = requiredFields.filter(field => !(field in fixture));
    
    if (missingFields.length > 0) {
      log('yellow', `⚠️  Missing fields in fixture: ${missingFields.join(', ')}`);
      return false;
    }
    
    log('green', '✅ Fixture structure is valid');
    log('cyan', `   Sample fixture ID: ${snapshot.docs[0].id}`);
    log('cyan', `   team1: ${fixture.team1 || '(empty)'}`);
    log('cyan', `   team1Name: ${fixture.team1Name || '(empty)'}`);
    log('cyan', `   venue: ${fixture.venue || '(empty)'}`);
    log('cyan', `   venueName: ${fixture.venueName || '(empty)'}`);
    
    return true;
  } catch (error) {
    log('red', `❌ Failed to verify fixture structure: ${error.message}`);
    return false;
  }
}

/**
 * Verify team structure
 */
async function verifyTeamStructure() {
  log('blue', '\n🔍 Checking Team Structure...');
  
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection('teams').limit(1).get();
    
    if (snapshot.empty) {
      log('yellow', '⚠️  No teams found to verify structure');
      return false;
    }
    
    const team = snapshot.docs[0].data();
    const requiredFields = ['venue', 'venueName'];
    const missingFields = requiredFields.filter(field => !(field in team));
    
    if (missingFields.length > 0) {
      log('yellow', `⚠️  Missing fields in team: ${missingFields.join(', ')}`);
      return false;
    }
    
    log('green', '✅ Team structure is valid');
    log('cyan', `   Sample team ID: ${snapshot.docs[0].id}`);
    log('cyan', `   name: ${team.name || '(empty)'}`);
    log('cyan', `   venue: ${team.venue || '(empty)'}`);
    log('cyan', `   venueName: ${team.venueName || '(empty)'}`);
    
    return true;
  } catch (error) {
    log('red', `❌ Failed to verify team structure: ${error.message}`);
    return false;
  }
}

/**
 * Check for fixtures that need updating
 */
async function checkFixturesToUpdate() {
  log('blue', '\n📊 Analyzing Fixtures for Updates...');
  
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection('fixtures').get();
    
    let emptyVenueCount = 0;
    let emptyTeam1Count = 0;
    let validFixtures = 0;
    
    snapshot.forEach(doc => {
      const fixture = doc.data();
      
      if (!fixture.team1 || fixture.team1.trim() === '') {
        emptyTeam1Count++;
      } else if (!fixture.venue || fixture.venue.trim() === '') {
        emptyVenueCount++;
      } else {
        validFixtures++;
      }
    });
    
    log('cyan', `   Total fixtures: ${snapshot.size}`);
    log('yellow', `   Fixtures with empty team1: ${emptyTeam1Count}`);
    log('yellow', `   Fixtures with empty venue: ${emptyVenueCount}`);
    log('green', `   Fixtures with venue already set: ${validFixtures}`);
    
    if (emptyVenueCount > 0) {
      log('green', `\n✅ Found ${emptyVenueCount} fixtures that need venue updates`);
    } else {
      log('yellow', '\n⚠️  No fixtures with empty venues found');
    }
    
    return emptyVenueCount > 0;
  } catch (error) {
    log('red', `❌ Failed to analyze fixtures: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  log('cyan', '\n╔════════════════════════════════════════════════════════╗');
  log('cyan', '║   Fixture Venues Update Script - Setup Verification    ║');
  log('cyan', '╚════════════════════════════════════════════════════════╝');
  
  let allChecksPass = true;
  
  // Check 1: Service account file
  if (!verifyServiceAccountFile()) {
    allChecksPass = false;
  }
  
  // Check 2: Firebase connection
  if (!await verifyFirebaseConnection()) {
    allChecksPass = false;
  }
  
  if (!allChecksPass) {
    log('red', '\n❌ Setup verification failed. Please fix the issues above.');
    process.exit(1);
  }
  
  // Check 3: Collections
  const collectionCounts = await verifyCollections();
  if (!collectionCounts) {
    allChecksPass = false;
  }
  
  // Check 4: Fixture structure
  if (!await verifyFixtureStructure()) {
    allChecksPass = false;
  }
  
  // Check 5: Team structure
  if (!await verifyTeamStructure()) {
    allChecksPass = false;
  }
  
  // Check 6: Fixtures to update
  const hasFixturesToUpdate = await checkFixturesToUpdate();
  
  // Summary
  log('cyan', '\n╔════════════════════════════════════════════════════════╗');
  
  if (allChecksPass && hasFixturesToUpdate) {
    log('green', '║          ✅ All checks passed! Ready to run.           ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
    log('green', '\n🚀 You can now run: node update-fixture-venues.mjs');
  } else if (allChecksPass && !hasFixturesToUpdate) {
    log('yellow', '║     ⚠️  All checks passed, but no updates needed.      ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
  } else {
    log('red', '║          ❌ Some checks failed. See above.             ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run verification
runVerification().catch(error => {
  log('red', `\n❌ Verification failed: ${error.message}`);
  process.exit(1);
});
