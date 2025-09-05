import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function AddFixtures() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [fixtures, setFixtures] = useState({});
  const [fixtureGroups, setFixtureGroups] = useState({});
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedDateForView, setSelectedDateForView] = useState(null);
  
  // Edit fixture state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    player1Team1: '',
    player2Team1: '',
    player1Team2: '',
    player2Team2: '',
    youtubeLink: ''
  });
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fixtureToDelete, setFixtureToDelete] = useState(null);
  
  // Modal form state
  const [fixtureForm, setFixtureForm] = useState({
    matchType: '',
    team1: '',
    team2: '',
    time: '',
    player1Team1: '',
    player2Team1: '',
    player1Team2: '',
    player2Team2: '',
    youtubeLink: ''
  });

  // Bulk fixture form state
  const [bulkFixtureForm, setBulkFixtureForm] = useState({
    team1: '',
    team2: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    const fetchTournamentData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          setTournament(tournamentData);
          
          // Fetch teams for this tournament
          const teamsQuery = query(
            collection(db, 'teams'),
            where('tournamentId', '==', id)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          const teamsData = teamsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTeams(teamsData);
          
          // Fetch players for this tournament
          const playersQuery = query(
            collection(db, 'players'),
            where('tournamentId', '==', id)
          );
          const playersSnapshot = await getDocs(playersQuery);
          const playersData = playersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPlayers(playersData);
          
          // Fetch existing fixtures
          const fixturesQuery = query(
            collection(db, 'fixtures'),
            where('tournamentId', '==', id)
          );
          const fixturesSnapshot = await getDocs(fixturesQuery);
          const fixturesData = {};
          const fixtureGroupsData = {};
          
          fixturesSnapshot.docs.forEach(doc => {
            const fixture = { id: doc.id, ...doc.data() };
            const dateKey = fixture.date.toDate().toDateString();
            
            // Group individual fixtures by date
            if (!fixturesData[dateKey]) {
              fixturesData[dateKey] = [];
            }
            fixturesData[dateKey].push(fixture);
            
            // Group fixtures by team matchup and date for the new view
            if (fixture.fixtureGroupId) {
              const groupKey = `${dateKey}_${fixture.fixtureGroupId}`;
              if (!fixtureGroupsData[groupKey]) {
                fixtureGroupsData[groupKey] = {
                  id: fixture.fixtureGroupId,
                  team1: fixture.team1,
                  team2: fixture.team2,
                  team1Name: fixture.team1Name,
                  team2Name: fixture.team2Name,
                  date: fixture.date,
                  dateKey: dateKey,
                  matches: []
                };
              }
              fixtureGroupsData[groupKey].matches.push(fixture);
            }
          });
          
          setFixtures(fixturesData);
          setFixtureGroups(fixtureGroupsData);
        } else {
          setError('Tournament not found');
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const generateDateRange = () => {
    if (!tournament?.startDate || !tournament?.endDate) return [];
    
    const startDate = tournament.startDate.toDate();
    const endDate = tournament.endDate.toDate();
    const dates = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    
    return dates;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAvailableCategories = () => {
    if (!tournament?.categories) return [];
    
    return Object.entries(tournament.categories)
      .filter(([_, selected]) => selected)
      .map(([key, _]) => {
        switch (key) {
          case 'mensSingles': return { key, label: "Men's Singles", type: 'singles' };
          case 'mensDoubles': return { key, label: "Men's Doubles", type: 'doubles' };
          case 'womensSingles': return { key, label: "Women's Singles", type: 'singles' };
          case 'womensDoubles': return { key, label: "Women's Doubles", type: 'doubles' };
          case 'mixedDoubles': return { key, label: "Mixed Doubles", type: 'doubles' };
          default: return { key, label: key, type: 'singles' };
        }
      });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowModal(true);
    setFixtureForm({
      matchType: '',
      team1: '',
      team2: '',
      time: '',
      player1Team1: '',
      player2Team1: '',
      player1Team2: '',
      player2Team2: '',
      youtubeLink: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFixtureForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBulkFormChange = (e) => {
    const { name, value } = e.target;
    setBulkFixtureForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTeamPlayers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    // Get player objects from playerIds
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name } : null;
    }).filter(Boolean);
  };

  const handleEditFixture = (fixture) => {
    setEditingFixture(fixture);
    setEditForm({
      date: fixture.dateObj.toISOString().split('T')[0],
      time: fixture.time,
      player1Team1: fixture.player1Team1 || '',
      player2Team1: fixture.player2Team1 || '',
      player1Team2: fixture.player1Team2 || '',
      player2Team2: fixture.player2Team2 || '',
      youtubeLink: fixture.youtubeLink || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateFixture = async (e) => {
    e.preventDefault();
    
    try {
      const updatedFixture = {
        ...editingFixture,
        date: new Date(editForm.date),
        time: editForm.time,
        player1Team1: editForm.player1Team1,
        player2Team1: editForm.player2Team1,
        player1Team2: editForm.player1Team2,
        player2Team2: editForm.player2Team2,
        youtubeLink: editForm.youtubeLink,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', editingFixture.id), updatedFixture);
      
      // Update local state
      const oldDateKey = editingFixture.dateKey;
      const newDateKey = new Date(editForm.date).toDateString();
      
      setFixtures(prev => {
        const updated = { ...prev };
        
        // Remove from old date
        if (updated[oldDateKey]) {
          updated[oldDateKey] = updated[oldDateKey].filter(f => f.id !== editingFixture.id);
          if (updated[oldDateKey].length === 0) {
            delete updated[oldDateKey];
          }
        }
        
        // Add to new date
        const updatedFixtureForState = {
          ...updatedFixture,
          dateObj: new Date(editForm.date),
          dateKey: newDateKey
        };
        
        if (!updated[newDateKey]) {
          updated[newDateKey] = [];
        }
        updated[newDateKey].push(updatedFixtureForState);
        
        return updated;
      });
      
      setShowEditModal(false);
      setEditingFixture(null);
      setError('');
    } catch (error) {
      console.error('Error updating fixture:', error);
      setError('Failed to update fixture');
    }
  };

  const handleDeleteClick = (fixture) => {
    setFixtureToDelete(fixture);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fixtureToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'fixtures', fixtureToDelete.id));
      
      // Update local state
      setFixtures(prev => {
        const updated = { ...prev };
        const dateKey = fixtureToDelete.dateKey;
        
        if (updated[dateKey]) {
          updated[dateKey] = updated[dateKey].filter(f => f.id !== fixtureToDelete.id);
          if (updated[dateKey].length === 0) {
            delete updated[dateKey];
          }
        }
        
        return updated;
      });
      
      setShowDeleteModal(false);
      setFixtureToDelete(null);
      setError('');
    } catch (error) {
      console.error('Error deleting fixture:', error);
      setError('Failed to delete fixture');
    }
  };

  const handleCreateFixture = async (e) => {
    e.preventDefault();
    
    if (!fixtureForm.matchType || !fixtureForm.team1 || !fixtureForm.team2 || !fixtureForm.time) {
      setError('Please fill in all required fields');
      return;
    }

    if (fixtureForm.team1 === fixtureForm.team2) {
      setError('Please select different teams');
      return;
    }

    try {
      const selectedCategory = getAvailableCategories().find(cat => cat.key === fixtureForm.matchType);
      
      const fixtureData = {
        tournamentId: id,
        date: selectedDate,
        time: fixtureForm.time,
        matchType: fixtureForm.matchType,
        matchTypeLabel: selectedCategory?.label || fixtureForm.matchType,
        team1: fixtureForm.team1,
        team2: fixtureForm.team2,
        team1Name: teams.find(t => t.id === fixtureForm.team1)?.name || '',
        team2Name: teams.find(t => t.id === fixtureForm.team2)?.name || '',
        status: 'scheduled',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      // Add player assignments if provided
      if (selectedCategory?.type === 'doubles') {
        if (fixtureForm.player1Team1) fixtureData.player1Team1 = fixtureForm.player1Team1;
        if (fixtureForm.player2Team1) fixtureData.player2Team1 = fixtureForm.player2Team1;
        if (fixtureForm.player1Team2) fixtureData.player1Team2 = fixtureForm.player1Team2;
        if (fixtureForm.player2Team2) fixtureData.player2Team2 = fixtureForm.player2Team2;
      } else {
        if (fixtureForm.player1Team1) fixtureData.player1Team1 = fixtureForm.player1Team1;
        if (fixtureForm.player1Team2) fixtureData.player1Team2 = fixtureForm.player1Team2;
      }

      await addDoc(collection(db, 'fixtures'), fixtureData);
      
      // Update local fixtures state
      const dateKey = selectedDate.toDateString();
      const newFixture = { ...fixtureData, id: Date.now().toString() };
      setFixtures(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newFixture]
      }));
      
      setShowModal(false);
      setError('');
    } catch (error) {
      console.error('Error creating fixture:', error);
      setError('Failed to create fixture');
    }
  };

  const handleCreateBulkFixtures = async (e) => {
    e.preventDefault();
    
    if (!bulkFixtureForm.team1 || !bulkFixtureForm.team2 || !bulkFixtureForm.date) {
      setError('Please fill in all required fields');
      return;
    }

    if (bulkFixtureForm.team1 === bulkFixtureForm.team2) {
      setError('Please select different teams');
      return;
    }

    try {
      const fixtureGroupId = `${bulkFixtureForm.team1}_${bulkFixtureForm.team2}_${Date.now()}`;
      const selectedDateObj = new Date(bulkFixtureForm.date);
      const team1Data = teams.find(t => t.id === bulkFixtureForm.team1);
      const team2Data = teams.find(t => t.id === bulkFixtureForm.team2);
      
      // Define the matches to create automatically
      const matchesToCreate = [
        { key: 'mensSingles', label: "Men's Singles", type: 'singles' },
        { key: 'womensSingles', label: "Women's Singles", type: 'singles' },
        { key: 'mixedDoubles', label: "Mixed Doubles", type: 'doubles' },
        { key: 'mensDoubles', label: "Men's Doubles", type: 'doubles' },
        { key: 'mensDoubles', label: "Men's Doubles", type: 'doubles' }, // Second men's doubles
        { key: 'womensDoubles', label: "Women's Doubles", type: 'doubles' }
      ];

      const fixturePromises = matchesToCreate.map(async (match, index) => {
        const fixtureData = {
          tournamentId: id,
          fixtureGroupId: fixtureGroupId,
          date: selectedDateObj,
          time: bulkFixtureForm.time || '10:00', // Default time if not provided
          matchType: match.key,
          matchTypeLabel: match.label + (match.key === 'mensDoubles' && index === 4 ? ' (2)' : ''),
          team1: bulkFixtureForm.team1,
          team2: bulkFixtureForm.team2,
          team1Name: team1Data?.name || '',
          team2Name: team2Data?.name || '',
          status: 'scheduled',
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          matchNumber: index + 1
        };

        return addDoc(collection(db, 'fixtures'), fixtureData);
      });

      await Promise.all(fixturePromises);
      
      // Refresh data from database to get the actual created fixtures
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      const fixturesData = {};
      const fixtureGroupsData = {};
      
      fixturesSnapshot.docs.forEach(doc => {
        const fixture = { id: doc.id, ...doc.data() };
        const dateKey = fixture.date.toDate().toDateString();
        
        // Group individual fixtures by date
        if (!fixturesData[dateKey]) {
          fixturesData[dateKey] = [];
        }
        fixturesData[dateKey].push(fixture);
        
        // Group fixtures by team matchup and date for the new view
        if (fixture.fixtureGroupId) {
          const groupKey = `${dateKey}_${fixture.fixtureGroupId}`;
          if (!fixtureGroupsData[groupKey]) {
            fixtureGroupsData[groupKey] = {
              id: fixture.fixtureGroupId,
              team1: fixture.team1,
              team2: fixture.team2,
              team1Name: fixture.team1Name,
              team2Name: fixture.team2Name,
              date: fixture.date,
              dateKey: dateKey,
              matches: []
            };
          }
          fixtureGroupsData[groupKey].matches.push(fixture);
        }
      });
      
      setFixtures(fixturesData);
      setFixtureGroups(fixtureGroupsData);
      
      setShowBulkModal(false);
      setBulkFixtureForm({
        team1: '',
        team2: '',
        date: '',
        time: ''
      });
      setError('');
    } catch (error) {
      console.error('Error creating bulk fixtures:', error);
      setError('Failed to create fixtures');
    }
  };

  const selectedCategory = getAvailableCategories().find(cat => cat.key === fixtureForm.matchType);
  const isDoubles = selectedCategory?.type === 'doubles';

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error && !tournament) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="mt-6">
            <button 
              className="btn btn-outline"
              onClick={() => navigate(`/tournaments/${id}`)}
            >
              Back to Tournament
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const dateRange = generateDateRange();

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/tournaments/${id}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournament
            </button>
            
            <button
              className="btn btn-primary"
              onClick={() => setShowBulkModal(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Fixture
            </button>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">Add Fixtures</h1>
          <p className="text-base-content/70 text-lg">{tournament?.name}</p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Date Calendar */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Tournament Schedule</h2>
            
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ minWidth: `${dateRange.length * 200}px` }}>
                {dateRange.map((date, index) => {
                  const dateKey = date.toDateString();
                  const dayFixtures = fixtures[dateKey] || [];
                  
                  return (
                    <div key={index} className="flex-shrink-0 w-48">
                      <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
                        <div className="card-body p-4">
                          <div className="text-center mb-3">
                            <div className="text-lg font-bold">{formatDate(date)}</div>
                            <div className="text-sm text-base-content/60">
                              {date.toLocaleDateString('en-US', { year: 'numeric' })}
                            </div>
                          </div>
                          
                          {/* Show fixture count for this date */}
                          <div className="mb-3 min-h-[60px] flex items-center justify-center">
                            {dayFixtures.length > 0 ? (
                              <div className="text-center">
                                <div className="badge badge-primary badge-lg">
                                  {dayFixtures.length} fixture{dayFixtures.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-base-content/50 text-sm">
                                No fixtures
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <button
                              className="btn btn-outline btn-sm w-full"
                              onClick={() => {
                                setSelectedDateForView(date);
                              }}
                            >
                              View Fixtures
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fixtures List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h2 className="card-title text-2xl">
                {selectedDateForView
                  ? `Fixtures for ${selectedDateForView.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}`
                  : 'All Fixtures'
                }
              </h2>
              {selectedDateForView && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedDateForView(null)}
                >
                  Show All Fixtures
                </button>
              )}
            </div>
            
            {Object.keys(fixtureGroups).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-base-content/50 text-lg mb-4">No fixtures created yet</div>
                <p className="text-base-content/70">Click "Create Fixture" above to create your first fixture</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Get fixture groups and filter by selected date if any */}
                {Object.entries(fixtureGroups)
                  .filter(([groupKey, group]) => {
                    if (!selectedDateForView) return true;
                    return group.dateKey === selectedDateForView.toDateString();
                  })
                  .sort(([, a], [, b]) => {
                    // Sort by date
                    return new Date(a.date) - new Date(b.date);
                  })
                  .map(([groupKey, group]) => (
                    <div
                      key={groupKey}
                      className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/tournaments/${id}/fixtures/${group.id}`)}
                    >
                      <div className="card-body p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-bold">
                              {new Date(group.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="badge badge-secondary badge-lg">
                              {group.matches.length} matches
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit fixture group
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-2xl font-bold text-primary">{group.team1Name}</div>
                          <div className="text-xl font-medium text-base-content/60">VS</div>
                          <div className="text-2xl font-bold text-secondary">{group.team2Name}</div>
                        </div>
                        
                        {/* Show match types */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {group.matches.map((match, index) => (
                            <div key={index} className="badge badge-outline">
                              {match.matchTypeLabel}
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-center mt-4 text-sm text-base-content/60">
                          Click to view all matches
                        </div>
                      </div>
                    </div>
                  ))}
                
                {/* Show message if no fixtures for selected date */}
                {selectedDateForView &&
                 Object.entries(fixtureGroups)
                   .filter(([, group]) => group.dateKey === selectedDateForView.toDateString())
                   .length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-base-content/50 text-lg mb-4">
                      No fixtures for {selectedDateForView.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowBulkModal(true)}
                    >
                      Create First Fixture for This Date
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Fixture Modal */}
        {showModal && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
              <h3 className="font-bold text-lg mb-4">
                Create Fixture for {selectedDate?.toLocaleDateString()}
              </h3>
              
              <form onSubmit={handleCreateFixture} className="space-y-4">
                {/* Match Type */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Match Type *</span>
                  </label>
                  <select
                    name="matchType"
                    className="select select-bordered w-full"
                    value={fixtureForm.matchType}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select match type</option>
                    {getAvailableCategories().map(category => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Team 1 *</span>
                    </label>
                    <select
                      name="team1"
                      className="select select-bordered w-full"
                      value={fixtureForm.team1}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select team 1</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Team 2 *</span>
                    </label>
                    <select
                      name="team2"
                      className="select select-bordered w-full"
                      value={fixtureForm.team2}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select team 2</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Match Time *</span>
                  </label>
                  <input
                    type="time"
                    name="time"
                    className="input input-bordered w-full"
                    value={fixtureForm.time}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                {/* YouTube Live Link */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">YouTube Live Link</span>
                  </label>
                  <input
                    type="url"
                    name="youtubeLink"
                    placeholder="https://youtube.com/watch?v=..."
                    className="input input-bordered w-full"
                    value={fixtureForm.youtubeLink}
                    onChange={handleFormChange}
                  />
                </div>

                {/* Player Selection (Optional) */}
                {fixtureForm.team1 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Player Selection (Optional)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Team 1 Players */}
                      <div className="space-y-2">
                        <label className="label">
                          <span className="label-text font-medium">
                            {teams.find(t => t.id === fixtureForm.team1)?.name} Players
                          </span>
                        </label>
                        
                        <select
                          name="player1Team1"
                          className="select select-bordered w-full select-sm"
                          value={fixtureForm.player1Team1}
                          onChange={handleFormChange}
                        >
                          <option value="">Select player 1</option>
                          {getTeamPlayers(fixtureForm.team1).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                        
                        {isDoubles && (
                          <select
                            name="player2Team1"
                            className="select select-bordered w-full select-sm"
                            value={fixtureForm.player2Team1}
                            onChange={handleFormChange}
                          >
                            <option value="">Select player 2</option>
                            {getTeamPlayers(fixtureForm.team1).map((player) => (
                              <option key={player.id} value={player.name}>
                                {player.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Team 2 Players */}
                      {fixtureForm.team2 && (
                        <div className="space-y-2">
                          <label className="label">
                            <span className="label-text font-medium">
                              {teams.find(t => t.id === fixtureForm.team2)?.name} Players
                            </span>
                          </label>
                          
                          <select
                            name="player1Team2"
                            className="select select-bordered w-full select-sm"
                            value={fixtureForm.player1Team2}
                            onChange={handleFormChange}
                          >
                            <option value="">Select player 1</option>
                            {getTeamPlayers(fixtureForm.team2).map((player) => (
                              <option key={player.id} value={player.name}>
                                {player.name}
                              </option>
                            ))}
                          </select>
                          
                          {isDoubles && (
                            <select
                              name="player2Team2"
                              className="select select-bordered w-full select-sm"
                              value={fixtureForm.player2Team2}
                              onChange={handleFormChange}
                            >
                              <option value="">Select player 2</option>
                              {getTeamPlayers(fixtureForm.team2).map((player) => (
                                <option key={player.id} value={player.name}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Fixture
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Fixture Creation Modal */}
        {showBulkModal && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
              <h3 className="font-bold text-lg mb-4">
                Create Fixture
              </h3>
              
              <div className="alert alert-info mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold">Automatic Match Creation</h4>
                  <div className="text-sm">
                    This will automatically create 6 matches between the selected teams:
                    <ul className="list-disc list-inside mt-2 ml-4">
                      <li>1 Men's Singles</li>
                      <li>1 Women's Singles</li>
                      <li>1 Mixed Doubles</li>
                      <li>2 Men's Doubles</li>
                      <li>1 Women's Doubles</li>
                    </ul>
                    You can update the players later by clicking on edit for each match.
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleCreateBulkFixtures} className="space-y-4">
                {/* Teams */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Team 1 *</span>
                    </label>
                    <select
                      name="team1"
                      className="select select-bordered w-full"
                      value={bulkFixtureForm.team1}
                      onChange={handleBulkFormChange}
                      required
                    >
                      <option value="">Select team 1</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Team 2 *</span>
                    </label>
                    <select
                      name="team2"
                      className="select select-bordered w-full"
                      value={bulkFixtureForm.team2}
                      onChange={handleBulkFormChange}
                      required
                    >
                      <option value="">Select team 2</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Date *</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="input input-bordered w-full"
                      value={bulkFixtureForm.date}
                      onChange={handleBulkFormChange}
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Start Time (Optional)</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      className="input input-bordered w-full"
                      value={bulkFixtureForm.time}
                      onChange={handleBulkFormChange}
                      placeholder="Can be updated later"
                    />
                  </div>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowBulkModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create 6 Matches
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Fixture Modal */}
        {showEditModal && editingFixture && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
              <h3 className="font-bold text-lg mb-4">
                Edit Fixture
              </h3>
              
              <form onSubmit={handleUpdateFixture} className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Date *</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="input input-bordered w-full"
                      value={editForm.date}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Time *</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      className="input input-bordered w-full"
                      value={editForm.time}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>
                </div>

                {/* YouTube Live Link */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">YouTube Live Link</span>
                  </label>
                  <input
                    type="url"
                    name="youtubeLink"
                    placeholder="https://youtube.com/watch?v=..."
                    className="input input-bordered w-full"
                    value={editForm.youtubeLink}
                    onChange={handleEditFormChange}
                  />
                </div>

                {/* Player Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Player Assignment</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Team 1 Players */}
                    <div className="space-y-2">
                      <label className="label">
                        <span className="label-text font-medium">
                          {editingFixture.team1Name} Players
                        </span>
                      </label>
                      
                      <select
                        name="player1Team1"
                        className="select select-bordered w-full select-sm"
                        value={editForm.player1Team1}
                        onChange={handleEditFormChange}
                      >
                        <option value="">Select player 1</option>
                        {getTeamPlayers(editingFixture.team1).map((player) => (
                          <option key={player.id} value={player.name}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      
                      {getAvailableCategories().find(cat => cat.key === editingFixture.matchType)?.type === 'doubles' && (
                        <select
                          name="player2Team1"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player2Team1}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 2</option>
                          {getTeamPlayers(editingFixture.team1).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Team 2 Players */}
                    <div className="space-y-2">
                      <label className="label">
                        <span className="label-text font-medium">
                          {editingFixture.team2Name} Players
                        </span>
                      </label>
                      
                      <select
                        name="player1Team2"
                        className="select select-bordered w-full select-sm"
                        value={editForm.player1Team2}
                        onChange={handleEditFormChange}
                      >
                        <option value="">Select player 1</option>
                        {getTeamPlayers(editingFixture.team2).map((player) => (
                          <option key={player.id} value={player.name}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      
                      {getAvailableCategories().find(cat => cat.key === editingFixture.matchType)?.type === 'doubles' && (
                        <select
                          name="player2Team2"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player2Team2}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 2</option>
                          {getTeamPlayers(editingFixture.team2).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingFixture(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Fixture
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && fixtureToDelete && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Delete Fixture</h3>
              <p className="mb-6">
                Are you sure you want to delete this fixture?
              </p>
              <div className="bg-base-200 p-4 rounded-lg mb-6">
                <div className="font-semibold">
                  {fixtureToDelete.dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {fixtureToDelete.time}
                </div>
                <div className="text-sm text-base-content/70 mt-1">
                  {fixtureToDelete.team1Name} vs {fixtureToDelete.team2Name}
                </div>
                <div className="text-sm text-base-content/70">
                  {fixtureToDelete.matchTypeLabel}
                </div>
              </div>
              <div className="modal-action">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setFixtureToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error"
                  onClick={handleDeleteConfirm}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}