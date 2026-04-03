import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where, addDoc, serverTimestamp, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import googleSheetsService from '../services/googleSheetsService';
import CloudinaryImageUpload from '../components/CloudinaryImageUpload';
import OptimizedImage from '../components/OptimizedImage';
import ExcelJS from 'exceljs';

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
  const [playerImageUpdateLoading, setPlayerImageUpdateLoading] = useState(false);
  const [showRecruitedPlayersModal, setShowRecruitedPlayersModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [recruitedPlayers, setRecruitedPlayers] = useState([]);
  const [showAssignClubModal, setShowAssignClubModal] = useState(false);
  const [playerClubs, setPlayerClubs] = useState({}); // Store player's club info
  const [sheetsActive, setSheetsActive] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [ownerImages, setOwnerImages] = useState([]);
  const [clubLogo, setClubLogo] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [ownerNames, setOwnerNames] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [playerInterests, setPlayerInterests] = useState([]);
  const [allPlayerInterests, setAllPlayerInterests] = useState([]); // Store all interests for filtering
  const [recruitmentRequests, setRecruitmentRequests] = useState([]);
  const [interestActionLoading, setInterestActionLoading] = useState({});
  const [showDeleteAllInterestsModal, setShowDeleteAllInterestsModal] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(30);
  const [interestsPage, setInterestsPage] = useState(1);
  const [interestsPageSize] = useState(30);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [interestsSearchQuery, setInterestsSearchQuery] = useState('');
  const [selectedClubFilter, setSelectedClubFilter] = useState('');
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

    // Fetch player's club info
    const fetchPlayerClubs = async () => {
      try {
        const playersQuery = query(collection(db, 'clubs-players'));
        const snapshot = await getDocs(playersQuery);
        const playerClubsData = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.clubId || data.club || data.recruitedBy) {
            playerClubsData[doc.id] = {
              clubId: data.clubId || data.club || data.recruitedBy,
              clubName: null // Will be populated later
            };
          }
        });
  
        // Now fetch club names for each club ID
        const clubIds = new Set(Object.values(playerClubsData).map(info => info.clubId));
        for (const clubId of clubIds) {
          try {
            const clubDoc = await getDocs(query(
              collection(db, 'hpl-clubs'),
              where('__name__', '==', clubId)
            ));
            
            if (!clubDoc.empty) {
              const club = clubDoc.docs[0].data();
              const clubName = club.proposedClubName || 'Unknown Club';
              
              // Update all player entries with this club ID
              for (const playerId in playerClubsData) {
                if (playerClubsData[playerId].clubId === clubId) {
                  playerClubsData[playerId].clubName = clubName;
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching club details for ${clubId}:`, error);
          }
        }
        
        setPlayerClubs(playerClubsData);
      } catch (err) {
        console.error('Error fetching player club associations:', err);
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
              // First try with clubId field
              const playersQueryById = query(
                collection(db, 'clubs-players'),
                where('clubId', '==', docSnap.id)
              );
              const playerSnapshotById = await getDocs(playersQueryById);
              
              // Also check with club field which might contain the club ID
              const playersQueryByClub = query(
                collection(db, 'clubs-players'),
                where('club', '==', docSnap.id)
              );
              const playerSnapshotByClub = await getDocs(playersQueryByClub);
              
              // Check recruitedBy field as requested
              const playersQueryByRecruitedBy = query(
                collection(db, 'clubs-players'),
                where('recruitedBy', '==', docSnap.id)
              );
              const playerSnapshotByRecruitedBy = await getDocs(playersQueryByRecruitedBy);
              
              // Calculate the total count (avoid duplicates by using a Set)
              const playerIds = new Set();
              playerSnapshotById.docs.forEach(doc => playerIds.add(doc.id));
              playerSnapshotByClub.docs.forEach(doc => playerIds.add(doc.id));
              playerSnapshotByRecruitedBy.docs.forEach(doc => playerIds.add(doc.id));
              
              clubData.playerCount = playerIds.size;
              
              // Log for debugging
              console.log(`Club ${docSnap.id} (${clubData.proposedClubName}) has ${clubData.playerCount} players`);
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
      fetchPlayerClubs();
      // Also fetch clubs when in players tab to have them available for assignment
      fetchClubs();
    } else if (activeTab === 'clubs') {
      fetchClubs();
    } else if (activeTab === 'interests') {
      fetchPlayerInterests();
    }
  }, [activeTab]);

  // Fetch player interests for the club
  const fetchPlayerInterests = async () => {
    try {
      setLoading(true);
      
      // For admin view, fetch all player interests
      const interestsQuery = query(
        collection(db, 'player-interests'),
        orderBy('createdAt', 'desc')
      );
      const interestsSnapshot = await getDocs(interestsQuery);
      
      if (interestsSnapshot.empty) {
        setAllPlayerInterests([]);
      } else {
        // Get club details for each interest
        const clubIds = new Set();
        interestsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.clubId) clubIds.add(data.clubId);
        });
        
        // Fetch club details
        const clubDetails = {};
        for (const clubId of clubIds) {
          try {
            const clubDoc = await getDocs(query(
              collection(db, 'hpl-clubs'),
              where('__name__', '==', clubId)
            ));
            
            if (!clubDoc.empty) {
              const club = clubDoc.docs[0].data();
              clubDetails[clubId] = {
                name: club.proposedClubName || 'Unknown Club'
              };
            }
          } catch (error) {
            console.error(`Error fetching club details for ${clubId}:`, error);
          }
        }

        // Build interests data with club details
        const interests = interestsSnapshot.docs.map(doc => {
          const data = doc.data();
          const club = clubDetails[data.clubId] || { name: 'Unknown Club' };
          
          return {
            id: doc.id,
            ...data,
            clubName: club.name
          };
        });
        
        setAllPlayerInterests(interests);
        setInterestsPage(1); // Reset to first page when fetching new data
      }

      // Also fetch recruitment requests
      await fetchRecruitmentRequests();
      
      // Update the displayed player interests based on filters
      updateFilteredPlayerInterests();
    } catch (err) {
      console.error('Error fetching player interests:', err);
      setError('Failed to load player interests');
      setPlayerInterests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recruitment requests
  const fetchRecruitmentRequests = async () => {
    try {
      // Query all recruitment requests
      const requestsQuery = query(
        collection(db, 'recruitment-requests'),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      
      if (requestsSnapshot.empty) {
        setRecruitmentRequests([]);
        return;
      }

      // Get all club IDs from the requests to fetch club details
      const clubIds = new Set();
      requestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clubId) clubIds.add(data.clubId);
      });
      
      // Fetch club details
      const clubDetails = {};
      for (const clubId of clubIds) {
        try {
          const clubDoc = await getDocs(query(
            collection(db, 'hpl-clubs'),
            where('__name__', '==', clubId)
          ));
          
          if (!clubDoc.empty) {
            const club = clubDoc.docs[0].data();
            clubDetails[clubId] = {
              name: club.proposedClubName || 'Unknown Club',
              ownerName: club.primaryOwnerName || 'Unknown Owner'
            };
          }
        } catch (error) {
          console.error(`Error fetching club details for ${clubId}:`, error);
        }
      }

      // Fetch player details
      const playerIds = new Set();
      requestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.playerId) playerIds.add(data.playerId);
      });
      
      const playerDetails = {};
      for (const playerId of playerIds) {
        try {
          const playerDoc = await getDocs(query(
            collection(db, 'clubs-players'),
            where('__name__', '==', playerId)
          ));
          
          if (!playerDoc.empty) {
            const player = playerDoc.docs[0].data();
            playerDetails[playerId] = {
              name: player.fullName || 'Unknown Player',
              email: player.emailId || '',
              photo: player.photoUrl || null
            };
          }
        } catch (error) {
          console.error(`Error fetching player details for ${playerId}:`, error);
        }
      }

      // Build the complete recruitment requests data
      const requests = requestsSnapshot.docs.map(doc => {
        const data = doc.data();
        const club = clubDetails[data.clubId] || { name: 'Unknown Club', ownerName: 'Unknown Owner' };
        const player = playerDetails[data.playerId] || { name: 'Unknown Player', email: '', photo: null };
        
        return {
          id: doc.id,
          ...data,
          clubName: club.name,
          clubOwner: club.ownerName,
          playerName: player.name,
          playerEmail: player.email,
          playerPhoto: player.photo,
          createdAtFormatted: data.createdAt ? formatDate(data.createdAt) : 'Unknown'
        };
      });
      
      setRecruitmentRequests(requests);
    } catch (err) {
      console.error('Error fetching recruitment requests:', err);
      setRecruitmentRequests([]);
    }
  };

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

  // Function to export finalized players to Excel (only players with clubs, grouped by club)
  const handleExportFinalisedPlayers = async () => {
    try {
      // Filter players that have a club assigned
      const playersWithClubs = allPlayers.filter(player => playerClubs[player.id]?.clubId);
      
      if (playersWithClubs.length === 0) {
        setError('No players with assigned clubs to export');
        return;
      }

      // Group players by club
      const playersByClub = {};
      playersWithClubs.forEach(player => {
        const clubId = playerClubs[player.id].clubId;
        const clubName = playerClubs[player.id].clubName || 'Unknown Club';
        
        if (!playersByClub[clubName]) {
          playersByClub[clubName] = [];
        }
        playersByClub[clubName].push(player);
      });

      // Sort players within each club by name
      Object.keys(playersByClub).forEach(clubName => {
        playersByClub[clubName].sort((a, b) => {
          const nameA = a.fullName || '';
          const nameB = b.fullName || '';
          return nameA.localeCompare(nameB);
        });
      });

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Finalised Players');

      // Define headers
      const headers = [
        'Player Name',
        'Age',
        'Gender',
        'Club Name',
        'DUPR Id',
        'Singles Rating',
        'Doubles Rating',
        'Mobile Number'
      ];

      // Add header row
      worksheet.addRow(headers);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F855A' } // Green color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows grouped by club
      const sortedClubNames = Object.keys(playersByClub).sort();
      let currentRowIndex = 2;

      sortedClubNames.forEach((clubName, clubIndex) => {
        const players = playersByClub[clubName];
        
        players.forEach((player, playerIndex) => {
          const age = calculateAge(player.dateOfBirth);
          const gender = formatGender(player.gender);
          
          worksheet.addRow([
            player.fullName || 'N/A',
            age,
            gender,
            clubName,
            player.duprId || 'N/A',
            player.singlesRating || 'N/A',
            player.doublesRating || 'N/A',
            player.mobileNumber || 'N/A'
          ]);

          // Add alternating row colors for better readability
          const row = worksheet.getRow(currentRowIndex);
          if (playerIndex % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' } // Light gray
            };
          }
          currentRowIndex++;
        });

        // Add a blank row between clubs for visual separation
        if (clubIndex < sortedClubNames.length - 1) {
          currentRowIndex++;
        }
      });

      // Set column widths
      worksheet.columns = [
        { width: 20 }, // Player Name
        { width: 8 },  // Age
        { width: 10 }, // Gender
        { width: 20 }, // Club Name
        { width: 15 }, // DUPR Id
        { width: 15 }, // Singles Rating
        { width: 15 }, // Doubles Rating
        { width: 18 }  // Mobile Number
      ];

      // Auto filter headers
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
      };

      // Freeze the header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Create a buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create a blob from the buffer
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      
      link.href = url;
      link.setAttribute('download', `finalised-players-${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Finalised players data successfully exported to Excel');
    } catch (error) {
      console.error('Error exporting finalised players:', error);
      setError('Failed to export finalised players. Please try again.');
    }
  };

  // Function to export clubs data to Excel (XLSX format)
  const handleExportClubsToExcel = async () => {
    if (clubs.length === 0) {
      setError('No club data to export');
      return;
    }

    try {
      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('HPL Clubs');

      // Define headers
      const headers = [
        'Club Name',
        'Owner Name',
        'Email',
        'Phone Number',
        'Community Manager',
        'Manager Phone',
        'Player Count',
        'Status',
        // Billing Details
        'Billing Name',
        'Billing Address',
        'GST Number',
        'Billing Updated At',
        // Venue Details
        'Venue Name',
        'Venue Google Maps Link',
        'Venue Updated At',
        'Community Existence',
        'Club Structure',
        'Club USP',
        'Unique Culture',
        'Club Feeling',
        'Why Join League',
        'Winning vs Culture',
        'Roles & Responsibilities',
        'Player Benefits',
        'Other Benefits',
        'Player Selection Criteria',
        'Long Term Goals',
        'Venue Access',
        'Additional Info',
        'Registration Date'
      ];

      // Format date field
      const formatDateField = (date) => {
        if (!date) return '';
        try {
          const dateObj = date.toDate ? date.toDate() : new Date(date);
          return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      // Format array field
      const formatArrayField = (array) => {
        if (!array || !Array.isArray(array)) return '';
        return array.join(', ');
      };

      // Add header row
      worksheet.addRow(headers);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F855A' } // Green color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      clubs.forEach(club => {
        // Format community existence field
        const communityExistence =
          club.communityExistence === 'less-than-6-months' ? 'Less than 6 months' :
          club.communityExistence === '6-12-months' ? '6-12 months' :
          club.communityExistence === '1-2-years' ? '1-2 years' :
          club.communityExistence === 'more-than-2-years' ? 'More than 2 years' : '';

        // Format club structure field
        const clubStructure =
          club.clubDescription === 'independent-collective' ? 'Independent Collective' :
          club.clubDescription === 'community-based' ? 'Community Based' :
          club.clubDescription === 'academy-affiliated' ? 'Academy Affiliated' :
          club.clubDescription || '';

        // Format roles & responsibilities field
        const rolesResponsibilities =
          club.rolesResponsibilities === 'flexible' ? 'Flexible' :
          club.rolesResponsibilities === 'structured' ? 'Structured' :
          club.rolesResponsibilities || '';

        // Format venue access field
        const venueAccess =
          club.venueAccess === 'secured' ? 'Secured' :
          club.venueAccess === 'in-progress' ? 'In Progress' :
          club.venueAccess === 'not-secured' ? 'Not Secured' :
          club.venueAccess || '';

        // Format status field
        const status =
          club.status === 'active' ? 'Active' :
          club.status === 'approved' ? 'Pending Payment' :
          club.status === 'rejected' ? 'Rejected' :
          club.status || 'Pending';

        // Add row data
        worksheet.addRow([
          club.proposedClubName || '',
          club.primaryOwnerName || '',
          club.managerEmailId || club.emailId || '',
          club.phoneNumber || '',
          club.communityManagerName || '',
          club.managerPhoneNumber || '',
          club.playerCount || 0,
          status,
          // Billing Details
          club.billingName || '',
          club.billingAddress || '',
          club.gstNumber || '',
          formatDateField(club.billingInfoUpdatedAt),
          // Venue Details
          club.venueName || '',
          club.venueMapLink || '',
          formatDateField(club.venueUpdatedAt),
          communityExistence,
          clubStructure,
          club.clubUSP || '',
          club.uniqueCulture || '',
          club.clubFeeling || '',
          club.whyJoinLeague || '',
          club.winningVsCulture || '',
          rolesResponsibilities,
          formatArrayField(club.playerBenefits),
          club.otherBenefits || '',
          formatArrayField(club.playerSelectionCriteria),
          formatArrayField(club.longTermGoals),
          venueAccess,
          club.additionalInfo || '',
          formatDateField(club.submittedAt)
        ]);
      });

      // Set column widths
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      // Auto filter headers
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
      };

      // Make the venue map link column clickable
      const venueMapLinkColumnIndex = headers.indexOf('Venue Google Maps Link') + 1;
      if (venueMapLinkColumnIndex > 0) {
        // For each row except header
        for (let i = 2; i <= clubs.length + 1; i++) {
          const cell = worksheet.getCell(i, venueMapLinkColumnIndex);
          if (cell.value) {
            cell.value = {
              text: cell.value,
              hyperlink: cell.value,
              tooltip: 'Open in Google Maps'
            };
            cell.font = { color: { argb: 'FF0000FF' }, underline: true };
          }
        }
      }

      // Create a buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create a blob from the buffer
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      
      link.href = url;
      link.setAttribute('download', `hpl-clubs-data-${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Clubs data successfully exported to Excel');
    } catch (error) {
      console.error('Error exporting clubs data:', error);
      setError('Failed to export clubs data. Please try again.');
    }
  };

  // Handle club approval
  const handleApproveClub = async (clubId) => {
    setActionLoading(prev => ({ ...prev, [clubId]: 'approving' }));
    try {
      // Find the club data
      const clubToApprove = clubs.find(club => club.id === clubId);
      if (!clubToApprove) {
        throw new Error('Club not found');
      }

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

      // Send approval email to club owner
      try {
        const email = clubToApprove.managerEmailId || clubToApprove.emailId;
        const clubName = clubToApprove.proposedClubName || 'Your club';
        const ownerName = clubToApprove.primaryOwnerName || '';

        if (email) {
          // Call our cloud function to send the approval email
          const response = await fetch(
            'https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendClubApprovalEmail',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: email,
                clubName: clubName,
                ownerName: ownerName
              })
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to send approval email');
          }
          
          console.log('Approval email sent to club owner:', email);
        } else {
          console.warn('No email available to send club approval notification');
        }
      } catch (emailError) {
        console.error('Error sending club approval email:', emailError);
        // Don't fail the approval process if email sending fails
      }
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

  // Handle interest approval - recruit player
  const handleApproveInterest = async (interestId) => {
    setInterestActionLoading(prev => ({ ...prev, [interestId]: 'approving' }));
    try {
      // Find the interest data
      const interest = playerInterests.find(int => int.id === interestId);
      if (!interest) {
        throw new Error('Interest not found');
      }

      // Create a new recruitment request
      await addDoc(collection(db, 'recruitment-requests'), {
        playerId: interest.playerId,
        clubId: interest.clubId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Update interest status
      await updateDoc(doc(db, 'player-interests', interestId), {
        status: 'processed',
        processedAt: serverTimestamp()
      });

      // Update local state
      setPlayerInterests(prev => prev.filter(int => int.id !== interestId));
      
      alert(`Recruitment request sent to ${interest.playerName}`);
    } catch (error) {
      console.error('Error approving interest:', error);
      alert('Failed to approve player interest');
    } finally {
      setInterestActionLoading(prev => ({ ...prev, [interestId]: null }));
    }
  };

  // Handle interest rejection
  const handleRejectInterest = async (interestId) => {
    setInterestActionLoading(prev => ({ ...prev, [interestId]: 'rejecting' }));
    try {
      // Update interest status
      await updateDoc(doc(db, 'player-interests', interestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });

      // Update local state
      setPlayerInterests(prev => prev.filter(int => int.id !== interestId));
      
      alert('Player interest rejected.');
    } catch (error) {
      console.error('Error rejecting interest:', error);
      alert('Failed to reject player interest');
    } finally {
      setInterestActionLoading(prev => ({ ...prev, [interestId]: null }));
    }
  };

  // Handle delete all player interests
  const handleDeleteAllPlayerInterests = async () => {
    setDeleteAllLoading(true);
    try {
      // Get all player interests
      const interestsQuery = query(
        collection(db, 'player-interests')
      );
      const interestsSnapshot = await getDocs(interestsQuery);
      
      if (interestsSnapshot.empty) {
        alert('No player interests to delete');
        setShowDeleteAllInterestsModal(false);
        setDeleteAllLoading(false);
        return;
      }

      // Delete all interests using batch
      const batch = writeBatch(db);
      interestsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Update local state
      setAllPlayerInterests([]);
      setPlayerInterests([]);
      setInterestsPage(1);

      alert(`Successfully deleted ${interestsSnapshot.size} player interest(s)`);
      setShowDeleteAllInterestsModal(false);
    } catch (error) {
      console.error('Error deleting all player interests:', error);
      alert('Failed to delete player interests');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  // Handle show recruited players
  const handleShowRecruitedPlayers = async (club, e) => {
    e.stopPropagation(); // Prevent row click event
    setSelectedClub(club);
    setRecruitedPlayers([]);
    setShowRecruitedPlayersModal(true);
    
    try {
      // Fetch players for this club from all possible fields
      const playersByIdQuery = query(
        collection(db, 'clubs-players'),
        where('clubId', '==', club.id)
      );
      const playersByClubQuery = query(
        collection(db, 'clubs-players'),
        where('club', '==', club.id)
      );
      const playersByRecruitedByQuery = query(
        collection(db, 'clubs-players'),
        where('recruitedBy', '==', club.id)
      );
      
      const [snapshotById, snapshotByClub, snapshotByRecruitedBy] = await Promise.all([
        getDocs(playersByIdQuery),
        getDocs(playersByClubQuery),
        getDocs(playersByRecruitedByQuery)
      ]);
      
      // Combine results and remove duplicates
      const playersMap = new Map();
      
      const processSnapshot = (snapshot) => {
        snapshot.docs.forEach(doc => {
          if (!playersMap.has(doc.id)) {
            playersMap.set(doc.id, {
              id: doc.id,
              ...doc.data(),
              // Calculate age if dateOfBirth exists
              age: doc.data().dateOfBirth ? calculateAge(doc.data().dateOfBirth) : 'N/A'
            });
          }
        });
      };
      
      processSnapshot(snapshotById);
      processSnapshot(snapshotByClub);
      processSnapshot(snapshotByRecruitedBy);
      
      // Convert map to array
      const players = Array.from(playersMap.values());
      
      // Sort by name
      players.sort((a, b) => {
        const nameA = a.fullName || '';
        const nameB = b.fullName || '';
        return nameA.localeCompare(nameB);
      });
      
      setRecruitedPlayers(players);
      console.log(`Fetched ${players.length} recruited players for club ${club.id}`);
    } catch (error) {
      console.error('Error fetching recruited players:', error);
      setRecruitedPlayers([]);
    }
  };

  // Handle show club info
  const handleShowInfo = (club) => {
    setSelectedClub(club);
    
    // Initialize owner images if they exist
    if (club.ownerImages && Array.isArray(club.ownerImages)) {
      setOwnerImages(club.ownerImages);
    } else {
      setOwnerImages([]);
    }
    
    // Initialize club logo if it exists
    if (club.teamLogo) {
      setClubLogo(club.teamLogo);
    } else {
      setClubLogo(null);
    }
    
    // Initialize background image if it exists
    if (club.backgroundImage) {
      setBackgroundImage(club.backgroundImage);
    } else {
      setBackgroundImage(null);
    }
    
    // Initialize owner names if they exist
    if (club.ownerNames) {
      setOwnerNames(club.ownerNames);
    } else {
      setOwnerNames('');
    }
    
    setShowInfoModal(true);
  };
  
  // Handle owner image upload
  const handleOwnerImageUpload = (imageData) => {
    if (imageData) {
      // Add the new image to the existing array of owner images
      setOwnerImages(prevImages => [...prevImages, imageData]);
    }
  };
  
  // Handle club logo upload
  const handleClubLogoUpload = (logoData) => {
    if (logoData) {
      setClubLogo(logoData);
    }
  };
  
  // Handle background image upload
  const handleBackgroundImageUpload = (imageData) => {
    if (imageData) {
      setBackgroundImage(imageData);
    }
  };
  
  // Handle owner names change
  const handleOwnerNamesChange = (e) => {
    setOwnerNames(e.target.value);
  };
  
  // Handle remove owner image
  const handleRemoveOwnerImage = (index) => {
    setOwnerImages(prevImages => prevImages.filter((_, i) => i !== index));
  };
  
  // Handle update club information
  const handleUpdateClubInfo = async () => {
    if (!selectedClub) return;
    
    setUpdateLoading(true);
    
    try {
      const clubRef = doc(db, 'hpl-clubs', selectedClub.id);
      
      // Prepare update data
      const updateData = {
        ownerImages: ownerImages,
        ownerNames: ownerNames
      };
      
      // Add teamLogo if it exists
      if (clubLogo) {
        updateData.teamLogo = clubLogo;
      }
      
      // Add backgroundImage if it exists
      if (backgroundImage) {
        updateData.backgroundImage = backgroundImage;
      }
      
      // Update the club document
      await updateDoc(clubRef, updateData);
      
      // Update local state
      setClubs(prevClubs => prevClubs.map(club =>
        club.id === selectedClub.id
          ? { ...club, ownerImages, teamLogo: clubLogo, backgroundImage, ownerNames }
          : club
      ));
      
      // Update selectedClub
      setSelectedClub(prev => ({
        ...prev,
        ownerImages,
        teamLogo: clubLogo,
        backgroundImage,
        ownerNames
      }));
      
      alert('Club information updated successfully');
    } catch (error) {
      console.error('Error updating club information:', error);
      alert('Failed to update club information');
    } finally {
      setUpdateLoading(false);
    }
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

  // Handle assigning a club to a player
  const handleAssignClub = (player) => {
    setSelectedPlayer(player);
    // Make sure clubs are loaded before showing the modal
    if (clubs.length === 0) {
      setLoading(true);
      fetchClubs()
        .then(() => {
          console.log("Clubs loaded successfully for assignment:", clubs.length);
          setShowAssignClubModal(true);
        })
        .catch(error => {
          console.error("Error loading clubs for assignment:", error);
          alert("There was a problem loading clubs. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.log("Using pre-loaded clubs for assignment:", clubs.length);
      setShowAssignClubModal(true);
    }
  };

  // Handle club assignment submission
  const handleAssignClubSubmit = async (clubId) => {
    if (!selectedPlayer || !clubId) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedPlayer.id]: 'assigning' }));
      
      // Update the player document with the club ID and recruitedBy field
      const playerRef = doc(db, 'clubs-players', selectedPlayer.id);
      await updateDoc(playerRef, {
        clubId: clubId,
        recruitedBy: clubId, // Also update recruitedBy field for consistency
        club: clubId,        // Also update club field for consistency
        updatedAt: serverTimestamp()
      });
      
      // Update the club document with incremented player count
      try {
        const clubRef = doc(db, 'hpl-clubs', clubId);
        await updateDoc(clubRef, {
          playerCount: increment(1),
          updatedAt: serverTimestamp()
        });
        console.log(`Updated club ${clubId} player count`);
      } catch (clubError) {
        console.error('Error updating club player count:', clubError);
        // Don't fail the player assignment if club update fails
      }
      
      // Update the local state
      setPlayerClubs(prev => ({
        ...prev,
        [selectedPlayer.id]: {
          clubId,
          clubName: clubs.find(c => c.id === clubId)?.proposedClubName || 'Unknown Club'
        }
      }));
      
      // Check if there's an existing recruitment request and update its status
      try {
        // Query for recruitment requests for this player and club
        const requestsQuery = query(
          collection(db, 'recruitment-requests'),
          where('playerId', '==', selectedPlayer.id),
          where('clubId', '==', clubId)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        
        if (!requestsSnapshot.empty) {
          // Update each matching recruitment request to "accepted" (only update status)
          const batch = writeBatch(db);
          requestsSnapshot.docs.forEach(docSnap => {
            batch.update(doc(db, 'recruitment-requests', docSnap.id), {
              status: 'accepted'
            });
          });
          await batch.commit();
          console.log(`Updated ${requestsSnapshot.size} recruitment request(s) to accepted status`);
        }
      } catch (requestError) {
        console.error('Error updating recruitment requests:', requestError);
        // Don't fail the club assignment if this part fails
      }
      
      // Close modal and clear selected player
      setShowAssignClubModal(false);
      
      // Refresh recruitment requests to update UI
      if (activeTab === 'interests' && recruitmentView) {
        // If we're currently in the recruitment requests view, refresh the data
        await fetchRecruitmentRequests();
      }
      
      // Show success message
      alert(`Successfully assigned ${selectedPlayer.fullName} to club`);
    } catch (error) {
      console.error('Error assigning club to player:', error);
      alert('Failed to assign club to player');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedPlayer.id]: null }));
    }
  };

  // Handle player image upload
  const handlePlayerImageUpload = async (imageData) => {
    if (!selectedPlayer || !imageData) return;
    
    setPlayerImageUpdateLoading(true);
    
    try {
      // Update the player document with the new photo URL
      const playerRef = doc(db, 'clubs-players', selectedPlayer.id);
      await updateDoc(playerRef, {
        photoUrl: imageData.url,
        updatedAt: new Date()
      });
      
      // Update the local state
      setSelectedPlayer(prev => ({
        ...prev,
        photoUrl: imageData.url
      }));
      
      // Update in players array if needed
      setPlayers(prev =>
        prev.map(player =>
          player.id === selectedPlayer.id
            ? { ...player, photoUrl: imageData.url }
            : player
        )
      );
      
      // Update in allPlayers array
      setAllPlayers(prev =>
        prev.map(player =>
          player.id === selectedPlayer.id
            ? { ...player, photoUrl: imageData.url }
            : player
        )
      );
      
      // Show success message
      alert('Player photo updated successfully');
    } catch (error) {
      console.error('Error updating player photo:', error);
      alert('Failed to update player photo');
    } finally {
      setPlayerImageUpdateLoading(false);
    }
  };

  // Handle saving player name changes
  const handleSavePlayerName = async () => {
    try {
      if (!selectedPlayer.fullName || selectedPlayer.fullName.trim() === '') {
        setError('Player name cannot be empty');
        return;
      }
      
      setActionLoading(prev => ({
        ...prev,
        [selectedPlayer.id]: 'saving'
      }));

      const playerRef = doc(db, 'clubs-players', selectedPlayer.id);
      await updateDoc(playerRef, {
        fullName: selectedPlayer.fullName.trim()
      });

      // Update local state
      setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, fullName: selectedPlayer.fullName.trim() } : p));
      setAllPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, fullName: selectedPlayer.fullName.trim() } : p));
      
      setActionLoading(prev => ({
        ...prev,
        [selectedPlayer.id]: null
      }));
      
      setShowPlayerDetailsModal(false);
    } catch (err) {
      console.error('Error saving player name:', err);
      setError('Failed to save player name');
      setActionLoading(prev => ({
        ...prev,
        [selectedPlayer.id]: null
      }));
    }
  };

  // Handle removing a player from a club
  const handleRemoveFromClub = async () => {
    if (!selectedPlayer) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedPlayer.id]: 'removing' }));
      
      // Get the club ID before removing
      const clubId = playerClubs[selectedPlayer.id]?.clubId;
      
      // Update the player document to remove club association
      const playerRef = doc(db, 'clubs-players', selectedPlayer.id);
      await updateDoc(playerRef, {
        clubId: null,
        recruitedBy: null,
        club: null,
        updatedAt: serverTimestamp()
      });
      
      // Update the club document with decremented player count
      if (clubId) {
        try {
          const clubRef = doc(db, 'hpl-clubs', clubId);
          await updateDoc(clubRef, {
            playerCount: increment(-1),
            updatedAt: serverTimestamp()
          });
          console.log(`Updated club ${clubId} player count (decremented)`);
        } catch (clubError) {
          console.error('Error updating club player count:', clubError);
          // Don't fail the player removal if club update fails
        }
      }
      
      // Update local state to remove club association
      setPlayerClubs(prev => {
        const newPlayerClubs = { ...prev };
        delete newPlayerClubs[selectedPlayer.id];
        return newPlayerClubs;
      });
      
      // Close the confirmation modal
      setShowRemoveConfirmModal(false);
      
      // Show success message
      alert(`Successfully removed ${selectedPlayer.fullName} from club. Player is now back in the player pool.`);
    } catch (error) {
      console.error('Error removing player from club:', error);
      alert('Failed to remove player from club');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedPlayer.id]: null }));
    }
  };

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
  
  // Filter player interests based on search and club filter
  const filteredPlayerInterests = useMemo(() => {
    return allPlayerInterests.filter(interest => {
      // Search query filter
      const searchLower = interestsSearchQuery.toLowerCase();
      const nameMatches = interest.playerName?.toLowerCase().includes(searchLower) || false;
      const emailMatches = interest.playerEmail?.toLowerCase().includes(searchLower) || false;
      const searchCondition = interestsSearchQuery === '' || nameMatches || emailMatches;
      
      // Club filter
      const clubCondition = selectedClubFilter === '' || interest.clubId === selectedClubFilter;
      
      return searchCondition && clubCondition;
    });
  }, [allPlayerInterests, interestsSearchQuery, selectedClubFilter]);
  
  // Calculate total pages for interests
  const totalInterestsPages = useMemo(() => {
    return Math.ceil(filteredPlayerInterests.length / interestsPageSize);
  }, [filteredPlayerInterests, interestsPageSize]);
  
  // Get paginated interests
  const paginatedInterests = useMemo(() => {
    const startIndex = (interestsPage - 1) * interestsPageSize;
    return filteredPlayerInterests.slice(startIndex, startIndex + interestsPageSize);
  }, [filteredPlayerInterests, interestsPage, interestsPageSize]);
  
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
  
  // Function to update filtered player interests
  const updateFilteredPlayerInterests = useCallback(() => {
    // Apply filtering based on search and club filter
    const filtered = allPlayerInterests.filter(interest => {
      // Search query filter
      const searchLower = interestsSearchQuery.toLowerCase();
      const nameMatches = interest.playerName?.toLowerCase().includes(searchLower) || false;
      const emailMatches = interest.playerEmail?.toLowerCase().includes(searchLower) || false;
      const searchCondition = interestsSearchQuery === '' || nameMatches || emailMatches;
      
      // Club filter
      const clubCondition = selectedClubFilter === '' || interest.clubId === selectedClubFilter;
      
      return searchCondition && clubCondition;
    });
    
    // Update state with filtered results
    setPlayerInterests(filtered);
  }, [allPlayerInterests, interestsSearchQuery, selectedClubFilter]);
  
  // Update filtered interests when filters change
  useEffect(() => {
    updateFilteredPlayerInterests();
  }, [interestsSearchQuery, selectedClubFilter, allPlayerInterests, updateFilteredPlayerInterests]);

  // State to control which view to show in the interests tab
  const [recruitmentView, setRecruitmentView] = useState(false);

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
              <button
                onClick={() => setActiveTab('interests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'interests'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Interests
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
                        onClick={handleExportFinalisedPlayers}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Finalised Players
                      </button>
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
                            Club
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
                                    <OptimizedImage
                                      className="h-10 w-10 rounded-full object-cover"
                                      src={player.photoUrl}
                                      alt={player.fullName || 'Player'}
                                      type="avatar"
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {playerClubs[player.id]?.clubName ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                                  {playerClubs[player.id].clubName}
                                </span>
                              ) : (
                                <span className="text-gray-500">Not Assigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleViewPlayerDetails(player)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                                  title="View Details"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                {!playerClubs[player.id]?.clubName && (
                                  <button
                                    onClick={() => handleAssignClub(player)}
                                    disabled={actionLoading[player.id] === 'assigning'}
                                    className="text-green-400 hover:text-green-300 transition-colors flex items-center"
                                    title="Assign Club"
                                  >
                                    {actionLoading[player.id] === 'assigning' ? (
                                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500"></span>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                                {playerClubs[player.id]?.clubName && (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setShowRemoveConfirmModal(true);
                                    }}
                                    disabled={actionLoading[player.id] === 'removing'}
                                    className="text-red-400 hover:text-red-300 transition-colors flex items-center"
                                    title="Remove from Club"
                                  >
                                    {actionLoading[player.id] === 'removing' ? (
                                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500"></span>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
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
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Club Registrations</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        Clubs that have registered for the HPL Club League
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleExportClubsToExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Export to Excel
                      </button>
                    </div>
                  </div>
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
                              <button
                                onClick={(e) => handleShowRecruitedPlayers(club, e)}
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200 hover:bg-blue-800 cursor-pointer transition-colors"
                              >
                                <span className="font-bold">{club.playerCount || 0}</span> players
                              </button>
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

            {/* Player Interests Tab */}
            {activeTab === 'interests' && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Player Interests & Recruitment</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        Manage player interests and club recruitment requests
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteAllInterestsModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
                      title="Delete all player interests"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete all players interests
                    </button>
                  </div>
                </div>
                
                {/* Interests Search and Filters */}
                {!recruitmentView && (
                  <div className="px-6 py-4 bg-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="interests-search" className="block text-sm font-medium text-gray-400 mb-1">Search</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            id="interests-search"
                            className="bg-gray-800 block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            placeholder="Search player name, email..."
                            value={interestsSearchQuery}
                            onChange={(e) => {
                              setInterestsSearchQuery(e.target.value);
                              setInterestsPage(1); // Reset to first page when search changes
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="club-filter" className="block text-sm font-medium text-gray-400 mb-1">Club Filter</label>
                        <select
                          id="club-filter"
                          className="bg-gray-800 block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 text-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          value={selectedClubFilter}
                          onChange={(e) => {
                            setSelectedClubFilter(e.target.value);
                            setInterestsPage(1); // Reset to first page when filter changes
                          }}
                        >
                          <option value="">All Clubs</option>
                          {Array.from(new Set(allPlayerInterests.map(interest => interest.clubId))).map(clubId => {
                            const club = allPlayerInterests.find(interest => interest.clubId === clubId);
                            return (
                              <option key={clubId} value={clubId}>
                                {club?.clubName || 'Unknown Club'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setInterestsSearchQuery('');
                          setSelectedClubFilter('');
                          setInterestsPage(1);
                        }}
                        className="bg-gray-700 text-gray-300 px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Tab Navigation for Interests Section */}
                <div className="px-6 py-2 bg-gray-900">
                  <div className="flex space-x-4 border-b border-gray-700">
                    <button
                      className={`py-2 px-3 border-b-2 ${
                        !recruitmentView ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                      } text-sm font-medium`}
                      onClick={() => setRecruitmentView(false)}
                    >
                      Player Interests
                    </button>
                    <button
                      className={`py-2 px-3 border-b-2 ${
                        recruitmentView ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                      } text-sm font-medium`}
                      onClick={() => setRecruitmentView(true)}
                    >
                      Recruitment Requests
                    </button>
                  </div>
                </div>
                
                {!recruitmentView ? (
                  // Player Interests View with Pagination
                  <div>
                    {filteredPlayerInterests.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="text-gray-400">No player interests found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                          <thead className="bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Player Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Mobile
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                DUPR Ratings
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Gender
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Club
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Interest Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {paginatedInterests.map((interest) => (
                              <tr key={interest.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      {interest.playerPhoto ? (
                                        <img
                                          className="h-10 w-10 rounded-full object-cover"
                                          src={interest.playerPhoto}
                                          alt={interest.playerName || 'Player'}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div className={`h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ${interest.playerPhoto ? 'hidden' : ''}`}>
                                        <span className="text-white font-medium text-sm">
                                          {interest.playerName ? interest.playerName.charAt(0).toUpperCase() : 'P'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-white">
                                        {interest.playerName || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {interest.playerEmail || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {interest.playerMobile || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex space-x-2">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200">
                                      S: {interest.playerSinglesRating || 'N/A'}
                                    </span>
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                                      D: {interest.playerDoublesRating || 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {formatGender(interest.playerGender)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-900 text-orange-200">
                                    {interest.clubName || 'Unknown Club'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {formatDate(interest.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Pagination for Interests */}
                    {totalInterestsPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">
                            Showing page {interestsPage} of {totalInterestsPages}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setInterestsPage(1)}
                            disabled={interestsPage === 1}
                            className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                          >
                            &laquo; First
                          </button>
                          <button
                            onClick={() => setInterestsPage(interestsPage - 1)}
                            disabled={interestsPage === 1}
                            className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                          >
                            &lsaquo; Prev
                          </button>
                          {Array.from({ length: Math.min(5, totalInterestsPages) }, (_, i) => {
                            // Show 5 page buttons centered around current page
                            let pageNum;
                            if (totalInterestsPages <= 5) {
                              pageNum = i + 1;
                            } else if (interestsPage <= 3) {
                              pageNum = i + 1;
                            } else if (interestsPage >= totalInterestsPages - 2) {
                              pageNum = totalInterestsPages - 4 + i;
                            } else {
                              pageNum = interestsPage - 2 + i;
                            }
                            
                            if (pageNum <= totalInterestsPages) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setInterestsPage(pageNum)}
                                  className={`px-3 py-1 rounded-md ${
                                    interestsPage === pageNum
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
                            onClick={() => setInterestsPage(interestsPage + 1)}
                            disabled={interestsPage === totalInterestsPages}
                            className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                          >
                            Next &rsaquo;
                          </button>
                          <button
                            onClick={() => setInterestsPage(totalInterestsPages)}
                            disabled={interestsPage === totalInterestsPages}
                            className="bg-gray-700 px-3 py-1 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                          >
                            Last &raquo;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Recruitment Requests View */}
                    {recruitmentRequests.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="text-gray-400">No recruitment requests found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Club
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Club Owner
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Player
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Player Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Request Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                          {recruitmentRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {request.clubName || 'Unknown Club'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {request.clubOwner || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    {request.playerPhoto ? (
                                      <img
                                        className="h-10 w-10 rounded-full object-cover"
                                        src={request.playerPhoto}
                                        alt={request.playerName || 'Player'}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className={`h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ${request.playerPhoto ? 'hidden' : ''}`}>
                                      <span className="text-white font-medium text-sm">
                                        {request.playerName ? request.playerName.charAt(0).toUpperCase() : 'P'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-white">
                                      {request.playerName || 'Unknown Player'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {request.playerEmail || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  request.status === 'accepted' || request.status === 'approved' ? 'bg-green-900 text-green-200' :
                                  request.status === 'rejected' ? 'bg-red-900 text-red-200' :
                                  'bg-yellow-900 text-yellow-200'
                                }`}>
                                  {request.status === 'accepted' || request.status === 'approved' ? 'Accepted' :
                                   request.status === 'rejected' ? 'Rejected' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {request.createdAtFormatted || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                     </div>
                   )}
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
                {/* Club Images and Owner Information */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Club Images & Owner Information</h4>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Club Logo</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-1/3">
                        <CloudinaryImageUpload
                          onImageUpload={handleClubLogoUpload}
                          currentImage={clubLogo?.url || null}
                          label="Club Logo"
                          uploadType="team"
                        />
                      </div>
                      <div className="text-sm text-gray-400 w-2/3">
                        <p>Upload a high-quality image of your club logo (recommended size: square, at least 300x300px).</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Club Background</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-1/3">
                        <CloudinaryImageUpload
                          onImageUpload={handleBackgroundImageUpload}
                          currentImage={backgroundImage?.url || null}
                          label="Background Image"
                          uploadType="team"
                        />
                      </div>
                      <div className="text-sm text-gray-400 w-2/3">
                        <p>Upload a background image for the club card (recommended size: landscape, at least 1200x800px).</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Owner Names</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. John Doe, Jane Smith"
                      value={ownerNames}
                      onChange={handleOwnerNamesChange}
                    />
                    <p className="text-xs text-gray-400 mt-1">Enter the names of all club owners, separated by commas</p>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Club Owners Images</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Display existing images */}
                      {ownerImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.url}
                            alt={`Club owner ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveOwnerImage(index)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      
                      {/* Image upload component */}
                      <CloudinaryImageUpload
                        onImageUpload={handleOwnerImageUpload}
                        currentImage={null}
                        label="Add Owner Image"
                        uploadType="player"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ${updateLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={handleUpdateClubInfo}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <>
                          <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                          Saving...
                        </>
                      ) : 'Save Owner Information'}
                    </button>
                  </div>
                </div>
                
                <hr className="border-gray-700 my-6" />
                
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
                      <p className="text-white">
                        <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-md bg-blue-800 text-blue-200">
                          {selectedClub.playerCount || 0} recruited players
                        </span>
                      </p>
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
                  <CloudinaryImageUpload
                    onImageUpload={handlePlayerImageUpload}
                    currentImage={selectedPlayer.photoUrl}
                    label="Player Photo"
                    uploadType="player"
                  />
                </div>

                {/* Player Details */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Full Name</label>
                      <input
                        type="text"
                        value={selectedPlayer.fullName || ''}
                        onChange={(e) => setSelectedPlayer({ ...selectedPlayer, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                        placeholder="Enter player name"
                      />
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

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleSavePlayerName}
                  disabled={actionLoading[selectedPlayer.id] === 'saving'}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading[selectedPlayer.id] === 'saving' ? (
                    <>
                      <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
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
        
        {/* Recruited Players Modal */}
        {showRecruitedPlayersModal && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Recruited Players</h3>
                  <p className="text-gray-400">
                    {selectedClub.proposedClubName || 'Club'} - {recruitedPlayers.length} players
                  </p>
                </div>
                <button
                  onClick={() => setShowRecruitedPlayersModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              {recruitedPlayers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400">No players have been recruited by this club yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Player Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          DUPR Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Gender/Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {recruitedPlayers.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {player.photoUrl ? (
                                  <OptimizedImage
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={player.photoUrl}
                                    alt={player.fullName || 'Player'}
                                    type="avatar"
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
                                  {player.duprId || 'No DUPR ID'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {player.emailId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                                Doubles: {player.doublesRating || 'N/A'}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                                Singles: {player.singlesRating || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200">
                                {formatGender(player.gender)}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-900 text-orange-200">
                                Age: {player.age || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedPlayer(player);
                                setShowRecruitedPlayersModal(false);
                                setShowPlayerDetailsModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowRecruitedPlayersModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Assign Club Modal */}
      {showAssignClubModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Assign Club</h3>
              <button
                onClick={() => setShowAssignClubModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white mb-2">
                Assigning club for: <span className="font-bold">{selectedPlayer.fullName}</span>
              </p>
              <p className="text-gray-400 text-sm">
                DUPR Rating: {selectedPlayer.doublesRating || selectedPlayer.duprRating || 'N/A'} |
                Gender: {formatGender(selectedPlayer.gender)}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Club</label>
              <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-700 p-3 rounded-lg">
                {clubs.length === 0 ? (
                  <p className="text-gray-400">No clubs available.</p>
                ) : (
                  clubs.map(club => (
                    <div key={club.id} className="p-2 hover:bg-gray-600 rounded cursor-pointer">
                      <button
                        onClick={() => handleAssignClubSubmit(club.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center mr-3">
                            <span className="text-white font-medium text-sm">
                              {club.proposedClubName ? club.proposedClubName.charAt(0).toUpperCase() : 'C'}
                            </span>
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{club.proposedClubName || 'N/A'}</div>
                            <div className="text-gray-400 text-xs">{club.playerCount || 0} players</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowAssignClubModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Remove from Club Confirmation Modal */}
      {showRemoveConfirmModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Remove from Club</h3>
              <button
                onClick={() => setShowRemoveConfirmModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white mb-4">
                Are you sure you want to remove <span className="font-bold">{selectedPlayer.fullName}</span> from {playerClubs[selectedPlayer.id]?.clubName}?
              </p>
              <p className="text-yellow-400 text-sm mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                This action will remove the player from their current club and place them back in the player pool.
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowRemoveConfirmModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveFromClub}
                disabled={actionLoading[selectedPlayer.id] === 'removing'}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading[selectedPlayer.id] === 'removing' ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    Removing...
                  </>
                ) : 'Remove Player'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete All Player Interests Confirmation Modal */}
      {showDeleteAllInterestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Delete All Player Interests</h3>
              <button
                onClick={() => setShowDeleteAllInterestsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white mb-4">
                Are you sure you want to delete all player interests? This action cannot be undone.
              </p>
              <p className="text-red-400 text-sm mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                This will permanently delete all {allPlayerInterests.length} player interest record(s).
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteAllInterestsModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllPlayerInterests}
                disabled={deleteAllLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteAllLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    Deleting...
                  </>
                ) : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}