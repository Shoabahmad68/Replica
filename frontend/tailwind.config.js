/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0A192F",
        accent: "#64FFDA",
        secondary: "#112240",
      },
    },
  },
  plugins: [],
}
