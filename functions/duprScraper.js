const puppeteer = require('puppeteer');

/**
 * DUPR Web Scraper for Firebase Functions
 * This handles the actual login and scraping of DUPR player data
 */

class DuprScraper {
  constructor() {
    this.baseUrl = 'https://dashboard.dupr.com';
    this.credentials = {
      email: 'hpl@centrecourt.ventures',
      password: 'Sid12**'
    };
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  /**
   * Initialize browser and login to DUPR
   */
  async initialize() {
    try {
      console.log('Launching browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 720 });
      
      console.log('Browser initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      return false;
    }
  }

  /**
   * Login to DUPR dashboard
   */
  async login() {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      console.log('Navigating to DUPR login page...');
      await this.page.goto(`${this.baseUrl}/login`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for login form to load
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });

      console.log('Filling login credentials...');
      
      // Clear and fill email field
      await this.page.click('input[type="email"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="email"]', this.credentials.email);

      // Clear and fill password field
      await this.page.click('input[type="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="password"]', this.credentials.password);

      // Submit login form
      console.log('Submitting login form...');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        this.page.click('button[type="submit"]')
      ]);

      // Check if login was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/home')) {
        console.log('Login successful!');
        this.isLoggedIn = true;
        return true;
      } else {
        throw new Error('Login failed - redirected to: ' + currentUrl);
      }

    } catch (error) {
      console.error('Login failed:', error);
      this.isLoggedIn = false;
      return false;
    }
  }

  /**
   * Scrape player ratings from DUPR profile page
   * @param {string} duprId - The DUPR ID of the player
   * @returns {Object} Player ratings data
   */
  async scrapePlayerRatings(duprId) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in to DUPR');
      }

      console.log(`Scraping ratings for DUPR ID: ${duprId}`);
      
      const playerUrl = `${this.baseUrl}/dashboard/player/${duprId}`;
      await this.page.goto(playerUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for player data to load
      await this.page.waitForTimeout(2000);

      // Extract ratings from the page
      const ratings = await this.page.evaluate(() => {
        let doublesRating = 'N/A';
        let singlesRating = 'N/A';

        // Try different selectors for ratings
        const ratingSelectors = [
          '.rating-value',
          '.player-rating',
          '[data-testid="rating"]',
          '.rating',
          '.score'
        ];

        // Look for doubles rating
        const doublesElements = document.querySelectorAll('*');
        for (let element of doublesElements) {
          const text = element.textContent?.toLowerCase() || '';
          if (text.includes('doubles') && element.nextElementSibling) {
            const ratingText = element.nextElementSibling.textContent;
            const match = ratingText.match(/(\d+\.\d+)/);
            if (match) {
              doublesRating = match[1];
              break;
            }
          }
        }

        // Look for singles rating
        const singlesElements = document.querySelectorAll('*');
        for (let element of singlesElements) {
          const text = element.textContent?.toLowerCase() || '';
          if (text.includes('singles') && element.nextElementSibling) {
            const ratingText = element.nextElementSibling.textContent;
            const match = ratingText.match(/(\d+\.\d+)/);
            if (match) {
              singlesRating = match[1];
              break;
            }
          }
        }

        // Alternative approach: look for rating numbers in specific containers
        if (doublesRating === 'N/A' || singlesRating === 'N/A') {
          const ratingContainers = document.querySelectorAll('.rating-container, .player-stats, .stats-container');
          for (let container of ratingContainers) {
            const ratings = container.textContent.match(/(\d+\.\d+)/g);
            if (ratings && ratings.length >= 2) {
              doublesRating = ratings[0];
              singlesRating = ratings[1];
              break;
            }
          }
        }

        return { doublesRating, singlesRating };
      });

      console.log(`Scraped ratings for ${duprId}:`, ratings);
      
      return {
        doublesRating: ratings.doublesRating,
        singlesRating: ratings.singlesRating,
        lastUpdated: new Date().toISOString(),
        duprId: duprId
      };

    } catch (error) {
      console.error(`Error scraping ratings for ${duprId}:`, error);
      return {
        doublesRating: 'N/A',
        singlesRating: 'N/A',
        error: error.message,
        duprId: duprId
      };
    }
  }

  /**
   * Scrape ratings for multiple players
   * @param {Array} duprIds - Array of DUPR IDs
   * @returns {Array} Array of rating results
   */
  async scrapeMultiplePlayerRatings(duprIds) {
    const results = [];
    
    for (const duprId of duprIds) {
      if (duprId && duprId !== 'N/A') {
        const ratings = await this.scrapePlayerRatings(duprId);
        results.push(ratings);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        results.push({
          doublesRating: 'N/A',
          singlesRating: 'N/A',
          error: 'No DUPR ID provided',
          duprId: duprId
        });
      }
    }
    
    return results;
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        console.log('Browser cleaned up successfully');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = DuprScraper;