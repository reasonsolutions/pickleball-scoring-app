/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'urbanist': ['Urbanist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Courtside Admin tokens (defined in src/styles/admin-tokens.css, scoped to .admin-app)
      colors: {
        brand: {
          50: 'var(--brand-50)', 100: 'var(--brand-100)', 200: 'var(--brand-200)', 500: 'var(--brand-500)',
          600: 'var(--brand-600)', 700: 'var(--brand-700)', 800: 'var(--brand-800)',
        },
        ink: {
          300: 'var(--ink-300)', 400: 'var(--ink-400)', 500: 'var(--ink-500)', 600: 'var(--ink-600)',
          700: 'var(--ink-700)', 800: 'var(--ink-800)', 900: 'var(--ink-900)',
        },
        paper: {
          0: 'var(--paper-0)', 50: 'var(--paper-50)', 100: 'var(--paper-100)', 200: 'var(--paper-200)', 300: 'var(--paper-300)',
        },
        line: {
          100: 'var(--line-100)', 150: 'var(--line-150)', 200: 'var(--line-200)', 300: 'var(--line-300)',
        },
        ok: { 50: 'var(--success-50)', 500: 'var(--success-500)', 700: 'var(--success-700)' },
        bad: { 50: 'var(--danger-50)', 100: 'var(--danger-100)', 500: 'var(--danger-500)', 600: 'var(--danger-600)' },
        warn: { 50: 'var(--warning-50)', 500: 'var(--warning-500)', 700: 'var(--warning-700)' },
      },
      borderRadius: {
        'ds-xs': 'var(--radius-xs)',
        'ds-sm': 'var(--radius-sm)',
        'ds-md': 'var(--radius-md)',
        'ds-lg': 'var(--radius-lg)',
        'ds-xl': 'var(--radius-xl)',
        'ds-2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        'ds-sm': 'var(--shadow-sm)',
        'ds-md': 'var(--shadow-md)',
        'ds-lg': 'var(--shadow-lg)',
        'ds-focus': 'var(--focus-ring)',
      },
      transitionTimingFunction: { ds: 'cubic-bezier(.2,.7,.2,1)' },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        "fitMove": {
          "primary": "#9AFF00",        // Primary Green
          "primary-content": "#2D3748", // Dark text on primary
          "secondary": "#4FC3F7",      // Primary Blue
          "secondary-content": "#FFFFFF", // White text on secondary
          "accent": "#FFD93D",         // Warning/Alert Yellow
          "accent-content": "#2D3748", // Dark text on accent
          "neutral": "#718096",        // Medium gray
          "neutral-content": "#FFFFFF", // White text on neutral
          "base-100": "#FFFFFF",       // Card Background (pure white)
          "base-200": "#F5F7FA",       // Sidebar Background (off-white/light gray)
          "base-300": "#E2E8F0",       // Border light gray
          "base-content": "#2D3748",   // Primary Text (dark gray)
          "info": "#4FC3F7",           // Light blue
          "info-content": "#FFFFFF",   // White text on info
          "success": "#48BB78",        // Success green
          "success-content": "#FFFFFF", // White text on success
          "warning": "#FFD93D",        // Bright yellow
          "warning-content": "#2D3748", // Dark text on warning
          "error": "#F56565",          // Error red
          "error-content": "#FFFFFF",  // White text on error
          
          // Custom CSS variables for gradients and special colors
          "--primary-green": "#9AFF00",
          "--primary-blue": "#4FC3F7",
          "--secondary-blue": "#81C784",
          "--bg-main": "#F8F9FA",
          "--bg-card": "#FFFFFF",
          "--bg-sidebar": "#F5F7FA",
          "--text-primary": "#2D3748",
          "--text-secondary": "#718096",
          "--text-muted": "#A0AEC0",
          "--accent-yellow": "#FFD93D",
          "--success-green": "#48BB78",
          "--progress-blue": "#4299E1",
          "--border-light": "#E2E8F0",
        }
      },
      "light",
      "dark",
    ],
  },
}
