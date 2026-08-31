import { db } from '../utils/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import {
  uploadCCPLPlayerPhoto,
  uploadCCPLGovIdDocument,
  uploadCCPLResidencyDocument,
  uploadCCPLActionPhoto
} from '../utils/cloudinaryOptimized';

/**
 * Get active tournament ID from app settings
 */
const getActiveTournamentId = async () => {
  try {
    const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
    const appSettingsDoc = await getDoc(appSettingsRef);
    
    if (appSettingsDoc.exists()) {
      const settings = appSettingsDoc.data();
      return settings.activeTournamentId || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching active tournament ID:', error);
    return null;
  }
};

/**
 * Hash password using SHA-256
 */
const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

/**
 * Check if email already exists in ccpl-users collection
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - True if email exists, false otherwise
 */
export const checkEmailExists = async (email) => {
  try {
    const usersRef = collection(db, 'ccpl-users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { exists: false };
    }
    
    // Email exists, now check if payment has been completed
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    
    // Check registration subcollection for payment info
    const registrationRef = doc(db, 'ccpl-users', userId, 'registration', 'player-registration');
    const registrationDoc = await getDoc(registrationRef);
    
    if (registrationDoc.exists()) {
      const registrationData = registrationDoc.data();
      const hasPayment = registrationData.paymentInfo && registrationData.paymentInfo.paymentId;
      
      return {
        exists: true,
        userId: userId,
        hasPayment: hasPayment,
        message: hasPayment
          ? 'This email has already been used to complete registration.'
          : 'This email exists but registration is incomplete. You can continue.'
      };
    }
    
    // Email exists but no registration data yet
    return {
      exists: true,
      userId: userId,
      hasPayment: false,
      message: 'This email exists but registration is incomplete. You can continue.'
    };
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
};

/**
 * Upload file to Cloudinary based on file type
 * @param {File} file - The file to upload
 * @param {string} fileType - Type of file (govId, residency, playerPhoto, actionPhoto)
 * @returns {Promise<string>} - Cloudinary URL
 */
const uploadFileToCloudinary = async (file, fileType) => {
  console.log(`uploadFileToCloudinary called with fileType: ${fileType}`, file);
  
  if (!file) {
    console.log(`No file provided for ${fileType}`);
    return null;
  }
  
  if (typeof file === 'string') {
    // If file is already a URL string, return it
    console.log(`File is already a URL for ${fileType}:`, file);
    return file;
  }

  try {
    console.log(`Uploading ${fileType} to Cloudinary...`, file.name, file.type, file.size);
    let uploadResult;
    
    switch (fileType) {
      case 'govId':
        uploadResult = await uploadCCPLGovIdDocument(file);
        break;
      case 'residency':
        uploadResult = await uploadCCPLResidencyDocument(file);
        break;
      case 'playerPhoto':
        uploadResult = await uploadCCPLPlayerPhoto(file);
        break;
      case 'actionPhoto':
        uploadResult = await uploadCCPLActionPhoto(file);
        break;
      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }
    
    console.log(`Successfully uploaded ${fileType}:`, uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw error;
  }
};

/**
 * Save Step 1 data to ccpl-users collection
 * Creates the main user document
 */
export const saveStep1Data = async (formData) => {
  try {
    const { fullName, email, password, whatsapp } = formData;
    
    // Check if email already exists
    const emailCheck = await checkEmailExists(email);
    if (emailCheck.exists && emailCheck.hasPayment) {
      return {
        success: false,
        error: 'This email is already registered. Please use a different email or contact support if you believe this is an error.'
      };
    }
    
    // Hash the password
    const hashedPassword = hashPassword(password);
    
    // Get active tournament ID from app settings
    const activeTournamentId = await getActiveTournamentId();
    
    // Create user document in ccpl-users collection
    const userRef = doc(collection(db, 'ccpl-users'));
    const userId = userRef.id;
    
    const userData = {
      name: fullName,
      email: email,
      password: hashedPassword,
      phone: whatsapp,
      phoneVerified: false, // Will be set to true after OTP verification
      admin_verify: false, // Admin verification status - default false
      type: 'player', // CCPL player type
      verified: false, // Will be verified after registration review
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      otp: null,
      otpCreatedAt: null,
      picture: null,
      pushToken: null,
      pushTokenUpdatedAt: null,
      teamId: null,
      tournamentId: activeTournamentId,
    };
    
    await setDoc(userRef, userData);
    
    return { success: true, userId, userRef };
  } catch (error) {
    console.error('Error saving Step 1 data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save registration data (Steps 2-12) to registration subcollection
 */
export const saveRegistrationData = async (userId, stepNumber, stepData) => {
  try {
    const registrationRef = doc(db, 'ccpl-users', userId, 'registration', 'player-registration');
    
    // Get existing data or create new
    const updateData = {
      [`step${stepNumber}`]: stepData,
      [`step${stepNumber}CompletedAt`]: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };
    
    await setDoc(registrationRef, updateData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error(`Error saving Step ${stepNumber} data:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Save complete registration (all steps 2-12)
 */
export const saveCompleteRegistration = async (userId, formData) => {
  try {
    // Files should already be uploaded to Cloudinary during step completion
    // Just use the URLs from formData (they're already strings if uploaded)
    console.log('Preparing registration data with Cloudinary URLs...');
    
    const govIdFileUrl = formData.govIdFile || null;
    const residencyFileUrl = formData.residencyFile || null;
    const playerPhotoUrl = formData.playerPhoto || null;
    const actionPhotoUrl = formData.actionPhoto || null;
    
    console.log('File URLs:', {
      govIdFileUrl,
      residencyFileUrl,
      playerPhotoUrl,
      actionPhotoUrl
    });
    
    const registrationRef = doc(db, 'ccpl-users', userId, 'registration', 'player-registration');
    
    const registrationData = {
      // Step 2: Player Identity
      step2: {
        govIdType: formData.govIdType || '',
        govIdOther: formData.govIdOther || '',
        govIdNumber: formData.govIdNumber || '',
        govIdFile: govIdFileUrl || '',
      },
      
      // Step 3: CCPL Eligibility
      step3: {
        eligibilityRoute: formData.eligibilityRoute || '',
      },
      
      // Step 4: Residency Verification
      step4: {
        residing: formData.residing || '',
        residingSinceMonth: formData.residingSinceMonth || '',
        residingSinceYear: formData.residingSinceYear || '',
        residencyBasis: formData.residencyBasis || '',
        residencyBasisOther: formData.residencyBasisOther || '',
        residencyDocType: formData.residencyDocType || '',
        residencyFile: residencyFileUrl || '',
      },
      
      // Step 5: Pickleball Profile
      step5: {
        duprDoubles: formData.duprDoubles || '',
        duprSingles: formData.duprSingles || '',
        duprProfile: formData.duprProfile || '',
        discipline: formData.discipline || '',
        preference: formData.preference || '',
        yearsPlaying: formData.yearsPlaying || '',
        clubs: formData.clubs || '',
        previousLeagues: formData.previousLeagues || '',
        achievements: formData.achievements || '',
      },
      
      // Step 6: Player Bio
      step6: {
        bio: formData.bio || '',
        strengths: formData.strengths || '',
        playingStyle: formData.playingStyle || '',
        contribution: formData.contribution || '',
      },
      
      // Step 7: Availability & Commitment
      step7: {
        matchdays: formData.matchdays || {},
        matchdaysConfirmed: formData.matchdaysConfirmed || 0,
        postseasonDates: formData.postseasonDates || {},
        postseasonAvailability: formData.postseasonAvailability || '',
        availabilityDecl: formData.availabilityDecl || {},
      },
      
      // Step 8: Mandatory Team Practice
      step8: {
        practiceCommit: formData.practiceCommit || '',
        practiceDays: formData.practiceDays || {},
        practiceTimes: formData.practiceTimes || {},
        practiceRestrictions: formData.practiceRestrictions || '',
        practiceDecl: formData.practiceDecl || {},
      },
      
      // Step 9: Auction & Team Preference
      step9: {
        auctionUnderstand: formData.auctionUnderstand || false,
        preAuction: formData.preAuction || '',
        franchisePref: formData.franchisePref || '',
        franchisePrefOther: formData.franchisePrefOther || '',
      },
      
      // Step 10: Medical & Fitness
      step10: {
        medicalCondition: formData.medicalCondition || '',
        medicalDetails: formData.medicalDetails || '',
        medicallyFit: formData.medicallyFit || '',
        emergencyName: formData.emergencyName || '',
        emergencyRelationship: formData.emergencyRelationship || '',
        emergencyNumber: formData.emergencyNumber || '',
      },
      
      // Step 11: Player Photograph & Media
      step11: {
        playerPhoto: playerPhotoUrl || '',
        actionPhoto: actionPhotoUrl || '',
        mediaConsent: formData.mediaConsent || false,
      },
      
      // Step 12: Final Declaration
      step12: {
        finalDecl: formData.finalDecl || {},
      },
      
      // Payment Information
      paymentInfo: formData.paymentInfo || null,
      
      // Additional metadata
      submittedAt: serverTimestamp(),
      status: 'pending_review', // pending_review, approved, rejected
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    };
    
    await setDoc(registrationRef, registrationData);
    
    // Update main user document to mark registration as submitted
    const userRef = doc(db, 'ccpl-users', userId);
    await updateDoc(userRef, {
      registrationSubmitted: true,
      registrationSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving complete registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update Step 1 data in main user document
 */
export const updateStep1Data = async (userId, formData) => {
  try {
    const { displayName, dobDay, dobMonth, dobYear, gender, city, currentAddress, permanentAddress } = formData;
    
    const userRef = doc(db, 'ccpl-users', userId);
    
    const updateData = {
      displayName: displayName || null,
      dateOfBirth: dobDay && dobMonth && dobYear ? `${dobDay}/${dobMonth}/${dobYear}` : null,
      gender: gender || null,
      city: city || null,
      currentAddress: currentAddress || null,
      permanentAddress: permanentAddress || null,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating Step 1 data:', error);
    return { success: false, error: error.message };
  }
};
