import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';

export default function Settings() {
  const { currentUser, isSuperAdmin, getTeamAdmins, updateTeamAdminPassword, setSuperAdminRole } = useAuth();
  const navigate = useNavigate();
  const [teamAdmins, setTeamAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [settingRole, setSettingRole] = useState(false);

  useEffect(() => {
    // Redirect if not super admin
    if (!isSuperAdmin()) {
      navigate('/admin');
      return;
    }

    fetchTeamAdmins();
  }, [isSuperAdmin, navigate]);

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
            Manage team admin accounts and passwords
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

        {/* Role Management Section - Show if user doesn't have a role set */}
        {currentUser && !currentUser.role && (
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
                    {currentUser?.role || 'Super Admin (Legacy)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Admins Section */}
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
      </div>
    </MainLayout>
  );
}