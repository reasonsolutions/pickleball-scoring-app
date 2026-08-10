/**
 * Razorpay Payment Service
 * Handles all Razorpay payment operations
 */

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Sfh0BL4V2hv19K';

/**
 * Initialize Razorpay payment
 * @param {Object} options - Payment options
 * @returns {Promise<Object>} Payment response
 */
export const initializeRazorpayPayment = async (options) => {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'));
      return;
    }

    const paymentOptions = {
      key: RAZORPAY_KEY_ID,
      ...options,
      handler: function (response) {
        resolve(response);
      }
    };

    try {
      const rzp = new window.Razorpay(paymentOptions);
      
      rzp.on('payment.failed', function (response) {
        reject(new Error(response.error.description || 'Payment failed'));
      });

      rzp.open();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Verify payment with backend
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {Promise<Object>} Verification response
 */
export const verifyPayment = async (paymentData) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-hpl-app-prod.cloudfunctions.net'}/verifyRazorpayPayment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature
        })
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Payment verification failed');
    }

    return result;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

/**
 * Create Razorpay order
 * @param {number} amount - Amount in paise
 * @param {string} currency - Currency code (default: INR)
 * @param {Object} notes - Additional notes
 * @returns {Promise<Object>} Order details
 */
export const createOrder = async (amount, currency = 'INR', notes = {}) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-hpl-app-prod.cloudfunctions.net'}/createRazorpayOrder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          notes
        })
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create order');
    }

    return result;
  } catch (error) {
    console.error('Order creation error:', error);
    throw error;
  }
};

/**
 * Format amount to paise
 * @param {number} amount - Amount in rupees
 * @returns {number} Amount in paise
 */
export const formatAmountToPaise = (amount) => {
  return Math.round(amount * 100);
};

/**
 * Format amount from paise to rupees
 * @param {number} paise - Amount in paise
 * @returns {number} Amount in rupees
 */
export const formatAmountToRupees = (paise) => {
  return paise / 100;
};

/**
 * Calculate amount with GST
 * @param {number} baseAmount - Base amount in rupees
 * @param {number} gstRate - GST rate (default: 18%)
 * @returns {Object} Breakdown of amount with GST
 */
export const calculateAmountWithGST = (baseAmount, gstRate = 18) => {
  const gstAmount = Math.round(baseAmount * (gstRate / 100));
  const totalAmount = baseAmount + gstAmount;
  
  return {
    baseAmount,
    gstRate,
    gstAmount,
    totalAmount,
    totalAmountInPaise: formatAmountToPaise(totalAmount)
  };
};

export default {
  initializeRazorpayPayment,
  verifyPayment,
  createOrder,
  formatAmountToPaise,
  formatAmountToRupees,
  calculateAmountWithGST,
  RAZORPAY_KEY_ID
};
