const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

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

// Password Reset Email Function
exports.sendPasswordResetEmail = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { email, resetLink, userType } = request.body;
    
    if (!email || !resetLink || !userType) {
      response.status(400).json({
        status: 'error',
        message: 'Email, reset link, and user type are required'
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

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hpl@centrecourt.ventures', // Your Gmail address
        pass: 'ktrnasnndenawfka'  // Your Gmail app password
      }
    });

    const userTypeLabel = userType === 'player' ? 'Player' : 'Club Admin';

    // Email template
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: email,
      subject: 'HPL Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">HPL ${userTypeLabel} Account</h1>
            <p style="color: #666; margin: 10px 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
            <p style="color: #666; margin: 15px 0;">We received a request to reset the password for your HPL account. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
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
              © 2024 Hyderabad Pickleball League. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`Password reset email sent successfully to ${email}`);

    response.status(200).json({
      status: 'success',
      message: 'Password reset email sent successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error sending password reset email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send password reset email'
    });
  }
});