import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import { uploadSponsorLogo } from '../utils/cloudinary';

const SPONSOR_SECTIONS = [
  { key: 'homeScreen', label: 'Home Screen' },
  { key: 'liveMatch', label: 'Live Match' },
  { key: 'leagueScreen', label: 'League Screen' },
  { key: 'fantasyScreen', label: 'Fantasy Screen' }
];

export default function AppSettings() {
  const [activeTab, setActiveTab] = useState('general');

  // General tab state
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sponsors tab state
  const [sponsors, setSponsors] = useState({
    homeScreen: [],
    liveMatch: [],
    leagueScreen: [],
    fantasyScreen: []
  });
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [uploadingSection, setUploadingSection] = useState('');
  const [sponsorMessage, setSponsorMessage] = useState({ type: '', text: '' });

  // Food tab state
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [loadingFood, setLoadingFood] = useState(true);
  const [savingFood, setSavingFood] = useState(false);
  const [foodMessage, setFoodMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchTournamentsAndSettings();
    fetchSponsors();
    fetchFoodSettings();
  }, []);

  const fetchTournamentsAndSettings = async () => {
    try {
      setLoading(true);

      // Fetch all tournaments
      const tournamentsRef = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsRef);
      const tournamentsData = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTournaments(tournamentsData);

      // Fetch current app settings
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      const appSettingsDoc = await getDoc(appSettingsRef);

      if (appSettingsDoc.exists()) {
        const settings = appSettingsDoc.data();
        setSelectedTournamentId(settings.activeTournamentId || '');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data. Please try again.' });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTournamentId) {
      setMessage({ type: 'error', text: 'Please select a tournament.' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Save to app-settings collection
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      await setDoc(appSettingsRef, {
        activeTournamentId: selectedTournamentId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage({ type: 'success', text: 'App settings saved successfully!' });
      setSaving(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
      setSaving(false);
    }
  };

  const getSelectedTournamentName = () => {
    const tournament = tournaments.find(t => t.id === selectedTournamentId);
    return tournament ? tournament.name : 'None';
  };

  // ---------- Sponsors Tab Logic ----------

  const fetchSponsors = async () => {
    try {
      setLoadingSponsors(true);
      const sponsorsRef = doc(db, 'app-sponsors', 'sections');
      const sponsorsDoc = await getDoc(sponsorsRef);

      if (sponsorsDoc.exists()) {
        const data = sponsorsDoc.data();
        setSponsors({
          homeScreen: data.homeScreen || [],
          liveMatch: data.liveMatch || [],
          leagueScreen: data.leagueScreen || [],
          fantasyScreen: data.fantasyScreen || []
        });
      }
      setLoadingSponsors(false);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      setSponsorMessage({ type: 'error', text: 'Failed to load sponsors.' });
      setLoadingSponsors(false);
    }
  };

  const saveSponsors = async (updatedSponsors) => {
    try {
      const sponsorsRef = doc(db, 'app-sponsors', 'sections');
      await setDoc(sponsorsRef, {
        ...updatedSponsors,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving sponsors:', error);
      setSponsorMessage({ type: 'error', text: 'Failed to save sponsors. Please try again.' });
      throw error;
    }
  };

  const handleSponsorUpload = async (sectionKey, files) => {
    if (!files || files.length === 0) return;

    setUploadingSection(sectionKey);
    setSponsorMessage({ type: '', text: '' });

    try {
      const fileArray = Array.from(files);
      const uploadedLogos = [];

      for (const file of fileArray) {
        const uploadResult = await uploadSponsorLogo(file, sectionKey);
        uploadedLogos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          title: file.name.split('.').slice(0, -1).join('.') || file.name,
          uploadedAt: new Date().toISOString()
        });
      }

      const updatedSponsors = {
        ...sponsors,
        [sectionKey]: [...sponsors[sectionKey], ...uploadedLogos]
      };

      setSponsors(updatedSponsors);
      await saveSponsors(updatedSponsors);

      setSponsorMessage({ type: 'success', text: `${uploadedLogos.length} sponsor logo(s) uploaded successfully!` });
    } catch (error) {
      console.error('Error uploading sponsor logo:', error);
      setSponsorMessage({ type: 'error', text: error.message || 'Failed to upload sponsor logo.' });
    } finally {
      setUploadingSection('');
    }
  };

  const handleRemoveSponsor = async (sectionKey, logoId) => {
    try {
      const updatedSponsors = {
        ...sponsors,
        [sectionKey]: sponsors[sectionKey].filter(logo => logo.id !== logoId)
      };
      setSponsors(updatedSponsors);
      await saveSponsors(updatedSponsors);
      setSponsorMessage({ type: 'success', text: 'Sponsor logo removed.' });
    } catch (error) {
      console.error('Error removing sponsor:', error);
      setSponsorMessage({ type: 'error', text: 'Failed to remove sponsor logo.' });
    }
  };

  // ---------- Food Tab Logic ----------

  const fetchFoodSettings = async () => {
    try {
      setLoadingFood(true);
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      const appSettingsDoc = await getDoc(appSettingsRef);

      if (appSettingsDoc.exists()) {
        const settings = appSettingsDoc.data();
        setFoodEnabled(!!settings.foodEnabled);
      }
      setLoadingFood(false);
    } catch (error) {
      console.error('Error fetching food settings:', error);
      setFoodMessage({ type: 'error', text: 'Failed to load food settings.' });
      setLoadingFood(false);
    }
  };

  const handleToggleFood = async () => {
    const newValue = !foodEnabled;
    const previousValue = foodEnabled;

    setFoodEnabled(newValue);
    setSavingFood(true);
    setFoodMessage({ type: '', text: '' });

    try {
      const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
      await setDoc(appSettingsRef, {
        foodEnabled: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setFoodMessage({ type: 'success', text: `Food feature ${newValue ? 'enabled' : 'disabled'} successfully!` });
    } catch (error) {
      console.error('Error saving food setting:', error);
      setFoodEnabled(previousValue);
      setFoodMessage({ type: 'error', text: 'Failed to update food setting. Please try again.' });
    } finally {
      setSavingFood(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
            <p className="text-gray-600 mt-2">Configure settings for the mobile application</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex gap-6 -mb-px">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('sponsors')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sponsors'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sponsors
              </button>
              <button
                onClick={() => setActiveTab('food')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'food'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Food
              </button>
            </nav>
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <>
                  {/* Active Tournament Section */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Active Tournament for Mobile App
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      Select which tournament should be active and visible in the mobile application.
                    </p>

                    <select
                      value={selectedTournamentId}
                      onChange={(e) => setSelectedTournamentId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Select a Tournament --</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name} {tournament.status ? `(${tournament.status})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Selection Display */}
                  {selectedTournamentId && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-orange-900">
                            Selected Tournament
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            {getSelectedTournamentName()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Display */}
                  {message.text && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      message.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {message.type === 'success' ? (
                          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <p className={`text-sm font-medium ${
                          message.type === 'success' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {message.text}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSave}
                      disabled={saving || !selectedTournamentId}
                      className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                        saving || !selectedTournamentId
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Save Settings'
                      )}
                    </button>

                    <button
                      onClick={fetchTournamentsAndSettings}
                      disabled={saving}
                      className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Info Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">About App Settings</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        The selected tournament will be the active tournament displayed in the mobile app.
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Changes take effect immediately after saving.
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Settings are stored in the 'app-settings' collection in Firestore.
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sponsors Tab */}
          {activeTab === 'sponsors' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Sponsor Logos</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload sponsor logos for each section of the mobile app. You can add multiple logos per section.
                  Images are uploaded to Cloudinary and saved in the <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">app-sponsors</code> collection.
                </p>
              </div>

              {sponsorMessage.text && (
                <div className={`mb-6 p-4 rounded-lg ${
                  sponsorMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    sponsorMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {sponsorMessage.text}
                  </p>
                </div>
              )}

              {loadingSponsors ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  {SPONSOR_SECTIONS.map((section) => (
                    <div key={section.key} className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>

                        <label
                          className={`px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition-colors ${
                            uploadingSection === section.key
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {uploadingSection === section.key ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </span>
                          ) : (
                            '+ Upload Logo(s)'
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingSection === section.key}
                            onChange={(e) => {
                              handleSponsorUpload(section.key, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      {sponsors[section.key] && sponsors[section.key].length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {sponsors[section.key].map((logo) => (
                            <div
                              key={logo.id}
                              className="relative group border border-gray-200 rounded-lg p-3 flex flex-col items-center bg-gray-50"
                            >
                              <img
                                src={logo.url}
                                alt={logo.title || 'Sponsor logo'}
                                className="w-full h-20 object-contain mb-2"
                              />
                              <p className="text-xs text-gray-600 truncate w-full text-center">{logo.title}</p>
                              <button
                                onClick={() => handleRemoveSponsor(section.key, logo.id)}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                title="Remove logo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">No sponsor logos added for this section yet.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Food Tab */}
          {activeTab === 'food' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Food</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enable or disable the Food ordering feature in the mobile application.
                </p>
              </div>

              {foodMessage.text && (
                <div className={`mb-6 p-4 rounded-lg ${
                  foodMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    foodMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {foodMessage.text}
                  </p>
                </div>
              )}

              {loadingFood ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Food</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {foodEnabled ? 'Food feature is currently enabled in the mobile app.' : 'Food feature is currently disabled in the mobile app.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={foodEnabled}
                    disabled={savingFood}
                    onClick={handleToggleFood}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      foodEnabled ? 'bg-orange-500' : 'bg-gray-300'
                    } ${savingFood ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                        foodEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">About Food Setting</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    This toggle controls the <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">foodEnabled</code> field in the 'app-settings/mobile-app' document in Firestore.
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Changes take effect immediately after toggling.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
