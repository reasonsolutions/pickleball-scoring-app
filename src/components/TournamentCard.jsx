import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function TournamentCard({ tournament }) {
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const handleDeleteTournament = async (e) => {
    e.stopPropagation();
    if (!tournament || !currentUser || (!isOwner && !isSuperAdmin())) {
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
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const isOwner = tournament && currentUser && tournament.createdBy === currentUser.uid;
  const canManage = isOwner || isSuperAdmin();
  const statusBadge = getStatusBadge(tournament);

  return (
    <>
      <div 
        onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer group"
      >
        {/* Cover Image */}
        {tournament.coverImageUrl && (
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-orange-100 to-orange-50">
            <img
              src={tournament.coverImageUrl}
              alt={tournament.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        )}
        
        <div className="p-6">
          {/* Header with Status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">{tournament.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {tournament.description}
          </p>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Start</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(tournament.startDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">End</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(tournament.endDate)}</p>
            </div>
          </div>

          {/* Prize Money and Entry Fee */}
          {!isTeamAdmin() && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Prize</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(tournament.prizeMoney)}</p>
              </div>
              {tournament.registrationFee > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Entry Fee</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(tournament.registrationFee)}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isTeamAdmin() ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/tournaments/${tournament.id}/fixtures`);
                }}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Fixtures
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/tournaments/${tournament.id}`);
                  }}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                >
                  View
                </button>
                {canManage && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/tournaments/${tournament.id}/edit`);
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Edit tournament"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                      }}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete tournament"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
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
    </>
  );
}
