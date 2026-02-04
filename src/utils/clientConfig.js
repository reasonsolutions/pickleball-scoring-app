// Client Configuration Management Utility
// This file helps manage client-specific configurations

/**
 * Client configuration object
 * Update these values for each client deployment
 */
export const CLIENT_CONFIG = {
  // Client Information
  clientName: process.env.VITE_CLIENT_NAME || 'Default Client',
  appTitle: process.env.VITE_APP_TITLE || 'Pickleball Tournament App',
  
  // Branding
  primaryColor: process.env.VITE_PRIMARY_COLOR || '#3B82F6',
  secondaryColor: process.env.VITE_SECONDARY_COLOR || '#1E40AF',
  
  // Features - Enable/disable features per client
  features: {
    streaming: process.env.VITE_ENABLE_STREAMING !== 'false',
    umpireScoring: process.env.VITE_ENABLE_UMPIRE_SCORING !== 'false',
    tvDisplay: process.env.VITE_ENABLE_TV_DISPLAY !== 'false',
    newsManagement: process.env.VITE_ENABLE_NEWS !== 'false',
    videoManagement: process.env.VITE_ENABLE_VIDEOS !== 'false',
    logoManagement: process.env.VITE_ENABLE_LOGOS !== 'false',
    googleSheets: process.env.VITE_ENABLE_GOOGLE_SHEETS !== 'false',
    rssFeeds: process.env.VITE_ENABLE_RSS !== 'false',
    xmlApi: process.env.VITE_ENABLE_XML_API !== 'false',
  },
  
  // Contact Information
  supportEmail: process.env.VITE_SUPPORT_EMAIL || 'support@example.com',
  clientEmail: process.env.VITE_CLIENT_EMAIL || '',
  
  // Social Media (optional)
  socialMedia: {
    website: process.env.VITE_CLIENT_WEBSITE || '',
    facebook: process.env.VITE_CLIENT_FACEBOOK || '',
    instagram: process.env.VITE_CLIENT_INSTAGRAM || '',
    twitter: process.env.VITE_CLIENT_TWITTER || '',
  },
  
  // Tournament Defaults
  defaults: {
    prizeMoney: parseInt(process.env.VITE_DEFAULT_PRIZE_MONEY) || 0,
    registrationFee: parseInt(process.env.VITE_DEFAULT_REGISTRATION_FEE) || 0,
    maxPlayersPerTeam: parseInt(process.env.VITE_MAX_PLAYERS_PER_TEAM) || 2,
    categories: {
      mensSingles: process.env.VITE_DEFAULT_MENS_SINGLES !== 'false',
      mensDoubles: process.env.VITE_DEFAULT_MENS_DOUBLES !== 'false',
      womensSingles: process.env.VITE_DEFAULT_WOMENS_SINGLES !== 'false',
      womensDoubles: process.env.VITE_DEFAULT_WOMENS_DOUBLES !== 'false',
      mixedDoubles: process.env.VITE_DEFAULT_MIXED_DOUBLES !== 'false',
    }
  }
};

/**
 * Get client-specific configuration
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if key not found
 * @returns {any} Configuration value
 */
export const getClientConfig = (key, defaultValue = null) => {
  const keys = key.split('.');
  let value = CLIENT_CONFIG;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }
  
  return value;
};

/**
 * Check if a feature is enabled for this client
 * @param {string} featureName - Name of the feature
 * @returns {boolean} Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return getClientConfig(`features.${featureName}`, false);
};

/**
 * Get client branding information
 * @returns {object} Branding configuration
 */
export const getBrandingConfig = () => {
  return {
    clientName: CLIENT_CONFIG.clientName,
    appTitle: CLIENT_CONFIG.appTitle,
    primaryColor: CLIENT_CONFIG.primaryColor,
    secondaryColor: CLIENT_CONFIG.secondaryColor,
  };
};

/**
 * Get tournament default settings
 * @returns {object} Default tournament settings
 */
export const getTournamentDefaults = () => {
  return CLIENT_CONFIG.defaults;
};

/**
 * Get contact information
 * @returns {object} Contact information
 */
export const getContactInfo = () => {
  return {
    supportEmail: CLIENT_CONFIG.supportEmail,
    clientEmail: CLIENT_CONFIG.clientEmail,
    socialMedia: CLIENT_CONFIG.socialMedia,
  };
};

/**
 * Development helper - log current configuration
 */
export const logClientConfig = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🏓 Client Configuration');
    console.log('Client Name:', CLIENT_CONFIG.clientName);
    console.log('App Title:', CLIENT_CONFIG.appTitle);
    console.log('Features:', CLIENT_CONFIG.features);
    console.log('Defaults:', CLIENT_CONFIG.defaults);
    console.groupEnd();
  }
};

// Auto-log configuration in development
if (process.env.NODE_ENV === 'development') {
  logClientConfig();
}

export default CLIENT_CONFIG;