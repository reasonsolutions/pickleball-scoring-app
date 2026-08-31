import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, arrayRemove, arrayUnion, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';

export default function CCPLProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('playerInfo');
  const [teamRequests, setTeamRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, teamId: null, teamName: '' });
  const [processingRequest, setProcessingRequest] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const accentColor = '#ee3a24';
  const accentColorDark = '#7d0f0f';

  const leagues = [
    { label: 'CCPL S2', href: '/ccpl-home', active: true },
    { label: 'CCPL S1', href: '/ccpl-s1', active: false },
    { label: 'CCPL Clubs', href: '/hpl-clubs', active: false },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const loggedInUser = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
        
        if (!loggedInUser) {
          // Not logged in, redirect to login
          navigate('/ccpl-login');
          return;
        }
        
        const parsedUser = JSON.parse(loggedInUser);
        
        // Check if the logged-in user is accessing their own profile
        if (parsedUser.id !== userId) {
          // Trying to access someone else's profile, redirect to their own
          navigate(`/ccpl-profile/${parsedUser.id}`);
          return;
        }
        
        // Fetch user data from ccpl-users collection
        const userRef = doc(db, 'ccpl-users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        const userData = { id: userSnap.id, ...userSnap.data() };
        setUserData(userData);
        
        // Fetch registration data from subcollection
        const registrationRef = doc(db, 'ccpl-users', userId, 'registration', 'player-registration');
        const registrationSnap = await getDoc(registrationRef);
        
        if (registrationSnap.exists()) {
          setRegistrationData(registrationSnap.data());
        }
        
        // Fetch team requests if first-pick array exists
        if (userData['first-pick'] && userData['first-pick'].length > 0) {
          await fetchTeamRequests(userData['first-pick']);
        }
        
        // Fetch player and team data
        await fetchPlayerAndTeamData(userId);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile data');
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchTeamRequests = async (teamIds) => {
    try {
      setLoadingRequests(true);
      const teams = [];
      
      for (const teamId of teamIds) {
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        
        if (teamSnap.exists()) {
          teams.push({ id: teamSnap.id, ...teamSnap.data() });
        }
      }
      
      setTeamRequests(teams);
      setLoadingRequests(false);
    } catch (err) {
      console.error('Error fetching team requests:', err);
      setLoadingRequests(false);
    }
  };

  const fetchPlayerAndTeamData = async (ccplUserId) => {
    try {
      setLoadingTeam(true);
      console.log('🔍 Fetching player and team data for ccpl-user-id:', ccplUserId);
      
      // Query players collection to find player with matching ccpl-user-id
      const playersRef = collection(db, 'players');
      const q = query(playersRef, where('ccpl-user-id', '==', ccplUserId));
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Players query result - Found:', querySnapshot.size, 'documents');
      
      if (!querySnapshot.empty) {
        // Get the first matching player document
        const playerDoc = querySnapshot.docs[0];
        const player = { id: playerDoc.id, ...playerDoc.data() };
        console.log('✅ Player found with ID:', playerDoc.id);
        console.log('   Player data:', player);
        setPlayerData(player);
        
        // Now find the team that has this player ID in its playerIds array
        const teamsRef = collection(db, 'teams');
        const teamQuery = query(teamsRef, where('playerIds', 'array-contains', playerDoc.id));
        const teamSnapshot = await getDocs(teamQuery);
        
        console.log('🏆 Teams query result - Found:', teamSnapshot.size, 'teams');
        console.log('   Searching for player ID:', playerDoc.id, 'in teams playerIds arrays');
        
        if (!teamSnapshot.empty) {
          // Get the first matching team
          const teamDoc = teamSnapshot.docs[0];
          const team = { id: teamDoc.id, ...teamDoc.data() };
          console.log('✅ Team found:', team);
          setTeamData(team);
        } else {
          console.log('⚠️ No team found with player ID:', playerDoc.id, 'in playerIds array');
          console.log('   This means the player has not been added to any team yet.');
          console.log('   The player needs to accept a team request or be manually added to a team.');
          setTeamData(null);
        }
      } else {
        console.log('⚠️ No player found with ccpl-user-id:', ccplUserId);
        console.log('   This means the user has not been converted to a player yet.');
        console.log('   The user needs to accept a team request to create a player document.');
        setPlayerData(null);
        setTeamData(null);
      }
      
      setLoadingTeam(false);
    } catch (err) {
      console.error('❌ Error fetching player and team data:', err);
      setLoadingTeam(false);
    }
  };

  const handleAcceptRequest = async (teamId, teamName) => {
    setConfirmDialog({ show: true, teamId, teamName });
  };

  const confirmAcceptRequest = async () => {
    const { teamId, teamName } = confirmDialog;
    
    try {
      setProcessingRequest(true);
      
      // 1. Create player document in players collection
      const playerData = {
        age: null,
        'ccpl-user-id': userId,
        createdAt: serverTimestamp(),
        createdBy: userId,
        doublesLosses: null,
        doublesRating: registrationData?.step5?.duprDoubles || 'Na',
        doublesWins: null,
        duprId: '',
        gender: userData.gender?.toLowerCase() || 'male',
        name: userData.name || '',
        photo: registrationData?.step11?.playerPhoto || userData.picture || '',
        singlesLosses: null,
        singlesRating: registrationData?.step5?.duprSingles || 'Na',
        singlesWins: null,
        tournamentId: userData.tournamentId || '',
        updatedAt: new Date().toISOString()
      };
      
      const playersRef = collection(db, 'players');
      const newPlayerDoc = await addDoc(playersRef, playerData);
      
      // 2. Add player ID to team's playerIds array
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        playerIds: arrayUnion(newPlayerDoc.id),
        updatedAt: serverTimestamp()
      });
      
      // 3. Remove team ID from user's first-pick array
      const userRef = doc(db, 'ccpl-users', userId);
      await updateDoc(userRef, {
        'first-pick': arrayRemove(teamId),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTeamRequests(prev => prev.filter(team => team.id !== teamId));
      setUserData(prev => ({
        ...prev,
        'first-pick': prev['first-pick'].filter(id => id !== teamId)
      }));
      
      setConfirmDialog({ show: false, teamId: null, teamName: '' });
      setProcessingRequest(false);
      
      alert(`Successfully joined ${teamName}!`);
      
      // Refresh player and team data
      await fetchPlayerAndTeamData(userId);
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request. Please try again.');
      setProcessingRequest(false);
    }
  };

  const handleDeclineRequest = async (teamId) => {
    if (!confirm('Are you sure you want to decline this team request?')) {
      return;
    }
    
    try {
      setProcessingRequest(true);
      
      // Remove team ID from user's first-pick array
      const userRef = doc(db, 'ccpl-users', userId);
      await updateDoc(userRef, {
        'first-pick': arrayRemove(teamId),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTeamRequests(prev => prev.filter(team => team.id !== teamId));
      setUserData(prev => ({
        ...prev,
        'first-pick': prev['first-pick'].filter(id => id !== teamId)
      }));
      
      setProcessingRequest(false);
      alert('Team request declined.');
    } catch (err) {
      console.error('Error declining request:', err);
      alert('Failed to decline request. Please try again.');
      setProcessingRequest(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-').toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p>Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error || 'Player not found'}</p>
        </div>
      </div>
    );
  }

  const reg = registrationData || {};

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-black.ttf') format('truetype');
          font-weight: 900;
          font-style: normal;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        
        .ccpl-container {
          background: #0b0b0c;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        /* Hide scrollbar for top bar while maintaining scroll functionality */
        .ccpl-top-bar::-webkit-scrollbar {
          display: none;
        }
        .ccpl-top-bar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .cc-league-tab {
          transition: background 0.2s ease, color 0.2s ease;
        }
        
        .cc-league-tab:hover {
          background: rgba(255, 255, 255, 0.85) !important;
        }
        
        .cc-social {
          transition: background 0.2s ease;
        }
        
        .cc-social:hover {
          background: #232324 !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .desktop-menu {
            display: none !important;
          }
          
          .mobile-menu {
            display: flex !important;
          }
          
          .content-layout {
            flex-direction: column;
          }
          
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>

      <div className="ccpl-container">
        {/* Top Bar */}
        <div className="ccpl-top-bar" style={{ display: 'flex', alignItems: 'stretch', background: accentColor, boxSizing: 'border-box', height: '50px', overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, minWidth: 'min-content' }}>
            {leagues.map((lg, idx) => (
              <a
                key={idx}
                href={lg.href}
                className="cc-league-tab"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: window.innerWidth < 768 ? '0 16px' : '0 26px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  fontSize: window.innerWidth < 768 ? '12px' : '14px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  background: lg.active ? '#0b0b0c' : '#f1f1ee',
                  color: lg.active ? '#fff' : '#0b0b0c',
                  whiteSpace: 'nowrap'
                }}
              >
                {lg.label}
              </a>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: '0' }}></div>
          <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, minWidth: 'min-content' }}>
            <a href="#" className="cc-social" aria-label="Instagram" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', background: '#0b0b0c', color: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a href="#" className="cc-social" aria-label="YouTube" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', background: '#0b0b0c', color: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.6 7.2c-.25-1-1-1.75-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4c-1 .25-1.75 1-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8c.25 1 1 1.75 2 2 1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4c1-.25 1.75-1 2-2 .4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.2V8.8l6 3.2-6 3.2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <CCPLNavbar activePage="profile" />

        {/* Confirmation Dialog */}
        {confirmDialog.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#1a1a1b',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: `2px solid ${accentColor}`
            }}>
              <h3 style={{
                fontFamily: "'Zuume Cut', sans-serif",
                fontSize: '24px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: accentColor,
                marginBottom: '16px'
              }}>
                Confirm Join Team
              </h3>
              <p style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '32px',
                lineHeight: 1.6
              }}>
                Are you sure you want to join <strong style={{ color: '#fff' }}>{confirmDialog.teamName}</strong> as their first pick?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDialog({ show: false, teamId: null, teamName: '' })}
                  disabled={processingRequest}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '6px',
                    cursor: processingRequest ? 'not-allowed' : 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    opacity: processingRequest ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAcceptRequest}
                  disabled={processingRequest}
                  style={{
                    padding: '12px 24px',
                    background: `linear-gradient(180deg, ${accentColor}, ${accentColorDark})`,
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    cursor: processingRequest ? 'not-allowed' : 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700,
                    fontSize: '14px',
                    opacity: processingRequest ? 0.5 : 1
                  }}
                >
                  {processingRequest ? 'Processing...' : 'Yes, Join Team'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Content */}
        <section style={{ padding: '40px 6vw', fontFamily: "'Montserrat', sans-serif" }}>
          
          {/* Verification Status Banner */}
          {!userData.admin_verify && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(238, 58, 36, 0.15) 0%, rgba(238, 58, 36, 0.05) 100%)',
              border: '1px solid rgba(238, 58, 36, 0.3)',
              borderRadius: '8px',
              padding: '20px 24px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(238, 58, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: accentColor,
                  margin: '0 0 6px',
                  letterSpacing: '0.02em'
                }}>
                  Verification Pending
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  Your registration is currently under review by the Centre Court Pickleball League Committee. You will be notified once your profile has been verified.
                </p>
              </div>
            </div>
          )}

          {/* Profile Header */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '30px', flexWrap: 'wrap' }} className="profile-header">
              {/* Profile Photo */}
              <div style={{ width: '128px', height: '128px', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${accentColor}`, flexShrink: 0 }}>
                {reg.step11?.playerPhoto ? (
                  <img 
                    src={reg.step11.playerPhoto} 
                    alt={userData.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: accentColor }}>
                    {userData.name?.charAt(0) || 'P'}
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  Player name
                </p>
                <h1 style={{ fontFamily: "'Zuume Cut', sans-serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '16px', color: accentColor, margin: '0 0 16px' }}>
                  {userData.name?.toUpperCase() || 'PLAYER NAME'}
                </h1>
                <p style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  Joined on date
                </p>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {formatDate(userData.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex' }} className="content-layout">
              {/* Side Menu - Desktop */}
              <div style={{ width: '280px', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.16)' }} className="desktop-menu">
                <button
                  onClick={() => setActiveTab('playerInfo')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'playerInfo' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeTab === 'playerInfo' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  PLAYER INFO
                </button>
                <button
                  onClick={() => setActiveTab('team')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'team' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeTab === 'team' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  TEAM
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'requests' ? accentColor : 'transparent',
                    color: activeTab === 'requests' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  REQUESTS
                  {teamRequests.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      right: '24px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: accentColor,
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {teamRequests.length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Mobile Menu - Top Navigation */}
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.16)', display: 'none' }} className="mobile-menu">
                <button
                  onClick={() => setActiveTab('playerInfo')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'playerInfo' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeTab === 'playerInfo' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  PLAYER INFO
                </button>
                <button
                  onClick={() => setActiveTab('team')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'team' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeTab === 'team' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  TEAM
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: activeTab === 'requests' ? accentColor : 'transparent',
                    color: activeTab === 'requests' ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  REQUESTS
                  {teamRequests.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      background: accentColor,
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {teamRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Content Area */}
              <div style={{ flex: 1, background: '#0b0b0c' }}>
                {activeTab === 'playerInfo' && (
                  <div style={{ padding: '32px' }}>
                    <h2 style={{ fontFamily: "'Zuume Cut', sans-serif", fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '32px', color: '#fff' }}>
                      PLAYER INFORMATION
                    </h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }} className="responsive-grid">
                      {/* Basic Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accentColor, marginBottom: '8px' }}>
                          BASIC DETAILS
                        </h3>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Full Name</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{userData.name || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Mobile Number</label>
                          <p style={{ fontSize: '16px', color: '#fff',
 margin: 0 }}>{userData.phone || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Email ID</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{userData.email || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Gender</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0, textTransform: 'capitalize' }}>{userData.gender || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Date of Birth</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{userData.dateOfBirth || 'N/A'}</p>
                        </div>
                      </div>

                      {/* DUPR Ratings */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accentColor, marginBottom: '8px' }}>
                          DUPR RATINGS
                        </h3>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Singles Rating</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{reg.step5?.duprSingles || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Doubles Rating</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{reg.step5?.duprDoubles || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Discipline</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{reg.step5?.discipline || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Preference</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{reg.step5?.preference || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Years Playing</label>
                          <p style={{ fontSize: '16px', color: '#fff', margin: 0 }}>{reg.step5?.yearsPlaying || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Player Bio */}
                    {reg.step6?.bio && (
                      <div style={{ marginTop: '48px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accentColor, marginBottom: '16px' }}>
                          ABOUT ME
                        </h3>
                        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                          {reg.step6.bio}
                        </p>
                      </div>
                    )}

                    {/* Playing Style */}
                    {(reg.step6?.strengths || reg.step6?.playingStyle) && (
                      <div style={{ marginTop: '48px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accentColor, marginBottom: '16px' }}>
                          PLAYING STYLE
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {reg.step6.strengths && (
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Strengths</label>
                              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{reg.step6.strengths}</p>
                            </div>
                          )}
                          
                          {reg.step6.playingStyle && (
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Style</label>
                              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{reg.step6.playingStyle}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'team' && (
                  <div style={{ padding: '32px' }}>
                    <h2 style={{ fontFamily: "'Zuume Cut', sans-serif", fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '32px', color: '#fff' }}>
                      TEAM INFORMATION
                    </h2>
                    
                    {loadingTeam ? (
                      <div style={{ textAlign: 'center', padding: '48px' }}>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Loading team information...
                        </p>
                      </div>
                    ) : teamData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Team Header */}
                        <div style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '32px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '24px'
                        }}>
                          {/* Team Logo */}
                          {teamData.logo?.url ? (
                            <div style={{ width: '120px', height: '120px' }}>
                              <img
                                src={teamData.logo.url}
                                alt={teamData.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              background: 'rgba(238, 58, 36, 0.1)',
                              border: `2px solid ${accentColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '48px',
                              fontWeight: 700,
                              color: accentColor
                            }}>
                              {teamData.name?.charAt(0) || 'T'}
                            </div>
                          )}
                          
                          {/* Team Name */}
                          <h3 style={{
                            fontFamily: "'Zuume Cut', sans-serif",
                            fontSize: 'clamp(24px, 3vw, 36px)',
                            fontWeight: 900,
                            fontStyle: 'italic',
                            textTransform: 'uppercase',
                            color: accentColor,
                            margin: 0,
                            textAlign: 'center'
                          }}>
                            {teamData.name}
                          </h3>
                          
                          {/* Team Description */}
                          {teamData.description && (
                            <p style={{
                              fontSize: '15px',
                              color: 'rgba(255,255,255,0.7)',
                              margin: 0,
                              textAlign: 'center',
                              lineHeight: 1.6,
                              maxWidth: '600px'
                            }}>
                              {teamData.description}
                            </p>
                          )}
                        </div>
                        
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '48px', textAlign: 'center' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto 24px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </div>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.7)',
                          marginBottom: '12px'
                        }}>
                          No Team Assigned Yet
                        </h3>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                          You haven't been assigned to a team yet. Check the "Requests" tab to see if any teams have invited you to join.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div style={{ padding: '32px' }}>
                    <h2 style={{ fontFamily: "'Zuume Cut', sans-serif", fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '32px', color: '#fff' }}>
                      TEAM REQUESTS
                    </h2>
                    
                    {loadingRequests ? (
                      <div style={{ textAlign: 'center', padding: '48px' }}>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Loading team requests...
                        </p>
                      </div>
                    ) : teamRequests.length === 0 ? (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '48px', textAlign: 'center' }}>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          No team requests at the moment.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {teamRequests.map((team) => (
                          <div
                            key={team.id}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              padding: '24px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px'
                            }}
                          >
                            {/* Team Logo */}
                            {team.logo?.url && (
                              <div style={{ width: '80px', height: '80px', margin: '0 auto' }}>
                                <img
                                  src={team.logo.url}
                                  alt={team.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              </div>
                            )}
                            
                            {/* Team Name */}
                            <h3 style={{
                              fontFamily: "'Zuume Cut', sans-serif",
                              fontSize: '20px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: accentColor,
                              margin: 0,
                              textAlign: 'center'
                            }}>
                              {team.name}
                            </h3>
                            
                            {/* Team Info */}
                            {team.venue && (
                              <div style={{ textAlign: 'center' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venue</label>
                                <p style={{ fontSize: '14px', color: '#fff', margin: 0 }}>{team.venue}</p>
                              </div>
                            )}
                            
                            {team.description && (
                              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                                {team.description}
                              </p>
                            )}
                            
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                              <button
                                onClick={() => handleDeclineRequest(team.id)}
                                disabled={processingRequest}
                                style={{
                                  flex: 1,
                                  padding: '12px',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  cursor: processingRequest ? 'not-allowed' : 'pointer',
                                  fontFamily: "'Montserrat', sans-serif",
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  opacity: processingRequest ? 0.5 : 1,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptRequest(team.id, team.name)}
                                disabled={processingRequest}
                                style={{
                                  flex: 1,
                                  padding: '12px',
                                  background: `linear-gradient(180deg, ${accentColor}, ${accentColorDark})`,
                                  border: 'none',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  cursor: processingRequest ? 'not-allowed' : 'pointer',
                                  fontFamily: "'Montserrat', sans-serif",
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  opacity: processingRequest ? 0.5 : 1,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      <CCPLFooter />
    </>
  );
}
