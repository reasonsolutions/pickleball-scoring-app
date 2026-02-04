const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const DuprApiClient = require('./duprApiClient');
const passwordResetEmail = require('./sendPasswordResetEmail');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Helper function to set CORS headers
function setCorsHeaders(response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Content-Type', 'application/json');
}

// Helper function to handle preflight requests
function handlePreflight(request, response) {
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return true;
  }
  return false;
}

// 1. GET /api/match/{matchId} - Get complete match data
exports.getMatch = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const matchId = request.params[0] || request.query.matchId;
    
    if (!matchId) {
      response.status(400).json({
        status: 'error',
        message: 'Match ID is required'
      });
      return;
    }

    logger.info(`Fetching complete match data for: ${matchId}`);

    // Fetch match data
    const matchDoc = await db.collection('fixtures').doc(matchId).get();
    
    if (!matchDoc.exists) {
      response.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
      return;
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() };

    // Fetch team data
    const teamData = await fetchTeamData(matchData);

    // Fetch player data if available
    const playerData = await fetchPlayerData(matchData);

    // Generate comprehensive match response
    const completeMatchData = {
      matchId: matchData.id,
      status: matchData.status || 'scheduled',
      lastUpdated: new Date().toISOString(),
      
      // Basic match info
      tournament: matchData.tournament || '',
      round: matchData.round || '',
      court: matchData.court || '',
      date: matchData.date || '',
      time: matchData.time || '',
      
      // Match configuration
      gamesCount: matchData.gamesCount || 1,
      pointsPerGame: matchData.pointsPerGame || [11],
      isDoubles: !!(matchData.player2Team1 && matchData.player2Team2),
      
      // Teams
      teams: {
        team1: {
          id: matchData.team1 || '',
          name: matchData.team1Name || 'Team 1',
          logo: teamData.team1?.logo?.url || '',
          players: {
            player1: matchData.player1Team1 || '',
            player2: matchData.player2Team1 || ''
          }
        },
        team2: {
          id: matchData.team2 || '',
          name: matchData.team2Name || 'Team 2', 
          logo: teamData.team2?.logo?.url || '',
          players: {
            player1: matchData.player1Team2 || '',
            player2: matchData.player2Team2 || ''
          }
        }
      },
      
      // Current scores
      scores: matchData.scores || {},
      currentGame: matchData.currentGame || 0,
      
      // Serve information
      serving: {
        player: matchData.servingPlayer || 'player1',
        sequence: matchData.serveSequence || 0,
        teamServeCount: matchData.teamServeCount || 0
      },
      
      // Match events (substitutions, timeouts, etc.)
      events: matchData.events || [],
      substitutions: matchData.substitutions || [],
      timeoutsUsed: matchData.timeoutsUsed || { team1: 0, team2: 0 },
      drsReviewsLeft: matchData.drsReviewsLeft || { team1: 1, team2: 1 },
      
      // Media
      youtubeLink: matchData.youtubeLink || '',
      youtubeLiveLink: matchData.youtubeLiveLink || ''
    };

    response.status(200).json(completeMatchData);

  } catch (error) {
    logger.error('Error in getMatch:', error);
    response.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// 2. GET /api/match/{matchId}/score - Get current score data (simplified format)
exports.getMatchScore = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const matchId = request.params[0] || request.query.matchId;
    
    if (!matchId) {
      response.status(400).json({
        status: 'error',
        message: 'Match ID is required'
      });
      return;
    }

    logger.info(`Fetching score data for: ${matchId}`);

    const matchDoc = await db.collection('fixtures').doc(matchId).get();
    
    if (!matchDoc.exists) {
      response.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
      return;
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() };
    const teamData = await fetchTeamData(matchData);

    // Generate score data with substitutions included
    const scoreData = generateScoreDataWithSubstitutions(matchData, teamData);

    response.status(200).json(scoreData);

  } catch (error) {
    logger.error('Error in getMatchScore:', error);
    response.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// 3. GET /api/match/{matchId}/events - Get match events (substitutions, serve changes, etc.)
exports.getMatchEvents = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const matchId = request.params[0] || request.query.matchId;
    
    if (!matchId) {
      response.status(400).json({
        status: 'error',
        message: 'Match ID is required'
      });
      return;
    }

    logger.info(`Fetching events for match: ${matchId}`);

    const matchDoc = await db.collection('fixtures').doc(matchId).get();
    
    if (!matchDoc.exists) {
      response.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
      return;
    }

    const matchData = matchDoc.data();

    const eventsData = {
      matchId: matchId,
      lastUpdated: new Date().toISOString(),
      events: matchData.events || [],
      substitutions: matchData.substitutions || [],
      timeouts: {
        team1Used: matchData.timeoutsUsed?.team1 || 0,
        team2Used: matchData.timeoutsUsed?.team2 || 0
      },
      drsReviews: {
        team1Left: matchData.drsReviewsLeft?.team1 || 1,
        team2Left: matchData.drsReviewsLeft?.team2 || 1
      },
      serveChanges: extractServeChanges(matchData.events || [])
    };

    response.status(200).json(eventsData);

  } catch (error) {
    logger.error('Error in getMatchEvents:', error);
    response.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// 4. GET /api/matches - Get list of matches (with optional filters)
exports.getMatches = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const tournament = request.query.tournament;
    const status = request.query.status;
    const date = request.query.date;
    const limit = parseInt(request.query.limit) || 50;

    logger.info(`Fetching matches with filters - tournament: ${tournament}, status: ${status}, date: ${date}`);

    let query = db.collection('fixtures');

    // Apply filters
    if (tournament) {
      query = query.where('tournament', '==', tournament);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (date) {
      query = query.where('date', '==', date);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    const matches = [];

    for (const doc of snapshot.docs) {
      const matchData = { id: doc.id, ...doc.data() };
      const teamData = await fetchTeamData(matchData);
      
      matches.push({
        matchId: doc.id,
        tournament: matchData.tournament || '',
        round: matchData.round || '',
        date: matchData.date || '',
        time: matchData.time || '',
        status: matchData.status || 'scheduled',
        teams: {
          team1: {
            name: matchData.team1Name || 'Team 1',
            logo: teamData.team1?.logo?.url || ''
          },
          team2: {
            name: matchData.team2Name || 'Team 2',
            logo: teamData.team2?.logo?.url || ''
          }
        },
        isDoubles: !!(matchData.player2Team1 && matchData.player2Team2),
        currentScore: getCurrentScore(matchData.scores || {})
      });
    }

    response.status(200).json({
      matches: matches,
      total: matches.length,
      filters: { tournament, status, date, limit }
    });

  } catch (error) {
    logger.error('Error in getMatches:', error);
    response.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Legacy endpoint for backward compatibility
exports.getMatchData = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    // Extract match ID from the URL path
    const urlPath = request.path;
    const pathParts = urlPath.split('/');
    let matchId = null;

    // Find the match ID in the path
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'basic-score' && i + 1 < pathParts.length) {
        matchId = pathParts[i + 1];
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

    const matchDoc = await db.collection('fixtures').doc(matchId).get();

    if (!matchDoc.exists) {
      response.status(404).json({
        status: 'error',
        message: 'No match data found'
      });
      return;
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() };
    const teamData = await fetchTeamData(matchData);
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

// Email OTP Verification Function
exports.sendOtpEmail = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { email } = request.body;
    
    if (!email) {
      response.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      response.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
      return;
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store OTP in Firestore with expiration (5 minutes)
    const otpDoc = {
      email: email,
      otp: otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      verified: false
    };
    
    await db.collection('email-otps').add(otpDoc);

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hpl@centrecourt.ventures', // Your Gmail address
        pass: 'ktrnasnndenawfka'  // Your Gmail app password (correct 16 chars)
      }
    });

    // Email template
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: email,
      subject: 'HPL Player Registration - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">HPL Player Registration</h1>
            <p style="color: #666; margin: 10px 0;">Email Verification Required</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #666; margin: 15px 0;">Enter this code to verify your email address</p>
            <p style="color: #999; font-size: 14px;">This code will expire in 5 minutes</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              If you didn't request this verification, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px;">
              © 2024 Hyderabad Pickleball League. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`OTP sent successfully to ${email}`);

    response.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error sending OTP email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send OTP email'
    });
  }
});

// Verify OTP Function
exports.verifyOtp = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { email, otp } = request.body;
    
    if (!email || !otp) {
      response.status(400).json({
        status: 'error',
        message: 'Email and OTP are required'
      });
      return;
    }

    // Find the OTP record
    const otpQuery = await db.collection('email-otps')
      .where('email', '==', email)
      .where('otp', '==', otp)
      .where('verified', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (otpQuery.empty) {
      response.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP'
      });
      return;
    }

    const otpDoc = otpQuery.docs[0];
    const otpData = otpDoc.data();

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt.toDate()) {
      response.status(400).json({
        status: 'error',
        message: 'OTP has expired'
      });
      return;
    }

    // Mark OTP as verified
    await otpDoc.ref.update({ verified: true });

    logger.info(`OTP verified successfully for ${email}`);

    response.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error verifying OTP:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to verify OTP'
    });
  }
});

// Send Recruitment Email Function
exports.sendRecruitmentEmail = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { to, subject, html, type } = request.body;
    
    if (!to || !subject || !html || !type) {
      response.status(400).json({
        status: 'error',
        message: 'Email recipient, subject, content, and type are required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      response.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
      return;
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hpl@centrecourt.ventures', // Your Gmail address
        pass: 'ktrnasnndenawfka'  // Your Gmail app password
      }
    });

    // Email options
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: to,
      subject: subject,
      html: html
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`Recruitment email (${type}) sent successfully to ${to}`);

    response.status(200).json({
      status: 'success',
      message: 'Email sent successfully',
      type: type,
      recipient: to
    });

  } catch (error) {
    logger.error('Error sending recruitment email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send email'
    });
  }
});

// Helper Functions

async function fetchTeamData(matchData) {
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

  return teamData;
}

async function fetchPlayerData(matchData) {
  // This can be extended to fetch detailed player information if needed
  return {};
}

function extractServeChanges(events) {
  return events.filter(event => 
    event.type === 'serve_change' || 
    event.type === 'serve_sequence_change'
  );
}

function getCurrentScore(scores) {
  if (!scores || !scores.player1 || !scores.player2) {
    return { team1: 0, team2: 0 };
  }

  let team1Total = 0;
  let team2Total = 0;

  // Sum up all game scores
  Object.keys(scores.player1).forEach(gameKey => {
    if (gameKey.startsWith('game')) {
      team1Total += scores.player1[gameKey] || 0;
      team2Total += scores.player2[gameKey] || 0;
    }
  });

  return { team1: team1Total, team2: team2Total };
}

// Generate score data (same as your existing service)
function generateScoreData(match, teams) {
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
  const isDoubles = match.player2Team1 && match.player2Team2;
  const tableData = [];

  if (isDoubles) {
    const team1Players = `${match.player1Team1 || 'Player 1'}/ ${match.player2Team1 || 'Player 2'}`;
    const team2Players = `${match.player1Team2 || 'Player 3'}/ ${match.player2Team2 || 'Player 4'}`;
    
    let team1Serve = '';
    let team2Serve = '';
    
    if (match.servingPlayer === 'player1') {
      team1Serve = (match.teamServeCount === 0) ? '1' : '2';
    } else if (match.servingPlayer === 'player2') {
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

// Generate score data with substitutions included
function generateScoreDataWithSubstitutions(match, teams) {
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
  const isDoubles = match.player2Team1 && match.player2Team2;
  const tableData = [];

  // Process substitutions to get current players
  const getCurrentPlayers = () => {
    let currentPlayers = {
      team1: {
        player1: match.player1Team1 || 'Player 1',
        player2: match.player2Team1 || 'Player 2'
      },
      team2: {
        player1: match.player1Team2 || 'Player 3',
        player2: match.player2Team2 || 'Player 4'
      }
    };

    // Apply substitutions to get current players
    if (match.substitutions && match.substitutions.length > 0) {
      match.substitutions.forEach(sub => {
        if (sub.team === 'team1') {
          if (currentPlayers.team1.player1 === sub.playerOut) {
            currentPlayers.team1.player1 = sub.playerIn;
          } else if (currentPlayers.team1.player2 === sub.playerOut) {
            currentPlayers.team1.player2 = sub.playerIn;
          }
        } else if (sub.team === 'team2') {
          if (currentPlayers.team2.player1 === sub.playerOut) {
            currentPlayers.team2.player1 = sub.playerIn;
          } else if (currentPlayers.team2.player2 === sub.playerOut) {
            currentPlayers.team2.player2 = sub.playerIn;
          }
        }
      });
    }

    return currentPlayers;
  };

  const currentPlayers = getCurrentPlayers();

  if (isDoubles) {
    const team1Players = `${currentPlayers.team1.player1}/ ${currentPlayers.team1.player2}`;
    const team2Players = `${currentPlayers.team2.player1}/ ${currentPlayers.team2.player2}`;
    
    let team1Serve = '';
    let team2Serve = '';
    
    if (match.servingPlayer === 'player1') {
      team1Serve = (match.teamServeCount === 0) ? '1' : '2';
    } else if (match.servingPlayer === 'player2') {
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
    tableData.push({
      playerName: currentPlayers.team1.player1 || match.team1Name || 'Player 1',
      teamName: match.team1Name || 'Team 1',
      teamLogoUrl: teams.team1?.logo?.url || '',
      points: team1Total,
      serve: (match.servingPlayer === 'player1') ? '1' : ''
    });
    tableData.push({
      playerName: currentPlayers.team2.player1 || match.team2Name || 'Player 2',
      teamName: match.team2Name || 'Team 2',
      teamLogoUrl: teams.team2?.logo?.url || '',
      points: team2Total,
      serve: (match.servingPlayer === 'player2') ? '1' : ''
    });
  }

  // Format substitutions for easy consumption
  const formattedSubstitutions = (match.substitutions || []).map(sub => ({
    team: sub.team,
    teamName: sub.team === 'team1' ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2'),
    playerOut: sub.playerOut,
    playerIn: sub.playerIn,
    timestamp: sub.timestamp,
    game: sub.game || 0,
    score: sub.score || ''
  }));

  return {
    matchId: match.id,
    lastUpdated: new Date().toISOString(),
    matchStatus: match.status || 'active',
    isDoubles,
    tableData,
    substitutions: formattedSubstitutions,
    totalSubstitutions: formattedSubstitutions.length
  };
}

/**
 * Firebase Cloud Function to fetch DUPR player ratings via API
 * Uses the unofficial DUPR API instead of web scraping
 */
exports.getDuprRatings = onRequest({
  cors: true,
  timeoutSeconds: 300, // 5 minutes max
  memory: '1GB'
}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    // Only allow POST requests
    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const { duprIds } = request.body;
    
    if (!duprIds || !Array.isArray(duprIds)) {
      return response.status(400).json({
        error: 'Invalid request. Expected array of DUPR IDs.'
      });
    }

    logger.info(`Processing DUPR ratings request for ${duprIds.length} players`);

    const duprClient = new DuprApiClient({ verbose: true });
    
    try {
      // Authenticate with DUPR API
      const authenticated = await duprClient.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with DUPR API');
      }

      // Get ratings for all players
      const results = await duprClient.getPlayersRatings(duprIds);

      logger.info(`Successfully processed ${results.length} players`);
      
      return response.status(200).json({
        success: true,
        results: results.map(result => ({
          duprId: result.playerId,
          doublesRating: result.doublesRating,
          singlesRating: result.singlesRating,
          lastUpdated: result.lastUpdated,
          error: result.error
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing DUPR ratings:', error);
      throw error;
    }

  } catch (error) {
    logger.error('Error in getDuprRatings function:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Test function to verify DUPR API integration works
 */
exports.testDuprApi = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const duprClient = new DuprApiClient({ verbose: true });
    
    try {
      // Test authentication
      logger.info('Testing DUPR API authentication...');
      const authenticated = await duprClient.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with DUPR API');
      }

      // Test getting profile
      logger.info('Testing profile retrieval...');
      const profileResult = await duprClient.getProfile();
      
      // Test with some sample player IDs (replace with real ones for testing)
      const testPlayerIds = ['12345', '67890']; // Replace with actual DUPR player IDs
      logger.info('Testing player ratings retrieval...');
      const ratingsResults = await duprClient.getPlayersRatings(testPlayerIds);

      return response.status(200).json({
        success: true,
        authentication: 'Success',
        profile: profileResult,
        ratingsTest: ratingsResults,
        message: 'DUPR API test completed successfully'
      });

    } catch (error) {
      logger.error('Error in DUPR API test:', error);
      throw error;
    }

  } catch (error) {
    logger.error('Error in test function:', error);
    return response.status(500).json({
      error: 'Test failed',
      message: error.message,
      details: error.stack
    });
  }
});

// Export password reset email function
exports.sendPasswordResetEmail = passwordResetEmail.sendPasswordResetEmail;
