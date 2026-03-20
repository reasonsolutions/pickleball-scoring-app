// Optimized Cloudinary configuration to minimize credit usage
// Based on: https://cloudinary.com/documentation/developer_onboarding_faq_credits

const CLOUDINARY_CLOUD_NAME = 'dchlpsvwh';
const UPLOAD_PRESET = 'player_photos';

// ============================================================================
// CREDIT OPTIMIZATION STRATEGIES
// ============================================================================
// 1. Image Compression: Reduce file sizes before upload (saves storage credits)
// 2. Transformations: Use URL-based transformations instead of storing variants
// 3. Caching: Leverage browser and CDN caching to avoid re-uploads
// 4. Format Optimization: Use auto format selection (WebP, AVIF)
// 5. Quality Settings: Use 'auto' quality to balance size and appearance
// 6. Responsive Images: Serve appropriately sized images for different devices

/**
 * Compress image client-side before uploading to Cloudinary
 * This is the MOST IMPORTANT optimization - reduces storage and bandwidth credits
 * 
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImageBeforeUpload = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeKB = 500
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            // If still too large, reduce quality further
            if (blob.size > maxSizeKB * 1024) {
              const reducedQuality = quality * 0.7;
              canvas.toBlob(
                (reducedBlob) => resolve(reducedBlob),
                'image/jpeg',
                reducedQuality
              );
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Generate optimized Cloudinary URL with transformations
 * This avoids storing multiple variants - transformations are applied on-the-fly
 * 
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = null,
    height = null,
    crop = 'auto',
    quality = 'auto:eco', // 'auto:eco' analyzes image and picks best quality with eco compression
    format = 'auto', // 'auto' serves WebP/AVIF to modern browsers
    dpr = 'auto', // Device pixel ratio
    gravity = 'auto', // Smart cropping
    fetchFormat = 'auto'
  } = options;

  const transformations = [];

  // Add width/height transformations
  if (width || height) {
    const transform = [];
    if (width) transform.push(`w_${width}`);
    if (height) transform.push(`h_${height}`);
    transform.push(`c_${crop}`);
    transformations.push(transform.join(','));
  }

  // Add quality and format optimization
  transformations.push(`q_${quality},f_${format}`);

  // Add device pixel ratio for responsive images
  if (dpr) {
    transformations.push(`dpr_${dpr}`);
  }

  const transformationString = transformations.join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
};

/**
 * Get responsive image URLs for different screen sizes
 * Reduces bandwidth by serving appropriately sized images
 * 
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Configuration options
 * @returns {Object} - Object with srcset and sizes for responsive images
 */
export const getResponsiveImageUrls = (publicId, options = {}) => {
  const {
    crop = 'auto',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Define breakpoints for responsive images
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
 * Upload image with client-side compression
 * This is the primary upload function that should be used
 * 
 * @param {File} file - The image file to upload
 * @param {string} folder - Cloudinary folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with optimized URLs
 */
export const uploadImageOptimized = async (file, folder, options = {}) => {
  const {
    compressionQuality = 0.8,
    maxWidth = 1920,
    maxHeight = 1920,
    maxSizeKB = 500
  } = options;

  try {
    // Step 1: Compress image client-side (CRITICAL for credit savings)
    console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);
    
    const compressedBlob = await compressImageBeforeUpload(file, {
      quality: compressionQuality,
      maxWidth,
      maxHeight,
      maxSizeKB
    });

    console.log(`Compressed file size: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
    console.log(`Compression ratio: ${((1 - compressedBlob.size / file.size) * 100).toFixed(1)}%`);

    // Step 2: Create FormData with compressed image
    const formData = new FormData();
    formData.append('file', compressedBlob, file.name);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    
    // Add tags for better organization and management
    formData.append('tags', 'optimized,compressed');
    
    // Enable eager transformations to pre-generate common sizes
    // This is optional and depends on your usage patterns
    // formData.append('eager', 'w_400,h_400,c_fill|w_800,h_800,c_fill');

    // Step 3: Upload to Cloudinary
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

    // Step 4: Return optimized URLs
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.secure_url,
      publicId: data.public_id,
      // Include optimized URL generators for different use cases
      getOptimizedUrl: (opts) => getOptimizedImageUrl(data.public_id, opts),
      getResponsiveUrls: (opts) => getResponsiveImageUrls(data.public_id, opts),
      // Metadata for monitoring
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      compressionRatio: (1 - compressedBlob.size / file.size) * 100
    };
  } catch (error) {
    console.error('Error uploading optimized image:', error);
    throw error;
  }
};

/**
 * Upload player photo with optimization
 */
export const uploadPlayerPhotoOptimized = async (file) => {
  return uploadImageOptimized(file, 'pickleball_app/players', {
    compressionQuality: 0.85,
    maxWidth: 1200,
    maxHeight: 1200,
    maxSizeKB: 400
  });
};

/**
 * Upload team logo with optimization
 */
export const uploadTeamLogoOptimized = async (file) => {
  return uploadImageOptimized(file, 'pickleball_app/team_logos', {
    compressionQuality: 0.9,
    maxWidth: 800,
    maxHeight: 800,
    maxSizeKB: 300
  });
};

/**
 * Upload news image with optimization
 */
export const uploadNewsImageOptimized = async (file) => {
  return uploadImageOptimized(file, 'pickleball_app/news', {
    compressionQuality: 0.8,
    maxWidth: 1600,
    maxHeight: 1200,
    maxSizeKB: 500
  });
};

/**
 * Upload club logo with optimization
 */
export const uploadClubLogoOptimized = async (file) => {
  return uploadImageOptimized(file, 'pickleball_app/club_logos', {
    compressionQuality: 0.9,
    maxWidth: 800,
    maxHeight: 800,
    maxSizeKB: 300
  });
};

/**
 * Generate thumbnail URL (for list views, etc.)
 * Reduces bandwidth by serving smaller images
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
 * Generate avatar URL (for profile pictures)
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
 * Generate banner/hero image URL
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
  compressImageBeforeUpload,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  uploadImageOptimized,
  uploadPlayerPhotoOptimized,
  uploadTeamLogoOptimized,
  uploadNewsImageOptimized,
  uploadClubLogoOptimized,
  getThumbnailUrl,
  getAvatarUrl,
  getBannerUrl
};
