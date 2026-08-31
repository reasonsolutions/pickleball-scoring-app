import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMatchDayById, getPassesByMatchDay } from '../services/ticketingService';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import PassQRModal from '../components/PassQRModal';

export default function MatchDayOrders() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [matchDay, setMatchDay] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userNames, setUserNames] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [activeTab, setActiveTab] = useState('passes'); // 'passes' or 'allocation'
  const [teamAllocations, setTeamAllocations] = useState({});
  const [savingAllocations, setSavingAllocations] = useState(false);
  const [allTeams, setAllTeams] = useState([]); // Array of team objects with id and name
  const [qrModal, setQrModal] = useState(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matchDayData, passesData] = await Promise.all([
        getMatchDayById(id),
        getPassesByMatchDay(id)
      ]);
      
      setMatchDay(matchDayData);
      setPasses(passesData);
      
      // Now fetch teams using the tournamentId from matchDayData
      if (matchDayData?.tournamentId) {
        await fetchAllTeamsWithTournamentId(matchDayData.tournamentId);
      }
      
      // Fetch user names for both actionBy and userId fields
      const actionByIds = passesData.map(pass => pass.actionBy).filter(Boolean);
      const userIds = passesData.map(pass => pass.userId).filter(Boolean);
      const uniqueUserIds = [...new Set([...actionByIds, ...userIds])];
      const userNamesMap = {};
      
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'ccpl-users', userId));
            if (userDoc.exists()) {
              userNamesMap[userId] = userDoc.data().name || 'Unknown';
            } else {
              userNamesMap[userId] = 'Unknown';
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            userNamesMap[userId] = 'Unknown';
          }
        })
      );
      
      setUserNames(userNamesMap);
      
      // Fetch team allocations (ignore errors if subcollection doesn't exist yet)
      await fetchTeamAllocations();
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load passes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeamsWithTournamentId = async (tournamentId) => {
    try {
      if (!tournamentId) {
        console.error('No tournament ID provided');
        return;
      }

      // Fetch all teams that belong to this tournament
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const tournamentTeams = teamsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(team => team.tournamentId === tournamentId)
        .map(team => ({ id: team.id, name: team.name }))
        .filter(team => team.name);
      
      // Sort by team name
      tournamentTeams.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add CCPL as a hardcoded team for superadmin pass requests
      tournamentTeams.push({
        id: 'CCPL_SUPERADMIN_TEAM',
        name: 'CCPL'
      });
      
      setAllTeams(tournamentTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchTeamAllocations = async () => {
    try {
      // Fetch all allocation documents from the allocation subcollection (keyed by teamId)
      const allocationsSnapshot = await getDocs(collection(db, 'ticketing', id, 'allocation'));
      const allocations = {};
      
      allocationsSnapshot.docs.forEach(doc => {
        allocations[doc.id] = doc.data().allocated || 0;
      });
      
      setTeamAllocations(allocations);
    } catch (error) {
      console.error('Error fetching team allocations:', error);
    }
  };

  const handleSaveAllocations = async () => {
    try {
      setSavingAllocations(true);
      
      // Save each team's allocation as a separate document in the allocation subcollection
      // Document ID is the teamId
      const savePromises = Object.entries(teamAllocations).map(([teamId, allocated]) => {
        const team = allTeams.find(t => t.id === teamId);
        const allocationRef = doc(db, 'ticketing', id, 'allocation', teamId);
        return setDoc(allocationRef, {
          teamId,
          teamName: team?.name || '',
          allocated: parseInt(allocated) || 0,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(savePromises);
      alert('Team allocations saved successfully!');
    } catch (error) {
      console.error('Error saving allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setSavingAllocations(false);
    }
  };

  const handleAllocationChange = (teamId, value) => {
    setTeamAllocations(prev => ({
      ...prev,
      [teamId]: parseInt(value) || 0
    }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return 'N/A';
  };

  // Get unique statuses and teams for filter dropdowns
  const uniqueStatuses = [...new Set(passes.map(pass => pass.status).filter(Boolean))];
  const uniqueTeams = [...new Set(passes.map(pass => pass.team).filter(Boolean))];

  // Filter passes based on search term, status, and team
  const filteredPasses = passes.filter(pass => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        pass.name?.toLowerCase().includes(search) ||
        pass.phoneNumber?.toLowerCase().includes(search) ||
        pass.team?.toLowerCase().includes(search) ||
        pass.note?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter && pass.status !== statusFilter) {
      return false;
    }
    
    // Team filter
    if (teamFilter && pass.team !== teamFilter) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/ticketing')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ticketing
        </button>
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{matchDay?.name}</h1>
            <p className="text-gray-600">Pass Management</p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Passes</p>
                <p className="text-lg font-bold text-gray-900">{passes.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Passes Requested</p>
                <p className="text-lg font-bold text-yellow-600">
                  {passes.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Passes Declined</p>
                <p className="text-lg font-bold text-red-600">
                  {passes.filter(p => p.status === 'declined' || p.status === 'rejected').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Passes Issued</p>
                <p className="text-lg font-bold text-green-600">
                  {passes.filter(p => p.status === 'approved' || p.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('passes')}
              className={`${
                activeTab === 'passes'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Pass Requests
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`${
                activeTab === 'allocation'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Team Allocation
            </button>
          </nav>
        </div>
      </div>

      {/* Passes Tab Content */}
      {activeTab === 'passes' && (
        <>
          {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, team, or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex-1">
            <label htmlFor="team-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Team
            </label>
            <select
              id="team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter || teamFilter || searchTerm) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setTeamFilter('');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {(searchTerm || statusFilter || teamFilter) && (
          <p className="text-sm text-gray-600">
            Found {filteredPasses.length} pass{filteredPasses.length !== 1 ? 'es' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter && ` with status "${statusFilter}"`}
            {teamFilter && ` in team "${teamFilter}"`}
          </p>
        )}
      </div>

      {/* Passes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pass ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Num Passes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Note
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPasses.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">
                      {searchTerm ? 'No matching passes found' : 'No passes yet'}
                    </p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 'Try a different search term' : 'Passes haven\'t been generated for this match day'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPasses.map((pass) => (
                <tr key={pass.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {pass.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {pass.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pass.phoneNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.team || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.userId ? (userNames[pass.userId] || 'Loading...') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {pass.numPasses || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pass.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : pass.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : pass.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pass.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.actionBy ? (userNames[pass.actionBy] || 'Loading...') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={pass.note}>
                    {pass.note || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(pass.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {(pass.status === 'approved' || pass.status === 'confirmed') ? (
                      <button
                        onClick={() => setQrModal(pass)}
                        className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="View QR Codes"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <PassQRModal
          pass={qrModal}
          matchDayName={matchDay?.name}
          onClose={() => setQrModal(null)}
        />
      )}
        </>
      )}

      {/* Allocation Tab Content */}
      {activeTab === 'allocation' && (
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Team Pass Allocation</h2>
              <p className="text-gray-600">Set the number of passes allocated to each team for this match day.</p>
            </div>

            <div className="space-y-4">
              {allTeams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No teams found</p>
                  <p className="text-sm mt-1">Teams will appear here once they are added to the tournament</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allTeams.map(team => {
                      const teamPasses = passes.filter(p => p.teamId === team.id);
                      const requested = teamPasses.filter(p => p.status === 'pending').length;
                      const issued = teamPasses.filter(p => p.status === 'approved' || p.status === 'confirmed').length;
                      const allocated = teamAllocations[team.id] || 0;

                      return (
                        <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">{team.name}</h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Requested:</span>
                              <span className="font-medium text-yellow-600">{requested}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Issued:</span>
                              <span className="font-medium text-green-600">{issued}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Remaining:</span>
                              <span className="font-medium text-blue-600">{Math.max(0, allocated - issued)}</span>
                            </div>
                          </div>

                          <div>
                            <label htmlFor={`allocation-${team.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              Allocated Passes
                            </label>
                            <input
                              id={`allocation-${team.id}`}
                              type="number"
                              min="0"
                              value={teamAllocations[team.id] || 0}
                              onChange={(e) => handleAllocationChange(team.id, e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveAllocations}
                      disabled={savingAllocations}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingAllocations ? 'Saving...' : 'Save Allocations'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
