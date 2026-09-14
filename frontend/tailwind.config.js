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
          DEFAULT: '#946277',
          light: '#E4CBD7',
          hover: '#78485E',
        },
        warm: {
          DEFAULT: '#B58764',
          hover: '#946D4D',
        },
        rose: {
          DEFAULT: '#AC6174',
          hover: '#924A60',
        },
      },
    },
  },
  plugins: [],
};
