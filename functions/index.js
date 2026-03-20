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

// Send Club Approval Email Function
exports.sendClubApprovalEmail = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { to, clubName, ownerName } = request.body;
    
    if (!to || !clubName) {
      response.status(400).json({
        status: 'error',
        message: 'Email recipient and club name are required'
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
        user: 'hpl@centrecourt.ventures', // Gmail address
        pass: 'ktrnasnndenawfka'  // Gmail app password
      }
    });

    // Email template with content provided
    const subject = 'Welcome to the HPL Club League – Next Steps & Club Responsibilities';
    const greeting = ownerName ? `Dear ${ownerName},` : 'Dear Team,';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #3c6e71;">Welcome to the HPL Club League – Next Steps & Club Responsibilities</h2>
        
        <p>${greeting}</p>
        <p>Congratulations — your club has been officially approved to participate in the HPL Club League for the upcoming season.</p>
        <p>You are now part of a season-long, community-driven competition built around identity, professionalism, and long-term growth of pickleball in Hyderabad. This email outlines what this approval means, your responsibilities as a club, and the immediate next steps.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #3c6e71;">
          <h3 style="color: #3c6e71; margin-top: 0;">What Your Club Represents</h3>
          <p>As an HPL Club League club, you are not just entering a competition — you are becoming a local custodian of the league.</p>
          <p>Your club is expected to:</p>
          <ul>
            <li>Represent the league with professionalism</li>
            <li>Build and manage a strong player community</li>
            <li>Uphold competitive integrity and fair play</li>
            <li>Deliver a consistent and welcoming matchday experience at your home venue</li>
          </ul>
        </div>
        
        <h3 style="color: #3c6e71;">Club Roles & Responsibilities</h3>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 5px;">1. Club Manager (Mandatory)</h4>
          <p>Each club must operate through one authorised Club Manager, who will be the:</p>
          <ul>
            <li>Single point of contact with the league</li>
            <li>Decision-maker for player selection, matchday coordination, and communication</li>
            <li>Person responsible for compliance with league rules and timelines</li>
          </ul>
          <p>The Club Manager's conduct and responsiveness will directly impact your club's season review score.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 5px;">2. Team Formation & Player Management</h4>
          <ul>
            <li>Each club will form and manage a 10-player team</li>
            <li>Player invitations and confirmations will be handled entirely through thehpl.in</li>
            <li>Selection does not guarantee playing time — rotation and participation are club decisions</li>
            <li>Clubs may drop players and nominate replacements as per league guidelines (to be communicated separately)</li>
            <li>Any team that cannot create a squad of 10 players with the mandatory guidelines will be reviewed for participation.</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 5px;">3. Home Venue & Matchdays</h4>
          <ul>
            <li>Each club must designate a home venue</li>
            <li>Clubs are responsible for:
              <ul>
                <li>Venue readiness</li>
                <li>Basic on-ground coordination</li>
                <li>Supporting referees and match coordinators appointed by the league</li>
                <li>Ensuring the venue adheres to the requirements of the league</li>
              </ul>
            </li>
          </ul>
          <p>The league will provide:</p>
          <ul>
            <li>Referees</li>
            <li>Match coordinators</li>
            <li>Central scheduling</li>
            <li>Match recording infrastructure</li>
          </ul>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #3c6e71;">
          <h3 style="color: #3c6e71; margin-top: 0;">Branding, Logo & Jersey Standards</h3>
          <p>To maintain a strong, unified league identity:</p>
          <ul>
            <li>All clubs will follow league-defined branding standards</li>
            <li>Club logos are pre-assigned and cannot be changed</li>
            <li>Jerseys will be created through a guided design process</li>
            <li>Clubs will configure:
              <ul>
                <li>Club name & suffix</li>
                <li>Colours (from the approved palette)</li>
              </ul>
            </li>
            <li>Final designs will be reviewed and approved by the league</li>
            <li>League-recommended vendors will be suggested to ensure quality and best pricing</li>
          </ul>
          <p>Independent or unapproved designs will not be permitted.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #3c6e71;">Financial & Season Structure Notes</h3>
          <ul>
            <li>Club approval is valid for one season only</li>
            <li>Eligibility for future seasons depends on:
              <ul>
                <li>Compliance</li>
                <li>Professionalism</li>
                <li>Feedback from players, officials, and the league oversight committee</li>
              </ul>
            </li>
            <li>The league will host and manage the Grand Final – "State of the League"</li>
          </ul>
          <p>This is a grassroots competition designed to reward clubs that build culture, not just results.</p>
        </div>
        
        <div style="background-color: #3c6e71; color: white; padding: 15px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0;">Immediate Next Step (Required)</h3>
          <p>Please complete your Club Profile on the platform.</p>
          <p>This will:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>Activate your club on thehpl.in</li>
            <li>Make you visible to players</li>
            <li>Enable player onboarding and scheduling</li>
          </ul>
          <p style="margin: 15px 0 5px; font-weight: bold;">👉 Log in to thehpl.in and complete your Club Profile</p>
          <p style="margin: 5px 0;">(Access is already enabled for your account.)</p>
        </div>
        
        <p>We're excited to have you on board.</p>
        <p>Build your community well.<br>
        Run your season professionally.<br>
        Earn your place every year.</p>
        <p>Welcome to the HPL Club League.</p>
        
        <p>Warm regards,<br>
        Team HPL<br>
        HPL Club League<br>
        thehpl.in</p>
        
        <p style="font-style: italic; color: #666; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
          "Not a tournament. Not a franchise. This is club sport."
        </p>
      </div>
    `;

    // Email options
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: to,
      subject: subject,
      html: htmlContent
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`Club approval email sent successfully to ${to} for club: ${clubName}`);

    response.status(200).json({
      status: 'success',
      message: 'Club approval email sent successfully',
      recipient: to,
      clubName: clubName
    });

  } catch (error) {
    logger.error('Error sending club approval email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send club approval email'
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
