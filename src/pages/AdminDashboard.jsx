import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import StatCard from '../components/dashboard/StatCard';
import UpcomingMatches from '../components/dashboard/UpcomingMatches';
import SalesPerformance from '../components/dashboard/SalesPerformance';
import TopProducts from '../components/dashboard/TopProducts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AdminDashboard() {
  const { currentUser, isTeamAdmin } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState(['Cosmetics', 'Housewest']);
  const [dashboardStats, setDashboardStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    totalParticipants: 0,
    totalMatches: 0,
    loading: true
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch tournaments
        const tournamentsRef = collection(db, 'tournaments');
        let tournamentsQuery = tournamentsRef;
        
        if (isTeamAdmin() && currentUser?.tournamentId) {
          tournamentsQuery = query(tournamentsRef, where('id', '==', currentUser.tournamentId));
        }
        
        const tournamentsSnapshot = await getDocs(tournamentsQuery);
        const tournaments = tournamentsSnapshot.docs.map(doc => doc.data());
        
        // Fetch teams to count participants
        const teamsRef = collection(db, 'teams');
        let teamsQuery = teamsRef;
        
        if (isTeamAdmin() && currentUser?.tournamentId) {
          teamsQuery = query(teamsRef, where('tournamentId', '==', currentUser.tournamentId));
        }
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teams = teamsSnapshot.docs.map(doc => doc.data());
        
        // Count total participants
        let totalParticipants = 0;
        teams.forEach(team => {
          if (team.players && Array.isArray(team.players)) {
            totalParticipants += team.players.length;
          }
        });

        // Fetch fixtures to count matches
        const fixturesRef = collection(db, 'fixtures');
        let fixturesQuery = fixturesRef;
        
        if (isTeamAdmin() && currentUser?.tournamentId) {
          fixturesQuery = query(fixturesRef, where('tournamentId', '==', currentUser.tournamentId));
        }
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixtures = fixturesSnapshot.docs.map(doc => doc.data());

        // Count active tournaments (status === 'active')
        const activeTournaments = tournaments.filter(t => t.status === 'active').length;

        setDashboardStats({
          totalTournaments: tournaments.length,
          activeTournaments: activeTournaments,
          totalParticipants: totalParticipants,
          totalMatches: fixtures.length,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setDashboardStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardStats();
  }, [currentUser, isTeamAdmin]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your tournaments and performance metrics</p>
          </div>

          {/* Top Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded">⌘K</kbd>
            </div>

            <div className="flex items-center gap-4">
              {/* User Avatars */}
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-orange-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
                <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">B</div>
                <div className="w-8 h-8 rounded-full bg-pink-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">C</div>
              </div>

              {/* Add button */}
              <button className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Export button */}
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Filters and Add Widget */}
          <div className="flex items-center justify-between mb-8">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Widget
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Tournaments"
              value={dashboardStats.totalTournaments.toString()}
              subtitle="All tournaments"
              trend="up"
              trendValue="12%"
              trendColor="text-green-500"
              accentColor="text-orange-500"
            />

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <p className="text-gray-600 text-sm font-medium mb-2">Select by product</p>
              <div className="space-y-2">
                {['Cosmetics', 'Housewest'].map((product) => (
                  <label key={product} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(p => p !== product));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{product}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">New sales: 453</p>
            </div>

            <StatCard
              title="Active Tournaments"
              value={dashboardStats.activeTournaments.toString()}
              subtitle="Currently running"
              trend="up"
              trendValue="12%"
              trendColor="text-green-500"
              accentColor="text-orange-500"
            />

            <StatCard
              title="Total Participants"
              value={dashboardStats.totalParticipants.toString()}
              subtitle="Across all teams"
              trend="up"
              trendValue="7%"
              trendColor="text-green-500"
              accentColor="text-orange-500"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <UpcomingMatches />
            </div>
            <SalesPerformance />
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Visits */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Total Matches</h3>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalMatches}</p>
                    <p className="text-xs text-green-600 mt-1">↑ 4%</p>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>

              {/* Mini heatmap */}
              <div className="space-y-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8">{day}</span>
                    <div className="flex gap-1 flex-1">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="h-6 flex-1 rounded"
                          style={{
                            backgroundColor: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706'][Math.floor(Math.random() * 6)]
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Badge */}
              <div className="mt-4 inline-block bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                ↑ 3,880.6AM
              </div>
            </div>

            {/* Top Products */}
            <TopProducts />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
