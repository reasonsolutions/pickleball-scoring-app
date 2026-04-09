import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function TeamDraftRoom() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teamUsername, setTeamUsername] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [currentTeam, setCurrentTeam] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Listen to draft state
  useEffect(() => {
    if (!isLoggedIn) return;

    const draftStateRef = doc(db, 'draftState', 'current');
    const unsubscribe = onSnapshot(draftStateRef, (doc) => {
      if (doc.exists()) {
        setDraftState(doc.data());
      }
    });

    return () => unsubscribe();
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real implementation, you would verify credentials against Firestore
      // For now, we'll just accept any non-empty credentials
      if (!teamUsername.trim() || !teamPassword.trim()) {
        setError('Please enter both username and password');
        setLoading(false);
        return;
      }

      // Simulate team login - in production, verify against draftTeams collection
      setCurrentTeam({
        username: teamUsername,
        name: teamUsername.charAt(0).toUpperCase() + teamUsername.slice(1)
      });
      setIsLoggedIn(true);

      // Create/update team session
      await setDoc(doc(db, 'teamSessions', teamUsername), {
        teamName: teamUsername,
        loginTime: serverTimestamp(),
        isActive: true
      }, { merge: true });

    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Update team session
      await setDoc(doc(db, 'teamSessions', teamUsername), {
        isActive: false,
        logoutTime: serverTimestamp()
      }, { merge: true });

      setIsLoggedIn(false);
      setCurrentTeam(null);
      setTeamUsername('');
      setTeamPassword('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="w-full max-w-md">
          <div className="card shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-body">
              <h1 className="card-title text-3xl text-center mb-6" style={{ color: 'var(--text-primary)' }}>
                Team Draft Room
              </h1>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Team Username
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter team username"
                    className="input input-bordered"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    value={teamUsername}
                    onChange={(e) => setTeamUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Team Password
                    </span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter team password"
                    className="input input-bordered"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="alert alert-error">
                    <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2"></path>
                    </svg>
                    <span style={{ color: 'var(--text-primary)' }}>{error}</span>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  className="btn btn-block"
                  style={{
                    backgroundColor: 'var(--primary-green)',
                    color: 'var(--text-primary)',
                    border: 'none'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Logging in...
                    </>
                  ) : (
                    'Login to Draft Room'
                  )}
                </button>
              </form>

              {/* Info */}
              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enter your team credentials to access the draft room and participate in the live draft.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r" style={{ backgroundImage: 'linear-gradient(to right, var(--primary-blue), var(--primary-green))' }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Team Draft Room</h1>
            <p className="text-xl text-white/90">Welcome, {currentTeam?.name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline text-white border-white hover:bg-white hover:text-blue-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!draftState?.started ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">⏳</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Waiting for Draft to Start
            </h2>
            <p className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              The admin will start the draft soon. Please wait...
            </p>
          </div>
        ) : draftState?.completed ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Draft Completed!
            </h2>
            <p className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              Thank you for participating in the draft.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Draft Status */}
            <div className="lg:col-span-2">
              <div className="card shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body">
                  <h2 className="card-title text-3xl mb-6" style={{ color: 'var(--text-primary)' }}>
                    Current Pick
                  </h2>
                  
                  <div className="text-center py-12">
                    <p className="text-5xl font-bold mb-4" style={{ color: 'var(--primary-blue)' }}>
                      {draftState?.currentPicker}
                    </p>
                    <p className="text-2xl mb-8" style={{ color: 'var(--text-secondary)' }}>
                      Round {draftState?.currentRound} • Pick #{draftState?.currentPickIndex + 1}
                    </p>
                    
                    {/* Timer */}
                    <div className="flex justify-center mb-8">
                      <div className="text-center">
                        <div className="text-6xl font-bold" style={{ color: draftState?.timeLeft <= 10 ? '#ef4444' : 'var(--primary-green)' }}>
                          {draftState?.timeLeft}
                        </div>
                        <p className="text-lg mt-2" style={{ color: 'var(--text-secondary)' }}>seconds</p>
                      </div>
                    </div>

                    {/* Your Turn Indicator */}
                    {draftState?.currentPicker === currentTeam?.name && (
                      <div className="alert alert-success">
                        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span style={{ color: 'var(--text-primary)' }}>It's your turn to pick!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Info */}
            <div className="space-y-6">
              <div className="card shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body">
                  <h3 className="card-title text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
                    Your Team
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Team Name</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                        {currentTeam?.name}
                      </p>
                    </div>
                    
                    <div className="divider"></div>

                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Draft Status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-3 h-3 rounded-full ${draftState?.paused ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {draftState?.paused ? 'Paused' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="card shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body">
                  <h3 className="card-title text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                    Instructions
                  </h3>
                  
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <li>✓ Watch for your team's turn</li>
                    <li>✓ When it's your turn, you'll see a notification</li>
                    <li>✓ Make your selection within the time limit</li>
                    <li>✓ Wait for the next round to begin</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
