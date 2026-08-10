import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function HplPlayerRankings() {
  const [menSinglesRankings, setMenSinglesRankings] = useState([]);
  const [menDoublesRankings, setMenDoublesRankings] = useState([]);
  const [womenSinglesRankings, setWomenSinglesRankings] = useState([]);
  const [womenDoublesRankings, setWomenDoublesRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState('men');
  const [activeFormat, setActiveFormat] = useState('singles');

  // Fixed tournament ID for CCPL Clubs
  const TOURNAMENT_ID = 'nKAu6TNNWBcSvRL14oeK';

  useEffect(() => {
    fetchPlayerRankings();
  }, []);

  const fetchPlayerRankings = async () => {
    try {
      setLoading(true);

      // Fetch all fixtures for the CCPL Clubs tournament
      const fixturesRef = collection(db, 'fixtures');
      const fixturesQuery = query(fixturesRef, where('tournamentId', '==', TOURNAMENT_ID));
      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      const playerStatsSingles = {};
      const playerStatsDoubles = {};

      // Process each fixture
      fixturesSnapshot.forEach((doc) => {
        const fixture = doc.data();
        
        // Only process completed fixtures
        if (fixture.status === 'completed' && fixture.scores) {
          const player1Scores = fixture.scores.player1 || {};
          const player2Scores = fixture.scores.player2 || {};
          
          let player1Games = 0;
          let player2Games = 0;
          
          const totalGames = fixture.gamesCount || 1;
          
          // Count games won
          for (let i = 1; i <= totalGames; i++) {
            const gameKey = `game${i}`;
            const player1Score = parseInt(player1Scores[gameKey]) || 0;
            const player2Score = parseInt(player2Scores[gameKey]) || 0;
            
            if (player1Score > player2Score) {
              player1Games++;
            } else if (player2Score > player1Score) {
              player2Games++;
            }
          }
          
          const team1Name = fixture.team1Name || 'Unknown Team';
          const team2Name = fixture.team2Name || 'Unknown Team';
          
          // Determine if it's singles or doubles based on matchType
          const isMensSingles = fixture.matchType === 'mensSingles';
          const isWomensSingles = fixture.matchType === 'womensSingles';
          const isMensDoubles = fixture.matchType === 'mensDoubles';
          const isWomensDoubles = fixture.matchType === 'womensDoubles';
          const isMixedDoubles = fixture.matchType === 'mixedDoubles';
          
          // For singles: only player1Team1 and player1Team2
          if (isMensSingles || isWomensSingles) {
            const player1Name = fixture.player1Team1;
            const player2Name = fixture.player1Team2;
            
            if (player1Name) {
              if (!playerStatsSingles[player1Name]) {
                playerStatsSingles[player1Name] = {
                  name: player1Name,
                  teamName: team1Name,
                  matchesWon: 0,
                  matchesLost: 0,
                  totalMatches: 0,
                  gender: 'unknown'
                };
              }
              
              playerStatsSingles[player1Name].totalMatches++;
              if (player1Games > player2Games) {
                playerStatsSingles[player1Name].matchesWon++;
              } else if (player2Games > player1Games) {
                playerStatsSingles[player1Name].matchesLost++;
              }
            }
            
            if (player2Name) {
              if (!playerStatsSingles[player2Name]) {
                playerStatsSingles[player2Name] = {
                  name: player2Name,
                  teamName: team2Name,
                  matchesWon: 0,
                  matchesLost: 0,
                  totalMatches: 0,
                  gender: 'unknown'
                };
              }
              
              playerStatsSingles[player2Name].totalMatches++;
              if (player2Games > player1Games) {
                playerStatsSingles[player2Name].matchesWon++;
              } else if (player1Games > player2Games) {
                playerStatsSingles[player2Name].matchesLost++;
              }
            }
          }
          
          // For doubles: all 4 players
          if (isMensDoubles || isWomensDoubles || isMixedDoubles) {
            // Team 1 players: player1Team1 and player2Team1
            const team1Players = [];
            if (fixture.player1Team1) team1Players.push(fixture.player1Team1);
            if (fixture.player2Team1) team1Players.push(fixture.player2Team1);
            
            // Team 2 players: player1Team2 and player2Team2
            const team2Players = [];
            if (fixture.player1Team2) team2Players.push(fixture.player1Team2);
            if (fixture.player2Team2) team2Players.push(fixture.player2Team2);
            
            // Update stats for all team 1 players
            team1Players.forEach(playerName => {
              if (!playerStatsDoubles[playerName]) {
                playerStatsDoubles[playerName] = {
                  name: playerName,
                  teamName: team1Name,
                  matchesWon: 0,
                  matchesLost: 0,
                  totalMatches: 0,
                  gender: 'unknown'
                };
              }
              
              playerStatsDoubles[playerName].totalMatches++;
              if (player1Games > player2Games) {
                playerStatsDoubles[playerName].matchesWon++;
              } else if (player2Games > player1Games) {
                playerStatsDoubles[playerName].matchesLost++;
              }
            });
            
            // Update stats for all team 2 players
            team2Players.forEach(playerName => {
              if (!playerStatsDoubles[playerName]) {
                playerStatsDoubles[playerName] = {
                  name: playerName,
                  teamName: team2Name,
                  matchesWon: 0,
                  matchesLost: 0,
                  totalMatches: 0,
                  gender: 'unknown'
                };
              }
              
              playerStatsDoubles[playerName].totalMatches++;
              if (player2Games > player1Games) {
                playerStatsDoubles[playerName].matchesWon++;
              } else if (player1Games > player2Games) {
                playerStatsDoubles[playerName].matchesLost++;
              }
            });
          }
        }
      });

      // Fetch all players to get gender information and photos
      const playersRef = collection(db, 'players');
      const playersQuery = query(playersRef, where('tournamentId', '==', TOURNAMENT_ID));
      const playersSnapshot = await getDocs(playersQuery);
      
      const playerGenderMap = {};
      playersSnapshot.forEach((doc) => {
        const player = doc.data();
        if (player.name) {
          playerGenderMap[player.name] = {
            gender: player.gender || 'unknown',
            photoUrl: player.photo?.url || null,
            duprRating: player.duprRating || null
          };
        }
      });

      // Merge gender and photo information for singles
      Object.keys(playerStatsSingles).forEach(playerName => {
        if (playerGenderMap[playerName]) {
          playerStatsSingles[playerName].gender = playerGenderMap[playerName].gender;
          playerStatsSingles[playerName].photoUrl = playerGenderMap[playerName].photoUrl;
          playerStatsSingles[playerName].duprRating = playerGenderMap[playerName].duprRating;
        }
      });

      // Merge gender and photo information for doubles
      Object.keys(playerStatsDoubles).forEach(playerName => {
        if (playerGenderMap[playerName]) {
          playerStatsDoubles[playerName].gender = playerGenderMap[playerName].gender;
          playerStatsDoubles[playerName].photoUrl = playerGenderMap[playerName].photoUrl;
          playerStatsDoubles[playerName].duprRating = playerGenderMap[playerName].duprRating;
        }
      });

      // Convert to array and filter out players with no matches
      const singlesWithStats = Object.values(playerStatsSingles).filter(p => p.totalMatches > 0);
      const doublesWithStats = Object.values(playerStatsDoubles).filter(p => p.totalMatches > 0);

      // Helper function to sort by wins first, then by losses (ascending)
      const compareRankings = (a, b) => {
        // First, sort by matches won (descending)
        if (b.matchesWon !== a.matchesWon) {
          return b.matchesWon - a.matchesWon;
        }
        // If wins are equal, sort by matches lost (ascending - fewer losses is better)
        return a.matchesLost - b.matchesLost;
      };

      // Separate by gender and sort by wins then losses - Singles
      const menSingles = singlesWithStats
        .filter(p => {
          const gender = p.gender?.toLowerCase();
          return gender === 'male' || gender === 'm';
        })
        .sort(compareRankings)
        .slice(0, 10);

      const womenSingles = singlesWithStats
        .filter(p => {
          const gender = p.gender?.toLowerCase();
          return gender === 'female' || gender === 'f';
        })
        .sort(compareRankings)
        .slice(0, 10);

      // Separate by gender and sort by wins then losses - Doubles
      const menDoubles = doublesWithStats
        .filter(p => {
          const gender = p.gender?.toLowerCase();
          return gender === 'male' || gender === 'm';
        })
        .sort(compareRankings)
        .slice(0, 10);

      const womenDoubles = doublesWithStats
        .filter(p => {
          const gender = p.gender?.toLowerCase();
          return gender === 'female' || gender === 'f';
        })
        .sort(compareRankings)
        .slice(0, 10);

      setMenSinglesRankings(menSingles);
      setMenDoublesRankings(menDoubles);
      setWomenSinglesRankings(womenSingles);
      setWomenDoublesRankings(womenDoubles);
    } catch (error) {
      console.error('Error fetching player rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const RankingCard = ({ player, index }) => (
    <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-orange-500 border-opacity-30 hover:bg-gray-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {index + 1}
            </span>
          </div>
          <div className="flex-shrink-0">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-orange-500"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-500">
                <span className="text-white font-bold text-xs">
                  {player.name?.charAt(0)?.toUpperCase() || 'P'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {player.name || 'Unknown Player'}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {player.teamName}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Won</div>
          <div className="inline-flex items-center justify-center w-full px-2 py-1 rounded-lg bg-green-500 bg-opacity-20 border border-green-500 border-opacity-50">
            <span className="text-sm font-bold text-green-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {player.matchesWon}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Lost</div>
          <div className="inline-flex items-center justify-center w-full px-2 py-1 rounded-lg bg-red-500 bg-opacity-20 border border-red-500 border-opacity-50">
            <span className="text-sm font-bold text-red-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
              {player.matchesLost}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const RankingTable = ({ rankings, title }) => (
    <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-3xl shadow-2xl overflow-hidden border border-orange-500 border-opacity-30">
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4 md:px-8 md:py-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
          {title}
        </h2>
      </div>

      {rankings.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-400">No player data available</div>
        </div>
      ) : (
        <>
          {/* Mobile View - Cards */}
          <div className="md:hidden p-4">
            {rankings.map((player, index) => (
              <RankingCard key={player.name} player={player} index={index} />
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b-2 border-orange-500">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-orange-400 uppercase tracking-wider" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-orange-400 uppercase tracking-wider" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-orange-400 uppercase tracking-wider" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Team
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-green-400 uppercase tracking-wider bg-green-500 bg-opacity-10" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Matches Won
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-red-400 uppercase tracking-wider bg-red-500 bg-opacity-10" style={{ fontFamily: 'Avantique, sans-serif' }}>
                    Matches Lost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-orange-500 divide-opacity-20">
                {rankings.map((player, index) => (
                  <tr 
                    key={player.name} 
                    className="hover:bg-gray-700 transition-all duration-300 hover:shadow-lg"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg" style={{ fontFamily: 'Avantique, sans-serif' }}>
                            {index + 1}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-500 shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {player.name?.charAt(0)?.toUpperCase() || 'P'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white" style={{ fontFamily: 'Avantique, sans-serif' }}>
                            {player.name || 'Unknown Player'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-300" style={{ fontFamily: 'Avantique, sans-serif' }}>
                        {player.teamName}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-500 bg-opacity-20 border border-green-500 border-opacity-50">
                        <span className="text-lg font-bold text-green-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {player.matchesWon}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-500 bg-opacity-20 border border-red-500 border-opacity-50">
                        <span className="text-lg font-bold text-red-400" style={{ fontFamily: 'Avantique, sans-serif' }}>
                          {player.matchesLost}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const getRankings = () => {
    if (activeGender === 'men') {
      return activeFormat === 'singles' ? menSinglesRankings : menDoublesRankings;
    } else {
      return activeFormat === 'singles' ? womenSinglesRankings : womenDoublesRankings;
    }
  };

  const getTitle = () => {
    const genderLabel = activeGender === 'men' ? "Men's" : "Women's";
    const formatLabel = activeFormat === 'singles' ? 'Singles' : 'Doubles';
    return `🏆 ${genderLabel} ${formatLabel} Rankings`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>

      <NewHomeNavbar />

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-8 md:py-12">
        {/* Page Title */}
        <div className="mb-8 md:mb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4" style={{ fontFamily: 'Avantique, sans-serif' }}>
            Player Rankings
          </h1>
          <p className="text-base md:text-xl text-gray-400">Top 10 Players by Matches Won</p>
        </div>

        {/* Gender Tab Navigation */}
        <div className="mb-6 md:mb-8 flex justify-center px-2">
          <div className="inline-flex rounded-full bg-gray-800 border border-orange-500 border-opacity-30 p-1">
            <button
              onClick={() => setActiveGender('men')}
              className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${
                activeGender === 'men'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{ fontFamily: 'Avantique, sans-serif' }}
            >
              Men
            </button>
            <button
              onClick={() => setActiveGender('women')}
              className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${
                activeGender === 'women'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{ fontFamily: 'Avantique, sans-serif' }}
            >
              Women
            </button>
          </div>
        </div>

        {/* Format Tab Navigation */}
        <div className="mb-8 md:mb-12 flex justify-center px-2">
          <div className="inline-flex rounded-full bg-gray-800 border border-orange-500 border-opacity-30 p-1">
            <button
              onClick={() => setActiveFormat('singles')}
              className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${
                activeFormat === 'singles'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{ fontFamily: 'Avantique, sans-serif' }}
            >
              Singles
            </button>
            <button
              onClick={() => setActiveFormat('doubles')}
              className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${
                activeFormat === 'doubles'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{ fontFamily: 'Avantique, sans-serif' }}
            >
              Doubles
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-white">Loading player rankings...</div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <RankingTable rankings={getRankings()} title={getTitle()} />
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
