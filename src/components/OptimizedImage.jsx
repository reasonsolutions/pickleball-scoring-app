import React, { useState } from 'react';
import { getOptimizedUrlByType, getResponsiveCloudinaryUrl, isCloudinaryUrl } from '../utils/imageOptimizationHelper';

/**
 * OptimizedImage Component
 *
 * Automatically optimizes Cloudinary image URLs to reduce bandwidth
 * Replaces standard <img> tags with automatic optimization
 * Works with both Cloudinary and non-Cloudinary URLs
 *
 * Usage:
 * <OptimizedImage
 *   src={imageUrl}
 *   alt="Description"
 *   type="logo"  // thumbnail, avatar, logo, playerPhoto, featured, banner, etc.
 *   responsive={true}
 * />
 */
export default function OptimizedImage({
  src,
  alt = '',
  type = 'default',
  responsive = false,
  className = '',
  style = {},
  onError = null,
  loading = 'lazy',
  ...props
}) {
  const [error, setError] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);

  // Check if URL is from Cloudinary
  const isCloudinary = isCloudinaryUrl(src);

  // If not a Cloudinary URL, use original URL as-is
  if (!isCloudinary) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        onError={(e) => {
          setError(true);
          onError?.(e);
        }}
        {...props}
      />
    );
  }

  // Get optimized URL for Cloudinary images
  const optimizedSrc = getOptimizedUrlByType(src, type);

  // Get responsive URLs if enabled
  const responsiveProps = responsive
    ? getResponsiveCloudinaryUrl(src, type)
    : {};

  const handleError = (e) => {
    // Fallback to original URL if optimized version fails
    if (!useOriginal) {
      console.warn('Optimized image failed to load, falling back to original:', src);
      setUseOriginal(true);
    } else {
      console.error('Image failed to load:', src);
      setError(true);
      onError?.(e);
    }
  };

  // Use optimized URL by default, fallback to original if it fails
  const finalSrc = useOriginal ? src : optimizedSrc;

  return (
    <img
      src={finalSrc}
      srcSet={responsiveProps.srcset}
      sizes={responsiveProps.sizes}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
      {...props}
    />
  );
}
