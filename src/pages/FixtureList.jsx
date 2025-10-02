import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';

export default function FixtureList() {
  const { id: tournamentId, fixtureId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fixtureInfo, setFixtureInfo] = useState(null);
  
  // Edit match state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
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

  // Dream Breaker match state
  const [showDreamBreakerModal, setShowDreamBreakerModal] = useState(false);
  const [dreamBreakerForm, setDreamBreakerForm] = useState({
    date: '',
    time: '',
    pool: '',
    court: '',
    team1Players: [],
    team2Players: [],
    youtubeLink: ''
  });
  const [isCreatingDreamBreaker, setIsCreatingDreamBreaker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          setTournament(tournamentData);
        }

        // Fetch teams for this tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', tournamentId)
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
          where('tournamentId', '==', tournamentId)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playersData);

        // Fetch matches for this fixture group
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId),
          where('fixtureGroupId', '==', fixtureId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort matches by match number
        matchesData.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        setMatches(matchesData);

        // Set fixture info from first match
        if (matchesData.length > 0) {
          const firstMatch = matchesData[0];
          setFixtureInfo({
            team1Name: firstMatch.team1Name,
            team2Name: firstMatch.team2Name,
            date: firstMatch.date,
            team1: firstMatch.team1,
            team2: firstMatch.team2
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load fixture data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && fixtureId) {
      fetchData();
    }
  }, [tournamentId, fixtureId]);

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const getTeamPlayers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name, age: player.age, gender: player.gender } : null;
    }).filter(Boolean);
  };

  const handleEditMatch = (match) => {
    // Prevent team admins from editing after deadline
    if (isTeamAdmin() && isDeadlinePassed(match)) {
      return;
    }
    
    setEditingMatch(match);
    setEditForm({
      date: match.date && match.date.toDate ? match.date.toDate().toISOString().split('T')[0] : '',
      time: match.time || '',
      pool: match.pool || '',
      court: match.court || '',
      player1Team1: match.player1Team1 || '',
      player2Team1: match.player2Team1 || '',
      player1Team2: match.player1Team2 || '',
      player2Team2: match.player2Team2 || '',
      youtubeLink: match.youtubeLink || ''
    });
    setShowEditModal(true);
  };

  // Helper function to determine if team admin belongs to team1 or team2
  const getTeamAdminTeam = (match) => {
    if (!isTeamAdmin() || !currentUser.teamName) return null;
    
    if (match.team1Name === currentUser.teamName) return 'team1';
    if (match.team2Name === currentUser.teamName) return 'team2';
    return null;
  };

  // Helper function to get match deadline (1 hour before match time)
  const getMatchDeadline = (match) => {
    if (!match.date || !match.time) return null;
    
    const matchDate = match.date.toDate ? match.date.toDate() : new Date(match.date);
    const [hours, minutes] = match.time.split(':');
    const matchDateTime = new Date(matchDate);
    matchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Deadline is 1 hour before match time
    const deadline = new Date(matchDateTime.getTime() - 60 * 60 * 1000);
    return deadline;
  };

  // Helper function to check if deadline has passed
  const isDeadlinePassed = (match) => {
    const deadline = getMatchDeadline(match);
    if (!deadline) return false;
    return currentTime > deadline;
  };

  // Helper function to get countdown text
  const getCountdownText = (match) => {
    const deadline = getMatchDeadline(match);
    if (!deadline) return null;
    
    const timeDiff = deadline.getTime() - currentTime.getTime();
    
    if (timeDiff <= 0) {
      return { text: 'Deadline passed', color: 'text-error', expired: true };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    let timeText = '';
    if (days > 0) {
      timeText = `${days}d ${hours}h ${minutes}m ${seconds}s until deadline`;
    } else if (hours > 0) {
      timeText = `${hours}h ${minutes}m ${seconds}s until deadline`;
    } else if (minutes > 0) {
      timeText = `${minutes}m ${seconds}s until deadline`;
    } else {
      timeText = `${seconds}s until deadline`;
    }
    
    return {
      text: timeText,
      color: 'text-error', // Always red color as requested
      expired: false
    };
  };

  // Helper function to check if team admin can edit (not past deadline)
  const canTeamAdminEdit = (match) => {
    if (isSuperAdmin()) return true;
    if (!isTeamAdmin()) return false;
    return !isDeadlinePassed(match);
  };

  // Helper function to count how many matches a player is assigned to within this fixture
  const getPlayerMatchCount = (playerName, teamId) => {
    if (!playerName || !matches) return 0;
    
    let count = 0;
    matches.forEach(match => {
      // Check if this player is assigned to this match
      if (teamId === match.team1) {
        if (match.player1Team1 === playerName || match.player2Team1 === playerName) {
          count++;
        }
      } else if (teamId === match.team2) {
        if (match.player1Team2 === playerName || match.player2Team2 === playerName) {
          count++;
        }
      }
      
      // Also check Dream Breaker matches
      if (match.matchType === 'dreamBreaker') {
        if (teamId === match.team1 && match.team1Players) {
          const isInTeam1 = match.team1Players.some(p => p.name === playerName);
          if (isInTeam1) count++;
        } else if (teamId === match.team2 && match.team2Players) {
          const isInTeam2 = match.team2Players.some(p => p.name === playerName);
          if (isInTeam2) count++;
        }
      }
    });
    
    return count;
  };

  // Helper function to check if a player is already in a doubles match of the same type
  const isPlayerInDoublesMatchType = (playerName, teamId, matchType, currentMatchId) => {
    if (!playerName || !matches) return false;
    
    // Only check for doubles matches
    const doublesTypes = ['mensDoubles', 'womensDoubles', 'mixedDoubles'];
    if (!doublesTypes.includes(matchType)) return false;
    
    return matches.some(match => {
      // Skip the current match being edited
      if (match.id === currentMatchId) return false;
      
      // Only check matches of the same type
      if (match.matchType !== matchType) return false;
      
      // Check if player is assigned to this match
      if (teamId === match.team1) {
        return match.player1Team1 === playerName || match.player2Team1 === playerName;
      } else if (teamId === match.team2) {
        return match.player1Team2 === playerName || match.player2Team2 === playerName;
      }
      
      return false;
    });
  };

  // Helper function to check if a player can be assigned (less than 2 matches for team admins)
  const canAssignPlayer = (playerName, teamId, matchType, currentMatchId) => {
    if (isSuperAdmin()) return true; // Super admins have no restrictions
    if (!isTeamAdmin()) return true;
    
    // Check general match limit (2 matches max)
    if (getPlayerMatchCount(playerName, teamId) >= 2) return false;
    
    // Check unique doubles pairing rule
    if (isPlayerInDoublesMatchType(playerName, teamId, matchType, currentMatchId)) return false;
    
    return true;
  };

  // Helper function to get player gender
  const getPlayerGender = (playerName) => {
    const player = players.find(p => p.name === playerName);
    return player?.gender || null;
  };

  // Helper function to filter players by gender based on match type and team admin rules
  const getFilteredPlayers = (teamId, dropdownType, editingMatch) => {
    const teamPlayers = getTeamPlayers(teamId);
    
    if (isSuperAdmin()) {
      return teamPlayers; // Super admins see all players
    }
    
    if (!isTeamAdmin()) {
      return teamPlayers;
    }
    
    const matchType = editingMatch.matchType;
    
    // For women's singles and women's doubles - only female players
    if (matchType === 'womensSingles' || matchType === 'womensDoubles') {
      return teamPlayers.filter(player => {
        const playerData = players.find(p => p.id === player.id);
        return playerData?.gender === 'Female';
      });
    }
    
    // For men's singles and men's doubles - only male players
    if (matchType === 'mensSingles' || matchType === 'mensDoubles') {
      return teamPlayers.filter(player => {
        const playerData = players.find(p => p.id === player.id);
        return playerData?.gender === 'Male';
      });
    }
    
    // For mixed doubles - gender pairing logic
    if (matchType === 'mixedDoubles') {
      const isTeam1 = teamId === editingMatch.team1;
      const player1Field = isTeam1 ? 'player1Team1' : 'player1Team2';
      const player2Field = isTeam1 ? 'player2Team1' : 'player2Team2';
      
      if (dropdownType === 'player1') {
        // First player can be any gender
        return teamPlayers;
      } else if (dropdownType === 'player2') {
        // Second player must be opposite gender of first player
        const firstPlayerName = editForm[player1Field];
        if (firstPlayerName) {
          const firstPlayerGender = getPlayerGender(firstPlayerName);
          const requiredGender = firstPlayerGender === 'Male' ? 'Female' : 'Male';
          
          return teamPlayers.filter(player => {
            const playerData = players.find(p => p.id === player.id);
            return playerData?.gender === requiredGender;
          });
        }
        // If no first player selected, show all players
        return teamPlayers;
      }
    }
    
    // For other match types, show all players
    return teamPlayers;
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    
    try {
      const updatedMatch = {
        // Keep all existing required fields
        tournamentId: editingMatch.tournamentId,
        matchType: editingMatch.matchType,
        matchTypeLabel: editingMatch.matchTypeLabel,
        team1: editingMatch.team1,
        team2: editingMatch.team2,
        team1Name: editingMatch.team1Name,
        team2Name: editingMatch.team2Name,
        status: editingMatch.status,
        createdBy: editingMatch.createdBy,
        createdAt: editingMatch.createdAt,
        // Update the editable fields
        date: Timestamp.fromDate(new Date(editForm.date)),
        time: editForm.time,
        pool: editForm.pool,
        court: editForm.court,
        player1Team1: editForm.player1Team1,
        player2Team1: editForm.player2Team1,
        player1Team2: editForm.player1Team2,
        player2Team2: editForm.player2Team2,
        youtubeLink: editForm.youtubeLink,
        // Optional fields that might exist
        ...(editingMatch.fixtureType && { fixtureType: editingMatch.fixtureType }),
        ...(editingMatch.fixtureGroupId && { fixtureGroupId: editingMatch.fixtureGroupId }),
        ...(editingMatch.matchNumber && { matchNumber: editingMatch.matchNumber }),
        ...(editingMatch.playoffStage && { playoffStage: editingMatch.playoffStage }),
        ...(editingMatch.playoffNumber && { playoffNumber: editingMatch.playoffNumber }),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', editingMatch.id), updatedMatch);
      
      // Update local state
      setMatches(prev => prev.map(match => 
        match.id === editingMatch.id 
          ? { ...match, ...updatedMatch, date: { toDate: () => new Date(editForm.date) } }
          : match
      ));
      
      setShowEditModal(false);
      setEditingMatch(null);
      setError('');
    } catch (error) {
      console.error('Error updating match:', error);
      setError('Failed to update match');
    }
  };

  const handleDeleteMatch = async () => {
    if (!editingMatch) return;
    
    try {
      // Delete the match from Firestore
      await deleteDoc(doc(db, 'fixtures', editingMatch.id));
      
      // Update local state to remove the match
      setMatches(prev => prev.filter(match => match.id !== editingMatch.id));
      
      // Close modals
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setEditingMatch(null);
      setError('');
    } catch (error) {
      console.error('Error deleting match:', error);
      setError('Failed to delete match');
    }
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

  // Dream Breaker functions
  const handleOpenDreamBreakerModal = () => {
    setDreamBreakerForm({
      date: new Date().toISOString().split('T')[0],
      time: '',
      pool: '',
      court: '',
      team1Players: [],
      team2Players: [],
      youtubeLink: ''
    });
    setShowDreamBreakerModal(true);
  };

  const handleDreamBreakerFormChange = (e) => {
    const { name, value } = e.target;
    setDreamBreakerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayerSelection = (teamNumber, playerId, playerName) => {
    const teamKey = `team${teamNumber}Players`;
    setDreamBreakerForm(prev => {
      const currentPlayers = prev[teamKey];
      const playerExists = currentPlayers.some(p => p.id === playerId);
      
      if (playerExists) {
        // Remove player if already selected
        return {
          ...prev,
          [teamKey]: currentPlayers.filter(p => p.id !== playerId)
        };
      } else {
        // Add player if not selected
        return {
          ...prev,
          [teamKey]: [...currentPlayers, { id: playerId, name: playerName }]
        };
      }
    });
  };

  const handleCreateDreamBreakerMatch = async (e) => {
    e.preventDefault();
    
    if (dreamBreakerForm.team1Players.length < 6 || dreamBreakerForm.team2Players.length < 6) {
      setError('Please select at least 6 players from each team for a Dream Breaker match');
      return;
    }

    setIsCreatingDreamBreaker(true);
    
    try {
      const dreamBreakerMatch = {
        tournamentId,
        matchType: 'dreamBreaker',
        matchTypeLabel: 'Dream Breaker',
        team1: fixtureInfo.team1,
        team2: fixtureInfo.team2,
        team1Name: fixtureInfo.team1Name,
        team2Name: fixtureInfo.team2Name,
        date: Timestamp.fromDate(new Date(dreamBreakerForm.date)),
        time: dreamBreakerForm.time,
        pool: dreamBreakerForm.pool,
        court: dreamBreakerForm.court,
        youtubeLink: dreamBreakerForm.youtubeLink,
        team1Players: dreamBreakerForm.team1Players,
        team2Players: dreamBreakerForm.team2Players,
        status: 'scheduled',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        fixtureType: 'dreamBreaker',
        fixtureGroupId: fixtureId
      };

      const docRef = await addDoc(collection(db, 'fixtures'), dreamBreakerMatch);
      
      // Add to local state
      const newMatch = {
        id: docRef.id,
        ...dreamBreakerMatch,
        date: { toDate: () => new Date(dreamBreakerForm.date) }
      };
      
      setMatches(prev => [...prev, newMatch]);
      setShowDreamBreakerModal(false);
      setError('');
    } catch (error) {
      console.error('Error creating Dream Breaker match:', error);
      setError('Failed to create Dream Breaker match');
    } finally {
      setIsCreatingDreamBreaker(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error && !fixtureInfo) {
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
              onClick={() => navigate(`/admin/tournaments/${tournamentId}/fixtures`)}
            >
              Back to Fixtures
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4">
            <button
              className="btn btn-ghost btn-sm flex-shrink-0"
              onClick={() => navigate(`/admin/tournaments/${tournamentId}/fixtures`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Fixtures</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            {isSuperAdmin() && (
              <button
                className="btn btn-primary btn-sm sm:btn-md"
                onClick={handleOpenDreamBreakerModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Create Dream Breaker Match</span>
                <span className="sm:hidden">Dream Breaker</span>
              </button>
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">Fixture Matches</h1>
          {fixtureInfo && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-base lg:text-lg">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-primary font-bold break-words">{fixtureInfo.team1Name}</span>
                <span className="text-base-content/60 flex-shrink-0">VS</span>
                <span className="text-secondary font-bold break-words">{fixtureInfo.team2Name}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-base-content/60 hidden sm:inline">•</span>
                <span className="text-base-content/70 break-words">
                  {fixtureInfo.date && fixtureInfo.date.toDate ? fixtureInfo.date.toDate().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Invalid Date'}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Matches List */}
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div key={match.id} className="card bg-base-100 shadow-lg overflow-hidden">
              <div className="card-body p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    <div className="text-base sm:text-lg font-bold flex-shrink-0">Match {index + 1}</div>
                    <div className="badge badge-primary badge-sm sm:badge-lg break-words">
                      {match.matchTypeLabel}
                    </div>
                    {match.time && (
                      <div className="text-base sm:text-lg font-bold flex-shrink-0">{match.time}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Live Video Icon */}
                    {match.youtubeLink && (
                      <div className="tooltip" data-tip="Live Stream Available">
                        <a
                          href={match.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 sm:w-10 sm:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-content transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      </div>
                    )}
                    
                    {isSuperAdmin() && (
                      <>
                        {/* TV Display Icon */}
                        <div className="tooltip" data-tip="Open TV Display">
                          <button
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-content transition-colors"
                            onClick={() => {
                              const tvUrl = `${window.location.origin}/tv/${match.id}`;
                              window.open(tvUrl, '_blank');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Basic Score Display Icon */}
                        <div className="tooltip" data-tip="Open Basic Score">
                          <button
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-info hover:text-info-content transition-colors"
                            onClick={() => {
                              const basicScoreUrl = `${window.location.origin}/basic-score/${match.id}`;
                              window.open(basicScoreUrl, '_blank');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Umpire Icon */}
                        <div className="tooltip" data-tip="Open Umpire Scoring">
                          <button
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-secondary hover:text-secondary-content transition-colors"
                            onClick={() => {
                              const umpireUrl = `${window.location.origin}/umpire/${match.id}`;
                              window.open(umpireUrl, '_blank');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Streaming Overlay Icon */}
                        <div className="tooltip" data-tip="Open Streaming Overlay">
                          <button
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-warning hover:text-warning-content transition-colors"
                            onClick={() => {
                              const overlayUrl = `${window.location.origin}/streaming-overlay/${match.id}`;
                              window.open(overlayUrl, '_blank');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                    
                    <button
                      className={`btn btn-ghost btn-xs sm:btn-sm ${isTeamAdmin() && isDeadlinePassed(match) ? 'btn-disabled opacity-50' : ''}`}
                      onClick={() => handleEditMatch(match)}
                      disabled={isTeamAdmin() && isDeadlinePassed(match)}
                      title={isTeamAdmin() && isDeadlinePassed(match) ? 'Deadline passed - cannot edit player assignments' : 'Edit match'}
                    >
                      <span className="hidden sm:inline">Edit</span>
                      <span className="sm:hidden">✏️</span>
                    </button>
                  </div>
                </div>
                
                {/* Countdown Timer for Team Admins */}
                {isTeamAdmin() && getTeamAdminTeam(match) && (
                  <div className="mb-4 p-3 bg-base-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Player Assignment Deadline:</div>
                      <div className={`text-sm font-bold ${getCountdownText(match)?.color || 'text-base-content'}`}>
                        {getCountdownText(match)?.text || 'No deadline set'}
                      </div>
                    </div>
                    {getCountdownText(match)?.expired && (
                      <div className="text-xs text-error mt-1">
                        You can no longer assign players for this match
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-8">
                  {/* Team 1 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg sm:text-xl font-bold break-words mb-1">{match.team1Name}</div>
                    {/* Show Team 1 players only if super admin OR team admin belongs to team 1 */}
                    {(isSuperAdmin() || getTeamAdminTeam(match) === 'team1') && (
                      <>
                        {/* Dream Breaker match players */}
                        {match.matchType === 'dreamBreaker' && match.team1Players && match.team1Players.length > 0 && (
                          <div className="text-sm space-y-0.5">
                            <div className="font-medium text-primary">Dream Breaker Players ({match.team1Players.length}):</div>
                            {match.team1Players.slice(0, 3).map((player, idx) => (
                              <div key={idx}>{player.name}</div>
                            ))}
                            {match.team1Players.length > 3 && (
                              <div className="text-base-content/60">+{match.team1Players.length - 3} more players</div>
                            )}
                          </div>
                        )}
                        {/* Regular match players */}
                        {match.matchType !== 'dreamBreaker' && (match.player1Team1 || match.player2Team1) && (
                          <div className="text-sm space-y-0.5">
                            {match.player1Team1 && <div>{match.player1Team1}</div>}
                            {match.player2Team1 && <div>{match.player2Team1}</div>}
                          </div>
                        )}
                      </>
                    )}
                    {/* Show placeholder for team admins who don't belong to this team */}
                    {isTeamAdmin() && getTeamAdminTeam(match) !== 'team1' && (
                      <div className="text-sm text-base-content/50 italic">
                        Player assignments hidden
                      </div>
                    )}
                  </div>
                  
                  {/* VS */}
                  <div className="text-base sm:text-lg font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">VS</div>
                  
                  {/* Team 2 */}
                  <div className="flex-1 min-w-0 sm:text-right">
                    <div className="text-lg sm:text-xl font-bold break-words mb-1">{match.team2Name}</div>
                    {/* Show Team 2 players only if super admin OR team admin belongs to team 2 */}
                    {(isSuperAdmin() || getTeamAdminTeam(match) === 'team2') && (
                      <>
                        {/* Dream Breaker match players */}
                        {match.matchType === 'dreamBreaker' && match.team2Players && match.team2Players.length > 0 && (
                          <div className="text-sm space-y-0.5">
                            <div className="font-medium text-secondary">Dream Breaker Players ({match.team2Players.length}):</div>
                            {match.team2Players.slice(0, 3).map((player, idx) => (
                              <div key={idx}>{player.name}</div>
                            ))}
                            {match.team2Players.length > 3 && (
                              <div className="text-base-content/60">+{match.team2Players.length - 3} more players</div>
                            )}
                          </div>
                        )}
                        {/* Regular match players */}
                        {match.matchType !== 'dreamBreaker' && (match.player1Team2 || match.player2Team2) && (
                          <div className="text-sm space-y-0.5">
                            {match.player1Team2 && <div>{match.player1Team2}</div>}
                            {match.player2Team2 && <div>{match.player2Team2}</div>}
                          </div>
                        )}
                      </>
                    )}
                    {/* Show placeholder for team admins who don't belong to this team */}
                    {isTeamAdmin() && getTeamAdminTeam(match) !== 'team2' && (
                      <div className="text-sm text-base-content/50 italic">
                        Player assignments hidden
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Show message if no players assigned */}
                {match.matchType === 'dreamBreaker' ? (
                  // For Dream Breaker matches, check if players arrays exist and have players
                  !(match.team1Players?.length > 0 || match.team2Players?.length > 0) && (
                    <div className="text-center py-2 text-base-content/50 border-t border-base-300 text-sm sm:text-base mt-2">
                      Players not assigned yet - Click Edit to assign players
                    </div>
                  )
                ) : (
                  // For regular matches, check individual player fields
                  !(match.player1Team1 || match.player1Team2 || match.player2Team1 || match.player2Team2) && (
                    <div className="text-center py-2 text-base-content/50 border-t border-base-300 text-sm sm:text-base mt-2">
                      Players not assigned yet - Click Edit to assign players
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Match Modal */}
        {showEditModal && editingMatch && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-base sm:text-lg mb-4 break-words">
                Edit Match - {editingMatch.matchTypeLabel}
              </h3>
              
              {/* Deadline warning for team admins */}
              {isTeamAdmin() && getCountdownText(editingMatch) && (
                <div className={`alert mb-4 ${getCountdownText(editingMatch).expired ? 'alert-error' : 'alert-warning'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <div className="font-bold">Player Assignment Deadline</div>
                    <div className="text-sm">{getCountdownText(editingMatch).text}</div>
                    {getCountdownText(editingMatch).expired && (
                      <div className="text-sm mt-1">You can no longer modify player assignments for this match.</div>
                    )}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleUpdateMatch} className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Date *</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      className={`input input-bordered w-full input-sm sm:input-md ${isTeamAdmin() ? 'input-disabled bg-base-200 text-base-content/50' : ''}`}
                      value={editForm.date}
                      onChange={handleEditFormChange}
                      disabled={isTeamAdmin()}
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Time</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      className={`input input-bordered w-full input-sm sm:input-md ${isTeamAdmin() ? 'input-disabled bg-base-200 text-base-content/50' : ''}`}
                      value={editForm.time}
                      onChange={handleEditFormChange}
                      disabled={isTeamAdmin()}
                    />
                  </div>
                </div>

                {/* YouTube Live Link - Hidden for team admins */}
                {isSuperAdmin() && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">YouTube Live Link</span>
                    </label>
                    <input
                      type="url"
                      name="youtubeLink"
                      placeholder="https://youtube.com/watch?v=..."
                      className="input input-bordered w-full input-sm sm:input-md break-all"
                      value={editForm.youtubeLink}
                      onChange={handleEditFormChange}
                    />
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm sm:text-base">Player Assignment</h4>
                  
                  {isSuperAdmin() ? (
                    // Super admin sees both teams
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Team 1 Players */}
                      <div className="space-y-2 min-w-0">
                        <label className="label">
                          <span className="label-text font-medium text-sm break-words">
                            {editingMatch.team1Name} Players
                          </span>
                        </label>
                        
                        <select
                          name="player1Team1"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player1Team1}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 1</option>
                          {getTeamPlayers(editingMatch.team1).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}{player.age ? ` (${player.age} years old)` : ''}
                            </option>
                          ))}
                        </select>
                        
                        {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                          <select
                            name="player2Team1"
                            className="select select-bordered w-full select-sm"
                            value={editForm.player2Team1}
                            onChange={handleEditFormChange}
                          >
                            <option value="">Select player 2</option>
                            {getTeamPlayers(editingMatch.team1).map((player) => (
                              <option key={player.id} value={player.name}>
                                {player.name}{player.age ? ` (${player.age} years old)` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Team 2 Players */}
                      <div className="space-y-2 min-w-0">
                        <label className="label">
                          <span className="label-text font-medium text-sm break-words">
                            {editingMatch.team2Name} Players
                          </span>
                        </label>
                        
                        <select
                          name="player1Team2"
                          className="select select-bordered w-full select-sm"
                          value={editForm.player1Team2}
                          onChange={handleEditFormChange}
                        >
                          <option value="">Select player 1</option>
                          {getTeamPlayers(editingMatch.team2).map((player) => (
                            <option key={player.id} value={player.name}>
                              {player.name}{player.age ? ` (${player.age} years old)` : ''}
                            </option>
                          ))}
                        </select>
                        
                        {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                          <select
                            name="player2Team2"
                            className="select select-bordered w-full select-sm"
                            value={editForm.player2Team2}
                            onChange={handleEditFormChange}
                          >
                            <option value="">Select player 2</option>
                            {getTeamPlayers(editingMatch.team2).map((player) => (
                              <option key={player.id} value={player.name}>
                                {player.name}{player.age ? ` (${player.age} years old)` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Team admin only sees their own team
                    <div className="max-w-md">
                      {getTeamAdminTeam(editingMatch) === 'team1' && (
                        <div className="space-y-2 min-w-0">
                          <label className="label">
                            <span className="label-text font-medium text-sm break-words">
                              {editingMatch.team1Name} Players (Your Team)
                            </span>
                          </label>
                          
                          <select
                            name="player1Team1"
                            className={`select select-bordered w-full select-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                            value={editForm.player1Team1}
                            onChange={handleEditFormChange}
                            disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                          >
                            <option value="">Select player 1</option>
                            {getFilteredPlayers(editingMatch.team1, 'player1', editingMatch).map((player) => {
                              const isOverLimit = isTeamAdmin() && !canAssignPlayer(player.name, editingMatch.team1, editingMatch.matchType, editingMatch.id) && editForm.player1Team1 !== player.name;
                              const matchCount = getPlayerMatchCount(player.name, editingMatch.team1);
                              return (
                                <option
                                  key={player.id}
                                  value={player.name}
                                  style={isOverLimit ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                                  disabled={isOverLimit}
                                >
                                  {player.name}{player.age ? ` (${player.age} years old)` : ''}{isTeamAdmin() && matchCount > 0 ? ` - ${matchCount}/2 matches` : ''}
                                </option>
                              );
                            })}
                          </select>
                          
                          {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                            <select
                              name="player2Team1"
                              className={`select select-bordered w-full select-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                              value={editForm.player2Team1}
                              onChange={handleEditFormChange}
                              disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                            >
                              <option value="">Select player 2</option>
                              {getFilteredPlayers(editingMatch.team1, 'player2', editingMatch).map((player) => {
                                const isOverLimit = isTeamAdmin() && !canAssignPlayer(player.name, editingMatch.team1, editingMatch.matchType, editingMatch.id) && editForm.player2Team1 !== player.name;
                                const matchCount = getPlayerMatchCount(player.name, editingMatch.team1);
                                return (
                                  <option
                                    key={player.id}
                                    value={player.name}
                                    style={isOverLimit ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                                    disabled={isOverLimit}
                                  >
                                    {player.name}{player.age ? ` (${player.age} years old)` : ''}{isTeamAdmin() && matchCount > 0 ? ` - ${matchCount}/2 matches` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      )}
                      
                      {getTeamAdminTeam(editingMatch) === 'team2' && (
                        <div className="space-y-2 min-w-0">
                          <label className="label">
                            <span className="label-text font-medium text-sm break-words">
                              {editingMatch.team2Name} Players (Your Team)
                            </span>
                          </label>
                          
                          <select
                            name="player1Team2"
                            className={`select select-bordered w-full select-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                            value={editForm.player1Team2}
                            onChange={handleEditFormChange}
                            disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                          >
                            <option value="">Select player 1</option>
                            {getFilteredPlayers(editingMatch.team2, 'player1', editingMatch).map((player) => {
                              const isOverLimit = isTeamAdmin() && !canAssignPlayer(player.name, editingMatch.team2, editingMatch.matchType, editingMatch.id) && editForm.player1Team2 !== player.name;
                              const matchCount = getPlayerMatchCount(player.name, editingMatch.team2);
                              return (
                                <option
                                  key={player.id}
                                  value={player.name}
                                  style={isOverLimit ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                                  disabled={isOverLimit}
                                >
                                  {player.name}{player.age ? ` (${player.age} years old)` : ''}{isTeamAdmin() && matchCount > 0 ? ` - ${matchCount}/2 matches` : ''}
                                </option>
                              );
                            })}
                          </select>
                          
                          {getAvailableCategories().find(cat => cat.key === editingMatch.matchType)?.type === 'doubles' && (
                            <select
                              name="player2Team2"
                              className={`select select-bordered w-full select-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                              value={editForm.player2Team2}
                              onChange={handleEditFormChange}
                              disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                            >
                              <option value="">Select player 2</option>
                              {getFilteredPlayers(editingMatch.team2, 'player2', editingMatch).map((player) => {
                                const isOverLimit = isTeamAdmin() && !canAssignPlayer(player.name, editingMatch.team2, editingMatch.matchType, editingMatch.id) && editForm.player2Team2 !== player.name;
                                const matchCount = getPlayerMatchCount(player.name, editingMatch.team2);
                                return (
                                  <option
                                    key={player.id}
                                    value={player.name}
                                    style={isOverLimit ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                                    disabled={isOverLimit}
                                  >
                                    {player.name}{player.age ? ` (${player.age} years old)` : ''}{isTeamAdmin() && matchCount > 0 ? ` - ${matchCount}/2 matches` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-action flex-col sm:flex-row gap-2 sm:gap-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full">
                    {isSuperAdmin() && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm sm:btn-md w-full sm:w-auto sm:mr-auto"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete Match
                      </button>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingMatch(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`btn btn-primary btn-sm sm:btn-md w-full sm:w-auto ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'btn-disabled' : ''}`}
                        disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                      >
                        Update Match
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && editingMatch && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Confirm Delete</h3>
              <p className="mb-6">
                Are you sure you want to delete this match? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  className="btn btn-outline btn-sm sm:btn-md flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error btn-sm sm:btn-md flex-1"
                  onClick={handleDeleteMatch}
                >
                  Delete Match
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dream Breaker Match Modal */}
        {showDreamBreakerModal && fixtureInfo && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">Create Dream Breaker Match</h3>
              <p className="text-sm text-base-content/70 mb-6">
                Select at least 6 players from each team to create a Dream Breaker match.
              </p>
              
              <form onSubmit={handleCreateDreamBreakerMatch} className="space-y-6">
                {/* Match Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Date *</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="input input-bordered w-full"
                      value={dreamBreakerForm.date}
                      onChange={handleDreamBreakerFormChange}
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Time</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      className="input input-bordered w-full"
                      value={dreamBreakerForm.time}
                      onChange={handleDreamBreakerFormChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Pool</span>
                    </label>
                    <input
                      type="text"
                      name="pool"
                      placeholder="Pool name"
                      className="input input-bordered w-full"
                      value={dreamBreakerForm.pool}
                      onChange={handleDreamBreakerFormChange}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Court</span>
                    </label>
                    <input
                      type="text"
                      name="court"
                      placeholder="Court number"
                      className="input input-bordered w-full"
                      value={dreamBreakerForm.court}
                      onChange={handleDreamBreakerFormChange}
                    />
                  </div>
                </div>

                {/* YouTube Link */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">YouTube Live Link</span>
                  </label>
                  <input
                    type="url"
                    name="youtubeLink"
                    placeholder="https://youtube.com/watch?v=..."
                    className="input input-bordered w-full"
                    value={dreamBreakerForm.youtubeLink}
                    onChange={handleDreamBreakerFormChange}
                  />
                </div>

                {/* Player Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team 1 Players */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{fixtureInfo.team1Name}</h4>
                      <span className="badge badge-primary">
                        {dreamBreakerForm.team1Players.length} selected
                      </span>
                    </div>
                    <div className="border border-base-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                      {getTeamPlayers(fixtureInfo.team1).map((player) => (
                        <label key={player.id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={dreamBreakerForm.team1Players.some(p => p.id === player.id)}
                            onChange={() => handlePlayerSelection(1, player.id, player.name)}
                          />
                          <span className="flex-1">{player.name}{player.age ? ` (${player.age} years old)` : ''}</span>
                        </label>
                      ))}
                      {getTeamPlayers(fixtureInfo.team1).length === 0 && (
                        <p className="text-center text-base-content/50 py-4">No players found for this team</p>
                      )}
                    </div>
                    {dreamBreakerForm.team1Players.length < 6 && (
                      <p className="text-error text-sm">Select at least 6 players</p>
                    )}
                  </div>

                  {/* Team 2 Players */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{fixtureInfo.team2Name}</h4>
                      <span className="badge badge-secondary">
                        {dreamBreakerForm.team2Players.length} selected
                      </span>
                    </div>
                    <div className="border border-base-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                      {getTeamPlayers(fixtureInfo.team2).map((player) => (
                        <label key={player.id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-secondary"
                            checked={dreamBreakerForm.team2Players.some(p => p.id === player.id)}
                            onChange={() => handlePlayerSelection(2, player.id, player.name)}
                          />
                          <span className="flex-1">{player.name}{player.age ? ` (${player.age} years old)` : ''}</span>
                        </label>
                      ))}
                      {getTeamPlayers(fixtureInfo.team2).length === 0 && (
                        <p className="text-center text-base-content/50 py-4">No players found for this team</p>
                      )}
                    </div>
                    {dreamBreakerForm.team2Players.length < 6 && (
                      <p className="text-error text-sm">Select at least 6 players</p>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowDreamBreakerModal(false)}
                    disabled={isCreatingDreamBreaker}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreatingDreamBreaker || dreamBreakerForm.team1Players.length < 6 || dreamBreakerForm.team2Players.length < 6}
                  >
                    {isCreatingDreamBreaker ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Creating...
                      </>
                    ) : (
                      'Create Dream Breaker Match'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}