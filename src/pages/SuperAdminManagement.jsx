import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import { Link } from 'react-router-dom';

export default function SuperAdminManagement() {
  const { currentUser, isSuperAdmin, getSuperAdmins, getAllTournaments } = useAuth();
  const [superAdmins, setSuperAdmins] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!isSuperAdmin()) {
        setError('Access denied. Super admin privileges required.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all super admins
        const adminsData = await getSuperAdmins();
        setSuperAdmins(adminsData);
        
        // Fetch all tournaments in the database
        const tournamentsData = await getAllTournaments();
        setTournaments(tournamentsData);
        
      } catch (error) {
        console.error('Error fetching super admin data:', error);
        setError('Failed to load super admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSuperAdmin, getSuperAdmins, getAllTournaments]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTournamentsByAdmin = (adminId) => {
    return tournaments.filter(tournament => tournament.createdBy === adminId);
  };

  const getTournamentsNotCreatedByAdmins = () => {
    const superAdminIds = superAdmins.map(admin => admin.id);
    return tournaments.filter(tournament => !superAdminIds.includes(tournament.createdBy));
  };

  if (!isSuperAdmin()) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Access denied. Super admin privileges required.</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Super Admin Management</h1>
          <p className="text-base-content/70 mt-1">
            View all super admins and their tournaments
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat rounded-lg bg-base-100 shadow">
            <div className="stat-title">Total Super Admins</div>
            <div className="stat-value text-primary">{superAdmins.length}</div>
          </div>
          <div className="stat rounded-lg bg-base-100 shadow">
            <div className="stat-title">Total Tournaments</div>
            <div className="stat-value text-secondary">{tournaments.length}</div>
          </div>
          <div className="stat rounded-lg bg-base-100 shadow">
            <div className="stat-title">Active Tournaments</div>
            <div className="stat-value text-accent">
              {tournaments.filter(t => {
                const endDate = t.endDate?.toDate ? t.endDate.toDate() : new Date(t.endDate);
                return endDate >= new Date();
              }).length}
            </div>
          </div>
        </div>

        {/* Super Admins List */}
        <div className="space-y-6">
          {superAdmins.map((admin) => {
            const adminTournaments = getTournamentsByAdmin(admin.id);
            const isCurrentUser = admin.id === currentUser?.uid;
            
            return (
              <div key={admin.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="card-title text-xl">
                        {admin.displayName || admin.email}
                        {isCurrentUser && (
                          <div className="badge badge-primary ml-2">You</div>
                        )}
                      </h2>
                      <p className="text-base-content/70">{admin.email}</p>
                      <p className="text-sm text-base-content/50">
                        Joined: {formatDate(admin.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="stat-value text-2xl text-primary">
                        {adminTournaments.length}
                      </div>
                      <div className="text-sm text-base-content/70">Tournaments</div>
                    </div>
                  </div>

                  {/* Admin's Tournaments */}
                  {adminTournaments.length > 0 ? (
                    <div>
                      <h3 className="font-semibold mb-3">Tournaments:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {adminTournaments.map((tournament) => (
                          <div key={tournament.id} className="card bg-base-200 shadow">
                            <div className="card-body p-4">
                              <h4 className="card-title text-sm">{tournament.name}</h4>
                              <div className="text-xs text-base-content/70 space-y-1">
                                <p>Start: {formatDate(tournament.startDate)}</p>
                                <p>End: {formatDate(tournament.endDate)}</p>
                                <div className="flex justify-between items-center mt-2">
                                  <div className={`badge badge-sm ${
                                    (() => {
                                      const now = new Date();
                                      const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
                                      const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
                                      
                                      if (now < startDate) return 'badge-info';
                                      if (now >= startDate && now <= endDate) return 'badge-success';
                                      return 'badge-neutral';
                                    })()
                                  }`}>
                                    {(() => {
                                      const now = new Date();
                                      const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
                                      const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
                                      
                                      if (now < startDate) return 'Upcoming';
                                      if (now >= startDate && now <= endDate) return 'Active';
                                      return 'Completed';
                                    })()}
                                  </div>
                                  <Link 
                                    to={`/admin/tournaments/${tournament.id}`}
                                    className="btn btn-xs btn-primary"
                                  >
                                    View
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-base-content/50">
                      No tournaments created yet
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tournaments not created by super admins */}
        {getTournamentsNotCreatedByAdmins().length > 0 && (
          <div className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                Other Tournaments in Database
                <div className="badge badge-info ml-2">
                  {getTournamentsNotCreatedByAdmins().length}
                </div>
              </h2>
              <p className="text-base-content/70 mb-4">
                Tournaments created by other users or imported from external sources
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getTournamentsNotCreatedByAdmins().map((tournament) => (
                  <div key={tournament.id} className="card bg-base-200 shadow">
                    <div className="card-body p-4">
                      <h4 className="card-title text-sm">{tournament.name}</h4>
                      <div className="text-xs text-base-content/70 space-y-1">
                        <p>Start: {formatDate(tournament.startDate)}</p>
                        <p>End: {formatDate(tournament.endDate)}</p>
                        <p>Created by: {tournament.createdBy || 'Unknown'}</p>
                        <div className="flex justify-between items-center mt-2">
                          <div className={`badge badge-sm ${
                            (() => {
                              const now = new Date();
                              const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
                              const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
                              
                              if (now < startDate) return 'badge-info';
                              if (now >= startDate && now <= endDate) return 'badge-success';
                              return 'badge-neutral';
                            })()
                          }`}>
                            {(() => {
                              const now = new Date();
                              const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
                              const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
                              
                              if (now < startDate) return 'Upcoming';
                              if (now >= startDate && now <= endDate) return 'Active';
                              return 'Completed';
                            })()}
                          </div>
                          <Link
                            to={`/admin/tournaments/${tournament.id}`}
                            className="btn btn-xs btn-primary"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {superAdmins.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">No Super Admins Found</h3>
            <p className="text-base-content/70">
              There are no super admin accounts in the system.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}