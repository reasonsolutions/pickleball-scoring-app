import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function BasicScore() {
  const { matchId: rawMatchId } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract actual matchId by removing .json extension if present
  const matchId = rawMatchId?.endsWith('.json') ? rawMatchId.slice(0, -5) : rawMatchId;
  const isJsonRequest = rawMatchId?.endsWith('.json');

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
    }
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      
      // Fetch match data directly from Firestore
      const matchDoc = await getDoc(doc(db, 'fixtures', matchId));
      
      if (!matchDoc.exists()) {
        setError('No match data found');
        setLoading(false);
        return;
      }

      const matchDataRaw = { id: matchDoc.id, ...matchDoc.data() };
      
      // Fetch team data if team IDs are available
      const teamData = {};
      if (matchDataRaw.team1) {
        try {
          const team1Doc = await getDoc(doc(db, 'teams', matchDataRaw.team1));
          if (team1Doc.exists()) {
            teamData.team1 = team1Doc.data();
          }
        } catch (error) {
          console.error('Error fetching team1 data:', error);
        }
      }
      
      if (matchDataRaw.team2) {
        try {
          const team2Doc = await getDoc(doc(db, 'teams', matchDataRaw.team2));
          if (team2Doc.exists()) {
            teamData.team2 = team2Doc.data();
          }
        } catch (error) {
          console.error('Error fetching team2 data:', error);
        }
      }

      // Generate the score data
      const scoreData = generateScoreData(matchDataRaw, teamData);
      setMatchData(scoreData);
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching match data:', error);
      setError('Error loading match data');
      setLoading(false);
    }
  };

  // Generate score data (same logic as scoreJsonService)
  const generateScoreData = (match, teams) => {
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
  };

  // Set proper content type for JSON API
  useEffect(() => {
    if (isJsonRequest) {
      // Set the content type to JSON
      document.querySelector('meta[http-equiv="Content-Type"]')?.remove();
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Type');
      meta.setAttribute('content', 'application/json; charset=utf-8');
      document.head.appendChild(meta);
    }
  }, [isJsonRequest]);

  // For .json requests, return raw JSON without any styling
  if (isJsonRequest) {
    if (loading) {
      return <pre>{JSON.stringify({ status: 'loading', message: 'Fetching match data...' }, null, 2)}</pre>;
    }
    
    if (error) {
      return <pre>{JSON.stringify({ status: 'error', message: error }, null, 2)}</pre>;
    }
    
    if (matchData) {
      return <pre>{JSON.stringify(matchData, null, 2)}</pre>;
    }
    
    return <pre>{JSON.stringify({ status: 'error', message: 'No data available' }, null, 2)}</pre>;
  }

  // For regular requests, show styled UI
  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid #f3f3f3',
            borderTop: '6px solid #ff6b35',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 30px'
          }}></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
        
        <h2 style={{ color: '#ff6b35', marginBottom: '10px' }}>
          📊 Loading Match Data...
        </h2>
        
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Fetching live match data for Match {matchId}
        </p>
        
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#e65100', marginTop: 0 }}>What's happening:</h4>
          <ul style={{
            textAlign: 'left',
            color: '#e65100',
            fontSize: '14px',
            paddingLeft: '20px'
          }}>
            <li>✅ Connecting to match database</li>
            <li>⏳ Fetching live score data</li>
            <li>⏳ Preparing JSON response</li>
          </ul>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#d32f2f'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Return JSON data for API consumption with styling
  return (
    <pre style={{
      margin: 0,
      padding: '20px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px'
    }}>
      {JSON.stringify(matchData, null, 2)}
    </pre>
  );
}