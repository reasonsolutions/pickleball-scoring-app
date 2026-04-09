import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function DraftSettings({ setActiveTab }) {
  const [settings, setSettings] = useState({
    draftType: 'snake',
    roundTime: 60,
    autoAdvance: true,
    allowTrades: false,
    maxPlayersPerTeam: 8,
    draftOrder: 'random',
    enforceFirstPickGender: false
  });

  const [teams, setTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Fetch teams and settings from Firestore
  useEffect(() => {
    fetchDraftSettings();
    fetchTeams();
  }, []);

  // Refresh teams when draft order changes to manual
  useEffect(() => {
    if (settings.draftOrder === 'manual') {
      fetchTeams();
    }
  }, [settings.draftOrder]);

  const fetchDraftSettings = async () => {
    try {
      console.log('🔥 Fetching draft settings from Firestore');
      const settingsRef = doc(db, 'draftSettings', 'main');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const savedSettings = settingsSnap.data();
        setSettings(prev => ({
          ...prev,
          ...savedSettings
        }));
        console.log('✅ Draft settings loaded:', savedSettings);
      } else {
        console.log('📝 No existing draft settings found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error fetching draft settings:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      setIsLoadingTeams(true);
      console.log('🔥 Fetching draft teams for ordering');
      
      const teamsRef = collection(db, 'draftTeams');
      
      let snapshot;
      try {
        const q = query(teamsRef, orderBy('draftOrder', 'asc'));
        snapshot = await getDocs(q);
        console.log('📊 Query by draftOrder successful, found:', snapshot.docs.length, 'teams');
      } catch (orderError) {
        console.log('📝 draftOrder field not found, using createdAt order. Error:', orderError.message);
        try {
          const q = query(teamsRef, orderBy('createdAt', 'asc'));
          snapshot = await getDocs(q);
          console.log('📊 Query by createdAt successful, found:', snapshot.docs.length, 'teams');
        } catch (createdAtError) {
          console.log('📝 createdAt field not found, using basic query result. Error:', createdAtError.message);
          snapshot = await getDocs(teamsRef);
          console.log('📊 Using basic query result, found:', snapshot.docs.length, 'teams');
        }
      }
      
      const teamsData = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        draftOrder: doc.data().draftOrder || index + 1
      }));
      
      console.log('📋 Processed teams data:', teamsData);
      
      const teamsNeedingOrder = teamsData.filter(team => !team.draftOrder || team.draftOrder === 0);
      if (teamsNeedingOrder.length > 0) {
        console.log('🔧 Assigning draft order to teams without it:', teamsNeedingOrder.length, 'teams');
        await assignInitialDraftOrder(teamsData);
      }
      
      teamsData.sort((a, b) => a.draftOrder - b.draftOrder);
      
      setTeams(teamsData);
      console.log('✅ Draft teams fetched for ordering:', teamsData.length, 'teams');
    } catch (error) {
      console.error('❌ Error fetching draft teams:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const assignInitialDraftOrder = async (teams) => {
    try {
      const batch = writeBatch(db);
      
      teams.forEach((team, index) => {
        if (!team.draftOrder || team.draftOrder === 0) {
          const teamRef = doc(db, 'draftTeams', team.id);
          batch.update(teamRef, {
            draftOrder: index + 1,
            updatedAt: serverTimestamp()
          });
          team.draftOrder = index + 1;
        }
      });
      
      await batch.commit();
      console.log('✅ Initial draft order assigned to teams');
    } catch (error) {
      console.error('❌ Error assigning initial draft order:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDragStart = (e, team, index) => {
    setDraggedTeam({ team, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (!draggedTeam || draggedTeam.index === dropIndex) {
      setDraggedTeam(null);
      setDragOverIndex(null);
      return;
    }

    const newTeams = [...teams];
    const draggedItem = newTeams[draggedTeam.index];
    
    newTeams.splice(draggedTeam.index, 1);
    newTeams.splice(dropIndex, 0, draggedItem);
    
    const updatedTeams = newTeams.map((team, index) => ({
      ...team,
      draftOrder: index + 1
    }));
    
    setTeams(updatedTeams);
    setDraggedTeam(null);
    setDragOverIndex(null);
    
    console.log('✅ Team order updated:', updatedTeams.map(t => `${t.draftOrder}. ${t.name}`));
    
    await saveTeamOrder(updatedTeams);
  };

  const handleDragEnd = () => {
    setDraggedTeam(null);
    setDragOverIndex(null);
  };

  const handleSaveSettings = async () => {
    try {
      console.log('🔥 Saving draft settings to Firestore:', settings);
      
      const settingsRef = doc(db, 'draftSettings', 'main');
      const settingsData = {
        ...settings,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(settingsRef, settingsData, { merge: true });
      console.log('✅ Draft settings saved successfully');
      
      if (settings.draftOrder === 'manual' && teams.length > 0) {
        console.log('🔥 Saving current team draft order to Firestore');
        await saveTeamOrder(teams);
        console.log('✅ Team draft order saved successfully');
      }
      
      alert('Draft settings and team order saved successfully!');
    } catch (error) {
      console.error('❌ Error saving draft settings:', error);
      alert('Error saving draft settings. Please try again.');
    }
  };

  const saveTeamOrder = async (updatedTeams) => {
    try {
      console.log('🔥 Saving team order to Firestore');
      
      const batch = writeBatch(db);
      
      updatedTeams.forEach(team => {
        const teamRef = doc(db, 'draftTeams', team.id);
        batch.update(teamRef, {
          draftOrder: team.draftOrder,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('✅ Team order saved successfully');
    } catch (error) {
      console.error('❌ Error saving team order:', error);
      alert('Error saving team order. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Basic Settings */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Basic Settings
          </h3>
          
          {/* Draft Type */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Draft Type
              </span>
            </label>
            <select
              className="select select-bordered w-full"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                zIndex: 10
              }}
              value={settings.draftType}
              onChange={(e) => handleSettingChange('draftType', e.target.value)}
            >
              <option value="snake" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Snake Draft</option>
              <option value="linear" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Linear Draft</option>
              <option value="auction" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Auction Draft</option>
            </select>
            <label className="label">
              <span className="label-text-alt" style={{ color: 'var(--text-muted)' }}>
                Choose how the draft order will proceed
              </span>
            </label>
          </div>

          {/* Draft Order */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Draft Order
              </span>
            </label>
            <select
              className="select select-bordered w-full"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                zIndex: 10
              }}
              value={settings.draftOrder}
              onChange={(e) => handleSettingChange('draftOrder', e.target.value)}
            >
              <option value="random" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Random Order</option>
              <option value="standings" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Based on Standings</option>
              <option value="manual" style={{ backgroundColor: '#ffffff', color: '#000000' }}>Manual Order</option>
            </select>
            <label className="label">
              <span className="label-text-alt" style={{ color: 'var(--text-muted)' }}>
                How to determine the draft order
              </span>
            </label>
          </div>
        </div>

        {/* Right Column - Timing & Limits */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Timing & Limits
          </h3>
          
          {/* Round Time */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Round Time (seconds)
              </span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              value={settings.roundTime}
              onChange={(e) => handleSettingChange('roundTime', parseInt(e.target.value))}
              min="10"
              max="300"
            />
            <label className="label">
              <span className="label-text-alt" style={{ color: 'var(--text-muted)' }}>
                Time limit for each draft pick (10-300 seconds)
              </span>
            </label>
          </div>

          {/* Max Players Per Team */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Max Players Per Team
              </span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              value={settings.maxPlayersPerTeam}
              onChange={(e) => handleSettingChange('maxPlayersPerTeam', parseInt(e.target.value))}
              min="4"
              max="20"
            />
            <label className="label">
              <span className="label-text-alt" style={{ color: 'var(--text-muted)' }}>
                Maximum number of players each team can draft
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Draft Order Section - Full Width */}
      {settings.draftOrder === 'manual' && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Draft Order
            </h3>
            <button
              className="btn btn-sm btn-outline"
              style={{
                borderColor: 'var(--primary-blue)',
                color: 'var(--primary-blue)'
              }}
              onClick={fetchTeams}
              disabled={isLoadingTeams}
            >
              {isLoadingTeams ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Teams
                </>
              )}
            </button>
          </div>
          
          {isLoadingTeams ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg" style={{ color: 'var(--primary-blue)' }}></span>
              <span className="ml-3 text-lg" style={{ color: 'var(--text-secondary)' }}>Loading teams...</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No Teams Found
              </h4>
              <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
                You need to add teams first before setting up the draft order.
              </p>
              <div className="mb-4">
                <button
                  className="btn btn-lg"
                  style={{
                    backgroundColor: 'var(--primary-green)',
                    color: 'var(--text-primary)',
                    border: 'none'
                  }}
                  onClick={() => {
                    if (setActiveTab) {
                      setActiveTab('teams');
                    } else {
                      alert('Please click on the "Teams" tab above to add teams first.');
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Go to Teams Tab
                </button>
              </div>
              <div className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
                <div>1. Click "Go to Teams Tab" or the "Teams" tab above</div>
                <div>2. Add teams using the "Add Team" button</div>
                <div>3. Return to this tab to set up draft order</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
                Drag and drop teams to set the draft order. The number indicates the pick position.
              </p>
              
              {/* Horizontal scrollable container for teams */}
              <div className="overflow-x-auto pb-4">
                <div className="flex space-x-4 min-w-max">
                  {teams.map((team, index) => (
                    <div
                      key={team.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, team, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex-shrink-0 w-48 p-4 rounded-lg border-2 cursor-move transition-all duration-200 ${
                        draggedTeam?.index === index
                          ? 'opacity-50 scale-95'
                          : dragOverIndex === index
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105'
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                      }`}
                      style={{
                        backgroundColor: dragOverIndex === index
                          ? 'var(--bg-hover)'
                          : 'var(--bg-card)',
                        borderColor: dragOverIndex === index
                          ? 'var(--primary-blue)'
                          : 'var(--border-color)'
                      }}
                    >
                      {/* Draft Order Number */}
                      <div
                        className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                        style={{ backgroundColor: 'var(--primary-blue)' }}
                      >
                        {team.draftOrder}
                      </div>
                      
                      {/* Team Logo */}
                      <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-input)' }}>
                          {team.logoURL ? (
                            <img
                              src={team.logoURL}
                              alt={`${team.name} logo`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      {/* Team Name */}
                      <h4 className="text-center text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {team.name}
                      </h4>
                      
                      {/* Drag Handle */}
                      <div className="flex justify-center mt-2">
                        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Instructions */}
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      How to reorder teams:
                    </h5>
                    <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <li>• Click and drag any team card to reorder</li>
                      <li>• The number on each card shows the draft pick position</li>
                      <li>• Team #1 gets the first pick, Team #2 gets the second pick, etc.</li>
                      <li>• Changes are saved automatically when you drop a team</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Settings - Full Width */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Advanced Options
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border"
                   style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.autoAdvance}
                onChange={(e) => handleSettingChange('autoAdvance', e.target.checked)}
              />
              <div className="flex-1">
                <span className="label-text text-lg font-semibold block" style={{ color: 'var(--text-primary)' }}>
                  Auto-advance rounds
                </span>
                <div className="label-text-alt mt-1" style={{ color: 'var(--text-muted)' }}>
                  Automatically move to next pick when time expires
                </div>
              </div>
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border"
                   style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.allowTrades}
                onChange={(e) => handleSettingChange('allowTrades', e.target.checked)}
              />
              <div className="flex-1">
                <span className="label-text text-lg font-semibold block" style={{ color: 'var(--text-primary)' }}>
                  Allow trades
                </span>
                <div className="label-text-alt mt-1" style={{ color: 'var(--text-muted)' }}>
                  Enable player trading between teams during draft
                </div>
              </div>
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border"
                   style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.enforceFirstPickGender}
                onChange={(e) => handleSettingChange('enforceFirstPickGender', e.target.checked)}
              />
              <div className="flex-1">
                <span className="label-text text-lg font-semibold block" style={{ color: 'var(--text-primary)' }}>
                  Enforce first pick gender rule
                </span>
                <div className="label-text-alt mt-1" style={{ color: 'var(--text-muted)' }}>
                  First pick must be opposite gender to team captain
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button - Full Width */}
      <div className="mt-8 flex justify-center">
        <button
          className="btn btn-lg px-8"
          style={{
            backgroundColor: 'var(--primary-green)',
            color: 'var(--text-primary)',
            border: 'none'
          }}
          onClick={handleSaveSettings}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Save Draft Settings
        </button>
      </div>
    </div>
  );
}
