/**
 * Data Cache Utility for Firebase Read Optimization
 * Reduces Firebase reads by caching frequently accessed data
 */

class DataCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = {
      tournaments: 5 * 60 * 1000, // 5 minutes
      tournamentData: 3 * 60 * 1000, // 3 minutes
      liveMatches: 30 * 1000, // 30 seconds
      news: 10 * 60 * 1000, // 10 minutes
      videos: 15 * 60 * 1000, // 15 minutes
      staticData: 30 * 60 * 1000 // 30 minutes
    };
  }

  /**
   * Get cached data if it exists and is not expired
   */
  get(key, cacheType = 'default') {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const duration = this.CACHE_DURATION[cacheType] || 5 * 60 * 1000;
    const isExpired = Date.now() - cached.timestamp > duration;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache with timestamp
   */
  set(key, data, cacheType = 'default') {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      type: cacheType
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      const duration = this.CACHE_DURATION[cached.type] || 5 * 60 * 1000;
      if (now - cached.timestamp > duration) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      types: Array.from(this.cache.values()).reduce((acc, cached) => {
        acc[cached.type] = (acc[cached.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Create singleton instance
const dataCache = new DataCache();

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  dataCache.clearExpired();
}, 5 * 60 * 1000);

export default dataCache;