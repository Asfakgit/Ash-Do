/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          bg: {
            light: '#F2F2F7',
            dark: '#000000',
          },
          card: {
            light: '#FFFFFF',
            dark: '#1C1C1E',
          },
          cardSecondary: {
            light: '#F8F9FA',
            dark: '#2C2C2E',
          },
          text: {
            primaryLight: '#1C1C1E',
            secondaryLight: '#6C6C70',
            primaryDark: '#F2F2F7',
            secondaryDark: '#8E8E93',
          },
          border: {
            light: 'rgba(60, 60, 67, 0.12)',
            dark: 'rgba(84, 84, 88, 0.35)',
          },
          emerald: {
            50: '#ECFDF5',
            100: '#D1FAE5',
            400: '#34D399',
            500: '#10B981',
            600: '#059669',
            700: '#047857',
            900: '#064E3B',
          }
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'ios-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'ios-md': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'ios-lg': '0 12px 32px rgba(0, 0, 0, 0.08)',
        'ios-dark-sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'ios-dark-md': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'ios-dark-lg': '0 12px 32px rgba(0, 0, 0, 0.6)',
      },
      borderRadius: {
        'ios-sm': '10px',
        'ios-md': '14px',
        'ios-lg': '20px',
        'ios-xl': '26px',
      }
    },
  },
  plugins: [],
}
