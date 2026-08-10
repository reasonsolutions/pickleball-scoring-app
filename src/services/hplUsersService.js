/**
 * HPL Users Service
 * 
 * Service for managing hpl-users collection in Firestore
 * Fields: email, password, phone_number, photo_url
 * 
 * SECURITY WARNING: Storing passwords directly in Firestore is not recommended.
 * Consider using Firebase Authentication instead.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const COLLECTION_NAME = 'hpl-users';

/**
 * Create a new HPL user
 * @param {Object} userData - User data object
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password (should be hashed)
 * @param {string} userData.phone_number - User phone number
 * @param {string} userData.photo_url - User photo URL
 * @returns {Promise<string>} - Document ID of created user
 */
export const createHplUser = async (userData) => {
  try {
    const userDoc = {
      email: userData.email,
      password: userData.password, // Should be hashed before passing here
      phone_number: userData.phone_number || '',
      photo_url: userData.photo_url || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), userDoc);
    console.log('HPL user created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating HPL user:', error);
    throw error;
  }
};

/**
 * Get a single HPL user by ID
 * @param {string} userId - User document ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getHplUser = async (userId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No such user found');
      return null;
    }
  } catch (error) {
    console.error('Error getting HPL user:', error);
    throw error;
  }
};

/**
 * Get HPL user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getHplUserByEmail = async (email) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('email', '==', email),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting HPL user by email:', error);
    throw error;
  }
};

/**
 * Get all HPL users
 * @param {number} maxResults - Maximum number of results to return (default: 100)
 * @returns {Promise<Array>} - Array of user objects
 */
export const getAllHplUsers = async (maxResults = 100) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('created_at', 'desc'),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all HPL users:', error);
    throw error;
  }
};

/**
 * Update an HPL user
 * @param {string} userId - User document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateHplUser = async (userId, updates) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    });
    console.log('HPL user updated:', userId);
  } catch (error) {
    console.error('Error updating HPL user:', error);
    throw error;
  }
};

/**
 * Delete an HPL user
 * @param {string} userId - User document ID
 * @returns {Promise<void>}
 */
export const deleteHplUser = async (userId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await deleteDoc(docRef);
    console.log('HPL user deleted:', userId);
  } catch (error) {
    console.error('Error deleting HPL user:', error);
    throw error;
  }
};

/**
 * Search HPL users by phone number
 * @param {string} phoneNumber - Phone number to search
 * @returns {Promise<Array>} - Array of matching users
 */
export const searchHplUsersByPhone = async (phoneNumber) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('phone_number', '==', phoneNumber)
    );
    
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error searching HPL users by phone:', error);
    throw error;
  }
};

/**
 * Verify user credentials (basic example - use Firebase Auth in production)
 * @param {string} email - User email
 * @param {string} password - User password (should be hashed)
 * @returns {Promise<Object|null>} - User data if credentials match, null otherwise
 */
export const verifyHplUserCredentials = async (email, password) => {
  try {
    const user = await getHplUserByEmail(email);
    
    if (user && user.password === password) {
      // Remove password from returned object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying HPL user credentials:', error);
    throw error;
  }
};

export default {
  createHplUser,
  getHplUser,
  getHplUserByEmail,
  getAllHplUsers,
  updateHplUser,
  deleteHplUser,
  searchHplUsersByPhone,
  verifyHplUserCredentials
};
