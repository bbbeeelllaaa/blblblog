/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#99B6B4',
          light: '#BACFCE',
          hover: '#7DA3A1',
        },
        warm: {
          DEFAULT: '#DFB199',
          hover: '#D1A585',
        },
        rose: {
          DEFAULT: '#D48982',
          hover: '#C0706E',
        },
      },
    },
  },
  plugins: [],
};
