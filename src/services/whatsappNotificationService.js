/**
 * Send player approval WhatsApp notification using Firebase Function (which calls MSG91 API)
 * @param {Array<string>} phoneNumbers - Array of phone numbers to send notifications to
 * @param {string} playerName - Name of the player (optional, defaults to "Player")
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPlayerApprovalNotification = async (phoneNumbers, playerName = 'Player') => {
  try {
    console.log('sendPlayerApprovalNotification called with:', { phoneNumbers, playerName });
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      console.error('Missing or invalid phoneNumbers:', phoneNumbers);
      return { success: false, error: 'Phone numbers array is required' };
    }
    
    const payload = { 
      phoneNumbers: phoneNumbers.map(phone => String(phone)), 
      playerName: String(playerName) 
    };
    console.log('Calling Firebase Function with payload:', payload);
    
    // Call the Firebase Function as an HTTP endpoint
    const functionUrl = 'https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendPlayerApprovalWhatsAppHttp';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('Firebase Function Response:', result);
    
    if (result.status === 'success') {
      return { success: true };
    } else {
      return { success: false, error: result.message || 'Failed to send approval notification' };
    }
  } catch (error) {
    console.error('Error sending WhatsApp approval notification:', error);
    return { success: false, error: error.message };
  }
};
