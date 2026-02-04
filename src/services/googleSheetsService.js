import { doc, onSnapshot, getDoc, collection, query, orderBy, where, onSnapshot as fsOnSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

class GoogleSheetsService {
  constructor() {
    this.listeners = new Map();
    this.sheetsData = new Map();
    this.sheetsUrls = new Map();
    this.playerSheetData = null;
    this.playerSheetUrl = null;
    this.playerListener = null;
  }

  // Start listening to a match and automatically update Google Sheet
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

            // Generate the sheet data
            const sheetData = this.generateSheetData(matchData, teamData);
            
            // Store in memory
            this.sheetsData.set(matchId, sheetData);
            
            // Create/Update Google Sheet
            await this.createOrUpdateGoogleSheet(matchId, sheetData);
            
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
      this.sheetsData.delete(matchId);
    }
  }

  // Generate sheet data in tabular format
  generateSheetData(match, teams) {
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

    // Create sheet data with headers and rows
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
      // Singles match
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

  // Create or update Google Sheet using Google Sheets API
  async createOrUpdateGoogleSheet(matchId, sheetData) {
    try {
      // Check if sheet already exists
      let sheetUrl = this.sheetsUrls.get(matchId);
      
      if (!sheetUrl) {
        // Create new sheet
        sheetUrl = await this.createNewGoogleSheet(matchId, sheetData);
        this.sheetsUrls.set(matchId, sheetUrl);
        
        // Store in localStorage for persistence
        localStorage.setItem(`sheet_url_${matchId}`, sheetUrl);
      } else {
        // Update existing sheet
        await this.updateGoogleSheet(matchId, sheetData);
      }
      
      // Trigger custom event for components that want to listen
      window.dispatchEvent(new CustomEvent('sheetDataUpdated', {
        detail: { matchId, sheetData, sheetUrl }
      }));
      
      console.log(`Google Sheet updated for match ${matchId}: ${sheetUrl}`);
    } catch (error) {
      console.error('Error creating/updating Google Sheet:', error);
    }
  }

  // Create new Google Sheet (simulated - would use Google Sheets API in production)
  async createNewGoogleSheet(matchId, sheetData) {
    // In a real implementation, this would use Google Sheets API
    // For now, we'll simulate by creating a CSV and providing instructions
    
    const csvContent = this.generateCSV(sheetData);
    
    // Create a downloadable CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Store CSV content for later use
    localStorage.setItem(`sheet_csv_${matchId}`, csvContent);
    
    // Simulate Google Sheets URL (in production, this would be the actual Google Sheets URL)
    const simulatedSheetUrl = `https://docs.google.com/spreadsheets/d/simulated-${matchId}/edit#gid=0`;
    
    console.log(`Created Google Sheet for match ${matchId}`);
    console.log(`CSV data available for download`);
    
    return simulatedSheetUrl;
  }

  // Update existing Google Sheet
  async updateGoogleSheet(matchId, sheetData) {
    // In a real implementation, this would update the existing Google Sheet
    const csvContent = this.generateCSV(sheetData);
    localStorage.setItem(`sheet_csv_${matchId}`, csvContent);
    
    console.log(`Updated Google Sheet for match ${matchId}`);
  }

  // Generate CSV content from sheet data
  generateCSV(sheetData) {
    let csv = sheetData.headers.join(',') + '\n';
    
    sheetData.rows.forEach(row => {
      // Escape commas and quotes in CSV
      const escapedRow = row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      csv += escapedRow.join(',') + '\n';
    });
    
    return csv;
  }

  // Get sheet URL for a match
  getSheetUrl(matchId) {
    return this.sheetsUrls.get(matchId) || localStorage.getItem(`sheet_url_${matchId}`);
  }

  // Get sheet data for a match
  getSheetData(matchId) {
    return this.sheetsData.get(matchId);
  }

  // Download CSV file for manual Google Sheets import
  downloadCSV(matchId) {
    const csvContent = localStorage.getItem(`sheet_csv_${matchId}`);
    if (!csvContent) {
      console.error('No CSV data found for match:', matchId);
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${matchId}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get instructions for creating Google Sheet
  getGoogleSheetsInstructions(matchId) {
    return {
      steps: [
        '1. Download the CSV file using the "Download CSV" button',
        '2. Go to Google Sheets (sheets.google.com)',
        '3. Create a new blank spreadsheet',
        '4. Go to File > Import',
        '5. Upload the downloaded CSV file',
        '6. Choose "Replace spreadsheet" and click "Import data"',
        '7. Share the spreadsheet with "Anyone with the link can view"',
        '8. Copy the shareable link for external applications'
      ],
      csvFileName: `match_${matchId}_data.csv`
    };
  }

  // Player data functions
  // Start listening to player registrations and automatically update Google Sheet
  startListeningToPlayers() {
    if (this.playerListener) {
      return; // Already listening
    }

    const playersQuery = query(
      collection(db, 'clubs-players'),
      orderBy('createdAt', 'desc')
    );

    this.playerListener = fsOnSnapshot(
      playersQuery,
      async (snapshot) => {
        try {
          const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Generate the sheet data
          const sheetData = this.generatePlayerSheetData(playersData);
          
          // Store in memory
          this.playerSheetData = sheetData;
          
          // Create/Update Google Sheet
          await this.createOrUpdatePlayerGoogleSheet(sheetData);
          
          // Trigger custom event for components that want to listen
          window.dispatchEvent(new CustomEvent('playerSheetDataUpdated', {
            detail: { sheetData, sheetUrl: this.playerSheetUrl }
          }));
          
          console.log('Google Sheet updated for player registrations');
        } catch (error) {
          console.error('Error processing player data:', error);
        }
      },
      (error) => {
        console.error('Error with player real-time listener:', error);
      }
    );
  }

  // Stop listening to player registrations
  stopListeningToPlayers() {
    if (this.playerListener) {
      this.playerListener();
      this.playerListener = null;
      this.playerSheetData = null;
    }
  }

  // Generate sheet data for players in tabular format
  generatePlayerSheetData(players) {
    // Create sheet data with headers and rows
    const headers = [
      'Full Name',
      'Email',
      'Phone Number',
      'Gender',
      'Date of Birth',
      'Age',
      'DUPR ID',
      'Doubles Rating',
      'Singles Rating',
      'Club Name',
      'Registration Date',
      'Why Join League',
      'Dilemma 1',
      'Dilemma 2',
      'Dilemma 3'
    ];

    const rows = players.map(player => {
      // Calculate age
      const age = this.calculateAge(player.dateOfBirth);
      
      // Format gender
      const gender = player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'N/A';
      
      // Format registration date
      let registrationDate = 'N/A';
      if (player.createdAt) {
        const dateObj = player.createdAt.toDate ? player.createdAt.toDate() : new Date(player.createdAt);
        registrationDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }

      // Format dilemma responses
      const formatDilemma1 = (value) => {
        const options = {
          'stay-course': 'Stay on course — avoid causing harm directly',
          'swerve': 'Swerve — minimise overall damage',
          'stop': 'Stop and accept whatever happens next',
          'depends': 'It depends on how serious the damage is'
        };
        return options[value] || 'N/A';
      };

      const formatDilemma2 = (value) => {
        const options = {
          'wants-more': 'Give it to the one who wants it more',
          'needs-more': 'Give it to the one who needs it more',
          'first-asked': 'Decide based on who asked first',
          'another-solution': 'Try to find another solution'
        };
        return options[value] || 'N/A';
      };

      const formatDilemma3 = (value) => {
        const options = {
          'speak-up': 'Speak up — correctness matters',
          'stay-quiet': 'Stay quiet — harmony matters',
          'speak-private': 'Speak up later in private',
          'depends-flaw': 'Decide based on how big the flaw is'
        };
        return options[value] || 'N/A';
      };

      return [
        player.fullName || 'N/A',
        player.emailId || 'N/A',
        player.mobileNumber || 'N/A',
        gender,
        player.dateOfBirth || 'N/A',
        age,
        player.duprId || 'N/A',
        player.doublesRating || player.duprRating || 'N/A',
        player.singlesRating || 'N/A',
        player.clubName || 'N/A',
        registrationDate,
        player.whyPickYou || 'N/A',
        formatDilemma1(player.dilemma1),
        formatDilemma2(player.dilemma2),
        formatDilemma3(player.dilemma3)
      ];
    });

    return {
      headers,
      rows,
      lastUpdated: new Date().toISOString()
    };
  }

  // Calculate age from date of birth
  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 'N/A';
    
    try {
      const today = new Date();
      let birth;
      
      // Handle DD-MM-YYYY format from Firebase
      if (typeof dateOfBirth === 'string' && dateOfBirth.includes('-')) {
        const parts = dateOfBirth.split('-');
        if (parts.length === 3) {
          // Convert DD-MM-YYYY to MM/DD/YYYY for proper Date parsing
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          birth = new Date(`${month}/${day}/${year}`);
        } else {
          birth = new Date(dateOfBirth);
        }
      } else {
        birth = new Date(dateOfBirth);
      }
      
      if (isNaN(birth.getTime())) {
        return 'N/A';
      }
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age.toString();
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  }

  // Create or update Google Sheet for player data
  async createOrUpdatePlayerGoogleSheet(sheetData) {
    try {
      // Check if sheet already exists
      if (!this.playerSheetUrl) {
        // Create new sheet
        this.playerSheetUrl = await this.createNewPlayerGoogleSheet(sheetData);
        
        // Store in localStorage for persistence
        localStorage.setItem('player_sheet_url', this.playerSheetUrl);
      } else {
        // Update existing sheet
        await this.updatePlayerGoogleSheet(sheetData);
      }
      
      console.log(`Google Sheet updated for player registrations: ${this.playerSheetUrl}`);
    } catch (error) {
      console.error('Error creating/updating Player Google Sheet:', error);
    }
  }

  // Create new Google Sheet for player data
  async createNewPlayerGoogleSheet(sheetData) {
    // In a real implementation, this would use Google Sheets API
    // For now, we'll simulate by creating a CSV and providing instructions
    
    const csvContent = this.generateCSV(sheetData);
    
    // Create a downloadable CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Store CSV content for later use
    localStorage.setItem('player_sheet_csv', csvContent);
    
    // Simulate Google Sheets URL (in production, this would be the actual Google Sheets URL)
    const simulatedSheetUrl = `https://docs.google.com/spreadsheets/d/player-registration-data/edit#gid=0`;
    
    console.log(`Created Google Sheet for player registrations`);
    console.log(`CSV data available for download`);
    
    return simulatedSheetUrl;
  }

  // Update existing Google Sheet for player data
  async updatePlayerGoogleSheet(sheetData) {
    // In a real implementation, this would update the existing Google Sheet
    const csvContent = this.generateCSV(sheetData);
    localStorage.setItem('player_sheet_csv', csvContent);
    
    console.log(`Updated Google Sheet for player registrations`);
  }

  // Get player sheet URL
  getPlayerSheetUrl() {
    return this.playerSheetUrl || localStorage.getItem('player_sheet_url');
  }

  // Get player sheet data
  getPlayerSheetData() {
    return this.playerSheetData;
  }

  // Download CSV file for player data
  downloadPlayerCSV() {
    const csvContent = localStorage.getItem('player_sheet_csv');
    if (!csvContent) {
      console.error('No CSV data found for player registrations');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `player_registration_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get instructions for creating Google Sheet for player data
  getPlayerGoogleSheetsInstructions() {
    return {
      steps: [
        '1. Download the CSV file using the "Download CSV" button',
        '2. Go to Google Sheets (sheets.google.com)',
        '3. Create a new blank spreadsheet',
        '4. Go to File > Import',
        '5. Upload the downloaded CSV file',
        '6. Choose "Replace spreadsheet" and click "Import data"',
        '7. Share the spreadsheet with "Anyone with the link can view"',
        '8. Copy the shareable link for external applications'
      ],
      csvFileName: `player_registration_data.csv`
    };
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.sheetsData.clear();
    this.sheetsUrls.clear();
  }
}

// Create singleton instance
const googleSheetsService = new GoogleSheetsService();

export default googleSheetsService;