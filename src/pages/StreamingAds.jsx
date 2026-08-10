import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';

const CLOUDINARY_CLOUD_NAME = 'dchlpsvwh';
const UPLOAD_PRESET = 'player_photos';

export default function StreamingAds() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rank: 1
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch tournament, fixtures, and ads data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentDoc.exists()) {
          setTournament(tournamentDoc.data());
        } else {
          setError('Tournament not found');
          setLoading(false);
          return;
        }

        // Fetch all fixtures for this tournament
        const fixturesQuery = query(
          collection(db, 'fixtures'),
          where('tournamentId', '==', tournamentId),
          limit(1000)
        );
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixturesData = fixturesSnapshot.docs.map(doc => {
          const fixtureData = doc.data();
          return {
            id: doc.id,
            ...fixtureData
          };
        });

        // Sort fixtures by date and time
        fixturesData.sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date || '1970-01-01');
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date || '1970-01-01');
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
        });

        setFixtures(fixturesData);

        // Fetch ads for this tournament
        const adsQuery = query(
          collection(db, 'clubs-ads'),
          where('tournamentId', '==', tournamentId)
        );
        
        const adsSnapshot = await getDocs(adsQuery);
        const adsData = adsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort ads by rank
        adsData.sort((a, b) => (a.rank || 999) - (b.rank || 999));
        setAds(adsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  // Upload video to Cloudinary
  const uploadVideoToCloudinary = async (file) => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('upload_preset', UPLOAD_PRESET);
    formDataUpload.append('folder', 'pickleball_app/ads');
    formDataUpload.append('resource_type', 'video');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formDataUpload,
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Cloudinary error:', data);
        throw new Error(data.error?.message || 'Upload failed');
      }

      return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        duration: data.duration,
        format: data.format
      };
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      throw err;
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if it's a video file
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rank' ? parseInt(value) : value
    }));
  };

  // Handle ad upload
  const handleUploadAd = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload to Cloudinary
      const cloudinaryData = await uploadVideoToCloudinary(selectedFile);

      // Save to Firestore
      const adData = {
        tournamentId,
        title: formData.title,
        description: formData.description,
        videoUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        duration: cloudinaryData.duration,
        format: cloudinaryData.format,
        rank: formData.rank,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'clubs-ads'), adData);

      // Reset form and refresh ads
      setFormData({ title: '', description: '', rank: 1 });
      setSelectedFile(null);
      setShowUploadModal(false);

      // Refresh ads list
      const adsQuery = query(
        collection(db, 'clubs-ads'),
        where('tournamentId', '==', tournamentId)
      );
      
      const adsSnapshot = await getDocs(adsQuery);
      const adsData = adsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      adsData.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setAds(adsData);
    } catch (err) {
      console.error('Error uploading ad:', err);
      setError(`Failed to upload ad: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle ad deletion
  const handleDeleteAd = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'clubs-ads', adId));
      setAds(ads.filter(ad => ad.id !== adId));
    } catch (err) {
      console.error('Error deleting ad:', err);
      setError('Failed to delete ad');
    }
  };

  // Handle rank update
  const handleUpdateRank = async (adId, newRank) => {
    try {
      await updateDoc(doc(db, 'clubs-ads', adId), {
        rank: newRank,
        updatedAt: serverTimestamp()
      });

      setAds(ads.map(ad => 
        ad.id === adId ? { ...ad, rank: newRank } : ad
      ).sort((a, b) => (a.rank || 999) - (b.rank || 999)));
    } catch (err) {
      console.error('Error updating rank:', err);
      setError('Failed to update rank');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Loading streaming ads...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && !showUploadModal) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-600 mb-2">🎬 Streaming Ads</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{tournament?.name}</h2>
            <p className="text-gray-600">Manage advertisement videos for streaming matches</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Upload Button */}
          <div className="mb-8 flex justify-center">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary btn-lg gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Upload New Ad Video
            </button>
          </div>

          {/* Ads List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {ads.length === 0 ? (
              <div className="lg:col-span-2 text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No ads uploaded yet</p>
                <p className="text-gray-400">Click "Upload New Ad Video" to get started</p>
              </div>
            ) : (
              ads.map((ad, index) => (
                <div key={ad.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  {/* Video Preview */}
                  <div className="relative bg-black h-48">
                    <video
                      src={ad.videoUrl}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      Rank #{ad.rank || index + 1}
                    </div>
                  </div>

                  {/* Ad Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-gray-600 text-sm mb-4">{ad.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                      {ad.duration && (
                        <div>
                          <span className="font-semibold">Duration:</span> {Math.round(ad.duration)}s
                        </div>
                      )}
                      {ad.format && (
                        <div>
                          <span className="font-semibold">Format:</span> {ad.format.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Rank Control */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ranking Position
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={ad.rank || index + 1}
                          onChange={(e) => handleUpdateRank(ad.id, parseInt(e.target.value))}
                          className="input input-bordered input-sm flex-1"
                        />
                        <button
                          onClick={() => handleUpdateRank(ad.id, ad.rank || index + 1)}
                          className="btn btn-sm btn-outline"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="btn btn-error btn-sm w-full"
                    >
                      Delete Ad
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Upcoming Matches Section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Upcoming Matches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fixtures.slice(0, 6).map((fixture) => (
                <div key={fixture.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {fixture.date?.toDate ? fixture.date.toDate().toLocaleDateString() : 'TBD'}
                      </p>
                      <p className="text-lg font-semibold text-gray-800">{fixture.time || 'TBD'}</p>
                    </div>
                    <span className="badge badge-primary">{fixture.matchTypeLabel || fixture.matchType}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-bold text-red-600">{fixture.team1Name}</p>
                    <p className="text-center text-gray-500 font-semibold">VS</p>
                    <p className="font-bold text-blue-600">{fixture.team2Name}</p>
                  </div>

                  {fixture.court && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">Court: <span className="font-semibold">{fixture.court}</span></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-12 bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">
              Total Ads: <span className="font-bold text-red-600">{ads.length}</span> | 
              Total Matches: <span className="font-bold text-red-600">{fixtures.length}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Ads are displayed in ranking order during streaming matches
            </p>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal modal-open">
            <div className="modal-box w-[95vw] max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Upload Advertisement Video</h3>
              
              <form onSubmit={handleUploadAd} className="space-y-4">
                {/* Title */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ad Title *</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Enter ad title"
                    className="input input-bordered w-full"
                    value={formData.title}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Description (Optional)</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="Enter ad description"
                    className="textarea textarea-bordered w-full"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>

                {/* Rank */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ranking Position</span>
                  </label>
                  <input
                    type="number"
                    name="rank"
                    min="1"
                    className="input input-bordered w-full"
                    value={formData.rank}
                    onChange={handleFormChange}
                  />
                  <label className="label">
                    <span className="label-text-alt">Lower numbers appear first</span>
                  </label>
                </div>

                {/* Video File */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Video File *</span>
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered w-full"
                    required
                  />
                  {selectedFile && (
                    <label className="label">
                      <span className="label-text-alt text-success">✓ {selectedFile.name}</span>
                    </label>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowUploadModal(false);
                      setFormData({ title: '', description: '', rank: 1 });
                      setSelectedFile(null);
                      setError('');
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Uploading...
                      </>
                    ) : (
                      'Upload Ad'
                    )}
                  </button>
                </div>
              </form>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button onClick={() => setShowUploadModal(false)}>close</button>
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
