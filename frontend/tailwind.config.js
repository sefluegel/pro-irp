/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',   // Navy blue
        secondary: '#FBBF24', // Golden accent
      },
    },
  },
  plugins: [],
};
