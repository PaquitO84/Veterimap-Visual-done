/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Añadimos tus colores corporativos para usarlos fácilmente
        'slate-900': '#0f172a',
        'blue-600': '#2563eb',
      }
    },
  },
  plugins: [],
}