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

  // Scroll functions for tournament cards
  const scrollLeft = () => {
    const container = document.querySelector('.tournaments-container');
    if (container) {
      container.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.querySelector('.tournaments-container');
    if (container) {
      container.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

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
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{emptyMessage}</h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {activeTab === 'current'
              ? "Create your first tournament to get started!"
              : "Your completed tournaments will appear here."
            }
          </p>
          {activeTab === 'current' && (
            <Link to="/admin/tournaments/create" className="btn" style={{
              backgroundColor: 'var(--primary-green)',
              color: 'var(--text-primary)',
              border: 'none'
            }}>
              Create Tournament
            </Link>
          )}
        </div>
      );
    }

    // Use horizontal scrolling layout when there are more than 4 tournaments
    if (tournamentList.length > 4) {
      return (
        <div className="relative">
          <div className="flex items-center">
            {/* Left Arrow */}
            <button
              onClick={scrollLeft}
              className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors mr-4 z-10"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Tournaments Container */}
            <div className="tournaments-container flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
                {tournamentList.map(tournament => (
                  <div key={tournament.id} className="flex-shrink-0" style={{ width: '300px' }}>
                    <TournamentCard tournament={tournament} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={scrollRight}
              className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors ml-4 z-10"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    // Use grid layout for 4 or fewer tournaments
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>My Tournaments</h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage and track your pickleball tournaments
            </p>
          </div>
          <Link to="/admin/tournaments/create" className="btn" style={{
            backgroundColor: 'var(--primary-green)',
            color: 'var(--text-primary)',
            border: 'none'
          }}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Tournament
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Total Tournaments</div>
            <div className="stat-value" style={{ color: 'var(--primary-blue)' }}>{tournaments.length}</div>
          </div>
          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Active Tournaments</div>
            <div className="stat-value" style={{ color: 'var(--success-green)' }}>{currentTournaments.length}</div>
          </div>
          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Completed Tournaments</div>
            <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{pastTournaments.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <button
            className={`tab ${activeTab === 'current' ? 'tab-active' : ''}`}
            style={activeTab === 'current' ? {
              backgroundColor: 'var(--primary-green)',
              color: 'var(--text-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
            onClick={() => setActiveTab('current')}
          >
            Current Tournaments ({currentTournaments.length})
          </button>
          <button
            className={`tab ${activeTab === 'past' ? 'tab-active' : ''}`}
            style={activeTab === 'past' ? {
              backgroundColor: 'var(--primary-green)',
              color: 'var(--text-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
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