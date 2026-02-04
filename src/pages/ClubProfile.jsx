import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';

export default function ClubProfile() {
  const { clubId } = useParams();
  const [clubData, setClubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clubInfo');
  const [playersTab, setPlayersTab] = useState('myPlayers');
  const [myPlayers, setMyPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Payment modal states
  const [showApprovalPaymentModal, setShowApprovalPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
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

  // Check if club is approved but hasn't paid the Rs. 2,00,000 fee
  useEffect(() => {
    if (clubData && clubData.status === 'approved' && !clubData.finalPaymentCompleted) {
      setShowApprovalPaymentModal(true);
    }
  }, [clubData]);

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

  // Filter players based on search and filters
  useEffect(() => {
    if (availablePlayers.length === 0) return;

    let filtered = availablePlayers.filter(player => {
      // Search by name
      const matchesSearch = searchTerm === '' ||
        player.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

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
          name: clubData.primaryOwnerName || '',
          email: clubData.emailId || '',
          contact: clubData.phoneNumber || ''
        },
        notes: {
          club_name: clubData.proposedClubName || '',
          owner_name: clubData.primaryOwnerName || '',
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

      const response = await fetch('https://sendrecruitmentemail-ixqhqhqhha-uc.a.run.app', {
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
      return true;
    } catch (error) {
      console.error('Error sending recruitment email:', error);
      return false;
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
        clubOwner: clubData.primaryOwnerName,
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
        clubData.primaryOwnerName,
        clubData.phoneNumber,
        clubData.emailId
      );

      if (emailSent) {
        alert(`Recruitment request sent successfully to ${player.fullName}! They have been notified via email.`);
      } else {
        alert(`Recruitment request sent successfully to ${player.fullName}! However, there was an issue sending the email notification. Please contact them directly.`);
      }
      
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
                  Owner: {clubData.primaryOwnerName}
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
                          {clubData.primaryOwnerName}
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

              {activeTab === 'players' && (
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
              )}
            </div>
          </div>
        </div>
      </div>

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

      <Footer />
    </div>
  );
}
