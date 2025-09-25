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

export default function StreamingOverlay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Team logo mapping
  const teamLogos = {
    'HPL': hplLogoWhite,
    'Challenger': challengerLogo,
    'Centre Court': centrecourtLogo,
    'Mavericks': mavericksLogo,
    'All Stars': allstarsLogo,
    'Dasos': dasosLogo,
    'Starry Smashers': starrysmashersLogo,
    'Keerthi': keerthiLogo,
    'Nandi': nandiLogo,
    'Teramor Titans': teramorLogo,
    'Raptors': raptorsLogo
  };

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

            // Fetch team details for logos
            const teamsData = {};
            
            if (matchData.team1) {
              try {
                const team1Doc = await getDoc(doc(db, 'teams', matchData.team1));
                if (team1Doc.exists()) {
                  const team1Data = { id: team1Doc.id, ...team1Doc.data() };
                  teamsData.team1 = team1Data;
                }
              } catch (team1Error) {
                console.error('Error fetching team1:', team1Error);
              }
            }
            if (matchData.team2) {
              try {
                const team2Doc = await getDoc(doc(db, 'teams', matchData.team2));
                if (team2Doc.exists()) {
                  const team2Data = { id: team2Doc.id, ...team2Doc.data() };
                  teamsData.team2 = team2Data;
                }
              } catch (team2Error) {
                console.error('Error fetching team2:', team2Error);
              }
            }
            setTeams(teamsData);
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
        console.error('Error listening to match:', error);
        setError('Failed to load match data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'Match not found'}</div>
      </div>
    );
  }

  const getTeamLogo = (teamKey) => {
    // Check different possible logo field structures
    if (teams[teamKey]) {
      // Try logoUrl field first
      if (teams[teamKey].logoUrl) {
        return teams[teamKey].logoUrl;
      }
      
      // Try logo.url structure (based on Firestore rules)
      if (teams[teamKey].logo && teams[teamKey].logo.url) {
        return teams[teamKey].logo.url;
      }
      
      // Try direct logo field
      if (teams[teamKey].logo && typeof teams[teamKey].logo === 'string') {
        return teams[teamKey].logo;
      }
    }
    
    // Only use fallback if absolutely no data is available
    return hplLogoWhite;
  };

  const formatScore = (playerKey) => {
    if (!match.scores || !match.scores[playerKey]) return '0';
    
    const playerScores = match.scores[playerKey];
    let totalScore = 0;
    
    // Sum up all game scores for the player
    Object.keys(playerScores).forEach(gameKey => {
      if (gameKey.startsWith('game')) {
        totalScore += playerScores[gameKey] || 0;
      }
    });
    
    return totalScore.toString();
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Streaming Overlay positioned at bottom center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-7xl px-4">
        <div className="relative h-20 sm:h-24 lg:h-28">
          
          {/* Left Team Card */}
          <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-50 to-amber-100 rounded-full shadow-2xl border-2 border-amber-200 flex items-center px-6 pr-20" style={{ width: '45%' }}>
            {/* Team 1 Logo */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-2 border-gray-200 flex-shrink-0 mr-4">
              <img
                src={getTeamLogo('team1')}
                alt={match.team1Name}
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain"
              />
            </div>
            
            {/* Team 1 Info */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-black uppercase tracking-wider truncate">
                {match.team1Name}
              </div>
              <div className="text-sm sm:text-base lg:text-lg font-bold text-black truncate">
                {match.player1Team1 && match.player2Team1
                  ? `${match.player1Team1}/${match.player2Team1}`
                  : match.player1Team1 || 'TBD'
                }
              </div>
            </div>
            
            {/* Pool/Court indicator for Team 1 */}
            {match.pool && (
              <div className="bg-yellow-400 text-black px-2 py-1 rounded-full font-bold text-sm flex-shrink-0 ml-2">
                {match.pool}
              </div>
            )}
          </div>

          {/* Right Team Card */}
          <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-amber-50 to-amber-100 rounded-full shadow-2xl border-2 border-amber-200 flex items-center justify-end px-6 pl-20" style={{ width: '45%' }}>
            {/* Court indicator for Team 2 */}
            {match.court && (
              <div className="bg-yellow-400 text-black px-2 py-1 rounded-full font-bold text-sm flex-shrink-0 mr-2">
                Court {match.court}
              </div>
            )}
            
            {/* Team 2 Info */}
            <div className="flex flex-col min-w-0 flex-1 text-right">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-black uppercase tracking-wider truncate">
                {match.team2Name}
              </div>
              <div className="text-sm sm:text-base lg:text-lg font-bold text-black truncate">
                {match.player1Team2 && match.player2Team2
                  ? `${match.player1Team2}/${match.player2Team2}`
                  : match.player1Team2 || 'TBD'
                }
              </div>
            </div>
            
            {/* Team 2 Logo */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-2 border-gray-200 flex-shrink-0 ml-4">
              <img
                src={getTeamLogo('team2')}
                alt={match.team2Name}
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain"
              />
            </div>
          </div>

          {/* Center Section */}
          <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-full flex flex-col items-center justify-center space-y-1 z-10">
            {/* Tournament Type */}
            <div className="text-xs sm:text-sm lg:text-base font-bold text-white uppercase tracking-wider bg-black px-3 py-1 rounded">
              {tournament?.format || 'Round Robin'}
            </div>
            
            {/* Score Display */}
            <div className="bg-red-600 text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-full shadow-2xl border-2 border-red-700">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black">
                  {formatScore('player1')}
                </span>
                <span className="text-xl sm:text-2xl lg:text-3xl font-light text-red-200">|</span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black">
                  {formatScore('player2')}
                </span>
              </div>
            </div>
            
            {/* Match Type */}
            <div className="bg-red-600 text-white px-4 sm:px-5 lg:px-6 py-1 sm:py-2 rounded-full shadow-lg border border-red-700">
              <span className="text-sm sm:text-base lg:text-lg font-bold">
                {match.matchTypeLabel || match.matchType || 'Match'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}