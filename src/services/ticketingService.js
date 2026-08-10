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
  writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

const TICKETING_COLLECTION = 'ticketing';
const TICKET_TYPES_SUBCOLLECTION = 'ticketTypes';
const TICKETS_SUBCOLLECTION = 'tickets';
const APP_SETTINGS_DOC = 'app-settings/mobile-app';

// Secret key for encryption (in production, store in environment variables)
const ENCRYPTION_KEY = 'pickleball-ticket-secret-key-2026';

/**
 * Encrypt ticket data for QR code
 * @param {Object} data - Ticket data to encrypt
 * @returns {string} - Encrypted string
 */
const encryptTicketData = (data) => {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
};

/**
 * Decrypt ticket data from QR code
 * @param {string} encryptedData - Encrypted ticket data
 * @returns {Object} - Decrypted ticket data
 */
export const decryptTicketData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error decrypting ticket data:', error);
    return null;
  }
};

/**
 * Get the active tournament ID from app settings
 * @returns {Promise<string|null>} - Active tournament ID
 */
export const getActiveTournamentId = async () => {
  try {
    const appSettingsRef = doc(db, 'app-settings', 'mobile-app');
    const appSettingsDoc = await getDoc(appSettingsRef);
    
    if (appSettingsDoc.exists()) {
      const settings = appSettingsDoc.data();
      return settings.activeTournamentId || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching active tournament:', error);
    throw error;
  }
};

/**
 * Create a new match day with ticket types in subcollection
 * @param {Object} matchDayData - Match day data (without ticketTypes array)
 * @param {Array} ticketTypes - Array of ticket type objects
 * @returns {Promise<string>} - Document ID
 */
export const createMatchDay = async (matchDayData, ticketTypes = []) => {
  try {
    const tournamentId = await getActiveTournamentId();
    
    if (!tournamentId) {
      throw new Error('No active tournament selected. Please select a tournament in App Settings.');
    }

    // Remove ticketTypes from matchDayData if it exists
    const { ticketTypes: _, ...mainData } = matchDayData;

    // Calculate totals
    const totalTickets = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity) || 0), 0);

    // Create main match day document
    const docRef = await addDoc(collection(db, TICKETING_COLLECTION), {
      ...mainData,
      tournamentId,
      status: 'active',
      totalTickets,
      soldTickets: 0,
      revenue: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Add ticket types to subcollection
    const batch = writeBatch(db);
    ticketTypes.forEach((ticketType) => {
      const ticketTypeRef = doc(collection(db, TICKETING_COLLECTION, docRef.id, TICKET_TYPES_SUBCOLLECTION));
      batch.set(ticketTypeRef, {
        name: ticketType.name,
        price: parseFloat(ticketType.price),
        quantity: parseInt(ticketType.quantity),
        sold: 0,
        available: parseInt(ticketType.quantity),
        createdAt: Timestamp.now()
      });
    });
    
    await batch.commit();
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating match day:', error);
    throw error;
  }
};

/**
 * Get all match days for the active tournament with ticket types
 * @returns {Promise<Array>} - Array of match days with ticket types
 */
export const getAllMatchDays = async () => {
  try {
    const tournamentId = await getActiveTournamentId();
    
    if (!tournamentId) {
      return [];
    }

    const q = query(
      collection(db, TICKETING_COLLECTION),
      where('tournamentId', '==', tournamentId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    // Fetch ticket types for each match day
    const matchDaysWithTickets = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const matchDayData = {
          id: docSnap.id,
          ...docSnap.data()
        };
        
        // Fetch ticket types from subcollection
        const ticketTypesSnapshot = await getDocs(
          collection(db, TICKETING_COLLECTION, docSnap.id, TICKET_TYPES_SUBCOLLECTION)
        );
        
        matchDayData.ticketTypes = ticketTypesSnapshot.docs.map(ttDoc => ({
          id: ttDoc.id,
          ...ttDoc.data()
        }));
        
        return matchDayData;
      })
    );
    
    return matchDaysWithTickets;
  } catch (error) {
    console.error('Error fetching match days:', error);
    throw error;
  }
};

/**
 * Get a single match day by ID with ticket types
 * @param {string} matchDayId - Match day ID
 * @returns {Promise<Object>} - Match day data with ticket types
 */
export const getMatchDayById = async (matchDayId) => {
  try {
    const docRef = doc(db, TICKETING_COLLECTION, matchDayId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const matchDayData = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      // Fetch ticket types from subcollection
      const ticketTypesSnapshot = await getDocs(
        collection(db, TICKETING_COLLECTION, matchDayId, TICKET_TYPES_SUBCOLLECTION)
      );
      
      matchDayData.ticketTypes = ticketTypesSnapshot.docs.map(ttDoc => ({
        id: ttDoc.id,
        ...ttDoc.data()
      }));
      
      return matchDayData;
    } else {
      throw new Error('Match day not found');
    }
  } catch (error) {
    console.error('Error fetching match day:', error);
    throw error;
  }
};

/**
 * Update a match day and its ticket types
 * @param {string} matchDayId - Match day ID
 * @param {Object} updateData - Data to update (without ticketTypes)
 * @param {Array} ticketTypes - Array of ticket type objects
 * @returns {Promise<void>}
 */
export const updateMatchDay = async (matchDayId, updateData, ticketTypes = []) => {
  try {
    // Remove ticketTypes from updateData if it exists
    const { ticketTypes: _, ...mainData } = updateData;

    // Calculate totals
    const totalTickets = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity) || 0), 0);

    // Update main match day document
    const docRef = doc(db, TICKETING_COLLECTION, matchDayId);
    await updateDoc(docRef, {
      ...mainData,
      totalTickets,
      updatedAt: Timestamp.now()
    });

    // Delete existing ticket types
    const existingTicketTypesSnapshot = await getDocs(
      collection(db, TICKETING_COLLECTION, matchDayId, TICKET_TYPES_SUBCOLLECTION)
    );
    
    const batch = writeBatch(db);
    existingTicketTypesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Add updated ticket types
    ticketTypes.forEach((ticketType) => {
      const ticketTypeRef = doc(collection(db, TICKETING_COLLECTION, matchDayId, TICKET_TYPES_SUBCOLLECTION));
      batch.set(ticketTypeRef, {
        name: ticketType.name,
        price: parseFloat(ticketType.price),
        quantity: parseInt(ticketType.quantity),
        sold: ticketType.sold || 0,
        available: parseInt(ticketType.quantity) - (ticketType.sold || 0),
        createdAt: ticketType.createdAt || Timestamp.now()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating match day:', error);
    throw error;
  }
};

/**
 * Delete a match day and all its subcollections
 * @param {string} matchDayId - Match day ID
 * @returns {Promise<void>}
 */
export const deleteMatchDay = async (matchDayId) => {
  try {
    // Delete all ticket types in subcollection
    const ticketTypesSnapshot = await getDocs(
      collection(db, TICKETING_COLLECTION, matchDayId, TICKET_TYPES_SUBCOLLECTION)
    );
    
    const batch = writeBatch(db);
    ticketTypesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete main match day document
    const docRef = doc(db, TICKETING_COLLECTION, matchDayId);
    batch.delete(docRef);
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting match day:', error);
    throw error;
  }
};

/**
 * Create a ticket order
 * @param {string} matchDayId - Match day ID
 * @param {Object} orderData - Order data
 * @returns {Promise<string>} - Order ID
 */
export const createOrder = async (matchDayId, orderData) => {
  try {
    const batch = writeBatch(db);
    
    // Create order in subcollection
    const orderRef = doc(collection(db, TICKETING_COLLECTION, matchDayId, 'orders'));
    batch.set(orderRef, {
      ...orderData,
      status: 'confirmed',
      createdAt: Timestamp.now()
    });
    
    // Generate individual tickets with QR codes
    for (let i = 0; i < orderData.quantity; i++) {
      const ticketId = uuidv4();
      const ticketNumber = i + 1;
      
      // Create encrypted QR data
      const qrData = encryptTicketData({
        ticketId,
        orderId: orderRef.id,
        matchDayId,
        ticketTypeId: orderData.ticketTypeId,
        ticketTypeName: orderData.ticketTypeName,
        email: orderData.email,
        ticketNumber,
        timestamp: Date.now()
      });
      
      // Create ticket document
      const ticketRef = doc(collection(db, TICKETING_COLLECTION, matchDayId, 'orders', orderRef.id, TICKETS_SUBCOLLECTION));
      batch.set(ticketRef, {
        ticketId,
        ticketNumber,
        orderId: orderRef.id,
        matchDayId,
        ticketTypeId: orderData.ticketTypeId,
        ticketTypeName: orderData.ticketTypeName,
        email: orderData.email,
        phoneNumber: orderData.phoneNumber,
        qrData,
        status: 'valid', // valid, used, cancelled
        scannedAt: null,
        scannedBy: null,
        createdAt: Timestamp.now()
      });
    }
    
    // Update ticket type sold count
    const ticketTypeRef = doc(db, TICKETING_COLLECTION, matchDayId, TICKET_TYPES_SUBCOLLECTION, orderData.ticketTypeId);
    const ticketTypeSnap = await getDoc(ticketTypeRef);
    
    if (ticketTypeSnap.exists()) {
      const ticketTypeData = ticketTypeSnap.data();
      const newSold = (ticketTypeData.sold || 0) + orderData.quantity;
      const newAvailable = ticketTypeData.quantity - newSold;
      
      batch.update(ticketTypeRef, {
        sold: newSold,
        available: newAvailable
      });
      
      // Update match day totals
      const matchDayRef = doc(db, TICKETING_COLLECTION, matchDayId);
      const matchDaySnap = await getDoc(matchDayRef);
      
      if (matchDaySnap.exists()) {
        const matchDayData = matchDaySnap.data();
        const newTotalSold = (matchDayData.soldTickets || 0) + orderData.quantity;
        const newRevenue = (matchDayData.revenue || 0) + orderData.totalAmount;
        
        batch.update(matchDayRef, {
          soldTickets: newTotalSold,
          revenue: newRevenue,
          updatedAt: Timestamp.now()
        });
      }
    }
    
    await batch.commit();
    return orderRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get all orders for a match day
 * @param {string} matchDayId - Match day ID
 * @returns {Promise<Array>} - Array of orders
 */
export const getOrdersByMatchDay = async (matchDayId) => {
  try {
    const ordersSnapshot = await getDocs(
      collection(db, TICKETING_COLLECTION, matchDayId, 'orders')
    );
    
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

/**
 * Get all tickets for an order
 * @param {string} matchDayId - Match day ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} - Array of tickets
 */
export const getTicketsByOrder = async (matchDayId, orderId) => {
  try {
    const ticketsSnapshot = await getDocs(
      collection(db, TICKETING_COLLECTION, matchDayId, 'orders', orderId, TICKETS_SUBCOLLECTION)
    );
    
    return ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
};

/**
 * Get all passes for a match day
 * @param {string} matchDayId - Match day ID
 * @returns {Promise<Array>} - Array of passes
 */
export const getPassesByMatchDay = async (matchDayId) => {
  try {
    const passesSnapshot = await getDocs(
      collection(db, TICKETING_COLLECTION, matchDayId, 'passes')
    );
    
    return passesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching passes:', error);
    throw error;
  }
};
