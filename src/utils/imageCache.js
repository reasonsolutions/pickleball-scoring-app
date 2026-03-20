/**
 * Image Cache Utility using IndexedDB
 * Caches images locally to avoid repeated fetches
 * Automatically manages cache expiration and size limits
 */

const DB_NAME = 'PickleballImageCache';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

class ImageCache {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('ImageCache DB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
          console.log('ImageCache store created');
        }
      };
    });
  }

  /**
   * Get image from cache
   * @param {string} url - Image URL
   * @returns {Promise<Blob|null>} - Cached image blob or null
   */
  async get(url) {
    try {
      await this.initPromise;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onerror = () => {
          console.error('Error reading from cache:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const result = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache has expired
          const now = Date.now();
          if (now - result.timestamp > CACHE_DURATION) {
            // Cache expired, delete it
            this.delete(url).catch(err => console.error('Error deleting expired cache:', err));
            resolve(null);
            return;
          }

          resolve(result.blob);
        };
      });
    } catch (error) {
      console.error('Error getting image from cache:', error);
      return null;
    }
  }

  /**
   * Set image in cache
   * @param {string} url - Image URL
   * @param {Blob} blob - Image blob
   * @returns {Promise<void>}
   */
  async set(url, blob) {
    try {
      await this.initPromise;

      // Check cache size before adding
      await this.manageCacheSize(blob.size);

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const cacheEntry = {
          url,
          blob,
          timestamp: Date.now(),
          size: blob.size,
          type: blob.type
        };

        const request = store.put(cacheEntry);

        request.onerror = () => {
          console.error('Error writing to cache:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log(`Cached image: ${url} (${(blob.size / 1024).toFixed(2)} KB)`);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error setting image in cache:', error);
    }
  }

  /**
   * Delete specific image from cache
   * @param {string} url - Image URL
   * @returns {Promise<void>}
   */
  async delete(url) {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(url);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error deleting from cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   * @returns {Promise<number>} - Number of entries deleted
   */
  async clearExpired() {
    try {
      await this.initPromise;

      const now = Date.now();
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(now - CACHE_DURATION);
        const request = index.openCursor(range);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            console.log(`Cleared ${deletedCount} expired cache entries`);
            resolve(deletedCount);
          }
        };
      });
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Manage cache size by removing oldest entries if needed
   * @param {number} newSize - Size of new entry to be added
   * @returns {Promise<void>}
   */
  async manageCacheSize(newSize) {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);

        request.onsuccess = async () => {
          const entries = request.result;
          let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

          // If adding new entry would exceed limit, remove oldest entries
          if (totalSize + newSize > MAX_CACHE_SIZE) {
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);

            let sizeToFree = totalSize + newSize - MAX_CACHE_SIZE;
            
            for (const entry of entries) {
              if (sizeToFree <= 0) break;
              await this.delete(entry.url);
              sizeToFree -= entry.size;
            }
          }

          resolve();
        };
      });
    } catch (error) {
      console.error('Error managing cache size:', error);
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log('Image cache cleared');
          resolve();
        };
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache stats
   */
  async getStats() {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const entries = request.result;
          const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
          
          resolve({
            count: entries.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            maxSize: MAX_CACHE_SIZE,
            maxSizeMB: (MAX_CACHE_SIZE / 1024 / 1024).toFixed(2),
            entries: entries.map(e => ({
              url: e.url,
              size: (e.size / 1024).toFixed(2) + ' KB',
              timestamp: new Date(e.timestamp).toLocaleString()
            }))
          });
        };
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Fetch image with caching
   * @param {string} url - Image URL
   * @returns {Promise<Blob>} - Image blob
   */
  async fetchWithCache(url) {
    try {
      // Try to get from cache first
      const cached = await this.get(url);
      if (cached) {
        console.log(`Using cached image: ${url}`);
        return cached;
      }

      // Fetch from network
      console.log(`Fetching image: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Cache the image
      await this.set(url, blob);

      return blob;
    } catch (error) {
      console.error('Error fetching image with cache:', error);
      throw error;
    }
  }

  /**
   * Get image as data URL (for img src)
   * @param {string} url - Image URL
   * @returns {Promise<string>} - Data URL
   */
  async getImageUrl(url) {
    try {
      const blob = await this.fetchWithCache(url);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error getting image URL:', error);
      return url; // Fallback to original URL
    }
  }
}

// Create singleton instance
const imageCache = new ImageCache();

// Auto-cleanup expired entries every hour
setInterval(() => {
  imageCache.clearExpired().catch(err => console.error('Auto-cleanup error:', err));
}, 60 * 60 * 1000);

export default imageCache;
