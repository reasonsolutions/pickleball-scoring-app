import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function DraftMainScreenDisplay() {
  const [draftState, setDraftState] = useState({
    paused: false,
    timeLeft: 120,
    currentPicker: 'Team Alpha',
    started: false,
    currentPickIndex: 0,
    currentRound: 1,
    completed: false,
    pendingApproval: null,
    showPickAnimation: null
  });
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen to draft state changes
  useEffect(() => {
    const draftStateRef = doc(db, 'draftState', 'current');
    const unsubscribe = onSnapshot(draftStateRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDraftState({
          paused: data.paused || false,
          timeLeft: data.timeLeft || 120,
          currentPicker: data.currentPicker || 'Team Alpha',
          started: data.started || false,
          currentPickIndex: data.currentPickIndex || 0,
          currentRound: data.currentRound || 1,
          completed: data.completed || false,
          pendingApproval: data.pendingApproval || null,
          showPickAnimation: data.showPickAnimation || null
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="text-center">
          <div className="loading loading-spinner loading-lg" style={{ color: 'var(--primary-blue)' }}></div>
          <p className="mt-4 text-xl" style={{ color: 'var(--text-primary)' }}>Loading Draft Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r" style={{ backgroundImage: 'linear-gradient(to right, var(--primary-blue), var(--primary-green))' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-bold text-white mb-2">Draft Management</h1>
          <p className="text-xl text-white/90">Live Draft Display</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!draftState.started ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🎯</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Draft Not Started
            </h2>
            <p className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              Waiting for admin to start the draft...
            </p>
          </div>
        ) : draftState.completed ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Draft Completed!
            </h2>
            <p className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              All teams have completed their selections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Picker */}
            <div className="lg:col-span-2">
              <div className="card shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body">
                  <h2 className="card-title text-3xl mb-6" style={{ color: 'var(--text-primary)' }}>
                    Current Picker
                  </h2>
                  
                  <div className="text-center py-12">
                    <p className="text-6xl font-bold mb-4" style={{ color: 'var(--primary-blue)' }}>
                      {draftState.currentPicker}
                    </p>
                    <p className="text-2xl mb-8" style={{ color: 'var(--text-secondary)' }}>
                      Round {draftState.currentRound} • Pick #{draftState.currentPickIndex + 1}
                    </p>
                    
                    {/* Timer */}
                    <div className="flex justify-center mb-8">
                      <div className="text-center">
                        <div className="text-7xl font-bold" style={{ color: draftState.timeLeft <= 10 ? '#ef4444' : 'var(--primary-green)' }}>
                          {draftState.timeLeft}
                        </div>
                        <p className="text-xl mt-2" style={{ color: 'var(--text-secondary)' }}>seconds</p>
                      </div>
                    </div>

                    {/* Status */}
                    {draftState.paused && (
                      <div className="alert alert-warning">
                        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 4v2M7.08 6.47A9 9 0 1 1 6 12"></path>
                        </svg>
                        <span style={{ color: 'var(--text-primary)' }}>Draft is paused</span>
                      </div>
                    )}

                    {draftState.pendingApproval && (
                      <div className="alert alert-info">
                        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span style={{ color: 'var(--text-primary)' }}>
                          Awaiting approval for {draftState.pendingApproval.playerName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Draft Info */}
            <div className="space-y-6">
              <div className="card shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body">
                  <h3 className="card-title text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
                    Draft Status
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Round</p>
                      <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                        {draftState.currentRound}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Pick</p>
                      <p className="text-3xl font-bold" style={{ color: 'var(--primary-green)' }}>
                        #{draftState.currentPickIndex + 1}
                      </p>
                    </div>

                    <div className="divider"></div>

                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-3 h-3 rounded-full ${draftState.paused ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {draftState.paused ? 'Paused' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pick Animation */}
              {draftState.showPickAnimation && (
                <div className="card shadow-xl bg-gradient-to-br" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--primary-blue), var(--primary-green))' }}>
                  <div className="card-body text-center">
                    <h3 className="card-title text-white text-2xl mb-4 justify-center">
                      🎬 Pick Animation
                    </h3>
                    <p className="text-white text-lg font-bold mb-2">
                      {draftState.showPickAnimation.playerName}
                    </p>
                    <p className="text-white text-sm">
                      → {draftState.showPickAnimation.teamName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
