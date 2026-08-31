const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require('axios');

/**
 * Verify Razorpay payment by checking if a user with given email has made a payment
 * This function searches Razorpay's payment records for payments matching the email
 */
exports.verifyRazorpayPaymentByEmail = onRequest(async (request, response) => {
  // Set CORS headers FIRST - before any other logic
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Content-Type', 'application/json');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {

    const { email } = request.body;
    
    if (!email) {
      return response.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    logger.info(`Checking Razorpay payments for email: ${email}`);

    // Get Razorpay credentials from environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_Sfh0BL4V2hv19K';
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'xp5Es37EQ7WdMejQC5vJ1qTw';

    // Create Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString('base64');

    try {
      // Fetch recent payments (Razorpay doesn't support filtering by email in the API)
      // We need to fetch payments and filter them locally
      const paymentsResponse = await axios.get('https://api.razorpay.com/v1/payments', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: {
          count: 100 // Get up to 100 most recent payments
        }
      });

      const allPayments = paymentsResponse.data.items || [];
      
      logger.info(`Fetched ${allPayments.length} recent payments, filtering for email: ${email}`);

      // Calculate timestamp for 7 days ago
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

      // Filter payments by email and date (last 7 days only)
      const payments = allPayments.filter(payment => {
        const matchesEmail = payment.email && payment.email.toLowerCase() === email.toLowerCase();
        const isRecent = payment.created_at >= sevenDaysAgo;
        return matchesEmail && isRecent;
      });

      logger.info(`Found ${payments.length} payments matching email: ${email} from the last 7 days`);

      // Filter for captured/successful payments only
      const successfulPayments = payments.filter(payment =>
        payment.status === 'captured' || payment.status === 'authorized'
      );

      if (successfulPayments.length === 0) {
        return response.status(200).json({
          status: 'not_found',
          message: 'No successful payments found for this email',
          email: email,
          totalPayments: payments.length,
          successfulPayments: 0
        });
      }

      // Get the most recent successful payment
      const latestPayment = successfulPayments[0];

      logger.info(`Found successful payment: ${latestPayment.id} for ${email}`);

      return response.status(200).json({
        status: 'success',
        message: 'Payment found',
        email: email,
        payment: {
          id: latestPayment.id,
          amount: latestPayment.amount,
          currency: latestPayment.currency,
          status: latestPayment.status,
          method: latestPayment.method,
          email: latestPayment.email,
          contact: latestPayment.contact,
          createdAt: latestPayment.created_at,
          description: latestPayment.description,
          orderId: latestPayment.order_id
        },
        totalPayments: payments.length,
        successfulPayments: successfulPayments.length
      });

    } catch (razorpayError) {
      logger.error('Razorpay API error:', razorpayError.response?.data || razorpayError.message);
      
      // Check if it's an authentication error
      if (razorpayError.response?.status === 401) {
        return response.status(500).json({
          status: 'error',
          message: 'Razorpay authentication failed. Please check API credentials.',
          error: 'Authentication error'
        });
      }

      return response.status(500).json({
        status: 'error',
        message: 'Failed to check Razorpay payments',
        error: razorpayError.response?.data?.error?.description || razorpayError.message
      });
    }

  } catch (error) {
    logger.error('Error in verifyRazorpayPaymentByEmail:', error);
    return response.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});
