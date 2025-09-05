import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import TournamentCard from '../components/TournamentCard';

export default function MyTournaments() {
  const [activeTab, setActiveTab] = useState('current');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'tournaments'),
      where('createdBy', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tournamentsData = [];
      querySnapshot.forEach((doc) => {
        tournamentsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setTournaments(tournamentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filterTournaments = (tournaments, type) => {
    const now = new Date();
    
    return tournaments.filter(tournament => {
      const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
      
      if (type === 'current') {
        return endDate >= now;
      } else {
        return endDate < now;
      }
    });
  };

  const currentTournaments = filterTournaments(tournaments, 'current');
  const pastTournaments = filterTournaments(tournaments, 'past');

  const renderTournaments = (tournamentList, emptyMessage) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      );
    }

    if (tournamentList.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏓</div>
          <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-base-content/70 mb-6">
            {activeTab === 'current' 
              ? "Create your first tournament to get started!"
              : "Your completed tournaments will appear here."
            }
          </p>
          {activeTab === 'current' && (
            <Link to="/tournaments/create" className="btn btn-primary">
              Create Tournament
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournamentList.map(tournament => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Tournaments</h1>
            <p className="text-base-content/70 mt-1">
              Manage and track your pickleball tournaments
            </p>
          </div>
          <Link to="/tournaments/create" className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Tournament
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Total Tournaments</div>
            <div className="stat-value text-primary">{tournaments.length}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Active Tournaments</div>
            <div className="stat-value text-success">{currentTournaments.length}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Completed Tournaments</div>
            <div className="stat-value text-neutral">{pastTournaments.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'current' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            Current Tournaments ({currentTournaments.length})
          </button>
          <button
            className={`tab ${activeTab === 'past' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Tournaments ({pastTournaments.length})
          </button>
        </div>

        {/* Tournament Content */}
        <div className="min-h-96">
          {activeTab === 'current' && renderTournaments(
            currentTournaments,
            "No current tournaments"
          )}
          {activeTab === 'past' && renderTournaments(
            pastTournaments,
            "No past tournaments"
          )}
        </div>
      </div>
    </MainLayout>
  );
}