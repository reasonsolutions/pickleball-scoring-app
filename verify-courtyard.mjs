#!/usr/bin/env node

import fetch from 'node-fetch';

async function verifyFixture() {
  try {
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch all fixtures and find Courtyard Crusaders
    const fixturesResponse = await fetch(`${baseUrl}/fixtures`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!fixturesResponse.ok) {
      throw new Error(`Failed to fetch fixtures: ${fixturesResponse.statusText}`);
    }

    const fixturesData = await fixturesResponse.json();
    const fixtureDocs = fixturesData.documents || [];
    
    // Find fixtures with Courtyard Crusaders
    const courtyard = fixtureDocs.filter(doc => {
      const team1Name = doc.fields?.team1Name?.stringValue;
      return team1Name === 'Courtyard Crusaders';
    });

    console.log(`Found ${courtyard.length} fixtures with Courtyard Crusaders\n`);
    
    courtyard.forEach((fixture, index) => {
      const fixtureId = fixture.name.split('/').pop();
      console.log(`Fixture ${index + 1}: ${fixtureId}`);
      console.log(`  Team1: ${fixture.fields?.team1Name?.stringValue}`);
      console.log(`  Team2: ${fixture.fields?.team2Name?.stringValue}`);
      console.log(`  Venue ID: ${fixture.fields?.venue?.stringValue || 'EMPTY'}`);
      console.log(`  Venue Name: ${fixture.fields?.venueName?.stringValue || 'EMPTY'}`);
      console.log();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyFixture();
