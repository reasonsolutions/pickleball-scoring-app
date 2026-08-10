import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

const VENDOR_ITEMS_COLLECTION = 'vendor-items';

/**
 * Vendor Items Service
 * Handles all menu item operations for vendors
 */

// Create a new menu item
export const createMenuItem = async (vendorId, itemData) => {
  try {
    const itemDoc = {
      vendorId,
      name: itemData.name,
      category: itemData.category,
      type: itemData.type || 'Veg',
      price: parseFloat(itemData.price),
      stock: parseInt(itemData.stock),
      photo: itemData.photo || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const itemRef = await addDoc(collection(db, VENDOR_ITEMS_COLLECTION), itemDoc);
    
    return { id: itemRef.id, ...itemData };
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw error;
  }
};

// Get all menu items for a vendor
export const getVendorMenuItems = async (vendorId) => {
  try {
    const q = query(
      collection(db, VENDOR_ITEMS_COLLECTION),
      where('vendorId', '==', vendorId)
    );
    const querySnapshot = await getDocs(q);
    const items = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return items;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw error;
  }
};

// Update a menu item
export const updateMenuItem = async (itemId, itemData) => {
  try {
    const itemRef = doc(db, VENDOR_ITEMS_COLLECTION, itemId);
    await updateDoc(itemRef, {
      name: itemData.name,
      category: itemData.category,
      type: itemData.type || 'Veg',
      price: parseFloat(itemData.price),
      stock: parseInt(itemData.stock),
      photo: itemData.photo || '',
      updatedAt: serverTimestamp()
    });
    
    return { id: itemId, ...itemData };
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw error;
  }
};

// Delete a menu item
export const deleteMenuItem = async (itemId) => {
  try {
    await deleteDoc(doc(db, VENDOR_ITEMS_COLLECTION, itemId));
    return true;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};
