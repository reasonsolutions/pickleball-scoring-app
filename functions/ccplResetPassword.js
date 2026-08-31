const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Helper function to set CORS headers
function setCorsHeaders(response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Content-Type', 'application/json');
}

// Helper function to handle preflight requests
function handlePreflight(request, response) {
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return true;
  }
  return false;
}

// CCPL Password Reset Email Function
exports.ccplResetPassword = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { email } = request.body;
    
    if (!email) {
      response.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      response.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
      return;
    }

    // Initialize Firestore
    const db = admin.firestore();
    
    // Find user by email in ccpl-users collection
    const usersRef = db.collection('ccpl-users');
    const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
    
    logger.info(`Password reset requested for email: ${email}`);
    logger.info(`Found ${querySnapshot.size} user(s) with this email`);
    
    if (querySnapshot.empty) {
      logger.warn(`No user found with email: ${email}`);
      // Don't reveal if email exists or not for security
      response.status(200).json({
        status: 'success',
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    logger.info(`User found - Type: ${userData.type}, ID: ${userDoc.id}`);
    
    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry to 1 hour from now
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);
    
    // Update user document with reset token and expiry
    await userDoc.ref.update({
      resetToken: resetToken,
      resetTokenExpiry: admin.firestore.Timestamp.fromDate(expiryTime),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create reset link
    const resetLink = `https://thehpl.in/ccpl-reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    
    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hpl@centrecourt.ventures',
        pass: 'ktrnasnndenawfka'
      }
    });

    const userTypeLabel = userData.type === 'player' ? 'Player' : 'Team Admin';

    // Email template
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: email,
      subject: 'CCPL Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ee3a24; margin: 0;">CCPL ${userTypeLabel} Account</h1>
            <p style="color: #666; margin: 10px 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
            <p style="color: #666; margin: 15px 0;">We received a request to reset the password for your CCPL account. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #ee3a24; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="color: #666; margin: 15px 0;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${resetLink}</p>
            
            <p style="color: #666; margin: 15px 0;">This password reset link will expire in 1 hour for security reasons.</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
            <p style="color: #999; font-size: 12px;">
              © 2024 Centre Court Pickleball League. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`CCPL password reset email sent successfully to ${email}`);

    response.status(200).json({
      status: 'success',
      message: 'Password reset email sent successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error sending CCPL password reset email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send password reset email'
    });
  }
});
