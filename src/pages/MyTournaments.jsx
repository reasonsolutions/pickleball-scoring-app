import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import TournamentCard from '../components/TournamentCard';

export default function MyTournaments() {
  const [activeTab, setActiveTab] = useState('current');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, isSuperAdmin, isTeamAdmin, getAllSuperAdminTournaments, getAllTournaments } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const fetchTournaments = async () => {
      try {
        setLoading(true);
        
        if (isSuperAdmin()) {
          try {
            const allTournaments = await getAllTournaments();
            setTournaments(allTournaments);
            setLoading(false);
          } catch (error) {
            console.error('Error fetching all tournaments:', error);
            setLoading(false);
          }
        } else if (isTeamAdmin()) {
          if (currentUser.tournamentId) {
            const tournamentDoc = await getDoc(doc(db, 'tournaments', currentUser.tournamentId));
            if (tournamentDoc.exists()) {
              setTournaments([{
                id: tournamentDoc.id,
                ...tournamentDoc.data()
              }]);
            }
          }
          setLoading(false);
        } else {
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

          return unsubscribe;
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setLoading(false);
      }
    };

    const unsubscribe = fetchTournaments();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser, isSuperAdmin, isTeamAdmin]);

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
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-orange-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading tournaments...</p>
          </div>
        </div>
      );
    }

    if (tournamentList.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
          <p className="text-gray-600 mb-6">
            {isTeamAdmin()
              ? "No tournament assigned to your team admin account."
              : activeTab === 'current'
                ? "Create your first tournament to get started!"
                : "Your completed tournaments will appear here."
            }
          </p>
          {activeTab === 'current' && isSuperAdmin() && (
            <Link to="/admin/tournaments/create" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Tournament
            </Link>
          )}
        </div>
      );
    }

    if (tournamentList.length > 4) {
      return (
        <div className="relative group">
          <div className="flex items-center gap-4">
            <button
              onClick={scrollLeft}
              className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all z-10 border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="tournaments-container flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
                {tournamentList.map(tournament => (
                  <div key={tournament.id} className="flex-shrink-0" style={{ width: '300px' }}>
                    <TournamentCard tournament={tournament} />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={scrollRight}
              className="flex-shrink-0 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all z-10 border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

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
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {isTeamAdmin() ? 'My Tournament' : 'My Tournaments'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {isTeamAdmin()
                    ? `Tournament you're managing as ${currentUser?.teamName || 'Team'} Admin`
                    : 'Manage and track your pickleball tournaments'
                  }
                </p>
              </div>
              {isSuperAdmin() && (
                <Link to="/admin/tournaments/create" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium whitespace-nowrap">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Tournament
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Tournaments */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Tournaments</p>
                  <p className="text-3xl font-bold text-gray-900">{tournaments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Tournaments */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Tournaments</p>
                  <p className="text-3xl font-bold text-gray-900">{currentTournaments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completed Tournaments */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed Tournaments</p>
                  <p className="text-3xl font-bold text-gray-900">{pastTournaments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'current'
                  ? 'text-orange-600 border-orange-500'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Current Tournaments ({currentTournaments.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'past'
                  ? 'text-orange-600 border-orange-500'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Past Tournaments ({pastTournaments.length})
              </span>
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
      </div>
    </MainLayout>
  );
}
