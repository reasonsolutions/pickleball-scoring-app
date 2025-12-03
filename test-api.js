// Test script for the Pickleball Match REST API
// Run with: node test-api.js

const BASE_URL = 'https://us-central1-pickleball-app-9ccf7.cloudfunctions.net';

// Test function to make API calls
async function testAPI() {
  console.log('🏓 Testing Pickleball Match REST API\n');

  // Test 1: Get all matches
  console.log('1. Testing GET /getMatches');
  try {
    const response = await fetch(`${BASE_URL}/getMatches`);
    const data = await response.json();
    console.log('✅ Success:', JSON.stringify(data, null, 2));
    
    // If we have matches, test with the first match ID
    if (data.matches && data.matches.length > 0) {
      const testMatchId = data.matches[0].matchId;
      console.log(`\nUsing match ID: ${testMatchId} for further tests\n`);
      
      // Test 2: Get complete match data
      console.log('2. Testing GET /getMatch/{matchId}');
      try {
        const matchResponse = await fetch(`${BASE_URL}/getMatch/${testMatchId}`);
        const matchData = await matchResponse.json();
        console.log('✅ Success:', JSON.stringify(matchData, null, 2));
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      // Test 3: Get match score
      console.log('\n3. Testing GET /getMatchScore/{matchId}');
      try {
        const scoreResponse = await fetch(`${BASE_URL}/getMatchScore/${testMatchId}`);
        const scoreData = await scoreResponse.json();
        console.log('✅ Success:', JSON.stringify(scoreData, null, 2));
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      // Test 4: Get match events
      console.log('\n4. Testing GET /getMatchEvents/{matchId}');
      try {
        const eventsResponse = await fetch(`${BASE_URL}/getMatchEvents/${testMatchId}`);
        const eventsData = await eventsResponse.json();
        console.log('✅ Success:', JSON.stringify(eventsData, null, 2));
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      // Test 5: Legacy endpoint
      console.log('\n5. Testing Legacy GET /getMatchData (basic-score format)');
      try {
        const legacyResponse = await fetch(`${BASE_URL}/getMatchData`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: `/basic-score/${testMatchId}.json` })
        });
        const legacyData = await legacyResponse.json();
        console.log('✅ Success:', JSON.stringify(legacyData, null, 2));
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    } else {
      console.log('ℹ️  No matches found in database. Please add some matches first.');
    }
    
  } catch (error) {
    console.log('❌ Error getting matches:', error.message);
  }

  // Test 6: Test with filters
  console.log('\n6. Testing GET /getMatches with filters');
  try {
    const filteredResponse = await fetch(`${BASE_URL}/getMatches?status=live&limit=5`);
    const filteredData = await filteredResponse.json();
    console.log('✅ Success (filtered):', JSON.stringify(filteredData, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 API testing completed!');
}

// Run the tests
testAPI().catch(console.error);