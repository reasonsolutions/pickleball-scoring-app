const { onRequest } = require('firebase-functions/v2/https');
const nodemailer = require('nodemailer');
const logger = require('firebase-functions/logger');

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

// CCPL Registration Confirmation Email Function
exports.sendCCPLRegistrationEmail = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { email, name, userId } = request.body;

    if (!email || !name) {
      response.status(400).json({
        status: 'error',
        message: 'Email and name are required'
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
        user: 'hpl@centrecourt.ventures',
        pass: 'ktrnasnndenawfka'
      }
    });

    // Email template
    const mailOptions = {
      from: 'hpl@centrecourt.ventures',
      to: email,
      subject: 'Thank You for Registering - CCPL Season 2',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ee3a24 0%, #7d0f0f 100%); padding: 40px 20px; text-align: center;">
              <img src="https://centrecourthyd.com/images/ccpl-logo-white.png" alt="CCPL Logo" style="max-width: 200px; height: auto; margin: 0 auto; display: block;" />
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #ee3a24; margin: 0 0 20px; font-size: 24px; font-weight: 700;">Thank You for Registering!</h2>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
                Dear ${name},
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
                Thank you for registering for the <strong>Centre Court PickleBall League (CCPL) Season 2</strong>. We have successfully received your registration and payment.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
                Your registration is now under review by the League Committee. We will verify your eligibility and residency documentation before the auction.
              </p>

              <!-- Important Dates -->
              <div style="background-color: #f8f8f8; border-left: 4px solid #ee3a24; padding: 20px; margin: 25px 0;">
                <h3 style="color: #ee3a24; margin: 0 0 15px; font-size: 18px; font-weight: 700;">Important Date</h3>
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
                  <strong>Auction Date:</strong> 5 September 2026
                </p>
              </div>

              <!-- Next Steps -->
              <div style="margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px; font-size: 18px; font-weight: 700;">What Happens Next?</h3>
                <ol style="color: #666; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>The League Committee will review your registration details</li>
                  <li>Your eligibility and residency documents will be verified</li>
                  <li>You will receive a confirmation email once your registration is approved</li>
                  <li>Approved players will be included in the auction on 5 September 2026</li>
                </ol>
              </div>

              ${userId ? `
              <!-- Profile Link -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://thehpl.in/ccpl-profile/${userId}" 
                   style="display: inline-block; background: linear-gradient(180deg, #ee3a24, #7d0f0f); color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;">
                  View My Profile
                </a>
              </div>
              ` : ''}

              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 25px 0 0;">
                If you have any questions or concerns, please don't hesitate to contact us.
              </p>

              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
                Best regards,<br>
                <strong>The CCPL Team</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Centre Court PickleBall League<br>
                Hyderabad, India
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0;">
                <a href="https://thehpl.in" style="color: #ee3a24; text-decoration: none;">thehpl.in</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`CCPL registration confirmation email sent successfully to ${email}`);

    response.status(200).json({
      status: 'success',
      message: 'Registration confirmation email sent successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error sending CCPL registration email:', error);
    response.status(500).json({
      status: 'error',
      message: 'Failed to send registration confirmation email'
    });
  }
});
