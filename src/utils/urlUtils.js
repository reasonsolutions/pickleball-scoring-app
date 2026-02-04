/**
 * Utility functions for URL handling in the application
 * Ensures consistent URL generation across both development and production environments
 */

/**
 * Determines if the application is running in production
 * @returns {boolean} True if running in production, false if in development
 */
export const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         !window.location.hostname.includes('127.0.0.1');
};

/**
 * Gets the appropriate base URL based on the current environment
 * @returns {string} Base URL (production domain or development localhost)
 */
export const getBaseUrl = () => {
  return isProduction() 
    ? 'https://thehpl.in'  // Production domain
    : window.location.origin;  // Development localhost
};

/**
 * Generates a full URL for a specific path, using the appropriate base URL
 * @param {string} path - The path to append to the base URL (should start with /)
 * @returns {string} Complete URL with appropriate domain
 */
export const generateUrl = (path) => {
  const baseUrl = getBaseUrl();
  // Ensure path starts with / and doesn't have duplicate slashes
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${formattedPath}`;
};