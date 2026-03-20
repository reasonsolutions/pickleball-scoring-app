import React, { useState } from 'react';
import {
  uploadPlayerPhotoOptimized,
  uploadTeamLogoOptimized,
  uploadNewsImageOptimized,
  uploadClubLogoOptimized,
  getThumbnailUrl,
  getAvatarUrl
} from '../utils/cloudinaryOptimized';

/**
 * Optimized Cloudinary Image Upload Component
 * 
 * Features:
 * - Client-side image compression (reduces storage credits)
 * - Automatic format optimization (WebP/AVIF)
 * - Responsive image support
 * - Compression metrics display
 * - Better error handling
 */
export default function CloudinaryImageUploadOptimized({
  onImageUpload,
  currentImage,
  className = "",
  label = "Photo",
  uploadType = "player",
  showCompressionMetrics = true
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || null);
  const [compressionMetrics, setCompressionMetrics] = useState(null);
  const [error, setError] = useState(null);

  // Map upload types to their respective functions
  const uploadFunctions = {
    player: uploadPlayerPhotoOptimized,
    team: uploadTeamLogoOptimized,
    news: uploadNewsImageOptimized,
    club: uploadClubLogoOptimized
  };

  const getUploadFunction = () => {
    return uploadFunctions[uploadType] || uploadPlayerPhotoOptimized;
  };

  const getImageTypeLabel = () => {
    const labels = {
      player: 'player photo',
      team: 'team logo',
      news: 'news image',
      club: 'club logo'
    };
    return labels[uploadType] || 'photo';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset error state
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB limit before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload with optimization
      const uploadFunction = getUploadFunction();
      const result = await uploadFunction(file);

      // Store compression metrics
      if (showCompressionMetrics) {
        setCompressionMetrics({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          compressionRatio: result.compressionRatio
        });
      }

      // Call parent callback with the full result
      onImageUpload(result);

      // Update preview with the actual Cloudinary URL
      setPreview(result.secure_url);
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError);
      setError(`Upload failed: ${uploadError.message}`);
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    setCompressionMetrics(null);
    setError(null);
    onImageUpload(null);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label">
        <span className="label-text font-medium">{label} (Optional)</span>
      </label>

      {error && (
        <div className="alert alert-error mb-4">
          <svg
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {preview ? (
        <div className="relative">
          <div className="w-32 h-32 mx-auto">
            <img
              src={preview}
              alt={`${getImageTypeLabel()} preview`}
              className={`w-full h-full object-cover border-4 border-base-300 ${
                uploadType === 'team' || uploadType === 'news' || uploadType === 'club'
                  ? 'rounded-lg'
                  : 'rounded-full'
              }`}
            />
          </div>

          {/* Compression Metrics */}
          {compressionMetrics && showCompressionMetrics && (
            <div className="mt-3 p-3 bg-base-200 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-base-content/60">Original</p>
                  <p className="font-semibold">
                    {formatBytes(compressionMetrics.originalSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Compressed</p>
                  <p className="font-semibold">
                    {formatBytes(compressionMetrics.compressedSize)}
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-base-300">
                <p className="text-xs text-base-content/60">Compression Ratio</p>
                <p className="font-semibold text-success">
                  {compressionMetrics.compressionRatio.toFixed(1)}% smaller
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-3">
            <label className="btn btn-sm btn-primary">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
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
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
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
          <label
            className={`w-32 h-32 border-2 border-dashed border-base-300 ${
              uploadType === 'team' || uploadType === 'news' || uploadType === 'club'
                ? 'rounded-lg'
                : 'rounded-full'
            } flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors`}
          >
            {uploadType === 'team' || uploadType === 'club' ? (
              <svg
                className="w-8 h-8 text-base-content/40 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            ) : uploadType === 'news' ? (
              <svg
                className="w-8 h-8 text-base-content/40 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-base-content/40 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
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
          <p className="text-xs text-center text-base-content/60 mt-2">
            PNG, JPG up to 10MB (will be compressed)
          </p>
        </div>
      )}

      {uploading && (
        <div className="mt-2">
          <progress className="progress progress-primary w-full"></progress>
          <p className="text-sm text-center mt-1">Uploading and compressing...</p>
        </div>
      )}
    </div>
  );
}
