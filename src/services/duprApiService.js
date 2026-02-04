/**
 * DUPR API Service
 * Handles authentication and interaction with the DUPR API
 * API Documentation: https://uat.mydupr.com/api/swagger-ui/index.html
 * Auth Documentation: https://dupr.gitbook.io/dupr-raas/quick-start-and-token-generation
 */

class DuprApiService {
  constructor() {
    // UAT environment URL - using the specific auth path that works in Swagger
    this.baseUrl = 'https://uat.mydupr.com/api';
    this.authUrl = 'https://uat.mydupr.com/api/auth/v1.0';
    this.clientKey = 'test-ck-d30589e9-5a4c-4897-fa4c-c9dbaea76f72';
    this.clientSecret = 'test-cs-d715b452cae9403efa160b1f6bef0915';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Encode client key and secret as base64
   * Format: base64($key + ":" + $secret)
   * @returns {string} Base64 encoded credentials
   */
  getEncodedCredentials() {
    const credentials = `${this.clientKey}:${this.clientSecret}`;
    return btoa(credentials); // btoa = Base64 encoding
  }

  /**
   * Generate an access token using client credentials
   * @returns {Promise<Object>} Token response object
   */
  async generateAccessToken() {
    try {
      console.log('Generating DUPR API access token...');
      
      // Get base64 encoded credentials
      const encodedCredentials = this.getEncodedCredentials();
      console.log('Using encoded credentials format as specified in documentation');
      
      // Use the exact endpoint and parameters that work in Swagger
      const response = await fetch(`https://uat.mydupr.com/api/auth/v1.0/token`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-authorization': encodedCredentials
        },
        body: '' // Empty body as in the working curl command
      });

      console.log(`Authentication response status: ${response.status}`);
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `DUPR API error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error('Authentication error details:', errorData);
          errorMessage += ` - ${errorData.message || 'Unknown error'}`;
        } catch (e) {
          // If parsing JSON fails, try to get text
          const errorText = await response.text();
          console.error('Authentication error response:', errorText);
          errorMessage += ` - ${errorText || 'Unable to parse error details'}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      
      // Set token expiry (typically 1 hour from now)
      const expiresInMs = (data.expiresIn || 3600) * 1000;
      this.tokenExpiry = Date.now() + expiresInMs;
      
      console.log('Access token generated successfully');
      return data;
    } catch (error) {
      console.error('Failed to generate DUPR access token:', error);
      throw error;
    }
  }

  /**
   * Get current access token, generating a new one if needed
   * @returns {Promise<string>} Valid access token
   */
  async getAccessToken() {
    // If no token or token is expired, generate a new one
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      const tokenData = await this.generateAccessToken();
      return tokenData.accessToken;
    }
    
    return this.accessToken;
  }

  /**
   * Make an authenticated request to the DUPR API
   * @param {string} endpoint - API endpoint path
   * @param {string} method - HTTP method (GET, POST, etc)
   * @param {Object} body - Request body for POST/PUT requests
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    try {
      // Get a valid access token
      const token = await this.getAccessToken();
      
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      // Use the correct API path with the version number
      // Make sure endpoint starts with a slash
      const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      // Check if endpoint should use auth path (e.g., /players endpoints)
      const apiUrl = endpoint.includes('/players') || endpoint.includes('/ratings') ?
                    `${this.authUrl}${formattedEndpoint}` :
                    `${this.baseUrl}${formattedEndpoint}`;
      
      console.log(`Making API request to: ${apiUrl}`);
      const response = await fetch(apiUrl, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DUPR API request failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`DUPR API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Get player ratings by DUPR ID
   * @param {string} duprId - Player's DUPR ID
   * @returns {Promise<Object>} Player rating data
   */
  async getPlayerRatings(duprId) {
    if (!duprId) {
      return { error: 'No DUPR ID provided' };
    }

    try {
      // Use correct API path with version number
      return await this.makeRequest(`/auth/v1.0/players/${duprId}/ratings`);
    } catch (error) {
      console.error(`Error fetching ratings for ${duprId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Search for players by name
   * @param {string} name - Player name to search for
   * @returns {Promise<Array>} List of matching players
   */
  async searchPlayers(name) {
    try {
      // Use correct API path with version number
      return await this.makeRequest(`/auth/v1.0/players/search?name=${encodeURIComponent(name)}`);
    } catch (error) {
      console.error(`Error searching players for '${name}':`, error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
export const duprApiService = new DuprApiService();
export default duprApiService;