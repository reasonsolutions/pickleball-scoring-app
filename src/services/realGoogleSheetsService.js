import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

class RealGoogleSheetsService {
  constructor() {
    this.listeners = new Map();
    this.sheetsUrls = new Map();
    // Google Sheets API configuration
    this.apiKey = 'YOUR_GOOGLE_API_KEY'; // Replace with actual API key
    this.clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with actual client ID
    this.discoveryDoc = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    this.scopes = 'https://www.googleapis.com/auth/spreadsheets';
    this.gapi = null;
  }

  // Initialize Google API
  async initializeGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        this.gapi.load('client:auth2', async () => {
          try {
            await this.gapi.client.init({
              apiKey: this.apiKey,
              clientId: this.clientId,
              discoveryDocs: [this.discoveryDoc],
              scope: this.scopes
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      } else {
        // Load Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          this.gapi = window.gapi;
          this.gapi.load('client:auth2', async () => {
            try {
              await this.gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                discoveryDocs: [this.discoveryDoc],
                scope: this.scopes
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }

  // Authenticate user with Google
  async authenticateUser() {
    const authInstance = this.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn();
    }
    return authInstance.currentUser.get().getAuthResponse().access_token;
  }

  // Create a new Google Sheet
  async createGoogleSheet(matchId, sheetData) {
    try {
      // Initialize Google API if not already done
      if (!this.gapi) {
        await this.initializeGoogleAPI();
      }

      // Authenticate user
      await this.authenticateUser();

      // Create spreadsheet
      const response = await this.gapi.client.sheets.spreadsheets.create({
        properties: {
          title: `Pickleball Match ${matchId} - Live Score`
        }
      });

      const spreadsheetId = response.result.spreadsheetId;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Add data to the sheet
      await this.updateSheetData(spreadsheetId, sheetData);

      // Make the sheet publicly viewable
      await this.makeSheetPublic(spreadsheetId);

      // Store the URL
      this.sheetsUrls.set(matchId, spreadsheetUrl);
      localStorage.setItem(`google_sheet_url_${matchId}`, spreadsheetUrl);

      return spreadsheetUrl;
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw error;
    }
  }

  // Update sheet data
  async updateSheetData(spreadsheetId, sheetData) {
    const values = [sheetData.headers, ...sheetData.rows];
    
    await this.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    });

    // Format the header row
    await this.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9
                  },
                  textFormat: {
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }
        ]
      }
    });
  }

  // Make sheet publicly viewable
  async makeSheetPublic(spreadsheetId) {
    // This would require Google Drive API to change permissions
    // For now, we'll just log the instruction
    console.log(`Please manually share the sheet ${spreadsheetId} with "Anyone with the link can view"`);
  }

  // Start listening to match data and auto-update Google Sheet
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

            // Generate sheet data
            const sheetData = this.generateSheetData(matchData, teamData);
            
            // Check if sheet exists, if not create it
            let sheetUrl = this.sheetsUrls.get(matchId) || localStorage.getItem(`google_sheet_url_${matchId}`);
            
            if (!sheetUrl) {
              sheetUrl = await this.createGoogleSheet(matchId, sheetData);
            } else {
              // Update existing sheet
              const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
              await this.updateSheetData(spreadsheetId, sheetData);
            }
            
            // Trigger event
            window.dispatchEvent(new CustomEvent('googleSheetUpdated', {
              detail: { matchId, sheetUrl, sheetData }
            }));
            
          }
        } catch (error) {
          console.error('Error processing match data:', error);
        }
      }
    );

    this.listeners.set(matchId, unsubscribe);
  }

  // Extract spreadsheet ID from URL
  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  // Generate sheet data (same as before)
  generateSheetData(match, teams) {
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

    const headers = [
      'Player Name',
      'Team Name',
      'Team Logo URL',
      'Points',
      'Serve',
      'Match Status',
      'Match Type',
      'Last Updated'
    ];

    const rows = [];

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
      
      rows.push([
        team1Players,
        match.team1Name || 'Team 1',
        teams.team1?.logo?.url || '',
        team1Total,
        team1Serve,
        match.status || 'active',
        'Doubles',
        new Date().toISOString()
      ]);
      
      rows.push([
        team2Players,
        match.team2Name || 'Team 2',
        teams.team2?.logo?.url || '',
        team2Total,
        team2Serve,
        match.status || 'active',
        'Doubles',
        new Date().toISOString()
      ]);
    } else {
      rows.push([
        match.player1Team1 || match.team1Name || 'Player 1',
        match.team1Name || 'Team 1',
        teams.team1?.logo?.url || '',
        team1Total,
        (match.servingPlayer === 'player1') ? '1' : '',
        match.status || 'active',
        'Singles',
        new Date().toISOString()
      ]);
      
      rows.push([
        match.player1Team2 || match.team2Name || 'Player 2',
        match.team2Name || 'Team 2',
        teams.team2?.logo?.url || '',
        team2Total,
        (match.servingPlayer === 'player2') ? '1' : '',
        match.status || 'active',
        'Singles',
        new Date().toISOString()
      ]);
    }

    return {
      matchId: match.id,
      headers,
      rows,
      lastUpdated: new Date().toISOString(),
      matchStatus: match.status || 'active',
      isDoubles
    };
  }

  // Get sheet URL
  getSheetUrl(matchId) {
    return this.sheetsUrls.get(matchId) || localStorage.getItem(`google_sheet_url_${matchId}`);
  }

  // Stop listening
  stopListening(matchId) {
    const unsubscribe = this.listeners.get(matchId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(matchId);
    }
  }

  // Cleanup
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.sheetsUrls.clear();
  }
}

// Create singleton instance
const realGoogleSheetsService = new RealGoogleSheetsService();

export default realGoogleSheetsService;