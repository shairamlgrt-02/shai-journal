/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDFCF6', // That soft, expensive paper look
        ink: '#2D2A26', // Softer than black, easy on the eyes
        gold: '#C6A87C', // Elegant accent
        paper: '#F5F2E8', // Slightly darker cream for cards
        'brown-dark': '#4A3F35',
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        hand: ['Caveat', 'cursive'],
      },
      boxShadow: {
        book: '5px 5px 15px rgba(0,0,0,0.15), -1px 0px 3px rgba(0,0,0,0.1)',
        'inner-spine': 'inset 10px 0 20px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
