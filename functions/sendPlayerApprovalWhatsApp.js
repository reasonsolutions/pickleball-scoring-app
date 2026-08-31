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

exports.sendPlayerApprovalWhatsAppHttp = onRequest({cors: true}, async (request, response) => {
  try {
    setCorsHeaders(response);
    if (handlePreflight(request, response)) return;

    const { phoneNumbers, playerName } = request.body;
    
    console.log('sendPlayerApprovalWhatsApp function called');
    console.log('Received phoneNumbers:', phoneNumbers);
    console.log('Received playerName:', playerName);

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      console.error('Missing or invalid phoneNumbers');
      response.status(400).json({
        status: 'error',
        message: 'Phone numbers array is required'
      });
      return;
    }

    // Format all phone numbers (ensure they have country code)
    const formattedNumbers = phoneNumbers.map(phone => {
      const cleanPhone = String(phone).replace(/\D/g, ''); // Remove non-digits
      return cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    });
    
    console.log('Formatted numbers for MSG91:', formattedNumbers);

    // Create components for each phone number
    const toAndComponents = formattedNumbers.map(number => ({
      to: [number],
      components: {
        body_var_1: {
          type: "text",
          value: playerName || "Player",
          parameter_name: "var_1"
        }
      }
    }));

    const payload = {
      integrated_number: INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "player_approved",
          language: {
            code: "en",
            policy: "deterministic"
          },
          namespace: "60ab4863_e450_4055_9286_45084fb4e9bc",
          to_and_components: toAndComponents
        }
      }
    };

    console.log('Sending WhatsApp approval notifications to:', formattedNumbers);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
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
    
    response.status(200).json({
      status: 'success',
      message: 'Approval notifications sent successfully',
      data: msg91Response.data
    });
    
  } catch (error) {
    console.error('Error sending WhatsApp approval notifications:', error.response?.data || error.message);
    response.status(500).json({
      status: 'error',
      message: error.response?.data?.message || error.message || 'Failed to send approval notifications'
    });
  }
});
