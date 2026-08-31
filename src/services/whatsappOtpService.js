import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

/**
 * Generate a random 4-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP via WhatsApp using Firebase Function (which calls MSG91 API)
 * @param {string} phoneNumber - 10-digit phone number
 * @param {string} otp - 4-digit OTP
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendWhatsAppOTP = async (phoneNumber, otp) => {
  try {
    console.log('sendWhatsAppOTP called with:', { phoneNumber, otp });
    console.log('phoneNumber type:', typeof phoneNumber);
    console.log('otp type:', typeof otp);
    
    if (!phoneNumber || !otp) {
      console.error('Missing phoneNumber or otp:', { phoneNumber, otp });
      return { success: false, error: 'Phone number and OTP are required' };
    }
    
    const payload = { phoneNumber: String(phoneNumber), otp: String(otp) };
    console.log('Calling Firebase Function with payload:', payload);
    
    // Call the Firebase Function as an HTTP endpoint
    const functionUrl = 'https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendWhatsAppOtpHttp';
    
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
      return { success: false, error: result.message || 'Failed to send OTP' };
    }
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user's phone verification status in Firestore
 * @param {string} userId - User document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markPhoneAsVerified = async (userId) => {
  try {
    const userRef = doc(db, 'ccpl-users', userId);
    await updateDoc(userRef, {
      phoneVerified: true,
      verified: true,
      phoneVerifiedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating phone verification status:', error);
    return { success: false, error: error.message };
  }
};
