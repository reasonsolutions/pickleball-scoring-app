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
      },
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