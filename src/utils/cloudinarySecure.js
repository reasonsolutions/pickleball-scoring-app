/**
 * Secure Cloudinary Configuration
 * 
 * This module uses ONLY environment variables for configuration.
 * NO credentials are hardcoded.
 * 
 * Required environment variables in .env.local:
 * - VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 * - VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

// Get configuration from environment variables only
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Validate configuration
if (!CLOUDINARY_CLOUD_NAME) {
  console.error('Missing VITE_CLOUDINARY_CLOUD_NAME environment variable');
}
if (!UPLOAD_PRESET) {
  console.error('Missing VITE_CLOUDINARY_UPLOAD_PRESET environment variable');
}

/**
 * Upload image using unsigned upload (client-side safe)
 * 
 * @param {File} file - The image file to upload
 * @param {string} folder - Cloudinary folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
export const uploadImageSecure = async (file, folder, options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing. Check environment variables.');
  }

  const {
    tags = 'optimized,compressed'
  } = options;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('tags', tags);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
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
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload player photo
 */
export const uploadPlayerPhoto = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/players', {
    tags: 'player,photo,optimized'
  });
};

/**
 * Upload team logo
 */
export const uploadTeamLogo = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/team_logos', {
    tags: 'team,logo,optimized'
  });
};

/**
 * Upload news image
 */
export const uploadNewsImage = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/news', {
    tags: 'news,image,optimized'
  });
};

/**
 * Upload club logo
 */
export const uploadClubLogo = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/club_logos', {
    tags: 'club,logo,optimized'
  });
};

/**
 * Upload club owner image
 */
export const uploadClubOwnerImage = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/club_owners', {
    tags: 'club,owner,photo,optimized'
  });
};

/**
 * Upload Aadhar document
 */
export const uploadAadharDocument = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/aadhar_documents', {
    tags: 'aadhar,document,optimized'
  });
};

/**
 * Upload jersey design
 */
export const uploadJerseyDesign = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/jersey_designs', {
    tags: 'jersey,design,optimized'
  });
};

/**
 * Upload ads image
 */
export const uploadAdsImage = async (file) => {
  return uploadImageSecure(file, 'pickleball_app/ads', {
    tags: 'ads,image,optimized'
  });
};

/**
 * Generate optimized image URL with transformations
 * 
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary configuration is missing');
  }

  const {
    width = null,
    height = null,
    crop = 'auto',
    quality = 'auto:eco',
    format = 'auto',
    dpr = 'auto',
    gravity = 'auto'
  } = options;

  const transformations = [];

  if (width || height) {
    const transform = [];
    if (width) transform.push(`w_${width}`);
    if (height) transform.push(`h_${height}`);
    transform.push(`c_${crop}`);
    transformations.push(transform.join(','));
  }

  transformations.push(`q_${quality},f_${format}`);

  if (dpr) {
    transformations.push(`dpr_${dpr}`);
  }

  const transformationString = transformations.join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
};

/**
 * Get responsive image URLs
 */
export const getResponsiveImageUrls = (publicId, options = {}) => {
  const {
    crop = 'auto',
    quality = 'auto',
    format = 'auto'
  } = options;

  const breakpoints = [
    { width: 320, descriptor: '320w' },
    { width: 640, descriptor: '640w' },
    { width: 960, descriptor: '960w' },
    { width: 1280, descriptor: '1280w' }
  ];

  const srcset = breakpoints
    .map(bp => {
      const url = getOptimizedImageUrl(publicId, {
        width: bp.width,
        crop,
        quality,
        format
      });
      return `${url} ${bp.descriptor}`;
    })
    .join(', ');

  const sizes = '(max-width: 640px) 100vw, (max-width: 960px) 80vw, 1280px';

  return { srcset, sizes };
};

/**
 * Get thumbnail URL
 */
export const getThumbnailUrl = (publicId, size = 200) => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
};

/**
 * Get avatar URL
 */
export const getAvatarUrl = (publicId, size = 150) => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'face',
    quality: 'auto',
    format: 'auto'
  });
};

/**
 * Get banner URL
 */
export const getBannerUrl = (publicId, width = 1920, height = 400) => {
  return getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  });
};

export default {
  uploadImageSecure,
  uploadPlayerPhoto,
  uploadTeamLogo,
  uploadNewsImage,
  uploadClubLogo,
  uploadClubOwnerImage,
  uploadAadharDocument,
  uploadJerseyDesign,
  uploadAdsImage,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  getThumbnailUrl,
  getAvatarUrl,
  getBannerUrl
};
