import { db } from '../utils/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

const VENDOR_ORDERS_COLLECTION = 'vendor-orders';

// Create a new order
export const createOrder = async (orderData) => {
  try {
    const orderDoc = {
      vendorId: orderData.vendorId,
      items: orderData.items, // Array of { itemId, name, price, quantity, photo }
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      tableNumber: orderData.tableNumber || null,
      customerPhone: orderData.customerPhone || null,
      paymentMethod: orderData.paymentMethod || 'Cash',
      status: 'pending', // pending, preparing, completed, cancelled
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const orderRef = await addDoc(collection(db, VENDOR_ORDERS_COLLECTION), orderDoc);
    return { id: orderRef.id, ...orderData, status: 'pending' };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get all orders for a vendor
export const getVendorOrders = async (vendorId) => {
  try {
    const q = query(
      collection(db, VENDOR_ORDERS_COLLECTION),
      where('vendorId', '==', vendorId)
      // Temporarily removed orderBy until index is built
      // orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort in memory instead
    orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA; // Descending order (newest first)
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting vendor orders:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, VENDOR_ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};
