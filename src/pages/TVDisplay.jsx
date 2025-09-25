import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import hplLogoWhite from '../assets/hpllogo_white.png';
import challengerLogo from '../assets/challenger.png';
import centrecourtLogo from '../assets/centrecourt_logo.png';
import mavericksLogo from '../assets/mavericks.png';
import allstarsLogo from '../assets/allstars.png';
import dasosLogo from '../assets/dasos.png';
import starrysmashersLogo from '../assets/starrysmashers.png';
import keerthiLogo from '../assets/keerthi.png';
import nandiLogo from '../assets/nandi.png';
import teramorLogo from '../assets/teramor.png';
import raptorsLogo from '../assets/raptors.png';

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
      <div className="tv-display-pro">
        <div className="tv-loading-pro">
          <div className="tv-spinner-pro"></div>
          <div className="tv-loading-text-pro">Loading Match...</div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="tv-display-pro">
        <div className="tv-error-pro">
          <div className="tv-error-icon-pro">⚠️</div>
          <div className="tv-error-text-pro">{error || 'Match not found'}</div>
        </div>
      </div>
    );
  }

  // Extract current game scores from match data
  const getScores = () => {
    if (!match.scores) {
      return {
        player1Score: 0,
        player2Score: 0,
        currentGame: 1
      };
    }

    // Find the current game being played (first game with scores < target or last game)
    const gamesCount = match.gamesCount || 1;
    const pointsPerGame = match.pointsPerGame || [11];
    let currentGameIndex = 0;

    // Find current game by looking for the first incomplete game
    for (let i = 0; i < gamesCount; i++) {
      const gameKey = `game${i + 1}`;
      const p1Score = match.scores.player1?.[gameKey] || 0;
      const p2Score = match.scores.player2?.[gameKey] || 0;
      const targetPoints = pointsPerGame[i] || 11;
      
      // If this game is not finished (neither player reached target with 2-point lead)
      if (p1Score < targetPoints && p2Score < targetPoints) {
        currentGameIndex = i;
        break;
      } else if (Math.abs(p1Score - p2Score) < 2) {
        currentGameIndex = i;
        break;
      } else if (i === gamesCount - 1) {
        // Last game, use it regardless
        currentGameIndex = i;
      }
    }

    const currentGameKey = `game${currentGameIndex + 1}`;
    const player1Score = match.scores.player1?.[currentGameKey] || 0;
    const player2Score = match.scores.player2?.[currentGameKey] || 0;

    return {
      player1Score,
      player2Score,
      currentGame: currentGameIndex + 1
    };
  };

  const { player1Score, player2Score } = getScores();
  const isLive = match.status === 'live';

  // Function to get team logo based on team name
  const getTeamLogo = (teamName) => {
    if (!teamName) return null;
    
    const teamNameLower = teamName.toLowerCase();
    
    if (teamNameLower.includes('mavericks')) return mavericksLogo;
    if (teamNameLower.includes('all stars') || teamNameLower.includes('allstars')) return allstarsLogo;
    if (teamNameLower.includes('challenger') || teamNameLower.includes('spirit')) return challengerLogo;
    if (teamNameLower.includes('raptors')) return raptorsLogo;
    if (teamNameLower.includes('titans') || teamNameLower.includes('teramor')) return teramorLogo;
    if (teamNameLower.includes('nandi') || teamNameLower.includes('chargers')) return nandiLogo;
    if (teamNameLower.includes('keerthi') || teamNameLower.includes('warriors')) return keerthiLogo;
    if (teamNameLower.includes('dasos') || teamNameLower.includes('dynamic')) return dasosLogo;
    if (teamNameLower.includes('starry') || teamNameLower.includes('smashers')) return starrysmashersLogo;
    
    return null;
  };

  // Get team logos for current match
  const team1Logo = getTeamLogo(match.team1Name);
  const team2Logo = getTeamLogo(match.team2Name);

  return (
    <div className="tv-display-pro">
      {/* Header with CENTRECOURT logo */}
      <div className="tv-header-pro">
        <div className="centrecourt-logo-pro">
          <img src={centrecourtLogo} alt="Centrecourt Sports & Entertainment" className="centrecourt-logo-img" />
        </div>
      </div>

      {/* Main content area */}
      <div className="tv-main-area">
        {/* Left team logo - THE CHALLENGER SPIRIT */}
        <div className="team-logo-left-pro">
          <div className="challenger-spirit-logo">
            <img src={challengerLogo} alt="The Challenger Spirit" className="challenger-logo-img" />
          </div>
        </div>

        {/* Center section with scoreboard and surrounding logos */}
        <div className="tv-center-area">
          {/* Top logos row - Dynamic team logos */}
          <div className="top-logos-row">
            {/* Team 1 Logo */}
            {team1Logo && (
              <div className="team1-logo">
                <div className="team-logo-card">
                  <img src={team1Logo} alt={match.team1Name || 'Team 1'} className="team-card-logo" />
                </div>
              </div>
            )}

            {/* Team 2 Logo */}
            {team2Logo && (
              <div className="team2-logo">
                <div className="team-logo-card">
                  <img src={team2Logo} alt={match.team2Name || 'Team 2'} className="team-card-logo" />
                </div>
              </div>
            )}
          </div>

          {/* Main scoreboard */}
          <div className="tv-scoreboard-pro">
            <div className="player-section-left">
              <div className="player-names-stacked">
                <div className="player-name-pro">
                  {(match.player1Team1 || 'SREEKAR').toUpperCase()}
                </div>
                {(match.player2Team1) && (
                  <>
                    <div className="player-name-separator"></div>
                    <div className="player-name-pro">
                      {match.player2Team1.toUpperCase()}
                    </div>
                  </>
                )}
              </div>
              <div className="player-score-pro">{player1Score}</div>
            </div>
            
            <div className="vs-section-pro">VS</div>
            
            <div className="player-section-right">
              <div className="player-names-stacked">
                <div className="player-name-pro">
                  {(match.player1Team2 || 'SAMEER').toUpperCase()}
                </div>
                {(match.player2Team2) && (
                  <>
                    <div className="player-name-separator"></div>
                    <div className="player-name-pro">
                      {(match.player2Team2 || 'AKSHATH').toUpperCase()}
                    </div>
                  </>
                )}
              </div>
              <div className="player-score-pro">{player2Score}</div>
            </div>
          </div>
        </div>

        {/* Right team logo - HYDERABAD PICKLEBALL LEAGUE */}
        <div className="team-logo-right-pro">
          <div className="hpl-logo">
            <img src={hplLogoWhite} alt="Hyderabad Pickleball League" className="hpl-logo-img" />
          </div>
        </div>
      </div>

      {/* Bottom logos row */}
      <div className="tv-bottom-row">
        {/* The Raptors */}
        <div className="bottom-team-logo">
          <div className="raptors-logo">
            <img src={raptorsLogo} alt="The Raptors" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* Titans */}
        <div className="bottom-team-logo">
          <div className="titans-logo">
            <img src={teramorLogo} alt="Titans" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* The Mavericks (repeat) */}
        <div className="bottom-team-logo">
          <div className="mavericks-small">
            <img src={mavericksLogo} alt="The Mavericks" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* Nandi Chargers */}
        <div className="bottom-team-logo">
          <div className="nandi-logo">
            <img src={nandiLogo} alt="Nandi Chargers" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* Keerthi Warriors */}
        <div className="bottom-team-logo">
          <div className="keerthi-logo">
            <img src={keerthiLogo} alt="Keerthi Warriors" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* Dasos Dynamic */}
        <div className="bottom-team-logo">
          <div className="dasos-logo">
            <img src={dasosLogo} alt="Dasos Dynamic" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* All Stars (repeat) */}
        <div className="bottom-team-logo">
          <div className="allstars-small">
            <img src={allstarsLogo} alt="All Stars" className="bottom-team-logo-img" />
          </div>
        </div>

        {/* Starry Smashers */}
        <div className="bottom-team-logo">
          <div className="smashers-logo">
            <img src={starrysmashersLogo} alt="Starry Smashers" className="bottom-team-logo-img" />
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="tv-live-indicator-pro">
          <div className="live-dot-pro"></div>
          LIVE
        </div>
      )}
    </div>
  );
}