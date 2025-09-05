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
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
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
          <h2 className="card-title text-lg">{tournament.name}</h2>
          {getStatusBadge(tournament)}
        </div>

        <p className="text-base-content/70 text-sm mb-4 line-clamp-2">
          {tournament.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide">Start Date</div>
            <div className="font-semibold">{formatDate(tournament.startDate)}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide">End Date</div>
            <div className="font-semibold">{formatDate(tournament.endDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide">Prize Money</div>
            <div className="font-semibold text-success">{formatCurrency(tournament.prizeMoney)}</div>
          </div>
          {tournament.registrationFee && (
            <div>
              <div className="text-xs text-base-content/60 uppercase tracking-wide">Entry Fee</div>
              <div className="font-semibold">{formatCurrency(tournament.registrationFee)}</div>
            </div>
          )}
        </div>

        <div className="card-actions justify-end">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/tournaments/${tournament.id}`)}
          >
            View Details
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}