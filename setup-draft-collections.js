#!/usr/bin/env node

/**
 * Setup Draft Collections Script
 * This script creates all necessary Firestore collections for the Draft system
 * Run with: node setup-draft-collections.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading serviceAccountKey.json:', error.message);
  console.error('Please ensure serviceAccountKey.json exists in the project root directory.');
  process.exit(1);
}

const db = admin.firestore();

async function setupDraftCollections() {
  try {
    console.log('🚀 Starting Draft Collections Setup...\n');

    // 1. Create draftSettings collection with initial document
    console.log('📝 Creating draftSettings collection...');
    await db.collection('draftSettings').doc('main').set({
      draftType: 'snake', // 'snake', 'linear', 'auction'
      draftOrder: 'random', // 'random', 'standings', 'manual'
      roundTime: 60, // seconds
      maxPlayersPerTeam: 8,
      autoAdvance: false,
      allowTrades: false,
      enforceFirstPickGenderRule: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log('✅ draftSettings collection created\n');

    // 2. Create draftTeams collection (empty, will be populated by admin)
    console.log('📝 Creating draftTeams collection...');
    await db.collection('draftTeams').doc('_placeholder').set({
      name: 'Placeholder',
      draftOrder: 0,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: 'system',
    });
    // Delete the placeholder
    await db.collection('draftTeams').doc('_placeholder').delete();
    console.log('✅ draftTeams collection created\n');

    // 3. Create draftPlayers collection (empty, will be populated by admin)
    console.log('📝 Creating draftPlayers collection...');
    await db.collection('draftPlayers').doc('_placeholder').set({
      name: 'Placeholder',
      gender: 'male',
      age: 0,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: 'system',
    });
    // Delete the placeholder
    await db.collection('draftPlayers').doc('_placeholder').delete();
    console.log('✅ draftPlayers collection created\n');

    // 4. Create draftState collection with initial document
    console.log('📝 Creating draftState collection...');
    await db.collection('draftState').doc('current').set({
      status: 'not_started', // 'not_started', 'active', 'paused', 'completed'
      currentRound: 0,
      currentPickNumber: 0,
      currentPickerTeamId: null,
      draftOrder: [],
      completedTeams: [],
      pendingApproval: {},
      showPickAnimation: {},
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log('✅ draftState collection created\n');

    // 5. Create teamSessions collection (empty, will be populated during draft)
    console.log('📝 Creating teamSessions collection...');
    await db.collection('teamSessions').doc('_placeholder').set({
      teamId: 'placeholder',
      sessionId: 'placeholder',
      createdAt: admin.firestore.Timestamp.now(),
    });
    // Delete the placeholder
    await db.collection('teamSessions').doc('_placeholder').delete();
    console.log('✅ teamSessions collection created\n');

    // 6. Create captainSettings collection with initial document
    console.log('📝 Creating captainSettings collection...');
    await db.collection('captainSettings').doc('main').set({
      // Structure: { [teamId]: { captainId: string, captainName: string } }
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log('✅ captainSettings collection created\n');

    // 7. Create ownerPlayerSettings collection with initial document
    console.log('📝 Creating ownerPlayerSettings collection...');
    await db.collection('ownerPlayerSettings').doc('main').set({
      // Structure: { [teamId]: { enabled: bool, playerId: string, playerName: string } }
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log('✅ ownerPlayerSettings collection created\n');

    console.log('✨ All Draft Collections Setup Complete!');
    console.log('\n📋 Collections Created:');
    console.log('  1. draftSettings (main document)');
    console.log('  2. draftTeams');
    console.log('  3. draftPlayers');
    console.log('  4. draftState (current document)');
    console.log('  5. teamSessions');
    console.log('  6. captainSettings (main document)');
    console.log('  7. ownerPlayerSettings (main document)');
    console.log('\n🔐 Firestore Rules have been updated in firestore.rules');
    console.log('📤 Deploy rules with: firebase deploy --only firestore:rules\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    process.exit(1);
  }
}

setupDraftCollections();
