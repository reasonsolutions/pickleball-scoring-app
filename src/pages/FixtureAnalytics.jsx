import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, setDoc, collectionGroup } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import * as XLSX from 'xlsx';

export default function FixtureAnalytics() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'matchNumber', direction: 'asc' });
  const [clutchUrl, setClutchUrl] = useState('');
  const [clutchData, setClutchData] = useState(null);
  const [playerMatchmakingModal, setPlayerMatchmakingModal] = useState({ isOpen: false, match: null, playerResultsData: null });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerSelections, setPlayerSelections] = useState({});
  const [savingData, setSavingData] = useState(false);
  const [playerImageIndices, setPlayerImageIndices] = useState({});
  const [matchingDoneStatus, setMatchingDoneStatus] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
        }

        // Fetch teams for this tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', tournamentId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeams(teamsData);

        // Fetch all fixtures for this tournament
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        const fixturesSnapshot = await getDocs(fixturesQuery);
        let fixturesData = fixturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter fixtures for team admins - only show matches where their team is involved
        if (isTeamAdmin() && currentUser) {
          const adminTeam = teamsData.find(team => {
            return team.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
                   team.adminUid === currentUser.uid ||
                   (currentUser.teamName && team.name?.toLowerCase() === currentUser.teamName?.toLowerCase());
          });
          
          if (adminTeam) {
            fixturesData = fixturesData.filter(match =>
              match.team1 === adminTeam.id || match.team2 === adminTeam.id
            );
          }
        }

        // Sort by match number
        fixturesData.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        setMatches(fixturesData);

        // Check matching status for all matches asynchronously
        const checkAllMatchingStatus = async () => {
          const matchingStatus = {};
          for (const match of fixturesData) {
            const isDone = await checkMatchingDone(match.id);
            matchingStatus[match.id] = isDone;
            console.log(`Match ${match.id}: Matching Done = ${isDone}`);
          }
          console.log('Final matching status:', matchingStatus);
          setMatchingDoneStatus(matchingStatus);
        };
        checkAllMatchingStatus().catch(err => console.error('Error checking matching status:', err));

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId, currentUser, isTeamAdmin]);

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getPlayersList = (player1, player2) => {
    if (!player1 && !player2) return '-';
    if (!player2) return player1;
    return `${player1}, ${player2}`;
  };

  const formatScore = (match) => {
    if (!match.scores) return '-';
    
    const scores = match.scores;
    if (!scores.player1 || !scores.player2) return '-';
    
    // Get all game scores
    const games = [];
    let gameNum = 1;
    while (scores.player1[`game${gameNum}`] !== undefined || scores.player2[`game${gameNum}`] !== undefined) {
      const p1Score = scores.player1[`game${gameNum}`] || 0;
      const p2Score = scores.player2[`game${gameNum}`] || 0;
      games.push(`${p1Score}-${p2Score}`);
      gameNum++;
    }
    
    return games.length > 0 ? games.join(', ') : '-';
  };

  // Filter matches based on search term and recording_id
  const filteredMatches = matches.filter(match => {
    // Only show matches with recording_id
    if (!match.recording_id) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      getTeamName(match.team1).toLowerCase().includes(searchLower) ||
      getTeamName(match.team2).toLowerCase().includes(searchLower) ||
      (match.player1Team1 && match.player1Team1.toLowerCase().includes(searchLower)) ||
      (match.player2Team1 && match.player2Team1.toLowerCase().includes(searchLower)) ||
      (match.player1Team2 && match.player1Team2.toLowerCase().includes(searchLower)) ||
      (match.player2Team2 && match.player2Team2.toLowerCase().includes(searchLower))
    );
  });

  // Sort matches
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
      case 'team1':
        aValue = getTeamName(a.team1);
        bValue = getTeamName(b.team1);
        break;
      case 'team2':
        aValue = getTeamName(a.team2);
        bValue = getTeamName(b.team2);
        break;
      case 'score':
        aValue = (a.team1Score || 0) - (a.team2Score || 0);
        bValue = (b.team1Score || 0) - (b.team2Score || 0);
        break;
      case 'matchNumber':
      default:
        aValue = a.matchNumber || 0;
        bValue = b.matchNumber || 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (date) => {
    if (!date) return '-';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="text-base-content/40 ml-1">⇅</span>;
    }
    return <span className="text-primary ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleImportClutchUrl = async () => {
    const url = prompt('Enter Clutch URL:');
    if (url && url.trim()) {
      try {
        const response = await fetch(url.trim());
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        setClutchUrl(url.trim());
        setClutchData(data);
        alert(`Clutch URL imported successfully! Found ${data.videos?.length || 0} videos.`);
      } catch (error) {
        console.error('Error fetching Clutch URL:', error);
        alert(`Failed to import Clutch URL: ${error.message}`);
      }
    }
  };

  const getDataFoundStatus = (recordingId) => {
    if (!clutchData || !clutchData.videos) {
      return { found: false, status: 'Data Not Found' };
    }
    
    const video = clutchData.videos.find(v => v.recording_id === recordingId);
    if (video && video.ai_parsing_status === 'success') {
      return { found: true, status: 'Data Found' };
    }
    
    return { found: false, status: 'Data Not Found' };
  };

  const checkMatchingDone = async (matchId) => {
    try {
      const clutchAnalyticsDoc = await getDoc(doc(db, 'clutch-analytics', matchId));
      return clutchAnalyticsDoc.exists();
    } catch (error) {
      console.error('Error checking matching status:', error);
      return false;
    }
  };

  const handleOpenPlayerMatchmaking = async (match) => {
    try {
      const video = clutchData.videos.find(v => v.recording_id === match.recording_id);
      if (!video || !video.player_results_url) {
        alert('Player results URL not found');
        return;
      }

      const response = await fetch(video.player_results_url);
      if (!response.ok) {
        throw new Error('Failed to fetch player results');
      }
      const playerResultsData = await response.json();
      
      // Get the players who played in this match
      const matchPlayers = [
        match.player1Team1,
        match.player2Team1,
        match.player1Team2,
        match.player2Team2
      ].filter(p => p && p.trim());
      
      setPlayerMatchmakingModal({
        isOpen: true,
        match: match,
        playerResultsData: playerResultsData,
        matchPlayers: matchPlayers
      });
      setCurrentImageIndex(0);
      setCurrentPlayerIndex(0);
      setPlayerSelections({});
    } catch (error) {
      console.error('Error opening player matchmaking:', error);
      alert(`Failed to load player matchmaking: ${error.message}`);
    }
  };

  const handleSavePlayerMatchmaking = async () => {
    try {
      setSavingData(true);
      const { match, playerResultsData } = playerMatchmakingModal;
      
      if (!playerResultsData || !playerResultsData.meta) {
        alert('Invalid player results data');
        return;
      }

      const allPlayers = [
        ...playerResultsData.meta.players.far_team,
        ...playerResultsData.meta.players.near_team
      ];

      // Function to find player ID in club-players collection
      const findPlayerIdInClubPlayers = async (playerName) => {
        try {
          // Search across all clubs for the player
          const clubsQuery = query(collection(db, 'clubs'));
          const clubsSnapshot = await getDocs(clubsQuery);
          
          for (const clubDoc of clubsSnapshot.docs) {
            const clubPlayersQuery = query(
              collection(db, 'clubs', clubDoc.id, 'club-players'),
              where('name', '==', playerName)
            );
            const playersSnapshot = await getDocs(clubPlayersQuery);
            
            if (playersSnapshot.size > 0) {
              return playersSnapshot.docs[0].id;
            }
          }
          
          return null;
        } catch (error) {
          console.error(`Error finding player ${playerName} in club-players:`, error);
          return null;
        }
      };

      const playersData = await Promise.all(
        allPlayers.map(async (playerName) => {
          const playerImageData = playerResultsData.player_images[playerName];
          const selectedPlayerName = playerSelections[playerName];
          
          // Find the player ID in club-players collection
          let clubPlayerId = null;
          if (selectedPlayerName) {
            clubPlayerId = await findPlayerIdInClubPlayers(selectedPlayerName);
          }
          
          return {
            playerName: playerName,
            playerIndex: playerImageData.player_index,
            team: playerResultsData.meta.players.far_team.includes(playerName) ? 'far_team' : 'near_team',
            images: playerImageData.images,
            selectedPlayerName: selectedPlayerName || null,
            clubPlayerId: clubPlayerId
          };
        })
      );

      const clutchAnalyticsData = {
        recordingId: playerResultsData.recording_id,
        shareUrl: playerResultsData.meta.share_url,
        gameId: playerResultsData.meta.game_id,
        players: playersData,
        gameStats: playerResultsData.game_stats,
        createdAt: new Date(),
        matchId: match.id
      };

      await setDoc(doc(db, 'clutch-analytics', match.id), clutchAnalyticsData);
      
      alert('Player matchmaking data saved successfully!');
      setPlayerMatchmakingModal({ isOpen: false, match: null, playerResultsData: null });
    } catch (error) {
      console.error('Error saving player matchmaking:', error);
      alert(`Failed to save data: ${error.message}`);
    } finally {
      setSavingData(false);
    }
  };

  const handleExportToXLSX = () => {
    if (sortedMatches.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data for export
    const exportData = sortedMatches.map((match, index) => ({
      'Match': match.matchNumber || index + 1,
      'Match Type': match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel || '-',
      'Date': formatDate(match.date),
      'Team A': getTeamName(match.team1),
      'Team A Player(s)': getPlayersList(match.player1Team1, match.player2Team1),
      'Team B': getTeamName(match.team2),
      'Team B Player(s)': getPlayersList(match.player1Team2, match.player2Team2),
      'Score': formatScore(match),
      'Recording ID': match.recording_id || '-',
      'Data Found': match.recording_id ? (getDataFoundStatus(match.recording_id).found ? 'Yes' : 'No') : '-',
      'Matching Done?': matchingDoneStatus[match.id] ? 'Yes' : 'No'
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fixture Analytics');

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 36 },
      { wch: 12 },
      { wch: 15 }
    ];

    // Generate filename with tournament name and date
    const fileName = `${tournament.name.replace(/\s+/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error || !tournament) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto">
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error || 'Tournament not found'}</span>
          </div>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/admin/tournaments')}
          >
            Back to Tournaments
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/admin/tournaments/${tournamentId}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournament
            </button>
            <div className="flex gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleImportClutchUrl}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import Clutch URL
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleExportToXLSX}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8m0 8l-4-2m4 2l4-2" />
                </svg>
                Export to XLSX
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Fixture Analytics</h1>
          <p className="text-base-content/70 text-lg">{tournament.name}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by team name or player..."
            className="input input-bordered w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <div className="text-sm text-base-content/60">Total Matches (with Recording)</div>
              <div className="text-3xl font-bold text-primary">{filteredMatches.length}</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <div className="text-sm text-base-content/60">Completed Matches</div>
              <div className="text-3xl font-bold text-success">{filteredMatches.filter(m => m.status === 'completed').length}</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <div className="text-sm text-base-content/60">Pending Matches</div>
              <div className="text-3xl font-bold text-warning">{filteredMatches.filter(m => m.status !== 'completed').length}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-base-200">
                <tr>
                  <th className="cursor-pointer hover:bg-base-300" onClick={() => handleSort('matchNumber')}>
                    Match <SortIcon columnKey="matchNumber" />
                  </th>
                  <th>Match Type</th>
                  <th>Date</th>
                  <th className="cursor-pointer hover:bg-base-300" onClick={() => handleSort('team1')}>
                    Team A <SortIcon columnKey="team1" />
                  </th>
                  <th>Team A Player(s)</th>
                  <th className="cursor-pointer hover:bg-base-300" onClick={() => handleSort('team2')}>
                    Team B <SortIcon columnKey="team2" />
                  </th>
                  <th>Team B Player(s)</th>
                  <th className="cursor-pointer hover:bg-base-300" onClick={() => handleSort('score')}>
                    Score <SortIcon columnKey="score" />
                  </th>
                  <th>Recording ID</th>
                  <th>Data Found</th>
                  <th>Matching Done?</th>
                  <th>Player Matchmaking</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-8 text-base-content/50">
                      {searchTerm ? 'No matches found matching your search' : 'No matches available'}
                    </td>
                  </tr>
                ) : (
                  sortedMatches.map((match, index) => (
                    <tr key={match.id} className={match.status === 'completed' ? 'bg-success/5' : ''}>
                      <td className="font-semibold">{match.matchNumber || index + 1}</td>
                      <td className="text-sm">{match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel || '-'}</td>
                      <td className="text-sm">{formatDate(match.date)}</td>
                      <td className="font-medium">{getTeamName(match.team1)}</td>
                      <td className="text-sm">{getPlayersList(match.player1Team1, match.player2Team1)}</td>
                      <td className="font-medium">{getTeamName(match.team2)}</td>
                      <td className="text-sm">{getPlayersList(match.player1Team2, match.player2Team2)}</td>
                      <td className="font-bold">
                        {match.status === 'completed' ? (
                          <span className="text-success">{formatScore(match)}</span>
                        ) : (
                          <span className="text-base-content/50">-</span>
                        )}
                      </td>
                      <td className="text-sm font-mono">
                        {match.recording_id ? (
                          <span className="badge badge-outline">{match.recording_id}</span>
                        ) : (
                          <span className="text-base-content/30">-</span>
                        )}
                      </td>
                      <td>
                        {match.recording_id ? (
                          getDataFoundStatus(match.recording_id).found ? (
                            <span className="badge badge-success text-white">Data Found</span>
                          ) : (
                            <span className="badge badge-outline">Data Not Found</span>
                          )
                        ) : (
                          <span className="text-base-content/30">-</span>
                        )}
                      </td>
                      <td>
                        {matchingDoneStatus[match.id] ? (
                          <span className="text-2xl text-success">✓</span>
                        ) : (
                          <span className="text-base-content/30">-</span>
                        )}
                      </td>
                      <td>
                        {match.recording_id && getDataFoundStatus(match.recording_id).found ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenPlayerMatchmaking(match)}
                          >
                            Player Matchmaking
                          </button>
                        ) : (
                          <span className="text-base-content/30">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
         <div className="mt-6 text-sm text-base-content/60">
           <p>Showing {sortedMatches.length} of {filteredMatches.length} matches with recording</p>
         </div>

        {/* Player Matchmaking Modal */}
        {playerMatchmakingModal.isOpen && playerMatchmakingModal.playerResultsData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Player Matchmaking</h2>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPlayerMatchmakingModal({ isOpen: false, match: null, playerResultsData: null })}
                  >
                    ✕
                  </button>
                </div>

                {playerMatchmakingModal.playerResultsData.meta && (
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Recording ID:</span>
                        <p className="text-base-content/70">{playerMatchmakingModal.playerResultsData.recording_id}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Game ID:</span>
                        <p className="text-base-content/70">{playerMatchmakingModal.playerResultsData.meta.game_id}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-6">
                  {playerMatchmakingModal.playerResultsData.meta &&
                    [...playerMatchmakingModal.playerResultsData.meta.players.far_team,
                     ...playerMatchmakingModal.playerResultsData.meta.players.near_team].map((playerName, idx) => {
                    const playerImageData = playerMatchmakingModal.playerResultsData.player_images[playerName];
                    const images = playerImageData?.images || [];
                    
                    return (
                      <div key={playerName} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-4">{playerName}</h3>
                        
                        {images.length > 0 ? (
                          <div className="space-y-4">
                            {/* Image Slider */}
                            <div className="flex flex-col items-center gap-4">
                              <div className="relative w-full flex items-center justify-center">
                                {/* Left Button */}
                                <button
                                  className="btn btn-circle btn-sm absolute left-0 z-10"
                                  onClick={() => setPlayerImageIndices({
                                    ...playerImageIndices,
                                    [playerName]: (playerImageIndices[playerName] || 0) === 0 ? images.length - 1 : (playerImageIndices[playerName] || 0) - 1
                                  })}
                                >
                                  ❮
                                </button>

                                {/* Image */}
                                <img
                                  src={images[playerImageIndices[playerName] || 0]}
                                  alt={`${playerName} image`}
                                  className="w-full max-w-md h-96 object-contain rounded-lg"
                                />

                                {/* Right Button */}
                                <button
                                  className="btn btn-circle btn-sm absolute right-0 z-10"
                                  onClick={() => setPlayerImageIndices({
                                    ...playerImageIndices,
                                    [playerName]: ((playerImageIndices[playerName] || 0) + 1) % images.length
                                  })}
                                >
                                  ❯
                                </button>
                              </div>

                              <div className="text-sm text-base-content/60">
                                Image {(playerImageIndices[playerName] || 0) + 1} of {images.length}
                              </div>
                            </div>

                            {/* Player Selection Dropdown */}
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">Select which player this is:</span>
                              </label>
                              <select
                                className="select select-bordered"
                                value={playerSelections[playerName] || ''}
                                onChange={(e) => setPlayerSelections({
                                  ...playerSelections,
                                  [playerName]: e.target.value
                                })}
                              >
                                <option value="">-- Select a player --</option>
                                {playerMatchmakingModal.matchPlayers && playerMatchmakingModal.matchPlayers.map((player) => (
                                  <option key={player} value={player}>
                                    {player}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <p className="text-base-content/50">No images available for this player</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Modal Actions */}
                <div className="flex gap-2 mt-6 pt-6 border-t">
                  <button
                    className="btn btn-outline flex-1"
                    onClick={() => setPlayerMatchmakingModal({ isOpen: false, match: null, playerResultsData: null })}
                    disabled={savingData}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleSavePlayerMatchmaking}
                    disabled={savingData}
                  >
                    {savingData ? <span className="loading loading-spinner loading-sm"></span> : 'Save Player Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
       </div>
     </MainLayout>
  );
}
