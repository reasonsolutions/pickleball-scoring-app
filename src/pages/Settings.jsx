import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';

export default function Settings() {
  const { currentUser, isSuperAdmin, isTeamAdmin, getTeamAdmins, updateTeamAdminPassword, setSuperAdminRole, createSuperAdmin, getSuperAdmins, changePassword } = useAuth();
  const navigate = useNavigate();
  const [teamAdmins, setTeamAdmins] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [settingRole, setSettingRole] = useState(false);
  
  // Super admin creation state
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [newSuperAdminPassword, setNewSuperAdminPassword] = useState('');
  const [newSuperAdminDisplayName, setNewSuperAdminDisplayName] = useState('');
  const [creatingSuperAdmin, setCreatingSuperAdmin] = useState(false);
  
  // Password change state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Venue management state
  const [venues, setVenues] = useState([]);
  const [newVenueName, setNewVenueName] = useState('');
  const [addingVenue, setAddingVenue] = useState(false);
  const [deletingVenue, setDeletingVenue] = useState(null);

  useEffect(() => {
    // Wait for user data to be loaded before checking permissions
    if (!currentUser) {
      return;
    }

    // Allow both super admins and team admins to access settings
    if (!isSuperAdmin() && !isTeamAdmin()) {
      navigate('/admin');
      return;
    }

    // Only fetch admin data if user is super admin
    if (isSuperAdmin()) {
      fetchTeamAdmins();
      fetchSuperAdmins();
      fetchVenues();
    } else {
      setLoading(false);
    }
  }, [currentUser, isSuperAdmin, isTeamAdmin, navigate]);

  const fetchTeamAdmins = async () => {
    try {
      setLoading(true);
      const admins = await getTeamAdmins();
      setTeamAdmins(admins);
    } catch (error) {
      console.error('Error fetching team admins:', error);
      setError('Failed to load team admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperAdmins = async () => {
    try {
      const admins = await getSuperAdmins();
      setSuperAdmins(admins);
    } catch (error) {
      console.error('Error fetching super admins:', error);
      setError('Failed to load super admins');
    }
  };

  const fetchVenues = async () => {
    try {
      const venuesSnapshot = await getDocs(collection(db, 'venues'));
      const venuesData = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVenues(venuesData);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setError('Failed to load venues');
    }
  };

  const handleAddVenue = async (e) => {
    e.preventDefault();
    if (!newVenueName.trim()) {
      setError('Please enter a venue name');
      return;
    }

    try {
      setAddingVenue(true);
      setError('');
      
      const venueData = {
        name: newVenueName.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      await addDoc(collection(db, 'venues'), venueData);
      setSuccess('Venue added successfully!');
      setNewVenueName('');
      fetchVenues(); // Refresh the venues list
    } catch (error) {
      console.error('Error adding venue:', error);
      setError('Failed to add venue');
    } finally {
      setAddingVenue(false);
    }
  };

  const handleDeleteVenue = async (venueId) => {
    try {
      setDeletingVenue(venueId);
      setError('');
      
      await deleteDoc(doc(db, 'venues', venueId));
      setSuccess('Venue deleted successfully!');
      fetchVenues(); // Refresh the venues list
    } catch (error) {
      console.error('Error deleting venue:', error);
      setError('Failed to delete venue');
    } finally {
      setDeletingVenue(null);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || !newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      
      const result = await updateTeamAdminPassword(selectedAdmin.id, newPassword.trim());
      
      if (result.success) {
        setSuccess(`Password updated successfully for ${selectedAdmin.displayName}`);
        setShowPasswordModal(false);
        setSelectedAdmin(null);
        setNewPassword('');
        // Refresh the team admins list
        fetchTeamAdmins();
      } else {
        setError(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  const openPasswordModal = (admin) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setShowPasswordModal(true);
    setError('');
    setSuccess('');
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedAdmin(null);
    setNewPassword('');
    setError('');
  };

  const handleSetSuperAdminRole = async () => {
    try {
      setSettingRole(true);
      setError('');
      
      const result = await setSuperAdminRole();
      
      if (result.success) {
        setSuccess('Super admin role set successfully!');
      } else {
        setError(result.error || 'Failed to set super admin role');
      }
    } catch (error) {
      console.error('Error setting super admin role:', error);
      setError('Failed to set super admin role');
    } finally {
      setSettingRole(false);
    }
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    if (!newSuperAdminEmail.trim() || !newSuperAdminPassword.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreatingSuperAdmin(true);
      setError('');
      
      const result = await createSuperAdmin(
        newSuperAdminEmail.trim(),
        newSuperAdminPassword.trim(),
        newSuperAdminDisplayName.trim() || newSuperAdminEmail.trim()
      );
      
      if (result.success) {
        setSuccess('Super admin account created successfully!');
        setShowCreateSuperAdminModal(false);
        setNewSuperAdminEmail('');
        setNewSuperAdminPassword('');
        setNewSuperAdminDisplayName('');
        fetchSuperAdmins(); // Refresh the list
      } else {
        setError(result.error || 'Failed to create super admin account');
      }
    } catch (error) {
      console.error('Error creating super admin:', error);
      setError('Failed to create super admin account');
    } finally {
      setCreatingSuperAdmin(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newUserPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all password fields');
      return;
    }

    if (newUserPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    if (newUserPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      setError('');
      
      const result = await changePassword(currentPassword.trim(), newUserPassword.trim());
      
      if (result.success) {
        setSuccess('Password changed successfully!');
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewUserPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const openCreateSuperAdminModal = () => {
    setNewSuperAdminEmail('');
    setNewSuperAdminPassword('');
    setNewSuperAdminDisplayName('');
    setShowCreateSuperAdminModal(true);
    setError('');
    setSuccess('');
  };

  const closeCreateSuperAdminModal = () => {
    setShowCreateSuperAdminModal(false);
    setNewSuperAdminEmail('');
    setNewSuperAdminPassword('');
    setNewSuperAdminDisplayName('');
    setError('');
  };

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewUserPassword('');
    setConfirmPassword('');
    setShowChangePasswordModal(true);
    setError('');
    setSuccess('');
  };

  const closeChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword('');
    setNewUserPassword('');
    setConfirmPassword('');
    setError('');
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

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-base-content/70 text-lg">
            {isSuperAdmin()
              ? "Manage super admin accounts, team admin accounts, and system settings"
              : "Manage your account settings and change your password"
            }
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Role Management Section - Show if user doesn't have a role set and is super admin */}
        {currentUser && !currentUser.role && isSuperAdmin() && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Set Your Role</h2>
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-bold">Role Not Set</h3>
                  <div className="text-sm">Your account doesn't have a role assigned. Click below to set yourself as Super Admin.</div>
                </div>
              </div>
              <button
                className={`btn btn-primary ${settingRole ? 'loading' : ''}`}
                onClick={handleSetSuperAdminRole}
                disabled={settingRole}
              >
                {settingRole ? 'Setting Role...' : 'Set as Super Admin'}
              </button>
            </div>
          </div>
        )}

        {/* Current Role Display */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Current User Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <div className="text-lg">{currentUser?.email}</div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium">Role</span>
                </label>
                <div className="text-lg">
                  <span className={`badge ${isSuperAdmin() ? 'badge-primary' : 'badge-secondary'} badge-lg`}>
                    {currentUser?.role === 'team_admin' ? 'Team Admin' :
                     currentUser?.role === 'super_admin' ? 'Super Admin' :
                     'Super Admin (Legacy)'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                className="btn btn-outline btn-primary"
                onClick={openChangePasswordModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-2.632 2.122-5.367 4.688-5.394A6 6 0 0117 9z" />
                </svg>
                Change My Password
              </button>
            </div>
          </div>
        </div>

        {/* Super Admin Management Section - Only for Super Admins */}
        {isSuperAdmin() && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h2 className="card-title text-2xl">Super Admin Management</h2>
              <button
                className="btn btn-primary"
                onClick={openCreateSuperAdminModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Super Admin
              </button>
            </div>
            
            {superAdmins.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-base-content/60 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Super Admins Found</h3>
                <p className="text-base-content/60">
                  Create super admin accounts to manage the system.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Created</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {superAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="font-medium">{admin.displayName}</td>
                        <td>{admin.email}</td>
                        <td>
                          {admin.createdAt ? new Date(admin.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          {admin.createdBy === currentUser?.uid ? 'You' : (admin.createdBy ? 'Another Admin' : 'System')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Venue Management Section - Only for Super Admins */}
        {isSuperAdmin() && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Venue Management</h2>
            
            {/* Add New Venue Form */}
            <form onSubmit={handleAddVenue} className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text font-medium">Venue Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter venue name"
                    className="input input-bordered w-full"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">&nbsp;</span>
                  </label>
                  <button
                    type="submit"
                    className={`btn btn-primary ${addingVenue ? 'loading' : ''}`}
                    disabled={addingVenue || !newVenueName.trim()}
                  >
                    {addingVenue ? 'Adding...' : 'Add Venue'}
                  </button>
                </div>
              </div>
            </form>

            {/* Venues List */}
            {venues.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-base-content/60 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Venues Added</h3>
                <p className="text-base-content/60">
                  Add venues where fixtures will be played. These will be available when creating Game Breaker fixtures.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Venue Name</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venues.map((venue) => (
                      <tr key={venue.id}>
                        <td className="font-medium">{venue.name}</td>
                        <td>
                          {venue.createdAt ? new Date(venue.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm btn-error btn-outline ${deletingVenue === venue.id ? 'loading' : ''}`}
                            onClick={() => handleDeleteVenue(venue.id)}
                            disabled={deletingVenue === venue.id}
                          >
                            {deletingVenue === venue.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Team Admins Section - Only for Super Admins */}
        {isSuperAdmin() && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Team Admin Accounts</h2>
            
            {teamAdmins.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-base-content/60 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Team Admins Found</h3>
                <p className="text-base-content/60">
                  Team admin accounts will appear here when you add team admin emails to teams.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Team</th>
                      <th>Tournament</th>
                      <th>Current Password</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="font-medium">{admin.displayName}</td>
                        <td>{admin.email}</td>
                        <td>{admin.teamName || '-'}</td>
                        <td>{admin.tournamentId || '-'}</td>
                        <td>
                          <div className="font-mono text-sm bg-base-200 px-2 py-1 rounded">
                            {admin.tempPassword || 'Not set'}
                          </div>
                        </td>
                        <td>
                          {admin.createdAt ? new Date(admin.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => openPasswordModal(admin)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-2.632 2.122-5.367 4.688-5.394A6 6 0 0117 9z" />
                            </svg>
                            Change Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Password Update Modal */}
        {showPasswordModal && selectedAdmin && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">
                Update Password for {selectedAdmin.displayName}
              </h3>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <input
                    type="email"
                    value={selectedAdmin.email}
                    className="input input-bordered"
                    disabled
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Current Password</span>
                  </label>
                  <input
                    type="text"
                    value={selectedAdmin.tempPassword || 'Not set'}
                    className="input input-bordered font-mono"
                    disabled
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">New Password *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter new password"
                    className="input input-bordered"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  <label className="label">
                    <span className="label-text-alt">Minimum 6 characters</span>
                  </label>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closePasswordModal}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${updating ? 'loading' : ''}`}
                    disabled={updating || !newPassword.trim()}
                  >
                    {updating ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Super Admin Modal */}
        {showCreateSuperAdminModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">
                Create New Super Admin
              </h3>
              
              <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="input input-bordered"
                    value={newSuperAdminEmail}
                    onChange={(e) => setNewSuperAdminEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Display Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter display name (optional)"
                    className="input input-bordered"
                    value={newSuperAdminDisplayName}
                    onChange={(e) => setNewSuperAdminDisplayName(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt">If not provided, email will be used as display name</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Password *</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    className="input input-bordered"
                    value={newSuperAdminPassword}
                    onChange={(e) => setNewSuperAdminPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  <label className="label">
                    <span className="label-text-alt">Minimum 6 characters</span>
                  </label>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeCreateSuperAdminModal}
                    disabled={creatingSuperAdmin}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${creatingSuperAdmin ? 'loading' : ''}`}
                    disabled={creatingSuperAdmin || !newSuperAdminEmail.trim() || !newSuperAdminPassword.trim()}
                  >
                    {creatingSuperAdmin ? 'Creating...' : 'Create Super Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">
                Change Your Password
              </h3>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Current Password *</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="input input-bordered"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">New Password *</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="input input-bordered"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  <label className="label">
                    <span className="label-text-alt">Minimum 6 characters</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Confirm New Password *</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="input input-bordered"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeChangePasswordModal}
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${changingPassword ? 'loading' : ''}`}
                    disabled={changingPassword || !currentPassword.trim() || !newUserPassword.trim() || !confirmPassword.trim()}
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}