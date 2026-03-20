#!/usr/bin/env node

import fetch from 'node-fetch';

async function verifyFixture() {
  try {
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch the specific fixture
    const fixtureId = '743dmNbLOteqQFVGlSgo';
    const fixtureResponse = await fetch(`${baseUrl}/fixtures/${fixtureId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!fixtureResponse.ok) {
      throw new Error(`Failed to fetch fixture: ${fixtureResponse.statusText}`);
    }

    const fixtureData = await fixtureResponse.json();
    console.log('Fixture Data:');
    console.log(JSON.stringify(fixtureData, null, 2));
    
    console.log('\n\nVenue Information:');
    console.log('venue:', fixtureData.fields?.venue?.stringValue || 'NOT SET');
    console.log('venueName:', fixtureData.fields?.venueName?.stringValue || 'NOT SET');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyFixture();
