import { db } from '../utils/firebase';
import {
  collection,
  addDoc,
  Timestamp
} from 'firebase/firestore';

const SUPPORT_REQUESTS_COLLECTION = 'support-requests';

/**
 * Submit a support request
 * @param {Object} requestData - { name, email, phone, reason, message }
 * @returns {Promise<string>} - Document ID
 */
export const submitSupportRequest = async (requestData) => {
  try {
    const docRef = await addDoc(collection(db, SUPPORT_REQUESTS_COLLECTION), {
      ...requestData,
      status: 'new',
      submittedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting support request:', error);
    throw error;
  }
};
