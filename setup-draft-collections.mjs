#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

async function setupDraftCollections() {
  try {
    console.log('🚀 Starting Draft Collections Setup...\n');
    
    // Check if Firebase CLI is available
    try {
      const { stdout } = await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      console.error('Please install Firebase CLI: npm install -g firebase-tools');
      console.error('Then login: firebase login');
      process.exit(1);
    }

    // Use Firestore REST API
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // 1. Create draftSettings collection with initial document
    console.log('📝 Creating draftSettings collection...');
    const draftSettingsUrl = `${baseUrl}/draftSettings/main`;
    const draftSettingsPayload = {
      fields: {
        draftType: { stringValue: 'snake' },
        draftOrder: { stringValue: 'random' },
        roundTime: { integerValue: '60' },
        maxPlayersPerTeam: { integerValue: '8' },
        autoAdvance: { booleanValue: false },
        allowTrades: { booleanValue: false },
        enforceFirstPickGenderRule: { booleanValue: false },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    let response = await fetch(draftSettingsUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftSettingsPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create draftSettings: ${response.statusText}`);
    }
    console.log('✅ draftSettings collection created\n');

    // 2. Create draftTeams collection (empty, will be populated by admin)
    console.log('📝 Creating draftTeams collection...');
    const draftTeamsUrl = `${baseUrl}/draftTeams/_placeholder`;
    const draftTeamsPayload = {
      fields: {
        name: { stringValue: 'Placeholder' },
        draftOrder: { integerValue: '0' },
        createdAt: { timestampValue: new Date().toISOString() },
        createdBy: { stringValue: 'system' }
      }
    };

    response = await fetch(draftTeamsUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftTeamsPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create draftTeams: ${response.statusText}`);
    }

    // Delete the placeholder
    response = await fetch(draftTeamsUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete draftTeams placeholder: ${response.statusText}`);
    }
    console.log('✅ draftTeams collection created\n');

    // 3. Create draftPlayers collection (empty, will be populated by admin)
    console.log('📝 Creating draftPlayers collection...');
    const draftPlayersUrl = `${baseUrl}/draftPlayers/_placeholder`;
    const draftPlayersPayload = {
      fields: {
        name: { stringValue: 'Placeholder' },
        gender: { stringValue: 'male' },
        age: { integerValue: '0' },
        createdAt: { timestampValue: new Date().toISOString() },
        createdBy: { stringValue: 'system' }
      }
    };

    response = await fetch(draftPlayersUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftPlayersPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create draftPlayers: ${response.statusText}`);
    }

    // Delete the placeholder
    response = await fetch(draftPlayersUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete draftPlayers placeholder: ${response.statusText}`);
    }
    console.log('✅ draftPlayers collection created\n');

    // 4. Create draftState collection with initial document
    console.log('📝 Creating draftState collection...');
    const draftStateUrl = `${baseUrl}/draftState/current`;
    const draftStatePayload = {
      fields: {
        status: { stringValue: 'not_started' },
        currentRound: { integerValue: '0' },
        currentPickNumber: { integerValue: '0' },
        currentPickerTeamId: { nullValue: null },
        draftOrder: { arrayValue: { values: [] } },
        completedTeams: { arrayValue: { values: [] } },
        pendingApproval: { mapValue: { fields: {} } },
        showPickAnimation: { mapValue: { fields: {} } },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    response = await fetch(draftStateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftStatePayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create draftState: ${response.statusText}`);
    }
    console.log('✅ draftState collection created\n');

    // 5. Create teamSessions collection (empty, will be populated during draft)
    console.log('📝 Creating teamSessions collection...');
    const teamSessionsUrl = `${baseUrl}/teamSessions/_placeholder`;
    const teamSessionsPayload = {
      fields: {
        teamId: { stringValue: 'placeholder' },
        sessionId: { stringValue: 'placeholder' },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    response = await fetch(teamSessionsUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teamSessionsPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create teamSessions: ${response.statusText}`);
    }

    // Delete the placeholder
    response = await fetch(teamSessionsUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete teamSessions placeholder: ${response.statusText}`);
    }
    console.log('✅ teamSessions collection created\n');

    // 6. Create captainSettings collection with initial document
    console.log('📝 Creating captainSettings collection...');
    const captainSettingsUrl = `${baseUrl}/captainSettings/main`;
    const captainSettingsPayload = {
      fields: {
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    response = await fetch(captainSettingsUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(captainSettingsPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create captainSettings: ${response.statusText}`);
    }
    console.log('✅ captainSettings collection created\n');

    // 7. Create ownerPlayerSettings collection with initial document
    console.log('📝 Creating ownerPlayerSettings collection...');
    const ownerPlayerSettingsUrl = `${baseUrl}/ownerPlayerSettings/main`;
    const ownerPlayerSettingsPayload = {
      fields: {
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    response = await fetch(ownerPlayerSettingsUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ownerPlayerSettingsPayload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create ownerPlayerSettings: ${response.statusText}`);
    }
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
    console.error('❌ Error setting up collections:', error.message);
    console.error('\nMake sure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

setupDraftCollections();
