import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import googleSheetsService from '../services/googleSheetsService';

export default function AdminClubs() {
  const [activeTab, setActiveTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]); // Store all players for filtering
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedClub, setSelectedClub] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sheetsActive, setSheetsActive] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    minDuprRating: '',
    maxDuprRating: '',
    minAge: '',
    maxAge: ''
  });

  // Fetch player registrations from Firebase
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const playersQuery = query(
          collection(db, 'clubs-players'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(playersQuery);
        let playersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // If no data from Firebase, use demo data
        if (playersData.length === 0) {
          playersData = [
            {
              id: '1',
              fullName: 'John Doe',
              emailId: 'john.doe@example.com',
              duprRating: '3.8',
              doublesRating: '3.8',
              singlesRating: '3.6',
              duprId: 'DUPR123456',
              dateOfBirth: '15-06-1995',
              gender: 'male',
              createdAt: new Date(),
              photoUrl: 'https://example.com/john-doe.jpg',
              mobileNumber: '+91 9876543210',
              aadharCardUrl: 'https://example.com/john-doe-aadhar.pdf'
            },
            {
              id: '2',
              fullName: 'Jane Smith',
              emailId: 'jane.smith@example.com',
              duprRating: '4.1',
              doublesRating: '4.1',
              singlesRating: '4.0',
              duprId: 'DUPR789012',
              dateOfBirth: '22-03-1998',
              gender: 'female',
              createdAt: new Date()
            },
            {
              id: '3',
              fullName: 'Mike Johnson',
              emailId: 'mike.johnson@example.com',
              duprRating: '4.3',
              doublesRating: '4.3',
              singlesRating: '4.2',
              duprId: 'DUPR345678',
              dateOfBirth: '10-12-1992',
              gender: 'male',
              createdAt: new Date()
            },
            {
              id: '4',
              fullName: 'Sarah Wilson',
              emailId: 'sarah.wilson@example.com',
              duprRating: '4.6',
              doublesRating: '4.6',
              singlesRating: '4.4',
              duprId: 'DUPR901234',
              dateOfBirth: '05-08-1996',
              gender: 'female',
              createdAt: new Date()
            },
            // Add more demo players to test pagination
            {
              id: '5',
              fullName: 'David Lee',
              emailId: 'david.lee@example.com',
              duprRating: '3.5',
              doublesRating: '3.5',
              singlesRating: '3.3',
              duprId: 'DUPR567890',
              dateOfBirth: '08-11-1990',
              gender: 'male',
              createdAt: new Date()
            },
            {
              id: '6',
              fullName: 'Emily Chen',
              emailId: 'emily.chen@example.com',
              duprRating: '4.8',
              doublesRating: '4.8',
              singlesRating: '4.7',
              duprId: 'DUPR654321',
              dateOfBirth: '30-04-1994',
              gender: 'female',
              createdAt: new Date()
            }
          ];
        }

        // Use player data as is, no DUPR fetching
        setAllPlayers(playersData);
        setCurrentPage(1); // Reset to first page when fetching new data
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load player data');
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchClubs = async () => {
      try {
        setLoading(true);
        // Fetch clubs from hpl-clubs collection
        const clubsQuery = query(
          collection(db, 'hpl-clubs'),
          orderBy('submittedAt', 'desc')
        );
        const snapshot = await getDocs(clubsQuery);
        const clubsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const clubData = {
              id: docSnap.id,
              ...docSnap.data()
            };

            // Count players for this club by checking clubs-players collection
            try {
              const playersQuery = query(
                collection(db, 'clubs-players'),
                where('clubId', '==', docSnap.id)
              );
              const playersSnapshot = await getDocs(playersQuery);
              clubData.playerCount = playersSnapshot.size;
            } catch (error) {
              console.warn('Error counting players for club:', docSnap.id, error);
              clubData.playerCount = 0;
            }

            return clubData;
          })
        );
        setClubs(clubsData);
      } catch (err) {
        console.error('Error fetching clubs:', err);
        setError('Failed to load club data');
        // For demo purposes, set some dummy data if Firebase fails
        setClubs([
          {
            id: '1',
            proposedClubName: 'Hyderabad Smashers',
            primaryOwnerName: 'Alex Johnson',
            phoneNumber: '+91 9876543210',
            managerEmailId: 'alex@example.com',
            playerCount: 15,
            status: 'pending',
            submittedAt: new Date()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'players') {
      fetchPlayers();
    } else {
      fetchClubs();
    }
  }, [activeTab]);

  // Google Sheets integration for player data
  useEffect(() => {
    // Set up event listener for Google Sheets updates
    const handleSheetDataUpdated = (event) => {
      const { sheetUrl } = event.detail;
      setSheetUrl(sheetUrl);
      setSheetsLoading(false);
      setSheetsActive(true);
    };

    window.addEventListener('playerSheetDataUpdated', handleSheetDataUpdated);

    return () => {
      window.removeEventListener('playerSheetDataUpdated', handleSheetDataUpdated);
      // Clean up Google Sheets listener when component unmounts
      googleSheetsService.stopListeningToPlayers();
    };
  }, []);

  // Function to handle exporting player data to Google Sheets
  const handleExportToGoogleSheets = () => {
    setShowSheetsModal(true);
    
    if (!sheetsActive) {
      setSheetsLoading(true);
      // Start listening to player data
      googleSheetsService.startListeningToPlayers();
    } else {
      // If already active, just get the current URL
      setSheetUrl(googleSheetsService.getPlayerSheetUrl());
    }
  };

  // Function to download CSV for manual import
  const handleDownloadCSV = () => {
    googleSheetsService.downloadPlayerCSV();
  };

  // Handle club approval
  const handleApproveClub = async (clubId) => {
    setActionLoading(prev => ({ ...prev, [clubId]: 'approving' }));
    try {
      const clubRef = doc(db, 'hpl-clubs', clubId);
      await updateDoc(clubRef, {
        status: 'approved',
        approvedAt: new Date()
      });
      
      // Update local state
      setClubs(prev => prev.map(club =>
        club.id === clubId
          ? { ...club, status: 'approved', approvedAt: new Date() }
          : club
      ));
    } catch (error) {
      console.error('Error approving club:', error);
      setError('Failed to approve club');
    } finally {
      setActionLoading(prev => ({ ...prev, [clubId]: null }));
    }
  };

  // Handle club rejection
  const handleRejectClub = async (clubId) => {
    setActionLoading(prev => ({ ...prev, [clubId]: 'rejecting' }));
    try {
      const clubRef = doc(db, 'hpl-clubs', clubId);
      await updateDoc(clubRef, {
        status: 'rejected',
        rejectedAt: new Date()
      });
      
      // Update local state
      setClubs(prev => prev.map(club =>
        club.id === clubId
          ? { ...club, status: 'rejected', rejectedAt: new Date() }
          : club
      ));
    } catch (error) {
      console.error('Error rejecting club:', error);
      setError('Failed to reject club');
    } finally {
      setActionLoading(prev => ({ ...prev, [clubId]: null }));
    }
  };

  // Handle show club info
  const handleShowInfo = (club) => {
    setSelectedClub(club);
    setShowInfoModal(true);
  };

  // Handle view player details
  const handleViewPlayerDetails = useCallback((player) => {
    console.log('View player details clicked:', player);
    
    // Ensure player is not null or undefined
    if (!player) {
      console.error('Attempted to view details of null/undefined player');
      return;
    }

    setSelectedPlayer(player);
    setShowPlayerDetailsModal(true);
  }, []);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    
    try {
      const today = new Date();
      let birth;
      
      // Handle DD-MM-YYYY format from Firebase
      if (typeof dateOfBirth === 'string' && dateOfBirth.includes('-')) {
        const parts = dateOfBirth.split('-');
        if (parts.length === 3) {
          // Convert DD-MM-YYYY to MM/DD/YYYY for proper Date parsing
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          birth = new Date(`${month}/${day}/${year}`);
        } else {
          birth = new Date(dateOfBirth);
        }
      } else {
        birth = new Date(dateOfBirth);
      }
      
      if (isNaN(birth.getTime())) {
        return 'N/A';
      }
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };

  const formatGender = (gender) => {
    if (!gender) return 'N/A';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Filter players based on search and filter criteria
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const nameMatches = player.fullName?.toLowerCase().includes(searchLower) || false;
      const emailMatches = player.emailId?.toLowerCase().includes(searchLower) || false;
      const duprIdMatches = player.duprId?.toLowerCase().includes(searchLower) || false;
      const phoneMatches = player.mobileNumber?.includes(searchQuery) || false;
      const searchCondition = searchQuery === '' || nameMatches || emailMatches || duprIdMatches || phoneMatches;
      
      // Gender filter
      const genderCondition = filters.gender === '' || player.gender?.toLowerCase() === filters.gender.toLowerCase();
      
      // DUPR Rating filter
      const duprRating = parseFloat(player.doublesRating || player.duprRating || '0');
      const minRating = filters.minDuprRating === '' ? 0 : parseFloat(filters.minDuprRating);
      const maxRating = filters.maxDuprRating === '' ? 7 : parseFloat(filters.maxDuprRating);
      const ratingCondition = (isNaN(duprRating) || (duprRating >= minRating && duprRating <= maxRating));
      
      // Age filter
      const age = calculateAge(player.dateOfBirth);
      const ageValue = age === 'N/A' ? 0 : parseInt(age);
      const minAge = filters.minAge === '' ? 0 : parseInt(filters.minAge);
      const maxAge = filters.maxAge === '' ? 100 : parseInt(filters.maxAge);
      const ageCondition = (age === 'N/A' || (ageValue >= minAge && ageValue <= maxAge));
      
      return searchCondition && genderCondition && ratingCondition && ageCondition;
    });
  }, [allPlayers, searchQuery, filters]);
  
  // Update players state whenever filtered results change or pagination changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + pageSize);
    setPlayers(paginatedPlayers);
  }, [filteredPlayers, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredPlayers.length / pageSize);
  }, [filteredPlayers, pageSize]);
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  // Handle search and filter changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  const resetFilters = () => {
    setSearchQuery('');
    setFilters({
      gender: '',
      minDuprRating: '',
      maxDuprRating: '',
      minAge: '',
      maxAge: ''
    });
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clubs Management</h1>
          <p className="text-gray-600">Manage HPL clubs and player registrations</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('players')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'players'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Players
              </button>
              <button
                onClick={() => setActiveTab('clubs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clubs'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Clubs
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Players Tab */}
            {activeTab === 'players' && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Player Registrations</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        Players who have registered for the HPL Club League
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleExportToGoogleSheets}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Export to Google Sheets
                      </button>
                      <span className="text-sm text-gray-400">
                        Showing {filteredPlayers.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-{Math.min(currentPage * pageSize, filteredPlayers.length)} of {filteredPlayers.length} players
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="px-6 py-4 bg-gray-900">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="search" className="block text-sm font-medium text-gray-400 mb-1">Search</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          id="search"
                          className="bg-gray-800 block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          placeholder="Search name, email, DUPR ID..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="gender-filter" className="block text-sm font-medium text-gray-400 mb-1">Gender</label>
                      <select
                        id="gender-filter"
                        name="gender"
                        className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        value={filters.gender}
                        onChange={handleFilterChange}
                      >
                        <option value="">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label htmlFor="min-rating" className="block text-sm font-medium text-gray-400 mb-1">Min DUPR Rating</label>
                      <input
                        type="number"
                        id="min-rating"
                        name="minDuprRating"
                        min="0"
                        max="7"
                        step="0.1"
                        className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Min"
                        value={filters.minDuprRating}
                        onChange={handleFilterChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="max-rating" className="block text-sm font-medium text-gray-400 mb-1">Max DUPR Rating</label>
                      <input
                        type="number"
                        id="max-rating"
                        name="maxDuprRating"
                        min="0"
                        max="7"
                        step="0.1"
                        className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Max"
                        value={filters.maxDuprRating}
                        onChange={handleFilterChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="min-age" className="block text-sm font-medium text-gray-400 mb-1">Min Age</label>
                      <input
                        type="number"
                        id="min-age"
                        name="minAge"
                        min="0"
                        max="100"
                        className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Min"
                        value={filters.minAge}
                        onChange={handleFilterChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="max-age" className="block text-sm font-medium text-gray-400 mb-1">Max Age</label>
                      <input
                        type="number"
                        id="max-age"
                        name="maxAge"
                        min="0"
                        max="100"
                        className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Max"
                        value={filters.maxAge}
                        onChange={handleFilterChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={resetFilters}
                      className="bg-gray-700 text-gray-300 px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
                
                {players.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-400">No player registrations found</p>
                  </div>
                ) : (
                  <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Player Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            DUPR ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Doubles Rating
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Singles Rating
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Mobile Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Age
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Gender
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {players.map((player) => (
                          <tr key={player.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {player.photoUrl ? (
                                    <img
                                      className="h-10 w-10 rounded-full object-cover"
                                      src={player.photoUrl}
                                      alt={player.fullName || 'Player'}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div className={`h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ${player.photoUrl ? 'hidden' : ''}`}>
                                    <span className="text-white font-medium text-sm">
                                      {player.fullName ? player.fullName.charAt(0).toUpperCase() : 'N'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-white">
                                    {player.fullName || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {player.emailId || 'No email'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {player.duprId || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                player.doublesRating && player.doublesRating !== 'N/A' && player.doublesRating !== 'NA'
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {player.doublesRating || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                player.singlesRating && player.singlesRating !== 'N/A' && player.singlesRating !== 'NA'
                                  ? 'bg-purple-900 text-purple-200'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {player.singlesRating || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {player.mobileNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {calculateAge(player.dateOfBirth) || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {formatGender(player.gender)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewPlayerDetails(player)}
                                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">
                          Showing page {currentPage} of {totalPages}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                        >
                          &laquo; First
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                        >
                          &lsaquo; Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Show 5 page buttons centered around current page
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          if (pageNum <= totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 rounded-md ${
                                  currentPage === pageNum
                                    ? 'bg-green-700 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                        >
                          Next &rsaquo;
                        </button>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                        >
                          Last &raquo;
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}

            {/* Clubs Tab */}
            {activeTab === 'clubs' && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-white">Club Registrations</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Clubs that have registered for the HPL Club League
                  </p>
                </div>
                
                {clubs.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-400">No club registrations found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Club Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Owner Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Contact Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Club Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {clubs.map((club) => (
                          <tr key={club.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {club.proposedClubName ? club.proposedClubName.charAt(0).toUpperCase() : 'C'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-white">
                                    {club.proposedClubName || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {club.primaryOwnerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div>
                                <div className="text-white font-medium">
                                  {club.phoneNumber || 'N/A'}
                                </div>
                                <div className="text-gray-400">
                                  {club.managerEmailId || club.emailId || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200">
                                {club.playerCount || 0} players
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                club.status === 'active'
                                  ? 'bg-green-900 text-green-200'
                                  : club.status === 'approved'
                                  ? 'bg-orange-900 text-orange-200'
                                  : club.status === 'rejected'
                                  ? 'bg-red-900 text-red-200'
                                  : 'bg-yellow-900 text-yellow-200'
                              }`}>
                                {club.status === 'active' ? 'Active' :
                                 club.status === 'approved' ? 'Pending Payment' :
                                 club.status === 'rejected' ? 'Rejected' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleShowInfo(club)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Info
                                </button>
                                {(!club.status || club.status === 'pending') && (
                                  <>
                                    <button
                                      onClick={() => handleApproveClub(club.id)}
                                      disabled={actionLoading[club.id] === 'approving'}
                                      className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                                    >
                                      {actionLoading[club.id] === 'approving' ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleRejectClub(club.id)}
                                      disabled={actionLoading[club.id] === 'rejecting'}
                                      className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                    >
                                      {actionLoading[club.id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Club Info Modal */}
        {showInfoModal && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Club Information</h3>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6 text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Club Name</label>
                      <p className="text-white">{selectedClub.proposedClubName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Primary Owner</label>
                      <p className="text-white">{selectedClub.primaryOwnerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                      <p className="text-white">{selectedClub.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white">{selectedClub.managerEmailId || selectedClub.emailId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Community Manager</label>
                      <p className="text-white">{selectedClub.communityManagerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Manager Phone</label>
                      <p className="text-white">{selectedClub.managerPhoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Club Naming Format</label>
                      <p className="text-white">{selectedClub.clubNamingFormat || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Player Count</label>
                      <p className="text-white">{selectedClub.playerCount || 0} players</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Community Existence</label>
                      <p className="text-white">
                        {selectedClub.communityExistence === 'less-than-6-months' ? 'Less than 6 months' :
                         selectedClub.communityExistence === '6-12-months' ? '6-12 months' :
                         selectedClub.communityExistence === '1-2-years' ? '1-2 years' :
                         selectedClub.communityExistence === 'more-than-2-years' ? 'More than 2 years' : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Venue Name</label>
                      <p className="text-white">{selectedClub.venueName || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Club Philosophy */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Club Philosophy</h4>
                  
                  {selectedClub.clubDescription && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Club Structure</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">
                        {selectedClub.clubDescription === 'independent-collective' ? 'Independent Collective' :
                         selectedClub.clubDescription === 'community-based' ? 'Community Based' :
                         selectedClub.clubDescription === 'academy-affiliated' ? 'Academy Affiliated' :
                         selectedClub.clubDescription}
                      </p>
                    </div>
                  )}
                  
                  {selectedClub.clubUSP && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Club USP</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.clubUSP}</p>
                    </div>
                  )}
                  
                  {selectedClub.uniqueCulture && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Unique Culture</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.uniqueCulture}</p>
                    </div>
                  )}
                  
                  {selectedClub.clubFeeling && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Club Feeling</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.clubFeeling}</p>
                    </div>
                  )}
                  
                  {selectedClub.whyJoinLeague && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Why Join League</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.whyJoinLeague}</p>
                    </div>
                  )}
                  
                  {selectedClub.winningVsCulture && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Winning vs Culture</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.winningVsCulture}</p>
                    </div>
                  )}
                  
                  {selectedClub.rolesResponsibilities && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Roles & Responsibilities</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">
                        {selectedClub.rolesResponsibilities === 'flexible' ? 'Flexible' :
                         selectedClub.rolesResponsibilities === 'structured' ? 'Structured' :
                         selectedClub.rolesResponsibilities}
                      </p>
                    </div>
                  )}
                </div>

                {/* Player & Club Benefits */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Player & Club Benefits</h4>
                  
                  {selectedClub.playerBenefits && selectedClub.playerBenefits.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Player Benefits</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedClub.playerBenefits.map((benefit, index) => (
                          <span key={index} className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded-full">
                            {benefit === 'socials' ? 'Socials' :
                             benefit === 'coaching' ? 'Coaching' :
                             benefit === 'equipment' ? 'Equipment' :
                             benefit === 'venue-access' ? 'Venue Access' :
                             benefit === 'tournaments' ? 'Tournaments' :
                             benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedClub.otherBenefits && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Other Benefits</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.otherBenefits}</p>
                    </div>
                  )}
                  
                  {selectedClub.playerSelectionCriteria && selectedClub.playerSelectionCriteria.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Player Selection Criteria</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedClub.playerSelectionCriteria.map((criteria, index) => (
                          <span key={index} className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded-full">
                            {criteria === 'performance' ? 'Performance' :
                             criteria === 'attitude-team-player' ? 'Attitude & Team Player' :
                             criteria === 'commitment' ? 'Commitment' :
                             criteria === 'diversity-inclusion' ? 'Diversity & Inclusion' :
                             criteria}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedClub.longTermGoals && selectedClub.longTermGoals.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Long Term Goals</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedClub.longTermGoals.map((goal, index) => (
                          <span key={index} className="bg-green-900 text-green-200 text-xs px-2 py-1 rounded-full">
                            {goal === 'player-development' ? 'Player Development' :
                             goal === 'social-impact' ? 'Social Impact' :
                             goal === 'competitive-success' ? 'Competitive Success' :
                             goal === 'community-growth' ? 'Community Growth' :
                             goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Venue Information */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Venue Information</h4>
                  
                  {selectedClub.venueAccess && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Venue Access</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">
                        {selectedClub.venueAccess === 'secured' ? 'Secured' :
                         selectedClub.venueAccess === 'in-progress' ? 'In Progress' :
                         selectedClub.venueAccess === 'not-secured' ? 'Not Secured' :
                         selectedClub.venueAccess}
                      </p>
                    </div>
                  )}
                  
                  {selectedClub.additionalInfo && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Additional Information</label>
                      <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedClub.additionalInfo}</p>
                    </div>
                  )}
                </div>
                
                {/* Registration Information */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Registration Information</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Registration Date</label>
                    <p className="text-white">{formatDate(selectedClub.submittedAt)}</p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedClub.status === 'active'
                        ? 'bg-green-900 text-green-200'
                        : selectedClub.status === 'approved'
                        ? 'bg-orange-900 text-orange-200'
                        : selectedClub.status === 'rejected'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {selectedClub.status === 'active' ? 'Active' :
                       selectedClub.status === 'approved' ? 'Pending Payment' :
                       selectedClub.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                  
                  {selectedClub.finalDeclarations && selectedClub.finalDeclarations.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Declarations Accepted</label>
                      <div className="space-y-2 bg-gray-700 p-3 rounded-lg">
                        {selectedClub.finalDeclarations.includes('application-not-guarantee') && (
                          <p className="text-white text-sm">✓ Application does not guarantee acceptance</p>
                        )}
                        {selectedClub.finalDeclarations.includes('uphold-rules-values') && (
                          <p className="text-white text-sm">✓ Will uphold league rules and values</p>
                        )}
                        {selectedClub.finalDeclarations.includes('governing-body-discretion') && (
                          <p className="text-white text-sm">✓ Governing body has final discretion</p>
                        )}
                        {selectedClub.finalDeclarations.includes('pay-registration-fee') && (
                          <p className="text-white text-sm">✓ Will pay registration fee</p>
                        )}
                        {selectedClub.finalDeclarations.includes('pay-club-fee-if-approved') && (
                          <p className="text-white text-sm">✓ Will pay club fee if approved</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedClub.paymentInfo && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Payment Information</label>
                      <div className="bg-gray-700 p-3 rounded-lg space-y-2">
                        <p className="text-white text-sm">
                          <span className="font-medium">Amount:</span> {selectedClub.paymentInfo.amount ? `₹${selectedClub.paymentInfo.amount / 100}` : 'N/A'}
                        </p>
                        <p className="text-white text-sm">
                          <span className="font-medium">Payment ID:</span> {selectedClub.paymentInfo.paymentId || 'N/A'}
                        </p>
                        <p className="text-white text-sm">
                          <span className="font-medium">Payment Method:</span> {selectedClub.paymentInfo.paymentMethod || 'N/A'}
                        </p>
                        <p className="text-white text-sm">
                          <span className="font-medium">Payment Date:</span> {selectedClub.paymentInfo.paidAt ? formatDate(selectedClub.paymentInfo.paidAt) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {(!selectedClub.status || selectedClub.status === 'pending') && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveClub(selectedClub.id);
                        setShowInfoModal(false);
                      }}
                      disabled={actionLoading[selectedClub.id] === 'approving'}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading[selectedClub.id] === 'approving' ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        handleRejectClub(selectedClub.id);
                        setShowInfoModal(false);
                      }}
                      disabled={actionLoading[selectedClub.id] === 'rejecting'}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading[selectedClub.id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Details Modal */}
        {showPlayerDetailsModal && selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Player Registration Details</h3>
                <button
                  onClick={() => setShowPlayerDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Photo */}
                <div className="flex flex-col items-center">
                  <h4 className="text-lg font-semibold text-white mb-4">Player Photo</h4>
                  {selectedPlayer.photoUrl ? (
                    <img 
                      src={selectedPlayer.photoUrl} 
                      alt={`${selectedPlayer.fullName}'s photo`} 
                      className="w-48 h-48 object-cover rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                      No Photo Available
                    </div>
                  )}
                </div>

                {/* Player Details */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Full Name</label>
                      <p className="text-white">{selectedPlayer.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Email</label>
                      <p className="text-white">{selectedPlayer.emailId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Mobile Number</label>
                      <p className="text-white">{selectedPlayer.mobileNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Date of Birth</label>
                      <p className="text-white">{selectedPlayer.dateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Gender</label>
                      <p className="text-white">{formatGender(selectedPlayer.gender)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DUPR Ratings & Reliability Scores */}
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">DUPR Ratings & Reliability</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Singles Rating</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.singlesRating && selectedPlayer.singlesRating !== 'N/A' && selectedPlayer.singlesRating !== 'NA'
                          ? 'bg-purple-900 text-purple-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {selectedPlayer.singlesRating || 'N/A'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Doubles Rating</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.doublesRating && selectedPlayer.doublesRating !== 'N/A' && selectedPlayer.doublesRating !== 'NA'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {selectedPlayer.doublesRating || 'N/A'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Singles Reliability Score</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.singlesReliabilityScore && selectedPlayer.singlesReliabilityScore !== 'N/A' && selectedPlayer.singlesReliabilityScore !== 'NA'
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {selectedPlayer.singlesReliabilityScore || 'N/A'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Doubles Reliability Score</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.doublesReliabilityScore && selectedPlayer.doublesReliabilityScore !== 'N/A' && selectedPlayer.doublesReliabilityScore !== 'NA'
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {selectedPlayer.doublesReliabilityScore || 'N/A'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">DUPR ID</label>
                    <p className="text-white font-medium mt-1">{selectedPlayer.duprId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Registration Questions & Answers */}
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Registration Questions</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Dilemma 1: You're driving a bus with no passengers. Ahead, the road is blocked.</label>
                    <p className="text-white font-medium mt-1">
                      {selectedPlayer.dilemma1 === 'stay-course' ? 'Stay on course — avoid causing harm directly' :
                       selectedPlayer.dilemma1 === 'swerve' ? 'Swerve — minimise overall damage' :
                       selectedPlayer.dilemma1 === 'stop' ? 'Stop and accept whatever happens next' :
                       selectedPlayer.dilemma1 === 'depends' ? 'It depends on how serious the damage is' : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Dilemma 2: You have one extra ticket to an event.</label>
                    <p className="text-white font-medium mt-1">
                      {selectedPlayer.dilemma2 === 'wants-more' ? 'Give it to the one who wants it more' :
                       selectedPlayer.dilemma2 === 'needs-more' ? 'Give it to the one who needs it more' :
                       selectedPlayer.dilemma2 === 'first-asked' ? 'Decide based on who asked first' :
                       selectedPlayer.dilemma2 === 'another-solution' ? 'Try to find another solution' : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Dilemma 3: You know a group decision is slightly flawed.</label>
                    <p className="text-white font-medium mt-1">
                      {selectedPlayer.dilemma3 === 'speak-up' ? 'Speak up — correctness matters' :
                       selectedPlayer.dilemma3 === 'stay-quiet' ? 'Stay quiet — harmony matters' :
                       selectedPlayer.dilemma3 === 'speak-private' ? 'Speak up later in private' :
                       selectedPlayer.dilemma3 === 'depends-flaw' ? 'Decide based on how big the flaw is' : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">League Commitment:</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.leagueCommitment ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}>
                        {selectedPlayer.leagueCommitment ? 'Committed' : 'Not Committed'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Registration Fee:</label>
                    <p className="text-white font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPlayer.registrationFee ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}>
                        {selectedPlayer.registrationFee ? 'Paid' : 'Not Paid'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Why Should We Pick You?</label>
                    <p className="text-white mt-1 bg-gray-700 p-3 rounded-lg text-sm">{selectedPlayer.whyPickYou || 'No answer provided'}</p>
                  </div>
                </div>
              </div>

              {/* Aadhar Card Attachment */}
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Aadhar Card</h4>
                {selectedPlayer.aadharUrl ? (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <a
                      href={selectedPlayer.aadharUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 2h-2m-2-2v6m-4 0h6m0 0v2" />
                      </svg>
                      View Aadhar Card
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-400">No Aadhar Card Uploaded</p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPlayerDetailsModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Sheets Modal */}
        {showSheetsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Export to Google Sheets</h3>
                <button
                  onClick={() => setShowSheetsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {sheetsLoading ? (
                  <div className="flex flex-col items-center py-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                    <p className="text-white">Setting up Google Sheets integration...</p>
                    <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Player Data Google Sheet</h4>
                      {sheetsActive ? (
                        <div>
                          <p className="text-gray-300 mb-2">
                            Your Google Sheet for player data is ready. It will be automatically updated whenever new players register.
                          </p>
                          <div className="bg-gray-900 p-3 rounded flex items-center">
                            <input
                              type="text"
                              value={sheetUrl}
                              readOnly
                              className="bg-transparent text-green-400 flex-grow outline-none"
                            />
                            <a
                              href={sheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm ml-2"
                            >
                              Open Sheet
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-300">
                          No Google Sheet has been created yet. Click the button below to download player data as CSV.
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Manual CSV Download</h4>
                      <p className="text-gray-300 mb-4">
                        You can also download a CSV file with player data for manual importing into Google Sheets or any spreadsheet application.
                      </p>
                      <button
                        onClick={handleDownloadCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download CSV
                      </button>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Import Instructions</h4>
                      <ol className="list-decimal list-inside text-gray-300 space-y-2">
                        {googleSheetsService.getPlayerGoogleSheetsInstructions().steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSheetsModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}