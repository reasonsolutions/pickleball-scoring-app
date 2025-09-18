import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function BasicScore() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!matchId) return;

    // Set up real-time listener for the match
    const unsubscribe = onSnapshot(
      doc(db, 'fixtures', matchId),
      async (matchDoc) => {
        try {
          if (matchDoc.exists()) {
            const matchData = { id: matchDoc.id, ...matchDoc.data() };
            setMatch(matchData);
            
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
            
            setTeams(teamData);
          } else {
            setError('Match not found');
          }
        } catch (error) {
          console.error('Error fetching match:', error);
          setError('Failed to load match data');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error with real-time listener:', error);
        setError('Failed to connect to match data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Error loading match</div>
      </div>
    );
  }

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

  return (
    <pre>
      {JSON.stringify(tableData, null, 2)}
    </pre>
  );
}