import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import fs from 'fs';
import path from 'path';

// Generate XML from match data
function generateXML(matchData, teamData) {
  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  };

  // Calculate total scores for each team/player
  const getTotalScores = () => {
    if (!matchData.scores) {
      return { team1Total: 0, team2Total: 0 };
    }

    let team1Total = 0;
    let team2Total = 0;
    const gamesCount = matchData.gamesCount || 3;

    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      const team1Score = matchData.scores.player1?.[gameKey] || 0;
      const team2Score = matchData.scores.player2?.[gameKey] || 0;
      
      if (typeof team1Score === 'number') team1Total += team1Score;
      if (typeof team2Score === 'number') team2Total += team2Score;
    }

    return { team1Total, team2Total };
  };

  const { team1Total, team2Total } = getTotalScores();
  const isDoubles = matchData.player2Team1 && matchData.player2Team2;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<match>\n';
  xml += `  <matchId>${escapeXml(matchData.id)}</matchId>\n`;
  xml += `  <lastUpdated>${new Date().toISOString()}</lastUpdated>\n`;
  xml += `  <matchStatus>${escapeXml(matchData.status || 'active')}</matchStatus>\n`;
  xml += `  <isDoubles>${isDoubles}</isDoubles>\n`;
  xml += '  <players>\n';
  
  if (isDoubles) {
    // Doubles match
    const team1Players = `${matchData.player1Team1 || 'Player 1'}/ ${matchData.player2Team1 || 'Player 2'}`;
    const team2Players = `${matchData.player1Team2 || 'Player 3'}/ ${matchData.player2Team2 || 'Player 4'}`;
    
    let team1Serve = '';
    let team2Serve = '';
    
    if (matchData.servingPlayer === 'player1') {
      team1Serve = (matchData.teamServeCount === 0) ? '1' : '2';
    } else if (matchData.servingPlayer === 'player2') {
      team2Serve = (matchData.teamServeCount === 0) ? '1' : '2';
    }
    
    xml += '    <player id="1">\n';
    xml += `      <playerName>${escapeXml(team1Players)}</playerName>\n`;
    xml += `      <teamName>${escapeXml(matchData.team1Name || 'Team 1')}</teamName>\n`;
    xml += `      <teamLogoUrl>${escapeXml(teamData.team1?.logo?.url || '')}</teamLogoUrl>\n`;
    xml += `      <points>${team1Total}</points>\n`;
    xml += `      <serve>${escapeXml(team1Serve)}</serve>\n`;
    xml += '    </player>\n';
    
    xml += '    <player id="2">\n';
    xml += `      <playerName>${escapeXml(team2Players)}</playerName>\n`;
    xml += `      <teamName>${escapeXml(matchData.team2Name || 'Team 2')}</teamName>\n`;
    xml += `      <teamLogoUrl>${escapeXml(teamData.team2?.logo?.url || '')}</teamLogoUrl>\n`;
    xml += `      <points>${team2Total}</points>\n`;
    xml += `      <serve>${escapeXml(team2Serve)}</serve>\n`;
    xml += '    </player>\n';
  } else {
    // Singles match
    xml += '    <player id="1">\n';
    xml += `      <playerName>${escapeXml(matchData.player1Team1 || matchData.team1Name || 'Player 1')}</playerName>\n`;
    xml += `      <teamName>${escapeXml(matchData.team1Name || 'Team 1')}</teamName>\n`;
    xml += `      <teamLogoUrl>${escapeXml(teamData.team1?.logo?.url || '')}</teamLogoUrl>\n`;
    xml += `      <points>${team1Total}</points>\n`;
    xml += `      <serve>${(matchData.servingPlayer === 'player1') ? '1' : ''}</serve>\n`;
    xml += '    </player>\n';
    
    xml += '    <player id="2">\n';
    xml += `      <playerName>${escapeXml(matchData.player1Team2 || matchData.team2Name || 'Player 2')}</playerName>\n`;
    xml += `      <teamName>${escapeXml(matchData.team2Name || 'Team 2')}</teamName>\n`;
    xml += `      <teamLogoUrl>${escapeXml(teamData.team2?.logo?.url || '')}</teamLogoUrl>\n`;
    xml += `      <points>${team2Total}</points>\n`;
    xml += `      <serve>${(matchData.servingPlayer === 'player2') ? '1' : ''}</serve>\n`;
    xml += '    </player>\n';
  }
  
  xml += '  </players>\n';
  xml += '</match>';
  
  return xml;
}

// API endpoint to generate XML file
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId } = req.body;

  if (!matchId) {
    return res.status(400).json({ error: 'Match ID is required' });
  }

  try {
    // Fetch match data from Firestore
    const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
    
    if (!matchDoc.exists()) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() };
    
    // Fetch team data
    const teamData = {};
    if (matchData.team1) {
      try {
        const team1Doc = await getDoc(doc(db, 'teams', matchData.team1));
        if (team1Doc.exists()) {
          teamData.team1 = team1Doc.data();
        }
      } catch (error) {
        console.error('Error fetching team1 data:', error);
      }
    }
    
    if (matchData.team2) {
      try {
        const team2Doc = await getDoc(doc(db, 'teams', matchData.team2));
        if (team2Doc.exists()) {
          teamData.team2 = team2Doc.data();
        }
      } catch (error) {
        console.error('Error fetching team2 data:', error);
      }
    }

    // Generate XML
    const xmlContent = generateXML(matchData, teamData);
    
    // Save XML file to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const xmlFilePath = path.join(publicDir, `match-${matchId}.xml`);
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write XML file
    fs.writeFileSync(xmlFilePath, xmlContent, 'utf8');
    
    res.status(200).json({ 
      success: true, 
      message: 'XML file generated successfully',
      xmlUrl: `/match-${matchId}.xml`
    });

  } catch (error) {
    console.error('Error generating XML:', error);
    res.status(500).json({ error: 'Failed to generate XML file' });
  }
}