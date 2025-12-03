// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dnfcybtnn';
const UPLOAD_PRESET = 'player_photos'; // You need to create this preset in Cloudinary

// Upload function for player photos using unsigned upload
export const uploadPlayerPhoto = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/players');

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
      console.error('Cloudinary error:', data);
      
      // Provide specific error messages
      if (data.error?.message?.includes('Upload preset not found')) {
        throw new Error('Upload preset "player_photos" not found. Please create it in Cloudinary dashboard.');
      } else if (data.error?.message?.includes('Invalid')) {
        throw new Error('Invalid upload configuration. Please check Cloudinary settings.');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.secure_url, // Keep for backward compatibility
      publicId: data.public_id // Keep for backward compatibility
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Upload function for team logos using unsigned upload
export const uploadTeamLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/team_logos');

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
      console.error('Cloudinary error:', data);
      
      // Provide specific error messages
      if (data.error?.message?.includes('Upload preset not found')) {
        throw new Error('Upload preset "player_photos" not found. Please create it in Cloudinary dashboard.');
      } else if (data.error?.message?.includes('Invalid')) {
        throw new Error('Invalid upload configuration. Please check Cloudinary settings.');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.secure_url, // Keep for backward compatibility
      publicId: data.public_id // Keep for backward compatibility
    };
  } catch (error) {
    console.error('Error uploading team logo to Cloudinary:', error);
    throw error;
  }
};

// Upload function for news featured images using unsigned upload
export const uploadNewsImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/news');

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
      console.error('Cloudinary error:', data);
      
      // Provide specific error messages
      if (data.error?.message?.includes('Upload preset not found')) {
        throw new Error('Upload preset "player_photos" not found. Please create it in Cloudinary dashboard.');
      } else if (data.error?.message?.includes('Invalid')) {
        throw new Error('Invalid upload configuration. Please check Cloudinary settings.');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.secure_url, // Keep for backward compatibility
      publicId: data.public_id // Keep for backward compatibility
    };
  } catch (error) {
    console.error('Error uploading news image to Cloudinary:', error);
    throw error;
  }
};

// Upload function for ads images using unsigned upload
export const uploadAdsImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/ads');

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
      console.error('Cloudinary error:', data);
      
      // Provide specific error messages
      if (data.error?.message?.includes('Upload preset not found')) {
        throw new Error('Upload preset "player_photos" not found. Please create it in Cloudinary dashboard.');
      } else if (data.error?.message?.includes('Invalid')) {
        throw new Error('Invalid upload configuration. Please check Cloudinary settings.');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.secure_url, // Keep for backward compatibility
      publicId: data.public_id // Keep for backward compatibility
    };
  } catch (error) {
    console.error('Error uploading ads image to Cloudinary:', error);
    throw error;
  }
};

// Delete function for player photos
export const deletePlayerPhoto = async (publicId) => {
  try {
    // Note: For security, deletion should ideally be done from backend
    // This is a simplified version for demo purposes
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: '286571998287272',
          timestamp: Math.round(Date.now() / 1000),
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};