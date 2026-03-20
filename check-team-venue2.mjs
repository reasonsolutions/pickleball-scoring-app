#!/usr/bin/env node

import fetch from 'node-fetch';

async function checkTeamVenue() {
  try {
    const projectId = 'pickleball-app-9ccf7';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Fetch the specific team
    const teamId = 'HyoctfXg9SU4TouFPyOh';
    const teamResponse = await fetch(`${baseUrl}/teams/${teamId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!teamResponse.ok) {
      throw new Error(`Failed to fetch team: ${teamResponse.statusText}`);
    }

    const teamData = await teamResponse.json();
    console.log('Team Data:');
    console.log(JSON.stringify(teamData, null, 2));
    
    console.log('\n\nVenue Information:');
    console.log('venueId:', teamData.fields?.venueId?.stringValue || 'NOT SET');
    console.log('venue:', teamData.fields?.venue?.stringValue || 'NOT SET');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTeamVenue();
