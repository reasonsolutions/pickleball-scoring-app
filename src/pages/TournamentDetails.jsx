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
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
    } else {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-700' };
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
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', tournament.id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      const deletePromises = fixturesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'tournaments', tournament.id));
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
  const isSuperAdminWithFullAccess = tournament && currentUser && isSuperAdmin();
  const canManage = isOwner || isSuperAdminOwner || isSuperAdminWithFullAccess;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="text-center">
            <div className="inline-block">
              <svg className="animate-spin h-12 w-12 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="mt-4 text-gray-600">Loading tournament details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !tournament) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900">{error || 'Tournament not found'}</h3>
                  <p className="text-red-700 text-sm mt-1">The tournament you're looking for doesn't exist or has been deleted.</p>
                </div>
              </div>
            </div>
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              onClick={() => navigate('/admin/tournaments')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournaments
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const categoryList = getCategoryList(tournament.categories);
  const statusBadge = getStatusBadge(tournament);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }}></div>
          </div>
          
          <div className="relative p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
              {/* Back Button */}
              <button 
                onClick={() => navigate('/admin/tournaments')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors mb-6"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {/* Header Content */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-3">{tournament.name}</h1>
                  <p className="text-lg text-white/90 max-w-2xl">{tournament.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 md:p-12">
          <div className="max-w-6xl mx-auto">
            {/* Cover Image */}
            {tournament.coverImageUrl && (
              <div className="mb-12">
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={tournament.coverImageUrl}
                    alt={tournament.name}
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Tournament Categories */}
                {categoryList.length > 0 && (
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Tournament Categories</h2>
                    <div className="flex flex-wrap gap-3">
                      {categoryList.map((category, index) => (
                        <div key={index} className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium text-sm border border-orange-200">
                          {category}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules & Regulations */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Rules & Regulations</h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{tournament.rules}</p>
                  </div>
                </div>

                {/* Management Actions */}
                {canManage && (
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Tournament Management</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                        onClick={() => navigate(`/admin/tournaments/${id}/players-teams`)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Players/Teams
                      </button>
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        onClick={() => navigate(`/admin/tournaments/${id}/fixtures`)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Fixtures
                      </button>
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                        onClick={() => navigate(`/admin/tournaments/${id}/analytics`)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analytics
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tournament Info Card */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Tournament Info</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start Date</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(tournament.startDate)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">End Date</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(tournament.endDate)}</p>
                    </div>
                    
                    {!isTeamAdmin() && (
                      <>
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prize Money</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(tournament.prizeMoney)}</p>
                        </div>
                        
                        {tournament.registrationFee > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registration Fee</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(tournament.registrationFee)}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions Card */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Actions</h3>
                  <div className="space-y-3">
                    {canManage ? (
                      <>
                        <button
                          className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                          onClick={() => navigate(`/admin/tournaments/${id}/edit`)}
                        >
                          Edit Tournament
                        </button>
                        <button
                          className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm border border-red-200"
                          onClick={() => setShowDeleteModal(true)}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting...' : 'Delete Tournament'}
                        </button>
                      </>
                    ) : isTeamAdmin() ? (
                      <button
                        className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                        onClick={() => navigate(`/admin/tournaments/${id}/fixtures`)}
                      >
                        View Fixtures
                      </button>
                    ) : (
                      <button className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                        Register Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 4v2M6.343 3.665c.886-.887 2.318-.887 3.203 0l9.759 9.759c.886.886.886 2.318 0 3.203l-9.759 9.759c-.886.886-2.318.886-3.203 0L3.14 16.168c-.886-.886-.886-2.318 0-3.203L6.343 3.665z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-900 text-center mb-2">Delete Tournament</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "{tournament?.name}"? This action cannot be undone and will also delete all associated fixtures and matches.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                onClick={handleDeleteTournament}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
