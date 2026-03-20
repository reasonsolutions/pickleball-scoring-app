import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { uploadPlayerPhoto } from '../utils/cloudinary';
import { useImageCache } from '../hooks/useImageCache';

export default function PlayerPhotoModal({ player, isOpen, onClose, onPhotoUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState(player);
  
  // Use image cache for player photo
  const { src: cachedPhotoUrl, loading: photoLoading } = useImageCache(
    currentPlayer?.photoUrl ? `${currentPlayer.photoUrl}?q_auto` : null
  );

  // Update currentPlayer when player prop changes
  React.useEffect(() => {
    setCurrentPlayer(player);
  }, [player]);

  // Validate if image is square format
  const validateSquareFormat = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const isSquare = img.width === img.height;
          resolve(isSquare);
        };
        img.onerror = () => {
          resolve(false);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (file) => {
    if (!file) {
      setUploadError('No image selected');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    // Validate square format
    const isSquare = await validateSquareFormat(file);
    if (!isSquare) {
      setUploadError('Photo must be in square format (1:1 aspect ratio). Please upload a square image.');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess(false);

      // Upload to Cloudinary
      const result = await uploadPlayerPhoto(file);

      // Update player document with new photo
      const playerRef = doc(db, 'clubs-players', player.id);
      await updateDoc(playerRef, {
        photoUrl: result.url,
        photoPublicId: result.publicId,
        updatedAt: serverTimestamp()
      });

      // Update local state immediately to show new photo
      const updatedPlayer = {
        ...currentPlayer,
        photoUrl: result.url,
        photoPublicId: result.publicId
      };
      setCurrentPlayer(updatedPlayer);

      setUploadSuccess(true);
      
      // Call parent callback to update the player data
      if (onPhotoUpdate) {
        onPhotoUpdate(updatedPlayer);
      }

      // Clear success message after 2 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating player photo:', error);
      setUploadError(`Failed to save photo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      setUploadError('');

      // Update player document to remove photo
      const playerRef = doc(db, 'clubs-players', player.id);
      await updateDoc(playerRef, {
        photoUrl: null,
        photoPublicId: null,
        updatedAt: serverTimestamp()
      });

      // Update local state
      const updatedPlayer = {
        ...currentPlayer,
        photoUrl: null,
        photoPublicId: null
      };
      setCurrentPlayer(updatedPlayer);

      // Call parent callback
      if (onPhotoUpdate) {
        onPhotoUpdate(updatedPlayer);
      }
    } catch (error) {
      console.error('Error removing player photo:', error);
      setUploadError(`Failed to remove photo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen || !currentPlayer) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
            Player Photo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Player Info */}
        <div className="mb-6 pb-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
            {currentPlayer.fullName}
          </h3>
          <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
            {currentPlayer.emailId}
          </p>
        </div>

        {/* Current Photo Display */}
        {currentPlayer.photoUrl ? (
          <div className="mb-6">
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center relative">
              <img
                src={cachedPhotoUrl || `${currentPlayer.photoUrl}?q_auto`}
                alt={currentPlayer.fullName}
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-white"></span>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <label className="btn btn-sm btn-primary">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Change
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
              <button
                type="button"
                className="btn btn-sm btn-error"
                onClick={handleRemovePhoto}
                disabled={uploading}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-600 bg-gray-700 flex flex-col items-center justify-center">
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm text-gray-400">Click to upload photo</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">Square format only (PNG, JPG up to 5MB)</p>
          </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mb-4 bg-green-900/20 border border-green-500 rounded-lg p-3">
            <p className="text-green-400 text-center text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
              Photo updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mb-4 bg-red-900/20 border border-red-500 rounded-lg p-3">
            <p className="text-red-400 text-center text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
              {uploadError}
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            style={{fontFamily: 'Avantique, sans-serif'}}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
