// Public Cloudinary functions that work without Admin API
const CLOUDINARY_CLOUD_NAME = 'dnfcybtnn';

// Generate Cloudinary URL for a resource
export const getCloudinaryUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = 'fit',
    quality = 'auto',
    format = 'auto',
    transformation = ''
  } = options;

  let transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (transformation) transformations.push(transformation);

  const transformString = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}${publicId}`;
};

// Common logo public IDs based on your assets folder
export const KNOWN_LOGOS = [
  'LOGOS/hpl_logo',
  'LOGOS/hpllogo',
  'LOGOS/hpllogo_white',
  'LOGOS/centrecourt_logo',
  'LOGOS/allstars',
  'LOGOS/bagel_brigade',
  'LOGOS/challenger',
  'LOGOS/dasos',
  'LOGOS/mavericks',
  'LOGOS/nandi',
  'LOGOS/naturals_white',
  'LOGOS/picklout_white',
  'LOGOS/raptors',
  'LOGOS/scuzi_white',
  'LOGOS/starrysmashers',
  'LOGOS/studio318',
  'LOGOS/teramor',
  'LOGOS/anvita_white',
  'LOGOS/keerthi',
  'LOGOS/keerthi_white',
  'LOGOS/vijaya_white',
  // Add more logo public IDs as needed
];

// Get all known logos with their URLs
export const getKnownLogos = () => {
  return KNOWN_LOGOS.map(publicId => ({
    publicId,
    name: publicId.split('/').pop(),
    url: getCloudinaryUrl(publicId),
    thumbnailUrl: getCloudinaryUrl(publicId, { width: 200, height: 200 }),
    optimizedUrl: getCloudinaryUrl(publicId, { width: 400, height: 400, quality: 'auto', format: 'auto' })
  }));
};

// Check if a logo exists by trying to load it
export const checkLogoExists = async (publicId) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = getCloudinaryUrl(publicId);
  });
};

// Batch check multiple logos
export const checkMultipleLogos = async (publicIds) => {
  const results = await Promise.all(
    publicIds.map(async (publicId) => {
      const exists = await checkLogoExists(publicId);
      return {
        publicId,
        exists,
        url: exists ? getCloudinaryUrl(publicId) : null
      };
    })
  );
  
  return results.filter(result => result.exists);
};

// Generate logo URLs for common patterns
export const generateLogoVariations = (baseName) => {
  const variations = [
    `LOGOS/${baseName}`,
    `LOGOS/${baseName}_logo`,
    `LOGOS/${baseName.toLowerCase()}`,
    `LOGOS/${baseName.toLowerCase()}_logo`,
    `LOGOS/${baseName.toUpperCase()}`,
    `LOGOS/${baseName.toUpperCase()}_LOGO`,
  ];
  
  return variations.map(publicId => ({
    publicId,
    url: getCloudinaryUrl(publicId),
    thumbnailUrl: getCloudinaryUrl(publicId, { width: 200, height: 200 })
  }));
};

// Upload a new logo to LOGOS folder (using existing upload function)
export const uploadLogoToFolder = async (file, fileName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'player_photos'); // Using existing preset
  formData.append('folder', 'LOGOS');
  formData.append('public_id', `LOGOS/${fileName}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
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
      publicId: data.public_id,
      url: data.secure_url,
      thumbnailUrl: getCloudinaryUrl(data.public_id, { width: 200, height: 200 })
    };
  } catch (error) {
    console.error('Error uploading logo to Cloudinary:', error);
    throw error;
  }
};