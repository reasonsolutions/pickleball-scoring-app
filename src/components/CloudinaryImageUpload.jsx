import React, { useState } from 'react';
import { uploadPlayerPhoto, uploadTeamLogo, uploadNewsImage } from '../utils/cloudinary';

export default function CloudinaryImageUpload({ onImageUpload, currentImage, className = "", label = "Player Photo", uploadType = "player" }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload to Cloudinary using appropriate function
      try {
        let uploadFunction;
        if (uploadType === 'team') {
          uploadFunction = uploadTeamLogo;
        } else if (uploadType === 'news') {
          uploadFunction = uploadNewsImage;
        } else {
          uploadFunction = uploadPlayerPhoto;
        }
        const result = await uploadFunction(file);
        
        // Call parent callback with the full Cloudinary result
        onImageUpload(result);
        
        // Update preview with the actual Cloudinary URL
        setPreview(result.url);
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        
        // Show more specific error message
        let imageType;
        if (uploadType === 'team') {
          imageType = 'team logo';
        } else if (uploadType === 'news') {
          imageType = 'news image';
        } else {
          imageType = 'player photo';
        }
        if (uploadError.message.includes('Invalid upload preset')) {
          alert(`Cloudinary upload preset not configured. Please set up an unsigned upload preset named "player_photos" in your Cloudinary dashboard.`);
        } else if (uploadError.message.includes('Upload failed')) {
          alert(`${imageType} upload failed. Please check your Cloudinary configuration and try again.`);
        } else {
          alert(`${imageType} upload failed: ${uploadError.message}`);
        }
        
        // Reset preview to previous state
        setPreview(currentImage || null);
        throw uploadError;
      }
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageUpload(null);
  };

  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label">
        <span className="label-text font-medium">{label} (Optional)</span>
      </label>
      
      {preview ? (
        <div className="relative">
          <div className="w-32 h-32 mx-auto">
            <img
              src={preview}
              alt={`${uploadType === 'team' ? 'Team logo' : uploadType === 'news' ? 'News image' : 'Player photo'} preview`}
              className={`w-full h-full object-cover border-4 border-base-300 ${uploadType === 'team' || uploadType === 'news' ? 'rounded-lg' : 'rounded-full'}`}
            />
          </div>
          <div className="flex justify-center gap-2 mt-3">
            <label className="btn btn-sm btn-primary">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Change
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              className="btn btn-sm btn-error"
              onClick={removeImage}
              disabled={uploading}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center rounded-full">
              <span className="loading loading-spinner loading-lg text-white"></span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <label className={`w-32 h-32 border-2 border-dashed border-base-300 ${uploadType === 'team' || uploadType === 'news' ? 'rounded-lg' : 'rounded-full'} flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors`}>
            {uploadType === 'team' ? (
              <svg className="w-8 h-8 text-base-content/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ) : uploadType === 'news' ? (
              <svg className="w-8 h-8 text-base-content/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-base-content/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <p className="text-xs text-center text-base-content/60">Click to upload</p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-center text-base-content/60 mt-2">PNG, JPG up to 5MB</p>
        </div>
      )}
      
      {uploading && (
        <div className="mt-2">
          <progress className="progress progress-primary w-full"></progress>
          <p className="text-sm text-center mt-1">Uploading photo...</p>
        </div>
      )}
    </div>
  );
}