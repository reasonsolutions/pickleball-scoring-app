import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import crypto from 'crypto-js';

export default function AppUsers() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [activeTournamentId, setActiveTournamentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    teamId: ''
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch active tournament from app-settings
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      const appSettingsDoc = await getDoc(appSettingsRef);
      
      let tournamentId = '';
      if (appSettingsDoc.exists()) {
        tournamentId = appSettingsDoc.data().activeTournamentId || '';
        setActiveTournamentId(tournamentId);
      }

      // Fetch all users from ccpl-users collection
      const usersRef = collection(db, 'ccpl-users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: doc.data().type || 'user' // Default to 'user' if not set
        }))
        .filter(user => user.verified === true); // Only show verified users
      
      setUsers(usersData);

      // Fetch teams from the active tournament if available
      if (tournamentId) {
        try {
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
        } catch (teamsError) {
          console.error('Error fetching teams:', teamsError);
          // Continue without teams if there's an error
          setTeams([]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data. Please try again.' });
      setLoading(false);
    }
  };

  const handleTypeChange = async (userId, newType, currentUser) => {
    // If changing to team admin, show team selection modal
    if (newType === 'team admin') {
      if (!activeTournamentId) {
        setMessage({ 
          type: 'error', 
          text: 'No active tournament set. Please configure app settings first.' 
        });
        return;
      }
      if (teams.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'No teams found in the active tournament.' 
        });
        return;
      }
      setSelectedUser({ id: userId, ...currentUser });
      setSelectedTeam('');
      setShowTeamModal(true);
      return;
    }

    // For other types, update directly
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const userRef = doc(db, 'ccpl-users', userId);
      const updateData = { type: newType };
      
      // Remove team-related fields if not team admin
      if (newType !== 'team admin') {
        updateData.teamId = null;
        updateData.tournamentId = null;
      }

      await updateDoc(userRef, updateData);

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, type: newType, teamId: null, tournamentId: null }
          : user
      ));

      setMessage({ type: 'success', text: 'User type updated successfully!' });
      setSaving(false);
    } catch (error) {
      console.error('Error updating user type:', error);
      setMessage({ type: 'error', text: 'Failed to update user type. Please try again.' });
      setSaving(false);
    }
  };

  const handleTeamSelection = async () => {
    if (!selectedTeam) {
      setMessage({ type: 'error', text: 'Please select a team.' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const userRef = doc(db, 'ccpl-users', selectedUser.id);
      await updateDoc(userRef, {
        type: 'team admin',
        teamId: selectedTeam,
        tournamentId: activeTournamentId
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, type: 'team admin', teamId: selectedTeam, tournamentId: activeTournamentId }
          : user
      ));

      setMessage({ type: 'success', text: 'Team admin assigned successfully!' });
      setShowTeamModal(false);
      setSelectedUser(null);
      setSelectedTeam('');
      setSaving(false);
    } catch (error) {
      console.error('Error assigning team admin:', error);
      setMessage({ type: 'error', text: 'Failed to assign team admin. Please try again.' });
      setSaving(false);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const name = (user.name || user.displayName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phoneNumber || user.phone || '').toLowerCase();
    const type = (user.type || 'user').toLowerCase();
    const teamName = user.type === 'team admin' && user.teamId
      ? getTeamName(user.teamId).toLowerCase()
      : '';
    
    return name.includes(query) ||
           email.includes(query) ||
           phone.includes(query) ||
           type.includes(query) ||
           teamName.includes(query);
  });

 const handleInviteTeamAdmin = async () => {
   if (!inviteForm.name || !inviteForm.email || !inviteForm.phone || !inviteForm.teamId) {
     setMessage({ type: 'error', text: 'Please fill in all fields.' });
     return;
   }

   // Validate email format
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(inviteForm.email)) {
     setMessage({ type: 'error', text: 'Please enter a valid email address.' });
     return;
   }

   // Validate phone format (basic validation)
   if (inviteForm.phone.length < 10) {
     setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
     return;
   }

   try {
     setSendingInvite(true);
     setMessage({ type: '', text: '' });

     // Check if user already exists
     const usersRef = collection(db, 'ccpl-users');
     const emailQuery = query(usersRef, where('email', '==', inviteForm.email));
     const existingUsers = await getDocs(emailQuery);

     if (!existingUsers.empty) {
       setMessage({ type: 'error', text: 'A user with this email already exists.' });
       setSendingInvite(false);
       return;
     }

     // Generate a unique token for the invitation link
     const inviteToken = crypto.lib.WordArray.random(32).toString();
     const expiresAt = new Date();
     expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

     // Create user document in ccpl-users with verified: false
     const newUserData = {
       name: inviteForm.name,
       email: inviteForm.email,
       phone: inviteForm.phone,
       teamId: inviteForm.teamId,
       tournamentId: activeTournamentId,
       type: 'team admin',
       verified: false,
       inviteToken: inviteToken,
       inviteTokenExpiry: expiresAt,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
       password: null,
       otp: null,
       otpCreatedAt: null
     };

     const userDocRef = await addDoc(usersRef, newUserData);

     // Generate the setup password link
     const productionDomain = 'https://centrecourthyd.com';
     const setupLink = `${productionDomain}/team-admin/setup-password?token=${inviteToken}`;

     // Send invitation email via Cloud Function
     const response = await fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendTeamAdminInvite', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         to: inviteForm.email,
         name: inviteForm.name,
         teamName: getTeamName(inviteForm.teamId),
         setupLink: setupLink
       }),
     });

     if (!response.ok) {
       throw new Error('Failed to send invitation email');
     }

     setMessage({
       type: 'success',
       text: `Invitation sent successfully to ${inviteForm.email}!`
     });
     
     setShowInviteModal(false);
     setInviteForm({ name: '', email: '', phone: '', teamId: '' });
     
     // Refresh the users list
     fetchData();
     
   } catch (error) {
     console.error('Error sending invitation:', error);
     setMessage({
       type: 'error',
       text: 'Failed to send invitation. Please try again.'
     });
   } finally {
     setSendingInvite(false);
   }
 };

 return (
   <MainLayout>
     <div className="min-h-screen bg-gray-50 p-6">
       <div className="max-w-7xl mx-auto">
         {/* Header */}
         <div className="mb-8 flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-bold text-gray-900">App Users</h1>
             <p className="text-gray-600 mt-2">Manage user roles and permissions</p>
           </div>
           <button
             onClick={() => setShowInviteModal(true)}
             className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
             </svg>
             Invite Team Admin
           </button>
         </div>

          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone, type, or team..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? 'No users match your search criteria.' : 'No verified users in the ccpl-users collection.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || user.displayName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.phoneNumber || user.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.type || 'user'}
                            onChange={(e) => handleTypeChange(user.id, e.target.value, user)}
                            disabled={saving}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="user">User</option>
                            <option value="player">Player</option>
                            <option value="team admin">Team Admin</option>
                            <option value="ccpl-admin">CCPL Admin</option>
                            <option value="super admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.type === 'team admin' && user.teamId
                              ? getTeamName(user.teamId)
                              : '-'
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div className="mt-6">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Team Selection Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Team for {selectedUser?.name || selectedUser?.displayName || 'User'}
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Select a Team --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTeamSelection}
                  disabled={saving || !selectedTeam}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    saving || !selectedTeam
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {saving ? 'Assigning...' : 'Assign Team'}
                </button>
                <button
                  onClick={() => {
                    setShowTeamModal(false);
                    setSelectedUser(null);
                    setSelectedTeam('');
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Team Admin Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invite Team Admin
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inviteForm.teamId}
                    onChange={(e) => setInviteForm({ ...inviteForm, teamId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">-- Select a Team --</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleInviteTeamAdmin}
                  disabled={sendingInvite}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    sendingInvite
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {sendingInvite ? 'Sending Invitation...' : 'Send Invitation'}
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ name: '', email: '', phone: '', teamId: '' });
                  }}
                  disabled={sendingInvite}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
