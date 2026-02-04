# Email OTP Verification Setup Guide

## Overview
This guide explains how to set up real email sending for OTP verification in your HPL Player Registration form.

## What's Been Implemented

### ✅ Frontend Features
- Email validation with real-time "Verify" button
- 4-digit OTP input modal with auto-focus
- Email verification status tracking
- Form submission requires email verification
- Consistent styling with HPL theme

### ✅ Backend Functions
- `sendOtpEmail` - Sends OTP via email
- `verifyOtp` - Verifies the entered OTP
- OTP storage in Firestore with expiration
- Professional email templates

## Setup Instructions

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Configure Email Service

#### Option A: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Copy the 16-character password

3. **Set Environment Variables**:
```bash
# In your Firebase project
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password"
```

#### Option B: SendGrid (Recommended for Production)

1. **Sign up for SendGrid** (free tier: 100 emails/day)
2. **Get API Key** from SendGrid dashboard
3. **Update Firebase Functions**:

```javascript
// Replace the nodemailer Gmail config with:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: 'noreply@yourdomain.com', // Use your verified sender
  subject: 'HPL Player Registration - Email Verification',
  html: emailTemplate
};

await sgMail.send(msg);
```

### 3. Update Firebase Function URLs

Replace `your-project-id` in the frontend code:

```javascript
// In src/pages/HplPlayerRegistration.jsx
const response = await fetch('https://us-central1-YOUR_ACTUAL_PROJECT_ID.cloudfunctions.net/sendOtpEmail', {
```

Find your project ID in:
- Firebase Console → Project Settings
- Or in `.firebaserc` file

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

### 5. Update Firestore Security Rules

Add these rules to allow OTP operations:

```javascript
// In firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules...
    
    // Allow reading/writing OTP documents (functions will handle this)
    match /email-otps/{document} {
      allow read, write: if false; // Only functions can access
    }
  }
}
```

## Email Template Features

The email includes:
- HPL branding and colors
- Large, clear OTP display
- 5-minute expiration notice
- Professional styling
- Mobile-responsive design

## Security Features

- ✅ OTP expires after 5 minutes
- ✅ OTP can only be used once
- ✅ Email format validation
- ✅ Rate limiting (Firebase Functions built-in)
- ✅ Secure OTP storage in Firestore

## Testing

### Development Testing
1. Use your own email for testing
2. Check browser console for any errors
3. Verify emails are received
4. Test OTP expiration (wait 5+ minutes)

### Production Testing
1. Test with multiple email providers (Gmail, Yahoo, Outlook)
2. Check spam folders
3. Test on mobile devices
4. Verify email delivery speed

## Alternative Email Services

### Option C: AWS SES
```bash
npm install aws-sdk
```

### Option D: Mailgun
```bash
npm install mailgun-js
```

### Option E: Resend (Modern alternative)
```bash
npm install resend
```

## Troubleshooting

### Common Issues

1. **"Failed to send OTP"**
   - Check email credentials
   - Verify Firebase Functions are deployed
   - Check Functions logs: `firebase functions:log`

2. **"Invalid or expired OTP"**
   - Check system time synchronization
   - Verify OTP was entered correctly
   - Check if 5 minutes have passed

3. **Emails not received**
   - Check spam folder
   - Verify sender email is not blacklisted
   - Try different email provider

### Debug Commands

```bash
# View function logs
firebase functions:log

# Test functions locally
firebase emulators:start --only functions

# Check environment config
firebase functions:config:get
```

## Cost Considerations

### Free Tiers
- **Gmail**: Free (with app password)
- **SendGrid**: 100 emails/day free
- **Firebase Functions**: 2M invocations/month free

### Paid Options
- **SendGrid**: $14.95/month for 50K emails
- **AWS SES**: $0.10 per 1,000 emails
- **Mailgun**: $35/month for 50K emails

## Production Recommendations

1. **Use SendGrid or AWS SES** for production
2. **Set up email monitoring** and delivery tracking
3. **Implement rate limiting** per email address
4. **Add email templates** for different languages
5. **Monitor bounce rates** and spam reports
6. **Set up proper SPF/DKIM** records for your domain

## Next Steps

1. Choose your email service provider
2. Set up credentials and environment variables
3. Update the project ID in frontend code
4. Deploy and test the functions
5. Test thoroughly with different email providers

## Support

If you encounter issues:
1. Check Firebase Functions logs
2. Verify email service credentials
3. Test with a simple email first
4. Check Firestore for OTP records

The implementation is now ready for production use with proper email service configuration!