/**
 * Image Optimization Helper
 * Automatically converts Cloudinary URLs to optimized versions
 * Supports multiple Cloudinary accounts
 * Reduces bandwidth by 30-50% without changing code in components
 */

/**
 * Check if URL is a Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return typeof url === 'string' && url.includes('cloudinary.com');
};

/**
 * Extract cloud name from Cloudinary URL
 * Handles URLs from any Cloudinary account
 */
export const extractCloudNameFromUrl = (url) => {
  if (!url || !isCloudinaryUrl(url)) return null;
  
  try {
    // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/...
    const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting cloud name:', error);
    return null;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * Handles both secure_url and regular URLs from any account
 * Preserves version parameter if present
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || !isCloudinaryUrl(url)) return null;
  
  try {
    // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/[v123]/[transformations]/[public_id]
    // or: https://res.cloudinary.com/[cloud_name]/image/upload/[transformations]/[public_id]
    
    // Extract everything after /upload/
    const uploadMatch = url.match(/\/upload\/(.+?)(?:\?|$)/);
    if (!uploadMatch) return null;
    
    const afterUpload = uploadMatch[1];
    const parts = afterUpload.split('/');
    
    // Find the public ID (last part before query string)
    let publicId = parts[parts.length - 1];
    
    // If there's a version parameter (v123), include it
    if (parts.length > 1 && parts[0].startsWith('v')) {
      // Include version in public ID: v123/folder/filename
      publicId = parts.slice(0, parts.length - 1).join('/') + '/' + publicId;
    }
    
    return publicId || null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Convert any Cloudinary URL to optimized version
 * Automatically applies transformations for bandwidth savings
 * Works with any Cloudinary account
 *
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized URL
 */
export const optimizeCloudinaryUrl = (url, options = {}) => {
  if (!isCloudinaryUrl(url)) return url;

  const {
    width = null,
    height = null,
    crop = 'auto',
    quality = 'auto',
    format = 'auto',
    dpr = 'auto',
    gravity = 'auto'
  } = options;

  // Extract cloud name from URL (supports multiple accounts)
  const cloudName = extractCloudNameFromUrl(url);
  if (!cloudName) return url;

  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return url;

  const transformations = [];

  // Add width/height/crop/gravity transformations
  if (width || height || gravity !== 'auto') {
    const transform = [];
    if (width) transform.push(`w_${width}`);
    if (height) transform.push(`h_${height}`);
    if (gravity && gravity !== 'auto') transform.push(`g_${gravity}`);
    transform.push(`c_${crop}`);
    transformations.push(transform.join(','));
  }

  // Add quality and format optimization (CRITICAL for bandwidth savings)
  transformations.push(`q_${quality},f_${format}`);

  // Add device pixel ratio for responsive images
  if (dpr && dpr !== 'auto') {
    transformations.push(`dpr_${dpr}`);
  }

  const transformationString = transformations.join('/');
  // Use the cloud name from the original URL to support multiple accounts
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
};

/**
 * Get optimized URL for different image types
 * Pre-configured for common use cases
 */
export const getOptimizedUrlByType = (url, imageType = 'default') => {
  if (!isCloudinaryUrl(url)) return url;

  const presets = {
    // Thumbnails for lists (small, highly compressed)
    thumbnail: { width: 200, height: 200, crop: 'fill', quality: 'auto:eco', format: 'auto' },
    
    // Avatar/profile pictures (circular, face-focused) - use q_auto:eco for aggressive compression
    avatar: { width: 150, height: 150, crop: 'thumb', gravity: 'face', quality: 'auto:eco', format: 'auto' },
    
    // Team/club logos (maintain aspect ratio)
    logo: { width: 260, height: 104, crop: 'fit', quality: 'auto:eco', format: 'auto' },
    
    // Small logo (sidebar, navbar)
    logoSmall: { width: 80, height: 80, crop: 'fit', quality: 'auto:eco', format: 'auto' },
    
    // Player photos (medium size) - use q_auto:eco for aggressive compression
    playerPhoto: { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:eco', format: 'auto' },
    
    // Featured images (news, articles) - use q_auto:eco for aggressive compression
    featured: { width: 1200, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    
    // Featured image small (card view)
    featuredSmall: { width: 600, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    
    // Banner/hero images
    banner: { width: 1920, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    
    // Background images (full width)
    background: { width: 1920, height: 1080, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    
    // Default (aggressive compression)
    default: { quality: 'auto:eco', format: 'auto' }
  };

  const preset = presets[imageType] || presets.default;
  return optimizeCloudinaryUrl(url, preset);
};

/**
 * Get responsive image URLs for srcset
 * Serves different sizes for different screen sizes
 */
export const getResponsiveCloudinaryUrl = (url, imageType = 'default') => {
  if (!isCloudinaryUrl(url)) return { srcset: url, sizes: '100vw' };

  const breakpoints = {
    thumbnail: [
      { width: 100, descriptor: '100w' },
      { width: 200, descriptor: '200w' },
      { width: 300, descriptor: '300w' }
    ],
    avatar: [
      { width: 100, descriptor: '100w' },
      { width: 150, descriptor: '150w' },
      { width: 200, descriptor: '200w' }
    ],
    logo: [
      { width: 130, descriptor: '130w' },
      { width: 260, descriptor: '260w' },
      { width: 390, descriptor: '390w' }
    ],
    playerPhoto: [
      { width: 200, descriptor: '200w' },
      { width: 400, descriptor: '400w' },
      { width: 600, descriptor: '600w' }
    ],
    featured: [
      { width: 600, descriptor: '600w' },
      { width: 1200, descriptor: '1200w' },
      { width: 1800, descriptor: '1800w' }
    ],
    featuredSmall: [
      { width: 300, descriptor: '300w' },
      { width: 600, descriptor: '600w' },
      { width: 900, descriptor: '900w' }
    ],
    banner: [
      { width: 960, descriptor: '960w' },
      { width: 1440, descriptor: '1440w' },
      { width: 1920, descriptor: '1920w' }
    ],
    background: [
      { width: 960, descriptor: '960w' },
      { width: 1440, descriptor: '1440w' },
      { width: 1920, descriptor: '1920w' }
    ],
    default: [
      { width: 320, descriptor: '320w' },
      { width: 640, descriptor: '640w' },
      { width: 960, descriptor: '960w' },
      { width: 1280, descriptor: '1280w' }
    ]
  };

  const preset = breakpoints[imageType] || breakpoints.default;
  const presetOptions = {
    thumbnail: { width: null, height: null, crop: 'fill', quality: 'auto:eco', format: 'auto' },
    avatar: { width: null, height: null, crop: 'thumb', gravity: 'face', quality: 'auto:eco', format: 'auto' },
    logo: { width: null, height: 104, crop: 'fit', quality: 'auto:eco', format: 'auto' },
    playerPhoto: { width: null, height: null, crop: 'fill', gravity: 'face', quality: 'auto:eco', format: 'auto' },
    featured: { width: null, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    featuredSmall: { width: null, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    banner: { width: null, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    background: { width: null, height: 1080, crop: 'fill', gravity: 'auto', quality: 'auto:eco', format: 'auto' },
    default: { quality: 'auto:eco', format: 'auto' }
  };

  const options = presetOptions[imageType] || presetOptions.default;

  const srcset = preset
    .map(bp => {
      const opts = { ...options, width: bp.width };
      const optimizedUrl = optimizeCloudinaryUrl(url, opts);
      return `${optimizedUrl} ${bp.descriptor}`;
    })
    .join(', ');

  const sizes = {
    thumbnail: '(max-width: 640px) 100px, (max-width: 1024px) 150px, 200px',
    avatar: '(max-width: 640px) 80px, (max-width: 1024px) 120px, 150px',
    logo: '(max-width: 640px) 130px, (max-width: 1024px) 200px, 260px',
    playerPhoto: '(max-width: 640px) 200px, (max-width: 1024px) 300px, 400px',
    featured: '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px',
    featuredSmall: '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px',
    banner: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px',
    background: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px',
    default: '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1280px'
  };

  return {
    srcset,
    sizes: sizes[imageType] || sizes.default
  };
};

export default {
  isCloudinaryUrl,
  extractPublicIdFromUrl,
  optimizeCloudinaryUrl,
  getOptimizedUrlByType,
  getResponsiveCloudinaryUrl
};
