import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

class ScoreJsonService {
  constructor() {
    this.listeners = new Map();
    this.scoreData = new Map();
  }

  // Start listening to a match and automatically update JSON data
  startListening(matchId) {
    if (this.listeners.has(matchId)) {
      return; // Already listening
    }

    const unsubscribe = onSnapshot(
      doc(db, 'fixtures', matchId),
      async (matchDoc) => {
        try {
          if (matchDoc.exists()) {
            const matchData = { id: matchDoc.id, ...matchDoc.data() };
            
            // Fetch team data if team IDs are available
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

            // Generate the score data
            const scoreData = this.generateScoreData(matchData, teamData);
            
            // Store in memory
            this.scoreData.set(matchId, scoreData);
            
            // Save to JSON file (in public folder for easy access)
            this.saveToJsonFile(matchId, scoreData);
            
          }
        } catch (error) {
          console.error('Error processing match data:', error);
        }
      },
      (error) => {
        console.error('Error with real-time listener:', error);
      }
    );

    this.listeners.set(matchId, unsubscribe);
  }

  // Stop listening to a match
  stopListening(matchId) {
    const unsubscribe = this.listeners.get(matchId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(matchId);
      this.scoreData.delete(matchId);
    }
  }

  // Generate score data in the same format as BasicScore component
  generateScoreData(match, teams) {
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

  // Save score data to JSON and XML files
  async saveToJsonFile(matchId, scoreData) {
    try {
      const jsonString = JSON.stringify(scoreData, null, 2);
      const xmlString = this.generateXML(scoreData);
      
      // Store both JSON and XML in localStorage for persistence
      localStorage.setItem(`match_score_${matchId}`, jsonString);
      localStorage.setItem(`match_score_xml_${matchId}`, xmlString);
      
      // Create actual XML file in public directory (simulate file creation)
      // In a real server environment, this would write to the filesystem
      this.createXmlFile(matchId, xmlString);
      
      // Trigger custom event for components that want to listen
      window.dispatchEvent(new CustomEvent('scoreDataUpdated', {
        detail: { matchId, scoreData, xmlData: xmlString }
      }));
      
      console.log(`Score data updated for match ${matchId}`);
    } catch (error) {
      console.error('Error saving score data:', error);
    }
  }

  // Create XML file (simulated for browser environment)
  createXmlFile(matchId, xmlString) {
    try {
      // In a browser environment, we simulate file creation by storing the XML
      // and providing a direct URL that serves the XML content
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      // Store the blob URL for direct access
      localStorage.setItem(`xml_blob_url_${matchId}`, url);
      
      // In a real server environment, you would write to public/match-{matchId}.xml
      console.log(`XML file created for match ${matchId}`);
    } catch (error) {
      console.error('Error creating XML file:', error);
    }
  }

  // Generate XML from score data
  generateXML(scoreData) {
    const escapeXml = (unsafe) => {
      return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
      });
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<match>\n';
    xml += `  <matchId>${escapeXml(scoreData.matchId)}</matchId>\n`;
    xml += `  <lastUpdated>${escapeXml(scoreData.lastUpdated)}</lastUpdated>\n`;
    xml += `  <matchStatus>${escapeXml(scoreData.matchStatus)}</matchStatus>\n`;
    xml += `  <isDoubles>${scoreData.isDoubles}</isDoubles>\n`;
    xml += '  <players>\n';
    
    scoreData.tableData.forEach((player, index) => {
      xml += `    <player id="${index + 1}">\n`;
      xml += `      <playerName>${escapeXml(player.playerName)}</playerName>\n`;
      xml += `      <teamName>${escapeXml(player.teamName)}</teamName>\n`;
      xml += `      <teamLogoUrl>${escapeXml(player.teamLogoUrl || '')}</teamLogoUrl>\n`;
      xml += `      <points>${player.points}</points>\n`;
      xml += `      <serve>${escapeXml(player.serve || '')}</serve>\n`;
      xml += '    </player>\n';
    });
    
    xml += '  </players>\n';
    xml += '</match>';
    
    return xml;
  }

  // Get current score data for a match
  getScoreData(matchId) {
    return this.scoreData.get(matchId);
  }

  // Get score data from localStorage
  getStoredScoreData(matchId) {
    try {
      const stored = localStorage.getItem(`match_score_${matchId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading stored score data:', error);
      return null;
    }
  }

  // Get stored XML data
  getStoredXmlData(matchId) {
    try {
      return localStorage.getItem(`match_score_xml_${matchId}`);
    } catch (error) {
      console.error('Error reading stored XML data:', error);
      return null;
    }
  }

  // Download score data as JSON file
  downloadScoreData(matchId) {
    const scoreData = this.getScoreData(matchId) || this.getStoredScoreData(matchId);
    if (!scoreData) {
      console.error('No score data found for match:', matchId);
      return;
    }

    const jsonString = JSON.stringify(scoreData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${matchId}_score.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Download score data as XML file
  downloadXmlData(matchId) {
    const xmlData = this.getStoredXmlData(matchId);
    if (!xmlData) {
      console.error('No XML data found for match:', matchId);
      return;
    }

    const blob = new Blob([xmlData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${matchId}_score.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get XML data as blob URL for external access
  getXmlBlobUrl(matchId) {
    const xmlData = this.getStoredXmlData(matchId);
    if (!xmlData) {
      return null;
    }

    const blob = new Blob([xmlData], { type: 'application/xml' });
    return URL.createObjectURL(blob);
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.scoreData.clear();
  }
}

// Create singleton instance
const scoreJsonService = new ScoreJsonService();

export default scoreJsonService;