import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

class RSSService {
  constructor() {
    this.listeners = new Map();
    this.rssData = new Map();
  }

  // Start listening to a match and automatically update RSS feed
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

            // Generate the RSS feed
            const rssXml = this.generateRSSFeed(matchData, teamData);
            
            // Store in memory
            this.rssData.set(matchId, rssXml);
            
            // Save RSS feed to localStorage and create blob URL
            this.saveRSSFeed(matchId, rssXml);
            
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
      this.rssData.delete(matchId);
    }
  }

  // Generate RSS feed XML
  generateRSSFeed(match, teams) {
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
    const currentTime = new Date().toUTCString();

    // Build RSS XML
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
    rss += '  <channel>\n';
    rss += `    <title>Pickleball Match ${escapeXml(match.id)} - Live Score</title>\n`;
    rss += `    <description>Live score updates for Pickleball Match ${escapeXml(match.id)}</description>\n`;
    rss += `    <link>${window.location.origin}/match/${escapeXml(match.id)}</link>\n`;
    rss += `    <lastBuildDate>${currentTime}</lastBuildDate>\n`;
    rss += `    <pubDate>${currentTime}</pubDate>\n`;
    rss += '    <language>en-US</language>\n';
    rss += '    <generator>Pickleball Scoring App</generator>\n';
    rss += '\n';

    // Add match summary item
    rss += '    <item>\n';
    rss += `      <title>Match ${escapeXml(match.id)} - Current Score</title>\n`;
    rss += `      <description>Live score update for ${isDoubles ? 'Doubles' : 'Singles'} match</description>\n`;
    rss += `      <link>${window.location.origin}/match/${escapeXml(match.id)}</link>\n`;
    rss += `      <pubDate>${currentTime}</pubDate>\n`;
    rss += `      <guid isPermaLink="false">match-${escapeXml(match.id)}-${Date.now()}</guid>\n`;
    
    // Create detailed content
    let content = '<![CDATA[\n';
    content += `<h2>Match ${escapeXml(match.id)} - Live Score</h2>\n`;
    content += `<p><strong>Match Type:</strong> ${isDoubles ? 'Doubles' : 'Singles'}</p>\n`;
    content += `<p><strong>Status:</strong> ${escapeXml(match.status || 'Active')}</p>\n`;
    content += `<p><strong>Last Updated:</strong> ${currentTime}</p>\n`;
    content += '<hr>\n';

    if (isDoubles) {
      // Doubles match
      const team1Players = `${match.player1Team1 || 'Player 1'}/ ${match.player2Team1 || 'Player 2'}`;
      const team2Players = `${match.player1Team2 || 'Player 3'}/ ${match.player2Team2 || 'Player 4'}`;
      
      let team1Serve = '';
      let team2Serve = '';
      
      if (match.servingPlayer === 'player1') {
        team1Serve = (match.teamServeCount === 0) ? '1' : '2';
      } else if (match.servingPlayer === 'player2') {
        team2Serve = (match.teamServeCount === 0) ? '1' : '2';
      }
      
      content += '<table border="1" cellpadding="5" cellspacing="0">\n';
      content += '<tr><th>Players</th><th>Team</th><th>Points</th><th>Serve</th></tr>\n';
      content += `<tr><td>${escapeXml(team1Players)}</td><td>${escapeXml(match.team1Name || 'Team 1')}</td><td><strong>${team1Total}</strong></td><td>${escapeXml(team1Serve)}</td></tr>\n`;
      content += `<tr><td>${escapeXml(team2Players)}</td><td>${escapeXml(match.team2Name || 'Team 2')}</td><td><strong>${team2Total}</strong></td><td>${escapeXml(team2Serve)}</td></tr>\n`;
      content += '</table>\n';
    } else {
      // Singles match
      content += '<table border="1" cellpadding="5" cellspacing="0">\n';
      content += '<tr><th>Player</th><th>Team</th><th>Points</th><th>Serve</th></tr>\n';
      content += `<tr><td>${escapeXml(match.player1Team1 || match.team1Name || 'Player 1')}</td><td>${escapeXml(match.team1Name || 'Team 1')}</td><td><strong>${team1Total}</strong></td><td>${(match.servingPlayer === 'player1') ? '1' : ''}</td></tr>\n`;
      content += `<tr><td>${escapeXml(match.player1Team2 || match.team2Name || 'Player 2')}</td><td>${escapeXml(match.team2Name || 'Team 2')}</td><td><strong>${team2Total}</strong></td><td>${(match.servingPlayer === 'player2') ? '1' : ''}</td></tr>\n`;
      content += '</table>\n';
    }

    // Add game-by-game scores if available
    if (match.scores) {
      content += '<hr>\n';
      content += '<h3>Game Scores</h3>\n';
      content += '<table border="1" cellpadding="5" cellspacing="0">\n';
      content += '<tr><th>Team</th>';
      
      const gamesCount = match.gamesCount || 3;
      for (let i = 1; i <= gamesCount; i++) {
        content += `<th>Game ${i}</th>`;
      }
      content += '<th>Total</th></tr>\n';
      
      // Team 1 scores
      content += `<tr><td>${escapeXml(match.team1Name || 'Team 1')}</td>`;
      for (let i = 1; i <= gamesCount; i++) {
        const gameKey = `game${i}`;
        const score = match.scores.player1?.[gameKey] || 0;
        content += `<td>${score}</td>`;
      }
      content += `<td><strong>${team1Total}</strong></td></tr>\n`;
      
      // Team 2 scores
      content += `<tr><td>${escapeXml(match.team2Name || 'Team 2')}</td>`;
      for (let i = 1; i <= gamesCount; i++) {
        const gameKey = `game${i}`;
        const score = match.scores.player2?.[gameKey] || 0;
        content += `<td>${score}</td>`;
      }
      content += `<td><strong>${team2Total}</strong></td></tr>\n`;
      content += '</table>\n';
    }

    content += ']]>';
    
    rss += `      <content:encoded>${content}</content:encoded>\n`;
    rss += '    </item>\n';
    rss += '\n';
    rss += '  </channel>\n';
    rss += '</rss>';

    return rss;
  }

  // Save RSS feed to localStorage and create blob URL
  saveRSSFeed(matchId, rssXml) {
    try {
      // Store RSS XML in localStorage
      localStorage.setItem(`rss_feed_${matchId}`, rssXml);
      
      // Create blob URL for direct access
      const blob = new Blob([rssXml], { type: 'application/rss+xml' });
      const url = URL.createObjectURL(blob);
      
      // Store blob URL
      localStorage.setItem(`rss_url_${matchId}`, url);
      
      // Trigger custom event for components that want to listen
      window.dispatchEvent(new CustomEvent('rssUpdated', {
        detail: { matchId, rssXml, rssUrl: url }
      }));
      
      console.log(`RSS feed updated for match ${matchId}`);
    } catch (error) {
      console.error('Error saving RSS feed:', error);
    }
  }

  // Get RSS feed XML for a match
  getRSSFeed(matchId) {
    return this.rssData.get(matchId) || localStorage.getItem(`rss_feed_${matchId}`);
  }

  // Get RSS feed URL for a match
  getRSSUrl(matchId) {
    return localStorage.getItem(`rss_url_${matchId}`);
  }

  // Download RSS feed as file
  downloadRSSFeed(matchId) {
    const rssXml = this.getRSSFeed(matchId);
    if (!rssXml) {
      console.error('No RSS feed found for match:', matchId);
      return;
    }

    const blob = new Blob([rssXml], { type: 'application/rss+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${matchId}_feed.rss`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get RSS feed URL for external access
  getRSSFeedUrl(matchId) {
    return `${window.location.origin}/rss-feed/${matchId}`;
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.rssData.clear();
  }
}

// Create singleton instance
const rssService = new RSSService();

export default rssService;