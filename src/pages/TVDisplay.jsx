import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function TVDisplay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
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

            // Fetch tournament details
            if (matchData.tournamentId) {
              const tournamentDoc = await getDoc(doc(db, 'tournaments', matchData.tournamentId));
              if (tournamentDoc.exists()) {
                setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
              }
            }
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
      <div className="tv-display-container">
        <div className="tv-loading">
          <div className="tv-spinner"></div>
          <div className="tv-loading-text">Loading Match...</div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="tv-display-container">
        <div className="tv-error">
          <div className="tv-error-icon">⚠️</div>
          <div className="tv-error-text">{error || 'Match not found'}</div>
        </div>
      </div>
    );
  }

  // Extract scores from match data
  const getScores = () => {
    if (!match.scores) {
      return {
        player1Scores: ['-', '-', '-'],
        player2Scores: ['-', '-', '-']
      };
    }

    const player1Scores = [];
    const player2Scores = [];
    const gamesCount = match.gamesCount || 3;

    for (let i = 1; i <= gamesCount; i++) {
      const gameKey = `game${i}`;
      player1Scores.push(match.scores.player1?.[gameKey] ?? '-');
      player2Scores.push(match.scores.player2?.[gameKey] ?? '-');
    }

    return { player1Scores, player2Scores };
  };

  const { player1Scores, player2Scores } = getScores();
  const isLive = match.status === 'live';

  return (
    <div className="tv-display-container">
      {/* Tournament Header */}
      <div className="tv-header">
        <div className="tv-tournament-name">
          {tournament?.name || tournament?.tournamentName || 'Tournament'}
        </div>
        <div className="tv-match-info">
          <span className="tv-match-type">{match.matchTypeLabel || match.matchType}</span>
          {match.time && <span className="tv-match-time">{match.time}</span>}
          {isLive && (
            <div className="tv-live-indicator">
              <div className="tv-live-dot"></div>
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Main Score Card */}
      <div className="tv-score-card">
        {/* Team 1 */}
        <div className="tv-team-row">
          <div className="tv-team-info">
            <div className="tv-players">
              {match.player1Team1 && (
                <div className="tv-player-name">{match.player1Team1}</div>
              )}
              {match.player2Team1 && (
                <div className="tv-player-name">{match.player2Team1}</div>
              )}
            </div>
            <div className="tv-team-name">{match.team1Name}</div>
          </div>
          <div className="tv-scores">
            {player1Scores.map((score, index) => (
              <div key={index} className="tv-score-box">
                {score}
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider */}
        <div className="tv-vs-divider">
          <span>VS</span>
        </div>

        {/* Team 2 */}
        <div className="tv-team-row">
          <div className="tv-team-info">
            <div className="tv-players">
              {match.player1Team2 && (
                <div className="tv-player-name">{match.player1Team2}</div>
              )}
              {match.player2Team2 && (
                <div className="tv-player-name">{match.player2Team2}</div>
              )}
            </div>
            <div className="tv-team-name">{match.team2Name}</div>
          </div>
          <div className="tv-scores">
            {player2Scores.map((score, index) => (
              <div key={index} className="tv-score-box">
                {score}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="tv-footer">
        <div className="tv-date">
          {match.date && match.date.toDate ? 
            match.date.toDate().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 
            'Match Date'
          }
        </div>
        <div className="tv-status">
          {match.status === 'completed' ? 'Final' : 
           match.status === 'live' ? 'Live' : 
           match.status === 'in-progress' ? 'In Progress' : 
           'Scheduled'}
        </div>
      </div>
    </div>
  );
}