/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { inter: ["Inter", "system-ui", "sans-serif"] },
      colors: { brand: { navy: "#172A3A", slate: "#20344A", gold: "#FFB800" } }
    },
  },
  plugins: [],
};
