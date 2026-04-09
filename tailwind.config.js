/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── PRIMARY BRAND COLOR ───────────────────────────────────────────
        // Change these hex values to rebrand the entire app at once.
        // Every bg-blue-*, text-blue-*, border-blue-* across the codebase
        // maps to these same values, so one change updates everything.
        primary: {
          50:  '#e5f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
          950: '#000e24',
          DEFAULT: '#0066ff',
        },
        // ─── BLUE = PRIMARY ───────────────────────────────────────────────
        blue: {
          50:  '#e5f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
          950: '#000e24',
        },
      }
    }
  },
  plugins: [],
}
