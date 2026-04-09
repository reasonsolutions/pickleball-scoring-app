import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  setDoc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AdminDraftView() {
  const [draftState, setDraftState] = useState({
    paused: false,
    timeLeft: 120,
    currentPicker: 'Team Alpha',
    started: false,
    currentPickIndex: 0,
    currentRound: 1,
    completed: false,
    pendingApproval: null
  });
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [draftSettings, setDraftSettings] = useState(null);
  const [draftOrder, setDraftOrder] = useState([]);
  const navigate = useNavigate();

  // Fetch draft settings
  const fetchDraftSettings = async () => {
    try {
      const settingsRef = doc(db, 'draftSettings', 'main');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const savedSettings = settingsSnap.data();
        setDraftSettings(savedSettings);
        console.log('✅ Draft settings loaded:', savedSettings);
      } else {
        setDraftSettings({
          maxPlayersPerTeam: 8,
          enforceFirstPickGender: false
        });
      }
    } catch (error) {
      console.error('❌ Error fetching draft settings:', error);
      setDraftSettings({ maxPlayersPerTeam: 8 });
    }
  };

  // Fetch teams
  const fetchTeamsWithCurrentSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'draftSettings', 'main'));
      const currentSettings = settingsDoc.exists() ? settingsDoc.data() : null;
      
      let teamsQuery;
      if (currentSettings?.draftOrder === 'manual') {
        teamsQuery = query(
          collection(db, 'draftTeams'),
          orderBy('draftOrder')
        );
      } else {
        teamsQuery = query(
          collection(db, 'draftTeams'),
          orderBy('createdAt')
        );
      }
      
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);

      const maxPlayersPerTeam = currentSettings?.maxPlayersPerTeam || 8;
      const generatedOrder = generateDraftOrder(teamsData, maxPlayersPerTeam);
      setDraftOrder(generatedOrder);
      
      return teamsData;
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  };

  // Generate snake draft order
  const generateDraftOrder = (teamsData, maxPlayersPerTeam = 8) => {
    if (!teamsData.length) return [];
    
    const rounds = maxPlayersPerTeam;
    const order = [];
    
    for (let round = 1; round <= rounds; round++) {
      if (round % 2 === 1) {
        teamsData.forEach(team => {
          order.push({
            round,
            teamId: team.id,
            teamName: team.name
          });
        });
      } else {
        [...teamsData].reverse().forEach(team => {
          order.push({
            round,
            teamId: team.id,
            teamName: team.name
          });
        });
      }
    }
    
    return order;
  };

  // Initialize draft state
  const initializeDraftState = async () => {
    try {
      const draftStateRef = doc(db, 'draftState', 'current');
      const draftStateDoc = await getDoc(draftStateRef);
      
      if (!draftStateDoc.exists()) {
        await setDoc(draftStateRef, {
          paused: false,
          timeLeft: 120,
          currentPicker: 'Team Alpha',
          started: false,
          currentPickIndex: 0,
          currentRound: 1,
          lastUpdated: serverTimestamp()
        });
        console.log('Draft state initialized');
      }
    } catch (error) {
      console.error('Error initializing draft state:', error);
    }
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await initializeDraftState();
      await fetchDraftSettings();
      await fetchTeamsWithCurrentSettings();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

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
          pendingApproval: data.pendingApproval || null
        });
        
        if (data.draftOrder && Array.isArray(data.draftOrder)) {
          setDraftOrder(data.draftOrder);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to players
  useEffect(() => {
    const playersQuery = query(
      collection(db, 'draftPlayers'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(playersQuery, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersData);
    });

    return () => unsubscribe();
  }, []);

  const handleStartDraft = async () => {
    try {
      console.log('🚀 Starting draft...');
      
      const settingsQuery = query(collection(db, 'draftSettings'));
      const snapshot = await getDocs(settingsQuery);
      let roundTime = 120;
      if (!snapshot.empty) {
        roundTime = snapshot.docs[0].data().roundTime || 120;
      }

      const firstPick = draftOrder.length > 0 ? draftOrder[0] : null;
      const startingPicker = firstPick ? firstPick.teamName : 'Team Alpha';
      const startingRound = firstPick ? firstPick.round : 1;

      const draftStateRef = doc(db, 'draftState', 'current');
      await updateDoc(draftStateRef, {
        started: true,
        paused: false,
        timeLeft: roundTime,
        currentPickIndex: 0,
        currentRound: startingRound,
        currentPicker: startingPicker,
        draftOrder: draftOrder,
        lastUpdated: serverTimestamp()
      });
      
      console.log('🎉 Draft started successfully!');
      alert('Draft started!');
    } catch (error) {
      console.error('❌ Error starting draft:', error);
      alert('Failed to start draft. Please try again.');
    }
  };

  const handlePauseDraft = async () => {
    try {
      const draftStateRef = doc(db, 'draftState', 'current');
      await updateDoc(draftStateRef, {
        paused: !draftState.paused,
        lastUpdated: serverTimestamp()
      });
      console.log(draftState.paused ? 'Draft resumed' : 'Draft paused');
    } catch (error) {
      console.error('Error updating draft state:', error);
      alert('Failed to update draft state. Please try again.');
    }
  };

  const handleRestartDraft = async () => {
    if (adminCredentials.username === 'admin' && adminCredentials.password === 'admin123') {
      try {
        console.log('🔄 Starting draft restart process...');
        
        if (players && players.length > 0) {
          const batchSize = 500;
          const batches = [];
          
          for (let i = 0; i < players.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchPlayers = players.slice(i, i + batchSize);
            
            batchPlayers.forEach(player => {
              if (player && player.id) {
                const playerRef = doc(db, 'draftPlayers', player.id);
                batch.update(playerRef, {
                  drafted: false,
                  team: null,
                  teamId: null,
                  round: null,
                  pickNumber: null,
                  updatedAt: serverTimestamp()
                });
              }
            });
            
            batches.push(batch);
          }
          
          await Promise.all(batches.map(batch => batch.commit()));
          console.log('✅ All players reset');
        }
        
        const settingsQuery = query(collection(db, 'draftSettings'));
        const snapshot = await getDocs(settingsQuery);
        let roundTime = 120;
        if (!snapshot.empty) {
          roundTime = snapshot.docs[0].data().roundTime || 120;
        }
        
        const draftStateRef = doc(db, 'draftState', 'current');
        await updateDoc(draftStateRef, {
          paused: false,
          timeLeft: roundTime,
          currentPicker: teams.length > 0 ? teams[0].name : 'Team Alpha',
          started: false,
          currentPickIndex: 0,
          currentRound: 1,
          completed: false,
          completedAt: null,
          pendingApproval: null,
          draftOrder: draftOrder,
          lastUpdated: serverTimestamp()
        });
        
        setShowRestartModal(false);
        setAdminCredentials({ username: '', password: '' });
        console.log('🎉 Draft restarted!');
        alert('Draft has been restarted successfully!');
      } catch (error) {
        console.error('❌ Error restarting draft:', error);
        alert('Failed to restart draft. Please try again.');
      }
    } else {
      alert('Invalid admin credentials!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="text-center">
          <div className="loading loading-spinner loading-lg" style={{ color: 'var(--primary-blue)' }}></div>
          <p className="mt-4 text-xl" style={{ color: 'var(--text-primary)' }}>Loading Admin Draft Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Draft Control</h1>
            <p className="text-white">Manage draft session and player assignments</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/draft')}
              className="px-4 py-2 bg-gray-500/20 border border-gray-500/50 text-white rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Back to Draft
            </button>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Draft Controls</h2>
          
          <div className="flex flex-wrap gap-4">
            {!draftState.started ? (
              <button
                onClick={handleStartDraft}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Start Draft
              </button>
            ) : (
              <button
                onClick={handlePauseDraft}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  draftState.paused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {draftState.paused ? 'Resume Draft' : 'Pause Draft'}
              </button>
            )}
            
            <button
              onClick={() => setShowRestartModal(true)}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Restart Draft
            </button>
          </div>

          {draftState.paused && (
            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-white font-medium">⏸️ Draft is currently paused</p>
            </div>
          )}

          {draftState.completed && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-white font-medium">🎉 Draft completed!</p>
            </div>
          )}

          {draftState.started && !draftState.completed && draftSettings && (
            <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <h3 className="text-white font-medium mb-3">📊 Draft Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map(team => {
                  const playerCount = players.filter(p => p.drafted && p.teamId === team.id).length;
                  const maxPlayers = draftSettings.maxPlayersPerTeam;
                  const isComplete = playerCount >= maxPlayers;
                  const progressPercentage = (playerCount / maxPlayers) * 100;
                  
                  return (
                    <div key={team.id} className={`bg-white/10 rounded-lg p-3 border ${
                      isComplete
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">{team.name}</span>
                        {isComplete && (
                          <span className="text-green-400 text-xs font-medium">✅ Complete</span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white">
                          <span>{playerCount}/{maxPlayers} players</span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isComplete
                                ? 'bg-green-500'
                                : progressPercentage > 75
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Restart Modal */}
        {showRestartModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Restart Draft</h3>
              <p className="text-white mb-4">
                This will reset all player assignments and restart the draft from scratch.
                Please enter admin credentials to confirm.
              </p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Admin Username"
                  value={adminCredentials.username}
                  onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="password"
                  placeholder="Admin Password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRestartModal(false);
                    setAdminCredentials({ username: '', password: '' });
                  }}
                  className="px-4 py-2 bg-gray-500/20 border border-gray-500/50 text-white rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestartDraft}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Restart Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
