# AddFixtures Page - Design Specifications

## Visual Design Guide

### Color Palette

#### Primary Colors
```
Orange Gradient:
  - Start: #FF6B35 (Vibrant Orange)
  - End: #FFA500 (Golden Orange)
  - Usage: Headers, primary buttons, active states

Blue Accent:
  - Primary: #0066cc (Team 2 color)
  - Light: #E3F2FD (Background)
  - Usage: Secondary team display, info badges

Neutral Colors:
  - Text: #1f2937 (Dark Gray)
  - Secondary Text: #6b7280 (Medium Gray)
  - Borders: #e5e7eb (Light Gray)
  - Background: #f8f9fa (Very Light Gray)
  - White: #ffffff (Pure White)
```

#### Status Colors
```
Scheduled: #0369a1 (Blue)
Live: #166534 (Green) - with pulse animation
Completed: #6B21A8 (Purple)
```

### Typography

#### Font Sizes
```
Header Title: 2.5rem (40px) - Bold
Header Subtitle: 1.1rem (17.6px) - Medium
Section Title: 1.5rem (24px) - Bold
Card Title: 1.25rem (20px) - Bold
Body Text: 1rem (16px) - Regular
Small Text: 0.875rem (14px) - Regular
Badge Text: 0.875rem (14px) - Semi-bold
```

#### Font Weights
```
Regular: 400
Medium: 500
Semi-bold: 600
Bold: 700
Extra Bold: 800
```

### Spacing System

#### Padding
```
Extra Small: 0.5rem (8px)
Small: 0.75rem (12px)
Medium: 1rem (16px)
Large: 1.5rem (24px)
Extra Large: 2rem (32px)
```

#### Margins
```
Small: 0.5rem (8px)
Medium: 1rem (16px)
Large: 1.5rem (24px)
Extra Large: 2rem (32px)
Section: 3rem (48px)
```

#### Gap (Flex/Grid)
```
Tight: 0.5rem (8px)
Small: 0.75rem (12px)
Medium: 1rem (16px)
Large: 1.5rem (24px)
Extra Large: 2rem (32px)
```

### Border Radius

```
Small: 8px - Form inputs, small buttons
Medium: 12px - Cards, modals
Large: 16px - Modal header
Full: 20px - Badges, pills
```

### Shadows

#### Card Shadow
```
Default: 0 2px 8px rgba(0, 0, 0, 0.08)
Hover: 0 12px 24px rgba(0, 0, 0, 0.12)
```

#### Button Shadow
```
Primary: 0 4px 12px rgba(255, 107, 53, 0.3)
Hover: 0 6px 20px rgba(255, 107, 53, 0.4)
```

#### Modal Shadow
```
0 20px 60px rgba(0, 0, 0, 0.3)
```

### Component Specifications

#### Header Section
```
Height: Auto (responsive)
Background: Linear gradient 135deg
Padding: 3rem 2rem
Border Radius: None (full width)
Box Shadow: None
Content Max Width: 1400px
```

#### Tab Navigation
```
Height: Auto
Background: White
Border Bottom: 2px solid #e5e7eb
Padding: 0 2rem
Tab Button Padding: 1rem 1.5rem
Active Indicator Height: 3px
Active Indicator Color: Gradient (orange)
Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

#### Fixture Card
```
Width: 350px minimum (responsive)
Background: White
Border: 1px solid #f0f0f0
Border Radius: 12px
Box Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
Hover Shadow: 0 12px 24px rgba(0, 0, 0, 0.12)
Hover Transform: translateY(-4px)
Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

#### Modal
```
Width: 90% (max 600px)
Max Height: 90vh
Background: White
Border Radius: 16px
Box Shadow: 0 20px 60px rgba(0, 0, 0, 0.3)
Backdrop: rgba(0, 0, 0, 0.5) with blur(4px)
Animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

#### Form Input
```
Padding: 0.75rem 1rem
Border: 2px solid #e5e7eb
Border Radius: 8px
Font Size: 1rem
Focus Border: #FF6B35
Focus Shadow: 0 0 0 3px rgba(255, 107, 53, 0.1)
Transition: 0.2s ease
```

#### Button - Primary
```
Background: Linear gradient 135deg (#FF6B35 to #FFA500)
Color: White
Padding: 0.75rem 1.5rem
Border Radius: 8px
Font Weight: 600
Box Shadow: 0 4px 12px rgba(255, 107, 53, 0.3)
Hover Transform: translateY(-2px)
Hover Shadow: 0 6px 20px rgba(255, 107, 53, 0.4)
Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

#### Button - Secondary
```
Background: White
Color: #FF6B35
Border: 2px solid #FF6B35
Padding: 0.75rem 1.5rem
Border Radius: 8px
Font Weight: 600
Hover Background: #FFF3E0
Transition: 0.3s ease
```

#### Button - Ghost
```
Background: Transparent
Color: #6b7280
Padding: 0.75rem 1.5rem
Border: None
Border Radius: 8px
Font Weight: 600
Hover Background: #f3f4f6
Hover Color: #1f2937
Transition: 0.2s ease
```

#### Badge - Info
```
Padding: 0.5rem 1rem
Background: #f3f4f6
Color: #374151
Border: 1px solid #e5e7eb
Border Radius: 20px
Font Size: 0.875rem
Font Weight: 600
```

#### Badge - Primary
```
Padding: 0.5rem 1rem
Background: #FFF3E0
Color: #FF6B35
Border: 1px solid #FFB399
Border Radius: 20px
Font Size: 0.875rem
Font Weight: 600
```

#### Status Badge - Scheduled
```
Background: #DBEAFE
Color: #0369a1
Border: 1px solid #7DD3FC
Padding: 0.5rem 1rem
Border Radius: 20px
```

#### Status Badge - Live
```
Background: #DCFCE7
Color: #166534
Border: 1px solid #86EFAC
Padding: 0.5rem 1rem
Border Radius: 20px
Animation: pulse 2s infinite
```

#### Status Badge - Completed
```
Background: #F3E8FF
Color: #6B21A8
Border: 1px solid #D8B4FE
Padding: 0.5rem 1rem
Border Radius: 20px
```

#### Empty State
```
Padding: 4rem 2rem
Background: Linear gradient 135deg (#f8f9fa to #ffffff)
Border: 2px dashed #e5e7eb
Border Radius: 12px
Text Align: Center
Icon Size: 4rem
Icon Opacity: 0.5
```

### Animation Specifications

#### Fade In Up
```
Duration: 0.5s
Easing: ease-out
From: opacity 0, translateY(20px)
To: opacity 1, translateY(0)
```

#### Slide In (Tab Underline)
```
Duration: 0.3s
Easing: ease-out
From: width 0, left 50%
To: width 100%, left 0
```

#### Pulse (Live Status)
```
Duration: 2s
Easing: infinite
0%, 100%: opacity 1
50%: opacity 0.7
```

#### Hover Lift
```
Duration: 0.3s
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Transform: translateY(-4px)
Shadow: Increase
```

#### Spin (Loading)
```
Duration: 1s
Easing: linear
Rotation: 0deg to 360deg
Infinite: true
```

### Responsive Breakpoints

#### Mobile (< 640px)
```
Header Title: 1.75rem
Tab Button Padding: 0.75rem 1rem
Tab Button Font Size: 0.9rem
Card Grid: 1 column
Card Padding: 1rem
Gap: 1.5rem
```

#### Tablet (640px - 1024px)
```
Header Title: 2rem
Tab Button Padding: 0.875rem 1.25rem
Card Grid: 2 columns
Card Padding: 1.5rem
Gap: 2rem
```

#### Desktop (> 1024px)
```
Header Title: 2.5rem
Tab Button Padding: 1rem 1.5rem
Card Grid: 3+ columns (auto-fill)
Card Padding: 2rem
Gap: 2rem
Max Width: 1400px
```

### Grid Layout

#### Fixture Card Grid
```
Display: grid
Grid Template Columns: repeat(auto-fill, minmax(350px, 1fr))
Gap: 2rem
Margin Top: 2rem

Mobile: 1 column, gap 1.5rem
Tablet: 2 columns, gap 1.5rem
Desktop: 3+ columns, gap 2rem
```

### Accessibility

#### Color Contrast
```
Text on White: #1f2937 (WCAG AAA)
Text on Orange: White (WCAG AAA)
Text on Light Gray: #374151 (WCAG AA)
```

#### Focus States
```
Outline: 2px solid #FF6B35
Outline Offset: 2px
Box Shadow: 0 0 0 3px rgba(255, 107, 53, 0.1)
```

#### Keyboard Navigation
```
Tab Order: Logical flow
Focus Visible: All interactive elements
Skip Links: Available
```

### Performance Metrics

#### Animation Performance
```
Frame Rate: 60fps
GPU Acceleration: transform, opacity
Avoid: width, height, left, right changes
```

#### Load Time
```
CSS: < 50KB
Images: Optimized
Animations: CSS-based (no JS)
```

## Implementation Notes

1. **CSS Modules**: All styles are scoped using CSS modules to prevent conflicts
2. **Responsive Design**: Mobile-first approach with progressive enhancement
3. **Animations**: Use transform and opacity for 60fps performance
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
6. **Dark Mode**: Ready for future implementation

## Design Tokens

```css
/* Colors */
--color-primary: #FF6B35;
--color-primary-light: #FFA500;
--color-secondary: #0066cc;
--color-text: #1f2937;
--color-text-secondary: #6b7280;
--color-border: #e5e7eb;
--color-background: #f8f9fa;
--color-white: #ffffff;

/* Spacing */
--spacing-xs: 0.5rem;
--spacing-sm: 0.75rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;
--spacing-2xl: 3rem;

/* Border Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-full: 20px;

/* Shadows */
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-md: 0 12px 24px rgba(0, 0, 0, 0.12);
--shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.3);

/* Transitions */
--transition-fast: 0.2s ease;
--transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.5s ease-out;
```
