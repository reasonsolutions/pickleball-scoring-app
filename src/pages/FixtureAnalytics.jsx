import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
      'Recording ID': match.recording_id || '-'
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
      { wch: 36 }
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
                </tr>
              </thead>
              <tbody>
                {sortedMatches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-base-content/50">
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
      </div>
    </MainLayout>
  );
}
