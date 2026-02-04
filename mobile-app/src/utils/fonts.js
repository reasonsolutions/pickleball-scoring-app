import * as Font from 'expo-font';

// Font family names that will be used throughout the app
export const FONTS = {
  FUTURU_LIGHT: 'Futuru-Light',
  FUTURU_REGULAR: 'Futuru-Regular',
  FUTURU_MEDIUM: 'Futuru-Medium',
  FUTURU_BOLD: 'Futuru-Bold',
  FUTURU_BLACK: 'Futuru-Black',
};

// Font loading configuration
export const loadFonts = async () => {
  try {
    console.log('Starting to load Futuru fonts...');
    
    const fontMap = {
      [FONTS.FUTURU_LIGHT]: require('../../../assets/fonts/Futuru-Light.ttf'),
      [FONTS.FUTURU_REGULAR]: require('../../../assets/fonts/Futuru-Regular.ttf'),
      [FONTS.FUTURU_MEDIUM]: require('../../../assets/fonts/Futuru-Medium.ttf'),
      [FONTS.FUTURU_BOLD]: require('../../../assets/fonts/Futuru-Bold.ttf'),
      [FONTS.FUTURU_BLACK]: require('../../../assets/fonts/Futuru-Black.ttf'),
    };
    
    console.log('Font map created:', Object.keys(fontMap));
    
    await Font.loadAsync(fontMap);
    console.log('✅ Futuru fonts loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading Futuru fonts:', error);
    console.error('Font loading error details:', error.message);
    console.warn('Falling back to system fonts');
    return false;
  }
};

// Font style utilities
export const getFontFamily = (weight = 'regular') => {
  switch (weight.toLowerCase()) {
    case 'light':
      return FONTS.FUTURU_LIGHT;
    case 'regular':
    case 'normal':
      return FONTS.FUTURU_REGULAR;
    case 'medium':
      return FONTS.FUTURU_MEDIUM;
    case 'bold':
    case 'semibold':
      return FONTS.FUTURU_BOLD;
    case 'heavy':
    case 'black':
    case 'extrabold':
      return FONTS.FUTURU_BLACK;
    default:
      return FONTS.FUTURU_REGULAR;
  }
};

// Pre-defined text styles using Nexa fonts
export const textStyles = {
  // Headings
  h1: {
    fontFamily: FONTS.FUTURU_BLACK,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  h5: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 18,
    lineHeight: 24,
  },
  h6: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Body text
  body1: {
    fontFamily: FONTS.FUTURU_REGULAR,
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    fontFamily: FONTS.FUTURU_REGULAR,
    fontSize: 14,
    lineHeight: 20,
  },
  
  // UI elements
  button: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: FONTS.FUTURU_LIGHT,
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  
  // Navigation
  tabLabel: {
    fontFamily: FONTS.FUTURU_BOLD,
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Special styles
  logo: {
    fontFamily: FONTS.FUTURU_BLACK,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.FUTURU_LIGHT,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
};

// Utility function to get text style with custom color
export const getTextStyle = (styleName, color = '#000000') => ({
  ...textStyles[styleName],
  color,
});

// Default font styles that can be applied globally
export const defaultFontStyles = {
  fontFamily: FONTS.FUTURU_REGULAR,
};

// Fallback fonts for when Futuru fonts fail to load
export const FALLBACK_FONTS = {
  light: 'System',
  regular: 'System',
  bold: 'System',
  heavy: 'System',
};