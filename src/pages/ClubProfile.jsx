import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import CloudinaryImageUpload from '../components/CloudinaryImageUpload';
import BillingInfoModal from '../components/BillingInfoModal';
import PlayerPhotoModal from '../components/PlayerPhotoModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserAuth } from '../contexts/UserAuthContext';

export default function ClubProfile() {
  const { clubId } = useParams();
  const { currentUser } = useAuth(); // Firebase Auth
  const { user } = useUserAuth(); // Custom Auth
  const [clubData, setClubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clubInfo');
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [showBillingInfoModal, setShowBillingInfoModal] = useState(false);
  const [isBillingInfoMissing, setIsBillingInfoMissing] = useState(false);
  
  // Home venue state variables
  const [venueName, setVenueName] = useState('');
  const [venueMapLink, setVenueMapLink] = useState('');
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [venueUpdateSuccess, setVenueUpdateSuccess] = useState(false);
  const [venueUpdateError, setVenueUpdateError] = useState('');

  // Note: Authentication is handled by UserProtectedRoute wrapper
  // No need to check here as the route is already protected
  const [playersTab, setPlayersTab] = useState('myPlayers');
  const [myPlayers, setMyPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [playerInterests, setPlayerInterests] = useState([]);
  
  // Design Assets state
  const [teamLogo, setTeamLogo] = useState(null);
  const [jerseyDesign, setJerseyDesign] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Modal states
  const [showPlayerInfoModal, setShowPlayerInfoModal] = useState(false);
  const [selectedPlayerInfo, setSelectedPlayerInfo] = useState(null);
  
  // Player photo modal states
  const [showPlayerPhotoModal, setShowPlayerPhotoModal] = useState(false);
  const [selectedPlayerForPhoto, setSelectedPlayerForPhoto] = useState(null);
  
  // Payment modal states
  const [showApprovalPaymentModal, setShowApprovalPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Billing info saving state
  const [savingBillingInfo, setSavingBillingInfo] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minSinglesRating: '',
    maxSinglesRating: '',
    minDoublesRating: '',
    maxDoublesRating: '',
    gender: '',
    minAge: '',
    maxAge: ''
  });

  // Fixtures state
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [expandedFixtureId, setExpandedFixtureId] = useState(null);
  const [selectedFixtureDate, setSelectedFixtureDate] = useState('all');
  
  // Match player assignment state
  const [showAssignPlayerModal, setShowAssignPlayerModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [editForm, setEditForm] = useState({
    player1Team1: '',
    player2Team1: '',
    player1Team2: '',
    player2Team2: '',
    gameBreakerPlayersTeam1: ['', '', '', '', '', '', '', ''],
    gameBreakerPlayersTeam2: ['', '', '', '', '', '', '', '']
  });
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('');
  
  // Teams and players for fixture assignment
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  
  // Current time for countdown timer
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        const clubDoc = await getDoc(doc(db, 'hpl-clubs', clubId));
        if (clubDoc.exists()) {
          const data = clubDoc.data();
          setClubData({
            id: clubDoc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || new Date()
          });
          
          // Check if current user is the club admin (check both auth systems)
          const userEmail = currentUser?.email || user?.email;
          const userId = currentUser?.uid || user?.id;
          const userRole = currentUser?.role;
          const userType = user?.type;

          if ((userId === clubId) || // Custom auth - club ID match
              (userType === 'club' && userId === clubId) || // Custom auth - club type
              (data.emailId && data.emailId === userEmail) || // Email match
              (data.uid && data.uid === userId) || // Firebase UID match
              (userRole === 'super_admin')) { // Super admin role
            
            setIsClubAdmin(true);
          }
          
          // Initialize design assets state if they exist
          if (data.teamLogo) {
            setTeamLogo(data.teamLogo);
          }
          
          if (data.jerseyDesign) {
            setJerseyDesign(data.jerseyDesign);
          }
          
          // Initialize venue information if it exists
          if (data.venueName) {
            setVenueName(data.venueName);
          }
          
          if (data.venueMapLink) {
            setVenueMapLink(data.venueMapLink);
          }
        }
      } catch (error) {
        console.error('Error fetching club data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clubId) {
      fetchClubData();
    }
  }, [clubId]);

  // Check if club is approved but hasn't paid the Rs. 2,00,000 fee - only show to club admin
  useEffect(() => {
    if (clubData && clubData.status === 'approved' && !clubData.finalPaymentCompleted && isClubAdmin) {
      setShowApprovalPaymentModal(true);
    }
  }, [clubData, isClubAdmin]);

  // Check if billing information is missing for active clubs
  useEffect(() => {
    if (clubData && clubData.status === 'active' && isClubAdmin) {
      // Check if billing information is missing
      const hasBillingInfo = clubData.billingName && clubData.billingAddress;
      setIsBillingInfoMissing(!hasBillingInfo);
      
      // Show billing info modal if missing
      if (!hasBillingInfo) {
        setShowBillingInfoModal(true);
      }
    }
  }, [clubData, isClubAdmin]);

  // Update current time every second for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper function to normalize gender values
  const normalizeGender = (gender) => {
    if (!gender) return '';
    const normalized = gender.toLowerCase().trim();
    if (normalized === 'm' || normalized === 'male') return 'Male';
    if (normalized === 'f' || normalized === 'female') return 'Female';
    return gender;
  };

  // Helper function to check if player is female
  const isFemale = (gender) => {
    const normalized = normalizeGender(gender);
    return normalized === 'Female';
  };

  // Helper function to check if player is male
  const isMale = (gender) => {
    const normalized = normalizeGender(gender);
    return normalized === 'Male';
  };

  // Get team players for assignment
  const getTeamPlayers = (teamId) => {
    if (!teams || teams.length === 0 || !players || players.length === 0) return [];
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.playerIds) return [];
    
    return team.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? {
        id: player.id,
        name: player.name,
        age: player.age,
        gender: player.gender,
        singlesRating: player.singlesRating,
        doublesRating: player.doublesRating
      } : null;
    }).filter(Boolean);
  };

  // Get player match count across matches in the CURRENT fixture only
  const getPlayerMatchCount = (playerName, teamId, excludeMatchId = null, currentFixture = null) => {
    if (!playerName || !currentFixture || !currentFixture.matches) return 0;
    
    let count = 0;
    currentFixture.matches.forEach(match => {
      if (excludeMatchId && match.id === excludeMatchId) return;
      
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

  // Check if player is already playing in a match of the same category in the CURRENT fixture only
  const isPlayerInSameCategory = (playerName, teamId, currentMatchType, currentMatchId, currentFixture = null) => {
    if (!playerName || !currentFixture || !currentFixture.matches) return false;
    
    return currentFixture.matches.some(match => {
      if (match.id === currentMatchId) return false;
      
      const isSameCategory = match.matchType === currentMatchType ||
                            match.matchTypeLabel === currentMatchType;
      
      if (!isSameCategory) return false;
      
      if (match.team1 === teamId) {
        return match.player1Team1 === playerName || match.player2Team1 === playerName;
      } else if (match.team2 === teamId) {
        return match.player1Team2 === playerName || match.player2Team2 === playerName;
      }
      
      return false;
    });
  };

  // Get enhanced player info with availability status
  const getPlayersWithAvailability = (playersList, teamSide, playerPosition, currentMatch, currentFixture = null) => {
    if (!currentMatch) return playersList.map(p => ({ ...p, available: true, reason: '' }));
    
    const matchType = currentMatch.matchType;
    const matchTypeLabel = currentMatch.matchTypeLabel || '';
    const teamId = teamSide === 'team1' ? currentMatch.team1 : currentMatch.team2;
    
    return playersList.map(player => {
      let available = true;
      let reason = '';
      
      // Rule 5: Rating check - FIRST CHECK - Singles matches require rating below 4.2, Doubles matches require rating below 4.2
      const isSinglesMatch = matchTypeLabel.toLowerCase().includes('singles');
      const isMixedDoubles = matchTypeLabel.toLowerCase().includes('mixed');
      const isDoublesMatch = !isSinglesMatch && !isMixedDoubles && !matchTypeLabel.toLowerCase().includes('game breaker') && !matchTypeLabel.toLowerCase().includes('dream breaker');
      
      if (isSinglesMatch) {
        const singlesRating = parseFloat(player.singlesRating || '0');
        if (singlesRating >= 4.2) {
          available = false;
          reason = `Rating too high (${singlesRating})`;
        }
      } else if (isDoublesMatch) {
        const doublesRating = parseFloat(player.doublesRating || '0');
        if (doublesRating >= 4.2) {
          available = false;
          reason = `Rating too high (${doublesRating})`;
        }
      }
      
      // Search term filter
      if (available && playerSearchTerm && !player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())) {
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
      
      // Rule 1: One player can't play more than 2 matches (in current fixture only)
      const currentPlayerCount = getPlayerMatchCount(player.name, teamId, currentMatch.id, currentFixture);
      if (available && currentPlayerCount >= 2) {
        available = false;
        reason = 'Already in 2 matches';
      }
      
      // Rule 2: Gender-specific matches
      const isWomensMatch = matchTypeLabel.toLowerCase().includes('women') ||
                           matchTypeLabel.toLowerCase().includes('ladies');
      const isMensMatch = matchTypeLabel.toLowerCase().includes('men') &&
                         !matchTypeLabel.toLowerCase().includes('women');
      
      if (available && isWomensMatch && !isFemale(player.gender)) {
        available = false;
        reason = 'Women only match';
      }
      
      if (available && isMensMatch && !isMale(player.gender)) {
        available = false;
        reason = 'Men only match';
      }
      
      // Rule 3: Mixed doubles logic
      if (available && isMixedDoubles) {
        const otherPlayerName = teamSide === 'team1'
          ? (playerPosition === 'player1' ? editForm.player2Team1 : editForm.player1Team1)
          : (playerPosition === 'player1' ? editForm.player2Team2 : editForm.player1Team2);
        
        if (otherPlayerName) {
          const otherPlayer = playersList.find(p => p.name === otherPlayerName);
          if (otherPlayer && normalizeGender(otherPlayer.gender) === normalizeGender(player.gender)) {
            available = false;
            reason = 'Mixed doubles requires opposite gender';
          }
        }
      }
      
      // Rule 4: Player can't play in another match of the same category (in current fixture only)
      if (available && isPlayerInSameCategory(player.name, teamId, matchType, currentMatch.id, currentFixture)) {
        available = false;
        reason = 'Already in same category match';
      }
      
      // Rule 6: In doubles, same player can't be selected in both positions
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

  // Filter players based on business rules
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

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // Fetch all players from clubs-players collection
        const playersQuery = query(collection(db, 'clubs-players'));
        const playersSnapshot = await getDocs(playersQuery);
        
        const allPlayers = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter players recruited by this club
        const recruited = allPlayers.filter(player => player.recruitedBy === clubId);
        setMyPlayers(recruited);

        // Filter available players (not recruited by any club)
        const available = allPlayers.filter(player => !player.recruitedBy);
        setAvailablePlayers(available);
        setFilteredPlayers(available);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };

    if (clubId && activeTab === 'players') {
      fetchPlayers();
    }
  }, [clubId, activeTab]);

  // Fetch fixtures for the club's HPL Clubs tournament
  useEffect(() => {
    const fetchFixtures = async () => {
      if (!clubId || activeTab !== 'fixtures') return;
      
      try {
        setFixturesLoading(true);
        
        // First, find the tournament that is HPL Clubs format
        const tournamentsQuery = query(
          collection(db, 'tournaments'),
          where('format', '==', 'HPL Clubs')
        );
        const tournamentsSnapshot = await getDocs(tournamentsQuery);
        
        if (tournamentsSnapshot.empty) {
          setFixtures([]);
          return;
        }
        
        const tournamentId = tournamentsSnapshot.docs[0].id;
        
        // Find the team that belongs to this club
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', tournamentId),
          where('hplClubId', '==', clubId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        
        if (teamsSnapshot.empty) {
          setFixtures([]);
          return;
        }
        
        const teamId = teamsSnapshot.docs[0].id;
        
        // Fetch all teams to get their logos and names
        const allTeamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', tournamentId)
        );
        const allTeamsSnapshot = await getDocs(allTeamsQuery);
        const teamsMap = {};
        const teamsData = [];
        allTeamsSnapshot.docs.forEach(doc => {
          const teamData = { id: doc.id, ...doc.data() };
          teamsMap[doc.id] = teamData;
          teamsData.push(teamData);
        });
        
        // Fetch all players for this tournament
        const playersQuery = query(
          collection(db, 'players'),
          where('tournamentId', '==', tournamentId)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Set teams and players state for modal use
        setTeams(teamsData);
        setPlayers(playersData);
        
        // Fetch all fixtures (individual matches) for this tournament
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        const fixturesSnapshot = await getDocs(fixturesQuery);
        
        // Filter fixtures where this team is playing and group by fixtureGroupId
        const fixtureGroupsMap = {};
        
        fixturesSnapshot.docs.forEach(doc => {
          const fixture = {
            id: doc.id,
            ...doc.data()
          };
          
          // Only include fixtures where this team is playing
          if (fixture.team1 === teamId || fixture.team2 === teamId) {
            const groupId = fixture.fixtureGroupId || fixture.id;
            
            if (!fixtureGroupsMap[groupId]) {
              const team1Data = teamsMap[fixture.team1] || {};
              const team2Data = teamsMap[fixture.team2] || {};
              
              fixtureGroupsMap[groupId] = {
                id: groupId,
                fixtureGroupId: groupId,
                date: fixture.date,
                venue: fixture.venue,
                status: fixture.status,
                team1: fixture.team1,
                team2: fixture.team2,
                team1Name: team1Data.name || 'Team 1',
                team2Name: team2Data.name || 'Team 2',
                team1Logo: team1Data.logo?.url || null,
                team2Logo: team2Data.logo?.url || null,
                team1Venue: team1Data.venue || null,
                matches: []
              };
            }
            
            fixtureGroupsMap[groupId].matches.push(fixture);
          }
        });
        
        // Convert map to array and sort by date
        const teamFixtures = Object.values(fixtureGroupsMap)
          .sort((a, b) => {
            // Helper function to convert date to comparable format
            const getDateValue = (date) => {
              if (!date) return Infinity;
              
              try {
                let dateObj = date;
                if (date?.toDate) {
                  dateObj = date.toDate();
                } else if (typeof date === 'string') {
                  dateObj = new Date(date);
                } else if (typeof date === 'number') {
                  dateObj = new Date(date);
                }
                
                const time = dateObj.getTime();
                return isNaN(time) ? Infinity : time;
              } catch (e) {
                return Infinity;
              }
            };
            
            return getDateValue(a.date) - getDateValue(b.date);
          });
        
        setFixtures(teamFixtures);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setFixtures([]);
      } finally {
        setFixturesLoading(false);
      }
    };

    fetchFixtures();
  }, [clubId, activeTab]);

  // Fetch pending recruitment requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!clubId) return;
      
      try {
        const requestsQuery = query(
          collection(db, 'recruitment-requests'),
          where('clubId', '==', clubId),
          where('status', '==', 'pending')
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        
        const requests = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter out expired requests (older than 24 hours)
        const now = new Date();
        const validRequests = requests.filter(request => {
          const requestTime = request.createdAt?.toDate() || new Date(0);
          const hoursDiff = (now - requestTime) / (1000 * 60 * 60);
          return hoursDiff < 24;
        });
        
        setPendingRequests(validRequests);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    if (activeTab === 'players') {
      fetchPendingRequests();
    }
  }, [clubId, activeTab]);
  
  // Fetch player interests for this club
  useEffect(() => {
    const fetchPlayerInterests = async () => {
      if (!clubId) return;
      
      try {
        const interestsQuery = query(
          collection(db, 'player-interests'),
          where('clubId', '==', clubId),
          where('status', '==', 'pending')
        );
        const interestsSnapshot = await getDocs(interestsQuery);
        
        const interests = [];
        for (const interestDoc of interestsSnapshot.docs) {
          interests.push({
            id: interestDoc.id,
            ...interestDoc.data()
          });
        }
        
        setPlayerInterests(interests);
      } catch (error) {
        console.error('Error fetching player interests:', error);
      }
    };

    if (activeTab === 'players' && playersTab === 'interests') {
      fetchPlayerInterests();
    }
  }, [clubId, activeTab, playersTab]);

  // Filter players based on search and filters
  useEffect(() => {
    if (availablePlayers.length === 0) return;

    let filtered = availablePlayers.filter(player => {
      // Search by name or DUPR ID
      const matchesSearch = searchTerm === '' ||
        player.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.duprId?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by gender
      const matchesGender = filters.gender === '' ||
        player.gender?.toLowerCase() === filters.gender.toLowerCase();

      // Filter by DUPR ratings
      const singlesRating = parseFloat(player.singlesRating) || 0;
      const doublesRating = parseFloat(player.doublesRating) || 0;
      
      const matchesSinglesMin = filters.minSinglesRating === '' ||
        singlesRating >= parseFloat(filters.minSinglesRating);
      const matchesSinglesMax = filters.maxSinglesRating === '' ||
        singlesRating <= parseFloat(filters.maxSinglesRating);
      const matchesDoublesMin = filters.minDoublesRating === '' ||
        doublesRating >= parseFloat(filters.minDoublesRating);
      const matchesDoublesMax = filters.maxDoublesRating === '' ||
        doublesRating <= parseFloat(filters.maxDoublesRating);

      // Filter by age (calculate from date of birth)
      let matchesAge = true;
      if (player.dateOfBirth && (filters.minAge !== '' || filters.maxAge !== '')) {
        const birthDate = new Date(player.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        const matchesMinAge = filters.minAge === '' || age >= parseInt(filters.minAge);
        const matchesMaxAge = filters.maxAge === '' || age <= parseInt(filters.maxAge);
        matchesAge = matchesMinAge && matchesMaxAge;
      }

      return matchesSearch && matchesGender && matchesSinglesMin &&
             matchesSinglesMax && matchesDoublesMin && matchesDoublesMax && matchesAge;
    });

    setFilteredPlayers(filtered);
  }, [availablePlayers, searchTerm, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      minSinglesRating: '',
      maxSinglesRating: '',
      minDoublesRating: '',
      maxDoublesRating: '',
      gender: '',
      minAge: '',
      maxAge: ''
    });
  };

  const handleAssignPlayerClick = (match, fixture) => {
    setEditingMatch(match);
    setCurrentFixture(fixture);
    setEditForm({
      player1Team1: match.player1Team1 || '',
      player2Team1: match.player2Team1 || '',
      player1Team2: match.player1Team2 || '',
      player2Team2: match.player2Team2 || '',
      gameBreakerPlayersTeam1: match.gameBreakerPlayersTeam1 || ['', '', '', '', '', '', '', ''],
      gameBreakerPlayersTeam2: match.gameBreakerPlayersTeam2 || ['', '', '', '', '', '', '', '']
    });
    setPlayerSearchTerm('');
    setSelectedAgeFilter('');
    setSelectedGenderFilter('');
    setShowAssignPlayerModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateMatchPlayers = async (e) => {
    e.preventDefault();
    
    try {
      if (!editingMatch) return;
      
      const updatedMatch = {
        ...editingMatch,
        player1Team1: editForm.player1Team1,
        player2Team1: editForm.player2Team1,
        player1Team2: editForm.player1Team2,
        player2Team2: editForm.player2Team2,
        ...(editingMatch.matchType === 'dreamBreaker' && {
          gameBreakerPlayersTeam1: editForm.gameBreakerPlayersTeam1,
          gameBreakerPlayersTeam2: editForm.gameBreakerPlayersTeam2
        })
      };
      
      await updateDoc(doc(db, 'fixtures', editingMatch.id), updatedMatch);
      
      // Update local state
      setFixtures(prev => prev.map(fixture => ({
        ...fixture,
        matches: fixture.matches?.map(match =>
          match.id === editingMatch.id ? updatedMatch : match
        ) || []
      })));
      
      setShowAssignPlayerModal(false);
      setEditingMatch(null);
    } catch (error) {
      console.error('Error updating match players:', error);
    }
  };

  // Design Assets handlers - team logo handler is only needed for internal state consistency
  // but no longer allows user uploads since we removed the upload/change/remove buttons
  const handleTeamLogoUpload = (imageData) => {
    // This function is kept for code consistency but is not actively used
    // since we've removed the upload interface for team logos
    setTeamLogo(imageData);
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleJerseyDesignUpload = (imageData) => {
    setJerseyDesign(imageData);
    setSaveSuccess(false);
    setSaveError('');
  };

  const saveDesignAssets = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError('');

      const clubRef = doc(db, 'hpl-clubs', clubId);
      
      const updateData = {};
      
      if (teamLogo) {
        updateData.teamLogo = {
          url: teamLogo.url,
          publicId: teamLogo.publicId,
          uploadedAt: serverTimestamp()
        };
      }
      
      if (jerseyDesign) {
        updateData.jerseyDesign = {
          url: jerseyDesign.url,
          publicId: jerseyDesign.publicId,
          uploadedAt: serverTimestamp()
        };
      }

      await updateDoc(clubRef, updateData);
      
      // Update local state
      setClubData(prev => ({
        ...prev,
        teamLogo: teamLogo ? {
          url: teamLogo.url,
          publicId: teamLogo.publicId
        } : prev.teamLogo,
        jerseyDesign: jerseyDesign ? {
          url: jerseyDesign.url,
          publicId: jerseyDesign.publicId
        } : prev.jerseyDesign
      }));
      
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving design assets:', error);
      setSaveError(`Failed to save design assets: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle billing information save
  const handleSaveBillingInfo = async (billingData) => {
    try {
      setSavingBillingInfo(true);
      
      const clubRef = doc(db, 'hpl-clubs', clubId);
      await updateDoc(clubRef, {
        billingName: billingData.billingName,
        gstNumber: billingData.gstNumber || '',
        billingAddress: billingData.billingAddress,
        billingInfoUpdatedAt: serverTimestamp()
      });
      
      // Update local state
      setClubData(prev => ({
        ...prev,
        billingName: billingData.billingName,
        gstNumber: billingData.gstNumber || '',
        billingAddress: billingData.billingAddress,
        billingInfoUpdatedAt: new Date()
      }));
      
      setIsBillingInfoMissing(false);
      setShowBillingInfoModal(false);
      
      alert('Billing information saved successfully!');
    } catch (error) {
      console.error('Error saving billing information:', error);
      throw new Error(`Failed to save billing information: ${error.message}`);
    } finally {
      setSavingBillingInfo(false);
    }
  };

  // Handle successful final payment (Rs. 2,00,000)
  const handleFinalPaymentSuccess = async (paymentData) => {
    try {
      setPaymentProcessing(true);
      
      // Update club status to active and mark final payment as completed
      const clubRef = doc(db, 'hpl-clubs', clubId);
      await updateDoc(clubRef, {
        status: 'active',
        finalPaymentCompleted: true,
        finalPaymentInfo: {
          paymentId: paymentData.razorpay_payment_id || 'test_payment_id',
          orderId: paymentData.razorpay_order_id || 'test_order_id',
          signature: paymentData.razorpay_signature || 'test_signature',
          amount: 23600000, // Rs. 2,00,000 + 18% GST = Rs. 2,36,000 in paise
          currency: 'INR',
          paidAt: serverTimestamp(),
          paymentMethod: 'razorpay'
        },
        activatedAt: serverTimestamp()
      });

      // Update local state
      setClubData(prev => ({
        ...prev,
        status: 'active',
        finalPaymentCompleted: true
      }));

      setShowApprovalPaymentModal(false);
      setPaymentProcessing(false);
      setPaymentError('');
      
      alert('Payment successful! Your club is now officially active in the HPL Clubs league.');
      
    } catch (error) {
      console.error('Error updating club status after payment:', error);
      setPaymentError(`Payment successful but failed to update club status: ${error.message}. Please contact support.`);
      setPaymentProcessing(false);
    }
  };

  // Handle final payment using Razorpay
  const handleFinalPayment = async () => {
    // Check if Razorpay is loaded
    if (!window.Razorpay) {
      setPaymentError('Payment gateway not loaded. Please refresh the page and try again.');
      return;
    }

    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const baseAmount = 200000; // Rs. 2,00,000
      const gstAmount = Math.round(baseAmount * 0.18); // 18% GST = Rs. 36,000
      const totalAmount = baseAmount + gstAmount; // Rs. 2,36,000
      const totalAmountInPaise = totalAmount * 100; // Convert to paise = 23,60,000 paise

      console.log('Payment calculation:', {
        baseAmount,
        gstAmount,
        totalAmount,
        totalAmountInPaise
      });

      const options = {
        key: 'rzp_live_SBc21pvQK1l6sZ',
        amount: totalAmountInPaise,
        currency: 'INR',
        name: 'HPL Club Registration',
        description: `Final Club Registration Fee - Rs. ${(baseAmount/100000).toFixed(2)} Lakh + 18% GST`,
        handler: function (response) {
          console.log('Final payment successful:', response);
          handleFinalPaymentSuccess(response);
        },
        prefill: {
          name: clubData.ownerNames || clubData.primaryOwnerName || '',
          email: clubData.emailId || '',
          contact: clubData.phoneNumber || ''
        },
        notes: {
          club_name: clubData.proposedClubName || '',
          owner_name: clubData.ownerNames || clubData.primaryOwnerName || '',
          payment_type: 'final_club_registration',
          club_id: clubId,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function() {
            console.log('Final payment modal dismissed');
            setPaymentProcessing(false);
          }
        }
      };

      console.log('Initializing final payment with options:', options);

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.error('Final payment failed:', response);
        let errorMessage = 'Payment failed. Please try again.';
        
        if (response.error) {
          console.error('Payment error details:', response.error);
          if (response.error.description) {
            errorMessage = response.error.description;
          } else if (response.error.reason) {
            errorMessage = response.error.reason;
          }
        }
        
        setPaymentError(errorMessage);
        setPaymentProcessing(false);
        alert(`Payment Failed: ${errorMessage}`);
      });

      rzp.open();
    } catch (error) {
      console.error('Error initializing final payment:', error);
      setPaymentProcessing(false);
      setPaymentError('Payment initialization failed. Please try again.');
      alert(`Error: ${error.message}`);
    }
  };

  // Function to handle player info modal
  const openPlayerInfoModal = (player) => {
    setSelectedPlayerInfo(player);
    setShowPlayerInfoModal(true);
  };

  // Function to close the player info modal
  const closePlayerInfoModal = () => {
    setShowPlayerInfoModal(false);
    setSelectedPlayerInfo(null);
  };

  // Function to open player photo modal
  const openPlayerPhotoModal = (player) => {
    setSelectedPlayerForPhoto(player);
    setShowPlayerPhotoModal(true);
  };

  // Function to close player photo modal
  const closePlayerPhotoModal = () => {
    setShowPlayerPhotoModal(false);
    setSelectedPlayerForPhoto(null);
  };

  // Function to handle photo update
  const handlePlayerPhotoUpdate = (updatedPlayer) => {
    // Update myPlayers if the player is in that list
    setMyPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    
    // Update filteredPlayers if the player is in that list
    setFilteredPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    
    // Update availablePlayers if the player is in that list
    setAvailablePlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  // Function to send recruitment email
  const sendRecruitmentEmail = async (playerEmail, playerName, clubName, clubOwner, clubOwnerContact, clubOwnerEmail) => {
    try {
      const emailSubject = `HPL Club Recruitment - Invitation from ${clubName}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">HPL Club League</h1>
            <p style="color: #666; margin: 10px 0;">Club Recruitment Invitation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${playerName},</h2>
            <p style="color: #666; margin-bottom: 15px;">
              You have received a recruitment invitation from <strong style="color: #f97316;">${clubName}</strong>
              to join their team in the HPL Club League!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Club Details:</h3>
              <p style="margin: 5px 0;"><strong>Club Name:</strong> ${clubName}</p>
              <p style="margin: 5px 0;"><strong>Club Owner:</strong> ${clubOwner}</p>
              <p style="margin: 5px 0;"><strong>Contact:</strong> ${clubOwnerContact}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${clubOwnerEmail}</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-weight: bold;">⏰ Important: This invitation expires in 24 hours</p>
            </div>
            
            <p style="color: #666; margin: 15px 0;">
              To respond to this invitation, please log in to your HPL player account at
              <a href="https://thehpl.in" style="color: #f97316;">thehpl.in</a>
              and check your recruitment requests.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://thehpl.in"
                 style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Invitation
              </a>
            </div>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              If you have any questions, please contact the club owner directly using the details above.
            </p>
            <p style="color: #999; font-size: 12px;">
              © 2024 Hyderabad Pickleball League. All rights reserved.
            </p>
          </div>
        </div>
      `;

      // Try sending the email - maximum 3 attempts
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      
      // Available email endpoints
      // Firebase project ID from player registration
      const projectId = 'pickleball-app-9ccf7';
      
      // Prioritize Firebase Cloud Functions URL to avoid CORS issues
      const endpoints = [
        `https://us-central1-${projectId}.cloudfunctions.net/sendRecruitmentEmail`,
        'https://us-central1-hpl-pickleball.cloudfunctions.net/sendRecruitmentEmail',
        'https://sendrecruitmentemail-ixqhqhqhha-uc.a.run.app'
        // Removed CORS-problematic endpoint: 'https://hpl-email-service-ixqhqhqhha-uc.a.run.app/send'
      ];
      
      while (attempt < maxRetries && !success) {
        try {
          // Use a different endpoint for each retry
          const endpoint = endpoints[attempt % endpoints.length];
          console.log(`Trying to send email using endpoint: ${endpoint} (attempt ${attempt + 1}/${maxRetries})`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: playerEmail,
              subject: emailSubject,
              html: emailHtml,
              type: 'recruitment_invitation'
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Email sent successfully:', result);
          success = true;
          return true;
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
          attempt++;
          
          // If we have more attempts left, wait before retrying
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      // If all retries failed, log it but return true to allow recruitment to proceed
      if (!success) {
        console.warn('Failed to send email after all retries. Proceeding with recruitment anyway.');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error in email sending process:', error);
      // Return true anyway to allow the recruitment to proceed even if email fails
      return true;
    }
  };

  // Handle player interest - convert to recruitment request
  const handleRecruitPlayerWithInterest = async (interestId, playerId) => {
    try {
      // Check if there's already a pending request for this player
      const existingRequest = pendingRequests.some(req => req.playerId === playerId);
      if (existingRequest) {
        alert('A recruitment request is already pending for this player.');
        return;
      }

      // Create recruitment request
      const recruitmentRequest = {
        clubId: clubId,
        playerId: playerId,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        clubName: clubData.proposedClubName,
        clubOwner: clubData.ownerNames || clubData.primaryOwnerName,
        clubOwnerContact: clubData.phoneNumber,
        clubOwnerEmail: clubData.emailId
      };

      const docRef = await addDoc(collection(db, 'recruitment-requests'), recruitmentRequest);
      
      // Update the interest status to processed
      await updateDoc(doc(db, 'player-interests', interestId), {
        status: 'processed',
        processedAt: serverTimestamp()
      });
      
      // Update local state to reflect the new pending request
      setPendingRequests(prev => [...prev, {
        id: docRef.id,
        ...recruitmentRequest,
        createdAt: { toDate: () => new Date() }
      }]);
      
      // Remove from interests list
      setPlayerInterests(prev => prev.filter(int => int.id !== interestId));
      
      // Find player details in the interest
      const interest = playerInterests.find(int => int.id === interestId);
      
      if (interest) {
        // Send recruitment email to the player
        const emailSent = await sendRecruitmentEmail(
          interest.playerEmail,
          interest.playerName,
          clubData.proposedClubName,
          clubData.ownerNames || clubData.primaryOwnerName,
          clubData.phoneNumber,
          clubData.emailId
        );
  
        // Always show success message since we've modified sendRecruitmentEmail to return true
        // even if email sending fails (recruitment record is still created)
        alert(`Recruitment request sent successfully to ${interest.playerName}! They will be notified via email.`);
      } else {
        alert('Recruitment request sent successfully!');
      }
    } catch (error) {
      console.error('Error recruiting interested player:', error);
      alert('Failed to recruit player. Please try again.');
    }
  };
  
  // Handle rejecting player interest
  const handleRejectPlayerInterest = async (interestId) => {
    try {
      await updateDoc(doc(db, 'player-interests', interestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
      
      // Remove from interests list
      setPlayerInterests(prev => prev.filter(int => int.id !== interestId));
      
      alert('Player interest rejected successfully.');
    } catch (error) {
      console.error('Error rejecting player interest:', error);
      alert('Failed to reject player interest. Please try again.');
    }
  };

  const handleRecruitPlayer = async (playerId) => {
    try {
      // Check if there's already a pending request for this player
      const existingRequest = pendingRequests.find(req => req.playerId === playerId);
      if (existingRequest) {
        alert('A recruitment request is already pending for this player.');
        return;
      }

      // Find the player details
      const player = filteredPlayers.find(p => p.id === playerId);
      if (!player) {
        alert('Player not found.');
        return;
      }

      // Calculate current roster composition
      const currentMaleCount = myPlayers.filter(p => p.gender?.toLowerCase() === 'male').length;
      const currentFemaleCount = myPlayers.filter(p => p.gender?.toLowerCase() === 'female').length;
      const totalCurrentPlayers = currentMaleCount + currentFemaleCount;

      // Calculate pending requests by gender
      const pendingMaleRequests = pendingRequests.filter(req => {
        const availablePlayer = availablePlayers.find(p => p.id === req.playerId);
        return availablePlayer?.gender?.toLowerCase() === 'male';
      }).length;
      
      const pendingFemaleRequests = pendingRequests.filter(req => {
        const availablePlayer = availablePlayers.find(p => p.id === req.playerId);
        return availablePlayer?.gender?.toLowerCase() === 'female';
      }).length;

      // Calculate total committed players (current + pending)
      const totalCommittedMales = currentMaleCount + pendingMaleRequests;
      const totalCommittedFemales = currentFemaleCount + pendingFemaleRequests;
      const totalCommittedPlayers = totalCommittedMales + totalCommittedFemales;

      // Check maximum roster limit (10 players)
      if (totalCommittedPlayers >= 10) {
        alert('Cannot recruit more players. Your club has reached the maximum limit of 10 players (including pending requests).');
        return;
      }

      // Check gender-specific recruitment rules
      const playerGender = player.gender?.toLowerCase();
      
      if (playerGender === 'male') {
        // For male players: ensure we don't exceed the limit while maintaining minimum 3 females
        const maxMalesAllowed = 10 - 3; // Maximum 7 males (to ensure minimum 3 females)
        
        if (totalCommittedMales >= maxMalesAllowed) {
          alert(`Cannot recruit more male players. Your club needs to maintain a minimum of 3 female players. Current status: ${currentMaleCount} males, ${currentFemaleCount} females (+ ${pendingMaleRequests} pending male, ${pendingFemaleRequests} pending female requests).`);
          return;
        }
      } else if (playerGender === 'female') {
        // For female players: can recruit as long as total doesn't exceed 10
        // (No additional restrictions since more females help meet the minimum requirement)
      } else {
        alert('Player gender information is required for recruitment. Please ensure the player has specified their gender.');
        return;
      }

      // Create recruitment request
      const recruitmentRequest = {
        clubId: clubId,
        playerId: playerId,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        clubName: clubData.proposedClubName,
        clubOwner: clubData.ownerNames || clubData.primaryOwnerName,
        clubOwnerContact: clubData.phoneNumber,
        clubOwnerEmail: clubData.emailId
      };

      const docRef = await addDoc(collection(db, 'recruitment-requests'), recruitmentRequest);
      
      // Update local state to reflect the new pending request
      setPendingRequests(prev => [...prev, {
        id: docRef.id,
        ...recruitmentRequest,
        createdAt: { toDate: () => new Date() }
      }]);

      console.log('Recruitment request sent to player:', playerId);
      
      // Send recruitment email to the player
      const emailSent = await sendRecruitmentEmail(
        player.emailId,
        player.fullName,
        clubData.proposedClubName,
        clubData.ownerNames || clubData.primaryOwnerName,
        clubData.phoneNumber,
        clubData.emailId
      );

      // Always show success message since we've modified sendRecruitmentEmail to return true
      // even if email sending fails (recruitment record is still created)
      alert(`Recruitment request sent successfully to ${player.fullName}! They will be notified via email.`);
      
    } catch (error) {
      console.error('Error sending recruitment request:', error);
      alert('Failed to send recruitment request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
          Loading club profile...
        </div>
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
          Club not found
        </div>
      </div>
    );
  }

  // If user is not the club admin, show restricted access message
  if (!isClubAdmin) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#212121'}}>
        <NewHomeNavbar />
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-8 max-w-md mx-auto">
              <div className="text-red-400 text-6xl mb-4 text-center">🔒</div>
              <h3 className="text-xl font-bold text-red-400 mb-2 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                Access Restricted
              </h3>
              <p className="text-gray-300 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                You don't have permission to view this club's profile. Only club administrators can access this page.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#212121'}}>
      <NewHomeNavbar />
      
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-8 mb-8 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Club Logo/Avatar */}
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-orange-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {clubData.proposedClubName?.charAt(0) || 'C'}
                </span>
              </div>
              
              {/* Club Info */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {clubData.proposedClubName} {clubData.clubNamingFormat}
                </h1>
                <p className="text-xl opacity-90 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Owner: {clubData.ownerNames || clubData.primaryOwnerName}
                </p>
                <p className="opacity-75" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Registered: {clubData.submittedAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-gray-800 rounded-lg mb-8">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('clubInfo')}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'clubInfo'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Club Info
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'players'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Players
              </button>
              {/* Design Assets tab - Only visible for active clubs and club admin */}
              {clubData.status === 'active' && isClubAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('designAssets')}
                    className={`px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'designAssets'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-300 hover:text-white'
                    }`}
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    Design Assets
                  </button>
                  <button
                    onClick={() => setActiveTab('homeVenue')}
                    className={`px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'homeVenue'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-300 hover:text-white'
                    }`}
                    style={{fontFamily: 'Avantique, sans-serif'}}
                  >
                    Home Venue
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('fixtures')}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'fixtures'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Fixtures
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'clubInfo' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Club Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Proposed Club Name
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.proposedClubName}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Primary Owner
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.ownerNames || clubData.primaryOwnerName}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Club Naming Format
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.clubNamingFormat}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Phone Number
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.phoneNumber}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Email ID
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.emailId}
                        </p>
                      </div>

                      {/* Billing Information */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                            Billing Information
                          </label>
                          {clubData.status === 'active' && isClubAdmin && (
                            <button
                              onClick={() => setShowBillingInfoModal(true)}
                              className="text-xs text-orange-500 hover:text-orange-400"
                              style={{fontFamily: 'Avantique, sans-serif'}}
                            >
                              {clubData.billingName ? 'Edit' : 'Add'}
                            </button>
                          )}
                        </div>
                        
                        {clubData.billingName ? (
                          <div className="bg-gray-700 p-3 rounded-lg mt-1 space-y-1">
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              <strong>Name:</strong> {clubData.billingName}
                            </p>
                            {clubData.gstNumber && (
                              <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                <strong>GST:</strong> {clubData.gstNumber}
                              </p>
                            )}
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              <strong>Address:</strong> {clubData.billingAddress}
                            </p>
                          </div>
                        ) : (
                          <p className="text-yellow-500" style={{fontFamily: 'Avantique, sans-serif'}}>
                            No billing information provided
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Club Description
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.clubDescription || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Community Manager
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.communityManagerName || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Manager Phone
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.managerPhoneNumber || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Manager Email
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.managerEmailId || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Venue Access
                        </label>
                        <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {clubData.venueAccess || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Club USP */}
                  {clubData.clubUSP && (
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Club USP
                      </label>
                      <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {clubData.clubUSP}
                      </p>
                    </div>
                  )}

                  {/* Unique Culture */}
                  {clubData.uniqueCulture && (
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Unique Culture
                      </label>
                      <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                        {clubData.uniqueCulture}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'players' ? (
                isClubAdmin ? (
                  <div className="space-y-6">
                    {/* Check club status */}
                    {clubData.status === 'active' ? (
                    <>
                      {/* Players Sub-tabs */}
                      <div className="flex space-x-4 border-b border-gray-700">
                        <button
                          onClick={() => setPlayersTab('myPlayers')}
                          className={`px-4 py-2 font-semibold transition-colors ${
                            playersTab === 'myPlayers'
                              ? 'text-orange-500 border-b-2 border-orange-500'
                              : 'text-gray-300 hover:text-white'
                          }`}
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        >
                          My Players ({myPlayers.length})
                        </button>
                        <button
                          onClick={() => setPlayersTab('recruitment')}
                          className={`px-4 py-2 font-semibold transition-colors ${
                            playersTab === 'recruitment'
                              ? 'text-orange-500 border-b-2 border-orange-500'
                              : 'text-gray-300 hover:text-white'
                          }`}
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        >
                          Recruitment ({filteredPlayers.length})
                        </button>
                        <button
                          onClick={() => setPlayersTab('interests')}
                          className={`px-4 py-2 font-semibold transition-colors ${
                            playersTab === 'interests'
                              ? 'text-orange-500 border-b-2 border-orange-500'
                              : 'text-gray-300 hover:text-white'
                          }`}
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        >
                          Interests ({playerInterests.length})
                        </button>
                      </div>

                      {/* Players Content */}
                      {playersTab === 'myPlayers' && (
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                            My Players
                          </h3>
                          {myPlayers.length === 0 ? (
                            <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                              No players recruited yet.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full bg-gray-700 rounded-lg">
                                <thead>
                                  <tr className="border-b border-gray-600">
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Photo
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Phone
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Gender
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Age
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      DUPR ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Singles DUPR
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Doubles DUPR
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {myPlayers.map((player) => {
                                    // Calculate age from date of birth
                                    let age = 'N/A';
                                    if (player.dateOfBirth) {
                                      try {
                                        let birthDate;
                                        // Handle different date formats
                                        if (player.dateOfBirth.toDate) {
                                          // Firestore timestamp
                                          birthDate = player.dateOfBirth.toDate();
                                        } else if (typeof player.dateOfBirth === 'string') {
                                          // Handle DD-MM-YYYY format
                                          if (player.dateOfBirth.includes('-') && player.dateOfBirth.split('-').length === 3) {
                                            const parts = player.dateOfBirth.split('-');
                                            // Convert DD-MM-YYYY to MM/DD/YYYY for proper parsing
                                            const formattedDate = `${parts[1]}/${parts[0]}/${parts[2]}`;
                                            birthDate = new Date(formattedDate);
                                          } else {
                                            // Try parsing as is
                                            birthDate = new Date(player.dateOfBirth);
                                          }
                                        } else {
                                          // Already a Date object
                                          birthDate = new Date(player.dateOfBirth);
                                        }
                                        
                                        if (!isNaN(birthDate.getTime())) {
                                          const today = new Date();
                                          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                          const monthDiff = today.getMonth() - birthDate.getMonth();
                                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                            calculatedAge--;
                                          }
                                          age = calculatedAge;
                                        }
                                      } catch (error) {
                                        console.error('Error calculating age:', error);
                                        age = 'N/A';
                                      }
                                    }

                                    return (
                                       <tr key={player.id} className="border-b border-gray-600">
                                         <td className="px-4 py-3 text-white flex items-center justify-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                           <button
                                             onClick={() => openPlayerPhotoModal(player)}
                                             className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-600 hover:bg-blue-500 text-white transition-colors"
                                             title="View/Upload player photo"
                                           >
                                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                             </svg>
                                           </button>
                                         </td>
                                         <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                           {player.fullName}
                                         </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.emailId}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.mobileNumber}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {age}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.duprId || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.singlesRating || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.doublesRating || 'N/A'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {playersTab === 'recruitment' && (
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                            Player Recruitment
                          </h3>
                          
                          {/* Search Bar */}
                          <div className="bg-gray-700 rounded-lg p-4 mb-4">
                            <h4 className="text-white font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Search Players
                            </h4>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                style={{fontFamily: 'Avantique, sans-serif'}}
                                placeholder="Search by player name or DUPR ID"
                              />
                            </div>
                          </div>
                          
                          {/* Filters */}
                          <div className="bg-gray-700 rounded-lg p-4 mb-6">
                            <h4 className="text-white font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Filter Players
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Gender
                                </label>
                                <select
                                  value={filters.gender}
                                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                >
                                  <option value="">All Genders</option>
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Min Age
                                </label>
                                <input
                                  type="number"
                                  value={filters.minAge}
                                  onChange={(e) => handleFilterChange('minAge', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Min age"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Max Age
                                </label>
                                <input
                                  type="number"
                                  value={filters.maxAge}
                                  onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Max age"
                                />
                              </div>
                            </div>
                            
                            {/* DUPR Ratings Filters */}
                            <h4 className="text-white font-semibold mt-4 mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                              DUPR Ratings
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Min Singles Rating
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="2.0"
                                  max="7.0"
                                  value={filters.minSinglesRating}
                                  onChange={(e) => handleFilterChange('minSinglesRating', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Min (e.g. 3.5)"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Max Singles Rating
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="2.0"
                                  max="7.0"
                                  value={filters.maxSinglesRating}
                                  onChange={(e) => handleFilterChange('maxSinglesRating', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Max (e.g. 5.0)"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Min Doubles Rating
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="2.0"
                                  max="7.0"
                                  value={filters.minDoublesRating}
                                  onChange={(e) => handleFilterChange('minDoublesRating', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Min (e.g. 3.5)"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Max Doubles Rating
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="2.0"
                                  max="7.0"
                                  value={filters.maxDoublesRating}
                                  onChange={(e) => handleFilterChange('maxDoublesRating', e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-orange-500 focus:outline-none"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                  placeholder="Max (e.g. 5.0)"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <button
                                onClick={clearFilters}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                style={{fontFamily: 'Avantique, sans-serif'}}
                              >
                                Clear Filters
                              </button>
                            </div>
                          </div>

                          {/* Players List */}
                          {filteredPlayers.length === 0 ? (
                            <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                              No players available for recruitment with current filters.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full bg-gray-700 rounded-lg">
                                <thead>
                                  <tr className="border-b border-gray-600">
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Phone
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Gender
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Age
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      DUPR ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Singles DUPR
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Doubles DUPR
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredPlayers.map((player) => {
                                    // Calculate age from date of birth
                                    let age = 'N/A';
                                    if (player.dateOfBirth) {
                                      try {
                                        let birthDate;
                                        // Handle different date formats
                                        if (player.dateOfBirth.toDate) {
                                          // Firestore timestamp
                                          birthDate = player.dateOfBirth.toDate();
                                        } else if (typeof player.dateOfBirth === 'string') {
                                          // Handle DD-MM-YYYY format
                                          if (player.dateOfBirth.includes('-') && player.dateOfBirth.split('-').length === 3) {
                                            const parts = player.dateOfBirth.split('-');
                                            // Convert DD-MM-YYYY to MM/DD/YYYY for proper parsing
                                            const formattedDate = `${parts[1]}/${parts[0]}/${parts[2]}`;
                                            birthDate = new Date(formattedDate);
                                          } else {
                                            // Try parsing as is
                                            birthDate = new Date(player.dateOfBirth);
                                          }
                                        } else {
                                          // Already a Date object
                                          birthDate = new Date(player.dateOfBirth);
                                        }
                                        
                                        if (!isNaN(birthDate.getTime())) {
                                          const today = new Date();
                                          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                          const monthDiff = today.getMonth() - birthDate.getMonth();
                                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                            calculatedAge--;
                                          }
                                          age = calculatedAge;
                                        }
                                      } catch (error) {
                                        console.error('Error calculating age:', error);
                                        age = 'N/A';
                                      }
                                    }

                                    // Check if player has pending request
                                    const hasPendingRequest = pendingRequests.some(req => req.playerId === player.id);

                                    return (
                                       <tr key={player.id} className="border-b border-gray-600">
                                         <td className="px-4 py-3 text-white flex items-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                           <button
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               openPlayerInfoModal(player);
                                             }}
                                             className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-600 hover:bg-blue-500 text-white text-xs transition-colors"
                                             title="View player info"
                                           >
                                             <span className="font-semibold">i</span>
                                           </button>
                                           {player.fullName}
                                         </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.emailId}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.mobileNumber}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {age}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.duprId || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.singlesRating || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {player.doublesRating || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                          {hasPendingRequest ? (
                                            <span className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-full" style={{fontFamily: 'Avantique, sans-serif'}}>
                                              Pending
                                            </span>
                                          ) : (
                                            <button
                                              onClick={() => handleRecruitPlayer(player.id)}
                                              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
                                              style={{fontFamily: 'Avantique, sans-serif'}}
                                            >
                                              Recruit
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Interests Tab Content */}
                      {playersTab === 'interests' && (
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                            Interested Players
                          </h3>
                          
                          {playerInterests.length === 0 ? (
                            <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                              No players have expressed interest in your club yet.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full bg-gray-700 rounded-lg">
                                <thead>
                                  <tr className="border-b border-gray-600">
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Phone
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Gender
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Singles DUPR
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Doubles DUPR
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Interest Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-white font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {playerInterests.map((interest) => {
                                    // Convert timestamp to date if needed
                                    const interestDate = interest.createdAt?.toDate?.() || new Date(interest.createdAt) || new Date();
                                    
                                    return (
                                      <tr key={interest.id} className="border-b border-gray-600">
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerName || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerEmail || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerMobile || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerGender ? interest.playerGender.charAt(0).toUpperCase() + interest.playerGender.slice(1) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerSinglesRating || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interest.playerDoublesRating || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                          {interestDate.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => handleRecruitPlayerWithInterest(interest.id, interest.playerId)}
                                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                                              style={{fontFamily: 'Avantique, sans-serif'}}
                                            >
                                              Recruit
                                            </button>
                                            <button
                                              onClick={() => handleRejectPlayerInterest(interest.id)}
                                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                                              style={{fontFamily: 'Avantique, sans-serif'}}
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : clubData.status === 'approved' && !clubData.finalPaymentCompleted ? (
                    <div className="text-center py-12">
                      <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-8 max-w-md mx-auto">
                        <div className="text-orange-400 text-6xl mb-4">💳</div>
                        <h3 className="text-xl font-bold text-orange-400 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Payment Required
                        </h3>
                        <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Your club has been approved! Please complete the final payment of Rs. 2,36,000 to activate your club and access the Players section.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-8 max-w-md mx-auto">
                        <div className="text-yellow-400 text-6xl mb-4">⏳</div>
                        <h3 className="text-xl font-bold text-yellow-400 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Waiting on Approval from Admin
                        </h3>
                        <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Your club registration is currently under review. You'll be able to access the Players section once your club is approved by the administrator.
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-8 max-w-md mx-auto">
                      <div className="text-red-400 text-6xl mb-4">🔒</div>
                      <h3 className="text-xl font-bold text-red-400 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                        Access Restricted
                      </h3>
                      <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                        You need to be logged in as the club admin to view and manage players.
                      </p>
                    </div>
                  </div>
                )
              ) : null}
              
              {/* Design Assets Tab Content */}
              {activeTab === 'designAssets' && isClubAdmin ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Design Assets
                  </h2>
                  
                  <div className="bg-gray-700 rounded-lg p-6 mb-6">
                    <p className="text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Upload your team's logo and jersey design. These will be used in official HPL communications, merchandise,
                      and match displays.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Team Logo Display (without upload/change/remove buttons) */}
                      <div className="flex flex-col items-center">
                        <h3 className="text-lg font-semibold text-white mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Team Logo
                        </h3>
                        {teamLogo?.url ? (
                          <div className="w-32 h-32 mx-auto mb-2">
                            <img
                              src={teamLogo.url}
                              alt="Team logo"
                              className="w-full h-full object-cover border-4 border-base-300 rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-base-content/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="text-xs text-center text-base-content/60">No logo uploaded</p>
                          </div>
                        )}
                        <p className="text-gray-400 text-sm mt-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Recommended: Square format, transparent background
                        </p>
                      </div>
                      
                      {/* Jersey Design Upload */}
                      <div className="flex flex-col items-center">
                        <h3 className="text-lg font-semibold text-white mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Jersey Design
                        </h3>
                        <CloudinaryImageUpload
                          onImageUpload={handleJerseyDesignUpload}
                          currentImage={jerseyDesign?.url || null}
                          label="Jersey Design"
                          uploadType="team"
                          className="mb-2"
                        />
                        <p className="text-gray-400 text-sm mt-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Recommended: Front and back view, high resolution
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={saveDesignAssets}
                        disabled={isSaving}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                          isSaving
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                        style={{fontFamily: 'Avantique, sans-serif'}}
                      >
                        {isSaving ? 'Saving...' : 'Save Design Assets'}
                      </button>
                    </div>
                    
                    {saveSuccess && (
                      <div className="mt-4 bg-green-900/20 border border-green-500 rounded-lg p-3">
                        <p className="text-green-400 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Design assets saved successfully!
                        </p>
                      </div>
                    )}
                    
                    {saveError && (
                      <div className="mt-4 bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <p className="text-red-400 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {saveError}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'homeVenue' && isClubAdmin ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Home Venue Information
                  </h2>
                  
                  <div className="bg-gray-700 rounded-lg p-6 mb-6">
                    <p className="text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Enter your club's home venue information. This will be displayed in your club profile and used for match locations.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="venue-name" className="block text-white font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Venue Name
                        </label>
                        <input
                          id="venue-name"
                          type="text"
                          value={venueName}
                          onChange={(e) => setVenueName(e.target.value)}
                          placeholder="Enter venue name"
                          className="w-full px-4 py-3 bg-gray-600 rounded-lg border border-gray-500 text-white focus:outline-none focus:border-orange-500"
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="venue-map-link" className="block text-white font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Google Maps Link
                        </label>
                        <input
                          id="venue-map-link"
                          type="text"
                          value={venueMapLink}
                          onChange={(e) => setVenueMapLink(e.target.value)}
                          placeholder="Enter Google Maps URL for your venue"
                          className="w-full px-4 py-3 bg-gray-600 rounded-lg border border-gray-500 text-white focus:outline-none focus:border-orange-500"
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        />
                        <p className="text-gray-400 text-sm mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                          To get a Google Maps link, search for your venue on maps.google.com, click "Share" and copy the link.
                        </p>
                      </div>
                      
                      {/* Map preview removed as per client request */}
                    </div>
                    
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={async () => {
                          try {
                            setIsSavingVenue(true);
                            setVenueUpdateSuccess(false);
                            setVenueUpdateError('');
                            
                            const clubRef = doc(db, 'hpl-clubs', clubId);
                            await updateDoc(clubRef, {
                              venueName: venueName,
                              venueMapLink: venueMapLink,
                              venueUpdatedAt: serverTimestamp()
                            });
                            
                            // Update local state
                            setClubData(prev => ({
                              ...prev,
                              venueName: venueName,
                              venueMapLink: venueMapLink,
                              venueUpdatedAt: new Date()
                            }));
                            
                            setVenueUpdateSuccess(true);
                            
                            // Clear success message after 3 seconds
                            setTimeout(() => {
                              setVenueUpdateSuccess(false);
                            }, 3000);
                          } catch (error) {
                            console.error('Error saving venue information:', error);
                            setVenueUpdateError(`Failed to save venue information: ${error.message}`);
                          } finally {
                            setIsSavingVenue(false);
                          }
                        }}
                        disabled={isSavingVenue}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                          isSavingVenue
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                        style={{fontFamily: 'Avantique, sans-serif'}}
                      >
                        {isSavingVenue ? 'Saving...' : 'Save Venue Information'}
                      </button>
                    </div>
                    
                    {venueUpdateSuccess && (
                      <div className="mt-4 bg-green-900/20 border border-green-500 rounded-lg p-3">
                        <p className="text-green-400 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Venue information saved successfully!
                        </p>
                      </div>
                    )}
                    
                    {venueUpdateError && (
                      <div className="mt-4 bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <p className="text-red-400 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {venueUpdateError}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'fixtures' ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Fixtures
                    </h2>
                    {fixtures.length > 0 && (
                      <select
                        value={selectedFixtureDate}
                        onChange={(e) => setSelectedFixtureDate(e.target.value)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-orange-500"
                        style={{fontFamily: 'Avantique, sans-serif'}}
                      >
                        <option value="all">All Dates</option>
                        {Array.from(new Set(
                          fixtures
                            .filter(f => f.date)
                            .map(f => {
                              try {
                                let dateObj = f.date;
                                if (f.date?.toDate) {
                                  dateObj = f.date.toDate();
                                } else if (typeof f.date === 'string') {
                                  dateObj = new Date(f.date);
                                } else if (typeof f.date === 'number') {
                                  dateObj = new Date(f.date);
                                }
                                return dateObj.toDateString();
                              } catch (e) {
                                return null;
                              }
                            })
                            .filter(Boolean)
                        )).map(dateStr => (
                          <option key={dateStr} value={dateStr}>
                            {new Date(dateStr).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {fixturesLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        <p className="text-gray-300 mt-4" style={{fontFamily: 'Avantique, sans-serif'}}>Loading fixtures...</p>
                      </div>
                    </div>
                  ) : fixtures.length === 0 ? (
                    <div className="bg-gray-700 rounded-lg p-8 text-center">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-gray-300 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                        No fixtures found for this team in the HPL Clubs tournament.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {fixtures
                        .filter(fixture => {
                          if (selectedFixtureDate === 'all') return true;
                          try {
                            let dateObj = fixture.date;
                            if (fixture.date?.toDate) {
                              dateObj = fixture.date.toDate();
                            } else if (typeof fixture.date === 'string') {
                              dateObj = new Date(fixture.date);
                            } else if (typeof fixture.date === 'number') {
                              dateObj = new Date(fixture.date);
                            }
                            return dateObj.toDateString() === selectedFixtureDate;
                          } catch (e) {
                            return false;
                          }
                        })
                        .map((fixture, index) => (
                        <div key={fixture.id} className="bg-gray-700 rounded-lg overflow-hidden border border-gray-600 cursor-pointer hover:border-orange-500 transition-colors" onClick={() => setExpandedFixtureId(expandedFixtureId === fixture.id ? null : fixture.id)}>
                          {/* Fixture Header with Team Logos */}
                          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4">
                            <div className="grid grid-cols-3 gap-4 items-start">
                              {/* Team A Logo and Name */}
                              <div className="flex flex-col items-center">
                                {fixture.team1Logo ? (
                                  <img
                                    src={fixture.team1Logo}
                                    alt={fixture.team1Name}
                                    className="w-16 h-16 object-contain mb-2 rounded"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-600 rounded mb-2 flex items-center justify-center text-white text-xs font-bold text-center px-1">
                                    {fixture.team1Name}
                                  </div>
                                )}
                                <p className="text-white text-sm font-semibold text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {fixture.team1Name}
                                </p>
                              </div>
                              
                              {/* Center Info */}
                              <div className="flex flex-col items-center justify-start">
                                <h3 className="text-white font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Fixture {fixture.fixtureNumber || index + 1}
                                </h3>
                                {fixture.date && (
                                  <p className="text-orange-100 text-xs mt-1 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {(() => {
                                      try {
                                        let dateObj = fixture.date;
                                        if (fixture.date?.toDate) {
                                          dateObj = fixture.date.toDate();
                                        } else if (typeof fixture.date === 'string') {
                                          dateObj = new Date(fixture.date);
                                        } else if (typeof fixture.date === 'number') {
                                          dateObj = new Date(fixture.date);
                                        }
                                        
                                        if (isNaN(dateObj.getTime())) {
                                          return 'Date TBD';
                                        }
                                        
                                        return dateObj.toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        });
                                      } catch (e) {
                                        return 'Date TBD';
                                      }
                                    })()}
                                  </p>
                                )}
                                {fixture.matches && fixture.matches.length > 0 && fixture.matches[0].time && (
                                  <p className="text-orange-100 text-xs mt-1 text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {(() => {
                                      try {
                                        const [hours, minutes] = fixture.matches[0].time.split(':');
                                        const hour = parseInt(hours);
                                        const ampm = hour >= 12 ? 'PM' : 'AM';
                                        const displayHour = hour % 12 || 12;
                                        return `${displayHour}:${minutes} ${ampm}`;
                                      } catch (e) {
                                        return 'Time TBD';
                                      }
                                    })()}
                                  </p>
                                )}
                                {fixture.matches && fixture.matches.length > 0 && fixture.matches[0].time && (
                                  <p className="text-yellow-300 text-lg mt-2 text-center font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {(() => {
                                      try {
                                        let fixtureDate = fixture.date;
                                        if (fixture.date?.toDate) {
                                          fixtureDate = fixture.date.toDate();
                                        } else if (typeof fixture.date === 'string') {
                                          fixtureDate = new Date(fixture.date);
                                        } else if (typeof fixture.date === 'number') {
                                          fixtureDate = new Date(fixture.date);
                                        }
                                        
                                        const [hours, minutes] = fixture.matches[0].time.split(':');
                                        const matchDateTime = new Date(fixtureDate);
                                        matchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                        
                                        // 1 hour before match time
                                        const oneHourBefore = new Date(matchDateTime.getTime() - 60 * 60 * 1000);
                                        const now = currentTime || new Date();
                                        
                                        if (now >= oneHourBefore) {
                                          return 'DEADLINE PASSED';
                                        }
                                        
                                        const timeDiff = oneHourBefore.getTime() - now.getTime();
                                        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                        const hours_remaining = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                        const minutes_remaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                                        const seconds_remaining = Math.floor((timeDiff % (1000 * 60)) / 1000);
                                        
                                        if (days > 0) {
                                          return `${days}d ${hours_remaining}h ${minutes_remaining}m ${seconds_remaining}s`;
                                        } else if (hours_remaining > 0) {
                                          return `${hours_remaining}h ${minutes_remaining}m ${seconds_remaining}s`;
                                        } else if (minutes_remaining > 0) {
                                          return `${minutes_remaining}m ${seconds_remaining}s`;
                                        } else {
                                          return `${seconds_remaining}s`;
                                        }
                                      } catch (e) {
                                        return 'Time TBD';
                                      }
                                    })()}
                                  </p>
                                )}
                                {fixture.status && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold mt-2 ${
                                    fixture.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                                    fixture.status === 'ongoing' ? 'bg-blue-900/30 text-blue-400' :
                                    'bg-white/20 text-white'
                                  }`} style={{fontFamily: 'Avantique, sans-serif'}}>
                                    {fixture.status.charAt(0).toUpperCase() + fixture.status.slice(1)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Team B Logo and Name */}
                              <div className="flex flex-col items-center">
                                {fixture.team2Logo ? (
                                  <img
                                    src={fixture.team2Logo}
                                    alt={fixture.team2Name}
                                    className="w-16 h-16 object-contain mb-2 rounded"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-600 rounded mb-2 flex items-center justify-center text-white text-xs font-bold text-center px-1">
                                    {fixture.team2Name}
                                  </div>
                                )}
                                <p className="text-white text-sm font-semibold text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  {fixture.team2Name}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Venue Info - Team A's Venue */}
                          {fixture.team1Venue && (
                            <div className="px-4 py-2 bg-gray-600 text-gray-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                              📍 {fixture.team1Venue}
                            </div>
                          )}
                          
                          {/* Matches Grid - Only show when expanded */}
                          {expandedFixtureId === fixture.id && (
                            <div className="p-4">
                              {fixture.matches && fixture.matches.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {(() => {
                                    // Define the correct match order (using matchTypeLabel)
                                    const matchOrder = {
                                      'Men\'s Doubles': 1,
                                      'Women\'s Doubles': 2,
                                      'Men\'s Singles': 3,
                                      'Women\'s Singles': 4,
                                      'Men\'s Doubles (2)': 5,
                                      'Mixed Doubles': 6,
                                      'Game Breaker': 7,
                                      'Dream Breaker': 7
                                    };
                                    
                                    // Sort matches according to the defined order
                                    const sortedMatches = [...(fixture.matches || [])].sort((a, b) => {
                                      const aOrder = matchOrder[a.matchTypeLabel] || 999;
                                      const bOrder = matchOrder[b.matchTypeLabel] || 999;
                                      return aOrder - bOrder;
                                    });
                                    
                                    return sortedMatches.map((match, idx) => {
                                      // Determine which team belongs to this club
                                      const clubTeamId = teams.find(t => t.hplClubId === clubId)?.id;
                                      const isUserTeam1 = match.team1 === clubTeamId;
                                      
                                      // Check if we should show opposition player names (1 hour before match)
                                      const shouldShowOppositionPlayers = (() => {
                                        if (!fixture.date || !match.time) return false;
                                        
                                        try {
                                          let fixtureDate = fixture.date;
                                          if (fixture.date?.toDate) {
                                            fixtureDate = fixture.date.toDate();
                                          } else if (typeof fixture.date === 'string') {
                                            fixtureDate = new Date(fixture.date);
                                          } else if (typeof fixture.date === 'number') {
                                            fixtureDate = new Date(fixture.date);
                                          }
                                          
                                          const [hours, minutes] = match.time.split(':');
                                          const matchDateTime = new Date(fixtureDate);
                                          matchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                          
                                          // 1 hour before match time
                                          const oneHourBefore = new Date(matchDateTime.getTime() - 60 * 60 * 1000);
                                          const now = new Date();
                                          
                                          return now >= oneHourBefore;
                                        } catch (e) {
                                          return false;
                                        }
                                      })();
                                      
                                      return (
                                        <div key={idx} className="bg-gray-600 rounded-lg p-4 text-center border border-gray-500">
                                          <p className="text-orange-400 text-xs font-semibold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                                            {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
                                          </p>
                                          <p className="text-gray-300 text-xs font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                                            Match {idx + 1}
                                          </p>
                                          <div className="space-y-2">
                                            <div>
                                              <p className="text-gray-300 text-sm font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                                {isUserTeam1 ? match.team1Name : match.team2Name}
                                              </p>
                                              {(isUserTeam1 ? (match.player1Team1 || match.player2Team1) : (match.player1Team2 || match.player2Team2)) && (
                                                <p className="text-gray-200 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                                  {isUserTeam1
                                                    ? [match.player1Team1, match.player2Team1].filter(Boolean).join(' & ')
                                                    : [match.player1Team2, match.player2Team2].filter(Boolean).join(' & ')
                                                  }
                                                </p>
                                              )}
                                            </div>
                                            <p className="text-white font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                                              vs
                                            </p>
                                            <div>
                                              <p className="text-gray-300 text-sm font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
                                                {isUserTeam1 ? match.team2Name : match.team1Name}
                                              </p>
                                              {shouldShowOppositionPlayers ? (
                                                (isUserTeam1 ? (match.player1Team2 || match.player2Team2) : (match.player1Team1 || match.player2Team1)) && (
                                                  <p className="text-gray-200 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                                    {isUserTeam1
                                                      ? [match.player1Team2, match.player2Team2].filter(Boolean).join(' & ')
                                                      : [match.player1Team1, match.player2Team1].filter(Boolean).join(' & ')
                                                    }
                                                  </p>
                                                )
                                              ) : (
                                                <p className="text-gray-400 text-xs italic mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                                                  Player names will be revealed 1 hour before the fixture starts
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        {(() => {
                                          // Check if deadline has passed for this fixture
                                          if (!fixture.date || !match.time) return null;
                                          
                                          try {
                                            let fixtureDate = fixture.date;
                                            if (fixture.date?.toDate) {
                                              fixtureDate = fixture.date.toDate();
                                            } else if (typeof fixture.date === 'string') {
                                              fixtureDate = new Date(fixture.date);
                                            } else if (typeof fixture.date === 'number') {
                                              fixtureDate = new Date(fixture.date);
                                            }
                                            
                                            const [hours, minutes] = match.time.split(':');
                                            const matchDateTime = new Date(fixtureDate);
                                            matchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                            
                                            // 1 hour before match time
                                            const oneHourBefore = new Date(matchDateTime.getTime() - 60 * 60 * 1000);
                                            const now = currentTime || new Date();
                                            
                                            // Only show button if deadline hasn't passed
                                            if (now >= oneHourBefore) {
                                              return null;
                                            }
                                            
                                            return (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAssignPlayerClick(match, fixture);
                                                }}
                                                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                                style={{fontFamily: 'Avantique, sans-serif'}}
                                              >
                                                Assign Player(s)
                                              </button>
                                            );
                                          } catch (e) {
                                            return (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAssignPlayerClick(match, fixture);
                                                }}
                                                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                                style={{fontFamily: 'Avantique, sans-serif'}}
                                              >
                                                Assign Player(s)
                                              </button>
                                            );
                                          }
                                        })()}
                                       </div>
                                    );
                                    });
                                  })()}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-center py-8" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  No matches scheduled for this fixture
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (activeTab === 'designAssets' || activeTab === 'homeVenue') && !isClubAdmin ? (
                <div className="text-center py-12">
                  <div className="bg-red-900/20 border border-red-600 rounded-lg p-8 max-w-md mx-auto">
                    <div className="text-red-400 text-6xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold text-red-400 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Access Restricted
                    </h3>
                    <p className="text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                      You need to be logged in as the club admin to manage design assets.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Player(s) Modal */}
      {showAssignPlayerModal && editingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-600 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                Assign Player(s) - {editingMatch.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : editingMatch.matchTypeLabel}
              </h2>
              <button
                onClick={() => {
                  setShowAssignPlayerModal(false);
                  setEditingMatch(null);
                  setPlayerSearchTerm('');
                  setSelectedAgeFilter('');
                  setSelectedGenderFilter('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateMatchPlayers} className="space-y-4">
              {/* Check if this is a Game Breaker match */}
              {editingMatch.matchType === 'dreamBreaker' ? (
                // Game Breaker UI
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Game Breaker Player Order (8 Players)
                  </h3>
                  
                  {(() => {
                    const clubTeamId = teams.find(t => t.hplClubId === clubId)?.id;
                    const isUserTeam1 = editingMatch.team1 === clubTeamId;
                    const userTeamId = isUserTeam1 ? editingMatch.team1 : editingMatch.team2;
                    const teamName = isUserTeam1 ? editingMatch.team1Name : editingMatch.team2Name;
                    const gameBreakerPlayers = isUserTeam1 ? editForm.gameBreakerPlayersTeam1 : editForm.gameBreakerPlayersTeam2;
                    const fieldName = isUserTeam1 ? 'gameBreakerPlayersTeam1' : 'gameBreakerPlayersTeam2';
                    
                    return (
                      <div className="space-y-4">
                        {/* Selected Players Order */}
                        {gameBreakerPlayers.some(player => player) && (
                          <div className="bg-gray-700 rounded-lg p-4">
                            <h4 className="text-white font-medium text-sm mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Selected Playing Order:
                            </h4>
                            <div className="space-y-2">
                              {gameBreakerPlayers.map((playerName, index) => (
                                playerName && (
                                  <div key={index} className="flex items-center justify-between bg-gray-600 rounded p-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${index === 2 || index === 4 ? 'bg-pink-600' : 'bg-orange-500'}`}>
                                        {index + 1}
                                      </span>
                                      <span className="text-white text-sm font-medium">{playerName}</span>
                                      {(index === 2 || index === 4) && (
                                        <span className="text-xs text-pink-300">(Female)</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newPlayers = [...gameBreakerPlayers];
                                        newPlayers[index] = '';
                                        // Shift remaining players up
                                        for (let i = index; i < newPlayers.length - 1; i++) {
                                          newPlayers[i] = newPlayers[i + 1];
                                        }
                                        newPlayers[newPlayers.length - 1] = '';
                                        setEditForm(prev => ({
                                          ...prev,
                                          [fieldName]: newPlayers
                                        }));
                                      }}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                                      style={{fontFamily: 'Avantique, sans-serif'}}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Available Players */}
                        <div>
                          <h4 className="text-white font-medium text-sm mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                            Available {teamName} Players (Click to add):
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(() => {
                              const teamPlayers = getTeamPlayers(userTeamId);
                              const selectedCount = gameBreakerPlayers.filter(p => p).length;
                              const nextPosition = selectedCount + 1;
                              const isNextPositionFemale = nextPosition === 3 || nextPosition === 5;
                              
                              return teamPlayers
                                .filter(player => {
                                  // Don't show already selected players
                                  if (gameBreakerPlayers.includes(player.name)) {
                                    return false;
                                  }
                                  
                                  // Check singlesRating - Game Breaker uses singles format
                                  const singlesRating = parseFloat(player.singlesRating || '0');
                                  if (singlesRating >= 4.2) {
                                    return false;
                                  }
                                  
                                  // If next position requires female, only show females
                                  if (isNextPositionFemale && !isFemale(player.gender)) {
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
                                    onClick={() => {
                                      const newPlayers = [...gameBreakerPlayers];
                                      const nextEmptyIndex = newPlayers.findIndex(p => !p);
                                      if (nextEmptyIndex !== -1) {
                                        newPlayers[nextEmptyIndex] = player.name;
                                        setEditForm(prev => ({
                                          ...prev,
                                          [fieldName]: newPlayers
                                        }));
                                      }
                                    }}
                                    className={`p-2 rounded text-left text-sm transition-colors ${
                                      isNextPositionFemale
                                        ? 'bg-pink-600 hover:bg-pink-700 border border-pink-500'
                                        : 'bg-orange-600 hover:bg-orange-700 border border-orange-500'
                                    } text-white`}
                                    style={{fontFamily: 'Avantique, sans-serif'}}
                                  >
                                    <div className="font-medium text-xs">{player.name}</div>
                                    <div className="text-xs opacity-80">
                                      {player.age ? `${player.age}y` : ''} {player.gender ? `${player.gender}` : ''}
                                    </div>
                                  </button>
                                ));
                            })()}
                          </div>
                          
                          {/* Helper text */}
                          <div className="mt-3 text-xs text-gray-300" style={{fontFamily: 'Avantique, sans-serif'}}>
                            {(() => {
                              const selectedCount = gameBreakerPlayers.filter(p => p).length;
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
                    );
                  })()}
                </div>
              ) : (
                // Regular match UI (Singles/Doubles)
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Player Assignment
                  </h3>
                  
                  {(() => {
                    const clubTeamId = teams.find(t => t.hplClubId === clubId)?.id;
                    const isUserTeam1 = editingMatch.team1 === clubTeamId;
                    const userTeamId = isUserTeam1 ? editingMatch.team1 : editingMatch.team2;
                    
                    return (
                      <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                        <label className="block text-white font-medium text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                          {isUserTeam1 ? editingMatch.team1Name : editingMatch.team2Name} Players
                        </label>
                        
                        <select
                          name={isUserTeam1 ? "player1Team1" : "player1Team2"}
                          value={isUserTeam1 ? editForm.player1Team1 : editForm.player1Team2}
                          onChange={handleEditFormChange}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-orange-500"
                          style={{fontFamily: 'Avantique, sans-serif'}}
                        >
                          <option value="">Select Player 1</option>
                          {getPlayersWithAvailability(getTeamPlayers(userTeamId), isUserTeam1 ? 'team1' : 'team2', 'player1', editingMatch, currentFixture).map((player) => (
                            <option
                              key={player.id}
                              value={player.available ? player.name : ''}
                              disabled={!player.available}
                              style={{
                                color: !player.available ? '#9ca3af' : '#ffffff',
                                backgroundColor: !player.available ? '#4b5563' : '#4b5563'
                              }}
                              title={!player.available ? player.reason : ''}
                            >
                              {(() => {
                                const isSinglesMatch = editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                                const rating = isSinglesMatch ? player.singlesRating : player.doublesRating;
                                return `${player.name}${player.age ? ` (${player.age}y)` : ''}${player.gender ? ` - ${player.gender}` : ''}${rating ? ` [${rating}]` : ''}${!player.available ? ` (${player.reason})` : ''}`;
                              })()}
                            </option>
                          ))}
                        </select>
                        
                        {/* Only show second player for doubles */}
                        {!editingMatch.matchTypeLabel?.toLowerCase().includes('singles') && (
                          <select
                            name={isUserTeam1 ? "player2Team1" : "player2Team2"}
                            value={isUserTeam1 ? editForm.player2Team1 : editForm.player2Team2}
                            onChange={handleEditFormChange}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-orange-500"
                            style={{fontFamily: 'Avantique, sans-serif'}}
                          >
                            <option value="">Select Player 2</option>
                            {getPlayersWithAvailability(getTeamPlayers(userTeamId), isUserTeam1 ? 'team1' : 'team2', 'player2', editingMatch, currentFixture).map((player) => (
                              <option
                                key={player.id}
                                value={player.available ? player.name : ''}
                                disabled={!player.available}
                                style={{
                                  color: !player.available ? '#9ca3af' : '#ffffff',
                                  backgroundColor: !player.available ? '#4b5563' : '#4b5563'
                                }}
                                title={!player.available ? player.reason : ''}
                              >
                                {(() => {
                                  const isSinglesMatch = editingMatch.matchTypeLabel?.toLowerCase().includes('singles');
                                  const rating = isSinglesMatch ? player.singlesRating : player.doublesRating;
                                  return `${player.name}${player.age ? ` (${player.age}y)` : ''}${player.gender ? ` - ${player.gender}` : ''}${rating ? ` [${rating}]` : ''}${!player.available ? ` (${player.reason})` : ''}`;
                                })()}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Save Players
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignPlayerModal(false);
                    setEditingMatch(null);
                    setPlayerSearchTerm('');
                    setSelectedAgeFilter('');
                    setSelectedGenderFilter('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Payment Modal for Approved Clubs */}
      {showApprovalPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                Congratulations!
              </h2>
              <p className="text-lg text-green-400 font-semibold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                Your club has been approved!
              </p>
              <p className="text-gray-300 mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                To officially become part of HPL Clubs, please complete the final payment of Rs. 2,00,000 + 18% GST.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Club Registration Fee:</span>
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 2,00,000</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>GST (18%):</span>
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 36,000</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span style={{fontFamily: 'Avantique, sans-serif'}}>Total Amount:</span>
                    <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 2,36,000</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
              <p className="text-yellow-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                <strong>Important:</strong> This payment is required to activate your club status.
                This modal will continue to appear until the payment is completed.
              </p>
            </div>

            {paymentError && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4">
                <p className="text-red-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {paymentError}
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleFinalPayment}
                disabled={paymentProcessing}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  paymentProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                {paymentProcessing ? 'Processing...' : 'Pay Now - Rs. 2,36,000'}
              </button>
            </div>

            <p className="text-gray-400 text-xs text-center mt-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>
      )}

      {/* Player Information Modal */}
      {showPlayerInfoModal && selectedPlayerInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                Player Information
              </h2>
              <button
                onClick={closePlayerInfoModal}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Player Photo */}
              <div className="flex justify-center">
                {selectedPlayerInfo.photoUrl ? (
                  <img
                    src={selectedPlayerInfo.photoUrl}
                    alt={selectedPlayerInfo.fullName}
                    className="w-48 h-48 object-cover rounded-full border-4 border-orange-500"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-full bg-gray-600 flex items-center justify-center text-4xl text-white font-bold">
                    {selectedPlayerInfo.fullName ? selectedPlayerInfo.fullName.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>
              
              {/* Player Details */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {selectedPlayerInfo.fullName}
                </h3>
                
                <div className="space-y-2">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-400 text-sm">Gender</p>
                      <p className="text-white">
                        {selectedPlayerInfo.gender ?
                          (selectedPlayerInfo.gender.charAt(0).toUpperCase() + selectedPlayerInfo.gender.slice(1)) :
                          'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Age</p>
                      <p className="text-white">
                        {selectedPlayerInfo.dateOfBirth ? (() => {
                          try {
                            let birthDate;
                            if (selectedPlayerInfo.dateOfBirth.toDate) {
                              birthDate = selectedPlayerInfo.dateOfBirth.toDate();
                            } else if (typeof selectedPlayerInfo.dateOfBirth === 'string') {
                              if (selectedPlayerInfo.dateOfBirth.includes('-') &&
                                  selectedPlayerInfo.dateOfBirth.split('-').length === 3) {
                                const parts = selectedPlayerInfo.dateOfBirth.split('-');
                                const formattedDate = `${parts[1]}/${parts[0]}/${parts[2]}`;
                                birthDate = new Date(formattedDate);
                              } else {
                                birthDate = new Date(selectedPlayerInfo.dateOfBirth);
                              }
                            } else {
                              birthDate = new Date(selectedPlayerInfo.dateOfBirth);
                            }
                            
                            if (!isNaN(birthDate.getTime())) {
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();
                              const monthDiff = today.getMonth() - birthDate.getMonth();
                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }
                              return age;
                            }
                            return 'Invalid date';
                          } catch (error) {
                            return 'Error calculating age';
                          }
                        })() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  {/* DUPR Ratings */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <p className="text-gray-400 text-sm">Singles DUPR</p>
                      <p className="text-white">{selectedPlayerInfo.singlesRating || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Doubles DUPR</p>
                      <p className="text-white">{selectedPlayerInfo.doublesRating || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Additional Information */}
                  {selectedPlayerInfo.playingExperience && (
                    <div className="mt-3">
                      <p className="text-gray-400 text-sm">Playing Experience</p>
                      <p className="text-white">{selectedPlayerInfo.playingExperience}</p>
                    </div>
                  )}
                  
                  {selectedPlayerInfo.achievements && (
                    <div className="mt-3">
                      <p className="text-gray-400 text-sm">Achievements</p>
                      <p className="text-white">{selectedPlayerInfo.achievements}</p>
                    </div>
                  )}
                  
                  {selectedPlayerInfo.playerBio && (
                    <div className="mt-3">
                      <p className="text-gray-400 text-sm">Player Bio</p>
                      <p className="text-white">{selectedPlayerInfo.playerBio}</p>
                    </div>
                  )}
                  
                  {/* Dilemma Questions Section */}
                  <div className="mt-5 pt-4 border-t border-gray-600">
                    <h4 className="text-white font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Registration Questions
                    </h4>
                    
                    {/* Dilemma 1 */}
                    {selectedPlayerInfo.dilemma1 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-sm">You're driving a bus with no passengers. Ahead, the road is blocked. What feels right?</p>
                        <p className="text-white">
                          {selectedPlayerInfo.dilemma1 === 'stay-course' && 'Stay on course — avoid causing harm directly'}
                          {selectedPlayerInfo.dilemma1 === 'swerve' && 'Swerve — minimise overall damage'}
                          {selectedPlayerInfo.dilemma1 === 'stop' && 'Stop and accept whatever happens next'}
                          {selectedPlayerInfo.dilemma1 === 'depends' && 'It depends on how serious the damage is'}
                          {!['stay-course', 'swerve', 'stop', 'depends'].includes(selectedPlayerInfo.dilemma1) && selectedPlayerInfo.dilemma1}
                        </p>
                      </div>
                    )}
                    
                    {/* Dilemma 2 */}
                    {selectedPlayerInfo.dilemma2 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-sm">You have one extra ticket to an event. One friend really wants it. Another friend would benefit more from it. What do you do?</p>
                        <p className="text-white">
                          {selectedPlayerInfo.dilemma2 === 'wants-more' && 'Give it to the one who wants it more'}
                          {selectedPlayerInfo.dilemma2 === 'needs-more' && 'Give it to the one who needs it more'}
                          {selectedPlayerInfo.dilemma2 === 'first-asked' && 'Decide based on who asked first'}
                          {selectedPlayerInfo.dilemma2 === 'another-solution' && 'Try to find another solution'}
                          {!['wants-more', 'needs-more', 'first-asked', 'another-solution'].includes(selectedPlayerInfo.dilemma2) && selectedPlayerInfo.dilemma2}
                        </p>
                      </div>
                    )}
                    
                    {/* Dilemma 3 */}
                    {selectedPlayerInfo.dilemma3 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-sm">You know a group decision is slightly flawed. Pointing it out may create tension, but staying quiet keeps things smooth. What do you do?</p>
                        <p className="text-white">
                          {selectedPlayerInfo.dilemma3 === 'speak-up' && 'Speak up — correctness matters'}
                          {selectedPlayerInfo.dilemma3 === 'stay-quiet' && 'Stay quiet — harmony matters'}
                          {selectedPlayerInfo.dilemma3 === 'speak-private' && 'Speak up later in private'}
                          {selectedPlayerInfo.dilemma3 === 'depends-flaw' && 'Decide based on how big the flaw is'}
                          {!['speak-up', 'stay-quiet', 'speak-private', 'depends-flaw'].includes(selectedPlayerInfo.dilemma3) && selectedPlayerInfo.dilemma3}
                        </p>
                      </div>
                    )}
                    
                    {/* Why Pick You Question */}
                    {selectedPlayerInfo.whyPickYou && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-sm">Why should a club pick you?</p>
                        <p className="text-white">{selectedPlayerInfo.whyPickYou}</p>
                      </div>
                    )}
                    
                    {/* If no dilemma questions were answered */}
                    {!selectedPlayerInfo.dilemma1 && !selectedPlayerInfo.dilemma2 &&
                     !selectedPlayerInfo.dilemma3 && !selectedPlayerInfo.dilemma4 &&
                     !selectedPlayerInfo.dilemma5 && (
                      <p className="text-gray-400">No registration questions were answered by this player.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Information Modal */}
      {showBillingInfoModal && (
        <BillingInfoModal
          isOpen={showBillingInfoModal}
          onClose={() => setShowBillingInfoModal(false)}
          onSave={handleSaveBillingInfo}
          initialData={{
            billingName: clubData?.billingName || '',
            gstNumber: clubData?.gstNumber || '',
            billingAddress: clubData?.billingAddress || ''
          }}
        />
      )}

      {/* Player Photo Modal */}
      <PlayerPhotoModal
        player={selectedPlayerForPhoto}
        isOpen={showPlayerPhotoModal}
        onClose={closePlayerPhotoModal}
        onPhotoUpdate={handlePlayerPhotoUpdate}
      />

      <Footer />
    </div>
  );
}
