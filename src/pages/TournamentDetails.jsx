import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, isTeamAdmin, getSuperAdmins } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [superAdminIds, setSuperAdminIds] = useState([]);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
        if (tournamentDoc.exists()) {
          setTournament({ id: tournamentDoc.id, ...tournamentDoc.data() });
        } else {
          setError('Tournament not found');
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
        setError('Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    };

    const fetchSuperAdmins = async () => {
      if (isSuperAdmin()) {
        try {
          const superAdmins = await getSuperAdmins();
          setSuperAdminIds(superAdmins.map(admin => admin.id));
        } catch (error) {
          console.error('Error fetching super admins:', error);
        }
      }
    };

    if (id) {
      fetchTournament();
      fetchSuperAdmins();
    }
  }, [id, isSuperAdmin, getSuperAdmins]);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getStatusBadge = (tournament) => {
    const now = new Date();
    const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
    const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);

    if (now < startDate) {
      return <div className="badge badge-info badge-lg">Upcoming</div>;
    } else if (now >= startDate && now <= endDate) {
      return <div className="badge badge-success badge-lg">Active</div>;
    } else {
      return <div className="badge badge-neutral badge-lg">Completed</div>;
    }
  };

  const getCategoryList = (categories) => {
    if (!categories) return [];
    return Object.entries(categories)
      .filter(([_, selected]) => selected)
      .map(([key, _]) => {
        switch (key) {
          case 'mensSingles': return "Men's Singles";
          case 'mensDoubles': return "Men's Doubles";
          case 'womensSingles': return "Women's Singles";
          case 'womensDoubles': return "Women's Doubles";
          case 'mixedDoubles': return "Mixed Doubles";
          default: return key;
        }
      });
  };

  const handleDeleteTournament = async () => {
    if (!tournament || !currentUser || (!isOwner && !isSuperAdminOwner && !isSuperAdminWithFullAccess)) {
      return;
    }

    setDeleteLoading(true);
    try {
      // Delete all related fixtures first
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', tournament.id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      // Delete all fixtures
      const deletePromises = fixturesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the tournament
      await deleteDoc(doc(db, 'tournaments', tournament.id));

      // Navigate back to tournaments list
      navigate('/admin/tournaments');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setError('Failed to delete tournament. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const isOwner = tournament && currentUser && tournament.createdBy === currentUser.uid;
  const isSuperAdminOwner = tournament && currentUser && isSuperAdmin() && superAdminIds.includes(tournament.createdBy);
  const isSuperAdminWithFullAccess = tournament && currentUser && isSuperAdmin(); // Super admins can manage ALL tournaments
  const canManage = isOwner || isSuperAdminOwner || isSuperAdminWithFullAccess;

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
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error || 'Tournament not found'}</span>
          </div>
          <div className="mt-6">
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/admin/tournaments')}
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const categoryList = getCategoryList(tournament.categories);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <button 
              className="btn btn-ghost btn-sm self-start"
              onClick={() => navigate('/admin/tournaments')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournaments
            </button>
            {getStatusBadge(tournament)}
          </div>
          
          <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
          <p className="text-base-content/70 text-lg">{tournament.description}</p>
        </div>

        {/* Cover Image */}
        {tournament.coverImageUrl && (
          <div className="mb-8">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img
                src={tournament.coverImageUrl}
                alt={tournament.name}
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tournament Categories */}
            {categoryList.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-xl mb-4">Tournament Categories</h2>
                  <div className="flex flex-wrap gap-2">
                    {categoryList.map((category, index) => (
                      <div key={index} className="badge badge-primary badge-lg">
                        {category}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rules & Regulations */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Rules & Regulations</h2>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{tournament.rules}</p>
                </div>
              </div>
            </div>

            {/* Management Actions - Show to tournament owner or superadmin */}
            {canManage && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-xl mb-4">Tournament Management</h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      className="btn btn-primary btn-lg flex-1"
                      onClick={() => navigate(`/admin/tournaments/${id}/players-teams`)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Add Players/Teams
                    </button>
                    <button
                      className="btn btn-secondary btn-lg flex-1"
                      onClick={() => navigate(`/admin/tournaments/${id}/fixtures`)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Fixtures
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">Tournament Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-base-content/60 uppercase tracking-wide mb-1">Start Date</div>
                    <div className="font-semibold">{formatDate(tournament.startDate)}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-base-content/60 uppercase tracking-wide mb-1">End Date</div>
                    <div className="font-semibold">{formatDate(tournament.endDate)}</div>
                  </div>
                  
                  {/* Prize Money and Registration Fee - Hidden for Team Admins */}
                  {!isTeamAdmin() && (
                    <>
                      <div>
                        <div className="text-sm text-base-content/60 uppercase tracking-wide mb-1">Prize Money</div>
                        <div className="font-semibold text-success text-lg">{formatCurrency(tournament.prizeMoney)}</div>
                      </div>
                      
                      {tournament.registrationFee > 0 && (
                        <div>
                          <div className="text-sm text-base-content/60 uppercase tracking-wide mb-1">Registration Fee</div>
                          <div className="font-semibold">{formatCurrency(tournament.registrationFee)}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">Actions</h3>
                <div className="space-y-3">
                  {canManage ? (
                    <>
                      <button
                        className="btn btn-outline w-full"
                        onClick={() => navigate(`/admin/tournaments/${id}/edit`)}
                      >
                        Edit Tournament
                      </button>
                      <button
                        className="btn btn-error btn-outline w-full"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Deleting...
                          </>
                        ) : (
                          'Delete Tournament'
                        )}
                      </button>
                    </>
                  ) : isTeamAdmin() ? (
                    // Team admins only see Fixtures button
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => navigate(`/admin/tournaments/${id}/fixtures`)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Fixtures
                    </button>
                  ) : (
                    // Regular users see registration button
                    <button className="btn btn-primary w-full">
                      Register for Tournament
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Delete Tournament</h3>
            <p className="py-4">
              Are you sure you want to delete "{tournament?.name}"? This action cannot be undone and will also delete all associated fixtures and matches.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteTournament}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Tournament'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}