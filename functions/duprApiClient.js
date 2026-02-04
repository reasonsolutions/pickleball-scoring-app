/**
 * DUPR API Client for Node.js
 * Based on the Duprly Python client: https://github.com/pkshiu/duprly
 * Uses the unofficial DUPR API at https://api.dupr.gg
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DuprApiClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'https://api.dupr.gg';
    this.version = options.version || 'v1.0';
    this.verbose = options.verbose || false;
    this.accessToken = null;
    this.tokenPath = path.join('/tmp', '.dupr_token.json'); // Use /tmp for Cloud Functions
    this.credentials = {
      email: 'hpl@centrecourt.ventures',
      password: 'Sid12**'
    };
  }

  /**
   * Helper function to construct API URLs
   */
  url(endpoint) {
    return `${this.apiUrl}${endpoint}`;
  }

  /**
   * Load access token from file if available
   */
  async loadToken() {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf8');
      const tokenData = JSON.parse(data);
      this.accessToken = tokenData.access_token;
      if (this.verbose) {
        console.log(`Loaded token: ${this.accessToken.substring(0, 10)}...`);
      }
      return true;
    } catch (error) {
      if (this.verbose) {
        console.log('No saved token found');
      }
      return false;
    }
  }

  /**
   * Save access token to file
   */
  async saveToken() {
    try {
      const tokenData = {
        access_token: this.accessToken,
        saved_at: new Date().toISOString()
      };
      await fs.writeFile(this.tokenPath, JSON.stringify(tokenData, null, 2));
      if (this.verbose) {
        console.log('Token saved successfully');
      }
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Authenticate user - checks for saved token or logs in
   */
  async authenticate() {
    // Try to load existing token
    const tokenLoaded = await this.loadToken();
    if (tokenLoaded && this.accessToken) {
      // Test if token is still valid
      try {
        const response = await axios.get(this.url(`/user/${this.version}/profile/`), {
          headers: this.getHeaders()
        });
        if (response.status === 200) {
          if (this.verbose) {
            console.log('Existing token is valid');
          }
          return true;
        }
      } catch (error) {
        if (this.verbose) {
          console.log('Existing token is invalid, need to re-login');
        }
      }
    }

    // Login with credentials
    return await this.login();
  }

  /**
   * Login to DUPR API
   */
  async login() {
    try {
      if (this.verbose) {
        console.log(`Logging in user: ${this.credentials.email}`);
      }

      const response = await axios.post(this.url('/auth/v1.0/login/'), {
        email: this.credentials.email,
        password: this.credentials.password
      });

      if (response.status === 200) {
        const data = response.data;
        this.accessToken = data.result.accessToken;
        
        if (this.verbose) {
          console.log(`Login successful. Token: ${this.accessToken.substring(0, 10)}...`);
        }

        await this.saveToken();
        return true;
      } else {
        console.error('Login failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get player information by player ID
   */
  async getPlayer(playerId) {
    try {
      if (!this.accessToken) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Authentication failed');
        }
      }

      if (this.verbose) {
        console.log(`Getting player: ${playerId}`);
      }

      const response = await axios.get(this.url(`/player/${this.version}/${playerId}`), {
        headers: this.getHeaders()
      });

      if (response.status === 200) {
        return {
          success: true,
          data: response.data.result
        };
      } else {
        return {
          success: false,
          error: `API returned status ${response.status}`
        };
      }
    } catch (error) {
      if (error.response?.status === 403) {
        // Token expired, try to re-authenticate
        const authenticated = await this.authenticate();
        if (authenticated) {
          return await this.getPlayer(playerId); // Retry
        }
      }

      console.error(`Error getting player ${playerId}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get multiple players' information
   */
  async getMultiplePlayers(playerIds) {
    const results = [];
    
    for (const playerId of playerIds) {
      if (playerId && playerId !== 'N/A') {
        const result = await this.getPlayer(playerId);
        results.push({
          playerId,
          ...result
        });
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        results.push({
          playerId,
          success: false,
          error: 'Invalid player ID'
        });
      }
    }
    
    return results;
  }

  /**
   * Extract ratings from player data
   */
  extractRatings(playerData) {
    if (!playerData || !playerData.ratings) {
      return {
        doublesRating: 'N/A',
        singlesRating: 'N/A'
      };
    }

    // The API returns ratings in different formats
    // Check the ratings object for doubles and singles
    let doublesRating = 'N/A';
    let singlesRating = 'N/A';

    // Try to find doubles rating
    if (playerData.ratings.doubles) {
      doublesRating = playerData.ratings.doubles.toString();
    } else if (playerData.ratings.verified && playerData.ratings.verified.doubles) {
      doublesRating = playerData.ratings.verified.doubles.toString();
    }

    // Try to find singles rating
    if (playerData.ratings.singles) {
      singlesRating = playerData.ratings.singles.toString();
    } else if (playerData.ratings.verified && playerData.ratings.verified.singles) {
      singlesRating = playerData.ratings.verified.singles.toString();
    }

    return {
      doublesRating,
      singlesRating
    };
  }

  /**
   * Get ratings for multiple players (main method for our use case)
   */
  async getPlayersRatings(playerIds) {
    try {
      if (this.verbose) {
        console.log(`Getting ratings for ${playerIds.length} players`);
      }

      const playerResults = await this.getMultiplePlayers(playerIds);
      
      return playerResults.map(result => {
        if (result.success && result.data) {
          const ratings = this.extractRatings(result.data);
          return {
            playerId: result.playerId,
            doublesRating: ratings.doublesRating,
            singlesRating: ratings.singlesRating,
            lastUpdated: new Date().toISOString(),
            success: true
          };
        } else {
          return {
            playerId: result.playerId,
            doublesRating: 'N/A',
            singlesRating: 'N/A',
            error: result.error,
            success: false
          };
        }
      });
    } catch (error) {
      console.error('Error getting players ratings:', error);
      throw error;
    }
  }

  /**
   * Get user profile (for testing authentication)
   */
  async getProfile() {
    try {
      if (!this.accessToken) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Authentication failed');
        }
      }

      const response = await axios.get(this.url(`/user/${this.version}/profile/`), {
        headers: this.getHeaders()
      });

      if (response.status === 200) {
        return {
          success: true,
          data: response.data.result
        };
      } else {
        return {
          success: false,
          error: `API returned status ${response.status}`
        };
      }
    } catch (error) {
      console.error('Error getting profile:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = DuprApiClient;