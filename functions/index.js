const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Function to get match data and return as JSON
exports.getMatchData = onRequest({cors: true}, async (request, response) => {
  try {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Content-Type', 'application/json');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Extract match ID from the URL path
    // URL format: /basic-score/MATCH_ID.json
    const urlPath = request.path;
    const pathParts = urlPath.split('/');
    let matchId = null;

    // Find the match ID in the path
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'basic-score' && i + 1 < pathParts.length) {
        matchId = pathParts[i + 1];
        // Remove .json extension if present
        if (matchId.endsWith('.json')) {
          matchId = matchId.slice(0, -5);
        }
        break;
      }
    }

    if (!matchId) {
      response.status(400).json({
        status: 'error',
        message: 'Match ID is required'
      });
      return;
    }

    logger.info(`Fetching match data for: ${matchId}`);

    // Fetch match data from Firestore
    const matchDoc = await db.collection('fixtures').doc(matchId).get();

    if (!matchDoc.exists) {
      response.status(404).json({
        status: 'error',
        message: 'No match data found'
      });
      return;
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() };

    // Fetch team data if team IDs are available
    const teamData = {};
    if (matchData.team1) {
      try {
        const team1Doc = await db.collection('teams').doc(matchData.team1).get();
        if (team1Doc.exists) {
          teamData.team1 = team1Doc.data();
        }
      } catch (error) {
        logger.error('Error fetching team1 data:', error);
      }
    }

    if (matchData.team2) {
      try {
        const team2Doc = await db.collection('teams').doc(matchData.team2).get();
        if (team2Doc.exists) {
          teamData.team2 = team2Doc.data();
        }
      } catch (error) {
        logger.error('Error fetching team2 data:', error);
      }
    }

    // Generate the score data in the same format as the client-side service
    const scoreData = generateScoreData(matchData, teamData);

    response.status(200).json(scoreData);

  } catch (error) {
    logger.error('Error in getMatchData function:', error);
    response.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Function to generate score data (similar to scoreJsonService)
function generateScoreData(match, teams) {
  // Calculate total scores for each team/player
  const getTotalScores = () => {
    if (!match.scores) {
      return { team1Total: 0, team2Total: 0 };
    }

    let team1Total = 0;
    let team2Total = 0;
    const gamesCount = match.gamesCount || 3;

    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      const team1Score = match.scores.player1?.[gameKey] || 0;
      const team2Score = match.scores.player2?.[gameKey] || 0;
      
      if (typeof team1Score === 'number') team1Total += team1Score;
      if (typeof team2Score === 'number') team2Total += team2Score;
    }

    return { team1Total, team2Total };
  };

  const { team1Total, team2Total } = getTotalScores();

  // Check if it's a doubles match (has 2 players per team)
  const isDoubles = match.player2Team1 && match.player2Team2;

  // Prepare table data
  const tableData = [];

  if (isDoubles) {
    // Doubles match - combine players from each team into single rows
    const team1Players = `${match.player1Team1 || 'Player 1'}/ ${match.player2Team1 || 'Player 2'}`;
    const team2Players = `${match.player1Team2 || 'Player 3'}/ ${match.player2Team2 || 'Player 4'}`;
    
    // Determine serve status for doubles using umpire app's serve tracking
    let team1Serve = '';
    let team2Serve = '';
    
    // Check which team is serving based on servingPlayer from umpire app
    if (match.servingPlayer === 'player1') {
      // Team 1 is serving, show serve count (1 or 2)
      team1Serve = (match.teamServeCount === 0) ? '1' : '2';
    } else if (match.servingPlayer === 'player2') {
      // Team 2 is serving, show serve count (1 or 2)
      team2Serve = (match.teamServeCount === 0) ? '1' : '2';
    }
    
    tableData.push({
      playerName: team1Players,
      teamName: match.team1Name || 'Team 1',
      teamLogoUrl: teams.team1?.logo?.url || '',
      points: team1Total,
      serve: team1Serve
    });
    tableData.push({
      playerName: team2Players,
      teamName: match.team2Name || 'Team 2',
      teamLogoUrl: teams.team2?.logo?.url || '',
      points: team2Total,
      serve: team2Serve
    });
  } else {
    // Singles match - show "1" for serving player, empty for non-serving player
    tableData.push({
      playerName: match.player1Team1 || match.team1Name || 'Player 1',
      teamName: match.team1Name || 'Team 1',
      teamLogoUrl: teams.team1?.logo?.url || '',
      points: team1Total,
      serve: (match.servingPlayer === 'player1') ? '1' : ''
    });
    tableData.push({
      playerName: match.player1Team2 || match.team2Name || 'Player 2',
      teamName: match.team2Name || 'Team 2',
      teamLogoUrl: teams.team2?.logo?.url || '',
      points: team2Total,
      serve: (match.servingPlayer === 'player2') ? '1' : ''
    });
  }

  return {
    matchId: match.id,
    lastUpdated: new Date().toISOString(),
    matchStatus: match.status || 'active',
    isDoubles,
    tableData
  };
}
