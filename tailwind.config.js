/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/sidepanel/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
