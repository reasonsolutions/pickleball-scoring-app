# DUPR API Integration Guide

This document provides instructions for using and testing the DUPR API integration implemented in the application.

## 📋 Overview

The DUPR API integration provides a way to authenticate with the DUPR API and access player data through the official API instead of web scraping. This implementation includes:

- A service for API authentication and data retrieval
- A user interface for generating and managing access tokens
- Testing tools for API endpoints
- Documentation of the integration

## 🔑 API Credentials

The following API credentials have been configured:

- **Client Key**: `test-ck-d30589e9-5a4c-4897-fa4c-c9dbaea76f72`
- **Client Secret**: `test-cs-d715b452cae9403efa160b1f6bef0915`

These are UAT (User Acceptance Testing) credentials and are used to connect to the DUPR API testing environment at `https://uat.mydupr.com/api`.

## 🚀 Getting Started

### Accessing the DUPR API Page

1. Start your development server:
   ```
   npm run dev
   ```

2. Login with admin credentials

3. Navigate to:
   ```
   http://localhost:5173/admin/dupr-api
   ```

### Using the DUPR API Page

The DUPR API page provides the following functionality:

1. **View API Credentials**: The configured client key and client secret are displayed.

2. **Generate Access Token**: Click the "Generate Access Token" button to create a new access token using the configured credentials.

3. **Test API Endpoints**:
   - **Search Players**: Enter a player name and click "Search" to find players matching that name.
   - **Get Player Ratings**: Enter a DUPR player ID and click "Get Ratings" to fetch ratings for that player.

4. **View API Responses**: All API responses are displayed in a formatted JSON viewer at the bottom of the page.

## 🧪 Testing the Integration

### Step 1: Generate an Access Token

1. Click the "Generate Access Token" button.
2. If successful, you'll see the access token displayed along with its expiry time.
3. The token is automatically stored and will be used for subsequent API requests.

### Step 2: Test Player Search

1. Enter a player name (e.g., "John" or "Smith") in the search input field.
2. Click the "Search" button.
3. The API response with matching players will be displayed in the API Response section.

### Step 3: Test Player Ratings

1. If you found a player in the search results, copy their DUPR ID.
2. Paste the ID in the "DUPR Player ID" field.
3. Click the "Get Ratings" button.
4. The player's ratings information will be displayed in the API Response section.

## 📚 Implementation Details

### Files Created/Modified

- **New Files**:
  - `src/services/duprApiService.js` - Service for DUPR API authentication and requests
  - `src/pages/DuprApi.jsx` - UI for testing and managing the DUPR API integration
  - `DUPR_API_GUIDE.md` - This documentation file

- **Modified Files**:
  - `src/App.jsx` - Added route for the DUPR API page

### API Authentication Flow

1. The application sends a POST request to `/authentication/login` with client credentials.
2. The API returns an access token that's valid for 1 hour.
3. The token is stored in memory and used for subsequent API requests.
4. When the token expires, a new one is automatically generated.

## 📖 API Documentation

For full API documentation, refer to:

- **Swagger UI**: [https://uat.mydupr.com/api/swagger-ui/index.html](https://uat.mydupr.com/api/swagger-ui/index.html)

## 🔄 Integrating With Existing DUPR Service

This API integration provides an alternative to the web scraping approach currently used in `src/services/duprService.js`. To switch from web scraping to API:

1. Import the DUPR API service:
   ```javascript
   import { duprApiService } from '../services/duprApiService';
   ```

2. Use the API methods to fetch player ratings:
   ```javascript
   const ratings = await duprApiService.getPlayerRatings(duprId);
   ```

## 🔒 Security Considerations

- For production, consider storing API credentials as environment variables.
- Implement proper token refresh mechanisms.
- Add rate limiting and error handling for API requests.

## 🚨 Troubleshooting

- If token generation fails, check the API credentials and network connectivity.
- Check the browser console for detailed error messages.
- Verify the API endpoint URLs in the service configuration.
- The UAT environment may have limitations or test data that differs from production.