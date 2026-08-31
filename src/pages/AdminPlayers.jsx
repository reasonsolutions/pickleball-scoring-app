import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserAuth } from '../contexts/UserAuthContext';
import MainLayout from '../components/MainLayout';
import OptimizedImage from '../components/OptimizedImage';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { sendPlayerApprovalNotification } from '../services/whatsappNotificationService';

export default function AdminPlayers() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { login: userLogin } = useUserAuth();
  const [activeTab, setActiveTab] = useState('registered'); // 'registered' or 'filling-form'
  const [players, setPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [fillingFormPlayers, setFillingFormPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(null); // Track which player's payment is being verified
  
  // Multi-select state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [isApprovingMultiple, setIsApprovingMultiple] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    minDuprRating: '',
    maxDuprRating: '',
    minAge: '',
    maxAge: ''
  });

  // Fetch players from ccpl-users collection and check for payment IDs
  // Sorted by registration date (latest first)
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const playersQuery = query(
          collection(db, 'ccpl-users'),
          orderBy('createdAt', 'desc') // Latest registrations first
        );
        const snapshot = await getDocs(playersQuery);
        const playersData = await Promise.all(
          snapshot.docs
            .filter(docSnap => docSnap.data().type === 'player') // Only include users with type "player"
            .map(async (docSnap) => {
              const playerData = {
                id: docSnap.id,
                ...docSnap.data()
              };

            // Check if player has payment ID in registration/player-registration
            try {
              const registrationDoc = await getDoc(
                doc(db, 'ccpl-users', docSnap.id, 'registration', 'player-registration')
              );
              
              if (registrationDoc.exists()) {
                const registrationData = registrationDoc.data();
                
                // Check if paymentInfo.paymentId exists
                playerData.hasPaymentId = !!(registrationData.paymentInfo?.paymentId);
                playerData.paymentId = registrationData.paymentInfo?.paymentId;
                playerData.paymentStatus = registrationData.paymentInfo?.status;
                playerData.registrationData = registrationData;
                
                // Get player photo from step11
                playerData.playerPhoto = registrationData.step11?.playerPhoto;
                playerData.actionPhoto = registrationData.step11?.actionPhoto;
              } else {
                playerData.hasPaymentId = false;
              }
            } catch (error) {
              console.error(`Error fetching registration for player ${docSnap.id}:`, error);
              playerData.hasPaymentId = false;
            }

            return playerData;
          })
        );

        // Separate players into registered and filling form
        const registered = playersData.filter(p => p.hasPaymentId);
        const fillingForm = playersData.filter(p => !p.hasPaymentId);

        // Sort registered players by paidAt date (latest first)
        registered.sort((a, b) => {
          const dateA = a.registrationData?.paymentInfo?.paidAt;
          const dateB = b.registrationData?.paymentInfo?.paidAt;
          
          // Handle missing dates - put them at the end
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          // Convert to Date objects and compare (newest first)
          return new Date(dateB) - new Date(dateA);
        });

        setAllPlayers(playersData);
        setRegisteredPlayers(registered);
        setFillingFormPlayers(fillingForm);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load player data');
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    
    try {
      const today = new Date();
      let birth;
      
      // Handle DD-MM-YYYY or DD/MM/YYYY format
      if (typeof dateOfBirth === 'string' && (dateOfBirth.includes('-') || dateOfBirth.includes('/'))) {
        const separator = dateOfBirth.includes('-') ? '-' : '/';
        const parts = dateOfBirth.split(separator);
        if (parts.length === 3) {
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
  
  // Get the current player list based on active tab
  const currentPlayerList = useMemo(() => {
    return activeTab === 'registered' ? registeredPlayers : fillingFormPlayers;
  }, [activeTab, registeredPlayers, fillingFormPlayers]);

  // Filter players based on search and filter criteria
  const filteredPlayers = useMemo(() => {
    return currentPlayerList.filter(player => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const nameMatches = (player.name || player.displayName)?.toLowerCase().includes(searchLower) || false;
      const emailMatches = player.email?.toLowerCase().includes(searchLower) || false;
      const phoneMatches = player.phone?.includes(searchQuery) || false;
      const searchCondition = searchQuery === '' || nameMatches || emailMatches || phoneMatches;
      
      // Gender filter
      const genderCondition = filters.gender === '' || player.gender?.toLowerCase() === filters.gender.toLowerCase();
      
      // Age filter
      const age = calculateAge(player.dateOfBirth);
      const ageValue = age === 'N/A' ? 0 : parseInt(age);
      const minAge = filters.minAge === '' ? 0 : parseInt(filters.minAge);
      const maxAge = filters.maxAge === '' ? 100 : parseInt(filters.maxAge);
      const ageCondition = (age === 'N/A' || (ageValue >= minAge && ageValue <= maxAge));
      
      return searchCondition && genderCondition && ageCondition;
    });
  }, [currentPlayerList, searchQuery, filters]);
  
  // Update players state whenever filtered results change or pagination changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + pageSize);
    setPlayers(paginatedPlayers);
  }, [filteredPlayers, currentPage, pageSize]);
  
  // Clear selected players when changing tabs or pages
  useEffect(() => {
    setSelectedPlayerIds([]);
  }, [activeTab, currentPage]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredPlayers.length / pageSize);
  }, [filteredPlayers, pageSize]);
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  // Handle page size change
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };
  
  // Handle search and filter changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1);
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

  // Handle checkbox selection
  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };
  
  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedPlayerIds.length === players.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(players.map(p => p.id));
    }
  };
  
  // Handle view player details
  const handleViewPlayerDetails = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetailsModal(true);
  };

  // Handle approve player
  const handleApprovePlayer = async () => {
    if (!selectedPlayer) return;
    
    try {
      const playerRef = doc(db, 'ccpl-users', selectedPlayer.id);
      await updateDoc(playerRef, {
        admin_verify: true
      });
      
      // Update local state
      setAllPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: true } : p
      ));
      setRegisteredPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: true } : p
      ));
      setFillingFormPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: true } : p
      ));
      setSelectedPlayer(prev => ({ ...prev, admin_verify: true }));
      
      // Send WhatsApp notification
      if (selectedPlayer.phone) {
        const playerName = selectedPlayer.name || selectedPlayer.displayName || 'Player';
        const whatsappResult = await sendPlayerApprovalNotification([selectedPlayer.phone], playerName);
        
        if (whatsappResult.success) {
          console.log('WhatsApp notification sent successfully');
        } else {
          console.error('Failed to send WhatsApp notification:', whatsappResult.error);
        }
      }
      
      alert('Player approved successfully!');
    } catch (error) {
      console.error('Error approving player:', error);
      alert('Failed to approve player');
    }
  };

  // Handle mass approve players
  const handleMassApprove = async () => {
    if (selectedPlayerIds.length === 0) {
      alert('Please select at least one player to approve');
      return;
    }
    
    const confirmMessage = `Are you sure you want to approve ${selectedPlayerIds.length} player(s)?`;
    if (!confirm(confirmMessage)) return;
    
    setIsApprovingMultiple(true);
    
    try {
      // Update all selected players
      const updatePromises = selectedPlayerIds.map(async (playerId) => {
        const playerRef = doc(db, 'ccpl-users', playerId);
        await updateDoc(playerRef, {
          admin_verify: true
        });
      });
      
      await Promise.all(updatePromises);
      
      // Update local state for all players
      const updatePlayersList = (playersList) =>
        playersList.map(p =>
          selectedPlayerIds.includes(p.id) ? { ...p, admin_verify: true } : p
        );
      
      setAllPlayers(prev => updatePlayersList(prev));
      setRegisteredPlayers(prev => updatePlayersList(prev));
      setFillingFormPlayers(prev => updatePlayersList(prev));
      
      // Send WhatsApp notifications to all approved players
      const approvedPlayers = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
      const phoneNumbers = approvedPlayers
        .map(p => p.phone)
        .filter(phone => phone); // Filter out empty/null phone numbers
      
      if (phoneNumbers.length > 0) {
        // Send notifications in the background (don't wait for it)
        sendPlayerApprovalNotification(phoneNumbers, 'Player')
          .then(result => {
            if (result.success) {
              console.log(`WhatsApp notifications sent to ${phoneNumbers.length} player(s)`);
            } else {
              console.error('Failed to send WhatsApp notifications:', result.error);
            }
          })
          .catch(error => {
            console.error('Error sending WhatsApp notifications:', error);
          });
      }
      
      // Clear selection
      setSelectedPlayerIds([]);
      
      alert(`Successfully approved ${selectedPlayerIds.length} player(s)!`);
    } catch (error) {
      console.error('Error approving players:', error);
      alert('Failed to approve some players. Please try again.');
    } finally {
      setIsApprovingMultiple(false);
    }
  };
  
  // Handle reject player
  const handleRejectPlayer = async () => {
    if (!selectedPlayer) return;
    
    if (!confirm('Are you sure you want to reject this player?')) return;
    
    try {
      const playerRef = doc(db, 'ccpl-users', selectedPlayer.id);
      await updateDoc(playerRef, {
        admin_verify: false
      });
      
      // Update local state
      setAllPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: false } : p
      ));
      setRegisteredPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: false } : p
      ));
      setFillingFormPlayers(prev => prev.map(p =>
        p.id === selectedPlayer.id ? { ...p, admin_verify: false } : p
      ));
      setSelectedPlayer(prev => ({ ...prev, admin_verify: false }));
      
      alert('Player rejected successfully!');
    } catch (error) {
      console.error('Error rejecting player:', error);
      alert('Failed to reject player');
    }
  };

  // Handle delete player
  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;
    
    const playerName = selectedPlayer.name || selectedPlayer.displayName || 'this player';
    if (!confirm(`Are you sure you want to delete ${playerName}? This action cannot be undone.`)) return;
    
    try {
      // Delete the player document
      const playerRef = doc(db, 'ccpl-users', selectedPlayer.id);
      await deleteDoc(playerRef);
      
      // Also delete the registration document if it exists
      if (selectedPlayer.hasPaymentId) {
        try {
          const registrationRef = doc(db, 'ccpl-users', selectedPlayer.id, 'registration', 'player-registration');
          await deleteDoc(registrationRef);
        } catch (regError) {
          console.error('Error deleting registration document:', regError);
          // Continue even if registration deletion fails
        }
      }
      
      // Update local state - remove the player from all lists
      setAllPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
      setRegisteredPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
      setFillingFormPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
      
      // Close the modal
      setShowPlayerDetailsModal(false);
      setSelectedPlayer(null);
      
      alert('Player deleted successfully!');
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to delete player');
    }
  };

  // Handle login as player (superadmin only)
  const handleLoginAsPlayer = async () => {
    if (!selectedPlayer || !isSuperAdmin()) {
      alert('Access denied. Super admin privileges required.');
      return;
    }

    try {
      // Fetch complete user data from ccpl-users collection
      const userRef = doc(db, 'ccpl-users', selectedPlayer.id);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        alert('Player data not found');
        return;
      }
      
      const userData = userSnap.data();
      
      // Create a user session matching the CCPLLogin format
      const playerSession = {
        id: selectedPlayer.id,
        ...userData
      };

      // Store in sessionStorage (same as CCPLLogin does without "remember me")
      sessionStorage.setItem('ccpl-user', JSON.stringify(playerSession));
      
      // Also log in using UserAuth context for compatibility
      userLogin({
        id: selectedPlayer.id,
        type: 'player',
        email: selectedPlayer.email,
        name: selectedPlayer.name || selectedPlayer.displayName || 'Player'
      });

      // Close the modal
      setShowPlayerDetailsModal(false);

      // Navigate to the player's CCPL profile (same as regular login flow)
      navigate(`/ccpl-profile/${selectedPlayer.id}`);
      
      alert(`Logged in as ${playerSession.name || selectedPlayer.name || 'Player'}. You are now viewing their CCPL profile.`);
    } catch (error) {
      console.error('Error logging in as player:', error);
      alert('Failed to login as player');
    }
  };

  // Handle verify payment with Razorpay
  const handleVerifyPayment = async (player) => {
    if (!player.email) {
      alert('Player email not found');
      return;
    }

    setVerifyingPayment(player.id);

    try {
      // Call Firebase Cloud Function to verify payment
      const response = await fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/verifyRazorpayPaymentByEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: player.email
        })
      });

      const data = await response.json();

      if (data.status === 'success' && data.payment) {
        // Payment found! Update Firebase with payment info
        const registrationRef = doc(db, 'ccpl-users', player.id, 'registration', 'player-registration');
        
        await updateDoc(registrationRef, {
          paymentInfo: {
            paymentId: data.payment.id,
            amount: data.payment.amount,
            currency: data.payment.currency,
            status: data.payment.status,
            method: data.payment.method,
            paidAt: new Date(data.payment.createdAt * 1000).toISOString(),
            verifiedViaRazorpay: true,
            verifiedAt: new Date().toISOString()
          }
        });

        // Refresh player data
        const updatedPlayers = await Promise.all(
          allPlayers.map(async (p) => {
            if (p.id === player.id) {
              const registrationDoc = await getDoc(registrationRef);
              if (registrationDoc.exists()) {
                return {
                  ...p,
                  hasPaymentId: true,
                  paymentId: data.payment.id,
                  paymentStatus: data.payment.status,
                  registrationData: registrationDoc.data()
                };
              }
            }
            return p;
          })
        );

        // Update state
        const registered = updatedPlayers.filter(p => p.hasPaymentId);
        const fillingForm = updatedPlayers.filter(p => !p.hasPaymentId);

        // Sort registered players by paidAt date (latest first)
        registered.sort((a, b) => {
          const dateA = a.registrationData?.paymentInfo?.paidAt;
          const dateB = b.registrationData?.paymentInfo?.paidAt;
          
          // Handle missing dates - put them at the end
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          // Convert to Date objects and compare (newest first)
          return new Date(dateB) - new Date(dateA);
        });

        setAllPlayers(updatedPlayers);
        setRegisteredPlayers(registered);
        setFillingFormPlayers(fillingForm);

        alert(`Payment verified! Payment ID: ${data.payment.id}\nAmount: ₹${(data.payment.amount / 100).toFixed(2)}\n\nPlayer has been moved to "Registered Players" tab.`);
      } else if (data.status === 'not_found') {
        alert(`No payment found in Razorpay for email: ${player.email}\n\nThe user may not have completed payment yet.`);
      } else {
        alert(`Error: ${data.message || 'Failed to verify payment'}`);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment. Please try again or check the console for details.');
    } finally {
      setVerifyingPayment(null);
    }
  };

  // Handle Excel export
  const handleExportToExcel = async () => {
    try {
      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Players');

      // Define columns with more detailed information
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Image URL', key: 'imageUrl', width: 50 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Age', key: 'age', width: 8 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Admin Verified', key: 'status', width: 15 },
        { header: 'DUPR Profile', key: 'duprProfile', width: 30 },
        { header: 'DUPR Doubles', key: 'duprDoubles', width: 12 },
        { header: 'DUPR Singles', key: 'duprSingles', width: 12 },
        { header: 'Years Playing', key: 'yearsPlaying', width: 15 },
        { header: 'Discipline', key: 'discipline', width: 20 },
        { header: 'Preference', key: 'preference', width: 20 },
        { header: 'Clubs', key: 'clubs', width: 40 },
        { header: 'Previous Leagues', key: 'previousLeagues', width: 40 },
        { header: 'Achievements', key: 'achievements', width: 40 },
        { header: 'Playing Style', key: 'playingStyle', width: 30 },
        { header: 'Strengths', key: 'strengths', width: 40 },
        { header: 'Bio', key: 'bio', width: 50 },
        { header: 'Contribution', key: 'contribution', width: 40 },
        { header: 'Match Day Availability', key: 'matchDayAvailability', width: 30 },
        { header: 'Practice Commitment', key: 'practiceCommitment', width: 30 },
        { header: 'Practice Days', key: 'practiceDays', width: 30 },
        { header: 'Practice Times', key: 'practiceTimes', width: 30 },
        { header: 'Practice Restrictions', key: 'practiceRestrictions', width: 40 },
        { header: 'Emergency Contact Name', key: 'emergencyName', width: 25 },
        { header: 'Emergency Contact Number', key: 'emergencyNumber', width: 20 },
        { header: 'Emergency Relationship', key: 'emergencyRelationship', width: 20 },
        { header: 'Medically Fit', key: 'medicallyFit', width: 15 }
      ];

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf97316' } // Orange color
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows from filtered players
      filteredPlayers.forEach((player) => {
        const regData = player.registrationData || {};
        
        // Calculate match day availability
        let matchDayAvailability = 'N/A';
        if (regData.step7?.matchdays) {
          const confirmedDays = [1, 2, 3, 4, 5, 6, 7].filter(
            day => regData.step7.matchdays[`md${day}`]
          );
          matchDayAvailability = confirmedDays.length > 0
            ? confirmedDays.map(d => `MD${d}`).join(', ')
            : 'None';
        }
        
        // Calculate practice days
        let practiceDays = 'N/A';
        if (regData.step8?.practiceDays) {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const selectedDays = days.filter((_, index) => regData.step8.practiceDays[index]);
          practiceDays = selectedDays.length > 0 ? selectedDays.join(', ') : 'None';
        }
        
        // Calculate practice times
        let practiceTimes = 'N/A';
        if (regData.step8?.practiceTimes) {
          const times = [];
          if (regData.step8.practiceTimes[0]) times.push('Morning');
          if (regData.step8.practiceTimes[1]) times.push('Afternoon');
          if (regData.step8.practiceTimes[2]) times.push('Evening');
          practiceTimes = times.length > 0 ? times.join(', ') : 'None';
        }

        worksheet.addRow({
          name: player.name || player.displayName || 'N/A',
          imageUrl: player.playerPhoto || player.picture || 'N/A',
          phone: player.phone || 'N/A',
          email: player.email || 'N/A',
          gender: formatGender(player.gender),
          age: calculateAge(player.dateOfBirth),
          dob: player.dateOfBirth || 'N/A',
          city: player.city || 'N/A',
          status: player.admin_verify ? 'Verified' : 'Not Verified',
          duprProfile: regData.step5?.duprProfile || 'N/A',
          duprDoubles: regData.step5?.duprDoubles || 'N/A',
          duprSingles: regData.step5?.duprSingles || 'N/A',
          yearsPlaying: regData.step5?.yearsPlaying || 'N/A',
          discipline: regData.step5?.discipline || 'N/A',
          preference: regData.step5?.preference || 'N/A',
          clubs: regData.step5?.clubs || 'N/A',
          previousLeagues: regData.step5?.previousLeagues || 'N/A',
          achievements: regData.step5?.achievements || 'N/A',
          playingStyle: regData.step6?.playingStyle || 'N/A',
          strengths: regData.step6?.strengths || 'N/A',
          bio: regData.step6?.bio || 'N/A',
          contribution: regData.step6?.contribution || 'N/A',
          matchDayAvailability: matchDayAvailability,
          practiceCommitment: regData.step8?.practiceCommit || 'N/A',
          practiceDays: practiceDays,
          practiceTimes: practiceTimes,
          practiceRestrictions: regData.step8?.practiceRestrictions || 'N/A',
          emergencyName: regData.step10?.emergencyName || 'N/A',
          emergencyNumber: regData.step10?.emergencyNumber || 'N/A',
          emergencyRelationship: regData.step10?.emergencyRelationship || 'N/A',
          medicallyFit: regData.step10?.medicallyFit || 'N/A'
        });
      });

      // Auto-fit columns and wrap text for better readability
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'top', wrapText: true };
          }
        });
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Create filename with current date and tab name
      const tabName = activeTab === 'registered' ? 'Registered' : 'FillingForm';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Players_${tabName}_${date}.xlsx`;
      
      // Save the file
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Players Management</h1>
          <p className="text-gray-600">Manage all registered players</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('registered');
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'registered'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Registered Players ({registeredPlayers.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('filling-form');
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'filling-form'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Players Filling Form ({fillingFormPlayers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {activeTab === 'registered' ? 'Registered Players' : 'Players Filling Form'}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {activeTab === 'registered'
                      ? 'Players who have completed payment and registration'
                      : 'Players who have started but not completed payment'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {selectedPlayerIds.length > 0 && (
                    <button
                      onClick={handleMassApprove}
                      disabled={isApprovingMultiple}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isApprovingMultiple ? 'Approving...' : `Approve Selected (${selectedPlayerIds.length})`}
                    </button>
                  )}
                  <button
                    onClick={handleExportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={filteredPlayers.length === 0}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </button>
                  <span className="text-sm text-gray-500">
                    Showing {filteredPlayers.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-{Math.min(currentPage * pageSize, filteredPlayers.length)} of {filteredPlayers.length} players
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="search"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Search name, email, phone..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="gender-filter" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    id="gender-filter"
                    name="gender"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    value={filters.gender}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="min-age" className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
                  <input
                    type="number"
                    id="min-age"
                    name="minAge"
                    min="0"
                    max="100"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Min"
                    value={filters.minAge}
                    onChange={handleFilterChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="max-age" className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
                  <input
                    type="number"
                    id="max-age"
                    name="maxAge"
                    min="0"
                    max="100"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Max"
                    value={filters.maxAge}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {players.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No player registrations found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={players.length > 0 && selectedPlayerIds.length === players.length}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin Verified
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {players.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPlayerIds.includes(player.id)}
                              onChange={() => handleSelectPlayer(player.id)}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {player.playerPhoto ? (
                                  <img
                                    src={player.playerPhoto.replace('/upload/', '/upload/q_auto,w_100,h_100,c_fill,g_face/')}
                                    alt={player.name || player.displayName || 'Player'}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : player.picture ? (
                                  <OptimizedImage
                                    src={player.picture}
                                    alt={player.name || player.displayName || 'Player'}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-500 font-medium text-sm">
                                      {(player.name || player.displayName)?.charAt(0) || 'P'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {player.name || player.displayName || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateAge(player.dateOfBirth)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatGender(player.gender)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.city || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              player.admin_verify ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {player.admin_verify ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(player.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewPlayerDetails(player)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                View Details
                              </button>
                              {activeTab === 'filling-form' && (
                                <button
                                  onClick={() => handleVerifyPayment(player)}
                                  disabled={verifyingPayment === player.id}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  title="Check if this user has paid via Razorpay"
                                >
                                  {verifyingPayment === player.id ? 'Checking...' : 'Check Payment'}
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
                  <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6 gap-3">
                    <div className="flex-1 flex justify-between w-full sm:hidden">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full flex-wrap gap-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <p className="text-sm text-gray-700 whitespace-nowrap">
                          Showing page <span className="font-medium">{currentPage}</span> of{' '}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <label htmlFor="pageSize" className="text-sm text-gray-700 whitespace-nowrap">
                            Rows per page:
                          </label>
                          <select
                            id="pageSize"
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={150}>150</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {[...Array(totalPages)].map((_, index) => {
                            const pageNumber = index + 1;
                            if (
                              pageNumber === 1 ||
                              pageNumber === totalPages ||
                              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => handlePageChange(pageNumber)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    currentPage === pageNumber
                                      ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            } else if (
                              pageNumber === currentPage - 2 ||
                              pageNumber === currentPage + 2
                            ) {
                              return (
                                <span
                                  key={pageNumber}
                                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Player Details Modal */}
        {showPlayerDetailsModal && selectedPlayer && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPlayerDetailsModal(false)}></div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Player Registration Details
                        </h3>
                        <div className="flex items-center gap-2">
                          {/* Only show approve/reject buttons for registered players (those with payment ID) */}
                          {selectedPlayer.hasPaymentId && (
                            <>
                              {selectedPlayer.admin_verify ? (
                                <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-medium">
                                  Approved
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={handleApprovePlayer}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={handleRejectPlayer}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => setShowPlayerDetailsModal(false)}
                            className="text-gray-400 hover:text-gray-500 ml-2"
                          >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Full Name</p>
                              <p className="text-sm text-gray-900">{selectedPlayer.name || selectedPlayer.displayName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Email</p>
                              <p className="text-sm text-gray-900">{selectedPlayer.email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Phone</p>
                              <p className="text-sm text-gray-900">{selectedPlayer.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Gender</p>
                              <p className="text-sm text-gray-900">{formatGender(selectedPlayer.gender)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                              <p className="text-sm text-gray-900">{selectedPlayer.dateOfBirth || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Age</p>
                              <p className="text-sm text-gray-900">{calculateAge(selectedPlayer.dateOfBirth)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Registration Steps */}
                        {selectedPlayer.registrationData && (
                          <div className="space-y-4">
                            {/* Step 2: Government ID */}
                            {selectedPlayer.registrationData.step2 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 2: Government ID</h4>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">ID Type</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step2.govIdType || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">ID Number</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step2.govIdNumber || 'N/A'}</p>
                                  </div>
                                  {selectedPlayer.registrationData.step2.govIdFile && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-1">ID Document</p>
                                      <a href={selectedPlayer.registrationData.step2.govIdFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">View Document</a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 3: Eligibility */}
                            {selectedPlayer.registrationData.step3 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 3: Eligibility</h4>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Eligibility Route</p>
                                  <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step3.eligibilityRoute || 'N/A'}</p>
                                </div>
                              </div>
                            )}

                            {/* Step 4: Residency */}
                            {selectedPlayer.registrationData.step4 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 4: Residency Proof</h4>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Residing in Hyderabad</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step4.residing || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Residency Basis</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step4.residencyBasis || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Document Type</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step4.residencyDocType || 'N/A'}</p>
                                  </div>
                                  {selectedPlayer.registrationData.step4.residencyFile && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-1">Residency Document</p>
                                      <a href={selectedPlayer.registrationData.step4.residencyFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">View Document</a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 5: Player Profile */}
                            {selectedPlayer.registrationData.step5 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 5: Player Profile</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">DUPR Profile</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.duprProfile || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Doubles Rating</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.duprDoubles || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Singles Rating</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.duprSingles || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Years Playing</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.yearsPlaying || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Discipline</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.discipline || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Preference</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.preference || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Clubs</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.clubs || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Previous Leagues</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.previousLeagues || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Achievements</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step5.achievements || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Step 6: Player Bio */}
                            {selectedPlayer.registrationData.step6 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 6: Player Bio</h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Playing Style</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step6.playingStyle || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Strengths</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step6.strengths || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Bio</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step6.bio || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Contribution</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step6.contribution || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Step 7: Availability */}
                            {selectedPlayer.registrationData.step7 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 7: Match Day Availability</h4>
                                <div className="space-y-2">
                                  {selectedPlayer.registrationData.step7.matchdays && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Confirmed Match Days</p>
                                      <p className="text-sm text-gray-900">
                                        {(() => {
                                          const confirmedCount = [1, 2, 3, 4, 5, 6, 7].filter(
                                            day => selectedPlayer.registrationData.step7.matchdays[`md${day}`]
                                          ).length;
                                          return `${confirmedCount} out of 7 days`;
                                        })()}
                                      </p>
                                      <div className="mt-2 flex gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                          <span
                                            key={day}
                                            className={`px-2 py-1 text-xs rounded ${
                                              selectedPlayer.registrationData.step7.matchdays[`md${day}`]
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-500'
                                            }`}
                                          >
                                            MD{day}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {selectedPlayer.registrationData.step7.postseasonDates && (
                                    <div className="mt-3">
                                      <p className="text-sm font-medium text-gray-500">Postseason Availability</p>
                                      <div className="flex gap-2 mt-1">
                                        {selectedPlayer.registrationData.step7.postseasonDates.playoffs && (
                                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Playoffs</span>
                                        )}
                                        {selectedPlayer.registrationData.step7.postseasonDates.final && (
                                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Final</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 8: Practice Commitment */}
                            {selectedPlayer.registrationData.step8 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 8: Practice Commitment</h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Practice Commitment</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step8.practiceCommit || 'N/A'}</p>
                                  </div>
                                  {selectedPlayer.registrationData.step8.practiceDays && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-2">Practice Days</p>
                                      <div className="flex gap-2">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                          <span
                                            key={index}
                                            className={`px-2 py-1 text-xs rounded ${
                                              selectedPlayer.registrationData.step8.practiceDays[index]
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-500'
                                            }`}
                                          >
                                            {day}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {selectedPlayer.registrationData.step8.practiceTimes && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-2">Practice Times</p>
                                      <div className="flex gap-2">
                                        {selectedPlayer.registrationData.step8.practiceTimes[0] && (
                                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Morning</span>
                                        )}
                                        {selectedPlayer.registrationData.step8.practiceTimes[1] && (
                                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Afternoon</span>
                                        )}
                                        {selectedPlayer.registrationData.step8.practiceTimes[2] && (
                                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Evening</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {selectedPlayer.registrationData.step8.practiceRestrictions && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Practice Restrictions</p>
                                      <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step8.practiceRestrictions}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 9: Auction Preferences */}
                            {selectedPlayer.registrationData.step9 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 9: Auction Preferences</h4>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Franchise Preference</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step9.franchisePref || 'N/A'}</p>
                                  </div>
                                  {selectedPlayer.registrationData.step9.franchisePrefOther && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Other Preference</p>
                                      <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step9.franchisePrefOther}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Pre-Auction Status</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step9.preAuction || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Step 10: Emergency Contact */}
                            {selectedPlayer.registrationData.step10 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 10: Emergency Contact</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Name</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step10.emergencyName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Number</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step10.emergencyNumber || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Relationship</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step10.emergencyRelationship || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Medically Fit</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.step10.medicallyFit || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Step 11: Photos */}
                            {selectedPlayer.registrationData.step11 && (
                              <div className="border border-gray-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Step 11: Photos</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {selectedPlayer.registrationData.step11.playerPhoto && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-2">Player Photo</p>
                                      <img
                                        src={selectedPlayer.registrationData.step11.playerPhoto.replace('/upload/', '/upload/q_auto,w_200,h_200,c_fill,g_face/')}
                                        alt="Player"
                                        className="w-32 h-32 rounded-lg object-cover"
                                      />
                                    </div>
                                  )}
                                  {selectedPlayer.registrationData.step11.actionPhoto && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500 mb-2">Action Photo</p>
                                      <img
                                        src={selectedPlayer.registrationData.step11.actionPhoto.replace('/upload/', '/upload/q_auto,w_200,h_200,c_fill/')}
                                        alt="Action"
                                        className="w-32 h-32 rounded-lg object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Payment Info */}
                            {selectedPlayer.registrationData.paymentInfo && (
                              <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Payment ID</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.paymentInfo.paymentId || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Amount</p>
                                    <p className="text-sm text-gray-900">₹{selectedPlayer.registrationData.paymentInfo.amount ? (selectedPlayer.registrationData.paymentInfo.amount / 100).toFixed(2) : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.paymentInfo.status || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Paid At</p>
                                    <p className="text-sm text-gray-900">{selectedPlayer.registrationData.paymentInfo.paidAt || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowPlayerDetailsModal(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {/* Login as Player button - Only for superadmins */}
                    {isSuperAdmin() && (
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-blue-300 shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={handleLoginAsPlayer}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Login as Player
                      </button>
                    )}
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={handleDeletePlayer}
                    >
                      Delete Player
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}