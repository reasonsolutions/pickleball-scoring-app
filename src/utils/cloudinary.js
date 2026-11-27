// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dchlpsvwh';
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

// Upload function for ads images/videos using unsigned upload
export const uploadAdsImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/ads');
  
  // Determine if it's a video or image
  const isVideo = file.type.startsWith('video/');
  const endpoint = isVideo ? 'video' : 'image';

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`,
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
      publicId: data.public_id, // Keep for backward compatibility
      resource_type: data.resource_type // 'video' or 'image'
    };
  } catch (error) {
    console.error('Error uploading ads file to Cloudinary:', error);
    throw error;
  }
};

// Upload function for jersey designs using unsigned upload
export const uploadJerseyDesign = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/jersey_designs');

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
    console.error('Error uploading jersey design to Cloudinary:', error);
    throw error;
  }
};

// Upload function for Aadhar documents using unsigned upload
export const uploadAadharDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/aadhar_documents');

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
    console.error('Error uploading Aadhar document to Cloudinary:', error);
    throw error;
  }
};

// Upload function for club owner images using unsigned upload
export const uploadClubOwnerImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/club_owners');

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
    console.error('Error uploading club owner image to Cloudinary:', error);
    throw error;
  }
};

// Upload function for shop product images using unsigned upload
export const uploadShopProductImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/shop_products');

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
      url: data.secure_url,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Error uploading shop product image to Cloudinary:', error);
    throw error;
  }
};

// Upload function for club logo using unsigned upload
export const uploadClubLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/club_logos');


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
    console.error('Error uploading club logo to Cloudinary:', error);
    throw error;
  }
};

// Upload function for vendor logo using unsigned upload
export const uploadVendorLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/vendor_logos');

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
    console.error('Error uploading vendor logo to Cloudinary:', error);
    throw error;
  }
};

// Upload function for match day images using unsigned upload
export const uploadMatchDayImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/matchdays');

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
    console.error('Error uploading match day image to Cloudinary:', error);
    throw error;
  }
};

// Upload function for vendor menu item images using unsigned upload
export const uploadVendorMenuItem = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/vendor_items');

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
    console.error('Error uploading vendor menu item to Cloudinary:', error);
    throw error;
  }
};

// Upload function for app sponsor logos using unsigned upload
export const uploadSponsorLogo = async (file, sectionKey = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `pickleball_app/sponsors/${sectionKey}`);

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
    console.error('Error uploading sponsor logo to Cloudinary:', error);
    throw error;
  }
};

// Upload function for career/job banner images using unsigned upload
export const uploadCareerImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/careers');

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
      url: data.secure_url,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Error uploading career image to Cloudinary:', error);
    throw error;
  }
};

// Upload function for job application resumes/documents (PDF, DOC, DOCX, images) using unsigned upload
export const uploadResumeDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'pickleball_app/career_applications');

  // Resumes are typically raw files (pdf/doc/docx) but may also be images
  const isImage = file.type.startsWith('image/');
  const endpoint = isImage ? 'image' : 'raw';

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary error:', data);

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
      url: data.secure_url,
      publicId: data.public_id,
      originalFilename: data.original_filename,
      format: data.format,
      resource_type: data.resource_type
    };
  } catch (error) {
    console.error('Error uploading resume/document to Cloudinary:', error);
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
          api_key: '177176766543861',
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
// Upload function for player action photos/videos using unsigned upload.
// Uses XHR so callers can show upload progress (videos can be large).
export const uploadPlayerActionMedia = (file, onProgress) => {
  const isVideo = file.type.startsWith('video/');
  const endpoint = isVideo ? 'video' : 'image';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `pickleball_app/players/action_${isVideo ? 'videos' : 'photos'}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Invalid response from Cloudinary'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        console.error('Cloudinary error:', data);
        if (data.error?.message?.includes('Upload preset not found')) {
          reject(new Error('Upload preset "player_photos" not found. Please create it in Cloudinary dashboard.'));
        } else {
          reject(new Error(data.error?.message || 'Upload failed'));
        }
        return;
      }

      resolve({
        secure_url: data.secure_url,
        public_id: data.public_id,
        url: data.secure_url,
        publicId: data.public_id,
        resource_type: data.resource_type,
        // Cloudinary serves a poster frame for videos by swapping the extension to .jpg
        thumbnailUrl: isVideo ? data.secure_url.replace(/\.[^/.]+$/, '.jpg') : null,
        duration: data.duration || null
      });
    };

    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'));
    xhr.send(formData);
  });
};
