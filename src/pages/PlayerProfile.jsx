import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function PlayerProfile() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('playerInfo');
  const [recruitmentRequests, setRecruitmentRequests] = useState([]);
  const [showClubModal, setShowClubModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerClub, setPlayerClub] = useState(null);
  
  // Payment related states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [pendingApprovalData, setPendingApprovalData] = useState(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        if (playerId) {
          const playerDoc = await getDoc(doc(db, 'clubs-players', playerId));
          if (playerDoc.exists()) {
            setPlayerData({ id: playerDoc.id, ...playerDoc.data() });
          } else {
            console.error('Player not found');
            navigate('/hpl-player-registration');
          }
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
        navigate('/hpl-player-registration');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, navigate]);

  // Fetch player's club information if they are recruited
  useEffect(() => {
    const fetchPlayerClub = async () => {
      if (!playerData || !playerData.recruitedBy) return;
      
      try {
        const clubDoc = await getDoc(doc(db, 'hpl-clubs', playerData.recruitedBy));
        if (clubDoc.exists()) {
          setPlayerClub({
            id: clubDoc.id,
            ...clubDoc.data()
          });
        }
      } catch (error) {
        console.error('Error fetching player club:', error);
      }
    };

    fetchPlayerClub();
  }, [playerData]);

  // Fetch recruitment requests for this player
  useEffect(() => {
    const fetchRecruitmentRequests = async () => {
      if (!playerId) return;
      
      try {
        const requestsQuery = query(
          collection(db, 'recruitment-requests'),
          where('playerId', '==', playerId),
          where('status', '==', 'pending')
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        
        const requests = [];
        for (const requestDoc of requestsSnapshot.docs) {
          const requestData = requestDoc.data();
          
          // Check if request is still valid (not expired)
          const requestTime = requestData.createdAt?.toDate() || new Date(0);
          const hoursDiff = (new Date() - requestTime) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            // Fetch club details
            try {
              const clubDoc = await getDoc(doc(db, 'hpl-clubs', requestData.clubId));
              if (clubDoc.exists()) {
                const clubData = clubDoc.data();
                requests.push({
                  id: requestDoc.id,
                  ...requestData,
                  clubDetails: {
                    id: clubDoc.id,
                    ...clubData
                  }
                });
              }
            } catch (error) {
              console.error('Error fetching club details:', error);
            }
          }
        }
        
        setRecruitmentRequests(requests);
      } catch (error) {
        console.error('Error fetching recruitment requests:', error);
      }
    };

    if (activeTab === 'clubs') {
      fetchRecruitmentRequests();
    }
  }, [playerId, activeTab]);

  const handleApproveRequest = async (requestId, clubId) => {
    try {
      // Find the request to get club and player details
      const request = recruitmentRequests.find(req => req.id === requestId);
      if (!request) {
        alert('Request not found.');
        return;
      }

      // Store the approval data for after payment
      setPendingApprovalData({ requestId, clubId, request });
      
      // Show payment modal instead of directly approving
      setShowPaymentModal(true);
      setPaymentError('');
      
    } catch (error) {
      console.error('Error initiating approval process:', error);
      alert('Failed to initiate approval process. Please try again.');
    }
  };

  // Handle payment success and complete the club joining process
  const handlePaymentSuccess = async (paymentData) => {
    if (!pendingApprovalData) {
      console.error('No pending approval data found');
      return;
    }

    const { requestId, clubId, request } = pendingApprovalData;

    try {
      setPaymentProcessing(true);

      // Update request status to approved with payment info
      await updateDoc(doc(db, 'recruitment-requests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        paymentInfo: {
          paymentId: paymentData.razorpay_payment_id,
          orderId: paymentData.razorpay_order_id || 'N/A',
          signature: paymentData.razorpay_signature || 'N/A',
          amount: 590000, // Rs. 5,900 in paise (5000 + 18% GST)
          currency: 'INR',
          paidAt: serverTimestamp()
        }
      });

      // Update player's recruitedBy field with payment completion
      await updateDoc(doc(db, 'clubs-players', playerId), {
        recruitedBy: clubId,
        clubJoinedAt: serverTimestamp(),
        registrationPaymentCompleted: true,
        registrationPaymentInfo: {
          paymentId: paymentData.razorpay_payment_id,
          amount: 590000,
          paidAt: serverTimestamp()
        }
      });

      // Update local player data
      setPlayerData(prev => ({
        ...prev,
        recruitedBy: clubId,
        registrationPaymentCompleted: true
      }));

      // Fetch and set the club information
      try {
        const clubDoc = await getDoc(doc(db, 'hpl-clubs', clubId));
        if (clubDoc.exists()) {
          setPlayerClub({
            id: clubDoc.id,
            ...clubDoc.data()
          });
        }
      } catch (error) {
        console.error('Error fetching club details:', error);
      }

      // Send email notification to club owner
      try {
        const emailData = {
          to: request.clubDetails.emailId,
          subject: `Player Approved - ${playerData.fullName} has joined ${request.clubDetails.proposedClubName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f97316;">Great News! A Player Has Joined Your Club</h2>
              
              <p>Dear ${request.clubDetails.primaryOwnerName},</p>
              
              <p>We're excited to inform you that <strong>${playerData.fullName}</strong> has approved your recruitment request, completed their registration payment, and has officially joined <strong>${request.clubDetails.proposedClubName}</strong>!</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Player Details:</h3>
                <ul style="color: #6b7280;">
                  <li><strong>Name:</strong> ${playerData.fullName}</li>
                  <li><strong>Email:</strong> ${playerData.emailId}</li>
                  <li><strong>Phone:</strong> ${playerData.mobileNumber}</li>
                  <li><strong>Gender:</strong> ${playerData.gender || 'N/A'}</li>
                  <li><strong>Singles DUPR:</strong> ${playerData.singlesRating || 'N/A'}</li>
                  <li><strong>Doubles DUPR:</strong> ${playerData.doublesRating || 'N/A'}</li>
                </ul>
              </div>
              
              <div style="background-color: #e6f7ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1890ff;">
                <p style="margin: 0; color: #0050b3;"><strong>Payment Completed:</strong> Rs. 5,900 (Rs. 5,000 + 18% GST)</p>
              </div>
              
              <p>You can now contact ${playerData.fullName} directly to coordinate training sessions, matches, and club activities.</p>
              
              <p>Welcome ${playerData.fullName} to your team!</p>
              
              <p>Best regards,<br>
              HPL Clubs Team</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px;">
                This email was sent automatically when a player approved your recruitment request and completed payment.
              </p>
            </div>
          `
        };

        // Send email using Firebase Cloud Function
        const response = await fetch(`https://sendrecruitmentemail-ixqhqhqhha-uc.a.run.app`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...emailData,
            type: 'approval_confirmation'
          })
        });

        if (response.ok) {
          console.log('Approval confirmation email sent successfully to club owner:', request.clubDetails.emailId);
        } else {
          const errorText = await response.text();
          console.error('Email sending failed:', response.status, errorText);
          throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
        }
        
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the approval process if email fails
      }

      // Remove the request from local state
      setRecruitmentRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Close payment modal and reset states
      setShowPaymentModal(false);
      setPendingApprovalData(null);
      setPaymentProcessing(false);
      
      alert(`Club recruitment approved successfully! Payment completed and ${request.clubDetails.primaryOwnerName} has been notified via email.`);
      
    } catch (error) {
      console.error('Error completing approval after payment:', error);
      setPaymentProcessing(false);
      setPaymentError('Failed to complete club joining process after payment. Please contact support.');
    }
  };

  // Handle Razorpay payment
  const handlePlayerRegistrationPayment = async () => {
    if (!window.Razorpay) {
      setPaymentError('Payment gateway not loaded. Please refresh the page and try again.');
      return;
    }

    if (!pendingApprovalData) {
      setPaymentError('No pending approval data found. Please try again.');
      return;
    }

    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const baseAmount = 5000; // Rs. 5,000
      const gstAmount = Math.round(baseAmount * 0.18); // 18% GST = Rs. 900
      const totalAmount = baseAmount + gstAmount; // Rs. 5,900
      const totalAmountInPaise = totalAmount * 100; // Convert to paise = 5,90,000 paise

      console.log('Player registration payment calculation:', {
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
        description: `Player Registration - ${playerData.fullName}`,
        handler: function (response) {
          console.log('Player registration payment successful:', response);
          handlePaymentSuccess(response);
        },
        prefill: {
          name: playerData.fullName || '',
          email: playerData.emailId || '',
          contact: playerData.mobileNumber || ''
        },
        notes: {
          player_name: playerData.fullName || '',
          player_email: playerData.emailId || '',
          payment_type: 'player_registration',
          player_id: playerId,
          club_id: pendingApprovalData.clubId,
          club_name: pendingApprovalData.request.clubDetails.proposedClubName,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function() {
            console.log('Player registration payment modal dismissed');
            setPaymentProcessing(false);
          }
        }
      };

      console.log('Initializing player registration payment with options:', options);

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.error('Player registration payment failed:', response);
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
      console.error('Error initializing player registration payment:', error);
      setPaymentProcessing(false);
      setPaymentError('Payment initialization failed. Please try again.');
      alert(`Error: ${error.message}`);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      // Update request status to rejected
      await updateDoc(doc(db, 'recruitment-requests', requestId), {
        status: 'rejected',
        rejectedAt: new Date()
      });

      // Remove the request from local state
      setRecruitmentRequests(prev => prev.filter(req => req.id !== requestId));
      
      alert('Club recruitment rejected.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  const handleReadMore = (clubDetails) => {
    setSelectedClub(clubDetails);
    setShowClubModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-').toUpperCase();
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Convert DD-MM-YYYY to display format
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                     'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const day = parts[0];
      const month = months[parseInt(parts[1]) - 1];
      const year = parts[2];
      return `${day} ${month}-${year}`;
    }
    return dateString;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
          Loading player profile...
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl" style={{fontFamily: 'Avantique, sans-serif'}}>
          Player not found
        </div>
      </div>
    );
  }

  // Filter recruitment requests based on search term
  const filteredRequests = recruitmentRequests.filter(request =>
    request.clubDetails?.proposedClubName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.clubDetails?.primaryOwnerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{backgroundColor: '#212121'}}>
      <style>{`
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueRegularFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueMediumFont}') format('woff');
          font-weight: 500;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueSemiboldFont}') format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Avantique';
          src: url('${AvantiqueBoldFont}') format('woff');
          font-weight: bold;
          font-style: normal;
        }
      `}</style>


      <NewHomeNavbar />

      {/* Profile Header */}
      <div className="py-8 px-6 sm:px-8 lg:px-12">
        <div className="flex items-center space-x-6">
          {/* Profile Photo */}
          <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            {playerData.photoUrl ? (
              <img 
                src={playerData.photoUrl} 
                alt={playerData.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <p className="text-gray-400 text-sm mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
              Player name
            </p>
            <h1 className="text-orange-400 text-4xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              {playerData.fullName?.toUpperCase() || 'PLAYER NAME'}
            </h1>
            <p className="text-gray-400 text-sm mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
              Joined on date
            </p>
            <p className="text-white text-2xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
              {formatDate(playerData.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 sm:px-8 lg:px-12 pb-12">
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          <div className="flex">
            {/* Side Menu */}
            <div className="w-80 bg-gray-800 border-r border-gray-600">
              <button
                onClick={() => setActiveTab('playerInfo')}
                className={`w-full px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === 'playerInfo' 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                PLAYER INFO
              </button>
              <button
                onClick={() => setActiveTab('clubs')}
                className={`w-full px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === 'clubs' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                CLUBS
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gray-900">
              {activeTab === 'playerInfo' && (
                <div className="p-8">
                  <h2 className="text-white text-2xl font-bold mb-8" style={{fontFamily: 'Avantique, sans-serif'}}>
                    PLAYER INFORMATION
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Basic Details */}
                    <div className="space-y-6">
                      <h3 className="text-orange-400 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                        BASIC DETAILS
                      </h3>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Full Name</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.fullName || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Mobile Number</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.mobileNumber || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Email ID</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.emailId || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Gender</label>
                        <p className="text-white text-lg capitalize" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.gender || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Date of Birth</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{formatDisplayDate(playerData.dateOfBirth)}</p>
                      </div>
                    </div>

                    {/* DUPR Ratings */}
                    <div className="space-y-6">
                      <h3 className="text-orange-400 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                        DUPR RATINGS
                      </h3>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Singles Rating</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.singlesRating || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Doubles Rating</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.doublesRating || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Singles Reliability Score</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.singlesReliabilityScore || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Doubles Reliability Score</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.doublesReliabilityScore || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>DUPR ID</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.duprId || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dilemma Responses */}
                  <div className="mt-12">
                    <h3 className="text-orange-400 text-xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                      EVERYDAY DILEMMAS RESPONSES
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Bus Dilemma Response</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.dilemma1 || 'Not answered'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Ticket Dilemma Response</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.dilemma2 || 'Not answered'}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>Group Decision Dilemma Response</label>
                        <p className="text-white text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>{playerData.dilemma3 || 'Not answered'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Why Pick You */}
                  <div className="mt-12">
                    <h3 className="text-orange-400 text-xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                      WHY SHOULD A CLUB PICK YOU?
                    </h3>
                    <p className="text-white text-lg leading-relaxed" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {playerData.whyPickYou || 'No response provided'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'clubs' && (
                <div className="p-8">
                  {/* Show club information if player is already recruited */}
                  {playerClub ? (
                    <div>
                      <h2 className="text-white text-2xl font-bold mb-8" style={{fontFamily: 'Avantique, sans-serif'}}>
                        MY CLUB
                      </h2>
                      
                      {/* Club Header */}
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-8 mb-8 text-white">
                        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                          {/* Club Logo/Avatar */}
                          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-orange-600" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.proposedClubName?.charAt(0) || 'C'}
                            </span>
                          </div>
                          
                          {/* Club Info */}
                          <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-bold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.proposedClubName} {playerClub.clubNamingFormat}
                            </h1>
                            <p className="text-xl opacity-90 mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Owner: {playerClub.primaryOwnerName}
                            </p>
                            <p className="opacity-75" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Joined: {new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Club Details */}
                      <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-white mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                          Club Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Primary Owner
                            </label>
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.primaryOwnerName}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Phone Number
                            </label>
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.phoneNumber}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Email ID
                            </label>
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.emailId}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Community Manager
                            </label>
                            <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.communityManagerName || 'Not provided'}
                            </p>
                          </div>
                        </div>

                        {/* Club Description */}
                        {playerClub.clubDescription && (
                          <div className="mt-6">
                            <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Club Description
                            </label>
                            <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.clubDescription}
                            </p>
                          </div>
                        )}

                        {/* Club USP */}
                        {playerClub.clubUSP && (
                          <div className="mt-6">
                            <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                              Club USP
                            </label>
                            <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                              {playerClub.clubUSP}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Show recruitment requests if player is not recruited */
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-white text-2xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                          CLUB RECRUITMENT
                        </h2>
                        <h2 className="text-white text-2xl font-bold italic" style={{fontFamily: 'Avantique, sans-serif'}}>
                          REQUESTS
                        </h2>
                      </div>

                      {/* Search Bar */}
                      <div className="mb-8">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="SEARCH FOR CLUB"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                            style={{fontFamily: 'Avantique, sans-serif'}}
                          />
                          <button className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="bg-gray-800 rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-orange-600 text-white font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                          <div>TEAM NAME</div>
                          <div className="text-center">TEAM SIZE</div>
                          <div className="text-center">TEAM OWNER NAME</div>
                          <div className="text-center">OWNER CONTACT</div>
                          <div className="text-center">ACTIONS</div>
                          <div className="text-center">STATUS</div>
                        </div>

                        {/* Table Rows */}
                        {filteredRequests.length === 0 ? (
                          <div className="px-6 py-8 text-center text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                            {recruitmentRequests.length === 0 ? 'No recruitment requests found.' : 'No clubs match your search.'}
                          </div>
                        ) : (
                          filteredRequests.map((request, index) => (
                            <div key={request.id} className={`grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}>
                              <div className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                {request.clubDetails?.proposedClubName || 'N/A'}
                              </div>
                              <div className="text-white text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                N/A
                              </div>
                              <div className="text-white text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                {request.clubDetails?.primaryOwnerName || 'N/A'}
                              </div>
                              <div className="text-white text-center" style={{fontFamily: 'Avantique, sans-serif'}}>
                                {request.clubDetails?.phoneNumber || 'N/A'}
                              </div>
                              <div className="text-center space-x-2">
                                <button
                                  onClick={() => handleReadMore(request.clubDetails)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                >
                                  Read More
                                </button>
                                <button
                                  onClick={() => handleApproveRequest(request.id, request.clubId)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                                  style={{fontFamily: 'Avantique, sans-serif'}}
                                >
                                  Reject
                                </button>
                              </div>
                              <div className="text-center">
                                <span className="px-3 py-1 rounded text-sm font-medium bg-yellow-600 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                                  Pending
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Club Details Modal */}
      {showClubModal && selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Club Details
                </h2>
                <button
                  onClick={() => setShowClubModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Club Logo/Avatar */}
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                    {selectedClub.proposedClubName?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                    {selectedClub.proposedClubName} {selectedClub.clubNamingFormat}
                  </h3>
                  <p className="text-gray-400" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Owner: {selectedClub.primaryOwnerName}
                  </p>
                </div>
              </div>

              {/* Club Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Club Name
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.proposedClubName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Primary Owner
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.primaryOwnerName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Phone Number
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.phoneNumber}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Email ID
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.emailId}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Community Manager
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.communityManagerName || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Venue Access
                    </label>
                    <p className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.venueAccess || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Club Description */}
                {selectedClub.clubDescription && (
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Club Description
                    </label>
                    <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.clubDescription}
                    </p>
                  </div>
                )}

                {/* Club USP */}
                {selectedClub.clubUSP && (
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Club USP
                    </label>
                    <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.clubUSP}
                    </p>
                  </div>
                )}

                {/* Unique Culture */}
                {selectedClub.uniqueCulture && (
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                      Unique Culture
                    </label>
                    <p className="text-white bg-gray-700 p-4 rounded-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                      {selectedClub.uniqueCulture}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowClubModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Registration Payment Modal */}
      {showPaymentModal && pendingApprovalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎾</div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                Complete Your Registration
              </h2>
              <p className="text-lg text-orange-400 font-semibold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                Join {pendingApprovalData.request.clubDetails.proposedClubName}
              </p>
              <p className="text-gray-300 mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
                To complete your club registration, please pay the one-time registration fee of Rs. 5,000 + 18% GST.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3" style={{fontFamily: 'Avantique, sans-serif'}}>
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Player Registration Fee:</span>
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 5,000</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>GST (18%):</span>
                  <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 900</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span style={{fontFamily: 'Avantique, sans-serif'}}>Total Amount:</span>
                    <span style={{fontFamily: 'Avantique, sans-serif'}}>Rs. 5,900</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                <strong>Note:</strong> This is a one-time registration fee required to join any HPL club.
                Once paid, you'll be officially part of the club and can participate in all activities.
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
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingApprovalData(null);
                  setPaymentError('');
                }}
                disabled={paymentProcessing}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  paymentProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                Cancel
              </button>
              <button
                onClick={handlePlayerRegistrationPayment}
                disabled={paymentProcessing}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  paymentProcessing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
                style={{fontFamily: 'Avantique, sans-serif'}}
              >
                {paymentProcessing ? 'Processing...' : 'Pay Rs. 5,900'}
              </button>
            </div>

            <p className="text-gray-400 text-xs text-center mt-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>
      )}
    </div>
  );
}