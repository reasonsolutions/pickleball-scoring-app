# Razorpay Integration Setup Guide

## Overview
Your Pickleball Scoring App now has Razorpay payment integration configured. This guide explains the setup and how to use it.

## Configuration Files Created

### 1. Frontend Configuration (`.env.local`)
```
VITE_RAZORPAY_KEY_ID=rzp_live_Sfh0BL4V2hv19K
```
- **Location**: Root directory
- **Purpose**: Stores your Razorpay public key for frontend payment initialization
- **Security**: This file is in `.gitignore` and should never be committed

### 2. Backend Configuration (`functions/.env.local`)
```
RAZORPAY_KEY_ID=rzp_live_Sfh0BL4V2hv19K
RAZORPAY_KEY_SECRET=xp5Es37EQ7WdMejQC5vJ1qTw
```
- **Location**: `functions/` directory
- **Purpose**: Stores both public and secret keys for backend payment verification
- **Security**: This file is in `.gitignore` and should never be committed
- **Important**: The secret key is only used on the backend for signature verification

## Updated Files

### Frontend Payment Handlers
The following files have been updated to use your Razorpay key:

1. **[`src/pages/HplClubRegistration.jsx`](src/pages/HplClubRegistration.jsx:742)**
   - Club registration payment (₹5,000 + 18% GST)
   - Uses: `import.meta.env.VITE_RAZORPAY_KEY_ID`

2. **[`src/pages/PlayerProfile.jsx`](src/pages/PlayerProfile.jsx:390)**
   - Player registration payment (₹3,000 + 18% GST)
   - Uses: `import.meta.env.VITE_RAZORPAY_KEY_ID`

3. **[`src/pages/ClubProfile.jsx`](src/pages/ClubProfile.jsx:984)**
   - Final club registration payment (₹2,00,000 + 18% GST)
   - Uses: `import.meta.env.VITE_RAZORPAY_KEY_ID`

### Backend Cloud Functions
Updated [`functions/index.js`](functions/index.js) with two new functions:

1. **`verifyRazorpayPayment`** (POST)
   - Verifies payment signature using HMAC-SHA256
   - Endpoint: `/verifyRazorpayPayment`
   - Request body:
     ```json
     {
       "razorpay_order_id": "order_xxx",
       "razorpay_payment_id": "pay_xxx",
       "razorpay_signature": "signature_xxx"
     }
     ```

2. **`createRazorpayOrder`** (POST)
   - Creates a new payment order
   - Endpoint: `/createRazorpayOrder`
   - Request body:
     ```json
     {
       "amount": 590000,
       "currency": "INR",
       "notes": { "key": "value" }
     }
     ```

### Utility Service
Created [`src/utils/razorpayService.js`](src/utils/razorpayService.js) with helper functions:

```javascript
// Initialize payment
initializeRazorpayPayment(options)

// Verify payment with backend
verifyPayment(paymentData)

// Create order
createOrder(amount, currency, notes)

// Format utilities
formatAmountToPaise(amount)
formatAmountToRupees(paise)
calculateAmountWithGST(baseAmount, gstRate)
```

## How It Works

### Payment Flow

1. **User initiates payment** → Frontend calls payment handler
2. **Razorpay modal opens** → User enters payment details
3. **Payment processed** → Razorpay returns payment data
4. **Signature verified** → Backend verifies using secret key
5. **Payment recorded** → Data saved to Firestore

### Signature Verification Process

The backend verifies payments using HMAC-SHA256:

```javascript
const body = razorpay_order_id + '|' + razorpay_payment_id;
const expectedSignature = crypto
  .createHmac('sha256', razorpaySecret)
  .update(body)
  .digest('hex');

// Compare with received signature
if (expectedSignature === razorpay_signature) {
  // Payment is valid
}
```

## Environment Variables

### Frontend (`.env.local`)
```
VITE_RAZORPAY_KEY_ID=your_public_key
VITE_FIREBASE_FUNCTIONS_URL=https://your-firebase-functions-url
```

### Backend (`functions/.env.local`)
```
RAZORPAY_KEY_ID=your_public_key
RAZORPAY_KEY_SECRET=your_secret_key
```

## Deployment Instructions

### 1. Local Development
```bash
# Install dependencies
npm install
cd functions && npm install

# Start Firebase emulator
firebase emulators:start

# In another terminal, start your app
npm run dev
```

### 2. Deploy to Firebase
```bash
# Deploy functions with environment variables
firebase deploy --only functions

# The .env.local files will be used for local development
# For production, set environment variables in Firebase Console:
# - Go to Cloud Functions
# - Select the function
# - Edit and set environment variables
```

### 3. Set Production Environment Variables
In Firebase Console:
1. Go to Cloud Functions
2. Select `verifyRazorpayPayment` function
3. Click "Edit"
4. Set Runtime environment variables:
   - `RAZORPAY_KEY_ID`: Your public key
   - `RAZORPAY_KEY_SECRET`: Your secret key

## Security Best Practices

✅ **Do's:**
- Store secret key only in backend environment variables
- Never expose secret key in frontend code
- Always verify signatures on the backend
- Use HTTPS for all payment requests
- Validate payment data before saving to database

❌ **Don'ts:**
- Don't commit `.env.local` files to git
- Don't expose secret key in frontend code
- Don't skip signature verification
- Don't store payment data without verification
- Don't use test keys in production

## Testing

### Test Credentials
For testing, you can use Razorpay's test credentials:
- **Test Key ID**: `rzp_test_xxxxx`
- **Test Secret**: `xxxxx`

### Test Payment Cards
- **Success**: 4111 1111 1111 1111
- **Failure**: 4222 2222 2222 2222

## Troubleshooting

### Payment Modal Not Opening
- Check if Razorpay script is loaded in `index.html`
- Verify `VITE_RAZORPAY_KEY_ID` is set in `.env.local`
- Check browser console for errors

### Signature Verification Failed
- Ensure secret key is correct in `functions/.env.local`
- Verify order ID and payment ID are correct
- Check that signature is being passed correctly

### Environment Variables Not Loading
- Restart your development server after changing `.env.local`
- For Firebase functions, redeploy after updating environment variables
- Check Firebase Console for environment variable settings

## Payment Amounts

### Club Registration
- Base: ₹5,000
- GST (18%): ₹900
- **Total: ₹5,900**

### Player Registration
- Base: ₹3,000
- GST (18%): ₹540
- **Total: ₹3,540**

### Final Club Registration
- Base: ₹2,00,000
- GST (18%): ₹36,000
- **Total: ₹2,36,000**

## Support

For issues or questions:
1. Check Razorpay documentation: https://razorpay.com/docs/
2. Review Firebase Cloud Functions logs
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Payment Gateway Integration](https://razorpay.com/docs/payments/payment-gateway/)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Environment Variables in Firebase](https://firebase.google.com/docs/functions/config-env)
