import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function AdminDashboard() {
  const { currentUser } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="hero gradient-primary rounded-lg text-white mb-8">
          <div className="hero-content text-center py-12">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Welcome back!</h1>
              <p className="text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
                Hello {currentUser?.displayName || 'Tournament Organizer'}!
                Ready to manage your pickleball tournaments?
              </p>
              <Link to="/admin/tournaments" className="btn btn-lg" style={{
                backgroundColor: 'var(--accent-yellow)',
                color: 'var(--text-primary)',
                border: 'none'
              }}>
                View My Tournaments
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-figure" style={{ color: 'var(--primary-blue)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Total Tournaments</div>
            <div className="stat-value" style={{ color: 'var(--primary-blue)' }}>0</div>
            <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>All time</div>
          </div>

          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-figure" style={{ color: 'var(--primary-green)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Active Tournaments</div>
            <div className="stat-value" style={{ color: 'var(--primary-green)' }}>0</div>
            <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>Currently running</div>
          </div>

          <div className="stat rounded-lg card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="stat-figure" style={{ color: 'var(--accent-yellow)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-title" style={{ color: 'var(--text-secondary)' }}>Total Participants</div>
            <div className="stat-value" style={{ color: 'var(--accent-yellow)' }}>0</div>
            <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>Across all tournaments</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card shadow-xl card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/admin/tournaments/create" className="btn btn-lg justify-start" style={{
                backgroundColor: 'var(--primary-green)',
                color: 'var(--text-primary)',
                border: 'none'
              }}>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Tournament
              </Link>
              
              <Link to="/admin/tournaments" className="btn btn-outline btn-lg justify-start" style={{
                borderColor: 'var(--primary-blue)',
                color: 'var(--primary-blue)'
              }}>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                View All Tournaments
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card shadow-xl mt-8 card-fitMove" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>Getting Started</h2>
            <div className="steps steps-vertical lg:steps-horizontal">
              <div className="step step-primary" style={{ color: 'var(--primary-green)' }}>Create Tournament</div>
              <div className="step" style={{ color: 'var(--text-secondary)' }}>Set Rules & Prizes</div>
              <div className="step" style={{ color: 'var(--text-secondary)' }}>Manage Participants</div>
              <div className="step" style={{ color: 'var(--text-secondary)' }}>Track Results</div>
            </div>
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
              Start by creating your first tournament. Set up the details, rules, and prize money to get participants excited!
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}