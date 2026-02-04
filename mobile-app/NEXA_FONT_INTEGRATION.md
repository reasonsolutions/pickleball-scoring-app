# Nexa Font Integration Guide

This document provides a comprehensive guide for using the Nexa font family in the mobile app.

## Overview

The mobile app has been configured to use the Nexa font family as the primary typeface. Nexa is a modern, clean, and highly readable font that provides excellent user experience across different screen sizes and devices.

## Font Weights Available

- **Nexa Light** - For subtle text and secondary information
- **Nexa Regular** - For body text and standard content  
- **Nexa Bold** - For headings and emphasis
- **Nexa Heavy** - For strong headings and branding

## Installation

### 1. Font Files
Place the following font files in `mobile-app/assets/fonts/`:
- `Nexa-Light.ttf`
- `Nexa-Regular.ttf`
- `Nexa-Bold.ttf`
- `Nexa-Heavy.ttf`

**Note:** Nexa is a commercial font from FontFabric. Ensure you have proper licensing before using these fonts in production.

### 2. Dependencies
The app uses `expo-font` for custom font loading:
```bash
npm install expo-font
```

## Usage

### Import Font Utilities
```javascript
import { textStyles, FONTS, getFontFamily } from '../utils/fonts';
```

### Using Pre-defined Text Styles
The app provides pre-configured text styles that automatically use Nexa fonts:

```javascript
// Headings
<Text style={textStyles.h1}>Main Heading</Text>
<Text style={textStyles.h2}>Section Heading</Text>
<Text style={textStyles.h3}>Subsection Heading</Text>

// Body Text
<Text style={textStyles.body1}>Primary body text</Text>
<Text style={textStyles.body2}>Secondary body text</Text>

// UI Elements
<Text style={textStyles.button}>Button Text</Text>
<Text style={textStyles.caption}>Caption text</Text>
<Text style={textStyles.overline}>OVERLINE TEXT</Text>
```

### Using Font Families Directly
```javascript
// Direct font family usage
<Text style={{ fontFamily: FONTS.NEXA_BOLD }}>Bold Text</Text>
<Text style={{ fontFamily: FONTS.NEXA_LIGHT }}>Light Text</Text>

// Using the helper function
<Text style={{ fontFamily: getFontFamily('bold') }}>Bold Text</Text>
```

### Combining with Custom Styles
```javascript
// Merge with custom styles
<Text style={[textStyles.h2, { color: '#7c3aed' }]}>
  Purple Heading
</Text>

// Using getTextStyle helper
<Text style={getTextStyle('h1', '#ffffff')}>
  White Heading
</Text>
```

## Text Style Reference

### Headings
| Style | Font | Size | Line Height | Letter Spacing |
|-------|------|------|-------------|----------------|
| h1 | Nexa Heavy | 32px | 40px | -0.5px |
| h2 | Nexa Bold | 28px | 36px | -0.3px |
| h3 | Nexa Bold | 24px | 32px | -0.2px |
| h4 | Nexa Bold | 20px | 28px | -0.1px |
| h5 | Nexa Bold | 18px | 24px | 0px |
| h6 | Nexa Bold | 16px | 22px | 0px |

### Body Text
| Style | Font | Size | Line Height |
|-------|------|------|-------------|
| body1 | Nexa Regular | 16px | 24px |
| body2 | Nexa Regular | 14px | 20px |

### UI Elements
| Style | Font | Size | Line Height | Letter Spacing |
|-------|------|------|-------------|----------------|
| button | Nexa Bold | 16px | 20px | 0.5px |
| caption | Nexa Light | 12px | 16px | 0px |
| overline | Nexa Bold | 10px | 16px | 1.5px |

## Implementation Examples

### Screen Headers
```javascript
const styles = StyleSheet.create({
  screenTitle: {
    ...textStyles.h2,
    color: '#111827',
    marginBottom: 16,
  },
  sectionTitle: {
    ...textStyles.h4,
    color: '#374151',
    marginBottom: 12,
  },
});
```

### Navigation Elements
```javascript
// Tab bar labels
tabBarLabelStyle: {
  ...textStyles.tabLabel,
  fontSize: 12,
}

// Navigation headers
headerTitleStyle: {
  ...textStyles.h5,
  color: '#ffffff',
}
```

### Cards and Lists
```javascript
const cardStyles = StyleSheet.create({
  cardTitle: {
    ...textStyles.body1,
    fontFamily: FONTS.NEXA_BOLD,
    color: '#111827',
  },
  cardSubtitle: {
    ...textStyles.body2,
    color: '#6b7280',
  },
  cardMeta: {
    ...textStyles.caption,
    color: '#9ca3af',
  },
});
```

## Best Practices

### 1. Consistency
- Always use the predefined text styles when possible
- Maintain consistent font weights across similar UI elements
- Use the same font for similar content types

### 2. Hierarchy
- Use Nexa Heavy for main branding and primary headings
- Use Nexa Bold for section headings and important UI elements
- Use Nexa Regular for body text and standard content
- Use Nexa Light for subtle information and captions

### 3. Accessibility
- Ensure sufficient color contrast with Nexa fonts
- Test readability across different screen sizes
- Consider font scaling for accessibility features

### 4. Performance
- Fonts are loaded asynchronously on app startup
- The app shows a loading screen while fonts are being loaded
- Fallback to system fonts if Nexa fonts fail to load

## Troubleshooting

### Font Not Loading
1. Check that font files are in the correct directory: `assets/fonts/`
2. Verify font file names match exactly: `Nexa-Light.ttf`, etc.
3. Check console for font loading errors
4. Ensure expo-font is properly installed

### Font Not Displaying
1. Verify you're using the correct font family names from `FONTS` constant
2. Check that fonts have finished loading before rendering
3. Test on different devices and platforms

### Performance Issues
1. Fonts are loaded once on app startup
2. Use font caching for better performance
3. Consider preloading fonts for critical screens

## Migration Guide

### From System Fonts
Replace existing font styles:
```javascript
// Before
fontSize: 24,
fontWeight: 'bold',

// After
...textStyles.h3,
```

### From Other Custom Fonts
1. Update font family references to use `FONTS` constants
2. Adjust font sizes using predefined text styles
3. Test across all screens for consistency

## File Structure
```
mobile-app/
├── assets/
│   └── fonts/
│       ├── Nexa-Light.ttf
│       ├── Nexa-Regular.ttf
│       ├── Nexa-Bold.ttf
│       └── Nexa-Heavy.ttf
├── src/
│   └── utils/
│       └── fonts.js
└── App.js (font loading logic)
```

## Support

For issues with Nexa font integration:
1. Check this documentation first
2. Verify font files and licensing
3. Test font loading in development mode
4. Check console logs for errors

---

**Note:** This integration requires proper licensing of Nexa fonts from FontFabric. Ensure compliance with licensing terms before deploying to production.