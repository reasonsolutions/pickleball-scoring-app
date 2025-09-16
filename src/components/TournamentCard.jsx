import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TournamentCard({ tournament }) {
  const navigate = useNavigate();
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
          <button
            className="btn btn-outline btn-sm"
            style={{
              borderColor: 'var(--primary-blue)',
              color: 'var(--primary-blue)'
            }}
            onClick={() => navigate(`/admin/tournaments/${tournament.id}/edit`)}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}