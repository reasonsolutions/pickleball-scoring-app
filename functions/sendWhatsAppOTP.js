const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');

const MSG91_AUTH_KEY = '491825AxYFVkL586a740282P1';
const INTEGRATED_NUMBER = '919381771876';

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

// Sends the 'otpverify1' WhatsApp template via MSG91. Accepts numbers like
// "9876543210", "919876543210" or "+91 98765 43210".
async function sendOtpWhatsApp(phoneNumber, otp) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  const formattedNumber = digits.length === 10 ? `91${digits}` : digits;

  console.log('Formatted number for MSG91:', formattedNumber);

  const payload = {
    integrated_number: INTEGRATED_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "otpverify1",
        language: {
          code: "en_US",
          policy: "deterministic"
        },
        namespace: "4a46062d_772c_4791_a468_d2355a43e5d4",
        to_and_components: [
          {
            to: [formattedNumber],
            components: {
              body_1: {
                type: "text",
                value: otp
              },
              button_1: {
                subtype: "url",
                type: "text",
                value: otp
              }
            }
          }
        ]
      }
    }
  };

  console.log('Sending WhatsApp OTP to:', formattedNumber);

  const msg91Response = await axios.post(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'authkey': MSG91_AUTH_KEY
      }
    }
  );

  console.log('MSG91 Response:', msg91Response.data);
  return msg91Response.data;
}

exports.sendOtpWhatsApp = sendOtpWhatsApp;

exports.sendWhatsAppOtpHttp = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { phoneNumber, otp } = request.body;
    
    console.log('sendWhatsAppOTP function called');
    console.log('Received phoneNumber:', phoneNumber);
    console.log('Received otp:', otp);

    if (!phoneNumber || !otp) {
      console.error('Missing phoneNumber or otp');
      response.status(400).json({
        status: 'error',
        message: 'Phone number and OTP are required'
      });
      return;
    }

    await sendOtpWhatsApp(phoneNumber, otp);
    
    response.status(200).json({
      status: 'success',
      message: 'OTP sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error.response?.data || error.message);
    response.status(500).json({
      status: 'error',
      message: error.response?.data?.message || error.message || 'Failed to send OTP'
    });
  }
});
