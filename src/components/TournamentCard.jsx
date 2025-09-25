import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function TournamentCard({ tournament }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
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
      return <div className="badge badge-info">Upcoming</div>;
    } else if (now >= startDate && now <= endDate) {
      return <div className="badge badge-success">Active</div>;
    } else {
      return <div className="badge badge-neutral">Completed</div>;
    }
  };

  const handleDeleteTournament = async (e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (!tournament || !currentUser || tournament.createdBy !== currentUser.uid) {
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
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const isOwner = tournament && currentUser && tournament.createdBy === currentUser.uid;

  return (
    <div className="card shadow-xl hover:shadow-2xl transition-shadow card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
      {tournament.coverImageUrl && (
        <figure className="h-48 overflow-hidden">
          <img
            src={tournament.coverImageUrl}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        </figure>
      )}
      
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <h2 className="card-title text-lg" style={{ color: 'var(--text-primary)' }}>{tournament.name}</h2>
          {getStatusBadge(tournament)}
        </div>

        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {tournament.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Start Date</div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDate(tournament.startDate)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>End Date</div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDate(tournament.endDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Prize Money</div>
            <div className="font-semibold" style={{ color: 'var(--success-green)' }}>{formatCurrency(tournament.prizeMoney)}</div>
          </div>
          {tournament.registrationFee && (
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Entry Fee</div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(tournament.registrationFee)}</div>
            </div>
          )}
        </div>

        <div className="card-actions justify-end">
          <button
            className="btn btn-sm"
            style={{
              backgroundColor: 'var(--primary-green)',
              color: 'var(--text-primary)',
              border: 'none'
            }}
            onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
          >
            View Details
          </button>
          {isOwner && (
            <>
              <button
                className="btn btn-outline btn-sm"
                style={{
                  borderColor: 'var(--primary-blue)',
                  color: 'var(--primary-blue)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/tournaments/${tournament.id}/edit`);
                }}
              >
                Edit
              </button>
              <button
                className="btn btn-error btn-outline btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </>
          )}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
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
    </div>
  );
}