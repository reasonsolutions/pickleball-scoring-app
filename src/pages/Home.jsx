import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function Home() {
  const { currentUser } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="hero bg-gradient-to-r from-primary to-secondary rounded-lg text-primary-content mb-8">
          <div className="hero-content text-center py-12">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold mb-4">Welcome back!</h1>
              <p className="text-xl mb-6">
                Hello {currentUser?.displayName || 'Tournament Organizer'}! 
                Ready to manage your pickleball tournaments?
              </p>
              <Link to="/tournaments" className="btn btn-accent btn-lg">
                View My Tournaments
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="stat-title">Total Tournaments</div>
            <div className="stat-value text-primary">0</div>
            <div className="stat-desc">All time</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-secondary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-title">Active Tournaments</div>
            <div className="stat-value text-secondary">0</div>
            <div className="stat-desc">Currently running</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-title">Total Participants</div>
            <div className="stat-value text-accent">0</div>
            <div className="stat-desc">Across all tournaments</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/tournaments/create" className="btn btn-primary btn-lg justify-start">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Tournament
              </Link>
              
              <Link to="/tournaments" className="btn btn-outline btn-lg justify-start">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                View All Tournaments
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Getting Started</h2>
            <div className="steps steps-vertical lg:steps-horizontal">
              <div className="step step-primary">Create Tournament</div>
              <div className="step">Set Rules & Prizes</div>
              <div className="step">Manage Participants</div>
              <div className="step">Track Results</div>
            </div>
            <p className="mt-4 text-base-content/70">
              Start by creating your first tournament. Set up the details, rules, and prize money to get participants excited!
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}