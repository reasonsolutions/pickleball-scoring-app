import { db } from '../utils/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';

const CAREERS_COLLECTION = 'careers';
const APPLICATIONS_SUBCOLLECTION = 'applications';

/**
 * Create a new career/job listing
 * @param {Object} careerData - Job listing data
 * @returns {Promise<string>} - Document ID
 */
export const createCareer = async (careerData) => {
  try {
    const docRef = await addDoc(collection(db, CAREERS_COLLECTION), {
      ...careerData,
      status: careerData.status || 'open',
      applicationCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating career:', error);
    throw error;
  }
};

/**
 * Update an existing career/job listing
 * @param {string} careerId
 * @param {Object} updateData
 */
export const updateCareer = async (careerId, updateData) => {
  try {
    const docRef = doc(db, CAREERS_COLLECTION, careerId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating career:', error);
    throw error;
  }
};

/**
 * Delete a career/job listing
 * @param {string} careerId
 */
export const deleteCareer = async (careerId) => {
  try {
    await deleteDoc(doc(db, CAREERS_COLLECTION, careerId));
  } catch (error) {
    console.error('Error deleting career:', error);
    throw error;
  }
};

/**
 * Get all career listings (admin - includes closed/draft) with live application counts
 */
export const getAllCareers = async () => {
  try {
    const q = query(collection(db, CAREERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const careers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch live application counts for each career (admin-only read)
    const careersWithCounts = await Promise.all(
      careers.map(async (career) => {
        try {
          const countSnap = await getCountFromServer(
            collection(db, CAREERS_COLLECTION, career.id, APPLICATIONS_SUBCOLLECTION)
          );
          return { ...career, applicationCount: countSnap.data().count };
        } catch (countError) {
          console.warn('Could not fetch application count for', career.id, countError);
          return career;
        }
      })
    );

    return careersWithCounts;
  } catch (error) {
    console.error('Error fetching careers:', error);
    throw error;
  }
};

/**
 * Get all open (public) career listings
 */
export const getOpenCareers = async () => {
  try {
    const q = query(
      collection(db, CAREERS_COLLECTION),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching open careers:', error);
    // Fallback: fetch all and filter client-side in case index is missing
    try {
      const snapshot = await getDocs(collection(db, CAREERS_COLLECTION));
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.status === 'open')
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } catch (fallbackError) {
      console.error('Fallback fetch also failed:', fallbackError);
      throw error;
    }
  }
};

/**
 * Get a single career by ID
 * @param {string} careerId
 */
export const getCareerById = async (careerId) => {
  try {
    const docRef = doc(db, CAREERS_COLLECTION, careerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching career:', error);
    throw error;
  }
};

/**
 * Submit a job application for a career listing
 * @param {string} careerId
 * @param {Object} applicationData
 */
export const submitApplication = async (careerId, applicationData) => {
  try {
    const docRef = await addDoc(
      collection(db, CAREERS_COLLECTION, careerId, APPLICATIONS_SUBCOLLECTION),
      {
        ...applicationData,
        status: 'new',
        submittedAt: Timestamp.now()
      }
    );
    return docRef.id;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
};

/**
 * Get all applications for a career listing (admin only)
 * @param {string} careerId
 */
export const getApplicationsByCareer = async (careerId) => {
  try {
    const q = query(
      collection(db, CAREERS_COLLECTION, careerId, APPLICATIONS_SUBCOLLECTION),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

/**
 * Update application status (e.g., reviewed, shortlisted, rejected)
 * @param {string} careerId
 * @param {string} applicationId
 * @param {string} status
 */
export const updateApplicationStatus = async (careerId, applicationId, status) => {
  try {
    const docRef = doc(db, CAREERS_COLLECTION, careerId, APPLICATIONS_SUBCOLLECTION, applicationId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
};
