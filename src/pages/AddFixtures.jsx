import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, deleteDoc, Timestamp, or, and } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function AddFixtures() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamAdminTeamId, setTeamAdminTeamId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFixtureStyleModal, setShowFixtureStyleModal] = useState(false);
  const [fixtureStyle, setFixtureStyle] = useState(null); // 'custom', 'dreambreaker', 'minidreambreaker', or 'roundrobin'
  const [showRoundRobinModal, setShowRoundRobinModal] = useState(false);
  const [roundRobinConfig, setRoundRobinConfig] = useState({
    numPools: 2,
    teamsPerPool: 4,
    pools: {},
    step: 'pools' // 'pools', 'teams', 'generate'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [selectedFixtureTypeFilter, setSelectedFixtureTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('fixtures'); // 'fixtures', 'playoffs', 'ranking'
  const [playoffFixtures, setPlayoffFixtures] = useState([]);
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
    fixtureType: '',
    pool: '',
    court: '',
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
    date: '',
    time: '',
    pool: '',
    court: '',
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
    time: '',
    pool: '',
    court: ''
  });

  // Check for saved fixture style preference
  useEffect(() => {
    const savedStyle = localStorage.getItem(`fixtureStyle_${id}`);
    if (savedStyle) {
      setFixtureStyle(savedStyle);
    }
  }, [id]);

  useEffect(() => {
    const fetchTournamentData = async () => {
      try {
        console.log('Fetching tournament data for ID:', id);
        console.log('Current user:', {
          uid: currentUser?.uid,
          email: currentUser?.email,
          role: currentUser?.role,
          teamName: currentUser?.teamName,
          tournamentId: currentUser?.tournamentId
        });
        
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          console.log('Tournament data fetched successfully:', tournamentData.name);
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
          
          // Fetch existing fixtures - filter based on user role
          let fixturesQuery;
          let teamAdminTeam = null;
          
          if (isTeamAdmin()) {
            console.log('Team admin user detected:', {
              email: currentUser.email,
              teamName: currentUser.teamName,
              tournamentId: currentUser.tournamentId,
              currentTournamentId: id
            });
            
            // Check if team admin belongs to this tournament
            if (currentUser.tournamentId !== id) {
              console.log('Team admin does not belong to this tournament');
              setError('You do not have access to this tournament');
              setLoading(false);
              return;
            }
            
            // Find the team admin's team ID - try multiple matching strategies
            const teamAdmin = teamsData.find(team => {
              // Strategy 1: Match by admin email
              if (team.adminEmail && team.adminEmail.toLowerCase() === currentUser.email.toLowerCase()) {
                return true;
              }
              
              // Strategy 2: Match by team name (case insensitive)
              if (currentUser.teamName && team.name &&
                  team.name.toLowerCase() === currentUser.teamName.toLowerCase()) {
                return true;
              }
              
              // Strategy 3: Match by adminUid if available
              if (team.adminUid && team.adminUid === currentUser.uid) {
                return true;
              }
              
              return false;
            });
            
            console.log('Team search result:', teamAdmin);
            console.log('Available teams:', teamsData.map(t => ({
              id: t.id,
              name: t.name,
              adminEmail: t.adminEmail,
              adminUid: t.adminUid
            })));
            
            if (teamAdmin) {
              teamAdminTeam = teamAdmin.id;
              setTeamAdminTeamId(teamAdmin.id);
              
              console.log('Found team admin team:', teamAdmin.name, 'ID:', teamAdmin.id);
              
              // Team admins only see fixtures where their team is participating
              fixturesQuery = query(
                collection(db, 'fixtures'),
                and(
                  where('tournamentId', '==', id),
                  or(
                    where('team1', '==', teamAdmin.id),
                    where('team2', '==', teamAdmin.id)
                  )
                )
              );
            } else {
              console.log('Team admin team not found');
              setError(`Your team was not found in this tournament. Please contact the tournament administrator.`);
              setLoading(false);
              return;
            }
          } else {
            // Super admins see all fixtures
            fixturesQuery = query(
              collection(db, 'fixtures'),
              where('tournamentId', '==', id)
            );
          }
          
          const fixturesSnapshot = await getDocs(fixturesQuery);
          const fixturesData = {};
          const fixtureGroupsData = {};
          const playoffFixturesData = [];
          
          fixturesSnapshot.docs.forEach(doc => {
            const fixture = { id: doc.id, ...doc.data() };
            
            // Separate playoff fixtures
            if (fixture.fixtureType === 'playoff') {
              playoffFixturesData.push(fixture);
              return;
            }
            
            const dateKey = fixture.date.toDate().toDateString();
            
            // Group individual fixtures by date
            if (!fixturesData[dateKey]) {
              fixturesData[dateKey] = [];
            }
            fixturesData[dateKey].push(fixture);
            
            // Group fixtures by team matchup and date for the new view
            // Only group DreamBreaker fixtures, not Round Robin fixtures
            if (fixture.fixtureGroupId && fixture.fixtureType !== 'roundrobin') {
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
          setPlayoffFixtures(playoffFixturesData);
        } else {
          console.log('Tournament document does not exist');
          setError('Tournament not found');
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        setError(`Failed to load tournament data: ${error.message}`);
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
      pool: '',
      court: '',
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
    
    // Handle different date formats
    let dateString = '';
    if (fixture.dateObj && fixture.dateObj.toISOString) {
      dateString = fixture.dateObj.toISOString().split('T')[0];
    } else if (fixture.date && fixture.date.toDate) {
      // Firestore timestamp
      dateString = fixture.date.toDate().toISOString().split('T')[0];
    } else if (fixture.date && fixture.date.toISOString) {
      // JavaScript Date object
      dateString = fixture.date.toISOString().split('T')[0];
    } else if (typeof fixture.date === 'string') {
      // String date
      dateString = new Date(fixture.date).toISOString().split('T')[0];
    }
    
    // For Round Robin fixtures, auto-fill the pool based on how it was set up during creation
    // The pool should already be stored in the fixture from when it was created
    const poolValue = fixture.pool || '';
    
    setEditForm({
      date: dateString,
      time: fixture.time || '',
      fixtureType: fixture.fixtureType || 'league',
      pool: poolValue,
      court: fixture.court || '',
      // For playoff fixtures, include team selection
      team1: fixture.team1 || '',
      team2: fixture.team2 || '',
      team1Name: fixture.team1Name || '',
      team2Name: fixture.team2Name || '',
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
        // Ensure all required fields are explicitly included
        tournamentId: editingFixture.tournamentId,
        date: Timestamp.fromDate(new Date(editForm.date)),
        matchType: editingFixture.matchType,
        matchTypeLabel: editingFixture.matchTypeLabel,
        team1: editingFixture.team1,
        team2: editingFixture.team2,
        team1Name: editingFixture.team1Name,
        team2Name: editingFixture.team2Name,
        status: editingFixture.status,
        createdBy: editingFixture.createdBy,
        createdAt: editingFixture.createdAt,
        // Preserve existing fields
        pool: editingFixture.pool,
        court: editingFixture.court,
        player1Team1: editingFixture.player1Team1,
        player2Team1: editingFixture.player2Team1,
        player1Team2: editingFixture.player1Team2,
        player2Team2: editingFixture.player2Team2,
        youtubeLink: editingFixture.youtubeLink,
        // Only editable fields from the form
        time: editForm.time,
        fixtureType: editForm.fixtureType,
        // Optional fields that might exist
        ...(editingFixture.fixtureGroupId && { fixtureGroupId: editingFixture.fixtureGroupId }),
        ...(editingFixture.matchNumber && { matchNumber: editingFixture.matchNumber }),
        ...(editingFixture.playoffStage && { playoffStage: editingFixture.playoffStage }),
        ...(editingFixture.playoffNumber && { playoffNumber: editingFixture.playoffNumber }),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', editingFixture.id), updatedFixture);
      
      // Update local state
      const newDateKey = new Date(editForm.date).toDateString();
      
      // Calculate old date key more robustly
      let oldDateKey = editingFixture.dateKey;
      if (!oldDateKey) {
        // Fallback: calculate from existing date
        if (editingFixture.dateObj) {
          oldDateKey = editingFixture.dateObj.toDateString();
        } else if (editingFixture.date) {
          if (editingFixture.date.toDate) {
            oldDateKey = editingFixture.date.toDate().toDateString();
          } else if (editingFixture.date.toDateString) {
            oldDateKey = editingFixture.date.toDateString();
          } else {
            oldDateKey = new Date(editingFixture.date).toDateString();
          }
        }
      }
      
      setFixtures(prev => {
        const updated = { ...prev };
        
        // Remove from all dates to prevent duplicates (more robust approach)
        Object.keys(updated).forEach(dateKey => {
          updated[dateKey] = updated[dateKey].filter(f => f.id !== editingFixture.id);
          if (updated[dateKey].length === 0) {
            delete updated[dateKey];
          }
        });
        
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
      
      // Update playoff fixtures state if this is a playoff fixture
      if (editingFixture.fixtureType === 'playoff') {
        setPlayoffFixtures(prev =>
          prev.map(fixture =>
            fixture.id === editingFixture.id
              ? { ...updatedFixture, id: editingFixture.id }
              : fixture
          )
        );
      }
      
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
    
    if (!fixtureForm.matchType || !fixtureForm.team1 || !fixtureForm.team2 || !fixtureForm.time || !fixtureForm.date) {
      setError('Please fill in all required fields');
      return;
    }

    if (fixtureForm.team1 === fixtureForm.team2) {
      setError('Please select different teams');
      return;
    }

    try {
      const selectedCategory = getAvailableCategories().find(cat => cat.key === fixtureForm.matchType);
      const selectedDateObj = new Date(fixtureForm.date);
      
      const fixtureData = {
        tournamentId: id,
        date: Timestamp.fromDate(selectedDateObj),
        time: fixtureForm.time,
        pool: fixtureForm.pool,
        court: fixtureForm.court,
        matchType: fixtureForm.matchType,
        matchTypeLabel: selectedCategory?.label || fixtureForm.matchType,
        team1: fixtureForm.team1,
        team2: fixtureForm.team2,
        team1Name: teams.find(t => t.id === fixtureForm.team1)?.name || '',
        team2Name: teams.find(t => t.id === fixtureForm.team2)?.name || '',
        status: 'scheduled',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        fixtureType: 'custom', // Mark as custom fixture
        youtubeLink: fixtureForm.youtubeLink || ''
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

      const docRef = await addDoc(collection(db, 'fixtures'), fixtureData);
      
      // Update local fixtures state with the actual Firebase document ID
      const dateKey = selectedDateObj.toDateString();
      const newFixture = {
        ...fixtureData,
        id: docRef.id, // Use the actual Firebase document ID
        dateObj: selectedDateObj,
        dateKey: dateKey
      };
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
          date: Timestamp.fromDate(selectedDateObj),
          time: bulkFixtureForm.time || '10:00', // Default time if not provided
          pool: bulkFixtureForm.pool,
          court: bulkFixtureForm.court,
          matchType: match.key,
          matchTypeLabel: match.label + (match.key === 'mensDoubles' && index === 4 ? ' (2)' : ''),
          team1: bulkFixtureForm.team1,
          team2: bulkFixtureForm.team2,
          team1Name: team1Data?.name || '',
          team2Name: team2Data?.name || '',
          status: 'scheduled',
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          fixtureType: 'dreambreaker', // Add fixtureType for consistency
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
        // Only group DreamBreaker fixtures, not Round Robin fixtures
        if (fixture.fixtureGroupId && fixture.fixtureType !== 'roundrobin') {
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
        time: '',
        pool: '',
        court: ''
      });
      setError('');
    } catch (error) {
      console.error('Error creating bulk fixtures:', error);
      setError('Failed to create fixtures');
    }
  };

  const handleCreateMiniBulkFixtures = async (e) => {
    e.preventDefault();
    
    if (!bulkFixtureForm.team1 || !bulkFixtureForm.team2 || !bulkFixtureForm.date) {
      setError('Please fill in all required fields');
      return;
    }

    if (bulkFixtureForm.team1 === bulkFixtureForm.team2) {
      setError('Please select different teams');
      return;
    }

    // Check if user is authenticated
    if (!currentUser) {
      setError('You must be logged in to create fixtures');
      return;
    }

    try {
      const fixtureGroupId = `${bulkFixtureForm.team1}_${bulkFixtureForm.team2}_${Date.now()}`;
      const selectedDateObj = new Date(bulkFixtureForm.date);
      const team1Data = teams.find(t => t.id === bulkFixtureForm.team1);
      const team2Data = teams.find(t => t.id === bulkFixtureForm.team2);
      
      // Define the matches to create automatically for Mini DreamBreaker Team
      const matchesToCreate = [
        { key: 'mensDoubles', label: "Men's Doubles", type: 'doubles' },
        { key: 'mensDoubles', label: "Men's Doubles", type: 'doubles' }, // Second men's doubles
        { key: 'mixedDoubles', label: "Mixed Doubles", type: 'doubles' },
        { key: 'mixedDoubles', label: "Mixed Doubles", type: 'doubles' } // Second mixed doubles
      ];

      const fixturePromises = matchesToCreate.map(async (match, index) => {
        const fixtureData = {
          tournamentId: id,
          fixtureGroupId: fixtureGroupId,
          date: Timestamp.fromDate(selectedDateObj),
          time: bulkFixtureForm.time || '10:00', // Default time if not provided
          pool: '', // Mini dreambreaker doesn't use pools
          court: '', // Mini dreambreaker doesn't use courts
          matchType: match.key,
          matchTypeLabel: match.label + (
            (match.key === 'mensDoubles' && index === 1) ? ' (2)' :
            (match.key === 'mixedDoubles' && index === 3) ? ' (2)' : ''
          ),
          team1: bulkFixtureForm.team1,
          team2: bulkFixtureForm.team2,
          team1Name: team1Data?.name || '',
          team2Name: team2Data?.name || '',
          status: 'scheduled',
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          fixtureType: 'minidreambreaker', // Add fixtureType for consistency
          matchNumber: index + 1,
          // Add optional fields to ensure compatibility
          youtubeLink: '',
          player1Team1: '',
          player2Team1: '',
          player1Team2: '',
          player2Team2: ''
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
        // Only group DreamBreaker fixtures, not Round Robin fixtures
        if (fixture.fixtureGroupId && fixture.fixtureType !== 'roundrobin') {
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
        time: '',
        pool: '',
        court: ''
      });
      setError('');
    } catch (error) {
      console.error('Error creating mini bulk fixtures:', error);
      setError('Failed to create fixtures');
    }
  };

  const handleCreateFixtureClick = () => {
    // If no fixture style is set, show the style selection modal
    if (!fixtureStyle) {
      setShowFixtureStyleModal(true);
    } else if (fixtureStyle === 'custom') {
      // For custom style, show the custom fixture modal
      setShowModal(true);
      setFixtureForm({
        matchType: '',
        team1: '',
        team2: '',
        date: '',
        time: '',
        pool: '',
        court: '',
        player1Team1: '',
        player2Team1: '',
        player1Team2: '',
        player2Team2: '',
        youtubeLink: ''
      });
    } else if (fixtureStyle === 'dreambreaker') {
      setShowBulkModal(true);
    } else if (fixtureStyle === 'minidreambreaker') {
      setShowBulkModal(true);
    } else if (fixtureStyle === 'roundrobin') {
      setShowRoundRobinModal(true);
    }
  };

  const handleFixtureStyleSelect = (style) => {
    setFixtureStyle(style);
    localStorage.setItem(`fixtureStyle_${id}`, style);
    setShowFixtureStyleModal(false);
    
    // After selecting style, proceed with the appropriate flow
    if (style === 'custom') {
      setShowModal(true);
      setFixtureForm({
        matchType: '',
        team1: '',
        team2: '',
        date: '',
        time: '',
        pool: '',
        court: '',
        player1Team1: '',
        player2Team1: '',
        player1Team2: '',
        player2Team2: '',
        youtubeLink: ''
      });
    } else if (style === 'dreambreaker') {
      setShowBulkModal(true);
    } else if (style === 'minidreambreaker') {
      setShowBulkModal(true);
    } else if (style === 'roundrobin') {
      setShowRoundRobinModal(true);
    }
  };

  // Round Robin handlers
  const handleRoundRobinConfigChange = (field, value) => {
    setRoundRobinConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePoolTeamAssignment = (poolName, teamId, action) => {
    setRoundRobinConfig(prev => {
      const newPools = { ...prev.pools };
      if (!newPools[poolName]) {
        newPools[poolName] = [];
      }
      
      if (action === 'add' && !newPools[poolName].includes(teamId)) {
        newPools[poolName].push(teamId);
      } else if (action === 'remove') {
        newPools[poolName] = newPools[poolName].filter(id => id !== teamId);
      }
      
      return {
        ...prev,
        pools: newPools
      };
    });
  };

  const generateRoundRobinFixtures = async () => {
    try {
      // Check if user is authenticated
      if (!currentUser) {
        setError('You must be logged in to create fixtures');
        return;
      }

      const fixtures = [];
      const categories = getAvailableCategories();
      const defaultDate = new Date(); // Default date for all fixtures
      
      console.log('Current user:', currentUser.uid);
      console.log('Tournament ID:', id);
      console.log('Available categories:', categories);
      console.log('Round robin config:', roundRobinConfig);
      
      // Generate round robin fixtures for each pool
      Object.entries(roundRobinConfig.pools).forEach(([poolName, poolTeams]) => {
        // Generate all possible team combinations within the pool
        for (let i = 0; i < poolTeams.length; i++) {
          for (let j = i + 1; j < poolTeams.length; j++) {
            const team1 = poolTeams[i];
            const team2 = poolTeams[j];
            const team1Data = teams.find(t => t.id === team1);
            const team2Data = teams.find(t => t.id === team2);
            
            // Create fixtures for each available category
            categories.forEach((category, index) => {
              const fixtureData = {
                tournamentId: id,
                date: Timestamp.fromDate(defaultDate),
                time: '10:00',
                pool: poolName,
                court: null, // Use null instead of empty string
                matchType: category.key,
                matchTypeLabel: category.label,
                team1: team1,
                team2: team2,
                team1Name: team1Data?.name || '',
                team2Name: team2Data?.name || '',
                status: 'scheduled',
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                fixtureType: 'roundrobin', // Mark as round robin fixture
                matchNumber: index + 1
              };
              
              console.log('Creating fixture:', fixtureData);
              fixtures.push(fixtureData);
            });
          }
        }
      });

      console.log('Total fixtures to create:', fixtures.length);

      // Save all fixtures to database one by one to identify which one fails
      for (let i = 0; i < fixtures.length; i++) {
        try {
          console.log(`Creating fixture ${i + 1}/${fixtures.length}:`, fixtures[i]);
          await addDoc(collection(db, 'fixtures'), fixtures[i]);
          console.log(`Successfully created fixture ${i + 1}`);
        } catch (error) {
          console.error(`Error creating fixture ${i + 1}:`, error);
          console.error('Failed fixture data:', fixtures[i]);
          throw error;
        }
      }
      
      // Refresh fixtures data
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      const fixturesData = {};
      
      fixturesSnapshot.docs.forEach(doc => {
        const fixture = { id: doc.id, ...doc.data() };
        const dateKey = fixture.date.toDate().toDateString();
        
        if (!fixturesData[dateKey]) {
          fixturesData[dateKey] = [];
        }
        fixturesData[dateKey].push(fixture);
      });
      
      setFixtures(fixturesData);
      setShowRoundRobinModal(false);
      setRoundRobinConfig({
        numPools: 2,
        teamsPerPool: 4,
        pools: {},
        step: 'pools'
      });
      setError('');
      
    } catch (error) {
      console.error('Error creating round robin fixtures:', error);
      setError('Failed to create round robin fixtures');
    }
  };

  // Function to create playoff fixtures
  const createPlayoffFixtures = async () => {
    try {
      if (!currentUser) {
        setError('You must be logged in to create playoff fixtures');
        return;
      }

      const playoffMatches = [
        // Quarterfinals
        { stage: 'quarterfinal', number: 1, name: 'Quarterfinal 1' },
        { stage: 'quarterfinal', number: 2, name: 'Quarterfinal 2' },
        { stage: 'quarterfinal', number: 3, name: 'Quarterfinal 3' },
        { stage: 'quarterfinal', number: 4, name: 'Quarterfinal 4' },
        // Semifinals
        { stage: 'semifinal', number: 1, name: 'Semifinal 1' },
        { stage: 'semifinal', number: 2, name: 'Semifinal 2' },
        // Third Place and Final
        { stage: 'third-place', number: 1, name: 'Third Place' },
        { stage: 'final', number: 1, name: 'Final' }
      ];

      const defaultDate = new Date();
      const fixturePromises = playoffMatches.map(async (match) => {
        const fixtureData = {
          tournamentId: id,
          date: Timestamp.fromDate(defaultDate),
          time: '10:00',
          matchType: 'mixedDoubles',
          matchTypeLabel: 'Mixed Doubles',
          team1: 'TBD',
          team2: 'TBD',
          team1Name: 'TBD',
          team2Name: 'TBD',
          status: 'scheduled',
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          fixtureType: 'playoff',
          playoffStage: match.stage,
          playoffNumber: match.number,
          playoffName: match.name
        };

        return addDoc(collection(db, 'fixtures'), fixtureData);
      });

      await Promise.all(fixturePromises);
      
      // Refresh fixtures data
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      const playoffFixturesData = [];
      
      fixturesSnapshot.docs.forEach(doc => {
        const fixture = { id: doc.id, ...doc.data() };
        if (fixture.fixtureType === 'playoff') {
          playoffFixturesData.push(fixture);
        }
      });
      
      setPlayoffFixtures(playoffFixturesData);
      console.log('Created playoff fixtures successfully');
      
    } catch (error) {
      console.error('Error creating playoff fixtures:', error);
      setError('Failed to create playoff fixtures');
    }
  };

  // Function to get playoff fixture by stage and number
  const getPlayoffFixture = (stage, number) => {
    return playoffFixtures.find(f => f.playoffStage === stage && f.playoffNumber === number);
  };

  // Function to reset playoff fixture to default state
  const handleResetPlayoffFixture = async (fixture) => {
    try {
      const resetData = {
        team1: 'TBD',
        team2: 'TBD',
        team1Name: 'TBD',
        team2Name: 'TBD',
        player1Team1: '',
        player2Team1: '',
        player1Team2: '',
        player2Team2: '',
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', fixture.id), resetData);
      
      // Update playoff fixtures state
      setPlayoffFixtures(prev =>
        prev.map(f =>
          f.id === fixture.id
            ? { ...f, ...resetData }
            : f
        )
      );
      
      console.log('Playoff fixture reset successfully');
      
    } catch (error) {
      console.error('Error resetting playoff fixture:', error);
      setError('Failed to reset playoff fixture');
    }
  };

  // Function to clean up existing Round Robin fixtures that have fixtureGroupId
  const cleanupRoundRobinFixtures = async () => {
    try {
      console.log('Starting Round Robin fixtures cleanup...');
      
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      console.log(`Found ${fixturesSnapshot.docs.length} total fixtures`);
      
      const updatePromises = [];
      let roundRobinCount = 0;
      
      fixturesSnapshot.docs.forEach(doc => {
        const fixture = doc.data();
        console.log('Fixture:', {
          id: doc.id,
          fixtureGroupId: fixture.fixtureGroupId,
          fixtureType: fixture.fixtureType,
          pool: fixture.pool,
          team1Name: fixture.team1Name,
          team2Name: fixture.team2Name
        });
        
        // If fixture has fixtureGroupId and has a pool (indicating Round Robin)
        if (fixture.fixtureGroupId && fixture.pool) {
          console.log(`Marking fixture ${doc.id} for cleanup (Round Robin with pool ${fixture.pool})`);
          roundRobinCount++;
          updatePromises.push(
            updateDoc(doc.ref, {
              fixtureType: 'roundrobin',
              fixtureGroupId: deleteField() // Use deleteField() to completely remove the field
            })
          );
        }
      });
      
      console.log(`Found ${roundRobinCount} Round Robin fixtures to clean up`);
      
      if (updatePromises.length > 0) {
        console.log('Updating fixtures...');
        await Promise.all(updatePromises);
        console.log(`Successfully cleaned up ${updatePromises.length} Round Robin fixtures`);
        alert(`Fixed ${updatePromises.length} Round Robin fixtures! Page will refresh.`);
        
        // Refresh the fixtures data
        window.location.reload();
      } else {
        alert('No Round Robin fixtures found that need fixing.');
      }
    } catch (error) {
      console.error('Error cleaning up Round Robin fixtures:', error);
      alert('Error fixing Round Robin fixtures. Check console for details.');
    }
  };

  // Filter functions
  const filterFixtures = (fixturesList) => {
    return fixturesList.filter(fixture => {
      // Team filter
      if (selectedTeamFilter && fixture.team1 !== selectedTeamFilter && fixture.team2 !== selectedTeamFilter) {
        return false;
      }

      // Fixture type filter
      if (selectedFixtureTypeFilter && fixture.fixtureType !== selectedFixtureTypeFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTeamName =
          fixture.team1Name?.toLowerCase().includes(searchLower) ||
          fixture.team2Name?.toLowerCase().includes(searchLower);
        
        const matchesPlayerName =
          fixture.player1Team1?.toLowerCase().includes(searchLower) ||
          fixture.player2Team1?.toLowerCase().includes(searchLower) ||
          fixture.player1Team2?.toLowerCase().includes(searchLower) ||
          fixture.player2Team2?.toLowerCase().includes(searchLower);

        if (!matchesTeamName && !matchesPlayerName) {
          return false;
        }
      }

      return true;
    });
  };

  const filterFixtureGroups = (groupsList) => {
    return groupsList.filter(([groupKey, group]) => {
      // Team filter
      if (selectedTeamFilter && group.team1 !== selectedTeamFilter && group.team2 !== selectedTeamFilter) {
        return false;
      }

      // Fixture type filter - check if any match in the group has the selected fixture type
      if (selectedFixtureTypeFilter && !group.matches.some(match => match.fixtureType === selectedFixtureTypeFilter)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTeamName =
          group.team1Name?.toLowerCase().includes(searchLower) ||
          group.team2Name?.toLowerCase().includes(searchLower);
        
        // Check if any match in the group has matching player names
        const matchesPlayerName = group.matches.some(match =>
          match.player1Team1?.toLowerCase().includes(searchLower) ||
          match.player2Team1?.toLowerCase().includes(searchLower) ||
          match.player1Team2?.toLowerCase().includes(searchLower) ||
          match.player2Team2?.toLowerCase().includes(searchLower)
        );

        if (!matchesTeamName && !matchesPlayerName) {
          return false;
        }
      }

      return true;
    });
  };

  // Get unique fixture types for filtering
  const getAvailableFixtureTypes = () => {
    const types = new Set();
    
    // Add fixture types from individual fixtures
    Object.values(fixtures).forEach(dayFixtures => {
      dayFixtures.forEach(fixture => {
        if (fixture.fixtureType) {
          types.add(fixture.fixtureType);
        }
      });
    });
    
    // Add fixture types from fixture groups
    Object.values(fixtureGroups).forEach(group => {
      group.matches.forEach(match => {
        if (match.fixtureType) {
          types.add(match.fixtureType);
        }
      });
    });
    
    return Array.from(types).sort();
  };

  // Helper function to format fixture type for display
  const formatFixtureType = (fixtureType) => {
    switch (fixtureType) {
      case 'league': return 'League';
      case 'quarterfinal': return 'Quarter Final';
      case 'semifinal': return 'Semi Final';
      case 'thirdplace': return 'Third Place';
      case 'final': return 'Final';
      case 'dreambreaker': return 'DreamBreaker';
      case 'minidreambreaker': return 'Mini DreamBreaker';
      case 'roundrobin': return 'Round Robin';
      case 'custom': return 'Custom';
      case 'playoff': return 'Playoff';
      default: return fixtureType || 'Unknown';
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
              onClick={() => navigate(`/admin/tournaments/${id}`)}
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
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <button
              className="btn btn-ghost btn-sm flex-shrink-0 self-start"
              onClick={() => navigate(`/admin/tournaments/${id}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Tournament</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            {isSuperAdmin() && (
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm sm:btn-md flex-shrink-0"
                  onClick={handleCreateFixtureClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Create Fixture</span>
                  <span className="sm:hidden">Create</span>
                </button>
                
                <button
                  className="btn btn-info btn-sm sm:btn-md flex-shrink-0"
                  onClick={() => {
                    const umpireMatchListUrl = `${window.location.origin}/umpire-matches/${id}`;
                    window.open(umpireMatchListUrl, '_blank');
                  }}
                  title="View all matches for umpire access"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="hidden sm:inline">Umpire Match List</span>
                  <span className="sm:hidden">Umpire</span>
                </button>
                
                <button
                  className="btn btn-warning btn-sm sm:btn-md flex-shrink-0"
                  onClick={() => {
                    const streamingMatchListUrl = `${window.location.origin}/streaming-matches/${id}`;
                    window.open(streamingMatchListUrl, '_blank');
                  }}
                  title="View all matches for streaming overlay access"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Streaming Overlay List</span>
                  <span className="sm:hidden">Streaming</span>
                </button>
                
                <button
                  className="btn btn-secondary btn-sm sm:btn-md flex-shrink-0"
                  onClick={() => {
                    const tournamentDisplayUrl = `${window.location.origin}/tournament-display/${id}`;
                    window.open(tournamentDisplayUrl, '_blank');
                  }}
                  title="Open tournament display view in new window"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="hidden sm:inline">Display View</span>
                  <span className="sm:hidden">Display</span>
                </button>
              </div>
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">
            {isTeamAdmin() ? 'My Team Fixtures' : 'Fixtures'}
          </h1>
          <p className="text-base-content/70 text-sm sm:text-base lg:text-lg break-words">
            {isTeamAdmin()
              ? `${tournament?.name} - ${currentUser?.teamName || 'Team'} fixtures only`
              : tournament?.name
            }
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Date Calendar - Only show for DreamBreaker Team mode, not for Round Robin */}
        {fixtureStyle === 'dreambreaker' && (
          <div className="card bg-base-100 shadow-xl mb-8 w-full overflow-hidden">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4 sm:mb-6 break-words">Tournament Schedule</h2>
              
              <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
                <div className="flex gap-3 sm:gap-4 pb-4 min-w-max">
                  {dateRange.map((date, index) => {
                    const dateKey = date.toDateString();
                    const dayFixtures = fixtures[dateKey] || [];
                    
                    return (
                      <div key={index} className="flex-shrink-0 w-40 sm:w-48">
                        <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full">
                          <div className="card-body p-3 sm:p-4">
                            <div className="text-center mb-2 sm:mb-3">
                              <div className="text-sm sm:text-lg font-bold break-words">{formatDate(date)}</div>
                              <div className="text-xs sm:text-sm text-base-content/60">
                                {date.toLocaleDateString('en-US', { year: 'numeric' })}
                              </div>
                            </div>
                            
                            {/* Show fixture count for this date */}
                            <div className="mb-2 sm:mb-3 min-h-[50px] sm:min-h-[60px] flex items-center justify-center">
                              {dayFixtures.length > 0 ? (
                                <div className="text-center">
                                  <div className="badge badge-primary badge-sm sm:badge-lg">
                                    {dayFixtures.length} fixture{dayFixtures.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-base-content/50 text-xs sm:text-sm">
                                  No fixtures
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <button
                                className="btn btn-outline btn-xs sm:btn-sm w-full text-xs sm:text-sm"
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
        )}

        {/* Fixtures List */}
        <div className="card bg-base-100 shadow-xl w-full overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl break-words min-w-0">
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
                  className="btn btn-ghost btn-sm flex-shrink-0 self-start sm:self-center"
                  onClick={() => setSelectedDateForView(null)}
                >
                  <span className="hidden sm:inline">Show All Fixtures</span>
                  <span className="sm:hidden">Show All</span>
                </button>
              )}
            </div>

            {/* Tabs for Round Robin mode */}
            {(fixtureStyle === 'roundrobin' || fixtureStyle === null) && (
              <div className="tabs tabs-bordered mb-6">
                <button
                  className={`tab tab-lg ${activeTab === 'fixtures' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('fixtures')}
                >
                  Fixtures
                </button>
                <button
                  className={`tab tab-lg ${activeTab === 'playoffs' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('playoffs')}
                >
                  Playoffs
                </button>
                <button
                  className={`tab tab-lg ${activeTab === 'ranking' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('ranking')}
                >
                  Ranking
                </button>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'fixtures' && (
              <>
                {/* Search and Filter Section */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search Input */}
              <div className="form-control flex-1">
                <div className="input-group">
                  <span className="bg-base-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by player name or team name..."
                    className="input input-bordered w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Team Filter */}
              <div className="form-control w-full sm:w-64">
                <select
                  className="select select-bordered w-full"
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                >
                  <option value="">Filter by team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {selectedTeamFilter && (
                  <button
                    className="btn btn-ghost btn-xs mt-1"
                    onClick={() => setSelectedTeamFilter('')}
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {/* Fixture Type Filter */}
              <div className="form-control w-full sm:w-64">
                <select
                  className="select select-bordered w-full"
                  value={selectedFixtureTypeFilter}
                  onChange={(e) => setSelectedFixtureTypeFilter(e.target.value)}
                >
                  <option value="">Filter by fixture type</option>
                  {getAvailableFixtureTypes().map(type => (
                    <option key={type} value={type}>
                      {formatFixtureType(type)}
                    </option>
                  ))}
                </select>
                {selectedFixtureTypeFilter && (
                  <button
                    className="btn btn-ghost btn-xs mt-1"
                    onClick={() => setSelectedFixtureTypeFilter('')}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>
            
            {Object.keys(fixtureGroups).length === 0 && Object.keys(fixtures).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-base-content/50 text-lg mb-4">No fixtures created yet</div>
                <p className="text-base-content/70">Click "Create Fixture" above to create your first fixture</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show DreamBreaker Team fixtures (grouped) */}
                {filterFixtureGroups(
                  Object.entries(fixtureGroups)
                    .filter(([groupKey, group]) => {
                      if (!selectedDateForView) return true;
                      return group.dateKey === selectedDateForView.toDateString();
                    })
                    .sort(([, a], [, b]) => {
                      // Sort by date
                      return a.date.toDate() - b.date.toDate();
                    })
                )
                  .map(([groupKey, group]) => (
                    <div
                      key={groupKey}
                      className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer w-full overflow-hidden"
                      onClick={() => navigate(`/admin/tournaments/${id}/fixtures/${group.id}`)}
                    >
                      <div className="card-body p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                            <div className="text-base sm:text-lg font-bold flex-shrink-0">
                              {group.date.toDate().toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="badge badge-primary badge-sm sm:badge-lg">
                              {formatFixtureType(group.matches[0]?.fixtureType)}
                            </div>
                            <div className="badge badge-secondary badge-sm sm:badge-lg">
                              {group.matches.length} matches
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isSuperAdmin() && (
                              <button
                                className="btn btn-ghost btn-xs sm:btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFixture(group.matches[0]);
                                }}
                                title="Edit"
                              >
                                <span className="hidden sm:inline">Edit</span>
                                <span className="sm:hidden text-lg">✏️</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3">
                          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words min-w-0">{group.team1Name}</div>
                          <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-center">VS</div>
                          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words min-w-0 sm:text-right">{group.team2Name}</div>
                        </div>
                        
                        {/* Show match types */}
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-4">
                          {group.matches.map((match, index) => (
                            <div key={index} className="badge badge-outline badge-sm sm:badge-md break-words">
                              {match.matchTypeLabel}
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-center mt-4 text-xs sm:text-sm text-base-content/60">
                          Click to view all matches
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Show Custom and Round Robin fixtures (individual) */}
                {Object.entries(fixtures)
                  .filter(([dateKey, dayFixtures]) => {
                    if (!selectedDateForView) return true;
                    return dateKey === selectedDateForView.toDateString();
                  })
                  .sort(([a], [b]) => new Date(a) - new Date(b))
                  .map(([dateKey, dayFixtures]) =>
                    filterFixtures(
                      dayFixtures
                        .filter(fixture => fixture.fixtureType === 'custom' || fixture.fixtureType === 'roundrobin')
                        .sort((a, b) => a.time.localeCompare(b.time))
                    )
                      .map((fixture) => (
                        <div
                          key={fixture.id}
                          className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden"
                        >
                          <div className="card-body p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                                <div className="text-base sm:text-lg font-bold flex-shrink-0">
                                  {(() => {
                                    let date;
                                    if (fixture.dateObj && fixture.dateObj.toLocaleDateString) {
                                      date = fixture.dateObj;
                                    } else if (fixture.date && fixture.date.toDate) {
                                      date = fixture.date.toDate();
                                    } else if (fixture.date && fixture.date.seconds) {
                                      date = new Date(fixture.date.seconds * 1000);
                                    } else if (fixture.date) {
                                      date = new Date(fixture.date);
                                    } else {
                                      date = new Date();
                                    }
                                    return date.toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric'
                                    });
                                  })()}
                                </div>
                                <div className="text-sm sm:text-base font-medium">
                                  {fixture.time}
                                </div>
                                <div className="badge badge-accent badge-sm sm:badge-lg">
                                  {formatFixtureType(fixture.fixtureType)}
                                </div>
                                {fixture.pool && (
                                  <div className="badge badge-secondary badge-sm sm:badge-md">
                                    Pool {fixture.pool}
                                  </div>
                                )}
                                <div className="badge badge-outline badge-sm sm:badge-md">
                                  {fixture.matchTypeLabel}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Action buttons like DreamBreaker fixtures */}
                                {isSuperAdmin() && (
                                  <>
                                    <button
                                      className="btn btn-ghost btn-xs sm:btn-sm"
                                      onClick={() => {
                                        const tvUrl = `${window.location.origin}/tv/${fixture.id}`;
                                        window.open(tvUrl, '_blank');
                                      }}
                                      title="TV Display"
                                    >
                                      <span className="text-lg">📺</span>
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs sm:btn-sm"
                                      onClick={() => {
                                        const umpireUrl = `${window.location.origin}/umpire/${fixture.id}`;
                                        window.open(umpireUrl, '_blank');
                                      }}
                                      title="Umpire"
                                    >
                                      <span className="text-lg">⚖️</span>
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs sm:btn-sm"
                                      onClick={() => {
                                        const basicScoreUrl = `${window.location.origin}/basic-score/${fixture.id}`;
                                        window.open(basicScoreUrl, '_blank');
                                      }}
                                      title="Basic Score"
                                    >
                                      <span className="text-lg">📊</span>
                                    </button>
                                    {fixture.youtubeLink && (
                                      <button
                                        className="btn btn-ghost btn-xs sm:btn-sm"
                                        onClick={() => window.open(fixture.youtubeLink, '_blank')}
                                        title="Watch Live"
                                      >
                                        <span className="text-lg">📹</span>
                                      </button>
                                    )}
                                  </>
                                )}
                                {isSuperAdmin() && (
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => handleEditFixture(fixture)}
                                    title="Edit"
                                  >
                                    <span className="hidden sm:inline">Edit</span>
                                    <span className="sm:hidden text-lg">✏️</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                              {/* Team 1 */}
                              <div className="flex-1 min-w-0">
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words mb-1">{fixture.team1Name}</div>
                                {(fixture.player1Team1 || fixture.player2Team1) && (
                                  <div className="text-sm space-y-0.5">
                                    {fixture.player1Team1 && <div>{fixture.player1Team1}</div>}
                                    {fixture.player2Team1 && <div>{fixture.player2Team1}</div>}
                                  </div>
                                )}
                              </div>
                              
                              {/* VS */}
                              <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                              
                              {/* Team 2 */}
                              <div className="flex-1 min-w-0 sm:text-right">
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words mb-1">{fixture.team2Name}</div>
                                {(fixture.player1Team2 || fixture.player2Team2) && (
                                  <div className="text-sm space-y-0.5">
                                    {fixture.player1Team2 && <div>{fixture.player1Team2}</div>}
                                    {fixture.player2Team2 && <div>{fixture.player2Team2}</div>}
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      ))
                  )}
                
                {/* Show message if no fixtures match filters */}
                {(searchTerm || selectedTeamFilter || selectedFixtureTypeFilter) &&
                 filterFixtureGroups(Object.entries(fixtureGroups)).length === 0 &&
                 Object.entries(fixtures).every(([dateKey, dayFixtures]) =>
                   filterFixtures(dayFixtures.filter(fixture => fixture.fixtureType === 'custom' || fixture.fixtureType === 'roundrobin')).length === 0
                 ) && (
                  <div className="text-center py-12">
                    <div className="text-base-content/50 text-lg mb-4">
                      No fixtures match your search criteria
                    </div>
                    <div className="flex gap-2 justify-center">
                      {searchTerm && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSearchTerm('')}
                        >
                          Clear search
                        </button>
                      )}
                      {selectedTeamFilter && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedTeamFilter('')}
                        >
                          Clear team filter
                        </button>
                      )}
                      {selectedFixtureTypeFilter && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedFixtureTypeFilter('')}
                        >
                          Clear fixture type filter
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Show message if no fixtures for selected date */}
                {selectedDateForView && !searchTerm && !selectedTeamFilter && !selectedFixtureTypeFilter &&
                 Object.entries(fixtureGroups)
                   .filter(([, group]) => group.dateKey === selectedDateForView.toDateString())
                   .length === 0 &&
                 Object.entries(fixtures)
                   .filter(([dateKey]) => dateKey === selectedDateForView.toDateString())
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
                      onClick={handleCreateFixtureClick}
                    >
                      Create First Fixture for This Date
                    </button>
                  </div>
                )}
              </div>
            )}
              </>
            )}

            {/* Playoffs Tab Content */}
            {activeTab === 'playoffs' && (fixtureStyle === 'roundrobin' || fixtureStyle === null) && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Playoffs Structure</h3>
                  <p className="text-base-content/70">Click Edit on any match to manually assign teams</p>
                  {playoffFixtures.length === 0 && (
                    <button
                      className="btn btn-primary mt-4"
                      onClick={createPlayoffFixtures}
                    >
                      Create Playoff Fixtures
                    </button>
                  )}
                </div>

                {playoffFixtures.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-base-content/50 text-lg mb-4">
                      No playoff fixtures created yet
                    </div>
                    <p className="text-base-content/70">Click "Create Playoff Fixtures" to set up the tournament bracket</p>
                  </div>
                ) : (
                  <>

                {/* Quarterfinals */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4">Quarterfinals</h4>
                  <div className="space-y-4">
                    {playoffFixtures
                      .filter(fixture => fixture.playoffStage === 'quarterfinal')
                      .sort((a, b) => a.playoffNumber - b.playoffNumber)
                      .map((fixture) => (
                      <div key={fixture.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden">
                        <div className="card-body p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                              <div className="text-base sm:text-lg font-bold flex-shrink-0">
                                Quarterfinal {fixture.playoffNumber}
                              </div>
                              <div className="text-sm sm:text-base font-medium">
                                {fixture.time || 'TBD'}
                              </div>
                              <div className="badge badge-warning badge-sm sm:badge-lg">
                                Playoff
                              </div>
                              <div className="badge badge-outline badge-sm sm:badge-md">
                                {fixture.matchTypeLabel}
                              </div>
                              {fixture.court && (
                                <div className="badge badge-info badge-sm sm:badge-md">
                                  Court {fixture.court}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSuperAdmin() && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const tvUrl = `${window.location.origin}/tv/${fixture.id}`;
                                      window.open(tvUrl, '_blank');
                                    }}
                                    title="TV Display"
                                  >
                                    <span className="text-lg">📺</span>
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const umpireUrl = `${window.location.origin}/umpire/${fixture.id}`;
                                      window.open(umpireUrl, '_blank');
                                    }}
                                    title="Umpire"
                                  >
                                    <span className="text-lg">⚖️</span>
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const basicScoreUrl = `${window.location.origin}/basic-score/${fixture.id}`;
                                      window.open(basicScoreUrl, '_blank');
                                    }}
                                    title="Basic Score"
                                  >
                                    <span className="text-lg">📊</span>
                                  </button>
                                </>
                              )}
                              {isSuperAdmin() && (
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => handleEditFixture(fixture)}
                                  title="Edit"
                                >
                                  <span className="hidden sm:inline">Edit</span>
                                  <span className="sm:hidden text-lg">✏️</span>
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-xs sm:btn-sm text-warning"
                                onClick={() => handleResetPlayoffFixture(fixture)}
                                title="Reset Teams & Players"
                              >
                                <span className="hidden sm:inline">Reset</span>
                                <span className="sm:hidden text-lg">🔄</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                            {/* Team 1 */}
                            <div className="flex-1 min-w-0">
                              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words mb-1">
                                {fixture.team1Name || 'TBD'}
                              </div>
                              <div className="text-sm space-y-0.5">
                                {fixture.player1Team1 && fixture.player2Team1 ? (
                                  <div>{fixture.player1Team1} & {fixture.player2Team1}</div>
                                ) : (
                                  <div>Player assignments pending</div>
                                )}
                              </div>
                            </div>
                            
                            {/* VS */}
                            <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                            
                            {/* Team 2 */}
                            <div className="flex-1 min-w-0 sm:text-right">
                              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words mb-1">
                                {fixture.team2Name || 'TBD'}
                              </div>
                              <div className="text-sm space-y-0.5">
                                {fixture.player1Team2 && fixture.player2Team2 ? (
                                  <div>{fixture.player1Team2} & {fixture.player2Team2}</div>
                                ) : (
                                  <div>Player assignments pending</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Semifinals */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4">Semifinals</h4>
                  <div className="space-y-4">
                    {playoffFixtures
                      .filter(fixture => fixture.playoffStage === 'semifinal')
                      .sort((a, b) => a.playoffNumber - b.playoffNumber)
                      .map((fixture) => (
                      <div key={fixture.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden">
                        <div className="card-body p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                              <div className="text-base sm:text-lg font-bold flex-shrink-0">
                                Semifinal {fixture.playoffNumber}
                              </div>
                              <div className="text-sm sm:text-base font-medium">
                                {fixture.time || 'TBD'}
                              </div>
                              <div className="badge badge-warning badge-sm sm:badge-lg">
                                Playoff
                              </div>
                              <div className="badge badge-outline badge-sm sm:badge-md">
                                {fixture.matchTypeLabel}
                              </div>
                              {fixture.court && (
                                <div className="badge badge-info badge-sm sm:badge-md">
                                  Court {fixture.court}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSuperAdmin() && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const tvUrl = `${window.location.origin}/tv/${fixture.id}`;
                                      window.open(tvUrl, '_blank');
                                    }}
                                    title="TV Display"
                                  >
                                    <span className="text-lg">📺</span>
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const umpireUrl = `${window.location.origin}/umpire/${fixture.id}`;
                                      window.open(umpireUrl, '_blank');
                                    }}
                                    title="Umpire"
                                  >
                                    <span className="text-lg">⚖️</span>
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs sm:btn-sm"
                                    onClick={() => {
                                      const basicScoreUrl = `${window.location.origin}/basic-score/${fixture.id}`;
                                      window.open(basicScoreUrl, '_blank');
                                    }}
                                    title="Basic Score"
                                  >
                                    <span className="text-lg">📊</span>
                                  </button>
                                </>
                              )}
                              {isSuperAdmin() && (
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => handleEditFixture(fixture)}
                                  title="Edit"
                                >
                                  <span className="hidden sm:inline">Edit</span>
                                  <span className="sm:hidden text-lg">✏️</span>
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-xs sm:btn-sm text-warning"
                                onClick={() => handleResetPlayoffFixture(fixture)}
                                title="Reset Teams & Players"
                              >
                                <span className="hidden sm:inline">Reset</span>
                                <span className="sm:hidden text-lg">🔄</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                            {/* Team 1 */}
                            <div className="flex-1 min-w-0">
                              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words mb-1">
                                {fixture.team1Name || 'TBD'}
                              </div>
                              <div className="text-sm space-y-0.5">
                                {fixture.player1Team1 && fixture.player2Team1 ? (
                                  <div>{fixture.player1Team1} & {fixture.player2Team1}</div>
                                ) : (
                                  <div>Player assignments pending</div>
                                )}
                              </div>
                            </div>
                            
                            {/* VS */}
                            <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                            
                            {/* Team 2 */}
                            <div className="flex-1 min-w-0 sm:text-right">
                              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words mb-1">
                                {fixture.team2Name || 'TBD'}
                              </div>
                              <div className="text-sm space-y-0.5">
                                {fixture.player1Team2 && fixture.player2Team2 ? (
                                  <div>{fixture.player1Team2} & {fixture.player2Team2}</div>
                                ) : (
                                  <div>Player assignments pending</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Third Place & Final */}
                <div className="space-y-4">
                  {/* Third Place */}
                  {playoffFixtures
                    .filter(fixture => fixture.playoffStage === 'third-place')
                    .map((fixture) => (
                    <div key={fixture.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden">
                      <div className="card-body p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                            <div className="text-base sm:text-lg font-bold flex-shrink-0">
                              Third Place
                            </div>
                            <div className="text-sm sm:text-base font-medium">
                              {fixture.time || 'TBD'}
                            </div>
                            <div className="badge badge-warning badge-sm sm:badge-lg">
                              Playoff
                            </div>
                            <div className="badge badge-outline badge-sm sm:badge-md">
                              {fixture.matchTypeLabel}
                            </div>
                            {fixture.court && (
                              <div className="badge badge-info badge-sm sm:badge-md">
                                Court {fixture.court}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isSuperAdmin() && (
                              <>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const tvUrl = `${window.location.origin}/tv/${fixture.id}`;
                                    window.open(tvUrl, '_blank');
                                  }}
                                  title="TV Display"
                                >
                                  <span className="text-lg">📺</span>
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const umpireUrl = `${window.location.origin}/umpire/${fixture.id}`;
                                    window.open(umpireUrl, '_blank');
                                  }}
                                  title="Umpire"
                                >
                                  <span className="text-lg">⚖️</span>
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const basicScoreUrl = `${window.location.origin}/basic-score/${fixture.id}`;
                                    window.open(basicScoreUrl, '_blank');
                                  }}
                                  title="Basic Score"
                                >
                                  <span className="text-lg">📊</span>
                                </button>
                              </>
                            )}
                            {isSuperAdmin() && (
                              <button
                                className="btn btn-ghost btn-xs sm:btn-sm"
                                onClick={() => handleEditFixture(fixture)}
                                title="Edit"
                              >
                                <span className="hidden sm:inline">Edit</span>
                                <span className="sm:hidden text-lg">✏️</span>
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-warning"
                              onClick={() => handleResetPlayoffFixture(fixture)}
                              title="Reset Teams & Players"
                            >
                              <span className="hidden sm:inline">Reset</span>
                              <span className="sm:hidden text-lg">🔄</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                          {/* Team 1 */}
                          <div className="flex-1 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words mb-1">
                              {fixture.team1Name || 'TBD'}
                            </div>
                            <div className="text-sm space-y-0.5">
                              {fixture.player1Team1 && fixture.player2Team1 ? (
                                <div>{fixture.player1Team1} & {fixture.player2Team1}</div>
                              ) : (
                                <div>Player assignments pending</div>
                              )}
                            </div>
                          </div>
                          
                          {/* VS */}
                          <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                          
                          {/* Team 2 */}
                          <div className="flex-1 min-w-0 sm:text-right">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words mb-1">
                              {fixture.team2Name || 'TBD'}
                            </div>
                            <div className="text-sm space-y-0.5">
                              {fixture.player1Team2 && fixture.player2Team2 ? (
                                <div>{fixture.player1Team2} & {fixture.player2Team2}</div>
                              ) : (
                                <div>Player assignments pending</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Final */}
                  {playoffFixtures
                    .filter(fixture => fixture.playoffStage === 'final')
                    .map((fixture) => (
                    <div key={fixture.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden">
                      <div className="card-body p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                            <div className="text-base sm:text-lg font-bold flex-shrink-0">
                              Final
                            </div>
                            <div className="text-sm sm:text-base font-medium">
                              {fixture.time || 'TBD'}
                            </div>
                            <div className="badge badge-warning badge-sm sm:badge-lg">
                              Playoff
                            </div>
                            <div className="badge badge-outline badge-sm sm:badge-md">
                              {fixture.matchTypeLabel}
                            </div>
                            {fixture.court && (
                              <div className="badge badge-info badge-sm sm:badge-md">
                                Court {fixture.court}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isSuperAdmin() && (
                              <>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const tvUrl = `${window.location.origin}/tv/${fixture.id}`;
                                    window.open(tvUrl, '_blank');
                                  }}
                                  title="TV Display"
                                >
                                  <span className="text-lg">📺</span>
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const umpireUrl = `${window.location.origin}/umpire/${fixture.id}`;
                                    window.open(umpireUrl, '_blank');
                                  }}
                                  title="Umpire"
                                >
                                  <span className="text-lg">⚖️</span>
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs sm:btn-sm"
                                  onClick={() => {
                                    const basicScoreUrl = `${window.location.origin}/basic-score/${fixture.id}`;
                                    window.open(basicScoreUrl, '_blank');
                                  }}
                                  title="Basic Score"
                                >
                                  <span className="text-lg">📊</span>
                                </button>
                              </>
                            )}
                            {isSuperAdmin() && (
                              <button
                                className="btn btn-ghost btn-xs sm:btn-sm"
                                onClick={() => handleEditFixture(fixture)}
                                title="Edit"
                              >
                                <span className="hidden sm:inline">Edit</span>
                                <span className="sm:hidden text-lg">✏️</span>
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-warning"
                              onClick={() => handleResetPlayoffFixture(fixture)}
                              title="Reset Teams & Players"
                            >
                              <span className="hidden sm:inline">Reset</span>
                              <span className="sm:hidden text-lg">🔄</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                          {/* Team 1 */}
                          <div className="flex-1 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary break-words mb-1">
                              {fixture.team1Name || 'TBD'}
                            </div>
                            <div className="text-sm space-y-0.5">
                              {fixture.player1Team1 && fixture.player2Team1 ? (
                                <div>{fixture.player1Team1} & {fixture.player2Team1}</div>
                              ) : (
                                <div>Player assignments pending</div>
                              )}
                            </div>
                          </div>
                          
                          {/* VS */}
                          <div className="text-base sm:text-lg lg:text-xl font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                          
                          {/* Team 2 */}
                          <div className="flex-1 min-w-0 sm:text-right">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary break-words mb-1">
                              {fixture.team2Name || 'TBD'}
                            </div>
                            <div className="text-sm space-y-0.5">
                              {fixture.player1Team2 && fixture.player2Team2 ? (
                                <div>{fixture.player1Team2} & {fixture.player2Team2}</div>
                              ) : (
                                <div>Player assignments pending</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                  </>
                )}
              </div>
            )}

            {/* Ranking Tab Content */}
            {activeTab === 'ranking' && (fixtureStyle === 'roundrobin' || fixtureStyle === null) && (
              <div className="text-center py-12">
                <div className="text-base-content/50 text-lg mb-4">
                  Ranking Table
                </div>
                <p className="text-base-content/70">Ranking functionality will be implemented later</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Fixture Modal */}
        {showModal && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">
                Create Custom Fixture
              </h3>
              
              <form onSubmit={handleCreateFixture} className="space-y-4">
                {/* Date */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Date *</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="input input-bordered w-full"
                    value={fixtureForm.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

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

                {/* Time, Pool, and Court */}
                <div className="grid grid-cols-3 gap-4">
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

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Pool</span>
                    </label>
                    <select
                      name="pool"
                      className="select select-bordered w-full"
                      value={fixtureForm.pool}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Pool</option>
                      <option value="A">Pool A</option>
                      <option value="B">Pool B</option>
                      <option value="C">Pool C</option>
                      <option value="D">Pool D</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Court</span>
                    </label>
                    <select
                      name="court"
                      className="select select-bordered w-full"
                      value={fixtureForm.court}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Court</option>
                      <option value="1">Court 1</option>
                      <option value="2">Court 2</option>
                    </select>
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
            <div className="modal-box w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">
                {fixtureStyle === 'minidreambreaker' ? 'Create Mini DreamBreaker Team Fixture' : 'Create DreamBreaker Team Fixture'}
              </h3>
              
              <div className="alert alert-info mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold">{fixtureStyle === 'minidreambreaker' ? 'Mini DreamBreaker Team Format' : 'DreamBreaker Team Format'}</h4>
                  <div className="text-sm">
                    {fixtureStyle === 'minidreambreaker' ? (
                      <>
                        This will automatically create 4 matches between the selected teams:
                        <ul className="list-disc list-inside mt-2 ml-4">
                          <li>2 Men's Doubles</li>
                          <li>2 Mixed Doubles</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        This will automatically create 6 matches between the selected teams:
                        <ul className="list-disc list-inside mt-2 ml-4">
                          <li>1 Men's Singles</li>
                          <li>1 Women's Singles</li>
                          <li>1 Mixed Doubles</li>
                          <li>2 Men's Doubles</li>
                          <li>1 Women's Doubles</li>
                        </ul>
                      </>
                    )}
                    You can update the players later by clicking on edit for each match.
                  </div>
                </div>
              </div>
              
              <form onSubmit={fixtureStyle === 'minidreambreaker' ? handleCreateMiniBulkFixtures : handleCreateBulkFixtures} className="space-y-4">
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

                {/* Date, Time, Pool, and Court */}
                <div className="grid grid-cols-2 gap-4 mb-4">
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
                    Create DreamBreaker Fixture
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Fixture Style Selection Modal */}
        {showFixtureStyleModal && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-lg">
              <h3 className="font-bold text-xl mb-6 text-center">
                Choose Fixture Style
              </h3>
              
              <div className="space-y-4">
                {/* DreamBreaker Team Option */}
                <div
                  className="card bg-base-200 shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-primary"
                  onClick={() => handleFixtureStyleSelect('dreambreaker')}
                >
                  <div className="card-body p-6">
                    <div className="flex items-center gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-12">
                          <span className="text-xl">🏆</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">DreamBreaker Team</h4>
                        <p className="text-sm text-base-content/70 mt-1">
                          Automatically creates 6 matches between two teams:
                        </p>
                        <ul className="text-xs text-base-content/60 mt-2 list-disc list-inside">
                          <li>1 Men's Singles</li>
                          <li>1 Women's Singles</li>
                          <li>1 Mixed Doubles</li>
                          <li>2 Men's Doubles</li>
                          <li>1 Women's Doubles</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini DreamBreaker Team Option */}
                <div
                  className="card bg-base-200 shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-warning"
                  onClick={() => handleFixtureStyleSelect('minidreambreaker')}
                >
                  <div className="card-body p-6">
                    <div className="flex items-center gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-warning text-warning-content rounded-full w-12">
                          <span className="text-xl">⚡</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Mini DreamBreaker Team</h4>
                        <p className="text-sm text-base-content/70 mt-1">
                          Automatically creates 4 matches between two teams:
                        </p>
                        <ul className="text-xs text-base-content/60 mt-2 list-disc list-inside">
                          <li>2 Men's Doubles</li>
                          <li>2 Mixed Doubles</li>
                        </ul>
                        <p className="text-xs text-base-content/50 mt-2">
                          No pool or court selection required
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Option */}
                <div
                  className="card bg-base-200 shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-secondary"
                  onClick={() => handleFixtureStyleSelect('custom')}
                >
                  <div className="card-body p-6">
                    <div className="flex items-center gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-secondary text-secondary-content rounded-full w-12">
                          <span className="text-xl">⚙️</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Custom</h4>
                        <p className="text-sm text-base-content/70 mt-1">
                          Manually create individual matches one by one.
                        </p>
                        <p className="text-xs text-base-content/60 mt-2">
                          Choose match type, teams, and players for each fixture.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RoundRobin + Playoffs Option */}
                <div
                  className="card bg-base-200 shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-accent"
                  onClick={() => handleFixtureStyleSelect('roundrobin')}
                >
                  <div className="card-body p-6">
                    <div className="flex items-center gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-accent text-accent-content rounded-full w-12">
                          <span className="text-xl">🏅</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">RoundRobin + Playoffs</h4>
                        <p className="text-sm text-base-content/70 mt-1">
                          Create pools where teams play round robin, followed by playoffs.
                        </p>
                        <p className="text-xs text-base-content/60 mt-2">
                          Configure number of pools, teams per pool, and team assignments.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-action mt-8">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowFixtureStyleModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Fixture Modal */}
        {showEditModal && editingFixture && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">
                Edit Fixture
              </h3>
              
              <form onSubmit={handleUpdateFixture} className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4 mb-4">
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

                {/* Fixture Type */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fixture Type *</span>
                  </label>
                  <select
                    name="fixtureType"
                    className="select select-bordered w-full"
                    value={editForm.fixtureType}
                    onChange={handleEditFormChange}
                    required
                  >
                    <option value="">Select Fixture Type</option>
                    <option value="league">League</option>
                    <option value="quarterfinal">Quarter Final</option>
                    <option value="semifinal">Semi Final</option>
                    <option value="thirdplace">Third Place</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                <div className="modal-action flex-col sm:flex-row gap-2 sm:gap-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full">
                    <button
                      type="button"
                      className="btn btn-error btn-sm sm:btn-md w-full sm:w-auto sm:mr-auto"
                      onClick={() => handleDeleteClick(editingFixture)}
                    >
                      Delete Fixture
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingFixture(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto">
                        Update Fixture
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Round Robin Configuration Modal */}
        {showRoundRobinModal && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl mb-6">
                Configure Round Robin + Playoffs
              </h3>
              
              {roundRobinConfig.step === 'pools' && (
                <div className="space-y-6">
                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">Round Robin Format</h4>
                      <p className="text-sm">
                        Teams in each pool will play against each other once. After round robin, top teams advance to playoffs.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Number of Pools</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={roundRobinConfig.numPools}
                        onChange={(e) => handleRoundRobinConfigChange('numPools', parseInt(e.target.value))}
                      >
                        <option value={2}>2 Pools</option>
                        <option value={3}>3 Pools</option>
                        <option value={4}>4 Pools</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Teams per Pool</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={roundRobinConfig.teamsPerPool}
                        onChange={(e) => handleRoundRobinConfigChange('teamsPerPool', parseInt(e.target.value))}
                      >
                        <option value={3}>3 Teams</option>
                        <option value={4}>4 Teams</option>
                        <option value={5}>5 Teams</option>
                        <option value={6}>6 Teams</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-base-content/70 mb-4">
                      Teams can participate in multiple pools with different players
                    </p>
                    <p className="text-sm text-base-content/70">
                      Available teams: {teams.length}
                    </p>
                  </div>

                  <div className="modal-action">
                    <button
                      className="btn btn-outline"
                      onClick={() => setShowRoundRobinModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        // Initialize pools
                        const pools = {};
                        for (let i = 1; i <= roundRobinConfig.numPools; i++) {
                          pools[`Pool ${String.fromCharCode(64 + i)}`] = [];
                        }
                        setRoundRobinConfig(prev => ({
                          ...prev,
                          pools,
                          step: 'teams'
                        }));
                      }}
                      disabled={teams.length === 0}
                    >
                      Next: Assign Teams
                    </button>
                  </div>
                </div>
              )}

              {roundRobinConfig.step === 'teams' && (
                <div className="space-y-6">
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm">
                        Assign teams to pools. Each team can be in multiple pools with different players.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(roundRobinConfig.pools).map(([poolName, poolTeams]) => (
                      <div key={poolName} className="card bg-base-200 shadow-md">
                        <div className="card-body p-4">
                          <h4 className="font-bold text-lg mb-4">{poolName}</h4>
                          
                          <div className="space-y-2 mb-4">
                            {poolTeams.map(teamId => {
                              const team = teams.find(t => t.id === teamId);
                              return (
                                <div key={teamId} className="flex items-center justify-between bg-base-100 p-2 rounded">
                                  <span className="text-sm">{team?.name}</span>
                                  <button
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={() => handlePoolTeamAssignment(poolName, teamId, 'remove')}
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          <div className="form-control">
                            <select
                              className="select select-bordered select-sm"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handlePoolTeamAssignment(poolName, e.target.value, 'add');
                                  e.target.value = '';
                                }
                              }}
                            >
                              <option value="">Add team to {poolName}</option>
                              {teams
                                .filter(team =>
                                  poolTeams.length < roundRobinConfig.teamsPerPool &&
                                  !poolTeams.includes(team.id)
                                )
                                .map(team => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="text-xs text-base-content/60 mt-2">
                            {poolTeams.length}/{roundRobinConfig.teamsPerPool} teams assigned
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-action">
                    <button
                      className="btn btn-outline"
                      onClick={() => setRoundRobinConfig(prev => ({ ...prev, step: 'pools' }))}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setShowRoundRobinModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setRoundRobinConfig(prev => ({ ...prev, step: 'generate' }))}
                      disabled={Object.values(roundRobinConfig.pools).some(pool => pool.length < 2)}
                    >
                      Next: Generate Fixtures
                    </button>
                  </div>
                </div>
              )}

              {roundRobinConfig.step === 'generate' && (
                <div className="space-y-6">
                  <div className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">Ready to Generate Fixtures</h4>
                      <p className="text-sm">
                        This will create round robin fixtures for all pools. You can edit dates, times, and player assignments later.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Pool Summary:</h4>
                    {Object.entries(roundRobinConfig.pools).map(([poolName, poolTeams]) => (
                      <div key={poolName} className="card bg-base-200 shadow-sm">
                        <div className="card-body p-4">
                          <h5 className="font-semibold">{poolName}</h5>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {poolTeams.map(teamId => {
                              const team = teams.find(t => t.id === teamId);
                              return (
                                <span key={teamId} className="badge badge-primary">
                                  {team?.name}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-xs text-base-content/60 mt-2">
                            {Math.floor(poolTeams.length * (poolTeams.length - 1) / 2)} matches per category
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-action">
                    <button
                      className="btn btn-outline"
                      onClick={() => setRoundRobinConfig(prev => ({ ...prev, step: 'teams' }))}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setShowRoundRobinModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={generateRoundRobinFixtures}
                    >
                      Generate Round Robin Fixtures
                    </button>
                  </div>
                </div>
              )}
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
                  {(() => {
                    let date;
                    if (fixtureToDelete.dateObj && fixtureToDelete.dateObj.toLocaleDateString) {
                      date = fixtureToDelete.dateObj;
                    } else if (fixtureToDelete.date && fixtureToDelete.date.toDate) {
                      date = fixtureToDelete.date.toDate();
                    } else if (fixtureToDelete.date && fixtureToDelete.date.seconds) {
                      date = new Date(fixtureToDelete.date.seconds * 1000);
                    } else if (fixtureToDelete.date) {
                      date = new Date(fixtureToDelete.date);
                    } else {
                      return 'Invalid Date';
                    }
                    
                    return date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  })()} at {fixtureToDelete.time || 'No time set'}
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