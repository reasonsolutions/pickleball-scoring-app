import React, { useState, useEffect } from 'react';
import CCPLTopBar from '../components/CCPLTopBar';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLTeamPasses from '../components/CCPLTeamPasses';
import CcplTeamFixtures from '../components/CcplTeamFixtures';
import { uploadTeamLogoOptimized } from '../utils/cloudinaryOptimized';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const MUTED = '#5f5b52';
const RULE = '#d8d4ca';
export default function CcplTeamProfile() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('teamInfo');
  const [playersTab, setPlayersTab] = useState('myPlayers');
  const [isMobile, setIsMobile] = useState(false);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [auctionPlayersLoading, setAuctionPlayersLoading] = useState(false);
  const [auctionSearchQuery, setAuctionSearchQuery] = useState('');
  const [auctionGenderFilter, setAuctionGenderFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [pendingPassCount, setPendingPassCount] = useState(0);

  const accentColor = '#e27b46';
  const accentColorDark = '#7d0f0f';

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 860);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamId) return;
      
      try {
        setLoading(true);
        
        // Check if user is logged in as team admin
        const loggedInUser = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
        
        if (!loggedInUser) {
          // Not logged in, redirect to login
          navigate('/ccpl-login');
          return;
        }
        
        const parsedUser = JSON.parse(loggedInUser);
        
        // Check if user is a team admin
        if (parsedUser.type !== 'team admin') {
          // Not a team admin, redirect to login
          navigate('/ccpl-login');
          return;
        }
        
        // Check if the logged-in team admin is accessing their own team
        if (parsedUser.teamId !== teamId) {
          // Trying to access another team's profile, redirect to their own
          navigate(`/ccpl-teamprofile/${parsedUser.teamId}`);
          return;
        }
        
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        
        if (teamDoc.exists()) {
          setTeamData({
            id: teamDoc.id,
            ...teamDoc.data()
          });
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId]);

  // Fetch players when Players tab is active
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!teamData || !teamData.playerIds || activeTab !== 'players') return;
      
      try {
        setPlayersLoading(true);
        const playersList = [];
        
        // Fetch each player by ID
        for (const playerId of teamData.playerIds) {
          const playerDoc = await getDoc(doc(db, 'players', playerId));
          if (playerDoc.exists()) {
            playersList.push({
              id: playerDoc.id,
              ...playerDoc.data()
            });
          }
        }
        
        setPlayers(playersList);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setPlayersLoading(false);
      }
    };

    fetchPlayers();
  }, [teamData, activeTab]);

  // Fetch auction players when Players in Auction tab is active
  useEffect(() => {
    const fetchAuctionPlayers = async () => {
      if (activeTab !== 'players' || playersTab !== 'auction') return;
      
      try {
        setAuctionPlayersLoading(true);
        
        // First, fetch all players from the players collection to get ccpl-user-ids of players already in teams
        const playersCollectionQuery = query(collection(db, 'players'));
        const playersCollectionSnapshot = await getDocs(playersCollectionQuery);
        
        // Create a Set of ccpl-user-ids that are already assigned to teams
        const assignedPlayerIds = new Set();
        playersCollectionSnapshot.docs.forEach(doc => {
          const ccplUserId = doc.data()['ccpl-user-id'];
          if (ccplUserId) {
            assignedPlayerIds.add(ccplUserId);
          }
        });
        
        // Query ccpl-users collection for verified players
        const playersQuery = query(
          collection(db, 'ccpl-users'),
          where('type', '==', 'player'),
          where('admin_verify', '==', true)
        );
        
        const querySnapshot = await getDocs(playersQuery);
        
        // Fetch registration data for each player
        const playersListPromises = querySnapshot.docs.map(async (playerDoc) => {
          const playerData = {
            id: playerDoc.id,
            ...playerDoc.data()
          };
          
          // Fetch registration subcollection to get DUPR details
          try {
            const registrationQuery = query(
              collection(db, 'ccpl-users', playerDoc.id, 'registration'),
              where('step5', '!=', null)
            );
            const registrationSnapshot = await getDocs(registrationQuery);
            
            if (!registrationSnapshot.empty) {
              const registrationData = registrationSnapshot.docs[0].data();
              // Add DUPR data from step5
              if (registrationData.step5) {
                playerData.duprId = registrationData.step5.duprProfile || '';
                playerData.doublesRating = registrationData.step5.duprDoubles || '';
                playerData.singlesRating = registrationData.step5.duprSingles || '';
              }
            }
          } catch (regError) {
            console.error('Error fetching registration for player:', playerDoc.id, regError);
          }
          
          return playerData;
        });
        
        const playersList = await Promise.all(playersListPromises);
        
        // Filter out players who are already assigned to teams
        const availablePlayers = playersList.filter(player => !assignedPlayerIds.has(player.id));
        
        setAuctionPlayers(availablePlayers);
      } catch (error) {
        console.error('Error fetching auction players:', error);
      } finally {
        setAuctionPlayersLoading(false);
      }
    };

    fetchAuctionPlayers();
  }, [activeTab, playersTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [auctionSearchQuery, auctionGenderFilter]);

  // Handler for View Profile button
  const handleViewProfile = async (player) => {
    try {
      // Fetch complete registration data
      const registrationQuery = query(
        collection(db, 'ccpl-users', player.id, 'registration')
      );
      const registrationSnapshot = await getDocs(registrationQuery);
      
      let completePlayerData = { ...player };
      
      if (!registrationSnapshot.empty) {
        // Get the first registration document (usually 'player-registration')
        const registrationDoc = registrationSnapshot.docs[0];
        const registrationData = registrationDoc.data();
        completePlayerData.registrationData = registrationData;
        
        // Get player photos from step11
        if (registrationData.step11) {
          completePlayerData.playerPhoto = registrationData.step11.playerPhoto;
          completePlayerData.actionPhoto = registrationData.step11.actionPhoto;
        }
      }
      
      setSelectedPlayer(completePlayerData);
      setShowPlayerModal(true);
    } catch (error) {
      console.error('Error fetching player details:', error);
      // Still show modal with basic info if fetch fails
      setSelectedPlayer(player);
      setShowPlayerModal(true);
    }
  };

  // Handler for First Pick button
  const handleFirstPick = async (player) => {
    const playerName = player.name || player.displayName || 'this player';
    
    const confirmed = window.confirm(
      `Are you sure you want to make ${playerName} your first pick? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      // Update the player document to add this team to the first-pick array
      const playerRef = doc(db, 'ccpl-users', player.id);
      await updateDoc(playerRef, {
        'first-pick': arrayUnion(teamId)
      });
      
      alert(`${playerName} has been marked as your first pick!`);
      
      // Refresh the auction players list to update the UI
      const updatedPlayers = auctionPlayers.map(p => {
        if (p.id === player.id) {
          return {
            ...p,
            'first-pick': [...(p['first-pick'] || []), teamId]
          };
        }
        return p;
      });
      setAuctionPlayers(updatedPlayers);
    } catch (error) {
      console.error('Error setting first pick:', error);
      alert('Failed to set first pick. Please try again.');
    }
  };

  // Handler for logo upload
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setLogoUploading(true);
      setLogoUploadProgress('Uploading logo...');

      // Upload to Cloudinary
      const uploadResult = await uploadTeamLogoOptimized(file);
      
      setLogoUploadProgress('Saving to database...');

      // Update team document with logo URL
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        logo: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        },
        updatedAt: new Date()
      });

      // Update local state
      setTeamData(prev => ({
        ...prev,
        logo: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      }));

      setLogoUploadProgress('Logo uploaded successfully!');
      setTimeout(() => {
        setLogoUploadProgress('');
      }, 2000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
      setLogoUploadProgress('');
    } finally {
      setLogoUploading(false);
    }
  };

  // Handler for editing description
  const handleEditDescription = () => {
    setEditedDescription(teamData?.description || '');
    setIsEditingDescription(true);
  };

  // Handler for saving description
  const handleSaveDescription = async () => {
    try {
      setDescriptionSaving(true);

      // Update team document with new description
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        description: editedDescription,
        updatedAt: new Date()
      });

      // Update local state
      setTeamData(prev => ({
        ...prev,
        description: editedDescription
      }));

      setIsEditingDescription(false);
      alert('Team description updated successfully!');
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Failed to update description. Please try again.');
    } finally {
      setDescriptionSaving(false);
    }
  };

  // Handler for canceling description edit
  const handleCancelDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription('');
  };

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    
    try {
      // Handle DD/MM/YYYY format
      const parts = dateOfBirth.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        
        const birthDate = new Date(year, month, day);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
      return 'N/A';
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };


  const sessionUser = (() => {
    try {
      const raw = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const adminName = sessionUser?.name || sessionUser?.displayName || teamData?.adminEmail || 'N/A';
  const adminPhone = sessionUser?.phone || sessionUser?.phoneNumber || 'N/A';
  const adminEmail = sessionUser?.email || teamData?.adminEmail || 'N/A';

  const tabs = [
    ['teamInfo', 'Team Info'],
    ['players', 'Players'],
    ['passes', 'Passes'],
    ['designAssets', 'Design Assets'],
    ['fixtures', 'Fixtures'],
  ];

  const zuume = { fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'italic' };
  const eyebrow = { fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED };
  const sectionTitle = { ...zuume, margin: '0 0 24px', textTransform: 'uppercase', fontSize: 'clamp(44px,5vw,72px)', lineHeight: 0.85 };
  const cardHead = { padding: '16px 24px', background: INK, color: '#fff', ...zuume, fontSize: '26px', lineHeight: 1, letterSpacing: '.04em', textTransform: 'uppercase' };
  const skew = (bg, extra = {}) => ({ display: 'inline-flex', transform: 'skewX(-14deg)', background: bg, border: 0, ...extra });
  const unskew = { display: 'inline-block', transform: 'skewX(14deg)' };
  const pillLabel = { ...unskew, fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase' };
  const emptyPanel = (text) => (
    <div style={{ border: `2px solid ${INK}`, background: '#fff', padding: '40px 24px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: MUTED }}>{text}</div>
  );

  const teamName = teamData?.name || 'Team Name';
  const nameWords = teamName.split(' ');
  const nameLead = nameWords.length > 1 ? nameWords.slice(0, -1).join(' ') + ' ' : '';
  const nameTail = nameWords[nameWords.length - 1];

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
          src: url('/fonts/zuume-cut-black-italic.ttf') format('truetype');
          font-weight: 900;
          font-style: italic;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }

        .ccpl-container {
          background: ${INK};
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .ccpl-container *, .ccpl-container *::before, .ccpl-container *::after { box-sizing: border-box; }
        .ccpl-container span { font-family: inherit; }
        .ccpl-container ::selection { background: ${accentColor}; color: ${INK}; }
        .ta-tab:hover { color: ${accentColor} !important; }
        .ta-card { transition: background .25s ease, color .25s ease; }
        .ta-card:hover { background: ${INK} !important; color: #fff; }
        .ta-card:hover .ta-card-rule { border-color: rgba(255,255,255,.18) !important; }
        .ta-pill-btn:hover { background: #fff !important; }
        .ta-ghost-btn:hover { background: ${INK} !important; color: #fff !important; }
        .ta-dark-btn:hover { background: ${accentColor} !important; color: ${INK} !important; }
        .ta-textarea:focus { border-color: ${accentColor} !important; background: #fff !important; }
        .ta-textarea::placeholder { color: #8a857a; }
      `}</style>

      <div className="ccpl-container">
        <CCPLTopBar activeLeague="ccpl-s2" />
        <CCPLNavbar activePage="teams" />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#fff', fontSize: '18px' }}>
            Loading team profile...
          </div>
        ) : !teamData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#fff', fontSize: '18px' }}>
            Team not found
          </div>
        ) : (
        <>
          {/* Admin Header */}
          <section style={{ position: 'relative', background: INK, color: '#fff', padding: 'clamp(40px,5vw,72px) 6vw calc(5vw + clamp(48px,6vw,80px))', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-1vw', bottom: '2vw', pointerEvents: 'none', ...zuume, fontSize: 'clamp(200px,30vw,480px)', lineHeight: 0.8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)' }}>ADMIN</div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: accentColor, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>
            <div style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'clamp(24px,4vw,56px)' }}>
              <div style={{ position: 'relative', width: 'clamp(130px,15vw,200px)', height: 'clamp(130px,15vw,200px)', flex: 'none', background: '#fff', border: '2px solid #fff', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: accentColor }}></span>
                {teamData?.logo?.url ? (
                  <img src={teamData.logo.url} alt={teamName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ ...zuume, fontSize: 'clamp(64px,8vw,110px)', lineHeight: 1, color: accentColor }}>
                    {teamData?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <span style={skew(accentColor, { padding: '8px 16px' })}>
                    <span style={{ ...pillLabel, fontSize: '13px', color: INK, whiteSpace: 'nowrap' }}>Team Admin</span>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>{adminName}</span>
                </div>
                <h1 style={{ margin: 0, ...zuume, textTransform: 'uppercase', fontSize: 'clamp(64px,10vw,160px)', lineHeight: 0.84, letterSpacing: '-.01em', overflowWrap: 'anywhere' }}>
                  {nameLead}<span style={{ color: accentColor }}>{nameTail}</span>
                </h1>
              </div>
            </div>
          </section>

          {/* Admin Body */}
          <section style={{ position: 'relative', background: PAPER, color: INK, marginTop: '-5vw', padding: 'calc(5vw + clamp(32px,4vw,56px)) 6vw clamp(64px,8vw,110px)', clipPath: 'polygon(0 5vw,100% 0,100% 100%,0 100%)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

              {/* Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', border: `2px solid ${INK}`, background: '#fff', marginBottom: 'clamp(28px,4vw,48px)', overflow: 'hidden' }}>
                {tabs.map(([id, label]) => {
                  const active = activeTab === id;
                  const badge = id === 'passes' ? pendingPassCount : 0;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="ta-tab"
                      onClick={() => setActiveTab(id)}
                      style={{ flex: '1 1 160px', border: 0, borderRight: `2px solid ${INK}`, marginRight: '-2px', background: active ? INK : '#fff', color: active ? accentColor : INK, padding: '16px 20px', cursor: 'pointer', ...zuume, fontSize: '24px', letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: 1, transition: 'background .2s ease, color .2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <span>{label}</span>
                      {badge > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', height: '24px', padding: '0 7px', borderRadius: '12px', background: accentColor, color: INK, fontFamily: "'Montserrat', sans-serif", fontStyle: 'normal', fontWeight: 800, fontSize: '12px', letterSpacing: 0 }}>{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Team Info */}
              {activeTab === 'teamInfo' && (
                <div>
                  <h2 style={sectionTitle}>Team <span style={{ color: accentColor }}>Information.</span></h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: '20px', alignItems: 'stretch' }}>
                    <div style={{ background: '#fff', border: `2px solid ${INK}` }}>
                      <div style={cardHead}>Basic Details</div>
                      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 24px 12px' }}>
                        {[
                          ['Team Name', teamData?.name || 'N/A'],
                          ['Team Admin', adminName],
                          ['Contact', adminPhone],
                          ['Email', adminEmail],
                        ].map(([label, value], i, arr) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px 0', borderBottom: i < arr.length - 1 ? `1px solid ${RULE}` : 'none', minWidth: 0 }}>
                            <span style={eyebrow}>{label}</span>
                            <span style={{ fontSize: '16px', fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: `2px solid ${INK}`, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ ...cardHead, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 16px 12px 24px', lineHeight: 1.1 }}>
                        <span style={{ minWidth: 0 }}>Additional Details</span>
                        {!isEditingDescription && (
                          <button type="button" className="ta-pill-btn" onClick={handleEditDescription} style={skew(accentColor, { color: INK, padding: '8px 18px', cursor: 'pointer' })}>
                            <span style={{ ...pillLabel, fontFamily: "'Montserrat', sans-serif", fontStyle: 'normal' }}>Edit</span>
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' }}>
                        <span style={eyebrow}>Team Description</span>
                        {isEditingDescription ? (
                          <>
                            <textarea
                              className="ta-textarea"
                              rows={6}
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              placeholder="Tell fans about your team"
                              maxLength={500}
                              style={{ background: PAPER, border: `2px solid ${INK}`, color: INK, fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '15px', lineHeight: 1.5, padding: '14px 16px', outline: 'none', resize: 'vertical', borderRadius: 0, width: '100%' }}
                            />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: MUTED }}>{editedDescription.length}/500 characters</span>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" className="ta-ghost-btn" onClick={handleCancelDescription} disabled={descriptionSaving} style={{ background: 'transparent', border: `2px solid ${INK}`, color: INK, padding: '10px 18px', cursor: descriptionSaving ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase' }}>Cancel</button>
                                <button type="button" className="ta-dark-btn" onClick={handleSaveDescription} disabled={descriptionSaving} style={skew(INK, { color: '#fff', padding: '10px 22px', cursor: descriptionSaving ? 'not-allowed' : 'pointer', opacity: descriptionSaving ? 0.6 : 1 })}>
                                  <span style={{ ...unskew, ...zuume, fontSize: '20px', letterSpacing: '.05em', textTransform: 'uppercase' }}>{descriptionSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, lineHeight: 1.6, color: teamData?.description ? INK : MUTED, whiteSpace: 'pre-wrap' }}>
                            {teamData?.description || 'No description available. Click Edit to add one.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Players */}
              {activeTab === 'players' && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px 24px', marginBottom: '24px' }}>
                    <h2 style={{ ...sectionTitle, margin: 0 }}>
                      {playersTab === 'myPlayers' ? <>The <span style={{ color: accentColor }}>Squad.</span></> : <>Players in <span style={{ color: accentColor }}>Auction.</span></>}
                    </h2>
                    <div style={{ display: 'flex', border: `2px solid ${INK}`, background: '#fff' }}>
                      {[['myPlayers', 'My Players'], ['auction', 'Players in Auction']].map(([id, label], i) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPlayersTab(id)}
                          style={{ border: 0, borderLeft: i ? `2px solid ${INK}` : 0, background: playersTab === id ? INK : '#fff', color: playersTab === id ? accentColor : INK, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {playersTab === 'myPlayers' && (
                    playersLoading ? emptyPanel('Loading players...')
                    : players.length === 0 ? emptyPanel('No players in this team yet.')
                    : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px' }}>
                        {players.map((player, i) => (
                          <div key={player.id} className="ta-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', border: `2px solid ${INK}`, background: '#fff' }}>
                            <div style={{ position: 'relative', aspectRatio: '4/5', background: '#e4e1d8', borderBottom: `2px solid ${INK}`, overflow: 'hidden' }}>
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...zuume, fontSize: '96px', color: accentColor }}>
                                {player.name?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              {player.photo && (
                                // Sits over the initial; hidden if the photo fails to load
                                <img src={player.photo} alt={player.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              )}
                              <span style={{ position: 'absolute', top: 0, left: 0, display: 'inline-flex', background: INK, padding: '6px 10px', ...zuume, fontSize: '20px', lineHeight: 1, color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 16px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ ...zuume, fontSize: '26px', lineHeight: 0.95, textTransform: 'uppercase' }}>{player.name || 'Unknown Player'}</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: accentColor }}>
                                  {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'N/A'}
                                </span>
                              </div>
                              <div className="ta-card-rule" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${RULE}`, paddingTop: '12px', gap: '12px' }}>
                                {[['Singles Rating', player.singlesRating], ['Doubles Rating', player.doublesRating]].map(([label, val]) => (
                                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ ...zuume, fontSize: '30px', lineHeight: 0.9 }}>{val || 'N/A'}</span>
                                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a857a' }}>{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {playersTab === 'auction' && (
                    <div style={{ background: INK, color: '#fff', border: `2px solid ${INK}`, padding: isMobile ? '20px 16px' : '32px' }}>
                      <div>
                    <div>
                      {/* Search Bar and Filter */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'flex-start',
                          flexDirection: isMobile ? 'column' : 'row',
                          flexWrap: 'wrap'
                        }}>
                          {/* Search Input */}
                          <div style={{
                            position: 'relative',
                            flex: isMobile ? 'none' : '1',
                            width: isMobile ? '100%' : 'auto',
                            minWidth: isMobile ? 'auto' : '280px',
                            maxWidth: isMobile ? '100%' : '500px'
                          }}>
                            <input
                              type="text"
                              placeholder="Search by name, age, or DUPR..."
                            value={auctionSearchQuery}
                            onChange={(e) => setAuctionSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '14px 16px 14px 44px',
                              background: '#232324',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontFamily: "'Montserrat', sans-serif",
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s ease',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = accentColor;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                          />
                          {/* Search Icon */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              position: 'absolute',
                              left: '16px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none'
                            }}
                          >
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                          </svg>
                          {/* Clear Button */}
                          {auctionSearchQuery && (
                            <button
                              onClick={() => setAuctionSearchQuery('')}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = accentColor;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Gender Filter Dropdown */}
                        <div style={{
                          minWidth: isMobile ? 'auto' : '160px',
                          width: isMobile ? '100%' : 'auto'
                        }}>
                          <select
                            value={auctionGenderFilter}
                            onChange={(e) => setAuctionGenderFilter(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              background: '#232324',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontFamily: "'Montserrat', sans-serif",
                              fontSize: '14px',
                              outline: 'none',
                              cursor: 'pointer',
                              transition: 'border-color 0.2s ease',
                              boxSizing: 'border-box',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 16px center',
                              paddingRight: '40px'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = accentColor;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                          >
                            <option value="all" style={{ background: '#232324', color: '#fff' }}>All Genders</option>
                            <option value="male" style={{ background: '#232324', color: '#fff' }}>Male</option>
                            <option value="female" style={{ background: '#232324', color: '#fff' }}>Female</option>
                          </select>
                        </div>

                        {/* Export to Excel Button */}
                        <div style={{
                          minWidth: isMobile ? 'auto' : '160px',
                          width: isMobile ? '100%' : 'auto'
                        }}>
                          <button
                            onClick={async () => {
                              try {
                                // Filter players based on current filters
                                const filteredPlayers = auctionPlayers.filter(player => {
                                  // Gender filter
                                  if (auctionGenderFilter !== 'all') {
                                    const playerGender = (player.gender || '').toLowerCase();
                                    if (playerGender !== auctionGenderFilter.toLowerCase()) {
                                      return false;
                                    }
                                  }
                                  
                                  // Search filter
                                  if (auctionSearchQuery) {
                                    const searchLower = auctionSearchQuery.toLowerCase();
                                    const name = (player.name || player.displayName || '').toLowerCase();
                                    const age = calculateAge(player.dateOfBirth).toString();
                                    const duprId = (player.duprId || '').toLowerCase();
                                    const doublesRating = (player.doublesRating || '').toString().toLowerCase();
                                    const singlesRating = (player.singlesRating || '').toString().toLowerCase();
                                    
                                    return name.includes(searchLower) ||
                                           age.includes(searchLower) ||
                                           duprId.includes(searchLower) ||
                                           doublesRating.includes(searchLower) ||
                                           singlesRating.includes(searchLower);
                                  }
                                  
                                  return true;
                                });

                                // Fetch complete registration data for all filtered players
                                const playersWithFullData = await Promise.all(
                                  filteredPlayers.map(async (player) => {
                                    try {
                                      // Fetch the player-registration document specifically
                                      const registrationDocRef = doc(db, 'ccpl-users', player.id, 'registration', 'player-registration');
                                      const registrationDoc = await getDoc(registrationDocRef);
                                      
                                      if (registrationDoc.exists()) {
                                        const registrationData = registrationDoc.data();
                                        return { ...player, registrationData };
                                      }
                                    } catch (error) {
                                      console.error('Error fetching registration for player:', player.id, error);
                                    }
                                    return player;
                                  })
                                );

                                // Create a new workbook and worksheet (exact same as AdminPlayers)
                                const workbook = new ExcelJS.Workbook();
                                const worksheet = workbook.addWorksheet('Players');

                                // Define columns with more detailed information (exact same as AdminPlayers)
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

                                // Style the header row (exact same as AdminPlayers)
                                worksheet.getRow(1).font = { bold: true };
                                worksheet.getRow(1).fill = {
                                  type: 'pattern',
                                  pattern: 'solid',
                                  fgColor: { argb: 'FFf97316' } // Orange color
                                };
                                worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                                worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

                                // Add data rows from filtered players (exact same logic as AdminPlayers)
                                playersWithFullData.forEach((player) => {
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

                                  const formatGender = (gender) => {
                                    if (!gender) return 'N/A';
                                    return gender.charAt(0).toUpperCase() + gender.slice(1);
                                  };

                                  worksheet.addRow({
                                    name: player.name || player.displayName || 'N/A',
                                    imageUrl: regData.step11?.playerPhoto || player.playerPhoto || player.picture || 'N/A',
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

                                // Auto-fit columns and wrap text for better readability (exact same as AdminPlayers)
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
                                
                                // Create filename with current date
                                const date = new Date().toISOString().split('T')[0];
                                const filename = `CCPL_Auction_Players_${date}.xlsx`;
                                
                                // Save the file
                                saveAs(blob, filename);
                              } catch (error) {
                                console.error('Error exporting to Excel:', error);
                                alert('Failed to export to Excel. Please try again.');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              background: accentColor,
                              border: 'none',
                              borderRadius: '8px',
                              color: '#fff',
                              fontFamily: "'Montserrat', sans-serif",
                              fontSize: '14px',
                              fontWeight: 600,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxSizing: 'border-box',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = accentColorDark;
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = accentColor;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export to Excel
                          </button>
                        </div>
                      </div>

                      {(auctionSearchQuery || auctionGenderFilter !== 'all') && (
                          <p style={{
                            marginTop: '8px',
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.5)',
                            fontFamily: "'Montserrat', sans-serif"
                          }}>
                            {(() => {
                              const filtered = auctionPlayers.filter(player => {
                                // Gender filter
                                if (auctionGenderFilter !== 'all') {
                                  const playerGender = (player.gender || '').toLowerCase();
                                  if (playerGender !== auctionGenderFilter.toLowerCase()) {
                                    return false;
                                  }
                                }
                                
                                // Search filter
                                if (auctionSearchQuery) {
                                  const searchLower = auctionSearchQuery.toLowerCase();
                                  const name = (player.name || player.displayName || '').toLowerCase();
                                  const age = calculateAge(player.dateOfBirth).toString();
                                  const duprId = (player.duprId || '').toLowerCase();
                                  const doublesRating = (player.doublesRating || '').toString().toLowerCase();
                                  const singlesRating = (player.singlesRating || '').toString().toLowerCase();
                                  
                                  return name.includes(searchLower) ||
                                         age.includes(searchLower) ||
                                         duprId.includes(searchLower) ||
                                         doublesRating.includes(searchLower) ||
                                         singlesRating.includes(searchLower);
                                }
                                
                                return true;
                              });
                              return `Showing ${filtered.length} of ${auctionPlayers.length} players`;
                            })()}
                          </p>
                        )}
                      </div>

                      {auctionPlayersLoading ? (
                        <div style={{
                          background: '#232324',
                          borderRadius: '8px',
                          padding: '40px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          textAlign: 'center'
                        }}>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Montserrat', sans-serif", fontSize: '15px' }}>
                            Loading auction players...
                          </p>
                        </div>
                      ) : auctionPlayers.length === 0 ? (
                        <div style={{
                          background: '#232324',
                          borderRadius: '8px',
                          padding: '40px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          textAlign: 'center'
                        }}>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Montserrat', sans-serif", fontSize: '15px' }}>
                            No players available in auction pool.
                          </p>
                        </div>
                      ) : (() => {
                        const filteredPlayers = auctionPlayers.filter(player => {
                          // Gender filter
                          if (auctionGenderFilter !== 'all') {
                            const playerGender = (player.gender || '').toLowerCase();
                            if (playerGender !== auctionGenderFilter.toLowerCase()) {
                              return false;
                            }
                          }
                          
                          // Search filter
                          if (auctionSearchQuery) {
                            const searchLower = auctionSearchQuery.toLowerCase();
                            const name = (player.name || player.displayName || '').toLowerCase();
                            const age = calculateAge(player.dateOfBirth).toString();
                            const duprId = (player.duprId || '').toLowerCase();
                            const doublesRating = (player.doublesRating || '').toString().toLowerCase();
                            const singlesRating = (player.singlesRating || '').toString().toLowerCase();
                            
                            return name.includes(searchLower) ||
                                   age.includes(searchLower) ||
                                   duprId.includes(searchLower) ||
                                   doublesRating.includes(searchLower) ||
                                   singlesRating.includes(searchLower);
                          }
                          
                          return true;
                        });

                        if (filteredPlayers.length === 0) {
                          return (
                            <div style={{
                              background: '#232324',
                              borderRadius: '8px',
                              padding: '40px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              textAlign: 'center'
                            }}>
                              <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Montserrat', sans-serif", fontSize: '15px' }}>
                                No players found matching your filters
                              </p>
                            </div>
                          );
                        }

                        // Pagination logic
                        const itemsPerPage = 50;
                        const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

                        return (
                          <div>
                            <div style={{
                              background: '#232324',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              overflow: 'hidden'
                            }}>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontFamily: "'Montserrat', sans-serif"
                            }}>
                              <thead>
                                <tr style={{ background: '#1a1a1b' }}>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Name
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Gender
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Age
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Phone Number
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    DUPR ID
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Doubles DUPR
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Singles DUPR
                                  </th>
                                  <th style={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: accentColor,
                                    borderBottom: `2px solid ${accentColor}`
                                  }}>
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedPlayers.map((player, index) => (
                                  <tr
                                    key={player.id}
                                    style={{
                                      borderBottom: index < paginatedPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                      transition: 'background 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#1a1a1b';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: '#fff',
                                      fontWeight: 600
                                    }}>
                                      {player.name || player.displayName || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: 'rgba(255,255,255,0.8)'
                                    }}>
                                      {player.gender || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: 'rgba(255,255,255,0.8)'
                                    }}>
                                      {calculateAge(player.dateOfBirth)}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: 'rgba(255,255,255,0.8)'
                                    }}>
                                      {player.phone || player.phoneNumber || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: 'rgba(255,255,255,0.8)'
                                    }}>
                                      {player.duprId || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: accentColor,
                                      fontWeight: 700
                                    }}>
                                      {player.doublesRating || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      fontSize: '14px',
                                      color: accentColor,
                                      fontWeight: 700
                                    }}>
                                      {player.singlesRating || 'N/A'}
                                    </td>
                                    <td style={{
                                      padding: '16px',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* View Profile Button - Always visible */}
                                        <button
                                          onClick={() => handleViewProfile(player)}
                                          style={{
                                            padding: '8px 16px',
                                            background: '#232324',
                                            color: '#fff',
                                            border: `1px solid ${accentColor}`,
                                            borderRadius: '6px',
                                            fontFamily: "'Montserrat', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = accentColor;
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#232324';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                          }}
                                        >
                                          View Profile
                                        </button>

                                        {/* First Pick Button - Conditional */}
                                        {(() => {
                                          // Check if team has any players already
                                          const teamHasPlayers = teamData?.playerIds && teamData.playerIds.length > 0;
                                          
                                          // Check if this team has already made a first pick for ANY player
                                          const teamHasFirstPick = auctionPlayers.some(p =>
                                            p['first-pick']?.includes(teamId)
                                          );
                                          
                                          if (player['first-pick']?.includes(teamId)) {
                                            // This player is the team's first pick
                                            return (
                                              <span style={{
                                                fontSize: '13px',
                                                color: accentColor,
                                                fontFamily: "'Montserrat', sans-serif",
                                                fontWeight: 600
                                              }}>
                                                Request Sent
                                              </span>
                                            );
                                          } else if (!teamHasPlayers && !teamHasFirstPick) {
                                            // Team hasn't made a first pick yet and has no players
                                            return (
                                              <button
                                                onClick={() => handleFirstPick(player)}
                                                style={{
                                                  padding: '8px 16px',
                                                  background: accentColor,
                                                  color: '#fff',
                                                  border: 'none',
                                                  borderRadius: '6px',
                                                  fontFamily: "'Montserrat', sans-serif",
                                                  fontSize: '13px',
                                                  fontWeight: 600,
                                                  letterSpacing: '0.05em',
                                                  textTransform: 'uppercase',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s ease',
                                                  whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.background = accentColorDark;
                                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.background = accentColor;
                                                  e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                              >
                                                First Pick
                                              </button>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: isMobile ? '8px' : '12px',
                            marginTop: '24px',
                            flexWrap: 'wrap',
                            padding: isMobile ? '0 8px' : '0'
                          }}>
                            {/* Previous Button */}
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              style={{
                                padding: isMobile ? '8px 12px' : '10px 20px',
                                background: currentPage === 1 ? '#1a1a1b' : '#232324',
                                color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: isMobile ? '12px' : '14px',
                                fontWeight: 600,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (currentPage !== 1) {
                                  e.currentTarget.style.background = accentColor;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage !== 1) {
                                  e.currentTarget.style.background = '#232324';
                                }
                              }}
                            >
                              Previous
                            </button>

                            {/* Page Numbers */}
                            <div style={{
                              display: 'flex',
                              gap: isMobile ? '4px' : '8px',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              justifyContent: 'center'
                            }}>
                              {(() => {
                                const pages = [];
                                const maxVisiblePages = isMobile ? 3 : 5;
                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                
                                if (endPage - startPage < maxVisiblePages - 1) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }

                                // First page
                                if (startPage > 1) {
                                  pages.push(
                                    <button
                                      key={1}
                                      onClick={() => setCurrentPage(1)}
                                      style={{
                                        padding: isMobile ? '8px 10px' : '10px 14px',
                                        background: '#232324',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: isMobile ? '12px' : '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        minWidth: isMobile ? '32px' : '40px'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = accentColor;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#232324';
                                      }}
                                    >
                                      1
                                    </button>
                                  );
                                  if (startPage > 2) {
                                    pages.push(
                                      <span key="ellipsis1" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Montserrat', sans-serif" }}>...</span>
                                    );
                                  }
                                }

                                // Visible pages
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPage(i)}
                                      style={{
                                        padding: isMobile ? '8px 10px' : '10px 14px',
                                        background: currentPage === i ? accentColor : '#232324',
                                        color: '#fff',
                                        border: currentPage === i ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: isMobile ? '12px' : '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        minWidth: isMobile ? '32px' : '40px'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (currentPage !== i) {
                                          e.currentTarget.style.background = accentColor;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (currentPage !== i) {
                                          e.currentTarget.style.background = '#232324';
                                        }
                                      }}
                                    >
                                      {i}
                                    </button>
                                  );
                                }

                                // Last page
                                if (endPage < totalPages) {
                                  if (endPage < totalPages - 1) {
                                    pages.push(
                                      <span key="ellipsis2" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Montserrat', sans-serif" }}>...</span>
                                    );
                                  }
                                  pages.push(
                                    <button
                                      key={totalPages}
                                      onClick={() => setCurrentPage(totalPages)}
                                      style={{
                                        padding: isMobile ? '8px 10px' : '10px 14px',
                                        background: '#232324',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: isMobile ? '12px' : '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        minWidth: isMobile ? '32px' : '40px'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = accentColor;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#232324';
                                      }}
                                    >
                                      {totalPages}
                                    </button>
                                  );
                                }

                                return pages;
                              })()}
                            </div>

                            {/* Next Button */}
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                padding: isMobile ? '8px 12px' : '10px 20px',
                                background: currentPage === totalPages ? '#1a1a1b' : '#232324',
                                color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: isMobile ? '12px' : '14px',
                                fontWeight: 600,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (currentPage !== totalPages) {
                                  e.currentTarget.style.background = accentColor;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage !== totalPages) {
                                  e.currentTarget.style.background = '#232324';
                                }
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}

                        {/* Page Info */}
                        <p style={{
                          textAlign: 'center',
                          marginTop: '16px',
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: "'Montserrat', sans-serif"
                        }}>
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} of {filteredPlayers.length} players
                        </p>
                      </div>
                      );
                      })()}
                    </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Passes — kept mounted so the tab badge shows the pending count */}
              <div style={{ display: activeTab === 'passes' ? 'block' : 'none' }}>
                <h2 style={sectionTitle}>Pass <span style={{ color: accentColor }}>Requests.</span></h2>
                <CCPLTeamPasses
                  userId={sessionUser?.id}
                  fallbackTeamName={teamData?.name}
                  onPendingCountChange={setPendingPassCount}
                />
              </div>

              {/* Design Assets */}
              {activeTab === 'designAssets' && (
                <div>
                  <h2 style={sectionTitle}>Design <span style={{ color: accentColor }}>Assets.</span></h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: '20px', alignItems: 'start' }}>
                    <div style={{ border: `2px solid ${INK}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ aspectRatio: '1/1', background: '#e4e1d8', borderBottom: `2px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {teamData?.logo?.url ? (
                          <img src={teamData.logo.url} alt="Team Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px', background: '#fff' }} />
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#8a857a' }}>
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'block', margin: '0 auto 12px' }}>
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>No logo uploaded</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px' }}>
                        <span style={{ ...zuume, fontSize: '24px', lineHeight: 1, textTransform: 'uppercase' }}>Team Logo</span>
                        <input
                          type="file"
                          id="logoUpload"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleLogoUpload}
                          disabled={logoUploading}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="logoUpload" className={logoUploading ? undefined : 'ta-dark-btn'} style={skew(INK, { color: '#fff', padding: '8px 18px', cursor: logoUploading ? 'not-allowed' : 'pointer', opacity: logoUploading ? 0.6 : 1 })}>
                          <span style={{ ...pillLabel, whiteSpace: 'nowrap' }}>{logoUploading ? 'Uploading...' : (teamData?.logo?.url ? 'Change Logo' : 'Upload Logo')}</span>
                        </label>
                      </div>
                      {logoUploadProgress && (
                        <p style={{ margin: 0, padding: '0 16px 14px', color: logoUploadProgress.includes('success') ? '#2f9e5b' : accentColor, fontSize: '13px', fontWeight: 700 }}>
                          {logoUploadProgress}
                        </p>
                      )}
                    </div>

                    <div style={{ border: `2px solid ${INK}`, background: '#fff' }}>
                      <div style={cardHead}>Upload Guidelines</div>
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.6, color: MUTED }}>
                          Your team logo is used in official CCPL communications, merchandise and match displays.
                        </p>
                        {[
                          ['Formats', 'JPEG, PNG, WebP'],
                          ['Max file size', '5MB'],
                          ['Aspect ratio', 'Square (1:1) recommended'],
                          ['Resolution', 'At least 500 × 500 px'],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '12px', borderTop: `1px solid ${RULE}` }}>
                            <span style={eyebrow}>{label}</span>
                            <span style={{ fontSize: '15px', fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fixtures */}
              {activeTab === 'fixtures' && (
                <CcplTeamFixtures teamId={teamId} teamData={teamData} accentColor={accentColor} isMobile={isMobile} />
              )}

            </div>
          </section>
        </>
        )}

        <CCPLFooter above={PAPER} />

        {/* Player Profile Modal */}
        {showPlayerModal && selectedPlayer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '16px' : '20px'
          }}>
            {/* Backdrop */}
            <div
              onClick={() => setShowPlayerModal(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(4px)'
              }}
            />
            
            {/* Modal Content */}
            <div style={{
              position: 'relative',
              background: '#1a1a1b',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `1px solid ${accentColor}`,
              boxShadow: `0 0 40px rgba(226, 123, 70, 0.3)`
            }}>
              {/* Header */}
              <div style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColorDark} 100%)`,
                padding: isMobile ? '20px' : '24px',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  fontFamily: "'Zuume Cut', sans-serif",
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: isMobile ? '20px' : '24px',
                  color: '#fff',
                  margin: 0,
                  textTransform: 'uppercase'
                }}>
                  Player Profile
                </h3>
                <button
                  onClick={() => setShowPlayerModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: isMobile ? '20px' : '32px' }}>
                {/* Player Photo */}
                {(selectedPlayer.playerPhoto || selectedPlayer.actionPhoto) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '24px'
                  }}>
                    <div
                      onClick={() => setShowImageLightbox(true)}
                      style={{
                        width: isMobile ? '150px' : '200px',
                        height: isMobile ? '150px' : '200px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `3px solid ${accentColor}`,
                        boxShadow: `0 0 20px rgba(226, 123, 70, 0.3)`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = `0 0 30px rgba(226, 123, 70, 0.5)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 0 20px rgba(226, 123, 70, 0.3)`;
                      }}
                    >
                      <img
                        src={selectedPlayer.playerPhoto || selectedPlayer.actionPhoto}
                        alt={selectedPlayer.name || 'Player'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {/* Zoom indicator */}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                          <line x1="11" y1="8" x2="11" y2="14"/>
                          <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                        <span style={{ fontSize: '11px', color: '#fff', fontFamily: "'Montserrat', sans-serif" }}>Click to enlarge</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div style={{
                  background: '#232324',
                  borderRadius: '8px',
                  padding: isMobile ? '16px' : '20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <h4 style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accentColor,
                    marginBottom: '16px',
                    fontWeight: 700
                  }}>
                    Basic Information
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '16px'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Full Name</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.name || selectedPlayer.displayName || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Email</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Phone</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.phone || selectedPlayer.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Gender</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Date of Birth</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.dateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Age</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{calculateAge(selectedPlayer.dateOfBirth)}</p>
                    </div>
                  </div>
                </div>

                {/* DUPR Ratings */}
                <div style={{
                  background: '#232324',
                  borderRadius: '8px',
                  padding: isMobile ? '16px' : '20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <h4 style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accentColor,
                    marginBottom: '16px',
                    fontWeight: 700
                  }}>
                    DUPR Ratings
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                    gap: '16px'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>DUPR ID</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.duprId || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Doubles Rating</p>
                      <p style={{ fontSize: '18px', color: accentColor, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, margin: 0 }}>{selectedPlayer.doublesRating || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Singles Rating</p>
                      <p style={{ fontSize: '18px', color: accentColor, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, margin: 0 }}>{selectedPlayer.singlesRating || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Registration Info */}
                {selectedPlayer.registrationData && (
                  <>
                    {/* Step 5: Player Profile */}
                    {selectedPlayer.registrationData.step5 && (
                      <div style={{
                        background: '#232324',
                        borderRadius: '8px',
                        padding: isMobile ? '16px' : '20px',
                        marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <h4 style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: accentColor,
                          marginBottom: '16px',
                          fontWeight: 700
                        }}>
                          Player Profile
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          {selectedPlayer.registrationData.step5.yearsPlaying && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Years Playing</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.yearsPlaying}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step5.discipline && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Discipline</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.discipline}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step5.preference && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Preference</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.preference}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step5.clubs && (
                            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Clubs</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.clubs}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step5.previousLeagues && (
                            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Previous Leagues</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.previousLeagues}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step5.achievements && (
                            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Achievements</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>{selectedPlayer.registrationData.step5.achievements}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 6: Player Bio */}
                    {selectedPlayer.registrationData.step6 && (
                      <div style={{
                        background: '#232324',
                        borderRadius: '8px',
                        padding: isMobile ? '16px' : '20px',
                        marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <h4 style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: accentColor,
                          marginBottom: '16px',
                          fontWeight: 700
                        }}>
                          Player Bio
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                          {selectedPlayer.registrationData.step6.bio && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Bio</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, lineHeight: '1.6' }}>{selectedPlayer.registrationData.step6.bio}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step6.playingStyle && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Playing Style</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, lineHeight: '1.6' }}>{selectedPlayer.registrationData.step6.playingStyle}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step6.strengths && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Strengths</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, lineHeight: '1.6' }}>{selectedPlayer.registrationData.step6.strengths}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step6.contribution && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Contribution to Team/League</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, lineHeight: '1.6' }}>{selectedPlayer.registrationData.step6.contribution}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 7: Match Day Availability */}
                    {selectedPlayer.registrationData.step7 && (
                      <div style={{
                        background: '#232324',
                        borderRadius: '8px',
                        padding: isMobile ? '16px' : '20px',
                        marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <h4 style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: accentColor,
                          marginBottom: '16px',
                          fontWeight: 700
                        }}>
                          Match Day Availability
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          {selectedPlayer.registrationData.step7.matchdays && (
                            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Available Match Days</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedPlayer.registrationData.step7.matchdays.md1 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD1</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md2 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD2</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md3 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD3</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md4 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD4</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md5 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD5</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md6 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD6</span>
                                )}
                                {selectedPlayer.registrationData.step7.matchdays.md7 && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>MD7</span>
                                )}
                              </div>
                              {selectedPlayer.registrationData.step7.matchdays.matchdaysConfirmed && (
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontFamily: "'Montserrat', sans-serif" }}>
                                  Total: {selectedPlayer.registrationData.step7.matchdays.matchdaysConfirmed} match days confirmed
                                </p>
                              )}
                            </div>
                          )}
                          {selectedPlayer.registrationData.step7.postseasonDates && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Postseason Availability</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedPlayer.registrationData.step7.postseasonDates.playoffs && (
                                  <span style={{ padding: '6px 12px', background: '#232324', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Playoffs</span>
                                )}
                                {selectedPlayer.registrationData.step7.postseasonDates.final && (
                                  <span style={{ padding: '6px 12px', background: '#232324', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Final</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 8: Practice Commitment */}
                    {selectedPlayer.registrationData.step8 && (
                      <div style={{
                        background: '#232324',
                        borderRadius: '8px',
                        padding: isMobile ? '16px' : '20px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <h4 style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: accentColor,
                          marginBottom: '16px',
                          fontWeight: 700
                        }}>
                          Practice Commitment
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                          {selectedPlayer.registrationData.step8.practiceCommit && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Practice Commitment</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, textTransform: 'capitalize' }}>{selectedPlayer.registrationData.step8.practiceCommit}</p>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step8.practiceDays && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Available Practice Days</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedPlayer.registrationData.step8.practiceDays[0] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Monday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[1] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Tuesday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[2] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Wednesday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[3] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Thursday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[4] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Friday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[5] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Saturday</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceDays[6] && (
                                  <span style={{ padding: '6px 12px', background: accentColor, color: '#fff', borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Sunday</span>
                                )}
                              </div>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step8.practiceTimes && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Preferred Practice Times</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedPlayer.registrationData.step8.practiceTimes[1] && (
                                  <span style={{ padding: '6px 12px', background: '#232324', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Morning</span>
                                )}
                                {selectedPlayer.registrationData.step8.practiceTimes[2] && (
                                  <span style={{ padding: '6px 12px', background: '#232324', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: '4px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Evening</span>
                                )}
                              </div>
                            </div>
                          )}
                          {selectedPlayer.registrationData.step8.practiceRestrictions && (
                            <div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Practice Restrictions</p>
                              <p style={{ fontSize: '15px', color: '#fff', fontFamily: "'Montserrat', sans-serif", margin: 0, lineHeight: '1.6' }}>{selectedPlayer.registrationData.step8.practiceRestrictions || 'None'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Lightbox */}
        {showImageLightbox && selectedPlayer && (selectedPlayer.playerPhoto || selectedPlayer.actionPhoto) && (
          <div
            onClick={() => setShowImageLightbox(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(8px)'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowImageLightbox(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: accentColor,
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 61
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = accentColorDark;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = accentColor;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Image */}
            <img
              src={selectedPlayer.playerPhoto || selectedPlayer.actionPhoto}
              alt={selectedPlayer.name || 'Player'}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '12px',
                border: `3px solid ${accentColor}`,
                boxShadow: `0 0 40px rgba(226, 123, 70, 0.5)`
              }}
            />

            {/* Hint text */}
            <p style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '14px',
              margin: 0
            }}>
              Click anywhere to close
            </p>
          </div>
        )}
      </div>
    </>
  );
}
