
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
    youtubeLink: '',
    // Game Breaker player order (8 players for each team)
    gameBreakerPlayersTeam1: ['', '', '', '', '', '', '', ''],
    gameBreakerPlayersTeam2: ['', '', '', '', '', '', '', '']
  });

  // Player filtration state
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('');

  // Game Breaker match state
  const [showDreamBreakerModal, setShowDreamBreakerModal] = useState(false);
  const [editingDreamBreakerMatch, setEditingDreamBreakerMatch] = useState(null);
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
        let matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter matches for team admins - only show matches where their team is involved
        if (isTeamAdmin() && currentUser) {
          // Find the team admin's team
          const adminTeam = teamsData.find(team => {
            return team.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
                   team.adminUid === currentUser.uid ||
                   (currentUser.teamName && team.name?.toLowerCase() === currentUser.teamName?.toLowerCase());
          });
          
          if (adminTeam) {
            // Filter matches to only show those where the admin's team is involved
            matchesData = matchesData.filter(match =>
              match.team1 === adminTeam.id || match.team2 === adminTeam.id
            );
          }
        }
        
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

  // Get player match count across all matches in the fixture group (excluding current match being edited)
  const getPlayerMatchCount = (playerName, teamId, excludeMatchId = null) => {
    if (!playerName) return 0;
    
    let count = 0;
    matches.forEach(match => {
      // Skip the current match being edited
      if (excludeMatchId && match.id === excludeMatchId) {
        return;
      }
      
      // Only count matches for the same team
      if (match.team1 === teamId) {
        if (match.player1Team1 === playerName || match.player2Team1 === playerName) {
          count++;
        }
      } else if (match.team2 === teamId) {
        if (match.player1Team2 === playerName || match.player2Team2 === playerName) {
          count++;
        }
      }
    });
    
    return count;
  };

  // Check if player is already playing in a match of the same category
  const isPlayerInSameCategory = (playerName, teamId, currentMatchType, currentMatchId) => {
    if (!playerName) return false;
    
    return matches.some(match => {
      // Skip the current match being edited
      if (match.id === currentMatchId) return false;
      
      // Check if it's the same match type category
      const isSameCategory = match.matchType === currentMatchType ||
                            match.matchTypeLabel === currentMatchType;
      
      if (!isSameCategory) return false;
      
      // Check if player is assigned to this match for the same team
      if (match.team1 === teamId) {
        return match.player1Team1 === playerName || match.player2Team1 === playerName;
      } else if (match.team2 === teamId) {
        return match.player1Team2 === playerName || match.player2Team2 === playerName;
      }
      
      return false;
    });
  };

  // Get enhanced player info with availability status
  const getPlayersWithAvailability = (playersList, teamSide, playerPosition, currentMatch) => {
    if (!currentMatch) return playersList.map(p => ({ ...p, available: true, reason: '' }));
    
    const matchType = currentMatch.matchType;
    const matchTypeLabel = currentMatch.matchTypeLabel || '';
    const teamId = teamSide === 'team1' ? currentMatch.team1 : currentMatch.team2;
    
    return playersList.map(player => {
      let available = true;
      let reason = '';
      
      // Search term filter
      if (playerSearchTerm && !player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())) {
        available = false;
        reason = 'Does not match search';
      }
      
      // Age filter
      if (available && selectedAgeFilter) {
        if (selectedAgeFilter === 'under18' && player.age >= 18) {
          available = false;
          reason = 'Age filter';
        }
        if (selectedAgeFilter === '18-25' && (player.age < 18 || player.age > 25)) {
          available = false;
          reason = 'Age filter';
        }
        if (selectedAgeFilter === '26-35' && (player.age < 26 || player.age > 35)) {
          available = false;
          reason = 'Age filter';
        }
        if (selectedAgeFilter === 'over35' && player.age <= 35) {
          available = false;
          reason = 'Age filter';
        }
      }
      
      // Gender filter
      if (available && selectedGenderFilter && player.gender !== selectedGenderFilter) {
        available = false;
        reason = 'Gender filter';
      }
      
      // Rule 1: One player can't play more than 2 matches (excluding current match being edited)
      const currentPlayerCount = getPlayerMatchCount(player.name, teamId, currentMatch.id);
      if (available && currentPlayerCount >= 2) {
        available = false;
        reason = 'Already in 2 matches';
      }
      
      // Rule 2: Gender-specific matches
      const isWomensMatch = matchTypeLabel.toLowerCase().includes('women') ||
                           matchTypeLabel.toLowerCase().includes('ladies');
      const isMensMatch = matchTypeLabel.toLowerCase().includes('men') &&
                         !matchTypeLabel.toLowerCase().includes('women');
      
      if (available && isWomensMatch && player.gender !== 'Female') {
        available = false;
        reason = 'Women only match';
      }
      
      if (available && isMensMatch && player.gender !== 'Male') {
        available = false;
        reason = 'Men only match';
      }
      
      // Rule 3: Mixed doubles logic
      const isMixedDoubles = matchTypeLabel.toLowerCase().includes('mixed');
      if (available && isMixedDoubles) {
        const otherPlayerName = teamSide === 'team1'
          ? (playerPosition === 'player1' ? editForm.player2Team1 : editForm.player1Team1)
          : (playerPosition === 'player1' ? editForm.player2Team2 : editForm.player1Team2);
        
        if (otherPlayerName) {
          // Find the other player's gender
          const otherPlayer = playersList.find(p => p.name === otherPlayerName);
          if (otherPlayer && otherPlayer.gender === player.gender) {
            available = false;
            reason = 'Mixed doubles requires opposite gender';
          }
        }
      }
      
      // Rule 4: Player can't play in another match of the same category
      if (available && isPlayerInSameCategory(player.name, teamId, matchType, currentMatch.id)) {
        available = false;
        reason = 'Already in same category match';
      }
      
      // Rule 5: In doubles, same player can't be selected in both positions
      if (available) {
        const otherPlayerName = teamSide === 'team1'
          ? (playerPosition === 'player1' ? editForm.player2Team1 : editForm.player1Team1)
          : (playerPosition === 'player1' ? editForm.player2Team2 : editForm.player1Team2);
        
        if (otherPlayerName === player.name) {
          available = false;
          reason = 'Already selected in other position';
        }
      }
      
      return {
        ...player,
        available,
        reason
      };
    });
  };

  // Filter players based on business rules (for backward compatibility)
  const filterPlayers = (playersList, teamSide, playerPosition, currentMatch) => {
    return getPlayersWithAvailability(playersList, teamSide, playerPosition, currentMatch)
      .filter(player => player.available);
  };

  // Get unique age ranges from players
  const getAgeRanges = (playersList) => {
    const ranges = [];
    const hasUnder18 = playersList.some(p => p.age < 18);
    const has18to25 = playersList.some(p => p.age >= 18 && p.age <= 25);
    const has26to35 = playersList.some(p => p.age >= 26 && p.age <= 35);
    const hasOver35 = playersList.some(p => p.age > 35);
    
    if (hasUnder18) ranges.push({ value: 'under18', label: 'Under 18' });
    if (has18to25) ranges.push({ value: '18-25', label: '18-25' });
    if (has26to35) ranges.push({ value: '26-35', label: '26-35' });
    if (hasOver35) ranges.push({ value: 'over35', label: 'Over 35' });
    
    return ranges;
  };

  // Get unique genders from players
  const getGenders = (playersList) => {
    const genders = [...new Set(playersList.map(p => p.gender).filter(Boolean))];
    return genders.map(gender => ({ value: gender, label: gender }));
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
      youtubeLink: match.youtubeLink || '',
      // Game Breaker player order (8 players for each team)
      gameBreakerPlayersTeam1: match.gameBreakerPlayersTeam1 || ['', '', '', '', '', '', '', ''],
      gameBreakerPlayersTeam2: match.gameBreakerPlayersTeam2 || ['', '', '', '', '', '', '', '']
    });
    setShowEditModal(true);
  };

  // Helper function to determine if team admin belongs to team1 or team2
  const getTeamAdminTeam = (match) => {
    if (!isTeamAdmin() || !currentUser) return null;
    
    // Find the team admin's team by checking teams data
    const adminTeam = teams.find(team => {
      return team.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
             team.adminUid === currentUser.uid ||
             (currentUser.teamName && team.name?.toLowerCase() === currentUser.teamName?.toLowerCase());
    });
    
    if (!adminTeam) return null;
    
    if (match.team1 === adminTeam.id) return 'team1';
    if (match.team2 === adminTeam.id) return 'team2';
    return null;
  };

  // Helper function to get current team admin's team ID
  const getCurrentTeamAdminTeamId = () => {
    if (!isTeamAdmin() || !currentUser) return null;
    
    const adminTeam = teams.find(team => {
      return team.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
             team.adminUid === currentUser.uid ||
             (currentUser.teamName && team.name?.toLowerCase() === currentUser.teamName?.toLowerCase());
    });
    
    return adminTeam?.id || null;
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
        // Game Breaker specific fields
        ...(editingMatch.matchType === 'dreamBreaker' && {
          gameBreakerPlayersTeam1: editForm.gameBreakerPlayersTeam1,
          gameBreakerPlayersTeam2: editForm.gameBreakerPlayersTeam2
        }),
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

  const handleResetMatch = async (match) => {
    try {
      const resetData = {
        player1Team1: '',
        player2Team1: '',
        player1Team2: '',
        player2Team2: '',
        // Reset all umpire/scoring data to force setup again
        status: 'scheduled',
        team1Score: 0,
        team2Score: 0,
        currentSet: 1,
        sets: [],
        gameScores: {},
        isCompleted: false,
        winner: null,
        startTime: null,
        endTime: null,
        // Reset umpire setup state
        umpireSetupComplete: false,
        matchStarted: false,
        currentGame: 1,
        servingTeam: null,
        servingPlayer: null,
        // Clear any match configuration
        bestOf: null,
        pointsToWin: null,
        winByTwo: null,
        // Clear any timeout data
        timeouts: {},
        // Clear any other scoring state
        rallies: [],
        points: [],
        history: [],
        // Reset any streaming/display state
        displayState: null,
        streamingActive: false,
        // Reset winner and scoring data added by our implementation
        scores: null,
        gamesCount: null,
        pointsPerGame: null,
        winnerName: null,
        winnerTeam: null,
        finalScore: null,
        gamesWon: null,
        completedAt: null,
        endedAt: null,
        serveSequence: null,
        teamServeCount: null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'fixtures', match.id), resetData);
      
      // Update local state
      setMatches(prev => prev.map(m =>
        m.id === match.id
          ? { ...m, ...resetData }
          : m
      ));
      
      setError('');
    } catch (error) {
      console.error('Error resetting match:', error);
      setError('Failed to reset match');
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
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:max-w-6xl overflow-hidden">
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
          </div>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 break-words leading-tight">Fixture Matches</h1>
          {fixtureInfo && (
            <div className="flex flex-col gap-2 text-sm sm:text-base lg:text-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
                  <span className="text-primary font-bold break-words truncate max-w-[120px] sm:max-w-none" title={fixtureInfo.team1Name}>
                    {fixtureInfo.team1Name}
                  </span>
                  <span className="text-base-content/60 flex-shrink-0">VS</span>
                  <span className="text-secondary font-bold break-words truncate max-w-[120px] sm:max-w-none" title={fixtureInfo.team2Name}>
                    {fixtureInfo.team2Name}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <span className="text-base-content/60 hidden sm:inline">•</span>
                  <span className="text-base-content/70 break-words text-xs sm:text-sm lg:text-base">
                    {fixtureInfo.date && fixtureInfo.date.toDate ? fixtureInfo.date.toDate().toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'Invalid Date'}
                  </span>
                </div>
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
            <div key={match.id} className={`card bg-base-100 shadow-lg overflow-hidden ${
              match.matchType === 'dreamBreaker' && match.matchNumber === 7
                ? 'border-2 border-dashed border-warning'
                : ''
            }`}>
              <div className="card-body p-3 sm:p-4 lg:p-6">
                {/* Match Header */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                      <div className="text-sm sm:text-base lg:text-lg font-bold flex-shrink-0">Match {index + 1}</div>
                      <div className="badge badge-primary badge-xs sm:badge-sm lg:badge-md break-words max-w-[150px] sm:max-w-none truncate" title={match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}>
                        {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                      </div>
                      {match.time && (
                        <div className="text-sm sm:text-base lg:text-lg font-bold flex-shrink-0">{match.time}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0 flex-wrap">
                      {/* Live Video Icon */}
                      {match.youtubeLink && (
                        <div className="tooltip" data-tip="Live Stream Available">
                          <a
                            href={match.youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-base-300 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-content transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        </div>
                      )}
                      
                      {/* Super Admin Action Buttons */}
                      {isSuperAdmin() && (
                        <>
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm"
                            onClick={() => {
                              const tvUrl = `${window.location.origin}/tv/${match.id}`;
                              window.open(tvUrl, '_blank');
                            }}
                            title="TV Display"
                          >
                            <span className="text-lg">📺</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm"
                            onClick={() => {
                              const umpireUrl = `${window.location.origin}/umpire/${match.id}`;
                              window.open(umpireUrl, '_blank');
                            }}
                            title="Umpire"
                          >
                            <span className="text-lg">⚖️</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm"
                            onClick={() => {
                              const basicScoreUrl = `${window.location.origin}/basic-score/${match.id}`;
                              window.open(basicScoreUrl, '_blank');
                            }}
                            title="Basic Score"
                          >
                            <span className="text-lg">📊</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm text-warning"
                            onClick={() => handleResetMatch(match)}
                            title="Reset Teams & Players"
                          >
                            <span className="hidden sm:inline">Reset</span>
                            <span className="sm:hidden text-lg">🔄</span>
                          </button>
                        </>
                      )}
                      
                      {/* Edit Button */}
                      {(isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(match))) && (
                        <button
                          className={`btn btn-ghost btn-xs sm:btn-sm ${isTeamAdmin() && isDeadlinePassed(match) ? 'btn-disabled opacity-50' : ''}`}
                          onClick={() => handleEditMatch(match)}
                          title={isTeamAdmin() && isDeadlinePassed(match) ? "Deadline passed - cannot edit" : "Edit match"}
                          disabled={isTeamAdmin() && isDeadlinePassed(match)}
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">✏️</span>
                        </button>
                      )}
                    </div>
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
                  <div className={`flex-1 min-w-0 ${match.status === 'completed' && match.winner === 'player1' ? 'bg-success/10 p-2 rounded-lg border border-success/20' : ''}`}>
                    <div className={`text-base sm:text-lg lg:text-xl font-bold break-words mb-1 truncate flex items-center gap-2 ${match.status === 'completed' && match.winner === 'player1' ? 'text-success' : ''}`} title={match.team1Name}>
                      {match.team1Name}
                      {match.status === 'completed' && match.winner === 'player1' && (
                        <span className="text-success text-lg">🏆</span>
                      )}
                    </div>
                    {/* Show Team 1 players only if super admin OR team admin belongs to team 1 */}
                    {(isSuperAdmin() || getTeamAdminTeam(match) === 'team1') && (
                      <>
                        {/* Regular match players */}
                        {match.matchType !== 'dreamBreaker' && (match.player1Team1 || match.player2Team1) && (
                          <div className="text-sm space-y-0.5">
                            {match.player1Team1 && (
                              <div className="flex items-center gap-2">
                                <span>{match.player1Team1}</span>
                              </div>
                            )}
                            {match.player2Team1 && (
                              <div className="flex items-center gap-2">
                                <span>{match.player2Team1}</span>
                              </div>
                            )}
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
                  
                  {/* VS or Winner Display */}
                  <div className="text-base sm:text-lg font-medium text-base-content/60 flex-shrink-0 self-start sm:self-center">
                    {match.status === 'completed' && match.winner && match.finalScore ? (
                      <div className="text-center">
                        <div className="text-xs text-base-content/50 mb-1">WINNER</div>
                        <div className="badge badge-success badge-lg font-bold text-white">
                          {match.winnerTeam}
                        </div>
                        <div className="text-sm font-bold text-success mt-1">
                          {match.finalScore}
                        </div>
                        {/* Show individual game scores */}
                        {match.scores && match.gamesCount && (
                          <div className="mt-2 text-xs">
                            <div className="flex gap-1 justify-center">
                              {Array.from({ length: match.gamesCount }, (_, i) => (
                                <span key={i} className="bg-base-200 px-1 py-0.5 rounded text-xs">
                                  {match.scores.player1?.[`game${i + 1}`] || 0}-{match.scores.player2?.[`game${i + 1}`] || 0}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      'VS'
                    )}
                  </div>
                  
                  {/* Team 2 */}
                  <div className={`flex-1 min-w-0 sm:text-right ${match.status === 'completed' && match.winner === 'player2' ? 'bg-success/10 p-2 rounded-lg border border-success/20' : ''}`}>
                    <div className={`text-base sm:text-lg lg:text-xl font-bold break-words mb-1 truncate flex items-center gap-2 justify-end ${match.status === 'completed' && match.winner === 'player2' ? 'text-success' : ''}`} title={match.team2Name}>
                      {match.status === 'completed' && match.winner === 'player2' && (
                        <span className="text-success text-lg">🏆</span>
                      )}
                      {match.team2Name}
                    </div>
                    {/* Show Team 2 players only if super admin OR team admin belongs to team 2 */}
                    {(isSuperAdmin() || getTeamAdminTeam(match) === 'team2') && (
                      <>
                        {/* Regular match players */}
                        {match.matchType !== 'dreamBreaker' && (match.player1Team2 || match.player2Team2) && (
                          <div className="text-sm space-y-0.5">
                            {match.player1Team2 && (
                              <div className="flex items-center gap-2 justify-end">
                                <span>{match.player1Team2}</span>
                              </div>
                            )}
                            {match.player2Team2 && (
                              <div className="flex items-center gap-2 justify-end">
                                <span>{match.player2Team2}</span>
                              </div>
                            )}
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
                
                {/* Show message if no players assigned - Regular matches */}
                {match.matchType !== 'dreamBreaker' && (
                  <div className="border-t border-base-300 mt-4 pt-4">
                    {isTeamAdmin() && getTeamAdminTeam(match) ? (
                      // Team admin interface for regular matches
                      <div className="text-center">
                        {/* Check if current team admin has assigned their players */}
                        {(() => {
                          const teamSide = getTeamAdminTeam(match);
                          const isSingles = match.matchType === 'singles' || match.matchTypeLabel?.toLowerCase().includes('singles');
                          
                          // Check if team admin has assigned their players
                          const hasAssignedPlayers = teamSide === 'team1'
                            ? (match.player1Team1 || (isSingles ? false : match.player2Team1))
                            : (match.player1Team2 || (isSingles ? false : match.player2Team2));
                          
                          if (!hasAssignedPlayers) {
                            return (
                              <div className="space-y-2">
                                <div className="text-sm text-base-content/70">
                                  {isSingles ? 'Pick your player for this match' : 'Pick your team for this match'}
                                </div>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setEditingMatch(match);
                                    // Reset filters when opening modal
                                    setPlayerSearchTerm('');
                                    setSelectedAgeFilter('');
                                    setSelectedGenderFilter('');
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
                                  }}
                                >
                                  {isSingles ? 'Pick Your Player' : 'Pick Your Team'}
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-sm text-success">
                                ✓ Your {isSingles ? 'player' : 'team'} has been selected
                                <button
                                  className="btn btn-outline btn-xs ml-2"
                                  onClick={() => {
                                    setEditingMatch(match);
                                    // Reset filters when opening modal
                                    setPlayerSearchTerm('');
                                    setSelectedAgeFilter('');
                                    setSelectedGenderFilter('');
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
                                  }}
                                >
                                  Edit {isSingles ? 'Player' : 'Team'}
                                </button>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      // For non-team admins or when no players assigned
                      !(match.player1Team1 || match.player1Team2 || match.player2Team1 || match.player2Team2) && (
                        <div className="text-center py-2 text-base-content/50 text-sm sm:text-base">
                          Players not assigned yet - Click Edit to assign players
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Show message if no players assigned - Dream Breaker matches */}
                {match.matchType === 'dreamBreaker' && (
                  <div className="border-t border-base-300 mt-4 pt-4">
                    {/* Game Breaker Information Note */}
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <div className="text-warning text-lg">⚡</div>
                        <div>
                          <h5 className="font-semibold text-sm mb-2">Game Breaker Match Information</h5>
                          <p className="text-xs text-base-content/80 leading-relaxed">
                            The fixture only gets activated if the battle goes to 3-3 after the end of 6 matches.
                            Pick your 8 players in order for game breaker match. We expect you to select this order before the deadline.
                          </p>
                          <p className="text-xs text-warning font-medium mt-2">
                            Note: 3rd and 5th positions are reserved for female players only.
                          </p>
                        </div>
                      </div>
                    </div>

                    {isTeamAdmin() && getTeamAdminTeam(match) ? (
                      // Team admin interface for Dream Breaker matches
                      <div className="text-center">
                        {/* Check if current team admin has assigned their players */}
                        {(() => {
                          const adminTeamSide = getTeamAdminTeam(match);
                          // For Game Breaker, check if gameBreakerPlayers arrays have any assignments
                          const gameBreakerPlayers = adminTeamSide === 'team1'
                            ? (match.gameBreakerPlayersTeam1 || [])
                            : (match.gameBreakerPlayersTeam2 || []);
                          const hasAssignedPlayers = gameBreakerPlayers.some(player => player && player.trim() !== '');
                          
                          if (!hasAssignedPlayers) {
                            return (
                              <div className="space-y-2">
                                <div className="text-sm text-base-content/70">
                                  Pick your 8 players in order for this Game Breaker match
                                </div>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setEditingMatch(match);
                                    // Reset filters when opening modal
                                    setPlayerSearchTerm('');
                                    setSelectedAgeFilter('');
                                    setSelectedGenderFilter('');
                                    setEditForm({
                                      date: match.date && match.date.toDate ? match.date.toDate().toISOString().split('T')[0] : '',
                                      time: match.time || '',
                                      pool: match.pool || '',
                                      court: match.court || '',
                                      player1Team1: match.player1Team1 || '',
                                      player2Team1: match.player2Team1 || '',
                                      player1Team2: match.player1Team2 || '',
                                      player2Team2: match.player2Team2 || '',
                                      youtubeLink: match.youtubeLink || '',
                                      gameBreakerPlayersTeam1: match.gameBreakerPlayersTeam1 || ['', '', '', '', '', '', '', ''],
                                      gameBreakerPlayersTeam2: match.gameBreakerPlayersTeam2 || ['', '', '', '', '', '', '', '']
                                    });
                                    setShowEditModal(true);
                                  }}
                                >
                                  Pick Your 8 Players
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-sm text-success">
                                ✓ Your 8 players have been selected for this Game Breaker match
                                <button
                                  className="btn btn-outline btn-xs ml-2"
                                  onClick={() => {
                                    setEditingMatch(match);
                                    // Reset filters when opening modal
                                    setPlayerSearchTerm('');
                                    setSelectedAgeFilter('');
                                    setSelectedGenderFilter('');
                                    setEditForm({
                                      date: match.date && match.date.toDate ? match.date.toDate().toISOString().split('T')[0] : '',
                                      time: match.time || '',
                                      pool: match.pool || '',
                                      court: match.court || '',
                                      player1Team1: match.player1Team1 || '',
                                      player2Team1: match.player2Team1 || '',
                                      player1Team2: match.player1Team2 || '',
                                      player2Team2: match.player2Team2 || '',
                                      youtubeLink: match.youtubeLink || '',
                                      gameBreakerPlayersTeam1: match.gameBreakerPlayersTeam1 || ['', '', '', '', '', '', '', ''],
                                      gameBreakerPlayersTeam2: match.gameBreakerPlayersTeam2 || ['', '', '', '', '', '', '', '']
                                    });
                                    setShowEditModal(true);
                                  }}
                                >
                                  Edit Player Order
                                </button>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      // For non-team admins or when no players assigned
                      !(match.gameBreakerPlayersTeam1?.some(player => player && player.trim() !== '') ||
                        match.gameBreakerPlayersTeam2?.some(player => player && player.trim() !== '')) && (
                        <div className="text-center py-2 text-base-content/50 text-sm sm:text-base">
                          8 players not assigned yet - Click Edit to assign player order
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Match Modal */}
        {showEditModal && editingMatch && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 break-words">
                Edit Match - {editingMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : editingMatch.matchTypeLabel}
              </h3>
              
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

                {/* Player Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm sm:text-base">Player Assignment</h4>
                  
                  {(isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(editingMatch) === 'team1')) && (
                    <div className="space-y-2 min-w-0">
                      <label className="label">
                        <span className="label-text font-medium text-sm break-words">
                          {editingMatch.team1Name} {(() => {
                            const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                            return isSingles ? 'Player' : 'Players';
                          })()} {isTeamAdmin() ? '(Your Team)' : ''}
                        </span>
                      </label>
                      
                      <select
                        name="player1Team1"
                        className={`select select-bordered w-full select-sm text-xs sm:text-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                        value={editForm.player1Team1}
                        onChange={handleEditFormChange}
                        disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                      >
                        <option value="">{(() => {
                          const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                          return isSingles ? 'Select player' : 'Select player 1';
                        })()}</option>
                        {getPlayersWithAvailability(getTeamPlayers(editingMatch.team1), 'team1', 'player1', editingMatch).map((player) => (
                          <option
                            key={player.id}
                            value={player.available ? player.name : ''}
                            disabled={!player.available}
                            className={`text-xs sm:text-sm ${!player.available ? 'text-gray-400 bg-gray-100' : ''}`}
                            title={!player.available ? player.reason : ''}
                          >
                            {player.name}{player.age ? ` (${player.age}y)` : ''}{player.gender ? ` - ${player.gender}` : ''}{!player.available ? ` (${player.reason})` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {/* Only show second player selection for doubles matches */}
                      {(() => {
                        const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                        return !isSingles && (
                          <select
                            name="player2Team1"
                            className={`select select-bordered w-full select-sm text-xs sm:text-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                            value={editForm.player2Team1}
                            onChange={handleEditFormChange}
                            disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                          >
                            <option value="">Select player 2</option>
                            {getPlayersWithAvailability(getTeamPlayers(editingMatch.team1), 'team1', 'player2', editingMatch).map((player) => (
                              <option
                                key={player.id}
                                value={player.available ? player.name : ''}
                                disabled={!player.available}
                                className={`text-xs sm:text-sm ${!player.available ? 'text-gray-400 bg-gray-100' : ''}`}
                                title={!player.available ? player.reason : ''}
                              >
                                {player.name}{player.age ? ` (${player.age}y)` : ''}{player.gender ? ` - ${player.gender}` : ''}{!player.available ? ` (${player.reason})` : ''}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  )}
                  
                  {(isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(editingMatch) === 'team2')) && (
                    <div className="space-y-2 min-w-0">
                      <label className="label">
                        <span className="label-text font-medium text-sm break-words">
                          {editingMatch.team2Name} {(() => {
                            const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                            return isSingles ? 'Player' : 'Players';
                          })()} {isTeamAdmin() ? '(Your Team)' : ''}
                        </span>
                      </label>
                      
                      <select
                        name="player1Team2"
                        className={`select select-bordered w-full select-sm text-xs sm:text-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                        value={editForm.player1Team2}
                        onChange={handleEditFormChange}
                        disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                      >
                        <option value="">{(() => {
                          const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                          return isSingles ? 'Select player' : 'Select player 1';
                        })()}</option>
                        {getPlayersWithAvailability(getTeamPlayers(editingMatch.team2), 'team2', 'player1', editingMatch).map((player) => (
                          <option
                            key={player.id}
                            value={player.available ? player.name : ''}
                            disabled={!player.available}
                            className={`text-xs sm:text-sm ${!player.available ? 'text-gray-400 bg-gray-100' : ''}`}
                            title={!player.available ? player.reason : ''}
                          >
                            {player.name}{player.age ? ` (${player.age}y)` : ''}{player.gender ? ` - ${player.gender}` : ''}{!player.available ? ` (${player.reason})` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {/* Only show second player selection for doubles matches */}
                      {(() => {
                        const isSingles = editingMatch.matchType === 'singles' || editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                        return !isSingles && (
                          <select
                            name="player2Team2"
                            className={`select select-bordered w-full select-sm text-xs sm:text-sm ${isTeamAdmin() && isDeadlinePassed(editingMatch) ? 'select-disabled bg-base-200' : ''}`}
                            value={editForm.player2Team2}
                            onChange={handleEditFormChange}
                            disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                          >
                            <option value="">Select player 2</option>
                            {getPlayersWithAvailability(getTeamPlayers(editingMatch.team2), 'team2', 'player2', editingMatch).map((player) => (
                              <option
                                key={player.id}
                                value={player.available ? player.name : ''}
                                disabled={!player.available}
                                className={`text-xs sm:text-sm ${!player.available ? 'text-gray-400 bg-gray-100' : ''}`}
                                title={!player.available ? player.reason : ''}
                              >
                                {player.name}{player.age ? ` (${player.age}y)` : ''}{player.gender ? ` - ${player.gender}` : ''}{!player.available ? ` (${player.reason})` : ''}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  )}

                  {/* Game Breaker Player Selection */}
                  {editingMatch && editingMatch.matchType === 'dreamBreaker' && (isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(editingMatch))) && (
                    <div className="space-y-6 mt-6">
                      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                        <h5 className="font-semibold text-sm mb-2">Game Breaker Player Order</h5>
                        <p className="text-xs text-base-content/80 mb-2">
                          Click on players to add them to the playing order. Positions 3 and 5 are reserved for female players only.
                        </p>
                      </div>

                      {/* Team 1 Game Breaker Selection */}
                      {(isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(editingMatch) === 'team1')) && (
                        <div className="space-y-4">
                          <h6 className="font-semibold text-base text-primary">
                            {editingMatch.team1Name} - Game Breaker Order
                          </h6>
                          
                          {/* Selected Players Order - Team 1 */}
                          {editForm.gameBreakerPlayersTeam1.some(player => player) && (
                            <div className="bg-base-200 rounded-lg p-4">
                              <h6 className="font-medium text-sm mb-3">Selected Playing Order:</h6>
                              <div className="space-y-2">
                                {editForm.gameBreakerPlayersTeam1.map((playerName, index) => (
                                  playerName && (
                                    <div key={index} className="flex items-center justify-between bg-base-100 rounded p-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`badge badge-sm ${index === 2 || index === 4 ? 'badge-pink-500' : 'badge-primary'}`}>
                                          {index + 1}
                                        </span>
                                        <span className="text-sm font-medium">{playerName}</span>
                                        {(index === 2 || index === 4) && (
                                          <span className="text-xs text-pink-600">(Female)</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-error"
                                        onClick={() => {
                                          const newPlayers = [...editForm.gameBreakerPlayersTeam1];
                                          newPlayers[index] = '';
                                          // Shift remaining players up
                                          for (let i = index; i < newPlayers.length - 1; i++) {
                                            newPlayers[i] = newPlayers[i + 1];
                                          }
                                          newPlayers[newPlayers.length - 1] = '';
                                          setEditForm(prev => ({
                                            ...prev,
                                            gameBreakerPlayersTeam1: newPlayers
                                          }));
                                        }}
                                        disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Available Players - Team 1 */}
                          <div>
                            <h6 className="font-medium text-sm mb-3">Available {editingMatch.team1Name} Players (Click to add):</h6>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {(() => {
                                const teamPlayers = getTeamPlayers(editingMatch.team1);
                                const selectedCount = editForm.gameBreakerPlayersTeam1.filter(p => p).length;
                                const nextPosition = selectedCount + 1;
                                const isNextPositionFemale = nextPosition === 3 || nextPosition === 5;
                                
                                return teamPlayers
                                  .filter(player => {
                                    // Don't show already selected players
                                    if (editForm.gameBreakerPlayersTeam1.includes(player.name)) {
                                      return false;
                                    }
                                    
                                    // If next position requires female, only show females
                                    if (isNextPositionFemale && player.gender !== 'Female') {
                                      return false;
                                    }
                                    
                                    // Don't allow more than 8 players
                                    if (selectedCount >= 8) {
                                      return false;
                                    }
                                    
                                    return true;
                                  })
                                  .map((player) => (
                                    <button
                                      key={player.id}
                                      type="button"
                                      className={`btn btn-outline btn-sm text-left justify-start ${
                                        isNextPositionFemale ? 'border-pink-300 hover:border-pink-500' : ''
                                      }`}
                                      onClick={() => {
                                        const newPlayers = [...editForm.gameBreakerPlayersTeam1];
                                        const nextEmptyIndex = newPlayers.findIndex(p => !p);
                                        if (nextEmptyIndex !== -1) {
                                          newPlayers[nextEmptyIndex] = player.name;
                                          setEditForm(prev => ({
                                            ...prev,
                                            gameBreakerPlayersTeam1: newPlayers
                                          }));
                                        }
                                      }}
                                      disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                                    >
                                      <div className="text-left">
                                        <div className="font-medium text-xs">{player.name}</div>
                                        <div className="text-xs opacity-70">
                                          {player.age ? `${player.age}y` : ''} {player.gender ? `${player.gender}` : ''}
                                        </div>
                                      </div>
                                    </button>
                                  ));
                              })()}
                            </div>
                            
                            {/* Helper text - Team 1 */}
                            <div className="mt-3 text-xs text-base-content/60">
                              {(() => {
                                const selectedCount = editForm.gameBreakerPlayersTeam1.filter(p => p).length;
                                const nextPosition = selectedCount + 1;
                                const isNextPositionFemale = nextPosition === 3 || nextPosition === 5;
                                
                                if (selectedCount >= 8) {
                                  return "All 8 players selected!";
                                } else if (isNextPositionFemale) {
                                  return `Next: Position ${nextPosition} (Female Player Required)`;
                                } else {
                                  return `Next: Position ${nextPosition}`;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Team 2 Game Breaker Selection */}
                      {(isSuperAdmin() || (isTeamAdmin() && getTeamAdminTeam(editingMatch) === 'team2')) && (
                        <div className="space-y-4">
                          <h6 className="font-semibold text-base text-secondary">
                            {editingMatch.team2Name} - Game Breaker Order
                          </h6>
                          
                          {/* Selected Players Order - Team 2 */}
                          {editForm.gameBreakerPlayersTeam2.some(player => player) && (
                            <div className="bg-base-200 rounded-lg p-4">
                              <h6 className="font-medium text-sm mb-3">Selected Playing Order:</h6>
                              <div className="space-y-2">
                                {editForm.gameBreakerPlayersTeam2.map((playerName, index) => (
                                  playerName && (
                                    <div key={index} className="flex items-center justify-between bg-base-100 rounded p-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`badge badge-sm ${index === 2 || index === 4 ? 'badge-pink-500' : 'badge-secondary'}`}>
                                          {index + 1}
                                        </span>
                                        <span className="text-sm font-medium">{playerName}</span>
                                        {(index === 2 || index === 4) && (
                                          <span className="text-xs text-pink-600">(Female)</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-error"
                                        onClick={() => {
                                          const newPlayers = [...editForm.gameBreakerPlayersTeam2];
                                          newPlayers[index] = '';
                                          // Shift remaining players up
                                          for (let i = index; i < newPlayers.length - 1; i++) {
                                            newPlayers[i] = newPlayers[i + 1];
                                          }
                                          newPlayers[newPlayers.length - 1] = '';
                                          setEditForm(prev => ({
                                            ...prev,
                                            gameBreakerPlayersTeam2: newPlayers
                                          }));
                                        }}
                                        disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Available Players - Team 2 */}
                          <div>
                            <h6 className="font-medium text-sm mb-3">Available {editingMatch.team2Name} Players (Click to add):</h6>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {(() => {
                                const teamPlayers = getTeamPlayers(editingMatch.team2);
                                const selectedCount = editForm.gameBreakerPlayersTeam2.filter(p => p).length;
                                const nextPosition = selectedCount + 1;
                                const isNextPositionFemale = nextPosition === 3 || nextPosition === 5;
                                
                                return teamPlayers
                                  .filter(player => {
                                    // Don't show already selected players
                                    if (editForm.gameBreakerPlayersTeam2.includes(player.name)) {
                                      return false;
                                    }
                                    
                                    // If next position requires female, only show females
                                    if (isNextPositionFemale && player.gender !== 'Female') {
                                      return false;
                                    }
                                    
                                    // Don't allow more than 8 players
                                    if (selectedCount >= 8) {
                                      return false;
                                    }
                                    
                                    return true;
                                  })
                                  .map((player) => (
                                    <button
                                      key={player.id}
                                      type="button"
                                      className={`btn btn-outline btn-sm text-left justify-start ${
                                        isNextPositionFemale ? 'border-pink-300 hover:border-pink-500' : ''
                                      }`}
                                      onClick={() => {
                                        const newPlayers = [...editForm.gameBreakerPlayersTeam2];
                                        const nextEmptyIndex = newPlayers.findIndex(p => !p);
                                        if (nextEmptyIndex !== -1) {
                                          newPlayers[nextEmptyIndex] = player.name;
                                          setEditForm(prev => ({
                                            ...prev,
                                            gameBreakerPlayersTeam2: newPlayers
                                          }));
                                        }
                                      }}
                                      disabled={isTeamAdmin() && isDeadlinePassed(editingMatch)}
                                    >
                                      <div className="text-left">
                                        <div className="font-medium text-xs">{player.name}</div>
                                        <div className="text-xs opacity-70">
                                          {player.age ? `${player.age}y` : ''} {player.gender ? `${player.gender}` : ''}
                                        </div>
                                      </div>
                                    </button>
                                  ));
                              })()}
                            </div>
                            
                            {/* Helper text - Team 2 */}
                            <div className="mt-3 text-xs text-base-content/60">
                              {(() => {
                                const selectedCount = editForm.gameBreakerPlayersTeam2.filter(p => p).length;
                                const nextPosition = selectedCount + 1;
                                const isNextPositionFemale = nextPosition === 3 || nextPosition === 5;
                                
                                if (selectedCount >= 8) {
                                  return "All 8 players selected!";
                                } else if (isNextPositionFemale) {
                                  return `Next: Position ${nextPosition} (Female Player Required)`;
                                } else {
                                  return `Next: Position ${nextPosition}`;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-action flex-col sm:flex-row gap-2 sm:gap-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full">
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
      </div>
    </MainLayout>
  );
}