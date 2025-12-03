// Cloudinary Admin API functions
const CLOUDINARY_CLOUD_NAME = 'dnfcybtnn';
const CLOUDINARY_API_KEY = '286571998287272';
const CLOUDINARY_API_SECRET = '8vzJDzIyxf9S9WxqEH9Enegy26o';

// Generate signature for authenticated requests
const generateSignature = (params, apiSecret) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Note: In a real application, signature generation should be done on the server
  // This is for demonstration purposes only
  return btoa(sortedParams + apiSecret).slice(0, 40);
};

// List resources from LOGOS folder
export const listLogosFromCloudinary = async () => {
  const timestamp = Math.round(Date.now() / 1000);
  
  const params = {
    type: 'upload',
    prefix: 'LOGOS/', // This will list all resources in the LOGOS folder
    max_results: 100,
    timestamp: timestamp,
    api_key: CLOUDINARY_API_KEY
  };

  // Generate signature (Note: This should be done server-side in production)
  const signature = generateSignature(params, CLOUDINARY_API_SECRET);
  
  try {
    const formData = new FormData();
    Object.keys(params).forEach(key => {
      formData.append(key, params[key]);
    });
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Cloudinary Admin API error:', data);
      throw new Error(data.error?.message || 'Failed to fetch resources');
    }

    return data.resources.map(resource => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      createdAt: resource.created_at
    }));
  } catch (error) {
    console.error('Error fetching LOGOS from Cloudinary:', error);
    throw error;
  }
};

// Get specific logo by public ID
export const getLogoByPublicId = (publicId) => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
};

// Get optimized logo URL with transformations
export const getOptimizedLogoUrl = (publicId, options = {}) => {
  const {
    width = 200,
    height = 200,
    crop = 'fit',
    quality = 'auto',
    format = 'auto'
  } = options;

  const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};

// Search for logos by name/tag
export const searchLogos = async (searchTerm) => {
  const timestamp = Math.round(Date.now() / 1000);
  
  const params = {
    expression: `folder:LOGOS AND filename:*${searchTerm}*`,
    max_results: 50,
    timestamp: timestamp,
    api_key: CLOUDINARY_API_KEY
  };

  const signature = generateSignature(params, CLOUDINARY_API_SECRET);
  
  try {
    const formData = new FormData();
    Object.keys(params).forEach(key => {
      formData.append(key, params[key]);
    });
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/search`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Cloudinary search error:', data);
      throw new Error(data.error?.message || 'Search failed');
    }

    return data.resources.map(resource => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      createdAt: resource.created_at
    }));
  } catch (error) {
    console.error('Error searching logos in Cloudinary:', error);
    throw error;
  }
};