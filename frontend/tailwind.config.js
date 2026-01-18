/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./screens/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'premium-dark': '#0E1116',
        'premium-card': '#161A22',
        'premium-text': '#E6EAF0',
        'premium-muted': '#9AA3B2',
      }
    },
  },
  plugins: [],
};
