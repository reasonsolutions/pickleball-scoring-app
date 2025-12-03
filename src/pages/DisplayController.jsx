import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { uploadAdsImage } from '../utils/cloudinary';
import { listLogosFromCloudinary, getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

export default function DisplayController() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [centerCourtFixtures, setCenterCourtFixtures] = useState([]);
  const [sideCourtFixtures, setSideCourtFixtures] = useState([]);
  const [currentMainDisplayFixture, setCurrentMainDisplayFixture] = useState(null);
  const [currentSideDisplayFixture, setCurrentSideDisplayFixture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Tab state management
  const [activeTab, setActiveTab] = useState('fixture-control');
  
  // Ads Media state (videos and images)
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Logos state
  const [displayLogos, setDisplayLogos] = useState([]);
  const [bottomLogos, setBottomLogos] = useState([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [availableLogos, setAvailableLogos] = useState([]);
  const [loadingAvailableLogos, setLoadingAvailableLogos] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          setTournament(tournamentDoc.data());
        } else {
          setError('Tournament not found');
          return;
        }

        // Fetch all matches for this tournament
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter center court matches
        const centerCourtMatches = allMatches.filter(match => {
          const courtName = match.court?.toLowerCase() || '';
          
          // Only show matches assigned to center court
          return courtName.includes('center') || courtName.includes('centre');
        });

        // Filter side court matches (NOT center court)
        const sideCourtMatches = allMatches.filter(match => {
          const courtName = match.court?.toLowerCase() || '';
          
          // Only show matches NOT assigned to center court
          return !(courtName.includes('center') || courtName.includes('centre'));
        });

        // Get unique dates from both center and side court matches
        const allCourtMatches = [...centerCourtMatches, ...sideCourtMatches];
        const uniqueDates = [...new Set(allCourtMatches.map(match => {
          const date = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          return date.toISOString().split('T')[0];
        }))].sort();

        setAvailableDates(uniqueDates);

        // Set today as default selected date if available
        const today = new Date().toISOString().split('T')[0];
        const defaultDate = uniqueDates.includes(today) ? today : uniqueDates[0];
        setSelectedDate(defaultDate || '');

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load controller data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  useEffect(() => {
    const fetchFixturesForDate = async () => {
      if (!selectedDate) return;

      try {
        const matchesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId)
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter matches for selected date - center court
        const centerCourtDateMatches = allMatches.filter(match => {
          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          const matchDateString = matchDate.toISOString().split('T')[0];
          const courtName = match.court?.toLowerCase() || '';
          
          // Only show matches for the selected date AND assigned to center court
          return matchDateString === selectedDate &&
                 (courtName.includes('center') || courtName.includes('centre'));
        });

        // Filter matches for selected date - side courts
        const sideCourtDateMatches = allMatches.filter(match => {
          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date || '1970-01-01');
          const matchDateString = matchDate.toISOString().split('T')[0];
          const courtName = match.court?.toLowerCase() || '';
          
          // Only show matches for the selected date AND NOT assigned to center court
          return matchDateString === selectedDate &&
                 !(courtName.includes('center') || courtName.includes('centre'));
        });

        // Group center court matches by fixture
        const centerCourtFixtureGroups = {};
        centerCourtDateMatches.forEach(match => {
          const key = match.fixtureGroupId || `${match.team1Name}_vs_${match.team2Name}`;
          if (!centerCourtFixtureGroups[key]) {
            centerCourtFixtureGroups[key] = {
              fixtureGroupId: key,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              matches: []
            };
          }
          centerCourtFixtureGroups[key].matches.push(match);
        });

        // Group side court matches by fixture
        const sideCourtFixtureGroups = {};
        sideCourtDateMatches.forEach(match => {
          const key = match.fixtureGroupId || `${match.team1Name}_vs_${match.team2Name}`;
          if (!sideCourtFixtureGroups[key]) {
            sideCourtFixtureGroups[key] = {
              fixtureGroupId: key,
              team1Name: match.team1Name,
              team2Name: match.team2Name,
              matches: []
            };
          }
          sideCourtFixtureGroups[key].matches.push(match);
        });

        setCenterCourtFixtures(Object.values(centerCourtFixtureGroups));
        setSideCourtFixtures(Object.values(sideCourtFixtureGroups));

        // Load current display settings from Firestore
        const displaySettingId = `${tournamentId}_${selectedDate}`;
        try {
          const displaySettingDoc = await getDoc(doc(db, 'display_settings', displaySettingId));
          if (displaySettingDoc.exists()) {
            const displaySetting = displaySettingDoc.data();
            setCurrentMainDisplayFixture(displaySetting.currentFixture || displaySetting.currentMainFixture);
            setCurrentSideDisplayFixture(displaySetting.currentSideFixture);
          } else {
            setCurrentMainDisplayFixture(null);
            setCurrentSideDisplayFixture(null);
          }
        } catch (error) {
          console.error('Error loading display setting:', error);
          setCurrentMainDisplayFixture(null);
          setCurrentSideDisplayFixture(null);
        }

      } catch (error) {
        console.error('Error fetching fixtures for date:', error);
      }
    };

    fetchFixturesForDate();
  }, [selectedDate, tournamentId]);

  const handleSetMainDisplay = async (fixture) => {
    setSaving(true);
    try {
      // Load existing display settings
      const displaySettingId = `${tournamentId}_${selectedDate}`;
      const existingDoc = await getDoc(doc(db, 'display_settings', displaySettingId));
      const existingData = existingDoc.exists() ? existingDoc.data() : {};
      
      // Update main display setting
      const displaySetting = {
        ...existingData,
        tournamentId,
        date: selectedDate,
        currentFixture: fixture, // Keep for backward compatibility
        currentMainFixture: fixture,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'display_settings', displaySettingId), displaySetting);
      setCurrentMainDisplayFixture(fixture);
      console.log('Main display updated to show:', fixture);
    } catch (error) {
      console.error('Error updating main display:', error);
      alert('Error updating main display: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetSideDisplay = async (fixture) => {
    setSaving(true);
    try {
      // Load existing display settings
      const displaySettingId = `${tournamentId}_${selectedDate}`;
      const existingDoc = await getDoc(doc(db, 'display_settings', displaySettingId));
      const existingData = existingDoc.exists() ? existingDoc.data() : {};
      
      // Update side display setting
      const displaySetting = {
        ...existingData,
        tournamentId,
        date: selectedDate,
        currentSideFixture: fixture,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'display_settings', displaySettingId), displaySetting);
      setCurrentSideDisplayFixture(fixture);
      console.log('Side display updated to show:', fixture);
    } catch (error) {
      console.error('Error updating side display:', error);
      alert('Error updating side display: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Media Management Functions (Videos and Images)
  const loadMediaItems = async () => {
    if (!tournamentId) return;
    
    setLoadingMedia(true);
    try {
      const mediaDoc = await getDoc(doc(db, 'video_links', tournamentId));
      if (mediaDoc.exists()) {
        const data = mediaDoc.data();
        // Handle backward compatibility - convert old video links to new format
        const items = data.mediaItems || data.links?.map(link => ({
          ...link,
          type: 'video'
        })) || [];
        setMediaItems(items);
      } else {
        setMediaItems([]);
      }
    } catch (error) {
      console.error('Error loading media items:', error);
      setMediaItems([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const saveMediaItems = async (items) => {
    try {
      await setDoc(doc(db, 'video_links', tournamentId), {
        tournamentId,
        mediaItems: items,
        // Keep backward compatibility
        links: items.filter(item => item.type === 'video'),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving media items:', error);
      alert('Error saving media items: ' + error.message);
    }
  };

  const addVideoLink = () => {
    const newItem = {
      id: Date.now().toString(),
      type: 'video',
      url: '',
      title: '',
      rank: mediaItems.length + 1
    };
    const updatedItems = [...mediaItems, newItem];
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);
  };

  const addImageUpload = async (file) => {
    try {
      const uploadResult = await uploadAdsImage(file);
      const newItem = {
        id: Date.now().toString(),
        type: 'image',
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        title: file.name.split('.')[0], // Use filename without extension as default title
        rank: mediaItems.length + 1
      };
      const updatedItems = [...mediaItems, newItem];
      setMediaItems(updatedItems);
      saveMediaItems(updatedItems);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    }
  };

  const removeMediaItem = (id) => {
    const updatedItems = mediaItems.filter(item => item.id !== id)
      .map((item, index) => ({ ...item, rank: index + 1 }));
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);
  };

  const updateMediaItem = (id, field, value) => {
    const updatedItems = mediaItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);
  };

  const moveMediaItem = (id, direction) => {
    const currentIndex = mediaItems.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= mediaItems.length) return;

    const updatedItems = [...mediaItems];
    [updatedItems[currentIndex], updatedItems[newIndex]] = [updatedItems[newIndex], updatedItems[currentIndex]];
    
    // Update ranks
    updatedItems.forEach((item, index) => {
      item.rank = index + 1;
    });

    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);
  };

  // Logo Management Functions
  const loadLogos = async () => {
    if (!tournamentId) return;
    
    setLoadingLogos(true);
    try {
      const logosDoc = await getDoc(doc(db, 'tournament_logos', tournamentId));
      if (logosDoc.exists()) {
        const data = logosDoc.data();
        setDisplayLogos(data.displayLogos || []);
        setBottomLogos(data.bottomLogos || []);
      } else {
        setDisplayLogos([]);
        setBottomLogos([]);
      }
    } catch (error) {
      console.error('Error loading logos:', error);
      setDisplayLogos([]);
      setBottomLogos([]);
    } finally {
      setLoadingLogos(false);
    }
  };

  const loadAvailableLogos = async () => {
    setLoadingAvailableLogos(true);
    try {
      const logos = await listLogosFromCloudinary();
      setAvailableLogos(logos);
    } catch (error) {
      console.error('Error loading available logos:', error);
      setAvailableLogos([]);
    } finally {
      setLoadingAvailableLogos(false);
    }
  };

  const saveLogos = async (topLogos, bottomLogosParam) => {
    try {
      await setDoc(doc(db, 'tournament_logos', tournamentId), {
        tournamentId,
        displayLogos: topLogos,
        bottomLogos: bottomLogosParam,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving logos:', error);
      alert('Error saving logos: ' + error.message);
    }
  };

  const addLogoToDisplay = async (logoData, position = 'top') => {
    const newLogo = {
      id: Date.now().toString(),
      url: logoData.url,
      publicId: logoData.publicId,
      title: logoData.title || logoData.publicId?.split('/').pop() || 'Logo',
      rank: position === 'top' ? displayLogos.length + 1 : bottomLogos.length + 1
    };

    if (position === 'top') {
      const updatedLogos = [...displayLogos, newLogo];
      setDisplayLogos(updatedLogos);
      saveLogos(updatedLogos, bottomLogos);
    } else {
      const updatedLogos = [...bottomLogos, newLogo];
      setBottomLogos(updatedLogos);
      saveLogos(displayLogos, updatedLogos);
    }
  };

  const removeLogoFromDisplay = (logoId, position = 'top') => {
    if (position === 'top') {
      const updatedLogos = displayLogos.filter(logo => logo.id !== logoId)
        .map((logo, index) => ({ ...logo, rank: index + 1 }));
      setDisplayLogos(updatedLogos);
      saveLogos(updatedLogos, bottomLogos);
    } else {
      const updatedLogos = bottomLogos.filter(logo => logo.id !== logoId)
        .map((logo, index) => ({ ...logo, rank: index + 1 }));
      setBottomLogos(updatedLogos);
      saveLogos(displayLogos, updatedLogos);
    }
  };

  const updateLogo = (logoId, field, value, position = 'top') => {
    if (position === 'top') {
      const updatedLogos = displayLogos.map(logo =>
        logo.id === logoId ? { ...logo, [field]: value } : logo
      );
      setDisplayLogos(updatedLogos);
      saveLogos(updatedLogos, bottomLogos);
    } else {
      const updatedLogos = bottomLogos.map(logo =>
        logo.id === logoId ? { ...logo, [field]: value } : logo
      );
      setBottomLogos(updatedLogos);
      saveLogos(displayLogos, updatedLogos);
    }
  };

  const moveLogoInDisplay = (logoId, direction, position = 'top') => {
    const logos = position === 'top' ? displayLogos : bottomLogos;
    const currentIndex = logos.findIndex(logo => logo.id === logoId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= logos.length) return;

    const updatedLogos = [...logos];
    [updatedLogos[currentIndex], updatedLogos[newIndex]] = [updatedLogos[newIndex], updatedLogos[currentIndex]];
    
    // Update ranks
    updatedLogos.forEach((logo, index) => {
      logo.rank = index + 1;
    });

    if (position === 'top') {
      setDisplayLogos(updatedLogos);
      saveLogos(updatedLogos, bottomLogos);
    } else {
      setBottomLogos(updatedLogos);
      saveLogos(displayLogos, updatedLogos);
    }
  };

  const uploadLogoToCloudinary = async (file) => {
    try {
      // Create a custom upload function for logos
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'player_photos'); // Using existing preset
      formData.append('folder', 'LOGOS'); // Upload to LOGOS folder

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dnfcybtnn/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return {
        url: data.secure_url,
        publicId: data.public_id,
        title: file.name.split('.')[0]
      };
    } catch (error) {
      console.error('Error uploading logo to Cloudinary:', error);
      throw error;
    }
  };

  // Load media items and logos when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'ads-videos') {
      loadMediaItems();
    } else if (activeTab === 'logos') {
      loadLogos();
      loadAvailableLogos();
    }
  }, [activeTab, tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Display Controller</h1>
          <h2 className="text-2xl font-semibold mb-4">{tournament?.name}</h2>
          <p className="text-base-content/70">Control displays and manage content</p>
        </div>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed mb-8 bg-base-100 p-1">
          <button
            className={`tab tab-lg ${activeTab === 'fixture-control' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('fixture-control')}
          >
            Fixture Control
          </button>
          <button
            className={`tab tab-lg ${activeTab === 'ads-videos' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ads-videos')}
          >
            Ads Videos
          </button>
          <button
            className={`tab tab-lg ${activeTab === 'logos' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('logos')}
          >
            Logos
          </button>
        </div>

        {/* Fixture Control Tab */}
        {activeTab === 'fixture-control' && (
          <>
            {/* Date Selection */}
            <div className="card bg-base-100 shadow-xl mb-8">
              <div className="card-body">
                <h3 className="card-title mb-4">Select Date</h3>
                <div className="flex flex-wrap gap-2">
                  {availableDates.map(date => (
                    <button
                      key={date}
                      className={`btn ${selectedDate === date ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Display Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Main Display Status */}
              <div className={`alert ${currentMainDisplayFixture ? 'alert-success' : 'alert-info'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">Main Display (Center Court)</h3>
                  <div className="text-xs">
                    {currentMainDisplayFixture
                      ? `${currentMainDisplayFixture.team1Name} vs ${currentMainDisplayFixture.team2Name}`
                      : 'No fixture selected'
                    }
                  </div>
                </div>
              </div>

              {/* Side Display Status */}
              <div className={`alert ${currentSideDisplayFixture ? 'alert-success' : 'alert-info'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">Side Display (Side Courts)</h3>
                  <div className="text-xs">
                    {currentSideDisplayFixture
                      ? `${currentSideDisplayFixture.team1Name} vs ${currentSideDisplayFixture.team2Name}`
                      : 'No fixture selected'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Main Display - Center Court Fixtures */}
            <div className="space-y-6 mb-12">
              <h3 className="text-2xl font-bold">Main Display - Center Court Fixtures for {formatDate(selectedDate)}</h3>
              
              {centerCourtFixtures.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏓</div>
                  <h3 className="text-2xl font-bold mb-2">No Center Court Fixtures</h3>
                  <p className="text-base-content/70">No center court fixtures found for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {centerCourtFixtures.map((fixture) => (
                    <div
                      key={fixture.fixtureGroupId}
                      className={`card bg-base-100 shadow-xl ${
                        currentMainDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                    >
                      <div className="card-body">
                        <h4 className="card-title text-lg">
                          {fixture.team1Name} vs {fixture.team2Name}
                        </h4>
                        
                        <div className="mb-4">
                          <div className="badge badge-secondary mb-2">
                            {fixture.matches.length} match{fixture.matches.length !== 1 ? 'es' : ''}
                          </div>
                          
                          <div className="text-sm space-y-1">
                            {fixture.matches.slice(0, 3).map((match, index) => (
                              <div key={match.id} className="flex justify-between">
                                <span>{match.matchTypeLabel || 'Match'}</span>
                                <span className={`badge badge-xs ${
                                  match.status === 'completed' ? 'badge-success' :
                                  match.status === 'in_progress' ? 'badge-warning' :
                                  'badge-ghost'
                                }`}>
                                  {match.status === 'completed' ? 'Done' :
                                   match.status === 'in_progress' ? 'Live' :
                                   'Upcoming'}
                                </span>
                              </div>
                            ))}
                            {fixture.matches.length > 3 && (
                              <div className="text-xs text-center text-base-content/50">
                                +{fixture.matches.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="card-actions justify-end">
                          <button
                            className={`btn btn-sm ${
                              currentMainDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                                ? 'btn-success'
                                : 'btn-primary'
                            } ${saving ? 'loading' : ''}`}
                            onClick={() => handleSetMainDisplay(fixture)}
                            disabled={saving}
                          >
                            {currentMainDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                              ? 'Currently on Main Display'
                              : 'Set as Main Display'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Side Display - Side Court Fixtures */}
            <div className="space-y-6 mb-12">
              <h3 className="text-2xl font-bold">Side Display - Side Court Fixtures for {formatDate(selectedDate)}</h3>
              
              {sideCourtFixtures.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏸</div>
                  <h3 className="text-2xl font-bold mb-2">No Side Court Fixtures</h3>
                  <p className="text-base-content/70">No side court fixtures found for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sideCourtFixtures.map((fixture) => (
                    <div
                      key={fixture.fixtureGroupId}
                      className={`card bg-base-100 shadow-xl ${
                        currentSideDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                          ? 'ring-2 ring-secondary'
                          : ''
                      }`}
                    >
                      <div className="card-body">
                        <h4 className="card-title text-lg">
                          {fixture.team1Name} vs {fixture.team2Name}
                        </h4>
                        
                        <div className="mb-4">
                          <div className="badge badge-accent mb-2">
                            {fixture.matches.length} match{fixture.matches.length !== 1 ? 'es' : ''}
                          </div>
                          
                          <div className="text-sm space-y-1">
                            {fixture.matches.slice(0, 3).map((match, index) => (
                              <div key={match.id} className="flex justify-between">
                                <span>{match.matchTypeLabel || 'Match'}</span>
                                <span className={`badge badge-xs ${
                                  match.status === 'completed' ? 'badge-success' :
                                  match.status === 'in_progress' ? 'badge-warning' :
                                  'badge-ghost'
                                }`}>
                                  {match.status === 'completed' ? 'Done' :
                                   match.status === 'in_progress' ? 'Live' :
                                   'Upcoming'}
                                </span>
                              </div>
                            ))}
                            {fixture.matches.length > 3 && (
                              <div className="text-xs text-center text-base-content/50">
                                +{fixture.matches.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="card-actions justify-end">
                          <button
                            className={`btn btn-sm ${
                              currentSideDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                                ? 'btn-success'
                                : 'btn-secondary'
                            } ${saving ? 'loading' : ''}`}
                            onClick={() => handleSetSideDisplay(fixture)}
                            disabled={saving}
                          >
                            {currentSideDisplayFixture?.fixtureGroupId === fixture.fixtureGroupId
                              ? 'Currently on Side Display'
                              : 'Set as Side Display'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Links */}
            {selectedDate && (
              <div className="mt-8 text-center">
                <div className="flex gap-4 justify-center">
                  <button
                    className="btn btn-outline btn-lg"
                    onClick={() => {
                      const mainDisplayUrl = `${window.location.origin}/main-display/${tournamentId}/${selectedDate}`;
                      window.open(mainDisplayUrl, '_blank');
                    }}
                  >
                    Preview Main Display
                  </button>
                  
                  <button
                    className="btn btn-outline btn-secondary btn-lg"
                    onClick={() => {
                      const sideDisplayUrl = `${window.location.origin}/side-display/${tournamentId}/${selectedDate}`;
                      window.open(sideDisplayUrl, '_blank');
                    }}
                  >
                    Preview Side Display
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ads Videos Tab */}
        {activeTab === 'ads-videos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Ads Media Management</h3>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={addVideoLink}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Add Video Link
                </button>
                <label className="btn btn-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        addImageUpload(file);
                        e.target.value = ''; // Reset input
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {loadingMedia ? (
              <div className="flex justify-center py-12">
                <div className="loading loading-spinner loading-lg"></div>
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-2xl font-bold mb-2">No Media Items</h3>
                <p className="text-base-content/70">Add video links or upload images to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mediaItems
                  .sort((a, b) => a.rank - b.rank)
                  .map((item, index) => (
                    <div key={item.id} className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="badge badge-primary badge-lg">#{item.rank}</div>
                            <div className={`badge badge-sm ${item.type === 'video' ? 'badge-info' : 'badge-success'}`}>
                              {item.type === 'video' ? '🎥 Video' : '🖼️ Image'}
                            </div>
                          </div>
                          
                          {item.type === 'image' && (
                            <div className="avatar">
                              <div className="w-16 h-16 rounded">
                                <img src={item.url} alt={item.title} className="object-cover" />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">Title</span>
                              </label>
                              <input
                                type="text"
                                placeholder={item.type === 'video' ? 'Video title' : 'Image title'}
                                className="input input-bordered"
                                value={item.title}
                                onChange={(e) => updateMediaItem(item.id, 'title', e.target.value)}
                              />
                            </div>
                            
                            {item.type === 'video' && (
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text">URL</span>
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  className="input input-bordered"
                                  value={item.url}
                                  onChange={(e) => updateMediaItem(item.id, 'url', e.target.value)}
                                />
                              </div>
                            )}
                            
                            {item.type === 'image' && (
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text">Image URL</span>
                                </label>
                                <input
                                  type="text"
                                  className="input input-bordered"
                                  value={item.url}
                                  readOnly
                                  placeholder="Cloudinary URL"
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => moveMediaItem(item.id, 'up')}
                              disabled={index === 0}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => moveMediaItem(item.id, 'down')}
                              disabled={index === mediaItems.length - 1}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          
                          <button
                            className="btn btn-sm btn-error"
                            onClick={() => removeMediaItem(item.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Logos Tab */}
        {activeTab === 'logos' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Logo Management</h3>
              <p className="text-base-content/70">Manage logos for both main display and side display. Logos will appear from left to right in the order you set.</p>
            </div>

            {loadingLogos ? (
              <div className="flex justify-center py-12">
                <div className="loading loading-spinner loading-lg"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Top Display Logos */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="card-title text-xl">Top Logos</h4>
                      <div className="flex gap-2">
                        <label className="btn btn-primary btn-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  const logoData = await uploadLogoToCloudinary(file);
                                  addLogoToDisplay(logoData, 'top');
                                  e.target.value = ''; // Reset input
                                } catch (error) {
                                  alert('Error uploading logo: ' + error.message);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {displayLogos.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🔝</div>
                        <p className="text-base-content/70">No top logos added</p>
                        <p className="text-sm text-base-content/50 mt-2">Upload or select from available logos</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayLogos
                          .sort((a, b) => a.rank - b.rank)
                          .map((logo, index) => (
                            <div key={logo.id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                              <div className="badge badge-primary">#{logo.rank}</div>
                              
                              <div className="avatar">
                                <div className="w-12 h-12 rounded">
                                  <img
                                    src={getOptimizedLogoUrl(logo.publicId, { width: 48, height: 48 }) || logo.url}
                                    alt={logo.title}
                                    className="object-contain"
                                    onError={(e) => {
                                      e.target.src = logo.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMyMi4yMDkxIDIwIDI0IDIxLjc5MDkgMjQgMjRDMjQgMjYuMjA5MSAyMi4yMDkxIDI4IDIwIDI4QzE3Ljc5MDkgMjggMTYgMjYuMjA5MSAxNiAyNEMxNiAyMS43OTA5IDE3Ljc5MDkgMjAgMjAgMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Logo title"
                                  className="input input-bordered input-sm w-full"
                                  value={logo.title}
                                  onChange={(e) => updateLogo(logo.id, 'title', e.target.value, 'top')}
                                />
                              </div>
                              
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => moveLogoInDisplay(logo.id, 'left', 'top')}
                                  disabled={index === 0}
                                  title="Move left"
                                >
                                  ←
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => moveLogoInDisplay(logo.id, 'right', 'top')}
                                  disabled={index === displayLogos.length - 1}
                                  title="Move right"
                                >
                                  →
                                </button>
                                <button
                                  className="btn btn-error btn-sm"
                                  onClick={() => removeLogoFromDisplay(logo.id, 'top')}
                                  title="Remove logo"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Display Logos */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="card-title text-xl">Bottom Logos</h4>
                      <div className="flex gap-2">
                        <label className="btn btn-secondary btn-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  const logoData = await uploadLogoToCloudinary(file);
                                  addLogoToDisplay(logoData, 'bottom');
                                  e.target.value = ''; // Reset input
                                } catch (error) {
                                  alert('Error uploading logo: ' + error.message);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {bottomLogos.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">⬇️</div>
                        <p className="text-base-content/70">No bottom logos added</p>
                        <p className="text-sm text-base-content/50 mt-2">Upload or select from available logos</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bottomLogos
                          .sort((a, b) => a.rank - b.rank)
                          .map((logo, index) => (
                            <div key={logo.id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                              <div className="badge badge-secondary">#{logo.rank}</div>
                              
                              <div className="avatar">
                                <div className="w-12 h-12 rounded">
                                  <img
                                    src={getOptimizedLogoUrl(logo.publicId, { width: 48, height: 48 }) || logo.url}
                                    alt={logo.title}
                                    className="object-contain"
                                    onError={(e) => {
                                      e.target.src = logo.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ci8+CjxwYXRoIGQ9Ik0yMCAyMEMyMi4yMDkxIDIwIDI0IDIxLjc5MDkgMjQgMjRDMjQgMjYuMjA5MSAyMi4yMDkxIDI4IDIwIDI4QzE3Ljc5MDkgMjggMTYgMjYuMjA5MSAxNiAyNEMxNiAyMS43OTA5IDE3Ljc5MDkgMjAgMjAgMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Logo title"
                                  className="input input-bordered input-sm w-full"
                                  value={logo.title}
                                  onChange={(e) => updateLogo(logo.id, 'title', e.target.value, 'bottom')}
                                />
                              </div>
                              
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => moveLogoInDisplay(logo.id, 'left', 'bottom')}
                                  disabled={index === 0}
                                  title="Move left"
                                >
                                  ←
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => moveLogoInDisplay(logo.id, 'right', 'bottom')}
                                  disabled={index === bottomLogos.length - 1}
                                  title="Move right"
                                >
                                  →
                                </button>
                                <button
                                  className="btn btn-error btn-sm"
                                  onClick={() => removeLogoFromDisplay(logo.id, 'bottom')}
                                  title="Remove logo"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Logos from Cloudinary */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="card-title text-xl">Available Logos</h4>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={loadAvailableLogos}
                        disabled={loadingAvailableLogos}
                      >
                        {loadingAvailableLogos ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        Refresh
                      </button>
                    </div>

                    {loadingAvailableLogos ? (
                      <div className="flex justify-center py-8">
                        <div className="loading loading-spinner loading-md"></div>
                      </div>
                    ) : availableLogos.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-base-content/70">No logos found in Cloudinary</p>
                        <p className="text-sm text-base-content/50 mt-2">Upload logos to the LOGOS folder in Cloudinary</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {availableLogos.map((logo) => (
                          <div
                            key={logo.publicId}
                            className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="card-body p-3">
                              <div className="aspect-square bg-white rounded flex items-center justify-center mb-2">
                                <img
                                  src={getOptimizedLogoUrl(logo.publicId, { width: 80, height: 80 })}
                                  alt={logo.publicId.split('/').pop()}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <p className="text-xs text-center truncate mb-2" title={logo.publicId.split('/').pop()}>
                                {logo.publicId.split('/').pop()}
                              </p>
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-primary btn-xs flex-1"
                                  onClick={() => addLogoToDisplay({
                                    url: logo.url,
                                    publicId: logo.publicId,
                                    title: logo.publicId.split('/').pop()
                                  }, 'top')}
                                  title="Add to top"
                                >
                                  Top
                                </button>
                                <button
                                  className="btn btn-secondary btn-xs flex-1"
                                  onClick={() => addLogoToDisplay({
                                    url: logo.url,
                                    publicId: logo.publicId,
                                    title: logo.publicId.split('/').pop()
                                  }, 'bottom')}
                                  title="Add to bottom"
                                >
                                  Bottom
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-info/10 border border-info/20 rounded-lg p-6">
              <h4 className="font-semibold text-info mb-3">How to use Logo Management:</h4>
              <ul className="text-sm space-y-2 text-base-content/80">
                <li>• <strong>Upload Logo:</strong> Click "Upload Logo" to add new logos to Cloudinary and your display</li>
                <li>• <strong>Add from Available:</strong> Click on any logo from the "Available Logos" section to add it to your display</li>
                <li>• <strong>Reorder:</strong> Use the ← → buttons to move logos left or right</li>
                <li>• <strong>Edit Title:</strong> Click on the title field to edit the logo name</li>
                <li>• <strong>Remove:</strong> Click the × button to remove a logo from display</li>
                <li>• <strong>Display Order:</strong> Logos will appear from left to right in the order shown on both main and side displays</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}