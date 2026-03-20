#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Venue mapping for teams
const venueMapping = {
  '48': '48 PicklePark',
  '48 Pickle Club': '48 PicklePark',
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

async function getFirebaseToken() {
  try {
    const { stdout } = await execAsync('firebase auth:export /dev/stdout --project pickleball-app-9ccf7 2>/dev/null || echo ""');
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

async function addVenuesToTeams() {
  try {
    console.log('🚀 Starting to add venue field to teams...\n');
    
    // Get Firebase ID token from CLI
    let token = null;
    try {
      const { stdout } = await execAsync('firebase --version');
      console.log('✅ Firebase CLI is available\n');
    } catch (error) {
      console.error('❌ Firebase CLI not found');
      process.exit(1);
    }

    // Use Firestore REST API with Firebase CLI credentials
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch teams using REST API
    const response = await fetch(`${baseUrl}/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const data = await response.json();
    const documents = data.documents || [];
    
    let updatedCount = 0;
    let notFoundCount = 0;
    const teamsList = [];

    console.log(`📊 Found ${documents.length} teams in database\n`);

    for (const doc of documents) {
      const teamName = doc.fields?.name?.stringValue;
      const docId = doc.name.split('/').pop();
      const venue = venueMapping[teamName];

      teamsList.push({ 
        id: docId,
        name: teamName, 
        venue: venue || 'NOT FOUND' 
      });

      if (venue) {
        // Update the document with venue field
        const updateUrl = `${baseUrl}/teams/${docId}`;
        const updatePayload = {
          fields: {
            ...doc.fields,
            venue: { stringValue: venue }
          }
        };

        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
          console.log(`✅ Updated ${teamName} with venue: ${venue}`);
          updatedCount++;
        } else {
          console.log(`⚠️  Failed to update ${teamName}: ${updateResponse.statusText}`);
        }
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
    console.log(`📊 Total: ${documents.length} teams`);
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
    console.error('❌ Error adding venues:', error.message);
    console.error('\nMake sure you are logged in with Firebase CLI:');
    console.error('  firebase login');
    process.exit(1);
  }
}

addVenuesToTeams();
