import { useState, useEffect } from 'react';
import imageCache from '../utils/imageCache';

/**
 * React hook for caching and displaying images
 * Automatically handles caching and provides loading/error states
 * 
 * @param {string} imageUrl - The image URL to cache and display
 * @param {Object} options - Configuration options
 * @returns {Object} - { src, loading, error, cached }
 */
export const useImageCache = (imageUrl, options = {}) => {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setLoading(false);
      setSrc(null);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if image is in cache
        const cachedBlob = await imageCache.get(imageUrl);
        
        if (cachedBlob && isMounted) {
          // Use cached image
          const objectUrl = URL.createObjectURL(cachedBlob);
          setSrc(objectUrl);
          setCached(true);
          setLoading(false);
          return;
        }

        // Fetch and cache image
        const blob = await imageCache.fetchWithCache(imageUrl);
        
        if (isMounted) {
          const objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
          setCached(false);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading image:', err);
          setError(err.message);
          // Fallback to original URL
          setSrc(imageUrl);
          setLoading(false);
        }
      }
    };

    loadImage();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return { src, loading, error, cached };
};

/**
 * Hook to get cache statistics
 * @returns {Object} - Cache stats
 */
export const useCacheStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      try {
        const cacheStats = await imageCache.getStats();
        setStats(cacheStats);
      } catch (error) {
        console.error('Error getting cache stats:', error);
      } finally {
        setLoading(false);
      }
    };

    getStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(getStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return { stats, loading };
};

/**
 * Hook to manage cache operations
 * @returns {Object} - Cache management functions
 */
export const useCacheManager = () => {
  const [stats, setStats] = useState(null);

  const clearCache = async () => {
    try {
      await imageCache.clearAll();
      setStats(null);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const clearExpired = async () => {
    try {
      const count = await imageCache.clearExpired();
      console.log(`Cleared ${count} expired entries`);
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  };

  const getStats = async () => {
    try {
      const cacheStats = await imageCache.getStats();
      setStats(cacheStats);
      return cacheStats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  };

  return {
    clearCache,
    clearExpired,
    getStats,
    stats
  };
};

export default useImageCache;
